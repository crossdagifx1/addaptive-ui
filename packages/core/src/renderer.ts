import type { Blueprint, DesignTokens } from '@aui/schema';
import type { ComponentRegistry } from './registry.js';

// ─── Renderer Config ────────────────────────────────────────────────────────

/** Configuration for the blueprint renderer */
export interface RendererConfig {
  /** DOM element to render into (element or selector) */
  rootElement?: HTMLElement | string;
  /** Integration mode */
  mode: 'component-mapping' | 'hosted-pack' | 'overlay';
  /** Whether to use CSS variables for token swaps (no re-render) */
  useCssVariables: boolean;
  /** Whether to reserve dimensions for swappable media */
  reserveDimensions: boolean;
  /** Respect prefers-reduced-motion */
  respectReducedMotion: boolean;
  /** Respect prefers-color-scheme */
  respectColorScheme: boolean;
}

// ─── Render Result ──────────────────────────────────────────────────────────

/** Result of rendering a blueprint */
export interface RenderResult {
  /** Whether rendering succeeded */
  success: boolean;
  /** The rendered blueprint (or the default if fallback triggered) */
  blueprintUsed: Blueprint;
  /** Whether fallback was triggered */
  fellBack: boolean;
  /** Render time in milliseconds */
  renderTimeMs: number;
  /** Any non-fatal issues encountered */
  warnings?: string[];
  /** Cleanup function to unmount rendered components */
  cleanup?: () => void;
}

/**
 * Applies design tokens as CSS variables on a container element.
 *
 * Variables mapped:
 * - --aui-color-primary, --aui-color-secondary, --aui-color-background, etc.
 * - --aui-font-heading, --aui-font-body
 * - --aui-radius-scale, --aui-shadow-intensity
 * - --aui-density-gap, --aui-density-padding
 */
export function applyTokens(tokens?: DesignTokens, targetElement?: HTMLElement): void {
  if (!tokens || !targetElement) return;

  for (const [key, value] of Object.entries(tokens)) {
    if (value === undefined) continue;

    if (key === 'density') {
      const gapMap = { compact: '8px', comfortable: '16px', spacious: '24px' };
      const paddingMap = { compact: '12px', comfortable: '20px', spacious: '32px' };
      const densityVal = value as 'compact' | 'comfortable' | 'spacious';
      targetElement.style.setProperty('--aui-density-gap', gapMap[densityVal] || '16px');
      targetElement.style.setProperty('--aui-density-padding', paddingMap[densityVal] || '20px');
    } else {
      // Convert key like "color.primary" to "--aui-color-primary"
      const cssVarName = `--aui-${key.replace(/\./g, '-')}`;
      targetElement.style.setProperty(cssVarName, String(value));
    }
  }
}

/**
 * Resolves a root container element from an HTMLElement or query selector.
 */
function resolveRootElement(root?: HTMLElement | string): HTMLElement | null {
  if (typeof root === 'string') {
    return document.querySelector(root);
  }
  if (root && typeof root === 'object' && 'nodeType' in root) {
    return root;
  }
  if (typeof document !== 'undefined') {
    return document.getElementById('aui-root') || document.body;
  }
  return null;
}

/**
 * Renders a blueprint safely into the DOM.
 *
 * Guarantees:
 * - Never runs untrusted code: all rendering is done through approved registered components.
 * - Always degrades gracefully: any error triggers instant fallback to default blueprint.
 * - Respects prefers-reduced-motion and system preferences.
 */
