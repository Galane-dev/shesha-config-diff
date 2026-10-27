import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ReviewFindingDetails } from '../src/components/ReviewFindingDetails';
import type { IReviewFinding } from '../src/types/review';

afterEach(cleanup);

const finding: IReviewFinding = {
  id: 'test', rule: 'sensitive-logging', status: 'new', side: 'After', line: 2, column: 1,
  title: 'Potentially sensitive console.log', message: 'Review whether personal information could be exposed.', fingerprint: 'test',
  script: { id: 'script', label: 'Wizard / Step 2 - Details / Before Next', path: 'steps[id="details"].beforeNext',
    source: 'const value = data;\nconsole.log("<img src=x onerror=alert(1)>", value);\nreturn value;' },
};

describe('review finding evidence', () => {
  it('shows location and evidence as text, without rendering uploaded HTML', () => {
    const { container } = render(createElement(ReviewFindingDetails, { finding }));
    expect(screen.getByLabelText('Script evidence').textContent).toContain('<img src=x onerror=alert(1)>');
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('After | Line 2, column 1')).toBeDefined();
    expect(screen.getByTitle(finding.script.path).textContent).toBe(finding.script.label);
    expect(container.querySelector('[data-line="2"]')?.textContent).toContain('console.log');
  });

  it('labels incomplete comparisons clearly', () => {
    render(createElement(ReviewFindingDetails, { finding: { ...finding, status: 'unverified', side: 'Before' } }));
    expect(screen.getByText(/Comparison incomplete/)).toBeDefined();
    expect(screen.getByText('Before | Line 2, column 1')).toBeDefined();
  });

  it('keeps the empty selection state', () => {
    render(createElement(ReviewFindingDetails));
    expect(screen.getByText('Select a finding')).toBeDefined();
  });
});
