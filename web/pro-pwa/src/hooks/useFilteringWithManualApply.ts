import { useState, useEffect, useMemo } from "react";
import { AnnouncementFilters } from "@/types/announcements";
import { useProfessionalAreas } from "./useProfessionalAreas";
import { useCitiesByAreas } from "./useCitiesByAreas";
import { useProfessionalProfession } from "./useProfessionalProfession";

export const useFilteringWithManualApply = () => {
  const [draftFilters, setDraftFilters] = useState<AnnouncementFilters>({
    city: "",
    distance: "",
    category: "",
    areaRestriction: []
  });
  
  const [appliedFilters, setAppliedFilters] = useState<AnnouncementFilters>({
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

  // Determine current filtering mode for applied filters
  const currentFilteringMode = useMemo(() => {
    const hasCity = appliedFilters.city && appliedFilters.city.trim() !== "";
    const hasDistance = appliedFilters.distance && appliedFilters.distance.trim() !== "";
    const hasUserLocation = userLocation && 
                           typeof userLocation.latitude === "number" && 
                           typeof userLocation.longitude === "number" &&
                           !isNaN(userLocation.latitude) &&
                           !isNaN(userLocation.longitude);
    
    // Check for city coordinates (selected city mode)
    const hasCityCoordinates = appliedFilters.cityLatitude !== undefined && 
                              appliedFilters.cityLongitude !== undefined && 
                              !isNaN(appliedFilters.cityLatitude) &&
                              !isNaN(appliedFilters.cityLongitude);
    
    const hasAreaRestrictions = !expandToAllCountry && areaCities.length > 0;

    // Filtering hierarchy:
    // 1. City + Distance with city coordinates (highest priority) - selected city mode
    // 2. City + Distance with user location - current location mode  
    // 3. City only - city filter without distance
    // 4. Work areas (default) - when no city/distance specified
    // 5. All country - when area restrictions are cleared

    if (hasCity && hasDistance && hasCityCoordinates) {
      return "city_distance_coords";
    } else if (hasCity && hasDistance && hasUserLocation) {
      return "city_distance";
    } else if (hasCity && !hasDistance) {
      return "city_only";
    } else if (hasAreaRestrictions && !hasCity && !hasDistance) {
      return "work_areas";
    } else {
      return "all";
    }
  }, [appliedFilters.city, appliedFilters.distance, appliedFilters.cityLatitude, appliedFilters.cityLongitude, userLocation, expandToAllCountry, areaCities.length]);

  // Check if there are pending changes
  const hasPendingChanges = useMemo(() => {
    return JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);
  }, [draftFilters, appliedFilters]);

  // Update applied filters with area restrictions for default mode
  useEffect(() => {
    if (currentFilteringMode === "work_areas") {
      setAppliedFilters(prev => ({
        ...prev,
        areaRestriction: areaCities
      }));
    } else if (currentFilteringMode !== "city_distance" && currentFilteringMode !== "city_only") {
      // Clear area restrictions when not in work areas mode and not using city filters
      setAppliedFilters(prev => ({
        ...prev,
        areaRestriction: []
      }));
    }
  }, [currentFilteringMode, areaCities]);

  // Initialize draft filters from applied filters
  useEffect(() => {
    setDraftFilters(appliedFilters);
  }, [appliedFilters]);

  const handleLocationUpdate = (lat: number, lng: number) => {
    setUserLocation({ latitude: lat, longitude: lng });
  };

  const handleCityCoordinatesUpdate = (lat: number, lng: number) => {
    setDraftFilters(prev => ({
      ...prev,
      cityLatitude: lat,
      cityLongitude: lng
    }));
  };

  const handleDraftFiltersChange = (newFilters: AnnouncementFilters) => {
    setDraftFilters(newFilters);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
  };

  const resetFilters = () => {
    const resetFilters = {
      city: "",
      distance: "",
      category: "",
      areaRestriction: []
    };
    setDraftFilters(resetFilters);
    setAppliedFilters(resetFilters);
    setUserLocation(undefined);
  };

  const handleExpandToAllCountry = () => {
    setExpandToAllCountry(true);
    setShowExpandButton(false);
    const allCountryFilters = {
      city: "",
      distance: "",
      category: "",
      areaRestriction: []
    };
    setDraftFilters(allCountryFilters);
    setAppliedFilters(allCountryFilters);
    setUserLocation(undefined);
  };

  const getFilteringStatusMessage = () => {
    const professionText = professionalProfession && currentFilteringMode !== "all" ? ` במקצוע ${professionalProfession}` : "";
    
    switch (currentFilteringMode) {
      case "city_distance_coords":
        return `מציג מודעות ברדיוס ${appliedFilters.distance} ק"מ מ${appliedFilters.city}${professionText}`;
      case "city_distance":
        return `מציג מודעות ברדיוס ${appliedFilters.distance} ק"מ מהמיקום הנוכחי${professionText}`;
      case "city_only":
        return `מציג מודעות מ${appliedFilters.city}${professionText}`;
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
    const baseFilters = { ...appliedFilters };
    
    // Add profession filter by default (except when in "all" mode)
    if (currentFilteringMode !== "all" && professionalProfession && !baseFilters.category) {
      baseFilters.category = professionalProfession;
    }
    
    // Add location data based on filtering mode
    if (currentFilteringMode === "city_distance_coords") {
      // City coordinates are already in filters
      return baseFilters;
    } else if (currentFilteringMode === "city_distance" && userLocation) {
      return {
        ...baseFilters,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      };
    }
    
    return baseFilters;
  }, [appliedFilters, userLocation, currentFilteringMode, professionalProfession]);

  return {
    filters: enhancedFilters,
    draftFilters,
    userLocation,
    currentFilteringMode,
    professionalAreas,
    showExpandButton,
    hasPendingChanges,
    setShowExpandButton,
    handleLocationUpdate,
    handleCityCoordinatesUpdate,
    handleDraftFiltersChange,
    applyFilters,
    resetFilters,
    handleExpandToAllCountry,
    getFilteringStatusMessage
  };
};