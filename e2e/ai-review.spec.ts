import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const endpoint = 'https://api.openai.com/v1/responses';
const before = {
  components: [{ id: 'name', type: 'textField', label: 'Organisation name', required: true }],
  formSettings: { onBeforeSubmit: 'return oldSave();' },
};
const after = {
  ...before,
  formSettings: {
    onBeforeSubmit:
      'const apiKey = "LOCAL-SCRIPT-CREDENTIAL-FIXTURE"; return latestSave(data?.npo.type);',
    apiKey: 'LOCAL-CONFIG-CREDENTIAL-FIXTURE',
  },
};

const prepare = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'shesha-config-diff.ai-settings.v1',
      JSON.stringify({
        provider: 'openai',
        model: 'test-model',
        endpoint: 'https://api.openai.com/v1/responses',
      }),
    ),
  );
  await page.reload();
  const files = page.locator('input[type="file"]');
  for (const index of [0, 1]) {
    const form = [before, after][index];
    await files
      .nth(index)
      .setInputFiles({
        buffer: Buffer.from(JSON.stringify(form)),
        mimeType: 'application/json',
        name: 'example.form.json',
      });
  }
  await page.getByRole('tab', { name: 'AI review', exact: true }).click();
  await expect(page.getByText('No AI provider configured')).toBeVisible();
  await page.getByRole('button', { name: 'Configure provider', exact: true }).click();
  await page
    .getByPlaceholder('Not saved; re-enter after refreshing')
    .fill('local-provider-key-fixture');
  await page.getByRole('button', { name: /Save$/ }).click();
};

const respond = (content: unknown): object => ({
  output: [
    {
      content: [
        {
          type: 'output_text',
          text: typeof content === 'string' ? content : JSON.stringify(content),
        },
      ],
    },
  ],
});

