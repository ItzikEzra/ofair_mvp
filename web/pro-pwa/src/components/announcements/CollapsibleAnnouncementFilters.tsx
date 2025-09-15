import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { CategoryFilter } from "./filters/CategoryFilter";
import { CityDistanceFilter } from "./filters/CityDistanceFilter";
import { AnnouncementFilters } from "@/types/announcements";
import { Filter, X, RotateCcw, Check, ChevronDown, ChevronUp, Search } from "lucide-react";
interface CollapsibleAnnouncementFiltersProps {
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
const CollapsibleAnnouncementFilters: React.FC<CollapsibleAnnouncementFiltersProps> = ({
  filters,
  onFiltersChange,
  onLocationUpdate,
  onCityCoordinatesUpdate,
  isLoading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
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
    console.log("Location updated in filters:", {
      lat,
      lng
    });
    onLocationUpdate(lat, lng);
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
  return <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2">
          <Filter size={16} />
          סינון
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>

        {hasActiveFilters && !isOpen && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Check size={12} />
            <span className="font-bold">סינון פעיל</span>
          </div>
        )}
      </div>

      {/* Collapsible Filter Content */}
      {isOpen && <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">סינון מודעות</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-8 w-8 p-0">
              <X size={16} />
            </Button>
          </div>
          
          {/* Category Filter */}
          <div>
            <CategoryFilter value={filters.category} onChange={handleCategoryChange} disabled={isLoading} />
          </div>

          {/* City + Distance Filter */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-800 mb-3">חיפוש לפי מיקום ומרחק</h4>
            <CityDistanceFilter city={filters.city} distance={filters.distance} onCityChange={handleCityChange} onDistanceChange={handleDistanceChange} onLocationUpdate={handleLocationUpdate} onCityCoordinatesUpdate={onCityCoordinatesUpdate} disabled={isLoading} />
          </div>

          {/* Filter Actions */}
          <div className="border-t pt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={handleClearAll} disabled={isLoading}>
              <RotateCcw size={16} className="ml-1" />
              נקה הכל
            </Button>
          </div>
        </div>}
    </div>;
};
export default CollapsibleAnnouncementFilters;