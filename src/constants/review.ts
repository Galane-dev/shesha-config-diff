import type { ReviewRule, ReviewStatus } from '../types/review';

export const REVIEW_RULE_LABELS: Record<ReviewRule, string> = {
  'console-usage': 'Console usage',
  'sensitive-logging': 'Sensitive logging',
  'syntax-error': 'Syntax review',
  'error-handling': 'Error handling',
  'unhandled-promise': 'Promise rejection',
  'async-completion': 'Async completion',
  'unsafe-access': 'Runtime access',
  'test-url': 'Test URLs',
  'insecure-http': 'Insecure HTTP',
  'embedded-credential': 'Embedded credentials',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  new: 'New',
  existing: 'Existing',
  resolved: 'Resolved',
  unverified: 'Unverified',
};

export const MAX_REVIEW_SCRIPT_LENGTH = 250_000;
