import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAiReview } from '../src/hooks/use-ai-review';
import type { IAiReview, IAiReviewRequest, IAiSettings } from '../src/types/ai';
import { reviewForm } from '../src/utils/ai/review-form';

vi.mock('../src/utils/ai/review-form', () => ({ reviewForm: vi.fn() }));
const mockReview = vi.mocked(reviewForm);
const request: IAiReviewRequest = {
  payload: '{}',
  targets: [],
  redactionCount: 0,
  wasTruncated: false,
  omittedTargets: 0,
};
const settings: IAiSettings = {
  provider: 'openai',
  apiKey: 'private-key-fixture',
  endpoint: 'https://provider.example.com',
  model: 'test-model',
};
const review: IAiReview = { summary: 'Current form review.', improvements: [], edgeCases: [] };

const deferReview = (): { promise: Promise<IAiReview>; resolve: (value: IAiReview) => void } => {
  let resolve!: (value: IAiReview) => void;
  const promise = new Promise<IAiReview>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AI review lifecycle', () => {
  it('does not request anything until explicitly generated', async () => {
    mockReview.mockResolvedValue(review);
    const { result } = renderHook(() => useAiReview(request, settings));
    expect(mockReview).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.generate();
    });
    expect(result.current.result).toEqual(review);
    expect(result.current.isLoading).toBe(false);
  });

  it('ignores late provider results after cancellation', async () => {
    const deferred = deferReview();
    mockReview.mockReturnValue(deferred.promise);
    const { result } = renderHook(() => useAiReview(request, settings));
    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.generate();
    });
    expect(result.current.isLoading).toBe(true);
    act(() => result.current.cancel());
    expect(mockReview.mock.calls[0]?.[2]?.aborted).toBe(true);
    await act(async () => {
      deferred.resolve(review);
      await pending;
    });
    expect(result.current.result).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('aborts when context changes and does not show a review for the old form', async () => {
    const deferred = deferReview();
    mockReview.mockReturnValue(deferred.promise);
    const { result, rerender } = renderHook(({ context }) => useAiReview(context, settings), {
      initialProps: { context: request },
    });
    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.generate();
    });
    rerender({ context: { ...request, payload: '{"new":true}' } });
    expect(mockReview.mock.calls[0]?.[2]?.aborted).toBe(true);
    await act(async () => {
      deferred.resolve(review);
      await pending;
    });
    expect(result.current.result).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('invalidates a completed review when the provider changes or the key is cleared', async () => {
    mockReview.mockResolvedValue(review);
    const { result, rerender } = renderHook(({ config }) => useAiReview(request, config), {
      initialProps: { config: settings },
    });
    await act(async () => {
      await result.current.generate();
    });
    rerender({ config: { ...settings, apiKey: '' } });
    expect(result.current.result).toBeUndefined();
  });

  it('masks the current API key if a provider includes it in an error', async () => {
    mockReview.mockRejectedValue(new Error(`Invalid key: ${settings.apiKey}`));
    const { result } = renderHook(() => useAiReview(request, settings));
    await act(async () => {
      await result.current.generate();
    });
    expect(result.current.error).toBe('Invalid key: [REDACTED]');
  });
});
