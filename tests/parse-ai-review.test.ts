import { describe, expect, it } from 'vitest';
import type { IAiReviewTarget } from '../src/types/ai';
import { parseReview } from '../src/utils/ai/parse-review';

const targets: IAiReviewTarget[] = [
  { id: 'target-1', label: 'Form settings', path: 'formSettings', source: '{}', truncated: false },
];
const improvement = {
  title: 'Wait for save',
  targetId: 'target-1',
  reason: 'Navigation may happen first.',
  suggestion: 'Return the save promise.',
};
const edgeCase = {
  title: 'Failed save',
  targetId: 'target-1',
  scenario: 'Simulate a network failure.',
  expected: 'Remain on the current step.',
};
const review = {
  summary: 'The save action changed.',
  improvements: [improvement],
  edgeCases: [edgeCase],
};

describe('AI review validation', () => {
  it('accepts a complete review and empty recommendation lists', () => {
    expect(parseReview(JSON.stringify(review), targets)).toEqual(review);
    expect(
      parseReview(JSON.stringify({ ...review, improvements: [], edgeCases: [] }), targets)
        .improvements,
    ).toEqual([]);
  });

  it('accepts a single JSON fence but not unrelated prose', () => {
    expect(parseReview(`\n\`\`\`json\n${JSON.stringify(review)}\n\`\`\`\n`, targets)).toEqual(
      review,
    );
    expect(() => parseReview(`Here is the review: ${JSON.stringify(review)}`, targets)).toThrow(
      'expected review format',
    );
  });

  it.each([
    'null',
    '[]',
    '{}',
    '{',
    JSON.stringify({ ...review, edgeCases: null }),
    JSON.stringify({ ...review, summary: '' }),
  ])('rejects invalid output without rendering it: %s', (content) => {
    expect(() => parseReview(content, targets)).toThrow('expected review format');
  });

  it('rejects invented references and cannot link to a removed or omitted location', () => {
    expect(() =>
      parseReview(
        JSON.stringify({ ...review, improvements: [{ ...improvement, targetId: 'before-only' }] }),
        targets,
      ),
    ).toThrow('outside the supplied latest form');
  });

  it('caps item counts and text lengths rather than displaying a long essay', () => {
    const result = parseReview(
      JSON.stringify({
        summary: 's'.repeat(900),
        improvements: Array.from({ length: 10 }, () => ({
          ...improvement,
          reason: 'r'.repeat(1_000),
        })),
        edgeCases: Array.from({ length: 10 }, () => edgeCase),
      }),
      targets,
    );
    expect(result.summary.length).toBe(500);
    expect(result.improvements).toHaveLength(3);
    expect(result.edgeCases).toHaveLength(3);
    expect(result.improvements[0]?.reason.length).toBe(240);
  });

  it('rejects excessively large provider output', () => {
    expect(() => parseReview('x'.repeat(30_001), targets)).toThrow('expected review format');
  });
});
