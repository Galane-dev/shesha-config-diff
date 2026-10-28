import { MAX_AI_PAYLOAD_CHARACTERS } from '../../constants/app';
import type { IFormDiff, IValueChange } from '../../types/diff';
import { sanitizeValue } from './sanitize-value';

interface ISanitizedDiffResult {
  payload: string;
  redactionCount: number;
  wasTruncated: boolean;
}

const sanitizeChange = (
  change: IValueChange,
): { redactions: number; value: object; wasTruncated: boolean } => {
  const before = sanitizeValue(change.before, change.path);
  const after = sanitizeValue(change.after, change.path);

  return {
    redactions: before.redactions + after.redactions,
    wasTruncated: before.wasTruncated || after.wasTruncated,
    value: {
      after: after.value,
      before: before.value,
      changeType: change.changeType,
      isScript: change.isScript,
      path: change.path,
    },
  };
};

export const createSanitizedDiffPayload = (diff: IFormDiff): ISanitizedDiffResult => {
  let redactionCount = 0;
  let valueWasTruncated = false;
  const components = diff.componentChanges.map((component) => {
    const propertyChanges = component.propertyChanges.map((change) => {
      const sanitized = sanitizeChange(change);
      redactionCount += sanitized.redactions;
      valueWasTruncated ||= sanitized.wasTruncated;
      return sanitized.value;
    });

    return {
      changeType: component.changeType,
      componentId: component.componentId,
      componentType: component.componentType,
      label: component.label,
      path: component.path,
      previousPath: component.previousPath,
      propertyChanges,
    };
  });
  const formSettings = diff.formSettingChanges.map((change) => {
    const sanitized = sanitizeChange(change);
    redactionCount += sanitized.redactions;
    valueWasTruncated ||= sanitized.wasTruncated;
    return sanitized.value;
  });
  const payload = JSON.stringify(
    {
      after: diff.afterMetadata,
      before: diff.beforeMetadata,
      components,
      counts: diff.counts,
      formSettings,
    },
    null,
    2,
  );
  const wasTruncated = payload.length > MAX_AI_PAYLOAD_CHARACTERS;

  return {
    payload: wasTruncated
      ? `${payload.slice(0, MAX_AI_PAYLOAD_CHARACTERS)}\n[PAYLOAD TRUNCATED]`
      : payload,
    redactionCount,
    wasTruncated: wasTruncated || valueWasTruncated,
  };
};
