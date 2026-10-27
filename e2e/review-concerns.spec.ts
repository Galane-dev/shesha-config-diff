import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const upload = async (page: Page, before: object, after: object): Promise<void> => {
  await page.goto('/');
  for (const index of [0, 1]) {
    const form = [before, after][index];
    await page.locator('input[type="file"]').nth(index).setInputFiles({
      buffer: Buffer.from(JSON.stringify(form)), mimeType: 'application/json', name: 'example.module.review.json',
    });
  }
  await page.getByRole('tab', { name: 'Review Concerns' }).click();
};

test('reviews console usage, sensitive logging and syntax without executing scripts or changing the diff', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173')) externalRequests.push(request.url());
  });
  const before = { components: [], formSettings: {
    onAfterDataLoad: 'console.info("Existing");\nconsole.warn("Removed");', onBeforeDataLoad: 'return data;',
  } };
  const after = { components: [{ id: 'field', type: 'textField', label: 'console.log(data.password)',
    hidden: { _mode: 'value', _value: false, _code: 'console.log(data.password);' },
  }], formSettings: {
    onAfterDataLoad: '// console.log(data.password);\nconsole.info("Existing");\nconsole.log("New debug");\nconsole.error("New error");\nconsole.log(data.emailAddress1);\nglobalThis.__uploadedScriptRan = true;\nfetch("https://example.invalid/never-run");',
    onBeforeDataLoad: 'const broken = ;',
  } };
  await upload(page, before, after);
  const diffSummary = page.getByText(/deterministic changes found/);
  const summaryText = await diffSummary.textContent();
  const panel = page.getByRole('region', { name: 'Review concerns' });
  const navigation = panel.getByRole('navigation', { name: 'Review findings' });
  const entries = navigation.getByRole('button');
  const details = panel.getByRole('article', { name: 'Review finding' });
  await expect(entries).toHaveCount(8);
  await expect(panel.getByText('New: 6', { exact: true })).toBeVisible();
  await expect(panel.getByText('Existing: 1', { exact: true })).toBeVisible();
  await expect(panel.getByText('Resolved: 1', { exact: true })).toBeVisible();
  await entries.filter({ hasText: 'Console usage: console.error' }).click();
  await expect(details).toContainText('does not itself throw an exception');
  const status = panel.getByRole('radiogroup', { name: 'Finding status' });
  await status.getByText('New', { exact: true }).click();
  await expect(entries).toHaveCount(6);
  await status.getByText('Existing', { exact: true }).click();
  await expect(entries).toHaveCount(1);
  await expect(details).toContainText('console.info');
  await status.getByText('Resolved', { exact: true }).click();
  await expect(entries).toHaveCount(1);
  await expect(details).toContainText('Before | Line 2');
  await expect(details.getByLabel('Script evidence')).toContainText('Removed');
  await status.getByText('All', { exact: true }).click();
  await panel.getByRole('combobox', { name: 'Finding type' }).click();
  await page.getByRole('option', { name: 'Sensitive logging' }).click();
  await expect(entries).toHaveCount(1);
  await panel.getByRole('textbox', { name: 'Search review findings' }).fill('missing-field');
  await expect(panel.getByText('No matching findings')).toBeVisible();
  await panel.getByRole('textbox', { name: 'Search review findings' }).fill('onAfterDataLoad');
  await expect(entries).toHaveCount(1);
  await expect(details).toContainText('not proof of disclosure');
  await expect(details).toContainText('After | Line 5, column 1');

  for (const viewport of [{ width: 1440, height: 960 }, { width: 375, height: 812 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const labels = status.locator('.ant-segmented-item-label');
    await expect(labels).toHaveCount(5);
    expect(await labels.evaluateAll((items) => items.every((item) => item.scrollWidth <= item.clientWidth))).toBe(true);
    await panel.screenshot({ animations: 'disabled', path: testInfo.outputPath(`review-concerns-${viewport.width}.png`) });
  }

  await panel.getByRole('textbox', { name: 'Search review findings' }).fill('');
  await panel.getByRole('combobox', { name: 'Finding type' }).click();
  await page.getByRole('option', { name: 'Syntax review' }).click();
  await expect(entries).toHaveCount(1);
  await expect(details.getByLabel('Script evidence')).toContainText('const broken = ;');
  await expect(details).toContainText('actual Shesha editor context');
  expect(await page.evaluate(() => '__uploadedScriptRan' in window)).toBe(false);
  expect(await diffSummary.textContent()).toBe(summaryText);
  expect(browserErrors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test('reviews unchanged scripts even when the Changes tab is empty', async ({ page }) => {
  const form = { components: [], formSettings: { onAfterDataLoad: 'console.log(data);' } };
  await upload(page, form, form);
  const panel = page.getByRole('region', { name: 'Review concerns' });
  await expect(panel.getByText('Existing: 1', { exact: true })).toBeVisible();
  await expect(panel.getByRole('navigation').getByRole('button')).toHaveCount(1);
});

test('marks older logging unverified when a later script has invalid syntax', async ({ page }) => {
  await upload(page,
    { components: [], formSettings: { onAfterDataLoad: 'console.log(data);' } },
    { components: [], formSettings: { onAfterDataLoad: 'console.log(data);\nconst broken = ;' } });
  const panel = page.getByRole('region', { name: 'Review concerns' });
  await panel.getByRole('radiogroup', { name: 'Finding status' }).getByText('Unverified', { exact: true }).click();
  await expect(panel.getByRole('navigation').getByRole('button')).toHaveCount(1);
  await expect(panel.getByRole('article')).toContainText('Comparison incomplete');
});

test('has an empty state for scripts with no supported findings', async ({ page }) => {
  const form = { components: [], formSettings: { onAfterDataLoad: 'return data;' } };
  await upload(page, form, form);
  await expect(page.getByText('No review findings in recognised scripts or configuration')).toBeVisible();
});
