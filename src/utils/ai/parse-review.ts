import type { IAiEdgeCase, IAiImprovement, IAiReview, IAiReviewTarget } from '../../types/ai';

const INVALID_REVIEW =
  'The provider did not return the expected review format. Try generating the review again.';

const readObject = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(INVALID_REVIEW);
  }
  return value as Record<string, unknown>;
};

const readText = (value: unknown, limit: number): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(INVALID_REVIEW);
  }
  const text = value.trim();
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
};

export const parseReview = (content: string, targets: IAiReviewTarget[]): IAiReview => {
  if (content.length > 30_000) {
    throw new Error(INVALID_REVIEW);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(
      content.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1'),
    ) as unknown;
  } catch {
    throw new Error(INVALID_REVIEW);
  }
  const review = readObject(parsed);
  const targetIds = new Set(targets.map((target) => target.id));

  const readItems = <T>(value: unknown, readItem: (item: Record<string, unknown>) => T): T[] => {
    if (!Array.isArray(value)) {
      throw new Error(INVALID_REVIEW);
    }
    return value.slice(0, 3).map((entry: unknown) => {
      const item = readObject(entry);
      if (!targetIds.has(String(item.targetId))) {
        throw new Error(
          'The provider referenced a location outside the supplied latest form. Try generating the review again.',
        );
      }
      return readItem(item);
    });
  };

  return {
    summary: readText(review.summary, 500),
    improvements: readItems<IAiImprovement>(review.improvements, (item) => ({
      title: readText(item.title, 100),
      targetId: readText(item.targetId, 100),
      reason: readText(item.reason, 240),
      suggestion: readText(item.suggestion, 240),
    })),
    edgeCases: readItems<IAiEdgeCase>(review.edgeCases, (item) => ({
      title: readText(item.title, 100),
      targetId: readText(item.targetId, 100),
      scenario: readText(item.scenario, 240),
      expected: readText(item.expected, 240),
    })),
  };
};
