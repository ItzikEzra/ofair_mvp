
import { useState, useEffect } from "react";

interface WorkArea {
  value: string;
  label: string;
}

// Work areas data with Hebrew values and labels
const mockWorkAreas: WorkArea[] = [
  { value: "צפון", label: "צפון" },
  { value: "חיפה והסביבה", label: "חיפה והסביבה" },
  { value: "מרכז", label: "מרכז" },
  { value: "ירושלים והסביבה", label: "ירושלים והסביבה" },
  { value: "דרום", label: "דרום" }
];

export const useWorkAreas = () => {
  const [workAreas, setWorkAreas] = useState<WorkArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchWorkAreas = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setWorkAreas(mockWorkAreas);
      } catch (err) {
        console.error("Error fetching work areas:", err);
        setError("שגיאה בטעינת אזורי עבודה");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkAreas();
  }, []);

  return { workAreas, isLoading, error };
};