test('reviews latest context on demand with short sections, source references and mobile layouts', async ({
  page,
}, testInfo) => {
  let requests = 0;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(endpoint, async (route) => {
    requests += 1;
    const body = route.request().postDataJSON() as {
      input: string;
      instructions: string;
      store: boolean;
    };
    const payload = JSON.parse(body.input.slice(body.input.indexOf('\n\n') + 2)) as {
      latestForm: { targets: { id: string; source: string; label: string }[] };
      reviewConcerns: { rule: string }[];
    };
    expect(body.store).toBe(false);
    expect(body.instructions).toContain('UNTRUSTED DATA');
    expect(body.input).not.toContain('LOCAL-SCRIPT-CREDENTIAL-FIXTURE');
    expect(body.input).not.toContain('LOCAL-CONFIG-CREDENTIAL-FIXTURE');
    expect(body.input).not.toContain('local-provider-key-fixture');
    expect(payload.latestForm.targets.map((target) => target.source).join('')).not.toContain(
      'oldSave',
    );
    expect(payload.latestForm.targets.some((target) => target.label === 'Organisation name')).toBe(
      true,
    );
    expect(payload.reviewConcerns.some((finding) => finding.rule === 'unsafe-access')).toBe(true);
    const target = payload.latestForm.targets.find((item) => item.source.includes('latestSave'));
    expect(target).toBeDefined();
    await route.fulfill({
      json: respond({
        summary:
          requests === 1
            ? 'The submit action now uses the latest save function.'
            : 'The review was regenerated for the latest form.',
        improvements: [
          {
            title: 'Guard a missing organisation',
            targetId: target?.id,
            reason: 'The organisation reference may be absent.',
            suggestion: 'Confirm the model guarantee or guard npo before reading type.',
          },
        ],
        edgeCases: [
          {
            title: 'Submit without an organisation',
            targetId: target?.id,
            scenario: 'Open the form with no organisation reference and submit.',
            expected: 'Show validation feedback without navigating or throwing.',
          },
        ],
      }),
    });
  });

  await prepare(page);
  const panel = page.getByRole('region', { name: 'AI form review' });
  const countBefore = await page.getByText(/deterministic changes found/).textContent();
  expect(requests).toBe(0);
  await panel.getByText(/Request context \|/).click();
  await expect(panel.getByLabel('Redacted AI request')).not.toContainText(
    'LOCAL-SCRIPT-CREDENTIAL-FIXTURE',
  );
  expect(requests).toBe(0);
  await panel.getByText(/Request context \|/).click();
  await panel.getByRole('button', { name: 'Review latest form', exact: true }).click();
  const result = panel.getByRole('article', { name: 'AI review result' });
  await expect(result.getByLabel('Change summary')).toContainText('latest save function');
  const improvements = result.getByRole('button', { name: /Suggested improvements/ });
  await expect(improvements).toHaveAttribute('aria-expanded', 'false');
  await improvements.click();
  await expect(result.getByText('Guard a missing organisation')).toBeVisible();
  await result.getByText('After: Form settings', { exact: true }).click();
  await expect(result.getByLabel('After source: Form settings')).toContainText('latestSave');
  await expect(result.getByLabel('After source: Form settings')).not.toContainText(
    'LOCAL-SCRIPT-CREDENTIAL-FIXTURE',
  );
  await result.getByText('After: Form settings', { exact: true }).click();
  await result.getByRole('button', { name: /Edge cases to test/ }).click();
  await expect(
    result.getByText('Show validation feedback without navigating or throwing.'),
  ).toBeVisible();
  for (const width of [1440, 375, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({
      animations: 'disabled',
      path: testInfo.outputPath(`ai-review-${width}.png`),
    });
  }
  await panel.getByRole('button', { name: 'Regenerate review' }).click();
  await expect(result.getByLabel('Change summary')).toContainText('regenerated');
  expect(requests).toBe(2);
  await expect(page.getByText(/deterministic changes found/)).toHaveText(countBefore ?? '');
  expect(errors).toEqual([]);
});

test('handles malformed replies, provider failures and empty suggestions without rendering raw output', async ({
  page,
}) => {
  let attempt = 0;
  await page.route(endpoint, async (route) => {
    attempt += 1;
    if (attempt === 2) {
      await route.fulfill({ status: 429, json: { error: { message: 'Rate limit reached' } } });
      return;
    }
    const content =
      attempt === 1
        ? '<img src=x onerror=alert(1)> An unstructured essay.'
        : {
            summary: 'No further suggestions in the supplied context.',
            improvements: [],
            edgeCases: [],
          };
    await route.fulfill({ json: respond(content) });
  });
  await prepare(page);
  const panel = page.getByRole('region', { name: 'AI form review' });
  await panel.getByRole('button', { name: 'Review latest form', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('expected review format');
  await expect(panel.locator('img')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Review latest form', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('Rate limit reached');
  await panel.getByRole('button', { name: 'Review latest form', exact: true }).click();
  await expect(panel.getByLabel('Change summary')).toContainText('No further suggestions');
  await panel.getByRole('button', { name: /Suggested improvements/ }).click();
  await expect(
    panel.getByText('No specific improvements identified in the supplied context.'),
  ).toBeVisible();
  expect(attempt).toBe(3);
});

test('allows cancellation without accepting a late review', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(endpoint, async (route) => {
    await gate;
    await route
      .fulfill({
        json: respond({
          summary: 'Stale review must not appear.',
          improvements: [],
          edgeCases: [],
        }),
      })
      .catch(() => undefined);
  });
  await prepare(page);
  const panel = page.getByRole('region', { name: 'AI form review' });
  await panel.getByRole('button', { name: 'Review latest form', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Reviewing latest form');
  await panel.getByRole('button', { name: 'Cancel', exact: true }).click();
  release();
  await expect(panel.getByText('No AI review yet')).toBeVisible();
  await expect(panel.getByRole('article', { name: 'AI review result' })).toHaveCount(0);
});
