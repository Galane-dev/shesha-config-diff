import { expect, test } from '@playwright/test';

const longLine = `const endpoint = "https://example.test/${'long-path/'.repeat(20)}";`;
const beforeScript = `form.setFieldsValue({});\n//console.log("Forms query", query, data);\n${longLine}`;
const afterScript = `form.setFieldsValue({});\nconsole.log("Forms query", query, data);\n${longLine}`;

const createForm = (fields: string[], script: string): string => JSON.stringify({
  components: [],
  formSettings: {
    modelType: 'Example.Record',
    dataLoadersSettings: { gql: { fieldsToFetch: fields } },
    onBeforeDataLoad: script,
  },
});

test('shows aligned line changes for JSON and scripts on desktop and mobile', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.goto('/');

  const files = page.locator('input[type="file"]');
  await files.nth(0).setInputFiles({
    buffer: Buffer.from(createForm(['npo', 'npo.applicationRef', 'npo.name'], beforeScript)),
    mimeType: 'application/json',
    name: 'example.module.sample-form.json',
  });
  await files.nth(1).setInputFiles({
    buffer: Buffer.from(createForm(['npo', 'npo.name'], afterScript)),
    mimeType: 'application/json',
    name: 'example.module.sample-form.json',
  });

  for (const viewport of [{ width: 1440, height: 960 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    await page.getByRole('button', { name: /formSettings.dataLoadersSettings.gql.fieldsToFetch/ }).click();

    const jsonDiff = page.getByRole('table', { name: 'Value line diff' });
    const removedCells = jsonDiff.getByRole('row').filter({ hasText: 'npo.applicationRef' }).getByRole('cell');
    await expect(jsonDiff.getByRole('columnheader')).toHaveText(['Before', 'After']);
    await expect(removedCells.nth(0)).toHaveCSS('background-color', 'rgb(255, 240, 240)');
    await expect(removedCells.nth(1)).toBeEmpty();
    await jsonDiff.screenshot({ animations: 'disabled', path: testInfo.outputPath(`json-diff-${viewport.width}.png`) });

    await page.getByRole('button', { name: /formSettings.onBeforeDataLoad/ }).click();

    const scriptDiff = page.getByRole('table', { name: 'Script line diff' });
    const changedCells = scriptDiff.getByRole('row').filter({ hasText: '//console.log' }).getByRole('cell');
    await expect(changedCells.nth(0).locator('code')).toHaveText('//console.log("Forms query", query, data);');
    await expect(changedCells.nth(1).locator('code')).toHaveText('console.log("Forms query", query, data);');
    await expect(changedCells.nth(0)).toHaveCSS('background-color', 'rgb(255, 240, 240)');
    await expect(changedCells.nth(1)).toHaveCSS('background-color', 'rgb(234, 247, 238)');

    const geometry = await scriptDiff.evaluate((table) => {
      const cells = Array.from(table.querySelectorAll('tbody tr:first-child td'), (cell) => cell.getBoundingClientRect());
      const contentFits = Array.from(table.querySelectorAll('code')).every((code) => {
        const cell = code.closest('td')?.getBoundingClientRect();
        const content = code.getBoundingClientRect();
        return cell !== undefined && content.left >= cell.left && content.right <= cell.right;
      });

      return {
        before: { top: cells[0]?.top, right: cells[0]?.right, width: cells[0]?.width },
        after: { top: cells[1]?.top, left: cells[1]?.left, width: cells[1]?.width },
        contentFits,
        pageFits: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });

    expect(geometry.before.top).toBe(geometry.after.top);
    expect(geometry.before.right).toBe(geometry.after.left);
    expect(geometry.before.width).toBeCloseTo(geometry.after.width ?? 0, 0);
    expect(geometry.contentFits).toBe(true);
    expect(geometry.pageFits).toBe(true);
    await page.getByRole('region', { name: 'Diff content' }).focus();
    await scriptDiff.screenshot({ animations: 'disabled', path: testInfo.outputPath(`script-diff-${viewport.width}.png`) });
  }

  expect(browserErrors).toEqual([]);
});

test('highlights only changed lines inside a large wizard steps value', async ({ page }, testInfo) => {
  const wizardForm = (changedLabel: string): string => JSON.stringify({
    components: [{
      id: 'wizard-1',
      componentName: 'Wizard1',
      type: 'wizard',
      steps: [{
        id: 'details',
        components: Array.from({ length: 200 }, (_, index) => ({
          id: `field-${index}`,
          label: index === 100 ? changedLabel : `Field ${index}`,
          type: 'textField',
        })),
      }],
    }],
    formSettings: {},
  });

  await page.goto('/');
  const files = page.locator('input[type="file"]');
  await files.nth(0).setInputFiles({
    buffer: Buffer.from(wizardForm('Field 100')),
    mimeType: 'application/json',
    name: 'example.module.wizard.json',
  });
  await files.nth(1).setInputFiles({
    buffer: Buffer.from(wizardForm('Updated field 100')),
    mimeType: 'application/json',
    name: 'example.module.wizard.json',
  });

  const diff = page.getByRole('table', { name: 'Value line diff' });
  await expect(diff).toBeVisible();

  const counts = await diff.evaluate((table) => {
    const cells = Array.from(table.querySelectorAll('tbody td'));
    return {
      removed: cells.filter((cell) => getComputedStyle(cell).backgroundColor === 'rgb(255, 240, 240)').length,
      added: cells.filter((cell) => getComputedStyle(cell).backgroundColor === 'rgb(234, 247, 238)').length,
      unchanged: cells.filter((cell) => getComputedStyle(cell).backgroundColor === 'rgba(0, 0, 0, 0)').length,
    };
  });

  expect(counts.removed).toBe(1);
  expect(counts.added).toBe(1);
  expect(counts.unchanged).toBeGreaterThan(1000);

  const changedRow = diff.getByRole('row').filter({ hasText: 'Updated field 100' });
  await expect(changedRow.getByRole('cell').nth(0).locator('code')).toHaveText('"label": "Field 100",');
  await expect(changedRow.getByRole('cell').nth(1).locator('code')).toHaveText('"label": "Updated field 100",');
  await changedRow.scrollIntoViewIfNeeded();
  await page.getByRole('region', { name: 'Diff content' }).screenshot({
    animations: 'disabled', path: testInfo.outputPath('large-wizard-diff.png'),
  });
});
