import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AI_SETTINGS } from '../src/constants/ai-providers';
import { AI_SETTINGS_STORAGE_KEY } from '../src/constants/app';
import { useAiSettings } from '../src/hooks/use-ai-settings';
import type { IAiPreferences, IAiSettings } from '../src/types/ai';

const preferences: IAiPreferences = {
  endpoint: 'https://example.test/ai',
  model: 'test-model',
  provider: 'openai-compatible',
};

const settings: IAiSettings = { ...preferences, apiKey: 'test-api-key' };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('useAiSettings', () => {
  it('keeps a saved key in memory but forgets it on the next mount', () => {
    const { result, unmount } = renderHook(() => useAiSettings());

    act(() => result.current[1](settings));

    expect(result.current[0]).toEqual(settings);
    expect(window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY)).toBe(JSON.stringify(preferences));

    unmount();
    const nextPage = renderHook(() => useAiSettings());

    expect(nextPage.result.current[0]).toEqual({ ...preferences, apiKey: '' });
  });

  it('clears only the active key, preserving saved preferences', () => {
    const { result } = renderHook(() => useAiSettings());

    act(() => result.current[1](settings));
    act(() => result.current[2]());

    expect(result.current[0]).toEqual({ ...preferences, apiKey: '' });
    expect(window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY)).toBe(JSON.stringify(preferences));
  });

  it.each([
    'not-json',
    'null',
    '[]',
    '{"provider":"invalid","endpoint":false,"model":42}',
  ])('safely replaces invalid saved settings: %s', (stored) => {
    window.localStorage.setItem(AI_SETTINGS_STORAGE_KEY, stored);

    const { result } = renderHook(() => useAiSettings());

    expect(result.current[0]).toEqual(DEFAULT_AI_SETTINGS);
    expect(window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY)).not.toContain('apiKey');
  });

  it('remains usable in memory when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    const { result } = renderHook(() => useAiSettings());

    act(() => result.current[1](settings));

    expect(result.current[0]).toEqual(settings);
  });

  it('keeps settings usable in memory when writing preferences fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    const { result } = renderHook(() => useAiSettings());

    act(() => result.current[1](settings));

    expect(result.current[0]).toEqual(settings);
    expect(window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY)).toBeNull();
  });
});
