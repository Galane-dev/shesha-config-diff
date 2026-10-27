import { describe, expect, it } from 'vitest';
import { MAX_REVIEW_SCRIPT_LENGTH } from '../src/constants/review';
import { analyzeScript } from '../src/utils/review/analyze-script';

const analyze = (source: string): ReturnType<typeof analyzeScript> => analyzeScript({ id: 'script', label: 'On load', path: 'onAfterDataLoad', source });

describe('script parsing and console review', () => {
  it('reports console calls with original one-based line and column positions', () => {
    const result = analyze('// comment\r\n  console.log("Ready");\r\nreturn data;');
    expect(result.complete).toBe(true);
    expect(result.findings).toMatchObject([{ rule: 'console-usage', line: 2, column: 3 }]);
  });

  it.each(['log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'dir'])('recognises console.%s', (method) => {
    expect(analyze(`console.${method}("Ready");`).findings).toHaveLength(1);
  });

  it.each(['console["log"]("Ready")', 'console?.log?.("Ready")', 'window.console.log("Ready")', 'globalThis["console"].warn("Ready")', 'self.console.error("Ready")'])(
    'recognises static bracket/optional/global console access: %s', (source) => {
    expect(analyze(source).findings).toHaveLength(1);
  });

  it.each([
    '// console.log(data);\nreturn data;',
    '/* console.error(data); */ return true;',
    'return "console.log(data)";',
    'return /console.log/;',
    'const logger = { log() {} }; logger.log(data);',
    'function run(console) { console.log(data); }',
    'const run = ({ console }) => console.log(data);',
    'const { logger: console } = data; console.log(data);',
    'console.log(data); var console = data.logger;',
    'try {} catch (console) { console.log(data); }',
    'for (const console of data.loggers) { console.log(data); }',
    'function run(window) { window.console.log(data); }',
    'const console = { log() {} }; console.log(data);',
  ])('does not flag comments, text or locally shadowed console objects: %s', (source) => {
    const result = analyze(source);
    expect(result.complete).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('does not let a block-local console hide a global call outside the block', () => {
    const result = analyze('{ const console = data.logger; console.log(data); }\nconsole.log("Ready");');
    expect(result.findings).toMatchObject([{ rule: 'console-usage', line: 2 }]);
  });

  it('accepts Shesha-provided variables, return and await without undefined-variable linting', () => {
    const result = analyze('const result = await http.get(query.url);\nform.setFieldsValue(result.data);\nreturn { data, selectedRow, arguments, globalState, parentFormValues, customContext };');
    expect(result.complete).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it('keeps console.error separate from a thrown exception', () => {
    expect(analyze('throw new Error("Validation failed");').findings).toEqual([]);
    expect(analyze('console.error(error);').findings[0]?.message).toContain('does not itself throw');
  });

  it.each([
    'console.log(data)', 'console.log(arguments)', 'console.table(selectedRow)',
    'console.log(JSON.stringify(data))', 'console.log({ values: data })',
    'console.log(data.emailAddress1)', 'console.log(data?.mobileNumber1)', 'console.log(data["password"])',
    'console.log({ password: value })', 'console.log({ "apiKey": value })',
    'console.log(response.data)', 'console.log("test@example.com")',
  ])('raises one heuristic sensitive-logging finding: %s', (source) => {
    const result = analyze(source);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.rule).toBe('sensitive-logging');
    expect(result.findings[0]?.message).toContain('not proof of disclosure');
  });

  it.each(['console.log("Password updated")', 'console.log(data.status)', 'console.log(response.data.totalCount)', 'console.log(42)'])(
    'does not classify ordinary messages and fields as sensitive: %s', (source) => {
    expect(analyze(source).findings[0]?.rule).toBe('console-usage');
  });

  it('reports malformed code at its original location and does not claim a complete review', () => {
    const result = analyze('return data;\nconst value = ;');
    expect(result.complete).toBe(false);
    expect(result.findings).toMatchObject([{ rule: 'syntax-error', line: 2, column: 15 }]);
  });

  it('never executes submitted scripts', () => {
    expect(analyze('globalThis.__reviewExecuted = true; fetch("https://example.com"); throw new Error("Never run");').complete).toBe(true);
    expect('__reviewExecuted' in globalThis).toBe(false);
  });

  it('does not mistake a large skipped script for a clean review', () => {
    const result = analyze(' '.repeat(MAX_REVIEW_SCRIPT_LENGTH + 1));
    expect(result.complete).toBe(false);
    expect(result.limitation).toContain('review limit');
  });

  it('produces stable statement fingerprints across formatting and line shifts', () => {
    expect(analyze('console.log("Ready");').findings[0]?.fingerprint)
      .toBe(analyze('\n\nconsole.log( "Ready" );').findings[0]?.fingerprint);
    expect(analyze('console.log(10n);').complete).toBe(true);
  });
});
