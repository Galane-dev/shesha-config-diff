import { MAX_AI_PAYLOAD_CHARACTERS } from '../../constants/app';
import type { IFormDiff, IValueChange } from '../../types/diff';
import type { JsonValue } from '../../types/json';

interface ISanitizedDiffResult {
  payload: string;
  redactionCount: number;
  wasTruncated: boolean;
}

const SECRET_PATH_PATTERN = /(api.?key|authorization|bearer|connection.?string|password|private.?key|secret|token)/i;
const SECRET_VALUE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
];
const MAX_VALUE_CHARACTERS = 4_000;

const redactString = (value: string): { redactions: number; value: string } => {
  let redactions = 0;
  let redacted = value;

  SECRET_VALUE_PATTERNS.forEach((pattern) => {
    redacted = redacted.replace(pattern, () => {
      redactions += 1;
      return '[REDACTED]';
    });
  });

  if (redacted.length > MAX_VALUE_CHARACTERS) {
    redacted = `${redacted.slice(0, MAX_VALUE_CHARACTERS)}\n[VALUE TRUNCATED]`;
  }

  return { redactions, value: redacted };
};

const sanitizeValue = (
  value: JsonValue | undefined,
  path: string,
): { redactions: number; value: JsonValue | string | undefined } => {
  if (value === undefined) {
    return { redactions: 0, value };
  }

  if (SECRET_PATH_PATTERN.test(path)) {
    return { redactions: 1, value: '[REDACTED]' };
  }

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    let redactions = 0;
    const sanitized = value.map((item, index) => {
      const result = sanitizeValue(item, `${path}[${index}]`);
      redactions += result.redactions;
      return result.value ?? null;
    });

    return { redactions, value: sanitized };
  }

  if (typeof value === 'object' && value !== null) {
    let redactions = 0;
    const sanitized = Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        const result = sanitizeValue(item, `${path}.${key}`);
        redactions += result.redactions;
        return [key, result.value];
      }),
    );

    return { redactions, value: sanitized };
  }

  return { redactions: 0, value };
};

const sanitizeChange = (change: IValueChange): { redactions: number; value: object } => {
  const before = sanitizeValue(change.before, change.path);
  const after = sanitizeValue(change.after, change.path);

  return {
    redactions: before.redactions + after.redactions,
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
  const components = diff.componentChanges.map((component) => {
    const propertyChanges = component.propertyChanges.map((change) => {
      const sanitized = sanitizeChange(change);
      redactionCount += sanitized.redactions;
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
    return sanitized.value;
  });
  const payload = JSON.stringify({
    after: diff.afterMetadata,
    before: diff.beforeMetadata,
    components,
    counts: diff.counts,
    formSettings,
  }, null, 2);
  const wasTruncated = payload.length > MAX_AI_PAYLOAD_CHARACTERS;

  return {
    payload: wasTruncated
      ? `${payload.slice(0, MAX_AI_PAYLOAD_CHARACTERS)}\n[PAYLOAD TRUNCATED]`
      : payload,
    redactionCount,
    wasTruncated,
  };
};
