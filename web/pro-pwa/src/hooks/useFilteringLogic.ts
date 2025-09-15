
import { useState, useEffect, useMemo } from "react";
import { AnnouncementFilters } from "@/types/announcements";
import { useProfessionalAreas } from "./useProfessionalAreas";
import { useCitiesByAreas } from "./useCitiesByAreas";
import { useProfessionalProfession } from "./useProfessionalProfession";

export const useFilteringLogic = () => {
  const [filters, setFilters] = useState<AnnouncementFilters>({
    city: "",
    distance: "",
    category: "",
    areaRestriction: []
  });
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | undefined>();
  const [expandToAllCountry, setExpandToAllCountry] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);

  // Get professional's work areas and profession
  const { areas: professionalAreas } = useProfessionalAreas();
  const { cities: areaCities } = useCitiesByAreas(professionalAreas);
  const { profession: professionalProfession } = useProfessionalProfession();

  // Determine current filtering mode
  const currentFilteringMode = useMemo(() => {
    const hasCity = filters.city && filters.city.trim() !== "";
    const hasDistance = filters.distance && filters.distance.trim() !== "";
    const hasUserLocation = userLocation && 
                           typeof userLocation.latitude === "number" && 
                           typeof userLocation.longitude === "number" &&
                           !isNaN(userLocation.latitude) &&
                           !isNaN(userLocation.longitude);
    
    // Check for city coordinates (selected city mode)
    const hasCityCoordinates = filters.cityLatitude !== undefined && 
                              filters.cityLongitude !== undefined && 
                              !isNaN(filters.cityLatitude) &&
                              !isNaN(filters.cityLongitude);
    
    const hasAreaRestrictions = !expandToAllCountry && areaCities.length > 0;


    // Filtering hierarchy:
    // 1. City + Distance with city coordinates (highest priority) - selected city mode
    // 2. User location + Distance - current location mode  
    // 3. City only - city filter without distance
    // 4. Work areas (default) - when no city/distance specified
    // 5. All country - when area restrictions are cleared

    if (hasCity && hasDistance && hasCityCoordinates) {
      return "city_distance_coords";
    } else if (hasDistance && hasUserLocation) {
      // User location + distance takes priority over area restrictions
      return "user_location_distance";
    } else if (hasCity && !hasDistance) {
      return "city_only";
    } else if (hasAreaRestrictions && !hasCity && !hasDistance) {
      return "work_areas";
    } else {
      return "all";
    }
  }, [filters.city, filters.distance, filters.cityLatitude, filters.cityLongitude, userLocation, expandToAllCountry, areaCities.length]);

  // Update filters with area restrictions for default mode
  useEffect(() => {
    if (currentFilteringMode === "work_areas") {
      setFilters(prev => ({
        ...prev,
        areaRestriction: areaCities
      }));
    } else {
      // Clear area restrictions when not in work areas mode
      setFilters(prev => ({
        ...prev,
        areaRestriction: []
      }));
    }
  }, [currentFilteringMode, areaCities]);

  const handleLocationUpdate = (lat: number, lng: number) => {
    setUserLocation({ latitude: lat, longitude: lng });
  };

  const handleCityCoordinatesUpdate = (lat: number, lng: number) => {
    setFilters(prev => ({
      ...prev,
      cityLatitude: lat,
      cityLongitude: lng
    }));
  };

  const handleFiltersChange = (newFilters: AnnouncementFilters) => {
    setFilters(newFilters);
  };

  const handleExpandToAllCountry = () => {
    setExpandToAllCountry(true);
    setShowExpandButton(false);
    setFilters({
      city: "",
      distance: "",
      category: "",
      areaRestriction: []
    });
    setUserLocation(undefined);
  };

  const getFilteringStatusMessage = () => {
    const professionText = professionalProfession && currentFilteringMode !== "all" ? ` במקצוע ${professionalProfession}` : "";
    
    switch (currentFilteringMode) {
      case "city_distance_coords":
        return `מציג מודעות ברדיוס ${filters.distance} ק"מ מ${filters.city}${professionText}`;
      case "user_location_distance":
        return `מציג מודעות ברדיוס ${filters.distance} ק"מ מהמיקום הנוכחי${professionText}`;
      case "city_only":
        return `מציג מודעות מ${filters.city}${professionText}`;
      case "work_areas":
        return `מציג מודעות מהאזורים שלך: ${professionalAreas.join(', ')}${professionText}`;
      case "all":
        return "מציג מודעות מכל הארץ";
      default:
        return `מציג מודעות${professionText}`;
    }
  };

  // Enhanced filters object that includes location data and profession filter
  const enhancedFilters = useMemo(() => {
    const baseFilters = { ...filters };
    
    // Add profession filter by default (except when in "all" mode or when category is explicitly set to empty)
    if (currentFilteringMode !== "all" && professionalProfession && baseFilters.category === undefined) {
      baseFilters.category = professionalProfession;
    }
    
    // Add location data based on filtering mode
    if (currentFilteringMode === "city_distance_coords") {
      // City coordinates are already in filters
      return baseFilters;
    } else if (currentFilteringMode === "user_location_distance" && userLocation) {
      return {
        ...baseFilters,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      };
    }
    
    return baseFilters;
  }, [filters, userLocation, currentFilteringMode, professionalProfession]);

  return {
    filters: enhancedFilters,
    userLocation,
    currentFilteringMode,
    professionalAreas,
    showExpandButton,
    setShowExpandButton,
    handleLocationUpdate,
    handleCityCoordinatesUpdate,
    handleFiltersChange,
    handleExpandToAllCountry,
    getFilteringStatusMessage
  };
};
