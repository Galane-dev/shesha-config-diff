export type ReviewRule = 'console-usage' | 'sensitive-logging' | 'syntax-error';
export type ReviewStatus = 'new' | 'existing' | 'resolved' | 'unverified';

export interface IScriptSource {
  id: string;
  label: string;
  path: string;
  source: string;
}

export interface IScriptFinding {
  column: number;
  fingerprint: string;
  line: number;
  message: string;
  rule: ReviewRule;
  title: string;
}

export interface IScriptReview {
  complete: boolean;
  findings: IScriptFinding[];
  limitation?: string;
  script: IScriptSource;
}

export interface IReviewFinding extends IScriptFinding {
  id: string;
  script: IScriptSource;
  side: 'Before' | 'After';
  status: ReviewStatus;
}

export interface IReviewReport {
  findings: IReviewFinding[];
  limitations: { label: string; reason: string; side: 'Before' | 'After' }[];
  scriptCount: number;
}
