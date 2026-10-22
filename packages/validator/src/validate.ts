import { BlueprintSchema, type Blueprint, type ComponentRegistration } from '@aui/schema';
import type { ValidationError, ValidationResult, ValidationStage } from './types.js';
import type { ValidatorConfig } from './config.js';

/** Helper to deeply check equality */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
}

/** Recursively extract strings and paths from an object */
function extractStrings(obj: unknown, currentPath = ''): Array<{ path: string; text: string }> {
  const results: Array<{ path: string; text: string }> = [];

  if (typeof obj === 'string') {
    results.push({ path: currentPath, text: obj });
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      results.push(...extractStrings(item, `${currentPath}[${index}]`));
    });
  } else if (obj !== null && typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      results.push(...extractStrings(val, nextPath));
    }
  }

  return results;
}

/**
 * Validates a blueprint through all 9 stages defined in the architecture plan:
 * 1. Schema: Zod structural validation of the full blueprint
 * 2. Component: Only registered components; props match catalog
 * 3. Permission: AI may only modify permitted layers and props
 * 4. Locked-zone: No modification to locked components or sections
 * 5. Content-policy: Banned phrases and required elements
 * 6. Link-action: Allowlisted action prefixes and external URLs
 * 7. Accessibility: Require alt text on images, heading hierarchy
 * 8. Size-budget: Maximum section count
 * 9. Diff-size: Limit on total section/prop changes vs default blueprint
 *
 * @param blueprint - The blueprint to validate
 * @param config - Validator configuration (registry, policies, budgets)
 * @param defaultBlueprint - The default blueprint for diff & locked zone comparison
 * @returns Validation result with all errors, warnings, stages run, and timing
 */
