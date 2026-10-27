import { expect, test } from '@playwright/test';

const scriptId = 'I4gaURdQk2JI0DxLn1O9EMwNnNexJP';
const scriptPath = `items[id="${scriptId}"].actionConfiguration.actionArguments.expression`;
const beforeScript = 'const partner = data.partnerName;\nconsole.log(partner);\nreturn partner;';
const afterScript = 'const partner = data.partnerName;\nreturn partner;';

const createForm = (updated: boolean): string => JSON.stringify({
  components: [{
    id: 'actions', label: 'Actions', type: 'buttonGroup',
    hidden: { _mode: 'code', _code: updated ? 'return !data.enabled;' : 'return false;' },
    items: [
      ...(updated ? [{
        id: 'cancel', label: 'Cancel', editMode: 'inherited',
        actionConfiguration: { actionOwner: 'shesha.common', actionName: 'Close Dialog' },
      }] : []),
      {
        id: scriptId, label: 'Save', editMode: 'inherited', actionConfiguration: {
          _type: 'action-config', actionOwner: 'shesha.common', actionName: 'Execute Script',
          actionArguments: { expression: updated ? afterScript : beforeScript },
        },
      },
    ],
  }],
  formSettings: {},
});

test('names table columns by caption and icon-only actions by their dialog titles', async ({ page }, testInfo) => {
  const form = (updated: boolean): string => JSON.stringify({
    components: [{ id: 'table', type: 'datatable', label: 'Office bearers', items: Array.from({ length: 12 }, (_, index) => {
      if (index === 0) {
        return { id: 'edit', caption: '', icon: 'EditOutlined', actionConfiguration: { actionArguments: {
          modalTitle: 'Edit Office Bear Information', formArguments: updated ? 'return data.person;' : 'return data;',
        } } };
      }
      if (index === 1) {
        return { id: 'remove', caption: '', icon: 'DeleteOutlined', actionConfiguration: {
          actionArguments: { title: 'Remove Office Bearer' },
          onSuccess: { actionArguments: { expression: updated ? 'return data.person;' : 'return data;' } },
        } };
      }
      return {
        id: `column-${index}`, caption: index === 11 ? 'Type Of Disability' : `Column ${index + 1}`,
        customVisibility: updated && index === 11 ? 'return true;' : 'return false;',
      };
    }) }], formSettings: {},
  });
  await page.goto('/');
  const files = page.locator('input[type="file"]');
  for (const index of [0, 1]) {
    await files.nth(index).setInputFiles({
      buffer: Buffer.from(form(index === 1)), mimeType: 'application/json', name: 'example.module.table.json',
    });
  }

  const article = page.getByRole('article');
  const edit = article.getByRole('button', { name: /^Edit Office Bear Information / });
  const remove = article.getByRole('button', { name: /^Remove Office Bearer / });
  const disability = article.getByRole('button', { name: /^Type Of Disability / });
  await expect(edit).toBeVisible();
  await expect(remove).toBeVisible();
  await expect(disability).toBeVisible();
  await expect(article.getByRole('button', { name: /^Item \d+ / })).toHaveCount(0);
  await edit.click();
  await remove.click();
  const script = page.getByRole('table', { name: 'Script line diff' });
  await expect(script).toContainText('return data.person;');
  await remove.click();
  await expect(script).toBeHidden();
  await disability.click();
  await expect(script).toContainText('return true;');

  for (const viewport of [{ width: 1440, height: 960 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await article.screenshot({ animations: 'disabled', path: testInfo.outputPath(`table-labels-${viewport.width}.png`) });
  }
  await page.getByRole('radiogroup', { name: 'segmented control' }).getByText('Scripts', { exact: true }).click();
  const entries = page.getByRole('complementary').getByRole('button');
  await expect(entries).toHaveCount(2);
  await expect(entries.filter({ hasText: 'Remove Office Bearer' })).toBeVisible();
  await expect(entries.filter({ hasText: 'Type Of Disability' })).toBeVisible();
});

test('groups wizard scripts by step number and title, including the Scripts filter', async ({ page }, testInfo) => {
  const form = (updated: boolean): string => JSON.stringify({
    components: [{ id: 'wizard', type: 'wizard', label: 'Registration wizard', steps: [
      {
        id: 'details', title: 'Organisation Details', label: 'Step 1', components: [
          { id: 'org-name', type: 'textField', label: 'Organisation name' },
        ],
        beforeNextActionConfiguration: { actionArguments: { expression: updated ? 'return data.npo;' : 'return data;' } },
      },
      {
        id: 'declaration', title: 'Declaration', components: [],
        beforeDoneActionConfiguration: { actionArguments: { expression: updated ? 'return true;' : 'return false;' } },
      },
    ] }], formSettings: {},
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const files = page.locator('input[type="file"]');
  for (const index of [0, 1]) {
    await files.nth(index).setInputFiles({
      buffer: Buffer.from(form(index === 1)), mimeType: 'application/json', name: 'example.module.wizard.json',
    });
  }

  await expect(page.getByText('1 components', { exact: true })).toBeVisible();
  await expect(page.getByText('2 scripts', { exact: true })).toBeVisible();
  const article = page.getByRole('article');
  await expect(article.getByRole('button', { name: /^Step 1 - Organisation Details / })).toBeVisible();
  const script = page.getByRole('table', { name: 'Script line diff' });
  await expect(script).toContainText('return data.npo;');
  await article.getByRole('button', { name: /^Step 1 - Organisation Details / }).click();
  await expect(script).toBeHidden();
  await article.getByRole('button', { name: /^Step 2 - Declaration / }).click();
  await expect(article.getByRole('button', { name: /Before Done \/ Script modified/ })).toBeVisible();
  await expect(script).toContainText('return true;');

  for (const viewport of [{ width: 1440, height: 960 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await article.screenshot({ animations: 'disabled', path: testInfo.outputPath(`wizard-steps-${viewport.width}.png`) });
  }

  await page.getByRole('radiogroup', { name: 'segmented control' }).getByText('Scripts', { exact: true }).click();
  const entries = page.getByRole('complementary').getByRole('button');
  await expect(entries).toHaveCount(2);
  await expect(entries.filter({ hasText: 'Steps / Step 1 - Organisation Details / Before Next / Script' })).toBeVisible();
  await entries.filter({ hasText: 'Steps / Step 2 - Declaration / Before Done / Script' }).click();
  await expect(script).toContainText('return true;');
  expect(errors).toEqual([]);
});

test('shows action scripts in their own component panels and both diff modes', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const files = page.locator('input[type="file"]');

  for (const index of [0, 1]) {
    await files.nth(index).setInputFiles({
      buffer: Buffer.from(createForm(index === 1)), mimeType: 'application/json', name: 'example.module.actions.json',
    });
  }

  await expect(page.getByText('1 components', { exact: true })).toBeVisible();
  await expect(page.getByText('2 scripts', { exact: true })).toBeVisible();
  const article = page.getByRole('article');
  await article.getByRole('button', { name: /Hidden modified/ }).click();
  await article.getByRole('button', { name: /^Items / }).click();
  const cancel = article.getByRole('button', { name: /^Cancel / });
  await expect(cancel).toBeVisible();
  await cancel.click();
  await article.getByRole('button', { name: /^Save / }).click();
  const expression = article.getByRole('button', { name: /Action \/ Script modified/ });
  await expect(expression.getByTitle(scriptPath, { exact: true })).toBeVisible();
  await expect(expression).not.toContainText('id=');

  const script = page.getByRole('table', { name: 'Script line diff' });
  await expect(script.locator('code').filter({ hasText: 'console.log(partner);' })).toHaveCount(1);
  await expect(script).not.toContainText('actionArguments');

  for (const viewport of [{ width: 1440, height: 960 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    await page.getByRole('radiogroup', { name: 'Diff view' }).getByText('Side by Side', { exact: true }).click();
    await expect(script.locator('code').filter({ hasText: 'const partner = data.partnerName;' })).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await article.screenshot({ animations: 'disabled', path: testInfo.outputPath(`nested-script-side-${viewport.width}.png`) });

    await page.getByRole('radiogroup', { name: 'Diff view' }).getByText('Inline', { exact: true }).click();
    await expect(script.locator('code').filter({ hasText: 'const partner = data.partnerName;' })).toHaveCount(1);
    await expect(script.getByRole('row').filter({ hasText: 'console.log(partner);' }))
      .toHaveCSS('background-color', 'rgb(255, 240, 240)');
    await article.screenshot({ animations: 'disabled', path: testInfo.outputPath(`nested-script-inline-${viewport.width}.png`) });
  }

  await page.getByRole('radiogroup', { name: 'segmented control' }).getByText('Scripts', { exact: true }).click();
  const entries = page.getByRole('complementary').getByRole('button');
  await expect(entries).toHaveCount(2);
  await entries.filter({ hasText: 'Items / Save / Action / Script' }).click();
  await expect(script.locator('code').filter({ hasText: 'console.log(partner);' })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('nests dialog buttons separately and displays only their changed settings', async ({ page }, testInfo) => {
  const form = (updated: boolean): string => JSON.stringify({
    components: [{ id: 'actions', type: 'buttonGroup', label: 'Partner actions', items: [{
      id: 'open', label: 'Add partner', actionConfiguration: { actionArguments: { buttons: [
        { id: 'cancel', label: 'Cancel', buttonType: updated ? 'link' : 'default', tooltip: 'Unchanged tooltip' },
        { id: 'save', label: 'Save', actionConfiguration: { actionArguments: {
          expression: updated ? 'return data.partner;' : 'return data;',
        } } },
        { id: 'help', label: 'Help', actionConfiguration: { actionName: 'Open help' } },
      ] } },
    }] }], formSettings: {},
  });
  await page.goto('/');
  const files = page.locator('input[type="file"]');
  for (const index of [0, 1]) {
    await files.nth(index).setInputFiles({
      buffer: Buffer.from(form(index === 1)), mimeType: 'application/json', name: 'example.module.dialog.json',
    });
  }

  const article = page.getByRole('article');
  await expect(article.getByRole('button', { name: /^Items / })).toBeVisible();
  await expect(article.getByRole('button', { name: /^Add partner / })).toBeVisible();
  await expect(article.getByRole('button', { name: /^Buttons / })).toBeVisible();
  const cancel = article.getByRole('button', { name: /^Cancel / });
  await expect(cancel).toBeVisible();
  const metadata = page.getByRole('table', { name: 'Value line diff' });
  await expect(metadata).toContainText('default');
  await expect(metadata).toContainText('link');
  await expect(article.getByRole('button', { name: /^Help / })).toHaveCount(0);
  await expect(article.getByRole('button', { name: /Tooltip/ })).toHaveCount(0);
  await cancel.click();
  await article.getByRole('button', { name: /^Save / }).click();
  const script = page.getByRole('table', { name: 'Script line diff' });
  await expect(script).toContainText('return data.partner;');

  for (const viewport of [{ width: 1440, height: 960 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const headers = article.getByRole('button');
    expect(await headers.count()).toBeGreaterThan(0);
    const labelsFit = await headers.evaluateAll((buttons) => buttons.every((button) => {
      const label = button.querySelector('[title]')?.getBoundingClientRect();
      const header = button.getBoundingClientRect();
      return label !== undefined && label.left >= header.left && label.right <= header.right;
    }));
    expect(labelsFit).toBe(true);
    await article.screenshot({ animations: 'disabled', path: testInfo.outputPath(`nested-buttons-${viewport.width}.png`) });
  }
});
