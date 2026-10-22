/**
 * @aui/core — Core renderer, component registry, signals, fallback, and undo
 *
 * This is the browser-side engine. It renders blueprints using registered
 * components (web components for portability), collects visitor signals,
 * and handles fallback + undo.
 *
 * @packageDocumentation
 */

export {
  type RendererConfig,
  type RenderResult,
  renderBlueprint,
  applyTokens,
} from './renderer.js';

export {
  type ComponentRegistry,
  type RegisteredComponent,
  type ComponentRenderer,
  createComponentRegistry,
} from './registry.js';

export {
  type SignalCollector,
  type Signal,
  type SignalConfig,
  createSignalCollector,
} from './signals.js';

export {
  type FallbackManager,
  createFallbackManager,
} from './fallback.js';

export {
  type UndoManager,
  createUndoManager,
} from './undo.js';

export {
  type AUIClientConfig,
  type AUIClient,
  createAUIClient,
} from './client.js';

export {
  type PropTransformRule,
  type ComponentMappingConfig,
  ComponentMapper,
  createComponentMapper,
  mapComponentProps,
  getByPath,
} from './mapping.js';

export {
  canonicalizeBlueprint,
  verifyBlueprintSignature,
} from './signing.js';


