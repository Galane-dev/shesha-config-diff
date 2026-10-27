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
});
