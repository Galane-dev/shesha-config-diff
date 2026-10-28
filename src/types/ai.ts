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

export interface IAiReviewTarget {
  id: string;
  label: string;
  path: string;
  source: string;
  truncated: boolean;
  kind?: 'script' | 'configuration' | 'component' | 'form-settings';
  executionContext?: 'sync' | 'async' | 'unknown';
  requiresCompletion?: boolean;
}

export interface IAiReviewRequest {
  payload: string;
  redactionCount: number;
  wasTruncated: boolean;
  targets: IAiReviewTarget[];
  omittedTargets: number;
}

interface IAiReviewItem {
  title: string;
  targetId: string;
}

export interface IAiImprovement extends IAiReviewItem {
  reason: string;
  suggestion: string;
}

export interface IAiEdgeCase extends IAiReviewItem {
  scenario: string;
  expected: string;
}

export interface IAiReview {
  summary: string;
  improvements: IAiImprovement[];
  edgeCases: IAiEdgeCase[];
}
