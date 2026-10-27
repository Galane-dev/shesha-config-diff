import { diffArrays } from 'diff';
import type { ILineDiffEntry, ISideBySideDiffRow } from '../../types/diff';

const createOneSidedDiff = (beforeLines: string[], afterLines: string[]): ILineDiffEntry[] => [
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

export const createSideBySideDiff = (
  before: string | undefined,
  after: string | undefined,
): ISideBySideDiffRow[] => {
  const lines = before === undefined || after === undefined
    ? createOneSidedDiff(before?.split('\n') ?? [], after?.split('\n') ?? [])
    : createLineDiff(before, after);
  const rows: ISideBySideDiffRow[] = [];
  let removed: ILineDiffEntry[] = [];
  let added: ILineDiffEntry[] = [];

  // Pair each changed block, leaving a blank cell when one side has fewer lines.
  const appendChangedRows = (): void => {
    for (let index = 0; index < Math.max(removed.length, added.length); index += 1) {
      rows.push({ before: removed[index], after: added[index] });
    }

    removed = [];
    added = [];
  };

  for (const line of lines) {
    if (line.type === 'removed') {
      removed.push(line);
    } else if (line.type === 'added') {
      added.push(line);
    } else {
      appendChangedRows();
      rows.push({ before: line, after: line });
    }
  }

  appendChangedRows();
  return rows;
};
