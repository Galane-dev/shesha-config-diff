import { expect, test } from '@playwright/test';

const storageKey = 'shesha-config-diff.ai-settings.v1';
const preferences = {
  endpoint: 'https://api.openai.com/v1/responses',
  model: 'test-model',
  provider: 'openai',
};

test('preserves preferences and keeps API keys in memory only', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(({ key, savedPreferences }) => {
    localStorage.setItem(key, JSON.stringify(savedPreferences));
  }, { key: storageKey, savedPreferences: preferences });
  await page.reload();
  await page.getByRole('button', { name: 'Open AI provider settings' }).click();

  const keyInput = page.getByPlaceholder('Not saved; re-enter after refreshing');
  const modelInput = page.getByPlaceholder('Enter an available text model');
  const endpointInput = page.getByPlaceholder('https://...');

  await expect(page.getByText('API key is not saved')).toBeVisible();
  await expect(keyInput).toHaveValue('');
  await expect(modelInput).toHaveValue(preferences.model);
  await expect(endpointInput).toHaveValue(preferences.endpoint);
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(JSON.stringify(preferences));

  await keyInput.fill('new-test-api-key');
  await page.getByRole('button', { name: /Save$/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(JSON.stringify(preferences));
  await page.getByRole('button', { name: 'Open AI provider settings' }).click();
  await expect(keyInput).toHaveValue('new-test-api-key');
  await page.getByRole('button', { name: 'Clear key' }).click();
  await page.getByRole('button', { name: 'Open AI provider settings' }).click();

  await expect(keyInput).toHaveValue('');
  await expect(modelInput).toHaveValue(preferences.model);
  await keyInput.fill('refresh-test-api-key');
  await page.getByRole('button', { name: /Save$/ }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Open AI provider settings' }).click();

  await expect(keyInput).toHaveValue('');
  await expect(modelInput).toHaveValue(preferences.model);
  await expect(endpointInput).toHaveValue(preferences.endpoint);
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  await page.mouse.move(0, 0);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('ai-key-settings-desktop.png') });

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(keyInput).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear key' })).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('ai-key-settings-mobile.png') });
  await expect(page.getByRole('dialog')).toBeInViewport({ ratio: 1 });
});
