
import { useState, useEffect } from "react";

// Mock data for Israeli cities by areas since the table doesn't exist in the database
const mockCitiesByArea: Record<string, string[]> = {
  "צפון": ["נהריה", "עכו", "קריית שמונה", "צפת", "טבריה", "נצרת", "עפולה"],
  "חיפה": ["חיפה", "קריית אתא", "קריית ביאליק", "קריית ים", "קריית מוצקין"],
  "מרכז": ["תל אביב", "רמת גן", "פתח תקווה", "רעננה", "כפר סבא", "הרצליה", "ראשון לציון"],
  "ירושלים": ["ירושלים", "בית שמש", "מעלה אדומים"],
  "דרום": ["באר שבע", "אשדוד", "אשקלון", "קריית גת", "אילת", "דימונה"]
};

export const useCitiesByAreas = (areas: string[]) => {
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchCitiesByAreas = async () => {
      if (!areas || areas.length === 0) {
        setCities([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Use mock data since the israeli_settlements table doesn't exist
        const allCities: string[] = [];
        areas.forEach(area => {
          if (mockCitiesByArea[area]) {
            allCities.push(...mockCitiesByArea[area]);
          }
        });
        
        // Remove duplicates
        const uniqueCities = [...new Set(allCities)];
        setCities(uniqueCities);
      } catch (err) {
        console.error("Error fetching cities:", err);
        setError("שגיאה בטעינת ערים");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCitiesByAreas();
  }, [areas]);

  return { cities, isLoading, error };
};
