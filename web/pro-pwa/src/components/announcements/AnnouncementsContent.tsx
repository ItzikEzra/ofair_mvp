
import React from "react";
import { Announcement } from "@/types/announcements";
import AnnouncementCard from "./AnnouncementCard";
import { RefreshCw, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnnouncementsContentProps {
  announcements: Announcement[];
  isLoading: boolean;
  error: string;
  onActionClick: (path: string) => void;
  filters: {
    city: string;
    distance: string;
    category: string;
  };
}

const AnnouncementsContent: React.FC<AnnouncementsContentProps> = ({
  announcements,
  isLoading,
  error,
  onActionClick,
  filters
}) => {
  // Handle loading state with improved UX
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-ofair-blue" />
          <p className="text-gray-600">טוען מודעות...</p>
          <p className="text-xs text-gray-400 mt-2">
            זה לא אמור לקחת יותר מכמה שניות
          </p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-center bg-red-50 border border-red-100 rounded-lg p-6 max-w-md">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <p className="text-red-800 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="ml-2 h-4 w-4" />
              רענן דף
            </Button>
            <Button onClick={() => onActionClick("/submit-lead")}>
              פרסם הודעה
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle empty state
  if (announcements.length === 0) {
    const isFiltered = filters.city || filters.distance || filters.category;
    
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-center bg-white rounded-lg shadow-sm p-6 max-w-md">
          <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {isFiltered ? "אין תוצאות מתאימות לחיפוש" : "אין מודעות להצגה"}
          </h3>
          <p className="text-gray-600 mb-4">
            {isFiltered 
              ? "נסה לשנות את פרמטרי החיפוש או לחפש מאוחר יותר" 
              : "אין בקשות או לידים זמינים כרגע"}
          </p>
          
          <div className="flex justify-center space-x-2 space-x-reverse">
            {isFiltered && (
              <Button variant="outline" onClick={() => window.location.reload()}>
                נקה סינונים
              </Button>
            )}
            <Button onClick={() => onActionClick("/submit-lead")}>
              פרסם הודעה
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render announcements with modern grid
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 my-6 px-2">
      {announcements.map((announcement) => (
        <div key={announcement.id} className="h-full">
          <AnnouncementCard announcement={announcement} />
        </div>
      ))}
    </div>
  );
};

export default AnnouncementsContent;
