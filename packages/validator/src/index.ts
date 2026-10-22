/**
 * @aui/validator — Blueprint validation and policy enforcement
 *
 * Every model output passes through this package before rendering.
 * Validation is multi-stage and all stages must pass.
 *
 * @packageDocumentation
 */

export { type ValidationResult, type ValidationError, type ValidationStage } from './types.js';
export { validateBlueprint } from './validate.js';
export { type ValidatorConfig } from './config.js';
