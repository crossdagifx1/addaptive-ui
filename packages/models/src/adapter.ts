import type { GenerateRequest, GenerateResult, CostEstimate } from './types.js';

// ─── Model Capabilities ─────────────────────────────────────────────────────

/** Declares what a model can do, so the engine can adapt its strategy */
export interface ModelCapabilities {
  /** How the model handles structured output */
  structuredOutput: 'native' | 'prompted' | 'none';
  /** Maximum input context in tokens */
  maxContextTokens: number;
  /** Whether the model supports streaming responses */
  supportsStreaming: boolean;
  /** Whether the model can process images in context */
  supportsImages: boolean;
  /** Model-specific metadata (e.g., provider name, version) */
  metadata?: Record<string, unknown>;
}

// ─── Model Adapter ──────────────────────────────────────────────────────────

/**
 * The core contract every model must satisfy.
 *
 * Adapters wrap provider-specific SDKs (OpenAI, Anthropic, Google, etc.)
 * behind this uniform interface. The engine, decision service, and router
 * only ever interact with this shape.
 */
export interface ModelAdapter {
  /** Unique adapter identifier (e.g., "openai-gpt-4o", "anthropic-claude-3") */
  id: string;

  /** What this model can do */
  capabilities: ModelCapabilities;

  /**
   * Generate a blueprint (or blueprint patch) from a prompt.
   * The request includes the schema the output must conform to.
   */
  generate(request: GenerateRequest): Promise<GenerateResult>;

  /**
   * Estimate the cost of a generation request without calling the model.
   * Used by the router for cost-based routing decisions.
   */
  estimateCost(request: GenerateRequest): CostEstimate;

  /**
   * Optional health check — returns true if the adapter can reach its provider.
   */
  healthCheck?(): Promise<boolean>;
}
