export type AiProviderId = 'anthropic' | 'gemini' | 'openai' | 'openai-compatible';

export interface IAiSettings {
  apiKey: string;
  endpoint: string;
  model: string;
  provider: AiProviderId;
}

export interface IAiProviderDefinition {
  defaultEndpoint: string;
  defaultModel: string;
  id: AiProviderId;
  label: string;
  modelPlaceholder: string;
}

export interface IAiExplanationResult {
  content: string;
  redactionCount: number;
  wasTruncated: boolean;
}
