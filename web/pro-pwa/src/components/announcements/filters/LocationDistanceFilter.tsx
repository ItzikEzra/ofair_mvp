
import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Navigation } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useLocationWithCache } from "@/hooks/useLocationWithCache";

const DISTANCE_OPTIONS = [
  { value: "5", label: "5 ק״מ" },
  { value: "10", label: "10 ק״מ" },
  { value: "25", label: "25 ק״מ" },
  { value: "50", label: "50 ק״מ" },
  { value: "100", label: "100 ק״מ" }
];

interface LocationDistanceFilterProps {
  distance: string;
  onDistanceChange: (distance: string) => void;
  onLocationUpdate: (lat: number, lng: number) => void;
  disabled?: boolean;
}

export const LocationDistanceFilter: React.FC<LocationDistanceFilterProps> = ({
  distance,
  onDistanceChange,
  onLocationUpdate,
  disabled = false
}) => {
  const { 
    location, 
    isLoading, 
    error, 
    getCurrentLocation, 
    clearLocation, 
    hasLocation 
  } = useLocationWithCache();

  const handleGetLocation = async () => {
    try {
      console.log("Getting location...");
      const locationData = await getCurrentLocation();
      console.log("Location received:", locationData);
      onLocationUpdate(locationData.latitude, locationData.longitude);
    } catch (err) {
      console.error("Failed to get location:", err);
    }
  };

  const handleClearLocation = () => {
    console.log("Clearing location and distance");
    clearLocation();
    onDistanceChange("");
  };

  const handleDistanceChange = (newDistance: string) => {
    console.log("Distance changed to:", newDistance);
    onDistanceChange(newDistance);
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      {/* כפתור קבלת מיקום */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={hasLocation ? "default" : "outline"}
            size="sm"
            onClick={handleGetLocation}
            disabled={isLoading || disabled}
            className={hasLocation ? "bg-green-600 hover:bg-green-700 text-white" : ""}
          >
            {isLoading ? (
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
                קרוב אלי
              </>
            )}
          </Button>

          {hasLocation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearLocation}
              className="text-gray-500 hover:text-gray-700"
              disabled={disabled}
            >
              נקה
            </Button>
          )}
        </div>
        
        {hasLocation && location && (
          <Badge variant="secondary" className="text-xs">
            📍 מיקום פעיל
          </Badge>
        )}
      </div>

      {/* הצגת שגיאה */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
          <strong>שגיאת מיקום:</strong> {error.message}
        </div>
      )}

      {/* בחירת רדיוס - רק כשיש מיקום */}
      {hasLocation && (
        <div className="space-y-2">
          <Label htmlFor="distance-filter" className="text-sm font-medium">
            רדיוס חיפוש
          </Label>
          <Popover>
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
            <PopoverContent className="w-[200px] p-0" align="start">
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

      {/* סטטוס מיקום ומרחק */}
      {hasLocation && distance && (
        <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
          <MapPin size={12} />
          <span>
            מחפש ברדיוס {DISTANCE_OPTIONS.find(d => d.value === distance)?.label} מהמיקום שלך
          </span>
        </div>
      )}

      {/* Debug info - remove in production */}
      {hasLocation && location && (
        <div className="text-xs text-gray-400 font-mono">
          Debug: Lat {location.latitude.toFixed(4)}, Lng {location.longitude.toFixed(4)}
        </div>
      )}
    </div>
  );
};
