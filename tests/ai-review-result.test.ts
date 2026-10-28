import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { AiReviewResult } from '../src/components/AiReviewResult';
import type { IAiReview, IAiReviewTarget } from '../src/types/ai';

afterEach(cleanup);
const targets: IAiReviewTarget[] = [
  {
    id: 'target-1',
    label: 'Wizard / Details',
    path: 'components[id="wizard"]',
    source: '{"script":"return data;"}',
    truncated: false,
  },
];
const review: IAiReview = {
  summary: 'The submission action now waits for its save.',
  improvements: [
    {
      targetId: 'target-1',
      title: 'Handle a failed save',
      reason: 'A request can fail.',
      suggestion: 'Keep the user on the same step.',
    },
  ],
  edgeCases: [
    {
      targetId: 'target-1',
      title: 'Missing organisation',
      scenario: 'Open the form without an organisation.',
      expected: 'Show validation feedback.',
    },
  ],
};

describe('structured AI review display', () => {
  it('shows a compact summary and keeps suggestions and source collapsed initially', () => {
    render(createElement(AiReviewResult, { review, targets }));
    expect(screen.getByLabelText('Change summary').textContent).toContain(review.summary);
    const improvements = screen.getByRole('button', { name: /Suggested improvements/ });
    expect(improvements.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(improvements);
    expect(screen.getByText('Handle a failed save')).toBeDefined();
    expect(screen.getByText('After: Wizard / Details').closest('details')?.open).toBe(false);
    expect(screen.getByLabelText('After source: Wizard / Details').textContent).toBe(
      targets[0]?.source,
    );
  });

  it('renders provider content as literal text rather than executable HTML or Markdown', () => {
    const { container } = render(
      createElement(AiReviewResult, {
        review: { ...review, summary: '<img src=x onerror=alert(1)> [link](https://evil.example)' },
        targets,
      }),
    );
    expect(screen.getByLabelText('Change summary').textContent).toContain('<img');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
  });

  it('does not invent recommendations when the model returns empty lists', () => {
    render(
      createElement(AiReviewResult, {
        review: { ...review, improvements: [], edgeCases: [] },
        targets,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Suggested improvements/ }));
    expect(
      screen.getByText('No specific improvements identified in the supplied context.'),
    ).toBeDefined();
  });
});
