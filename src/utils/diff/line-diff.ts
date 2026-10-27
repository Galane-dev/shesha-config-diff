import type { ILineDiffEntry } from '../../types/diff';

const MAX_LCS_LINES = 500;

const createFallbackDiff = (beforeLines: string[], afterLines: string[]): ILineDiffEntry[] => [
  ...beforeLines.map<ILineDiffEntry>((content, index) => ({
    content,
    lineNumberBefore: index + 1,
    type: 'removed',
  })),
  ...afterLines.map<ILineDiffEntry>((content, index) => ({
    content,
    lineNumberAfter: index + 1,
    type: 'added',
  })),
];

export const createLineDiff = (before: string, after: string): ILineDiffEntry[] => {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');

  if (beforeLines.length > MAX_LCS_LINES || afterLines.length > MAX_LCS_LINES) {
    return createFallbackDiff(beforeLines, afterLines);
  }

  const matrix = Array.from({ length: beforeLines.length + 1 }, () =>
    Array<number>(afterLines.length + 1).fill(0),
  );

  for (let beforeIndex = beforeLines.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
    for (let afterIndex = afterLines.length - 1; afterIndex >= 0; afterIndex -= 1) {
      const row = matrix[beforeIndex];
      const nextRow = matrix[beforeIndex + 1];

      if (row === undefined || nextRow === undefined) {
        continue;
      }

      row[afterIndex] = beforeLines[beforeIndex] === afterLines[afterIndex]
        ? (nextRow[afterIndex + 1] ?? 0) + 1
        : Math.max(nextRow[afterIndex] ?? 0, row[afterIndex + 1] ?? 0);
    }
  }

  const result: ILineDiffEntry[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  while (beforeIndex < beforeLines.length || afterIndex < afterLines.length) {
    const beforeLine = beforeLines[beforeIndex];
    const afterLine = afterLines[afterIndex];

    if (beforeLine !== undefined && beforeLine === afterLine) {
      result.push({
        content: beforeLine,
        lineNumberAfter: afterIndex + 1,
        lineNumberBefore: beforeIndex + 1,
        type: 'context',
      });
      beforeIndex += 1;
      afterIndex += 1;
      continue;
    }

    const removeScore = matrix[beforeIndex + 1]?.[afterIndex] ?? 0;
    const addScore = matrix[beforeIndex]?.[afterIndex + 1] ?? 0;

    if (afterLine !== undefined && (beforeLine === undefined || addScore > removeScore)) {
      result.push({
        content: afterLine,
        lineNumberAfter: afterIndex + 1,
        type: 'added',
      });
      afterIndex += 1;
    } else if (beforeLine !== undefined) {
      result.push({
        content: beforeLine,
        lineNumberBefore: beforeIndex + 1,
        type: 'removed',
      });
      beforeIndex += 1;
    }
  }

  return result;
};
