/**
 * @aui/models — Model adapter interface and provider implementations
 *
 * Any AI model can drive the engine through this uniform interface.
 * The engine never contains provider-specific logic outside adapters.
 *
 * @packageDocumentation
 */

export { type ModelAdapter, type ModelCapabilities } from './adapter.js';
export { type GenerateRequest, type GenerateResult, type CostEstimate } from './types.js';
export {
  type ModelRouterConfig,
  type ModelRoute,
  type ModelRouter,
  createModelRouter,
} from './router.js';
export { createOpenAIAdapter } from './adapters/openai.js';
export { createAnthropicAdapter } from './adapters/anthropic.js';
export { createGoogleAdapter } from './adapters/google.js';
export { createGenericHttpAdapter } from './adapters/generic-http.js';
export { RECOMMENDED_MODELS, getRecommendedModel, type ModelPreset } from './catalog.js';
