
import React from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LocationButtonProps {
  onLocationFound: (address: string, lat: number, lng: number) => void;
  className?: string;
}

export const LocationButton: React.FC<LocationButtonProps> = ({
  onLocationFound,
  className = ""
}) => {
  const [geoLoading, setGeoLoading] = React.useState(false);

  // Helper function to reverse geocode coordinates to address using Edge Function
  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      console.log("Reverse geocoding coordinates via Edge Function:", { lat, lng });
      
      const { data, error } = await supabase.functions.invoke('google-geocoding', {
        body: { 
          action: 'reverse',
          lat: lat,
          lng: lng
        }
      });

      if (error) {
        console.error("Edge Function error:", error);
        return null;
      }
      
      if (data?.results && data.results.length > 0) {
        const address = data.results[0].formatted_address;
        console.log("Reverse geocoding successful:", address);
        return address;
      }
      
      console.log("No results from reverse geocoding");
      return null;
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return null;
    }
  };

  const handleLocationDetect = async () => {
    console.log("Location detect button clicked");
    
    if (!("geolocation" in navigator)) {
      console.error("Geolocation not supported");
      return;
    }

    setGeoLoading(true);

    try {
      console.log("Getting current position...");
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      console.log("Position obtained:", { latitude, longitude });
      
      const fullAddress = await reverseGeocode(latitude, longitude);
      
      if (fullAddress) {
        console.log("Location found, calling onLocationFound with full address:", { 
          address: fullAddress, 
          latitude, 
          longitude 
        });
        
        // FIXED: Pass the full address instead of extracted city
        onLocationFound(fullAddress, latitude, longitude);
      } else {
        console.error("Could not get address from coordinates");
      }
    } catch (error) {
      console.error("Geolocation error:", error);
    } finally {
      setGeoLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleLocationDetect}
      disabled={geoLoading}
      className={className}
    >
      {geoLoading ? (
        <>
          <Loader2 className="ml-1 h-4 w-4 animate-spin" />
          מאתר...
        </>
      ) : (
        <>
          <MapPin className="ml-1 h-4 w-4" />
          מלא לפי מיקום נוכחי
        </>
      )}
    </Button>
  );
};
