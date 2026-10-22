/**
 * @aui/policy — Declarative policy language and defaults
 *
 * Policies control what the AI is allowed to do. They are stored
 * in the control plane, versioned, and testable.
 *
 * @packageDocumentation
 */

export { type Policy, type PolicyRule, type PolicyResult } from './types.js';
export { evaluatePolicy } from './evaluate.js';
export { DEFAULT_POLICY } from './defaults.js';
