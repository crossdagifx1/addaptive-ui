import type { Blueprint } from '@aui/schema';
import { renderBlueprint, type RendererConfig, type RenderResult } from './renderer.js';
import { createSignalCollector, type SignalConfig, type SignalCollector } from './signals.js';
import { createComponentRegistry, type ComponentRegistry } from './registry.js';
import { createFallbackManager, type FallbackManager } from './fallback.js';
import { createUndoManager, type UndoManager } from './undo.js';
import { verifyBlueprintSignature } from './signing.js';

// ─── AUI Client Config ─────────────────────────────────────────────────────

/** Top-level configuration for the AUI client SDK */
export interface AUIClientConfig {
  /** Site identifier */
  siteId: string;
  /** API endpoint for fetching blueprints */
  apiEndpoint: string;
  /** Renderer configuration */
  renderer: RendererConfig;
  /** Signal collection configuration */
  signals?: SignalConfig;
  /** Default blueprint (for instant fallback) */
  defaultBlueprint?: Blueprint;
  /** Show "Reset to default" control */
  showResetControl?: boolean;
  /** Show "Why am I seeing this?" control */
  showExplanationControl?: boolean;
  /** Locked zones (component types that cannot be modified) */
  lockedZones?: string[];
  /** Secret or verification key for validating signed blueprints */
  signatureKey?: string;
  /** If true, reject unsigned blueprints or blueprints with invalid signatures */
  requireSignedBlueprints?: boolean;
}

/** The main AUI client instance */
export interface AUIClient {
  /** The component registry */
  registry: ComponentRegistry;
  /** Fallback manager */
  fallback: FallbackManager;
  /** Undo manager */
  undo: UndoManager;
  /** Signal collector */
  signals?: SignalCollector;
  /** Initialize and render */
  init(): Promise<RenderResult | undefined>;
  /** Apply a new blueprint */
  applyBlueprint(blueprint: Blueprint): Promise<RenderResult>;
  /** Reset to default */
  reset(): Promise<RenderResult | undefined>;
  /** Destroy the client and clean up */
  destroy(): void;
}

/**
 * Creates the main AUI client instance.
 * This is the primary entry point for the browser SDK.
 */
export function createAUIClient(config: AUIClientConfig): AUIClient {
  const registry = createComponentRegistry();
  const fallback = createFallbackManager(config.defaultBlueprint);
  const undo = createUndoManager(config.defaultBlueprint);

  let signalCollector: SignalCollector | undefined;
  if (config.signals) {
    signalCollector = createSignalCollector(config.signals, {
      pageId: config.defaultBlueprint?.pageId || 'home',
      blueprintId: config.defaultBlueprint?.blueprintId,
    });
  }

  let resetBtnEl: HTMLElement | null = null;
  let activeCleanup: (() => void) | undefined;

  const mountControls = (client: AUIClient) => {
    if (typeof document === 'undefined') return;

    if (config.showResetControl && !resetBtnEl) {
      resetBtnEl = document.createElement('div');
      resetBtnEl.className = 'aui-reset-badge';
      resetBtnEl.setAttribute('role', 'region');
      resetBtnEl.setAttribute('aria-label', 'Adaptive UI controls');
      resetBtnEl.style.cssText = `
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 99999;
        display: flex;
        gap: 8px;
        align-items: center;
        background: rgba(17, 17, 24, 0.85);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #f5f5f5;
        padding: 6px 12px;
        border-radius: 999px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 12px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      `;

      const btn = document.createElement('button');
      btn.innerText = '↺ Reset to Default';
      btn.style.cssText = `
        background: none;
        border: none;
        color: #00e5ff;
        cursor: pointer;
        font-weight: 600;
        font-size: 12px;
        padding: 2px 4px;
      `;
      btn.onclick = () => {
        void client.reset();
      };
      resetBtnEl.appendChild(btn);

      if (config.showExplanationControl) {
        const info = document.createElement('span');
        info.innerText = '⚡ AI Adapted';
        info.style.opacity = '0.7';
        resetBtnEl.prepend(info);
      }

      document.body.appendChild(resetBtnEl);
    }
  };

  const client: AUIClient = {
    registry,
    fallback,
    undo,
    signals: signalCollector,

    async init() {
      signalCollector?.start();

      let result: RenderResult | undefined;
      // 1. Immediately render default blueprint if available (never block first paint)
      if (config.defaultBlueprint) {
        result = await renderBlueprint({
          blueprint: config.defaultBlueprint,
          registry,
          config: config.renderer,
          defaultBlueprint: config.defaultBlueprint,
        });
        activeCleanup = result.cleanup;
      }

      // 2. Attach UI controls if enabled
      mountControls(this);

      // 3. Optional async fetch for dynamic segment variant
      if (config.apiEndpoint && typeof fetch !== 'undefined') {
        try {
          const res = await fetch(`${config.apiEndpoint}?site=${encodeURIComponent(config.siteId)}`);
          if (res.ok) {
            const data = (await res.json()) as { blueprint?: Blueprint };
            if (data.blueprint) {
              result = await this.applyBlueprint(data.blueprint);
            }
          }
        } catch {
          // Gracefully continue with default blueprint on network error
        }
      }

      return result;
    },

    async applyBlueprint(blueprint: Blueprint) {
      if (config.signatureKey || config.requireSignedBlueprints) {
        if (!config.signatureKey) {
          throw new Error('signatureKey must be configured when requireSignedBlueprints is true');
        }
        const sigCheck = await verifyBlueprintSignature(blueprint, config.signatureKey);
        if (!sigCheck.valid) {
          console.warn(`[AUI Security] Rejected untrusted blueprint: ${sigCheck.reason}`);
          if (config.defaultBlueprint) {
            undo.push(config.defaultBlueprint);
            if (activeCleanup) activeCleanup();
            const fallbackResult = await renderBlueprint({
              blueprint: config.defaultBlueprint,
              registry,
              config: config.renderer,
              defaultBlueprint: config.defaultBlueprint,
            });
            activeCleanup = fallbackResult.cleanup;
            return {
              ...fallbackResult,
              fellBack: true,
              warnings: [...(fallbackResult.warnings || []), `Security rejection: ${sigCheck.reason}`],
            };
          }
          return {
            success: false,
            blueprintUsed: blueprint,
            fellBack: true,
            renderTimeMs: 0,
            warnings: [`Security rejection: ${sigCheck.reason}`],
          };
        }
      }

      undo.push(blueprint);
      if (activeCleanup) {
        activeCleanup();
      }

      const result = await renderBlueprint({
        blueprint,
        registry,
        config: config.renderer,
        defaultBlueprint: config.defaultBlueprint,
      });

      activeCleanup = result.cleanup;
      return result;
    },

    async reset() {
      const defaultBp = undo.resetToDefault() || fallback.getDefault();
      if (!defaultBp) return undefined;

      if (activeCleanup) {
        activeCleanup();
      }

      const result = await renderBlueprint({
        blueprint: defaultBp,
        registry,
        config: config.renderer,
        defaultBlueprint: config.defaultBlueprint,
      });

      activeCleanup = result.cleanup;
      return result;
    },

    destroy() {
      if (signalCollector) {
        void signalCollector.stop();
      }
      if (activeCleanup) {
        activeCleanup();
      }
      if (resetBtnEl && resetBtnEl.parentNode) {
        resetBtnEl.parentNode.removeChild(resetBtnEl);
        resetBtnEl = null;
      }
    },
  };

  return client;
}
