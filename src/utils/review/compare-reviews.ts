import type {
  IReviewFinding,
  IReviewReport,
  IScriptFinding,
  IScriptReview,
} from '../../types/review';
import type { ISheshaFormExport } from '../../types/shesha-form';
import { analyzeScript } from './analyze-script';
import { analyzeConfiguration } from './analyze-configuration';
import { collectReviewSources } from './collect-scripts';

const findingKey = (finding: IScriptFinding): string =>
  JSON.stringify([finding.rule, finding.fingerprint]);

export const compareReviews = (
  before: ISheshaFormExport,
  after: ISheshaFormExport,
): IReviewReport => {
  const reviewSources = (form: ISheshaFormExport): Map<string, IScriptReview> =>
    new Map(
      collectReviewSources(form).map((source) => [
        source.id,
        source.kind === 'configuration' ? analyzeConfiguration(source) : analyzeScript(source),
      ]),
    );
  const beforeReviews = reviewSources(before);
  const afterReviews = reviewSources(after);
  const findings: IReviewFinding[] = [];
  const limitations: IReviewReport['limitations'] = [];
  const append = (
    review: IScriptReview,
    finding: IScriptFinding,
    status: IReviewFinding['status'],
    side: IReviewFinding['side'],
  ): void => {
    findings.push({
      ...finding,
      script: review.script,
      side,
      status,
      id: `${review.script.id}:${side}:${findings.length}`,
      redactions: review.findings.flatMap((item) => item.redactions ?? []),
    });
  };

  for (const id of new Set([...afterReviews.keys(), ...beforeReviews.keys()])) {
    const oldReview = beforeReviews.get(id);
    const newReview = afterReviews.get(id);
    const oldByKey = new Map<string, IScriptFinding[]>();
    const matched = new Set<IScriptFinding>();
    for (const finding of oldReview?.findings ?? []) {
      const key = findingKey(finding);
      const bucket = oldByKey.get(key) ?? [];
      bucket.push(finding);
      oldByKey.set(key, bucket);
    }

    if (newReview) {
      for (const finding of newReview.findings) {
        const previous = oldByKey.get(findingKey(finding))?.pop();
        if (previous) {
          matched.add(previous);
          append(newReview, finding, 'existing', 'After');
        } else {
          append(
            newReview,
            finding,
            oldReview && !oldReview.complete ? 'unverified' : 'new',
            'After',
          );
        }
      }
    }
    if (oldReview) {
      for (const finding of oldReview.findings.filter((finding) => !matched.has(finding))) {
        append(
          oldReview,
          finding,
          newReview && !newReview.complete ? 'unverified' : 'resolved',
          'Before',
        );
      }
    }
    for (const [review, side] of [
      [oldReview, 'Before'],
      [newReview, 'After'],
    ] as const) {
      if (review?.limitation) {
        limitations.push({ label: review.script.label, reason: review.limitation, side });
      }
    }
  }

  const statusOrder = { new: 0, unverified: 1, existing: 2, resolved: 3 };
  findings.sort(
    (left, right) =>
      statusOrder[left.status] - statusOrder[right.status] ||
      Number(left.rule === 'console-usage') - Number(right.rule === 'console-usage') ||
      left.script.label.localeCompare(right.script.label) ||
      left.line - right.line,
  );
  const configurationCount = [...afterReviews.values()].filter(
    (review) => review.script.kind === 'configuration',
  ).length;
  return {
    findings,
    limitations,
    scriptCount: afterReviews.size - configurationCount,
    configurationCount,
  };
};