export function validateBlueprint(
  blueprint: Blueprint,
  config: ValidatorConfig,
  defaultBlueprint?: Blueprint,
): ValidationResult {
  const start = performance.now();
  const stagesRun: ValidationStage[] = [];
  const errors: ValidationError[] = [];

  // Helper to record errors
  const addError = (
    stage: ValidationStage,
    code: string,
    message: string,
    path?: string,
    value?: unknown,
  ) => {
    errors.push({ stage, code, message, path, value, severity: 'error' });
  };

  // ─── Stage 1: Schema Validation ─────────────────────────────────────────────
  stagesRun.push('schema');
  const schemaParse = BlueprintSchema.safeParse(blueprint);
  if (!schemaParse.success) {
    for (const issue of schemaParse.error.issues) {
      addError(
        'schema',
        `SCHEMA_${issue.code.toUpperCase()}`,
        issue.message,
        issue.path.join('.'),
      );
    }
  }

  // ─── Stage 2: Component Check ───────────────────────────────────────────────
  stagesRun.push('component');
  const registryMap = new Map<string, ComponentRegistration>();
  for (const reg of config.componentRegistry) {
    registryMap.set(reg.type.toLowerCase(), reg);
  }

  for (const [sectionKey, compDef] of Object.entries(blueprint.components)) {
    const reg = registryMap.get(compDef.type.toLowerCase());
    if (!reg) {
      addError(
        'component',
        'UNREGISTERED_COMPONENT',
        `Component type "${compDef.type}" in section "${sectionKey}" is not registered in the catalog`,
        `components.${sectionKey}.type`,
        compDef.type,
      );
      continue;
    }

    // Check variant validity if provided
    if (compDef.variant && reg.variants && !reg.variants.includes(compDef.variant)) {
      addError(
        'component',
        'INVALID_VARIANT',
        `Variant "${compDef.variant}" is not registered for component type "${compDef.type}". Allowed: [${reg.variants.join(', ')}]`,
        `components.${sectionKey}.variant`,
        compDef.variant,
      );
    }
  }

  // ─── Stage 3: Permission Check ──────────────────────────────────────────────
  stagesRun.push('permission');
  if (defaultBlueprint) {
    for (const [sectionKey, compDef] of Object.entries(blueprint.components)) {
      const reg = registryMap.get(compDef.type.toLowerCase());
      if (!reg) continue;

      const defaultComp = defaultBlueprint.components[sectionKey];
      if (defaultComp && compDef.props && defaultComp.props) {
        // Check if any readonly prop was changed
        for (const readonlyProp of reg.permissions.readonly) {
          if (
            compDef.props[readonlyProp] !== undefined &&
            !deepEqual(compDef.props[readonlyProp], defaultComp.props[readonlyProp])
          ) {
            addError(
              'permission',
              'READONLY_PROP_MODIFIED',
              `Prop "${readonlyProp}" on component "${compDef.type}" is read-only and cannot be altered by AI`,
              `components.${sectionKey}.props.${readonlyProp}`,
              compDef.props[readonlyProp],
            );
          }
        }

        // Check if variant changed without permission
        if (
          compDef.variant !== defaultComp.variant &&
          reg.permissions.variantChangeable === false
        ) {
          addError(
            'permission',
            'VARIANT_CHANGE_FORBIDDEN',
            `Variant modification on component "${compDef.type}" is not permitted`,
            `components.${sectionKey}.variant`,
          );
        }
      }
    }
  }

  // ─── Stage 4: Locked Zone Check ─────────────────────────────────────────────
  stagesRun.push('locked-zone');
  const lockedList = config.lockedZones.map((z) => z.toLowerCase());

  for (const [sectionKey, compDef] of Object.entries(blueprint.components)) {
    const isLocked =
      lockedList.includes(sectionKey.toLowerCase()) ||
      lockedList.includes(compDef.type.toLowerCase());

    if (isLocked) {
      if (defaultBlueprint) {
        const defaultComp = defaultBlueprint.components[sectionKey];
        if (!defaultComp) {
          addError(
            'locked-zone',
            'LOCKED_ZONE_CREATED',
            `Cannot introduce new component in locked zone "${sectionKey}"`,
            `components.${sectionKey}`,
          );
        } else if (!deepEqual(compDef, defaultComp)) {
          addError(
            'locked-zone',
            'LOCKED_ZONE_MUTATED',
            `Locked component in zone "${sectionKey}" (${compDef.type}) cannot be modified`,
            `components.${sectionKey}`,
          );
        }
      } else if (compDef.locked === false) {
        addError(
          'locked-zone',
          'LOCKED_FLAG_VIOLATION',
          `Locked zone "${sectionKey}" must have locked: true`,
          `components.${sectionKey}.locked`,
        );
      }
    }
  }

  if (defaultBlueprint) {
    for (const [sectionKey, defComp] of Object.entries(defaultBlueprint.components)) {
      const isLocked =
        lockedList.includes(sectionKey.toLowerCase()) ||
        lockedList.includes(defComp.type.toLowerCase());
      if (isLocked && !blueprint.components[sectionKey]) {
        addError(
          'locked-zone',
          'LOCKED_ZONE_DELETED',
          `Locked zone "${sectionKey}" (${defComp.type}) cannot be removed`,
          `components.${sectionKey}`,
        );
      }
    }
  }

  // ─── Stage 5: Content Policy & Adversarial Injection Guard ─────────────────
  stagesRun.push('content-policy');
  const textNodes = extractStrings(blueprint.components, 'components');

  const normalizeConfusables = (str: string): string =>
    str
      .normalize('NFKD')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[\u0430]/g, 'a')
      .replace(/[\u0435]/g, 'e')
      .replace(/[\u043E]/g, 'o')
      .replace(/[\u0440]/g, 'p')
      .replace(/[\u0441]/g, 'c')
      .replace(/[\u0443]/g, 'y')
      .replace(/[\u0445]/g, 'x')
      .replace(/[\u0456]/g, 'i')
      .toLowerCase();

  const DANGEROUS_HTML_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript\s*:/gi,
    /\bon\w+\s*=/gi,
    /<iframe\b/gi,
    /<embed\b/gi,
    /<object\b/gi,
  ];

  for (const { path, text } of textNodes) {
    // 1. Script & HTML injection check
    for (const pattern of DANGEROUS_HTML_PATTERNS) {
      if (pattern.test(text)) {
        addError(
          'content-policy',
          'SCRIPT_INJECTION_DETECTED',
          `Potentially executable script or markup detected in "${path}": "${text.substring(0, 60)}"`,
          path,
          text,
        );
        break;
      }
    }

    // 2. Banned phrases (with Unicode homoglyph normalization)
    const normalizedText = normalizeConfusables(text);
    for (const banned of config.contentPolicy.bannedPhrases) {
      const normalizedBanned = normalizeConfusables(banned);
      if (normalizedText.includes(normalizedBanned)) {
        addError(
          'content-policy',
          'BANNED_PHRASE',
          `Banned phrase "${banned}" detected in content: "${text.substring(0, 60)}"`,
          path,
          text,
        );
      }
    }
  }

  if (config.contentPolicy.requiredElements.length > 0) {
    const serialized = JSON.stringify(blueprint).toLowerCase();
    const componentTypes = Object.values(blueprint.components).map((c) => c.type.toLowerCase());

    for (const req of config.contentPolicy.requiredElements) {
      const reqLower = req.toLowerCase();
      if (!componentTypes.includes(reqLower) && !serialized.includes(reqLower)) {
        addError(
          'content-policy',
          'REQUIRED_ELEMENT_MISSING',
          `Required element "${req}" was not found in the blueprint`,
        );
      }
    }
  }

  // ─── Stage 6: Link & Action Policy ──────────────────────────────────────────
  stagesRun.push('link-action');
  const allowedActions = config.contentPolicy.allowedActions;
  const allowedUrls = config.contentPolicy.allowedExternalUrls;

  const validateAction = (actionStr: unknown, path: string) => {
    if (typeof actionStr !== 'string') return;
    const colonIdx = actionStr.indexOf(':');
    const prefix = colonIdx !== -1 ? actionStr.substring(0, colonIdx) : actionStr;

    if (!allowedActions.includes(prefix)) {
      addError(
        'link-action',
        'DISALLOWED_ACTION_PREFIX',
        `Action prefix "${prefix}" is not permitted. Allowed prefixes: [${allowedActions.join(', ')}]`,
        path,
        actionStr,
      );
    }

    if (actionStr.startsWith('navigate:http://') || actionStr.startsWith('navigate:https://')) {
      const url = actionStr.replace('navigate:', '');
      if (allowedUrls && allowedUrls.length > 0) {
        const isAllowed = allowedUrls.some((allowed) => url.startsWith(allowed));
        if (!isAllowed) {
          addError(
            'link-action',
            'UNAPPROVED_EXTERNAL_URL',
            `External URL "${url}" is not in the approved external URL allowlist`,
            path,
            url,
          );
        }
      }
    }
  };

  if (blueprint.flow) {
    if (blueprint.flow.onPrimaryCta) {
      validateAction(blueprint.flow.onPrimaryCta, 'flow.onPrimaryCta');
    }
    if (blueprint.flow.onSecondaryCta) {
      validateAction(blueprint.flow.onSecondaryCta, 'flow.onSecondaryCta');
    }
    if (blueprint.flow.actions) {
      for (const [name, act] of Object.entries(blueprint.flow.actions)) {
        validateAction(act, `flow.actions.${name}`);
      }
    }
  }

  // ─── Stage 7: Accessibility Check ───────────────────────────────────────────
  stagesRun.push('accessibility');
  if (config.accessibility.requireAltText) {
    for (const [sectionKey, compDef] of Object.entries(blueprint.components)) {
      if (compDef.props) {
        const props = compDef.props;
        if ('image' in props || 'imageUrl' in props || 'media' in props) {
          const hasAlt = Boolean(props.alt || props.imageAlt || props.mediaAlt);
          if (!hasAlt) {
            addError(
              'accessibility',
              'MISSING_IMAGE_ALT',
              `Component "${sectionKey}" has media without descriptive alt text`,
              `components.${sectionKey}.props`,
            );
          }
        }
      }
    }
  }

  // ─── Stage 8: Size Budget ───────────────────────────────────────────────────
  stagesRun.push('size-budget');
  const sectionCount = blueprint.layout.sections.length;
  if (sectionCount > config.sizeBudget.maxSections) {
    addError(
      'size-budget',
      'MAX_SECTIONS_EXCEEDED',
      `Blueprint contains ${sectionCount} sections, exceeding maximum limit of ${config.sizeBudget.maxSections}`,
      'layout.sections',
      sectionCount,
    );
  }

  // ─── Stage 9: Diff Size ─────────────────────────────────────────────────────
  stagesRun.push('diff-size');
  if (defaultBlueprint && config.diffLimits) {
    let diffCount = 0;
    const defSections = defaultBlueprint.layout.sections;
    const curSections = blueprint.layout.sections;

    for (let i = 0; i < curSections.length; i++) {
      const sec = curSections[i]!;
      const defIdx = defSections.indexOf(sec);
      if (defIdx === -1 || defIdx !== i) {
        diffCount++;
      } else {
        const c1 = blueprint.components[sec];
        const c2 = defaultBlueprint.components[sec];
        if (!deepEqual(c1, c2)) {
          diffCount++;
        }
      }
    }

    for (const defSec of defSections) {
      if (!curSections.includes(defSec)) {
        diffCount++;
      }
    }

    if (diffCount > config.diffLimits.maxSectionChanges) {
      addError(
        'diff-size',
        'MAX_DIFF_EXCEEDED',
        `Section changes (${diffCount}) exceed diff limit of ${config.diffLimits.maxSectionChanges}`,
        'layout.sections',
        diffCount,
      );
    }
  }

  const durationMs = performance.now() - start;
  const hasErrors = errors.some((e) => e.severity === 'error');

  return {
    valid: !hasErrors,
    errors,
    stagesRun,
    durationMs,
  };
}
