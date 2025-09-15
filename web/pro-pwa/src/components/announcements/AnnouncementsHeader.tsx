
import { Button } from "@/components/ui/button";
import { Filter, PlusCircle, MapPin, Globe } from "lucide-react";
import AnnouncementFilters from "./AnnouncementFilters";
import { useNavigate } from "react-router-dom";

interface AnnouncementsHeaderProps {
  filteredAnnouncementsCount: number;
  isFilterOpen: boolean;
  setIsFilterOpen: (isOpen: boolean) => void;
  filters: {
    city: string;
    distance: string;
    category: string;
    expandToAllCountry?: boolean;
  };
  setFilters: (filters: {
    city: string;
    distance: string;
    category: string;
    expandToAllCountry?: boolean;
  }) => void;
  handleActionClick?: (path: string) => void;
  activeTab: string;
  isRestrictedToAreas?: boolean;
  professionalAreas?: string[];
  onExpandToAllCountry?: () => void;
}

const AnnouncementsHeader = ({
  filteredAnnouncementsCount,
  isFilterOpen,
  setIsFilterOpen,
  filters,
  setFilters,
  handleActionClick,
  activeTab,
  isRestrictedToAreas,
  professionalAreas,
  onExpandToAllCountry
}: AnnouncementsHeaderProps) => {
  const navigate = useNavigate();
  
  // Redirect handler - uses provided handleActionClick or navigates directly
  const handleAddClick = () => {
    if (handleActionClick) {
      handleActionClick("/submit-lead");
    } else {
      navigate("/submit-lead");
    }
  };
  
  return (
    <>
      {/* אינדיקציה על סינון לפי אזורים */}
      {isRestrictedToAreas && professionalAreas && professionalAreas.length > 0 && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700 text-sm">
            <MapPin size={16} />
            <span>מציג מודעות מהאזורים שלך: {professionalAreas.join(', ')}</span>
          </div>
          {filteredAnnouncementsCount < 5 && onExpandToAllCountry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExpandToAllCountry}
              className="mt-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-0 h-auto"
            >
              <Globe size={14} className="ml-1" />
              הרחב חיפוש לכל הארץ
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1 w-full sm:w-auto"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter size={14} />
            סינון
          </Button>
          
          <div className="text-sm text-gray-500 sm:hidden">
            {filteredAnnouncementsCount > 0 
              ? `${filteredAnnouncementsCount} מודעות זמינות` 
              : "אין מודעות זמינות כרגע"}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="text-sm text-gray-500 hidden sm:block">
            {filteredAnnouncementsCount > 0 
              ? `${filteredAnnouncementsCount} מודעות זמינות` 
              : "אין מודעות זמינות כרגע"}
          </div>
          
          <Button 
            onClick={handleAddClick}
            className="bg-ofair-blue hover:bg-ofair-blue/80 w-full sm:w-auto"
          >
            <PlusCircle size={16} className="ml-1" />
            פרסם ליד
          </Button>
        </div>
      </div>
      
      {isFilterOpen && (
        <AnnouncementFilters 
          filters={filters} 
          onFilterChange={setFilters} 
          onClose={() => setIsFilterOpen(false)}
        />
      )}
    </>
  );
};

export default AnnouncementsHeader;
