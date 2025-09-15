import { useCallback, useRef } from 'react';
import { useAddressToCoords } from './useAddressToCoords';
import { debugLog } from '@/utils/debugLogger';

interface Coordinates {
  lat: number;
  lng: number;
  formatted_address?: string;
}

export const useDebouncedGeocode = (delay: number = 800) => {
  const { getCoordinates, isLoading } = useAddressToCoords();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedGeocode = useCallback(
    (
      address: string,
      onSuccess: (coords: Coordinates) => void,
      onError?: () => void
    ) => {
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Don't geocode empty addresses
      if (!address.trim()) {
        return;
      }

      debugLog.info(`Setting up debounced geocoding for: ${address}`);

      timeoutRef.current = setTimeout(async () => {
        try {
          const coords = await getCoordinates(address);
          if (coords) {
            onSuccess(coords);
          } else {
            onError?.();
          }
        } catch (error) {
          debugLog.error('Debounced geocoding failed:', error);
          onError?.();
        }
      }, delay);
    },
    [getCoordinates, delay]
  );

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    debouncedGeocode,
    isLoading,
    cleanup
  };
};