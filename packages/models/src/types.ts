// ─── Generate Request ───────────────────────────────────────────────────────

/** The input to a model adapter's generate() method */
export interface GenerateRequest {
  /** System prompt (role, constraints, catalog) */
  system: string;
  /** Composed context + instructions (the "user" message) */
  input: string;
  /** JSON Schema the output must conform to */
  outputSchema: Record<string, unknown>;
  /** Model temperature (0 = deterministic, 1 = creative) */
  temperature?: number;
  /** Maximum output tokens */
  maxOutputTokens?: number;
  /** Hard timeout in milliseconds */
  timeoutMs: number;
  /** Optional: images to include in context */
  images?: Array<{ url: string; mimeType: string }>;
}

// ─── Generate Result ────────────────────────────────────────────────────────

/** The output from a model adapter's generate() method */
export interface GenerateResult {
  /** Raw string response from the model */
  raw: string;
  /** Parsed JSON if the model returned valid JSON */
  parsed?: unknown;
  /** Token usage for cost tracking */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  /** End-to-end latency in milliseconds */
  latencyMs: number;
  /** Whether the response was streamed */
  streamed?: boolean;
  /** Model-specific finish reason */
  finishReason?: 'stop' | 'length' | 'content_filter' | 'error';
}

// ─── Cost Estimate ──────────────────────────────────────────────────────────

/** Pre-call cost estimate returned by estimateCost() */
export interface CostEstimate {
  /** Estimated input token count */
  estimatedInputTokens: number;
  /** Estimated output token count */
  estimatedOutputTokens: number;
  /** Estimated cost in USD */
  estimatedCostUsd: number;
  /** Estimated latency in milliseconds */
  estimatedLatencyMs: number;
}
