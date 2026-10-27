import { expect, test } from '@playwright/test';

const createForm = (updated: boolean): string => JSON.stringify({
  components: [{
    id: 'wizard', componentName: 'Wizard1', type: 'wizard', steps: [{
      id: 'details', label: 'Details', components: [{
        id: 'panel', componentName: 'Panel', type: 'collapsiblePanel',
        header: { components: [
          { id: 'heading', type: 'text', label: updated ? 'Updated heading' : 'Details heading' },
          ...(updated ? [{ id: 'new-action', type: 'button', label: 'New action' }] : []),
        ] },
        content: { components: [{
          id: 'grid', componentName: 'Columns', type: 'columns', columns: [{
            id: 'column', label: 'Column A', components: [
              {
                id: 'name', type: 'textField', label: 'Name',
                onChangeCustom: updated ? 'return data.name.trim();' : 'return data.name;',
              },
              ...(updated ? [] : [{ id: 'old-field', type: 'textField', label: 'Old field' }]),
            ],
          }],
        }] },
      }],
    }],
  }],
  formSettings: {},
});

test('lists deeply nested component changes and their scripts individually', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');

  const files = page.locator('input[type="file"]');
  for (const index of [0, 1]) {
    await files.nth(index).setInputFiles({
      buffer: Buffer.from(createForm(index === 1)),
      mimeType: 'application/json',
      name: 'example.module.nested.json',
    });
  }

  await expect(page.getByText('6 deterministic changes found')).toBeVisible();
  await expect(page.getByRole('button', { name: /New action button added/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Old field textField removed/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Wizard1 wizard modified/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Updated heading text modified/ }).click();
  await page.getByRole('button', { name: /Name textField modified/ }).click();
  await expect(page.getByText('Wizard1 / Details / Panel / Content / Columns / Column A / Name')).toBeVisible();

  const script = page.getByRole('table', { name: 'Script line diff' });
  await expect(script.locator('code')).toHaveText(['return data.name;', 'return data.name.trim();']);

  for (const viewport of [{ width: 1440, height: 960 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    await page.getByRole('article').screenshot({
      animations: 'disabled', path: testInfo.outputPath(`nested-component-${viewport.width}.png`),
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  await page.getByRole('radiogroup', { name: 'segmented control' }).getByText('Scripts', { exact: true }).click();
  await expect(page.getByRole('button', { name: /onChangeCustom/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /onChangeCustom Name modified/ })).toBeVisible();
  await expect(script.locator('code')).toHaveText(['return data.name;', 'return data.name.trim();']);
  expect(errors).toEqual([]);
});
