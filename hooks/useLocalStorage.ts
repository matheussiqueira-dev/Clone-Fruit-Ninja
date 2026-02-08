import { useEffect, useState } from 'react';

export const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === null) return initialValue;
      return JSON.parse(stored) as T;
    } catch (error) {
      console.warn(`Failed to read localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to write localStorage key "${key}":`, error);
    }
  }, [key, value]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncValue = (event: StorageEvent) => {
      if (event.key !== key) return;
      if (event.newValue === null) {
        setValue(initialValue);
        return;
      }
      try {
        setValue(JSON.parse(event.newValue) as T);
      } catch (error) {
        console.warn(`Failed to sync localStorage key "${key}":`, error);
      }
    };

    window.addEventListener('storage', syncValue);
    return () => window.removeEventListener('storage', syncValue);
  }, [key, initialValue]);

  return [value, setValue] as const;
};
