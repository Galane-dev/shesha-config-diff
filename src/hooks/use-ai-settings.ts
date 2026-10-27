import { useCallback, useEffect, useState } from 'react';
import { AI_PROVIDERS, DEFAULT_AI_SETTINGS } from '../constants/ai-providers';
import { AI_SETTINGS_STORAGE_KEY } from '../constants/app';
import type { IAiPreferences, IAiSettings } from '../types/ai';

const readPreferences = (): IAiPreferences => {
  let saved: unknown;

  try {
    saved = JSON.parse(window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY) ?? 'null') as unknown;
  } catch {
    saved = null;
  }

  const values = typeof saved === 'object' && saved !== null && !Array.isArray(saved)
    ? saved as Record<string, unknown>
    : {};
  const provider = AI_PROVIDERS.find((item) => item.id === values.provider);

  return {
    endpoint: typeof values.endpoint === 'string' ? values.endpoint : DEFAULT_AI_SETTINGS.endpoint,
    model: typeof values.model === 'string' ? values.model : DEFAULT_AI_SETTINGS.model,
    provider: provider?.id ?? DEFAULT_AI_SETTINGS.provider,
  };
};

export const useAiSettings = (): readonly [IAiSettings, (settings: IAiSettings) => void, () => void] => {
  const [preferences, setPreferences] = useState(readPreferences);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Browser storage may be unavailable; settings still work in memory.
    }
  }, [preferences]);

  const saveSettings = useCallback((settings: IAiSettings): void => {
    setApiKey(settings.apiKey);
    setPreferences({
      endpoint: settings.endpoint,
      model: settings.model,
      provider: settings.provider,
    });
  }, []);

  const clearKey = useCallback((): void => setApiKey(''), []);

  return [{ ...preferences, apiKey }, saveSettings, clearKey] as const;
};
