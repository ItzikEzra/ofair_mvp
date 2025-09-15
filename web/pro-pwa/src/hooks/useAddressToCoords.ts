
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { debugLog } from "@/utils/debugLogger";

interface Coordinates {
  lat: number;
  lng: number;
  formatted_address?: string;
}

// Cache for geocoding results
const geocodingCache = new Map<string, { result: Coordinates | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useAddressToCoords = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const getCoordinates = useCallback(async (address: string): Promise<Coordinates | null> => {
    if (!address.trim()) {
      return null;
    }

    const normalizedAddress = address.trim().toLowerCase();
    
    // Check cache first
    const cached = geocodingCache.get(normalizedAddress);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      debugLog.info(`Using cached geocoding result for: ${address}`, cached.result);
      return cached.result;
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    
    try {
      debugLog.info(`Geocoding request for: ${address}`);
      
      const { data, error } = await supabase.functions.invoke('google-geocoding', {
        body: { 
          action: 'forward',
          address: address.trim()
        }
      });

      if (error) {
        debugLog.error("Geocoding error:", error);
        toast({
          title: "שגיאה בחיפוש מיקום",
          description: "לא הצלחנו לאתר את הכתובת. אנא בדוק שהכתובת נכונה ונסה שוב.",
          variant: "destructive"
        });
        geocodingCache.set(normalizedAddress, { result: null, timestamp: Date.now() });
        return null;
      }

      if (data?.results && data.results.length > 0) {
        const result = data.results[0];
        
        // Validate coordinates before returning
        const lat = result.geometry?.location?.lat;
        const lng = result.geometry?.location?.lng;
        
        if (typeof lat === 'number' && typeof lng === 'number' && 
            lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          const coordinates = {
            lat,
            lng,
            formatted_address: result.formatted_address
          };
          debugLog.success("Geocoding successful:", coordinates);
          
          // Cache the result
          geocodingCache.set(normalizedAddress, { result: coordinates, timestamp: Date.now() });
          return coordinates;
        } else {
          debugLog.error("Invalid coordinates from geocoding:", { lat, lng });
          toast({
            title: "שגיאה במיקום",
            description: "הכתובת נמצאה אך המיקום לא תקין. אנא נסה כתובת אחרת.",
            variant: "destructive"
          });
          geocodingCache.set(normalizedAddress, { result: null, timestamp: Date.now() });
          return null;
        }
      }

      toast({
        title: "כתובת לא נמצאה",
        description: "לא הצלחנו למצוא את הכתובת. אנא בדוק את השם ונסה שוב.",
        variant: "destructive"
      });
      geocodingCache.set(normalizedAddress, { result: null, timestamp: Date.now() });
      return null;
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        debugLog.info("Geocoding request was cancelled");
        return null;
      }
      
      debugLog.error("Geocoding exception:", err);
      toast({
        title: "שגיאה טכנית",
        description: "בעיה בקבלת מיקום מדויק עבור הכתובת. אנא נסה שוב מאוחר יותר.",
        variant: "destructive"
      });
      geocodingCache.set(normalizedAddress, { result: null, timestamp: Date.now() });
      return null;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [toast]);

  return {
    getCoordinates,
    isLoading
  };
};
