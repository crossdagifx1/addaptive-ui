/**
 * @aui/decision — Context builder, prompt composer, model router, decision pipeline
 *
 * Turns visitor signals + context into a validated blueprint using a model.
 *
 * @packageDocumentation
 */

export { type DecisionPipelineConfig, type DecisionResult } from './types.js';
export {
  type ContextBuilder,
  type VisitorContext,
  createContextBuilder,
} from './context.js';
export {
  type PromptComposer,
  type PromptTemplate,
  createPromptComposer,
  DEFAULT_PROMPT_TEMPLATE,
} from './prompt.js';
export {
  type DecisionPipeline,
  createDecisionPipeline,
} from './pipeline.js';
export * from './triggers.js';

