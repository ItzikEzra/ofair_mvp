
import { useMemo } from "react";

interface FilterHierarchyProps {
  filters: {
    city: string;
    distance: string;
    areaRestriction?: string[];
    latitude?: number;
    longitude?: number;
    cityLatitude?: number;
    cityLongitude?: number;
  };
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

export const useAnnouncementFilterHierarchy = ({ filters, userLocation }: FilterHierarchyProps) => {
  const filteringMode = useMemo(() => {
    const hasCity = filters.city && filters.city.trim() !== "";
    const hasDistance = filters.distance && filters.distance.trim() !== "";
    
    // Check for current location data
    const locationLat = filters.latitude ?? userLocation?.latitude;
    const locationLng = filters.longitude ?? userLocation?.longitude;
    const hasUserLocation = locationLat !== undefined && 
                           locationLng !== undefined && 
                           !isNaN(locationLat) &&
                           !isNaN(locationLng);
    
    // Check for city coordinates (selected city mode)
    const hasCityCoordinates = filters.cityLatitude !== undefined && 
                              filters.cityLongitude !== undefined && 
                              !isNaN(filters.cityLatitude) &&
                              !isNaN(filters.cityLongitude);
    
    const hasAreaRestrictions = filters.areaRestriction && filters.areaRestriction.length > 0;

    // Debug information
    if (hasCity || hasDistance) {
      console.log("🔍 Filter hierarchy debug:", {
        hasCity,
        hasDistance,
        hasUserLocation,
        hasCityCoordinates,
        hasAreaRestrictions,
        locationLat,
        locationLng,
        cityLat: filters.cityLatitude,
        cityLng: filters.cityLongitude,
        userLocation,
        filters
      });
    }

    // Filtering hierarchy:
    // 1. City + Distance with city coordinates (highest priority) - selected city mode
    // 2. User location + Distance (current location mode) - when distance but no city  
    // 3. City + Distance with user location - current location mode with city text
    // 4. City only - city filter without distance
    // 5. Work areas (default) - when no city/distance specified
    // 6. All country - when area restrictions are cleared

    if (hasCity && hasDistance && hasCityCoordinates) {
      return "city_distance_coords";
    } else if (hasDistance && hasUserLocation && !hasCity) {
      return "user_location_distance";
    } else if (hasCity && hasDistance && hasUserLocation) {
      return "city_distance";
    } else if (hasCity && !hasDistance) {
      return "city_only";
    } else if (hasAreaRestrictions) {
      return "work_areas";
    } else {
      return "all";
    }
  }, [filters.city, filters.distance, filters.latitude, filters.longitude, filters.cityLatitude, filters.cityLongitude, userLocation, filters.areaRestriction]);

  const requestBody = useMemo(() => {
    const body: any = {
      category: "",
      filteringMode: filteringMode
    };

    // Add specific parameters based on mode
    switch (filteringMode) {
      case "city_distance_coords":
        body.city = filters.city;
        body.distance = filters.distance;
        // Use city coordinates for distance calculation
        body.latitude = filters.cityLatitude;
        body.longitude = filters.cityLongitude;
        console.log("🎯 City distance coords mode:", {
          city: body.city,
          distance: body.distance,
          lat: body.latitude,
          lng: body.longitude
        });
        break;
        
      case "user_location_distance":
        body.distance = filters.distance;
        // Use user location for distance calculation (no city filter)
        body.latitude = filters.latitude ?? userLocation?.latitude;
        body.longitude = filters.longitude ?? userLocation?.longitude;
        console.log("📍 User location distance mode:", {
          distance: body.distance,
          lat: body.latitude,
          lng: body.longitude,
          userLocation
        });
        break;
        
      case "city_distance":
        body.city = filters.city;
        body.distance = filters.distance;
        // Use location data from filters first, then fallback to userLocation
        body.latitude = filters.latitude ?? userLocation?.latitude;
        body.longitude = filters.longitude ?? userLocation?.longitude;
        console.log("🌍 City distance mode:", {
          city: body.city,
          distance: body.distance,
          lat: body.latitude,
          lng: body.longitude
        });
        break;
      
      case "city_only":
        body.city = filters.city;
        break;
      
      case "work_areas":
        body.areaRestriction = filters.areaRestriction;
        break;
      
      case "all":
        // No additional filters needed
        break;
    }

    return body;
  }, [filteringMode, filters, userLocation]);

  return {
    filteringMode,
    requestBody
  };
};
