
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Globe } from "lucide-react";
import AnnouncementCard from "../AnnouncementCard";
import { Announcement } from "@/types/announcements";

interface AnnouncementsListProps {
  announcements: Announcement[];
  isLoading: boolean;
  currentFilteringMode: string;
  filters: {
    distance: string;
    city: string;
  };
  showExpandButton: boolean;
  onExpandToAllCountry: () => void;
  getFilteringStatusMessage: () => string;
}

export const AnnouncementsList = ({
  announcements,
  isLoading,
  currentFilteringMode,
  filters,
  showExpandButton,
  onExpandToAllCountry,
  getFilteringStatusMessage
}: AnnouncementsListProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-ofair-blue" />
          <p className="text-gray-600">טוען מודעות...</p>
          {currentFilteringMode === "city_distance" && (
            <p className="text-sm text-gray-500 mt-2">מחשב מרחקים לפי המיקום שלך</p>
          )}
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600 mb-2">לא נמצאו מודעות התואמות לקריטריונים</p>
        {currentFilteringMode === "city_distance" ? (
          <div className="text-sm text-gray-500 space-y-1">
            <p>לא נמצאו מודעות ברדיוס {filters.distance} ק"מ מ{filters.city}</p>
            <p>נסה להרחיב את רדיוס החיפוש או לבחור עיר אחרת</p>
          </div>
        ) : currentFilteringMode === "city_only" ? (
          <div className="text-sm text-gray-500 space-y-1">
            <p>לא נמצאו מודעות בעיר {filters.city}</p>
            <p>נסה לבחור עיר אחרת או להוסיף חיפוש לפי מרחק</p>
          </div>
        ) : currentFilteringMode === "work_areas" ? (
          <div className="text-sm text-gray-500 space-y-1">
            <p>לא נמצאו מודעות באזורי העבודה שלך</p>
            {showExpandButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExpandToAllCountry}
                className="mt-2"
              >
                <Globe size={14} className="ml-1" />
                הרחב חיפוש לכל הארץ
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">נסה לשנות את הפילטרים או להשתמש ב"קרוב אלי" כדי למצוא עבודות באזור שלך</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <AnnouncementCard 
          key={announcement.id} 
          announcement={announcement}
        />
      ))}
      
      {/* סטטיסטיקה */}
      <div className="text-center text-sm text-gray-500 mt-4">
        {getFilteringStatusMessage()} • מוצגות {announcements.length} מודעות
      </div>
    </div>
  );
};
