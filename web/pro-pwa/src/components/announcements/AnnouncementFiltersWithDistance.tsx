
import React from 'react';
import { Button } from "@/components/ui/button";
import { CategoryFilter } from "./filters/CategoryFilter";
import { CityDistanceFilter } from "./filters/CityDistanceFilter";
import { AnnouncementFilters } from "@/types/announcements";
import { RotateCcw, Check } from "lucide-react";

interface AnnouncementFiltersWithDistanceProps {
  filters: AnnouncementFilters & {
    latitude?: number;
    longitude?: number;
    cityLatitude?: number;
    cityLongitude?: number;
  };
  onFiltersChange: (filters: AnnouncementFilters) => void;
  onLocationUpdate: (lat: number, lng: number) => void;
  onCityCoordinatesUpdate: (lat: number, lng: number) => void;
  isLoading?: boolean;
}

const AnnouncementFiltersWithDistance: React.FC<AnnouncementFiltersWithDistanceProps> = ({
  filters,
  onFiltersChange,
  onLocationUpdate,
  onCityCoordinatesUpdate,
  isLoading = false
}) => {
  const handleCityChange = (city: string) => {
    console.log("City changed to:", city);
    onFiltersChange({
      ...filters,
      city
    });
  };

  const handleDistanceChange = (distance: string) => {
    console.log("Distance changed to:", distance);
    onFiltersChange({
      ...filters,
      distance
    });
  };

  const handleCategoryChange = (category: string) => {
    console.log("Category changed to:", category);
    onFiltersChange({
      ...filters,
      category
    });
  };

  const handleLocationUpdate = (lat: number, lng: number) => {
    console.log("Current location updated in filters:", { lat, lng });
    onLocationUpdate(lat, lng);
  };

  const handleCityCoordinatesUpdate = (lat: number, lng: number) => {
    console.log("City coordinates updated in filters:", { lat, lng });
    onCityCoordinatesUpdate(lat, lng);
  };

  const handleClearAll = () => {
    onFiltersChange({
      city: "",
      distance: "",
      category: "",
      areaRestriction: []
    });
  };

  const hasActiveFilters = filters.city || filters.distance || filters.category;

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">סינון מודעות</h3>
      
      {/* Category Filter */}
      <div>
        <CategoryFilter
          value={filters.category}
          onChange={handleCategoryChange}
          disabled={isLoading}
        />
      </div>

      {/* Combined City + Distance Filter */}
      <div className="border-t pt-4">
        <h4 className="text-md font-medium text-gray-800 mb-3">חיפוש לפי מיקום ומרחק</h4>
        <CityDistanceFilter
          city={filters.city}
          distance={filters.distance}
          onCityChange={handleCityChange}
          onDistanceChange={handleDistanceChange}
          onLocationUpdate={handleLocationUpdate}
          onCityCoordinatesUpdate={handleCityCoordinatesUpdate}
          disabled={isLoading}
        />
      </div>

      {/* Filter Actions */}
      <div className="border-t pt-4 flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          disabled={isLoading || !hasActiveFilters}
        >
          <RotateCcw size={16} className="ml-1" />
          נקה הכל
        </Button>
        
        {hasActiveFilters && (
          <div className="text-xs text-green-600 flex items-center gap-1 px-2">
            <Check size={12} />
            סינון פעיל
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementFiltersWithDistance;
