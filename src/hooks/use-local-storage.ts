import { useCallback, useState } from 'react';

export const useLocalStorage = <T>(
  key: string,
  fallbackValue: T,
): readonly [T, (value: T) => void, () => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) as T : fallbackValue;
    } catch {
      return fallbackValue;
    }
  });

  const setValue = useCallback((value: T): void => {
    setStoredValue(value);
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key]);

  const clearValue = useCallback((): void => {
    setStoredValue(fallbackValue);
    window.localStorage.removeItem(key);
  }, [fallbackValue, key]);

  return [storedValue, setValue, clearValue] as const;
};