export async function renderBlueprint(options: {
  blueprint: Blueprint;
  registry: ComponentRegistry;
  config: RendererConfig;
  defaultBlueprint?: Blueprint;
}): Promise<RenderResult> {
  const { blueprint, registry, config, defaultBlueprint } = options;
  const start = performance.now();
  const warnings: string[] = [];
  const cleanupFns: Array<() => void> = [];

  const root = resolveRootElement(config.rootElement);
  if (!root) {
    return {
      success: false,
      blueprintUsed: defaultBlueprint || blueprint,
      fellBack: false,
      renderTimeMs: performance.now() - start,
      warnings: ['Could not find root DOM element for rendering'],
    };
  }

  const renderAttempt = (activeBlueprint: Blueprint, isFallbackAttempt = false): boolean => {
    try {
      // 1. Apply design tokens
      if (config.useCssVariables && activeBlueprint.tokens) {
        applyTokens(activeBlueprint.tokens, root);
      }

      // 2. Handle accessibility & motion preferences
      if (typeof window !== 'undefined' && window.matchMedia) {
        if (config.respectReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          root.style.setProperty('--aui-transition-duration', '0ms');
          root.style.setProperty('--aui-animation-duration', '0ms');
        }
      }

      // 3. Render according to mode
      if (config.mode === 'overlay') {
        // Overlay Mode: adjust existing zones in DOM
        for (const [sectionKey, compDef] of Object.entries(activeBlueprint.components)) {
          const zoneEl = root.querySelector(`[data-aui-zone="${sectionKey}"], [data-aui-section="${sectionKey}"]`) as HTMLElement;
          if (!zoneEl) {
            warnings.push(`Zone element "[data-aui-zone="${sectionKey}"]" not found in DOM`);
            continue;
          }

          const registered = registry.get(compDef.type);
          if (registered) {
            const cleanup = registered.renderer(compDef.props || {}, zoneEl, compDef.variant);
            if (typeof cleanup === 'function') cleanupFns.push(cleanup);
          }
        }
      } else {
        // Component-mapping & Hosted-pack modes: full layout composition
        root.innerHTML = '';
        root.setAttribute('data-aui-rendered', 'true');
        root.setAttribute('data-aui-blueprint-id', activeBlueprint.blueprintId);

        const container = document.createElement('div');
        container.className = 'aui-layout-container';

        // Apply layout styles
        if (activeBlueprint.layout.type === 'grid') {
          container.style.display = 'grid';
          container.style.gridTemplateColumns = `repeat(${activeBlueprint.layout.columns || 1}, minmax(0, 1fr))`;
        } else {
          container.style.display = 'flex';
          container.style.flexDirection = 'column';
        }

        if (activeBlueprint.layout.gap) {
          container.style.gap = activeBlueprint.layout.gap;
        }

        for (const sectionName of activeBlueprint.layout.sections) {
          const compDef = activeBlueprint.components[sectionName];
          if (!compDef) {
            warnings.push(`Section "${sectionName}" declared in layout but missing from components`);
            continue;
          }

          const registered = registry.get(compDef.type);
          if (!registered) {
            throw new Error(`Component type "${compDef.type}" for section "${sectionName}" is not registered`);
          }

          const sectionEl = document.createElement('section');
          sectionEl.setAttribute('data-aui-section', sectionName);
          sectionEl.setAttribute('data-aui-type', compDef.type);
          if (compDef.variant) sectionEl.setAttribute('data-aui-variant', compDef.variant);
          if (compDef.locked) sectionEl.setAttribute('data-aui-locked', 'true');

          const cleanup = registered.renderer(compDef.props || {}, sectionEl, compDef.variant);
          if (typeof cleanup === 'function') cleanupFns.push(cleanup);

          container.appendChild(sectionEl);
        }

        root.appendChild(container);
      }

      return true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      warnings.push(`Render error: ${errMsg}`);

      if (!isFallbackAttempt && defaultBlueprint) {
        // Trigger graceful degradation to default blueprint
        cleanupFns.forEach((fn) => fn());
        cleanupFns.length = 0;
        return false;
      }
      return false;
    }
  };

  const primarySuccess = renderAttempt(blueprint, false);

  if (!primarySuccess && defaultBlueprint) {
    const fallbackSuccess = renderAttempt(defaultBlueprint, true);
    return {
      success: fallbackSuccess,
      blueprintUsed: defaultBlueprint,
      fellBack: true,
      renderTimeMs: performance.now() - start,
      warnings,
      cleanup: () => cleanupFns.forEach((fn) => fn()),
    };
  }

  return {
    success: primarySuccess,
    blueprintUsed: blueprint,
    fellBack: false,
    renderTimeMs: performance.now() - start,
    warnings: warnings.length > 0 ? warnings : undefined,
    cleanup: () => cleanupFns.forEach((fn) => fn()),
  };
}
