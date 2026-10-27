import type { IAiProviderDefinition, IAiSettings } from '../types/ai';

const OPENAI_PROVIDER: IAiProviderDefinition = {
  id: 'openai',
  label: 'OpenAI',
  defaultEndpoint: 'https://api.openai.com/v1/responses',
  defaultModel: '',
  modelPlaceholder: 'Enter an available text model',
};

export const AI_PROVIDERS: IAiProviderDefinition[] = [
  OPENAI_PROVIDER,
  {
    id: 'anthropic',
    label: 'Anthropic',
    defaultEndpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: '',
    modelPlaceholder: 'Enter an available Claude model',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: '',
    modelPlaceholder: 'Enter an available Gemini model',
  },
  {
    id: 'openai-compatible',
    label: 'OpenAI-compatible',
    defaultEndpoint: '',
    defaultModel: '',
    modelPlaceholder: 'Enter the provider model name',
  },
];

export const DEFAULT_AI_SETTINGS: IAiSettings = {
  apiKey: '',
  endpoint: OPENAI_PROVIDER.defaultEndpoint,
  model: OPENAI_PROVIDER.defaultModel,
  provider: OPENAI_PROVIDER.id,
};
