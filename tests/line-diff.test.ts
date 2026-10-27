import { describe, expect, it } from 'vitest';
import { createLineDiff, createSideBySideDiff } from '../src/utils/diff/line-diff';

describe('createLineDiff', () => {
  it('retains context and identifies added and removed lines', () => {
    const result = createLineDiff('const value = 1;\nreturn value;', 'const value = 2;\nreturn value;');

    expect(result.map((line) => line.type)).toEqual(['removed', 'added', 'context']);
    expect(result[2]).toMatchObject({
      lineNumberAfter: 2,
      lineNumberBefore: 2,
      type: 'context',
    });
  });

  it('keeps unchanged lines neutral in an identical large value', () => {
    const text = Array.from({ length: 5100 }, (_, index) => `line ${index}`).join('\n');
    const result = createLineDiff(text, text);

    expect(result).toHaveLength(5100);
    expect(result.every((line) => line.type === 'context')).toBe(true);
    expect(result[5099]).toMatchObject({ lineNumberBefore: 5100, lineNumberAfter: 5100 });
  });

  it('highlights only the edited line in a large value', () => {
    const before = Array.from({ length: 5100 }, (_, index) => `line ${index}`);
    const after = before.map((line, index) => index === 2500 ? 'updated line' : line);
    const result = createLineDiff(before.join('\n'), after.join('\n'));

    expect(result.filter((line) => line.type === 'context')).toHaveLength(5099);
    expect(result.filter((line) => line.type === 'removed')).toEqual([
      { content: 'line 2500', lineNumberBefore: 2501, type: 'removed' },
    ]);
    expect(result.filter((line) => line.type === 'added')).toEqual([
      { content: 'updated line', lineNumberAfter: 2501, type: 'added' },
    ]);
  });

  it('preserves line numbers across separate insertions and deletions in a large value', () => {
    const before = Array.from({ length: 5100 }, (_, index) => `line ${index}`);
    const after = ['inserted', ...before.filter((_, index) => index !== 2500), 'appended'];
    const result = createLineDiff(before.join('\n'), after.join('\n'));

    expect(result.filter((line) => line.type === 'context')).toHaveLength(5099);
    expect(result.find((line) => line.content === 'line 0')).toMatchObject({
      type: 'context', lineNumberBefore: 1, lineNumberAfter: 2,
    });
    expect(result.find((line) => line.content === 'line 2501')).toMatchObject({
      type: 'context', lineNumberBefore: 2502, lineNumberAfter: 2502,
    });
    expect(result.find((line) => line.content === 'appended')).toMatchObject({
      type: 'added', lineNumberAfter: 5101,
    });
  });

  it.each([
    ['', 'value'],
    ['start\n\nend\n', 'start\n\nnew\nend\n'],
    ['start\r\nend\r\n', 'start\r\nchanged\r\nend\r\n'],
    ['same\nsame\nold\nsame', 'same\nnew\nsame\nsame'],
  ])('preserves exact contents and contiguous line numbers: %s -> %s', (before, after) => {
    const result = createLineDiff(before, after);
    const beforeEntries = result.filter((line) => line.type !== 'added');
    const afterEntries = result.filter((line) => line.type !== 'removed');

    expect(beforeEntries.map((line) => line.content).join('\n')).toBe(before);
    expect(afterEntries.map((line) => line.content).join('\n')).toBe(after);
    expect(beforeEntries.map((line) => line.lineNumberBefore)).toEqual(before.split('\n').map((_, index) => index + 1));
    expect(afterEntries.map((line) => line.lineNumberAfter)).toEqual(after.split('\n').map((_, index) => index + 1));
  });
});

describe('createSideBySideDiff', () => {
  it('pairs changed lines and aligns the unchanged context', () => {
    const rows = createSideBySideDiff('start\nold\nend', 'start\nnew\nend');

    expect(rows.map((row) => [row.before?.content, row.after?.content])).toEqual([
      ['start', 'start'],
      ['old', 'new'],
      ['end', 'end'],
    ]);
    expect(rows[1]?.before).toMatchObject({ type: 'removed', lineNumberBefore: 2 });
    expect(rows[1]?.after).toMatchObject({ type: 'added', lineNumberAfter: 2 });
    expect(rows[2]?.before?.type).toBe('context');
  });

  it('pads unequal changes without shifting the following context', () => {
    const rows = createSideBySideDiff('old\nend', 'new\nextra\nend');

    expect(rows.map((row) => [row.before?.content, row.after?.content])).toEqual([
      ['old', 'new'],
      [undefined, 'extra'],
      ['end', 'end'],
    ]);
    expect(rows[2]?.before?.lineNumberBefore).toBe(2);
    expect(rows[2]?.after?.lineNumberAfter).toBe(3);
  });

  it.each([
    { before: 'start\nend', after: 'start\nadded\nend', beforeLine: undefined, afterLine: 'added' },
    { before: 'start\nremoved\nend', after: 'start\nend', beforeLine: 'removed', afterLine: undefined },
    { before: undefined, after: 'added', beforeLine: undefined, afterLine: 'added' },
    { before: 'removed', after: undefined, beforeLine: 'removed', afterLine: undefined },
  ])('leaves a blank cell for a one-sided change: $before -> $after', (example) => {
    const rows = createSideBySideDiff(example.before, example.after);
    const changedRow = rows.find((row) => row.before?.type !== 'context' && row.after?.type !== 'context');

    expect(changedRow?.before?.content).toBe(example.beforeLine);
    expect(changedRow?.after?.content).toBe(example.afterLine);
  });

  it('distinguishes an empty line from a missing value', () => {
    expect(createSideBySideDiff('', 'value')[0]?.before).toMatchObject({
      content: '',
      lineNumberBefore: 1,
      type: 'removed',
    });
    expect(createSideBySideDiff(undefined, 'value')[0]?.before).toBeUndefined();
    expect(createSideBySideDiff(undefined, undefined)).toEqual([]);
  });

  it('preserves both texts when lines repeat and changes occur in separate blocks', () => {
    const before = 'same\nold\nsame\nremoved\nend\n';
    const after = 'same\nnew\nsame\nend\nadded\n';
    const rows = createSideBySideDiff(before, after);

    expect(rows.flatMap((row) => row.before ? [row.before.content] : []).join('\n')).toBe(before);
    expect(rows.flatMap((row) => row.after ? [row.after.content] : []).join('\n')).toBe(after);
  });

  it('keeps all lines when a large value is entirely replaced', () => {
    const text = Array.from({ length: 501 }, (_, index) => `line ${index}`).join('\n');
    const rows = createSideBySideDiff(text, 'replacement');

    expect(rows).toHaveLength(501);
    expect(rows[0]?.after?.content).toBe('replacement');
    expect(rows[500]?.before?.lineNumberBefore).toBe(501);
    expect(rows[500]?.after).toBeUndefined();
  });
});
