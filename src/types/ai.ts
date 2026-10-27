export type AiProviderId = 'anthropic' | 'gemini' | 'openai' | 'openai-compatible';

export interface IAiPreferences {
  endpoint: string;
  model: string;
  provider: AiProviderId;
}

export interface IAiSettings extends IAiPreferences {
  apiKey: string;
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
