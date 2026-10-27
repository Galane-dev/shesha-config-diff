import { expect, test } from '@playwright/test';

test('reviews error handling, completion, runtime access, context syntax and configuration risks locally', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173')) external.push(request.url());
  });
  const before = { components: [], formSettings: {} };
  const after = {
    components: [
      {
        id: 'field',
        label: 'Conditional field',
        type: 'textField',
        hidden: { _mode: 'code', _code: 'return await http.get("/visible");' },
      },
    ],
    formSettings: {
      apiUrl: 'http://testportal.example.com/api',
      apiKey: 'LOCAL-CONFIG-CREDENTIAL-FIXTURE',
      onBeforeSubmit:
        'const apiKey = "LOCAL-SCRIPT-CREDENTIAL-FIXTURE";\nhttp.post("/save", data).catch(error => console.error(error));\nhttp.get("/data").then(result => result.data);\nconst value = data?.npo.type;\nconsole.log(data);\nreturn value;',
    },
  };
  await page.goto('/');
  const files = page.locator('input[type="file"]');
  for (const index of [0, 1]) {
    await files
      .nth(index)
      .setInputFiles({
        buffer: Buffer.from(JSON.stringify([before, after][index])),
        mimeType: 'application/json',
        name: 'example.module.extended-review.json',
      });
  }
  const summary = await page.getByText(/deterministic changes found/).textContent();
  await page.getByRole('tab', { name: 'Review Concerns' }).click();
  const panel = page.getByRole('region', { name: 'Review concerns' });
  const type = panel.getByRole('combobox', { name: 'Finding type' });
  const entries = panel.getByRole('navigation', { name: 'Review findings' }).getByRole('button');
  const details = panel.getByRole('article', { name: 'Review finding' });
  for (const label of [
    'Error handling',
    'Promise rejection',
    'Async completion',
    'Runtime access',
    'Syntax review',
    'Test URLs',
    'Insecure HTTP',
    'Embedded credentials',
  ]) {
    await type.click();
    const option = page.getByRole('option', { name: label, exact: true });
    await option.hover();
    await option.click();
    await expect(type).toHaveAttribute('aria-expanded', 'false');
    await expect(entries.first()).toBeVisible();
    await expect(details.getByText(label, { exact: true })).toBeVisible();
    if (label === 'Syntax review') await expect(details).toContainText('sync function body');
    if (label === 'Async completion')
      await expect(details).toContainText('navigate before it finishes');
  }
  await entries.filter({ hasText: 'Api Key' }).click();
  await expect(details).toContainText('Credential values masked');
  await expect(details).not.toContainText('LOCAL-CONFIG-CREDENTIAL-FIXTURE');
  await details.getByRole('button', { name: 'Full value' }).click();
  await expect(details.getByLabel('Full configuration value')).not.toContainText(
    'LOCAL-CONFIG-CREDENTIAL-FIXTURE',
  );
  await type.click();
  const sensitiveOption = page.getByRole('option', { name: 'Sensitive logging', exact: true });
  await sensitiveOption.hover();
  await sensitiveOption.click();
  await expect(type).toHaveAttribute('aria-expanded', 'false');
  await expect(details.getByText('Sensitive logging', { exact: true })).toBeVisible();
  await expect(details).not.toContainText('LOCAL-SCRIPT-CREDENTIAL-FIXTURE');
  await details.getByRole('button', { name: 'Full script' }).click();
  await expect(details.getByLabel('Full script source')).not.toContainText(
    'LOCAL-SCRIPT-CREDENTIAL-FIXTURE',
  );
  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 375, height: 812 },
    { width: 320, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await panel.screenshot({
      animations: 'disabled',
      path: testInfo.outputPath(`extended-review-${viewport.width}.png`),
    });
  }
  expect(await page.getByText(/deterministic changes found/).textContent()).toBe(summary);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
