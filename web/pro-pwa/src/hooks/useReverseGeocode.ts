import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';

interface ReverseGeocodeResult {
  address: string;
  city?: string;
}

interface ReverseGeocodeCache {
  [key: string]: {
    result: ReverseGeocodeResult;
    timestamp: number;
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const reverseGeocodeCache: ReverseGeocodeCache = {};

export const useReverseGeocode = () => {
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reverseGeocode = useCallback(async (
    latitude: number,
    longitude: number
  ): Promise<ReverseGeocodeResult | null> => {
    const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    
    // Check cache first
    const cached = reverseGeocodeCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      debugLog.info('Using cached reverse geocode result', cached.result);
      return cached.result;
    }

    // Cancel previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      debugLog.info(`Reverse geocoding coordinates: ${latitude}, ${longitude}`);
      
      const { data, error } = await supabase.functions.invoke('google-geocoding', {
        body: { 
          action: 'reverse',
          lat: latitude,
          lng: longitude
        }
      });

      if (error) {
        debugLog.error('Reverse geocoding function error:', error);
        return null;
      }

      if (!data || !data.results || data.results.length === 0) {
        debugLog.warn('No address found for coordinates');
        return null;
      }

      const result: ReverseGeocodeResult = {
        address: data.results[0].formatted_address,
        city: data.results[0].address_components?.find((comp: any) => 
          comp.types.includes('locality') || comp.types.includes('administrative_area_level_1')
        )?.long_name
      };

      // Cache the result
      reverseGeocodeCache[cacheKey] = {
        result,
        timestamp: Date.now()
      };

      debugLog.success('Reverse geocoding successful:', result);
      return result;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        debugLog.info('Reverse geocoding request was aborted');
        return null;
      }
      debugLog.error('Reverse geocoding failed:', error);
      return null;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  return {
    reverseGeocode,
    isLoading
  };
};