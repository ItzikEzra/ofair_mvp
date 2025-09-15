
import { useState, useEffect } from "react";
import { SecureProfileService } from "@/services/secureProfileService";

export const useProfessionalAreas = () => {
  const [areas, setAreas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchProfessionalAreas = async () => {
      try {
        const { data, error } = await SecureProfileService.getOwnProfile();
        
        if (error) {
          console.error("Error fetching professional areas:", error);
          setError("שגיאה בטעינת אזורי עבודה");
          setAreas([]);
          setIsLoading(false);
          return;
        }

        if (data && data.areas) {
          // המרת הערכים הישנים לחדשים
          const areasList = data.areas.split(',').map((area: string) => area.trim());
          const mappedAreas = areasList.map((area: string) => mapOldAreaToNew(area));
          setAreas(mappedAreas.filter((area: string | null) => area !== null));
        } else {
          setAreas([]);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("שגיאה בטעינת אזורי עבודה");
        setAreas([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfessionalAreas();
  }, []);

  return { areas, isLoading, error };
};

// מיפוי ערכים ישנים לחדשים
const mapOldAreaToNew = (oldArea: string): string | null => {
  const mapping: { [key: string]: string } = {
    'north': 'צפון',
    'south': 'דרום', 
    'center': 'מרכז',
    'samaria': 'יהודה ושומרון',
    'jerusalem': 'ירושלים',
    'eilat': 'דרום',
    'lowlands': 'מרכז',
    'sharon': 'מרכז'
  };

  return mapping[oldArea] || oldArea;
};
