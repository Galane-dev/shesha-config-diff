import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiProviderId, IAiReviewRequest, IAiSettings } from '../src/types/ai';
import { reviewForm } from '../src/utils/ai/review-form';

const request: IAiReviewRequest = {
  payload: '{"latestForm":{}}',
  targets: [],
  redactionCount: 0,
  wasTruncated: false,
  omittedTargets: 0,
};
const review = { summary: 'No changes.', improvements: [], edgeCases: [] };
const settings: IAiSettings = {
  provider: 'openai',
  apiKey: 'local-api-fixture',
  endpoint: 'https://provider.example.com',
  model: 'test-model',
};
const responses: Record<AiProviderId, object> = {
  openai: { output: [{ content: [{ type: 'output_text', text: JSON.stringify(review) }] }] },
  anthropic: { content: [{ type: 'text', text: JSON.stringify(review) }] },
  gemini: { candidates: [{ content: { parts: [{ text: JSON.stringify(review) }] } }] },
  'openai-compatible': { choices: [{ message: { content: JSON.stringify(review) } }] },
};

afterEach(() => vi.unstubAllGlobals());

describe('AI provider review requests', () => {
  it.each<AiProviderId>(['openai', 'anthropic', 'gemini', 'openai-compatible'])(
    'uses the same structured review contract for %s',
    async (provider) => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(JSON.stringify(responses[provider])));
      vi.stubGlobal('fetch', fetchMock);
      const controller = new AbortController();
      expect(await reviewForm(request, { ...settings, provider }, controller.signal)).toEqual(
        review,
      );
      const call = fetchMock.mock.calls[0];
      expect(call?.[1]?.signal).toBe(controller.signal);
      expect(call?.[1]?.body).toContain('latestForm');
      expect(call?.[1]?.body).toContain('UNTRUSTED DATA');
      expect(call?.[1]?.body).not.toContain(settings.apiKey);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('does not request OpenAI storage', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responses.openai)));
    vi.stubGlobal('fetch', fetchMock);
    await reviewForm(request, settings);
    expect(fetchMock.mock.calls[0]?.[1]?.body).toContain('"store":false');
  });

  it('reports provider errors without retrying automatically', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Rate limit reached' } }), { status: 429 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    await expect(reviewForm(request, settings)).rejects.toThrow('Rate limit reached');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('handles network failure and aborted requests distinctly', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Network error')));
    await expect(reviewForm(request, settings)).rejects.toThrow('CORS');
    const controller = new AbortController();
    controller.abort();
    await expect(reviewForm(request, settings, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it.each([
    ['openai', { output: [], status: 'incomplete' }],
    ['anthropic', { content: [], stop_reason: 'max_tokens' }],
    ['gemini', { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }] }],
    ['openai-compatible', { choices: [{ finish_reason: 'length', message: { content: '{}' } }] }],
  ] as const)(
    'does not present truncated %s output as a completed review',
    async (provider, body) => {
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body))),
      );
      await expect(reviewForm(request, { ...settings, provider })).rejects.toThrow(
        'before completing',
      );
    },
  );
});
