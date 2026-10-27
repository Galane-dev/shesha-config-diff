import { diffArrays } from 'diff';
import type { ILineDiffEntry } from '../../types/diff';

export const createLineDiff = (before: string, after: string): ILineDiffEntry[] => {
  const result: ILineDiffEntry[] = [];
  let lineNumberBefore = 1;
  let lineNumberAfter = 1;

  // Compare exact lines, including blank lines, without a whole-value size fallback.
  for (const change of diffArrays(before.split('\n'), after.split('\n'))) {
    for (const content of change.value) {
      result.push({
        content,
        lineNumberBefore: change.added ? undefined : lineNumberBefore++,
        lineNumberAfter: change.removed ? undefined : lineNumberAfter++,
        type: change.added ? 'added' : change.removed ? 'removed' : 'context',
      });
    }
  }

  return result;
};
