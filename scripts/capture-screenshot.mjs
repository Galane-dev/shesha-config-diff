import { chromium } from '@playwright/test';

const beforeForm = {
  components: [
    {
      components: [
        { id: 'name-field', label: 'Organisation name', propertyName: 'name', type: 'textField' },
        {
          id: 'mobile-field',
          label: 'Mobile number',
          propertyName: 'mobileNumber',
          type: 'textField',
          validator: {
            _code: "return /^0\\d{9}$/.test(String(value ?? ''));",
            _mode: 'code',
          },
        },
      ],
      id: 'contact-panel',
      label: 'Contact details',
      type: 'panel',
    },
  ],
  formSettings: {
    modelType: 'Boxfusion.Sample.Organisation',
    onAfterDataLoad: 'return data;',
    version: 1,
  },
};

const afterForm = {
  components: [
    {
      components: [
        { id: 'name-field', label: 'Registered organisation name', propertyName: 'name', type: 'textField' },
        { id: 'email-field', label: 'Email address', propertyName: 'emailAddress', type: 'textField' },
        {
          id: 'mobile-field',
          label: 'Mobile number',
          propertyName: 'mobileNumber',
          type: 'textField',
          validator: {
            _code: "return /^(?:\\+27|0)[1-9]\\d{8}$/.test(String(value ?? '').trim());",
            _mode: 'code',
          },
        },
      ],
      id: 'contact-panel',
      label: 'Organisation contact details',
      type: 'panel',
    },
  ],
  formSettings: {
    modelType: 'Boxfusion.Sample.Organisation',
    onAfterDataLoad: 'return { ...data, isReady: true };',
    version: 1,
  },
};

const isMobile = process.argv.includes('--mobile');
const outputPath = isMobile ? 'test-results/mobile.png' : 'docs/screenshot.png';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: isMobile ? { height: 844, width: 390 } : { height: 1000, width: 1440 },
});

await page.goto('http://127.0.0.1:5173/');
const fileInputs = page.locator('input[type="file"]');

await fileInputs.nth(0).setInputFiles({
  buffer: Buffer.from(JSON.stringify(beforeForm)),
  mimeType: 'application/json',
  name: 'boxfusion.sample.organisation-form.json',
});
await fileInputs.nth(1).setInputFiles({
  buffer: Buffer.from(JSON.stringify(afterForm)),
  mimeType: 'application/json',
  name: 'boxfusion.sample.organisation-form.json',
});
await page.getByText('deterministic changes found').waitFor();
await page.screenshot({ fullPage: true, path: outputPath });
await browser.close();
