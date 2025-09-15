
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { debugLog } from "@/utils/debugLogger";
import { validateCoordinates } from "@/utils/coordinateValidation";

interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface LocationError {
  code: number;
  message: string;
}

const LOCATION_CACHE_DURATION = 10 * 60 * 1000; // 10 דקות (הוגדל מ-5)
const GPS_TIMEOUT = 15000; // 15 שניות (הוגדל מ-10)
const STORAGE_KEY = 'userLocation_v2'; // גרסה חדשה של המפתח

export const useLocationWithCache = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LocationError | null>(null);
  const { toast } = useToast();

  const getCachedLocation = useCallback((): LocationData | null => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;
    
    try {
      const locationData: LocationData = JSON.parse(cached);
      
      // Validate coordinates
      const validation = validateCoordinates(locationData.latitude, locationData.longitude);
      if (!validation.isValid) {
        debugLog.warn('Invalid cached coordinates, clearing cache', validation.error);
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      const isExpired = Date.now() - locationData.timestamp > LOCATION_CACHE_DURATION;
      if (isExpired) {
        debugLog.info('Cached location expired');
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      debugLog.info('Using valid cached location', { 
        age: Math.round((Date.now() - locationData.timestamp) / 1000),
        coordinates: { lat: locationData.latitude, lng: locationData.longitude }
      });
      return locationData;
    } catch (error) {
      debugLog.error('Failed to parse cached location', error);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }, []);

  const cacheLocation = useCallback((locationData: LocationData) => {
    const validation = validateCoordinates(locationData.latitude, locationData.longitude);
    if (validation.isValid) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(locationData));
      debugLog.success('Location cached successfully');
    } else {
      debugLog.error('Cannot cache invalid coordinates', validation.error);
    }
  }, []);

  const getCurrentLocation = useCallback(() => {
    debugLog.location("Requesting current location");
    
    // בדיקה אם יש מיקום cached תקף
    const cached = getCachedLocation();
    if (cached) {
      setLocation(cached);
      return Promise.resolve(cached);
    }

    if (!navigator.geolocation) {
      const errorMsg = "Geolocation is not supported by this browser";
      setError({ code: 0, message: errorMsg });
      toast({
        title: "שגיאה",
        description: "הדפדפן שלך לא תומך במיקום GPS",
        variant: "destructive"
      });
      return Promise.reject(new Error(errorMsg));
    }

    setIsLoading(true);
    setError(null);

    return new Promise<LocationData>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = position.coords;
          debugLog.location("GPS position received", {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy
          });
          
          const locationData: LocationData = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            timestamp: Date.now()
          };
          
          // Validate coordinates before caching
          const validation = validateCoordinates(locationData.latitude, locationData.longitude);
          if (!validation.isValid) {
            debugLog.error("Invalid GPS coordinates received", validation.error);
            setIsLoading(false);
            reject(new Error("Invalid coordinates received"));
            return;
          }
          
          setLocation(locationData);
          cacheLocation(locationData);
          setIsLoading(false);
          
          toast({
            title: "מיקום נמצא",
            description: "המיקום שלך התקבל בהצלחה"
          });
          
          resolve(locationData);
        },
        (error) => {
          debugLog.error("Geolocation error", { code: error.code, message: error.message });
          setIsLoading(false);
          
          let message = "לא ניתן לקבל מיקום";
          switch (error.code) {
            case 1:
              message = "הגישה למיקום נדחתה. אנא אפשר גישה למיקום בהגדרות הדפדפן";
              break;
            case 2:
              message = "המיקום לא זמין כרגע";
              break;
            case 3:
              message = "תם הזמן המוקצב לקבלת המיקום";
              break;
          }
          
          const locationError = { code: error.code, message };
          setError(locationError);
          
          toast({
            title: "שגיאת מיקום",
            description: message,
            variant: "destructive"
          });
          
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: GPS_TIMEOUT,
          maximumAge: LOCATION_CACHE_DURATION
        }
      );
    });
  }, [getCachedLocation, cacheLocation, toast]);

  const clearLocation = useCallback(() => {
    debugLog.info("Clearing location cache");
    setLocation(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // טעינת מיקום cached בעת האתחול
  useEffect(() => {
    const cached = getCachedLocation();
    if (cached) {
      setLocation(cached);
    }
  }, [getCachedLocation]);

  return {
    location,
    isLoading,
    error,
    getCurrentLocation,
    clearLocation,
    hasLocation: !!location
  };
};
