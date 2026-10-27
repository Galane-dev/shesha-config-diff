import { expect, test } from '@playwright/test';

const beforeForm = JSON.stringify({
  components: [{ id: 'field-1', label: 'Name', type: 'textField' }],
  formSettings: { modelType: 'Example.Record', version: 1 },
});

const afterForm = JSON.stringify({
  components: [
    { id: 'field-1', label: 'Organisation name', type: 'textField' },
    { id: 'field-2', label: 'Email', type: 'textField' },
  ],
  formSettings: { modelType: 'Example.Record', version: 1 },
});

test('compares two form exports', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/');

  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.nth(0).setInputFiles({
    buffer: Buffer.from(beforeForm),
    mimeType: 'application/json',
    name: 'example.module.sample-form.json',
  });
  await fileInputs.nth(1).setInputFiles({
    buffer: Buffer.from(afterForm),
    mimeType: 'application/json',
    name: 'example.module.sample-form.json',
  });

  await expect(page.getByText('deterministic changes found')).toBeVisible();
  await expect(page.getByRole('button', { name: /Organisation name/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Email/ })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Report' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('sample-form-diff.md');

  await page.getByRole('tab', { name: 'Raw JSON' }).click();
  await expect(page.getByText('"components": [')).toHaveCount(2);

  await page.getByRole('button', { name: 'Open AI provider settings' }).click();
  await expect(page.getByText('API key is not saved')).toBeVisible();
  expect(browserErrors).toEqual([]);
});
