import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ValueComparison } from '../src/components/ValueComparison';

afterEach(cleanup);

describe('ValueComparison', () => {
  it('shows JSON values in paired Before and After columns', () => {
    render(createElement(ValueComparison, { before: ['npo', 'npo.applicationRef'], after: ['npo'] }));

    const table = screen.getByRole('table', { name: 'Value line diff' });
    const removedRow = [...table.querySelectorAll('tbody tr')]
      .find((row) => row.textContent?.includes('npo.applicationRef'));

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Before', 'After']);
    expect(removedRow?.children[0]?.textContent).toContain('npo.applicationRef');
    expect(removedRow?.children[1]?.textContent).toBe('');
  });

  it('shows only the code in script wrappers and renders it as text', () => {
    render(createElement(ValueComparison, {
      before: { _code: '// old', _mode: 'code' },
      after: { _code: '<strong>new</strong>', _mode: 'code' },
      isScript: true,
    }));

    const table = screen.getByRole('table', { name: 'Script line diff' });

    expect([...table.querySelectorAll('code')].map((code) => code.textContent))
      .toEqual(['// old', '<strong>new</strong>']);
    expect(table.querySelector('strong')).toBeNull();
    expect(table.textContent).not.toContain('_mode');
  });

  it('does not unwrap ordinary JSON values that contain a code property', () => {
    render(createElement(ValueComparison, { before: { _code: 'old' }, after: { _code: 'new' } }));

    expect(screen.getByRole('table', { name: 'Value line diff' }).textContent).toContain('"_code"');
  });

  it('keeps a missing value blank but displays null as a real value', () => {
    render(createElement(ValueComparison, { after: null }));

    const cells = screen.getAllByRole('cell');

    expect(cells[0]?.textContent).toBe('');
    expect(cells[1]?.querySelector('code')?.textContent).toBe('null');
  });

  it('preserves the empty-state message', () => {
    render(createElement(ValueComparison));

    expect(screen.getByText('No value')).toBeDefined();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows inline removals, additions, and a single copy of context with both line numbers', () => {
    render(createElement(ValueComparison, { before: 'old\nend', after: 'new\nend', viewMode: 'inline' }));

    const table = screen.getByRole('table', { name: 'Value line diff' });
    const rows = Array.from(table.querySelectorAll('tbody tr'));

    expect(Array.from(table.querySelectorAll('code'), (code) => code.textContent)).toEqual(['old', 'new', 'end']);
    expect(rows.map((row) => Array.from(row.children, (cell) => cell.textContent))).toEqual([
      ['1', '', '-', 'old'],
      ['', '1', '+', 'new'],
      ['2', '2', ' ', 'end'],
    ]);
  });

  it('switches between renderers without changing the values', () => {
    const values = { before: 'old', after: 'new' };
    const { rerender } = render(createElement(ValueComparison, values));

    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    rerender(createElement(ValueComparison, { ...values, viewMode: 'inline' }));
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getByText('old')).toBeDefined();
    expect(screen.getByText('new')).toBeDefined();
    rerender(createElement(ValueComparison, { ...values, viewMode: 'side-by-side' }));
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getByText('old')).toBeDefined();
    expect(screen.getByText('new')).toBeDefined();
  });

  it('uses the same script formatting and safe text rendering in inline mode', () => {
    render(createElement(ValueComparison, {
      before: { _code: '// old', _mode: 'code' },
      after: { _code: '<strong>new</strong>', _mode: 'code' },
      isScript: true,
      viewMode: 'inline',
    }));

    const table = screen.getByRole('table', { name: 'Script line diff' });

    expect(Array.from(table.querySelectorAll('code'), (code) => code.textContent))
      .toEqual(['// old', '<strong>new</strong>']);
    expect(table.querySelector('strong')).toBeNull();
    expect(table.textContent).not.toContain('_mode');
  });

  it.each([
    { before: undefined, after: null, content: 'null', marker: '+', beforeNumber: '', afterNumber: '1' },
    { before: 'removed', after: undefined, content: 'removed', marker: '-', beforeNumber: '1', afterNumber: '' },
  ])('does not invent blank lines for one-sided inline changes: $marker', (example) => {
    render(createElement(ValueComparison, { before: example.before, after: example.after, viewMode: 'inline' }));

    const table = screen.getByRole('table', { name: 'Value line diff' });
    const rows = table.querySelectorAll('tbody tr');

    expect(rows).toHaveLength(1);
    expect(Array.from(rows[0]?.children ?? [], (cell) => cell.textContent)).toEqual([
      example.beforeNumber, example.afterNumber, example.marker, example.content,
    ]);
  });
});
