import { describe, expect, it } from 'vitest';
import { createLineDiff } from '../src/utils/diff/line-diff';

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
});
