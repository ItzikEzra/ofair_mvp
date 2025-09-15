import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Loader2, ChevronDown } from "lucide-react";
import { israelCities } from "@/data/israelCities";
import { useLocationWithCache } from "@/hooks/useLocationWithCache";
import { useDebouncedGeocode } from "@/hooks/useDebouncedGeocode";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";

import { debugLog } from "@/utils/debugLogger";
import { validateIsraeliCoordinates } from "@/utils/coordinateValidation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const DISTANCE_OPTIONS = [
  { value: "5", label: "5 ק״מ" },
  { value: "10", label: "10 ק״מ" },
  { value: "25", label: "25 ק״מ" },
  { value: "50", label: "50 ק״מ" },
  { value: "100", label: "100 ק״מ" }
];

type LocationMode = "current" | "city";

interface CityDistanceFilterProps {
  city: string;
  distance: string;
  onCityChange: (city: string) => void;
  onDistanceChange: (distance: string) => void;
  onLocationUpdate: (lat: number, lng: number) => void;
  onCityCoordinatesUpdate: (lat: number, lng: number) => void;
  disabled?: boolean;
}

export const CityDistanceFilter: React.FC<CityDistanceFilterProps> = ({
  city,
  distance,
  onCityChange,
  onDistanceChange,
  onLocationUpdate,
  onCityCoordinatesUpdate,
  disabled = false
}) => {
  const [locationMode, setLocationMode] = useState<LocationMode>("current");
  const [cityOpen, setCityOpen] = useState(false);
  const [distanceOpen, setDistanceOpen] = useState(false);
  const [cityCoordinates, setCityCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [currentLocationAddress, setCurrentLocationAddress] = useState<string>("");
  
  const { 
    location, 
    isLoading: isGettingLocation, 
    error: locationError, 
    getCurrentLocation, 
    clearLocation, 
    hasLocation 
  } = useLocationWithCache();

  const { debouncedGeocode, isLoading: isGettingCityCoords, cleanup } = useDebouncedGeocode(600);
  const { reverseGeocode, isLoading: isReverseGeocoding } = useReverseGeocode();

  // Memoized callback for city coordinates update
  const handleCityCoordinatesSuccess = useCallback((coords: { lat: number; lng: number; formatted_address?: string }) => {
    const validation = validateIsraeliCoordinates(coords.lat, coords.lng);
    if (validation.isValid) {
      debugLog.location(`Valid city coordinates found:`, coords);
      setCityCoordinates({ lat: coords.lat, lng: coords.lng });
      onCityCoordinatesUpdate(coords.lat, coords.lng);
    } else {
      debugLog.error(`Invalid city coordinates for ${city}: ${validation.error}`);
      setCityCoordinates(null);
    }
  }, [onCityCoordinatesUpdate, city]);

  const handleCityCoordinatesError = useCallback(() => {
    debugLog.warn(`Failed to get coordinates for city: ${city}`);
    setCityCoordinates(null);
  }, [city]);

  // Effect to get city coordinates when city changes - now with debouncing
  useEffect(() => {
    if (locationMode === "city" && city && city.trim() !== "") {
      debugLog.location(`Requesting debounced geocoding for: ${city}`);
      debouncedGeocode(
        city + ", ישראל",
        handleCityCoordinatesSuccess,
        handleCityCoordinatesError
      );
    } else {
      setCityCoordinates(null);
      cleanup(); // Cancel pending geocoding request
    }

    return cleanup;
  }, [city, locationMode, debouncedGeocode, handleCityCoordinatesSuccess, handleCityCoordinatesError, cleanup]);

  const handleLocationModeChange = useCallback((mode: LocationMode) => {
    debugLog.filter(`Location mode changed to: ${mode}`);
    setLocationMode(mode);
    
    // Set default distance to 5 km when switching to location mode
    if (!distance) {
      onDistanceChange("5");
    }
    
    if (mode === "current") {
      // Clear city and reset current location state
      onCityChange("");
      setCityCoordinates(null);
      setCurrentLocationAddress(""); // Clear previous address
      cleanup(); // Cancel any pending geocoding
      // Don't automatically use cached location - wait for user to click "Get Current Location"
      clearLocation();
    } else {
      // Clear current location
      clearLocation();
      setCurrentLocationAddress("");
    }
  }, [onCityChange, onDistanceChange, distance, clearLocation, cleanup]);

  const handleGetCurrentLocation = useCallback(async () => {
    try {
      debugLog.location("Getting current location...");
      const locationData = await getCurrentLocation();
      onLocationUpdate(locationData.latitude, locationData.longitude);
      
      // Get the address for the current location
      const addressResult = await reverseGeocode(locationData.latitude, locationData.longitude);
      if (addressResult) {
        setCurrentLocationAddress(addressResult.address);
      }
    } catch (err) {
      debugLog.error("Failed to get current location:", err);
    }
  }, [getCurrentLocation, onLocationUpdate, reverseGeocode]);

  const handleCitySelect = useCallback((selectedCity: string) => {
    debugLog.filter(`City selected: ${selectedCity}`);
    onCityChange(selectedCity);
    setCityOpen(false);
  }, [onCityChange]);

  const handleDistanceChange = useCallback((newDistance: string) => {
    debugLog.filter(`Distance changed to: ${newDistance}`);
    onDistanceChange(newDistance);
    setDistanceOpen(false);
  }, [onDistanceChange]);

  const handleClearAll = useCallback(() => {
    debugLog.filter("Clearing all filters");
    onCityChange("");
    onDistanceChange("");
    clearLocation();
    setCityCoordinates(null);
    setCurrentLocationAddress("");
    setLocationMode("current");
    cleanup(); // Cancel any pending geocoding
  }, [onCityChange, onDistanceChange, clearLocation, cleanup]);

  // Memoized computed values
  const isLocationReady = useMemo(() => 
    locationMode === "current" ? hasLocation : (cityCoordinates !== null),
    [locationMode, hasLocation, cityCoordinates]
  );
  
  const hasActiveSettings = useMemo(() => 
    (locationMode === "current" && hasLocation) || (locationMode === "city" && city),
    [locationMode, hasLocation, city]
  );

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">סוג חיפוש</Label>
        {hasActiveSettings && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-gray-500 hover:text-gray-700"
            disabled={disabled}
          >
            נקה הכל
          </Button>
        )}
      </div>

      {/* Location Mode Selection */}
      <RadioGroup
        value={locationMode}
        onValueChange={handleLocationModeChange}
        className="flex flex-col space-y-2"
        disabled={disabled}
      >
        <div className="flex items-center space-x-2 space-x-reverse">
          <RadioGroupItem value="current" id="current" />
          <Label htmlFor="current" className="flex items-center gap-2 cursor-pointer">
            <Navigation className="h-4 w-4" />
            קרוב אלי (מיקום נוכחי)
          </Label>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <RadioGroupItem value="city" id="city" />
          <Label htmlFor="city" className="flex items-center gap-2 cursor-pointer">
            <MapPin className="h-4 w-4" />
            קרוב לעיר
          </Label>
        </div>
      </RadioGroup>

      {/* Current Location Mode */}
      {locationMode === "current" && (
        <div className="space-y-3">
          <Button
            variant={hasLocation ? "default" : "outline"}
            size="sm"
            onClick={handleGetCurrentLocation}
            disabled={isGettingLocation || disabled}
            className={hasLocation ? "bg-green-600 hover:bg-green-700 text-white" : ""}
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                מאתר מיקום...
              </>
            ) : hasLocation ? (
              <>
                <Navigation className="h-4 w-4 ml-2" />
                מיקום נמצא
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 ml-2" />
                קבל מיקום נוכחי
              </>
            )}
          </Button>

          {locationError && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
              <strong>שגיאת מיקום:</strong> {locationError.message}
            </div>
          )}

          {hasLocation && location && (
            <div className="flex flex-col gap-1">
              <Badge variant="secondary" className="text-xs">
                📍 {currentLocationAddress || "מיקום נוכחי זוהה"}
              </Badge>
              {isReverseGeocoding && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  מאתר כתובת...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* City Mode */}
      {locationMode === "city" && (
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium mb-2 block">בחר עיר</Label>
            <Popover open={cityOpen} onOpenChange={setCityOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={cityOpen}
                  className="w-full justify-between text-right bg-white"
                  disabled={disabled}
                >
                  {city || "בחר עיר"}
                  <ChevronDown size={16} className="ml-2 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command dir="rtl">
                  <CommandInput placeholder="חפש עיר..." />
                  <CommandList>
                    <CommandEmpty>לא נמצאה עיר</CommandEmpty>
                    <CommandGroup>
                      {israelCities.map((cityOption) => (
                        <CommandItem
                          key={cityOption}
                          value={cityOption}
                          onSelect={() => handleCitySelect(cityOption)}
                          className="cursor-pointer hover:bg-gray-100"
                        >
                          {cityOption}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

            {city && (
              <div className="flex items-center gap-2">
                {isGettingCityCoords ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    מאתר מיקום...
                  </div>
                ) : cityCoordinates ? (
                  <Badge variant="secondary" className="text-xs">
                    📍 {city} - מזוהה
                  </Badge>
                ) : null}
              </div>
            )}
        </div>
      )}

      {/* Distance Selection - only when location is ready */}
      {isLocationReady && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">רדיוס חיפוש</Label>
          <Popover open={distanceOpen} onOpenChange={setDistanceOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between text-right bg-white"
                disabled={disabled}
              >
                {DISTANCE_OPTIONS.find(d => d.value === distance)?.label || "בחר מרחק"}
                <MapPin size={16} className="ml-2 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command dir="rtl">
                <CommandList>
                  <CommandGroup>
                    {DISTANCE_OPTIONS.map((distanceOption) => (
                      <CommandItem
                        key={distanceOption.value}
                        value={distanceOption.value}
                        onSelect={() => handleDistanceChange(distanceOption.value)}
                        className="cursor-pointer hover:bg-gray-100"
                      >
                        {distanceOption.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}


      {/* Status Display */}
      {isLocationReady && distance && (
        <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
          <MapPin size={12} />
          <span>
            מחפש ברדיוס {DISTANCE_OPTIONS.find(d => d.value === distance)?.label} מ
            {locationMode === "current" ? "המיקום הנוכחי" : city}
          </span>
        </div>
      )}

    </div>
  );
};