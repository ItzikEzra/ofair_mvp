
import React from "react";
import { Button } from "@/components/ui/button";
import { Globe, MapPin } from "lucide-react";

interface FilterStatusIndicatorProps {
  currentFilteringMode: string;
  filters: {
    distance: string;
    city: string;
  };
  professionalAreas: string[];
  showExpandButton: boolean;
  onExpandToAllCountry: () => void;
}

export const FilterStatusIndicator = ({
  currentFilteringMode,
  filters,
  professionalAreas,
  showExpandButton,
  onExpandToAllCountry
}: FilterStatusIndicatorProps) => {
  const getFilteringStatusMessage = () => {
    switch (currentFilteringMode) {
      case "city_distance":
        return `מציג מודעות ברדיוס ${filters.distance} ק"מ מ${filters.city}`;
      case "city_only":
        return `מציג מודעות מ${filters.city}`;
      case "work_areas":
        return `מציג מודעות מהאזורים שלך: ${professionalAreas.join(', ')}`;
      case "all":
        return "מציג מודעות מכל הארץ";
      default:
        return "מציג מודעות";
    }
  };

  // Show expand button for work_areas mode or when there are few results
  const shouldShowExpandButton = currentFilteringMode === "work_areas" || showExpandButton;

  if (currentFilteringMode === "all") {
    return null;
  }

  return (
    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 text-blue-700 text-sm">
          <MapPin size={16} />
          <span className="break-words">{getFilteringStatusMessage()}</span>
        </div>
        {shouldShowExpandButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExpandToAllCountry}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 text-xs sm:text-sm shrink-0 w-full sm:w-auto justify-center"
          >
            <Globe size={14} className="ml-1" />
            <span className="hidden sm:inline">הרחב חיפוש לכל הארץ</span>
            <span className="sm:hidden">הרחב לכל הארץ</span>
          </Button>
        )}
      </div>
    </div>
  );
};
