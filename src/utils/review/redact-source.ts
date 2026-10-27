import type { ISourceRange } from '../../types/review';

export const redactSource = (source: string, ranges: ISourceRange[] = []): string => {
  let result = source;
  for (const range of ranges) {
    const start = Math.max(0, range.start);
    const end = Math.min(source.length, range.end);
    if (start >= end) {
      continue;
    }
    // Preserve offsets and line endings so the original source locations still apply.
    result =
      result.slice(0, start) +
      result.slice(start, end).replace(/[^\r\n]/g, '*') +
      result.slice(end);
  }
  return result;
};
