import { describe, expect, it } from 'vitest';
import type { ReviewRule } from '../src/types/review';
import { analyzeScript } from '../src/utils/review/analyze-script';

const review = (source: string, path = 'onBeforeSubmit'): ReturnType<typeof analyzeScript> =>
  analyzeScript({ id: 'script', label: 'Before submit', path, source });
const count = (source: string, rule: ReviewRule, path?: string): number => {
  const result = review(source, path);
  expect(result.complete).toBe(true);
  return result.findings.filter((finding) => finding.rule === rule).length;
};

describe('failure handler review', () => {
  it.each([
    'try { work(); } catch (error) {}',
    'try { work(); } catch {}',
    'try { work(); } catch (error) { console.error(error); }',
    'http.post("/save").catch(error => {});',
    'http.post("/save").catch(error => console.error(error));',
    'http.post("/save").then(success, error => { console.warn(error); });',
    'http.post("/save").catch(onFailure); function onFailure(error) { console.error(error); }',
    'const onFailure = error => { console.error(error); }; http.post("/save").catch(onFailure);',
  ])('identifies an empty or logging-only failure handler: %s', (source) => {
    expect(count(source, 'error-handling')).toBe(1);
  });

  it.each([
    'try { work(); } catch (error) { throw error; }',
    'try { work(); } catch (error) { message.error("Unable to save"); }',
    'http.post("/save").catch(error => { console.error(error); return fallback; });',
    'http.post("/save").catch(() => undefined);',
    'const console = data.logger; try { work(); } catch (error) { console.error(error); }',
    'http.post("/save").catch((console) => { console.error("Local handler"); });',
  ])(
    'does not treat recovery, feedback, rethrows or a local logger as console-only handling: %s',
    (source) => {
      expect(count(source, 'error-handling')).toBe(0);
    },
  );
});

describe('promise rejection review', () => {
  it.each([
    'http.get("/data");',
    'fetch("/data").then(success);',
    'Promise.reject(error);',
    'new Promise((resolve, reject) => reject(error));',
    'void http.post("/save");',
    'const request = http.post("/save");',
    'async function load() { return data; } load();',
    'http.post("/save").catch(error => { throw error; });',
    'http.get("/data").then(success, undefined);',
    'http.get("/data").then(success, false);',
    'http.post("/save").catch(error => Promise.reject(error));',
    '(function () { return http.post("/save"); })();',
    'console.log(http.get("/data"));',
  ])('identifies a detached known promise: %s', (source) => {
    expect(count(source, 'unhandled-promise')).toBe(1);
  });

  it.each([
    'await http.get("/data");',
    'return http.get("/data");',
    'http.get("/data").then(success).catch(onFailure);',
    'http.get("/data").then(success, onFailure);',
    'const request = http.post("/save"); await request;',
    'const request = http.post("/save"); return request;',
    'const request = http.post("/save"); request.catch(onFailure);',
    'await Promise.all([http.post("/one"), http.post("/two")]);',
    'return Promise.allSettled([fetch("/data")]);',
    'return new Promise((resolve, reject) => { http.get("/data").then(resolve).catch(reject); });',
    'function save(http) { http.post("/save"); }',
    'const fetch = data.loader; fetch("/data");',
    'transferToOwner(http.get("/data"));',
  ])('recognises ownership, rejection handling and unknown consumers: %s', (source) => {
    expect(count(source, 'unhandled-promise')).toBe(0);
  });
});

describe('completion-sensitive lifecycle requests', () => {
  it.each([
    'http.put("/save", data);',
    'http.put("/save", data).then(success).catch(onFailure);',
    'const pending = http.put("/save", data); pending.catch(onFailure);',
    '(function () { http.put("/save", data).catch(onFailure); })();',
    '(function () { return http.put("/save", data).catch(onFailure); })();',
    '(async function () { await http.put("/save", data); })();',
    'console.log(http.put("/save", data));',
  ])('identifies a request that the hook does not wait for: %s', (source) => {
    expect(
      count(
        source,
        'async-completion',
        'steps[id="one"].beforeNextActionConfiguration.actionArguments.expression',
      ),
    ).toBe(1);
  });

  it.each([
    'return http.put("/save", data).catch(onFailure);',
    'await http.put("/save", data);',
    'const pending = http.put("/save", data); return pending;',
    'await Promise.all([http.put("/save", data)]);',
    'return new Promise((resolve, reject) => { http.put("/save", data).then(resolve).catch(reject); });',
    'function saveLater() { http.put("/save", data).catch(onFailure); }',
    'return (function () { return http.put("/save", data).catch(onFailure); })();',
    'await (async function () { await http.put("/save", data); })();',
  ])(
    'does not guess completion ownership through ordinary callbacks or manual Promise executors: %s',
    (source) => {
      expect(count(source, 'async-completion')).toBe(0);
    },
  );

  it('does not assume an ordinary action or custom hook blocks navigation', () => {
    expect(
      count(
        'http.put("/save", data).catch(onFailure);',
        'async-completion',
        'actionConfiguration.actionArguments.expression',
      ),
    ).toBe(0);
  });
});

describe('partially guarded optional access', () => {
  it.each([
    'return data?.npo.type;',
    'return data?.npo.type.name;',
    'return (data?.npo).type;',
    'return data?.items[0].name;',
  ])('identifies an unguarded intermediate value: %s', (source) => {
    expect(count(source, 'unsafe-access')).toBe(1);
  });

  it.each([
    'return data?.npo?.type;',
    'return data.npo.type;',
    'if (data?.npo) { return data?.npo.type; }',
    'return data?.npo && data?.npo.type;',
    'if (!data?.npo) return; return data?.npo.type;',
    'if (data?.npo != null) return data?.npo.type;',
    'return data?.npo ? data?.npo.type : "";',
    'return !data?.npo || data?.npo.type;',
    'return (data?.npo ?? {}).type;',
  ])('recognises simple guards and does not lint every regular property read: %s', (source) => {
    expect(count(source, 'unsafe-access')).toBe(0);
  });
});

describe('Shesha syntax contexts', () => {
  it('does not accept top-level await in a known synchronous visibility condition', () => {
    const result = review('return await http.get("/visible");', 'customVisibility');
    expect(result.complete).toBe(false);
    expect(result.findings).toMatchObject([{ rule: 'syntax-error' }]);
    expect(result.findings[0]?.message).toContain('sync function body');
  });

  it.each([
    'formSettings.onAfterDataLoad',
    'onBeforeSubmit',
    'steps[id="one"].beforeDoneActionConfiguration.actionArguments.expression',
  ])('accepts await in a known async field: %s', (path) => {
    expect(review('return await http.get("/data");', path).complete).toBe(true);
  });

  it('remains permissive for an unknown custom editor rather than inventing its contract', () => {
    expect(review('return await http.get("/data");', 'customEditor').complete).toBe(true);
  });
});
