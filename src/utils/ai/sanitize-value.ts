import type { JsonValue } from '../../types/json';
import { isScriptValue } from '../diff/script-utils';
import { analyzeScript } from '../review/analyze-script';
import { redactSource } from '../review/redact-source';

export interface ISanitizedValue {
  redactions: number;
  value: JsonValue | undefined;
  wasTruncated: boolean;
}

const SECRET_PATH_PATTERN =
  /(api.?key|authorization|bearer|connection.?string|password|private.?key|secret|token)/i;
const SECRET_VALUE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
];
const MAX_VALUE_CHARACTERS = 4_000;

const sanitizeString = (value: string, path: string): ISanitizedValue => {
  let redactions = 0;
  let redacted = value;

  // Reuse the local parser's credential ranges, without executing the script.
  if (isScriptValue(path, value) || path.endsWith('._code')) {
    const review = analyzeScript({ id: path, label: path, path, source: value });
    const ranges = review.findings.flatMap((finding) => finding.redactions ?? []);
    redacted = redactSource(redacted, ranges);
    redactions += ranges.length;
  }

  for (const pattern of SECRET_VALUE_PATTERNS) {
    redacted = redacted.replace(pattern, () => {
      redactions += 1;
      return '[REDACTED]';
    });
  }

  const wasTruncated = redacted.length > MAX_VALUE_CHARACTERS;
  if (wasTruncated) {
    redacted = `${redacted.slice(0, MAX_VALUE_CHARACTERS)}\n[VALUE TRUNCATED]`;
  }

  return { redactions, value: redacted, wasTruncated };
};

export const sanitizeValue = (value: JsonValue | undefined, path: string): ISanitizedValue => {
  if (value === undefined) {
    return { redactions: 0, value, wasTruncated: false };
  }

  if (SECRET_PATH_PATTERN.test(path)) {
    return { redactions: 1, value: '[REDACTED]', wasTruncated: false };
  }

  if (typeof value === 'string') {
    return sanitizeString(value, path);
  }

  if (value !== null && typeof value === 'object') {
    let redactions = 0;
    let wasTruncated = false;
    const sanitizeChild = (item: JsonValue | undefined, key: string): JsonValue => {
      const result = sanitizeValue(item, `${path}.${key}`);
      redactions += result.redactions;
      wasTruncated ||= result.wasTruncated;
      return result.value ?? null;
    };
    const sanitized = Array.isArray(value)
      ? value.map((item, index) => sanitizeChild(item, String(index)))
      : Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, sanitizeChild(item, key)]),
        );

    return { redactions, value: sanitized, wasTruncated };
  }

  return { redactions: 0, value, wasTruncated: false };
};
