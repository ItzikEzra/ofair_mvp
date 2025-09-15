
import { useAnnouncementFilterHierarchy } from "./useAnnouncementFilterHierarchy";
import { useAnnouncementData } from "./useAnnouncementData";

interface UseAnnouncementsWithDistanceProps {
  filters: {
    city: string;
    distance: string;
    category: string;
    areaRestriction?: string[];
    latitude?: number;
    longitude?: number;
    cityLatitude?: number;
    cityLongitude?: number;
  };
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

export const useAnnouncementsWithDistance = ({ 
  filters, 
  userLocation 
}: UseAnnouncementsWithDistanceProps) => {
  const { filteringMode, requestBody } = useAnnouncementFilterHierarchy({
    filters,
    userLocation
  });

  const { announcements, isLoading, error } = useAnnouncementData({
    requestBody,
    filteringMode,
    category: filters.category
  });

  return { announcements, isLoading, error };
};
