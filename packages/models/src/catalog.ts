export interface ModelPreset {
  id: string;
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'custom';
  model: string;
  displayName: string;
  tier: 'frontier' | 'fast' | 'reasoning' | 'local';
  inputCostPer1M: number;
  outputCostPer1M: number;
  contextWindow: number;
}

/**
 * Standard recommended models with up-to-date pricing and token budgets.
 * Configurable dynamically per site or environment.
 */
export const RECOMMENDED_MODELS: Record<string, ModelPreset> = {
  'claude-3-7-sonnet': {
    id: 'claude-3-7-sonnet',
    provider: 'anthropic',
    model: 'claude-3-7-sonnet-20250219',
    displayName: 'Claude 3.7 Sonnet',
    tier: 'frontier',
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    contextWindow: 200000,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'GPT-4o',
    tier: 'frontier',
    inputCostPer1M: 2.5,
    outputCostPer1M: 10.0,
    contextWindow: 128000,
  },
  'o3-mini': {
    id: 'o3-mini',
    provider: 'openai',
    model: 'o3-mini',
    displayName: 'OpenAI o3-mini',
    tier: 'reasoning',
    inputCostPer1M: 1.1,
    outputCostPer1M: 4.4,
    contextWindow: 200000,
  },
  'gemini-2-5-pro': {
    id: 'gemini-2-5-pro',
    provider: 'google',
    model: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    tier: 'frontier',
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.0,
    contextWindow: 1000000,
  },
  'gemini-2-0-flash': {
    id: 'gemini-2-0-flash',
    provider: 'google',
    model: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    tier: 'fast',
    inputCostPer1M: 0.1,
    outputCostPer1M: 0.4,
    contextWindow: 1000000,
  },
  'llama-3-3-70b': {
    id: 'llama-3-3-70b',
    provider: 'ollama',
    model: 'llama3.3:70b',
    displayName: 'Llama 3.3 70B (Local/VPC)',
    tier: 'local',
    inputCostPer1M: 0.0,
    outputCostPer1M: 0.0,
    contextWindow: 128000,
  },
};

export function getRecommendedModel(id: string): ModelPreset | undefined {
  return RECOMMENDED_MODELS[id];
}
