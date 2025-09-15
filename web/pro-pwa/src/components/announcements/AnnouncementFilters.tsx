
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { CityFilter } from "./filters/CityFilter";
import { DistanceFilter } from "./filters/DistanceFilter";
import { CategoryFilter } from "./filters/CategoryFilter";

interface FilterProps {
  filters: {
    city: string;
    distance: string;
    category: string;
    expandToAllCountry?: boolean;
    latitude?: number | null;
    longitude?: number | null;
  };
  onFilterChange: (filters: {
    city: string;
    distance: string;
    category: string;
    expandToAllCountry?: boolean;
    latitude?: number | null;
    longitude?: number | null;
  }) => void;
  onClose: () => void;
}

const AnnouncementFilters = ({ filters, onFilterChange, onClose }: FilterProps) => {
  const initialFilters = {
    ...filters,
    category: filters.category === "" ? "all" : filters.category,
    latitude: filters.latitude ?? null,
    longitude: filters.longitude ?? null,
    expandToAllCountry: filters.expandToAllCountry ?? false,
  };
  
  const [tempFilters, setTempFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetFilters = () => {
    const resetFilters = {
      city: "",
      distance: "50",
      category: "all",
      latitude: null,
      longitude: null,
      expandToAllCountry: false
    };
    setTempFilters(resetFilters);
    onFilterChange({
      ...resetFilters,
      category: ""
    });
  };

  const handleApplyFilters = () => {
    setIsLoading(true);
    console.log("Applying filters:", tempFilters);
    
    const filtersToApply = {
      ...tempFilters,
      category: tempFilters.category === "all" ? "" : tempFilters.category,
      latitude: tempFilters.latitude,
      longitude: tempFilters.longitude,
      expandToAllCountry: tempFilters.expandToAllCountry
    };
    
    console.log("Final filters being sent:", filtersToApply);
    
    setTimeout(() => {
      onFilterChange(filtersToApply);
      setIsLoading(false);
      onClose();
    }, 300);
  };

  const handleCityChange = (city: string, latitude?: number, longitude?: number) => {
    console.log("City changed:", { city, latitude, longitude });
    setTempFilters({ 
      ...tempFilters, 
      city,
      latitude: latitude ?? null,
      longitude: longitude ?? null
    });
  };

  const handleDistanceChange = (distance: string) => {
    console.log("Distance changed:", distance);
    setTempFilters({ ...tempFilters, distance });
  };

  const handleCategoryChange = (category: string) => {
    console.log("Category changed:", category);
    setTempFilters({ ...tempFilters, category });
  };

  const hasLocationData = tempFilters.latitude && tempFilters.longitude;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4 relative">
      <div className="absolute top-3 left-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="h-8 w-8"
        >
          <X size={16} />
        </Button>
      </div>
      
      <h3 className="font-medium mb-3 text-lg">סינון מודעות</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <CityFilter 
          value={tempFilters.city} 
          onChange={handleCityChange}
        />
        
        <DistanceFilter 
          value={tempFilters.distance} 
          onChange={handleDistanceChange}
        />
        
        <CategoryFilter 
          value={tempFilters.category} 
          onChange={handleCategoryChange}
        />
      </div>
      
      {hasLocationData && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          ✓ חיפוש לפי מיקום מדויק - תוצאות יוצגו לפי מרחק
          <div className="text-xs mt-1 text-green-600">
            קואורדינטות: {tempFilters.latitude?.toFixed(4)}, {tempFilters.longitude?.toFixed(4)}
          </div>
        </div>
      )}
      
      <div className="flex justify-between mt-4">
        <Button 
          variant="outline" 
          onClick={handleResetFilters}
          disabled={isLoading}
        >
          נקה הכל
        </Button>
        <Button 
          onClick={handleApplyFilters} 
          className="bg-ofair-blue hover:bg-ofair-blue/80"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              מחפש...
            </>
          ) : (
            "החל סינון"
          )}
        </Button>
      </div>
    </div>
  );
};

export default AnnouncementFilters;
