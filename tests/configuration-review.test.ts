import { describe, expect, it } from 'vitest';
import { analyzeScript } from '../src/utils/review/analyze-script';
import { compareReviews } from '../src/utils/review/compare-reviews';
import { inspectConfigurationValue } from '../src/utils/review/configuration-values';
import { redactSource } from '../src/utils/review/redact-source';

describe('static configuration risks', () => {
  it.each([
    'https://testportal.example.com/PIP_API/',
    'https://api.example.com/sandbox/token',
    'https://service-dev.example.com',
    'http://localhost:3000',
    'http://[::1]:3000',
  ])('identifies a local/test environment marker: %s', (value) => {
    expect(inspectConfigurationValue(value).some((risk) => risk.rule === 'test-url')).toBe(true);
  });

  it.each([
    'https://api.example.com/production',
    'https://contest.example.com/data',
    'Use http://example.com in the documentation',
  ])('does not guess test URLs inside ordinary prose or unrelated names: %s', (value) => {
    expect(inspectConfigurationValue(value)).toEqual([]);
  });

  it('flags remote HTTP while avoiding duplicate transport warnings for loopback development', () => {
    expect(inspectConfigurationValue('http://api.example.com').map((risk) => risk.rule)).toContain(
      'insecure-http',
    );
    expect(
      inspectConfigurationValue('http://localhost:3000').map((risk) => risk.rule),
    ).not.toContain('insecure-http');
  });

  it.each([
    'YOUR_API_KEY',
    'REPLACE_ME',
    '<token>',
    '${runtimeKey}',
    '{{runtimeKey}}',
    '[REDACTED]',
    '',
  ])('does not treat an obvious placeholder as an embedded credential: %s', (value) => {
    expect(inspectConfigurationValue(value, 'apiKey')).toEqual([]);
  });

  it('does not mistake password-reset URLs for password values', () => {
    expect(inspectConfigurationValue('https://app.example.com/reset', 'passwordResetUrl')).toEqual(
      [],
    );
    expect(inspectConfigurationValue('https://api.example.com/oauth/token', 'apiUrlToken')).toEqual(
      [],
    );
    expect(inspectConfigurationValue('Bearer {{runtimeToken}}', 'Authorization')).toEqual([]);
    expect(inspectConfigurationValue('Office Bearer Information')).toEqual([]);
    expect(inspectConfigurationValue('An office bearer information panel')).toEqual([]);
  });

  it('finds credential-like script assignments and masks them in all evidence for that source', () => {
    const source = 'const apiKey = "LOCAL-ONLY-CREDENTIAL-FIXTURE";\nconsole.log(data);';
    const input = { components: [], formSettings: { onBeforeSubmit: source } };
    const result = compareReviews(input, input);
    const credential = result.findings.find((finding) => finding.rule === 'embedded-credential');
    const logging = result.findings.find((finding) => finding.rule === 'sensitive-logging');
    expect(credential?.message).not.toContain('LOCAL-ONLY-CREDENTIAL-FIXTURE');
    expect(redactSource(source, credential?.redactions)).not.toContain(
      'LOCAL-ONLY-CREDENTIAL-FIXTURE',
    );
    expect(redactSource(source, logging?.redactions)).not.toContain(
      'LOCAL-ONLY-CREDENTIAL-FIXTURE',
    );
    expect(result.findings.every((finding) => finding.status === 'existing')).toBe(true);
  });

  it('reviews plain JSON settings and active static values without parsing them as JavaScript', () => {
    const result = compareReviews(
      { components: [], formSettings: {} },
      {
        components: [],
        formSettings: {
          apiUrl: 'http://testportal.example.com/PIP_API/',
          apiKey: {
            _mode: 'value',
            _value: 'LOCAL-ONLY-CREDENTIAL-FIXTURE',
            _code: 'console.log(data);',
          },
        },
      },
    );
    expect(result.findings.map((finding) => finding.rule).sort()).toEqual([
      'embedded-credential',
      'insecure-http',
      'test-url',
    ]);
    expect(result.findings.every((finding) => finding.script.kind === 'configuration')).toBe(true);
    expect(result.scriptCount).toBe(0);
    expect(result.configurationCount).toBe(2);
  });

  it('reviews static URLs inside scripts but does not evaluate interpolated templates or comments', () => {
    const result = analyzeScript({
      id: 'script',
      label: 'Script',
      path: 'onBeforeSubmit',
      source:
        '// http://testportal.example.com\nconst endpoint = "http://testportal.example.com"; const dynamic = `https://${data.host}/api`; return endpoint;',
    });
    expect(result.findings.map((finding) => finding.rule).sort()).toEqual([
      'insecure-http',
      'test-url',
    ]);
  });

  it('masks URL credentials, including in other URL risk evidence', () => {
    const value = 'http://user:local-fixture@testportal.example.com/?access_token=local-fixture';
    const result = compareReviews(
      { components: [], formSettings: {} },
      { components: [], formSettings: { apiUrl: value } },
    );
    expect(result.findings).toHaveLength(3);
    expect(
      result.findings.every(
        (finding) =>
          !redactSource(finding.script.source, finding.redactions).includes('local-fixture'),
      ),
    ).toBe(true);
  });

  it('preserves source length and line positions while masking a credential', () => {
    const source = 'one\r\nsecret\nthree';
    const masked = redactSource(source, [{ start: 5, end: 11 }]);
    expect(masked.length).toBe(source.length);
    expect(masked).toBe('one\r\n******\nthree');
  });
});
