export type ReviewRule =
  | 'console-usage'
  | 'sensitive-logging'
  | 'syntax-error'
  | 'error-handling'
  | 'unhandled-promise'
  | 'async-completion'
  | 'unsafe-access'
  | 'test-url'
  | 'insecure-http'
  | 'embedded-credential';
export type ReviewStatus = 'new' | 'existing' | 'resolved' | 'unverified';

export interface ISourceRange {
  start: number;
  end: number;
}

interface IReviewSource {
  id: string;
  label: string;
  path: string;
  source: string;
}

export interface IScriptSource extends IReviewSource {
  kind?: 'script';
  executionContext?: 'sync' | 'async' | 'unknown';
  requiresCompletion?: boolean;
}

export interface IConfigurationSource extends IReviewSource {
  kind: 'configuration';
  propertyName: string;
}

export type ReviewSource = IScriptSource | IConfigurationSource;

export interface IScriptFinding {
  column: number;
  fingerprint: string;
  line: number;
  message: string;
  rule: ReviewRule;
  title: string;
  redactions?: ISourceRange[];
}

export interface IScriptReview {
  complete: boolean;
  findings: IScriptFinding[];
  limitation?: string;
  script: ReviewSource;
}

export interface IReviewFinding extends IScriptFinding {
  id: string;
  script: ReviewSource;
  side: 'Before' | 'After';
  status: ReviewStatus;
}

export interface IReviewReport {
  findings: IReviewFinding[];
  limitations: { label: string; reason: string; side: 'Before' | 'After' }[];
  scriptCount: number;
  configurationCount: number;
}
