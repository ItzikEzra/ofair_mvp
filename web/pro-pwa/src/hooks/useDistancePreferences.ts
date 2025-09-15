import { useState, useEffect } from 'react';

export type DistanceUnit = 'km' | 'm';

interface DistancePreferences {
  unit: DistanceUnit;
  precision: number;
}

const DEFAULT_PREFERENCES: DistancePreferences = {
  unit: 'km',
  precision: 2
};

const STORAGE_KEY = 'distancePreferences';

export const useDistancePreferences = () => {
  const [preferences, setPreferences] = useState<DistancePreferences>(DEFAULT_PREFERENCES);

  // Load preferences on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch (error) {
        console.warn('Failed to parse distance preferences:', error);
      }
    }
  }, []);

  const updateUnit = (unit: DistanceUnit) => {
    const newPreferences = { ...preferences, unit };
    setPreferences(newPreferences);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
  };

  const updatePrecision = (precision: number) => {
    const newPreferences = { ...preferences, precision };
    setPreferences(newPreferences);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    preferences,
    updateUnit,
    updatePrecision,
    resetPreferences
  };
};