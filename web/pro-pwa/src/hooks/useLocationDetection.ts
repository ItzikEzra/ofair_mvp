
import { useState } from "react";

export const useLocationDetection = () => {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Helper: Reverse geocode lat/lng -> city
  const fetchCityFromCoords = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=he`
      );
      if (!response.ok) return null;
      const data = await response.json();
      // Look for city, town, or village in OSM address object
      return (
        data?.address?.city ||
        data?.address?.town ||
        data?.address?.village ||
        data?.address?.municipality ||
        data?.address?.county ||
        null
      );
    } catch (err) {
      return null;
    }
  };

  const detectLocation = async (onLocationFound: (city: string, lat: number, lng: number) => void) => {
    setGeoError(null);
    setGeoLoading(true);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setGeoLoading(false);
          const { latitude, longitude } = pos.coords;
          const city = await fetchCityFromCoords(latitude, longitude);

          if (city) {
            onLocationFound(city, latitude, longitude);
            setGeoError(null);
          } else {
            setGeoError("נמצא מיקום אך לא הצלחנו לאתר את שם העיר.");
          }
        },
        () => {
          setGeoLoading(false);
          setGeoError("לא הצלחנו לאתר את המיקום, אפשר למלא עיר ידנית.");
        }
      );
    } else {
      setGeoLoading(false);
      setGeoError("הדפדפן שלך לא תומך בקבלת מיקום גיאוגרפי.");
    }
  };

  return {
    geoLoading,
    geoError,
    detectLocation
  };
};
