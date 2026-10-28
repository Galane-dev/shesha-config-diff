import { MAX_AI_PAYLOAD_CHARACTERS } from '../../constants/app';
import type { IAiReviewRequest, IAiReviewTarget } from '../../types/ai';
import type { IFormDiff } from '../../types/diff';
import type { JsonValue } from '../../types/json';
import type { ISheshaComponent, ISheshaFormExport } from '../../types/shesha-form';
import { getArrayEntries } from '../diff/array-entries';
import { getComponentStructure } from '../forms/component-structure';
import { compareReviews } from '../review/compare-reviews';
import { collectReviewSources } from '../review/collect-scripts';
import { createSanitizedDiffPayload } from './sanitize-diff';
import { sanitizeValue } from './sanitize-value';

const MAX_TARGET_CHARACTERS = 8_000;
const MAX_CHANGE_CHARACTERS = 12_000;
const MAX_LOCAL_FINDINGS = 20;
const COVERAGE_SIZE_RESERVE = 256;

interface ITargetCandidate {
  target: IAiReviewTarget;
  redactions: number;
}

const shorten = (text: string, limit: number): string =>
  text.length > limit ? `${text.slice(0, limit)}\n[CONTEXT TRUNCATED]` : text;

const targetPriority = (target: IAiReviewTarget): number => {
  switch (target.kind) {
    case 'form-settings':
      return 0;
    case 'script':
    case 'configuration':
      return 1;
    default:
      return 2;
  }
};

const collectTargets = (form: ISheshaFormExport): ITargetCandidate[] => {
  const candidates: ITargetCandidate[] = [];

  const addTarget = (
    value: JsonValue,
    path: string,
    label: string,
    metadata: Pick<IAiReviewTarget, 'kind' | 'executionContext' | 'requiresCompletion'>,
  ): void => {
    const sanitized = sanitizeValue(
      value,
      metadata.kind === 'script' ? `${path}.expression` : path,
    );
    const source =
      typeof sanitized.value === 'string'
        ? sanitized.value
        : JSON.stringify(sanitized.value, null, 2);
    const safeLabel = sanitizeValue(label, 'label');
    candidates.push({
      redactions: sanitized.redactions + safeLabel.redactions,
      target: {
        id: `target-${candidates.length + 1}`,
        label:
          typeof safeLabel.value === 'string' ? safeLabel.value.slice(0, 300) : 'Form location',
        path: path.slice(0, 500),
        source: shorten(source, MAX_TARGET_CHARACTERS),
        truncated: sanitized.wasTruncated || source.length > MAX_TARGET_CHARACTERS,
        ...metadata,
      },
    });
  };

  const visit = (components: ISheshaComponent[], path: string, parentLabel: string): void => {
    for (const entry of getArrayEntries(components, path)) {
      const component = entry.value as ISheshaComponent;
      const name = [
        component.label,
        component.componentName,
        component.propertyName,
        component.type,
      ].find((value): value is string => typeof value === 'string' && value.trim().length > 0);
      const label = [parentLabel, name ?? entry.label].filter(Boolean).join(' / ');
      const structure = getComponentStructure(component);
      addTarget(structure.properties, entry.path, label, { kind: 'component' });

      for (const children of structure.children) {
        visit(
          children.components,
          `${entry.path}.${children.key}`,
          children.label ? `${label} / ${children.label}` : label,
        );
      }
    }
  };

  addTarget(form.formSettings, 'formSettings', 'Form settings', { kind: 'form-settings' });
  visit(form.components, 'components', '');
  for (const source of collectReviewSources(form)) {
    addTarget(
      source.source,
      source.path,
      source.label,
      source.kind === 'configuration'
        ? { kind: 'configuration' }
        : {
            kind: 'script',
            executionContext: source.executionContext,
            requiresCompletion: source.requiresCompletion,
          },
    );
  }
  return candidates;
};

export const createReviewRequest = (
  diff: IFormDiff,
  latestForm: ISheshaFormExport,
): IAiReviewRequest => {
  const changes = createSanitizedDiffPayload(diff);
  // Reviewing After against itself excludes removed or superseded Before findings.
  const localReview = compareReviews(latestForm, latestForm);
  const findings = localReview.findings.slice(0, MAX_LOCAL_FINDINGS).map((finding) => ({
    label: finding.script.label.slice(0, 300),
    path: finding.script.path.slice(0, 500),
    line: finding.line,
    rule: finding.rule,
    message: finding.message.slice(0, 600),
  }));
  const sanitizedFindings = sanitizeValue(findings, 'reviewConcerns');
  const candidates = collectTargets(latestForm);
  // Retain form-level context, then prioritise individual scripts over bulky container settings.
  candidates.sort((left, right) => targetPriority(left.target) - targetPriority(right.target));
  const targets: IAiReviewTarget[] = [];
  let redactionCount = changes.redactionCount + sanitizedFindings.redactions;
  let wasTruncated = changes.wasTruncated || changes.payload.length > MAX_CHANGE_CHARACTERS;

  // Bound whole records, not the outer JSON, so the request always stays valid JSON.
  const serialize = (): string =>
    JSON.stringify({
      changes: shorten(changes.payload, MAX_CHANGE_CHARACTERS),
      latestForm: { targets },
      reviewConcerns: sanitizedFindings.value,
      coverage: {
        totalTargets: candidates.length,
        includedTargets: targets.length,
        omittedTargets: candidates.length - targets.length,
        totalLocalFindings: localReview.findings.length,
        includedLocalFindings: findings.length,
        incompleteLocalChecks: localReview.limitations.length,
        contextIsPartial:
          wasTruncated ||
          targets.length < candidates.length ||
          findings.length < localReview.findings.length,
      },
    });

  // Count each target once. Reserve space for changing coverage counters in the envelope.
  let payloadSize = serialize().length;
  for (const candidate of candidates) {
    const targetSize = JSON.stringify(candidate.target).length + (targets.length > 0 ? 1 : 0);
    if (payloadSize + targetSize > MAX_AI_PAYLOAD_CHARACTERS - COVERAGE_SIZE_RESERVE) {
      continue;
    }
    targets.push(candidate.target);
    payloadSize += targetSize;
    redactionCount += candidate.redactions;
    wasTruncated ||= candidate.target.truncated;
  }

  const omittedTargets = candidates.length - targets.length;
  wasTruncated ||= omittedTargets > 0 || findings.length < localReview.findings.length;
  return { payload: serialize(), targets, redactionCount, wasTruncated, omittedTargets };
};
