import type { Blueprint } from '@aui/schema';
import type { Policy, PolicyResult } from './types.js';

/**
 * Extracts all strings from an unknown value recursively with their JSON paths.
 */
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
 * Checks deep equality between two JSON-compatible objects/values.
 */
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

/**
 * Evaluates a policy against a blueprint.
 *
 * Checks:
 * 1. Locked zones — No modifications to components in locked zones vs default blueprint.
 * 2. Banned phrases — Rejects deceptive claims, fake urgency, or forbidden phrases.
 * 3. Required elements — Ensures essential components or links are present (e.g. privacy link, cookie consent).
 * 4. Allowed actions — Ensures CTAs and links only use allowed action prefixes.
 * 5. Max section changes — Prevents radical structural churn between generations.
 * 6. Accessibility — Checks required alt text on images and accessibility constraints.
 * 7. Custom rules.
 *
 * @param blueprint - The blueprint to check
 * @param policy - The policy to enforce
 * @param defaultBlueprint - Optional default blueprint for comparing changes to locked zones & diffs
 * @returns PolicyResult with pass/fail and violations
 */
export function evaluatePolicy(
  blueprint: Blueprint,
  policy: Policy,
  defaultBlueprint?: Blueprint,
): PolicyResult {
  const violations: PolicyResult['violations'] = [];

  // ─── 1. Locked Zones Check ──────────────────────────────────────────────────
  if (policy.locked && policy.locked.length > 0) {
    for (const [sectionKey, component] of Object.entries(blueprint.components)) {
      const isLockedType = policy.locked.some(
        (locked) =>
          locked.toLowerCase() === component.type.toLowerCase() ||
          locked.toLowerCase() === sectionKey.toLowerCase(),
      );

      if (isLockedType) {
        // Component is in a locked zone
        if (defaultBlueprint) {
          const defaultComp = defaultBlueprint.components[sectionKey];
          if (!defaultComp) {
            violations.push({
              ruleId: 'locked-zone-added',
              message: `Locked zone "${sectionKey}" (${component.type}) cannot be added or created by AI`,
              severity: 'error',
              path: `components.${sectionKey}`,
            });
          } else if (!deepEqual(component, defaultComp)) {
            violations.push({
              ruleId: 'locked-zone-modified',
              message: `Locked zone "${sectionKey}" (${component.type}) was modified. Changes to locked zones are prohibited.`,
              severity: 'error',
              path: `components.${sectionKey}`,
            });
          }
        } else if (component.locked === false) {
          violations.push({
            ruleId: 'locked-zone-unlocked',
            message: `Component "${sectionKey}" (${component.type}) belongs to locked policy list but has locked: false`,
            severity: 'error',
            path: `components.${sectionKey}.locked`,
          });
        }
      }
    }

    // Check if any locked component from default was deleted in the blueprint
    if (defaultBlueprint) {
      for (const [sectionKey, defaultComp] of Object.entries(defaultBlueprint.components)) {
        const isLockedType = policy.locked.some(
          (locked) =>
            locked.toLowerCase() === defaultComp.type.toLowerCase() ||
            locked.toLowerCase() === sectionKey.toLowerCase(),
        );
        if (isLockedType && !blueprint.components[sectionKey]) {
          violations.push({
            ruleId: 'locked-zone-removed',
            message: `Locked zone "${sectionKey}" (${defaultComp.type}) cannot be removed`,
            severity: 'error',
            path: `components.${sectionKey}`,
          });
        }
      }
    }
  }

  // ─── 2. Banned Phrases Check ────────────────────────────────────────────────
  if (policy.bannedPhrases && policy.bannedPhrases.length > 0) {
    const textNodes = extractStrings(blueprint.components, 'components');

    for (const banned of policy.bannedPhrases) {
      const lowerBanned = banned.toLowerCase();
      for (const { path, text } of textNodes) {
        if (text.toLowerCase().includes(lowerBanned)) {
          violations.push({
            ruleId: 'banned-phrase',
            message: `Banned phrase "${banned}" found in blueprint content: "${text.substring(0, 60)}"`,
            severity: 'error',
            path,
          });
        }
      }
    }
  }

  // ─── 3. Required Elements Check ─────────────────────────────────────────────
  if (policy.requiredElements && policy.requiredElements.length > 0) {
    const allText = JSON.stringify(blueprint).toLowerCase();
    const componentTypes = Object.values(blueprint.components).map((c) => c.type.toLowerCase());
    const componentKeys = Object.keys(blueprint.components).map((k) => k.toLowerCase());

    for (const req of policy.requiredElements) {
      const reqLower = req.toLowerCase();
      const foundAsType = componentTypes.includes(reqLower);
      const foundAsKey = componentKeys.includes(reqLower);
      const foundInContent = allText.includes(reqLower);
      const isPrivacyMatch = (reqLower === 'privacy-link' || reqLower === 'privacy') && (allText.includes('privacy') || allText.includes('/privacy'));
      const isCookieMatch = (reqLower === 'cookie-consent' || reqLower === 'cookie') && (allText.includes('cookie') || allText.includes('consent') || allText.includes('compliance'));

      if (!foundAsType && !foundAsKey && !foundInContent && !isPrivacyMatch && !isCookieMatch) {
        violations.push({
          ruleId: 'required-element-missing',
          message: `Required policy element "${req}" is missing from the blueprint`,
          severity: 'error',
        });
      }
    }
  }

  // ─── 4. Allowed Actions Check ───────────────────────────────────────────────
  if (policy.allowedActions && policy.allowedActions.length > 0) {
    const checkAction = (actionStr: unknown, path: string) => {
      if (typeof actionStr !== 'string') return;
      const colonIdx = actionStr.indexOf(':');
      const prefix = colonIdx !== -1 ? actionStr.substring(0, colonIdx) : actionStr;

      if (!policy.allowedActions.includes(prefix)) {
        violations.push({
          ruleId: 'disallowed-action',
          message: `Action "${actionStr}" uses prefix "${prefix}", which is not in allowed actions: [${policy.allowedActions.join(', ')}]`,
          severity: 'error',
          path,
        });
      }
    };

    if (blueprint.flow) {
      if (blueprint.flow.onPrimaryCta) {
        checkAction(blueprint.flow.onPrimaryCta, 'flow.onPrimaryCta');
      }
      if (blueprint.flow.onSecondaryCta) {
        checkAction(blueprint.flow.onSecondaryCta, 'flow.onSecondaryCta');
      }
      if (blueprint.flow.actions) {
        for (const [name, action] of Object.entries(blueprint.flow.actions)) {
          checkAction(action, `flow.actions.${name}`);
        }
      }
      if (blueprint.flow.conditionalSteps) {
        blueprint.flow.conditionalSteps.forEach((step, idx) => {
          checkAction(step.action, `flow.conditionalSteps[${idx}].action`);
        });
      }
    }

    // Also check actions inside component props (e.g. cta.action)
    for (const [sectionKey, comp] of Object.entries(blueprint.components)) {
      if (comp.props) {
        const propsStrings = extractStrings(comp.props, `components.${sectionKey}.props`);
        for (const { path, text } of propsStrings) {
          if (
            path.toLowerCase().includes('action') ||
            path.toLowerCase().includes('cta') ||
            path.toLowerCase().includes('href')
          ) {
            if (text.includes(':') && !text.startsWith('http://') && !text.startsWith('https://')) {
              checkAction(text, path);
            }
          }
        }
      }
    }
  }

  // ─── 5. Max Section Changes Check ───────────────────────────────────────────
  if (defaultBlueprint && typeof policy.maxSectionChanges === 'number') {
    const defaultSections = defaultBlueprint.layout.sections;
    const currentSections = blueprint.layout.sections;

    let changedCount = 0;
    // Check removed or reordered sections
    for (let i = 0; i < currentSections.length; i++) {
      const section = currentSections[i];
      const defaultIndex = defaultSections.indexOf(section!);
      if (defaultIndex === -1) {
        changedCount++; // Added section
      } else if (defaultIndex !== i) {
        changedCount++; // Moved section
      } else {
        // Same position, check if component props changed
        const currentComp = blueprint.components[section!];
        const defaultComp = defaultBlueprint.components[section!];
        if (!deepEqual(currentComp, defaultComp)) {
          changedCount++; // Modified section
        }
      }
    }

    // Check deleted sections
    for (const defSec of defaultSections) {
      if (!currentSections.includes(defSec)) {
        changedCount++;
      }
    }

    if (changedCount > policy.maxSectionChanges) {
      violations.push({
        ruleId: 'max-section-changes-exceeded',
        message: `Section changes (${changedCount}) exceeded policy limit of ${policy.maxSectionChanges}`,
        severity: 'error',
        path: 'layout.sections',
      });
    }
  }

  // ─── 6. Accessibility Checks ────────────────────────────────────────────────
  if (policy.a11y) {
    if (policy.a11y.requireAltText) {
      for (const [sectionKey, comp] of Object.entries(blueprint.components)) {
        if (comp.props) {
          const props = comp.props;
          // Check for images
          if ('image' in props || 'imageUrl' in props || 'media' in props) {
            const hasAlt = 'alt' in props || 'imageAlt' in props || 'mediaAlt' in props;
            if (!hasAlt) {
              violations.push({
                ruleId: 'a11y-missing-alt',
                message: `Component "${sectionKey}" has media/image without required alt text`,
                severity: 'error',
                path: `components.${sectionKey}.props`,
              });
            }
          }
        }
      }
    }
  }

  // Determine overall pass/fail (any error severity fails)
  const hasErrors = violations.some((v) => v.severity === 'error');

  return {
    passed: !hasErrors,
    violations,
  };
}
