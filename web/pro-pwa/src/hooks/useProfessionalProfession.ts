import { useState, useEffect } from "react";
import { SecureProfileService } from "@/services/secureProfileService";

export const useProfessionalProfession = () => {
  const [profession, setProfession] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchProfessionalProfession = async () => {
      try {
        const { data, error } = await SecureProfileService.getOwnProfile();
        
        if (error) {
          console.error("Error fetching professional profession:", error);
          setError("שגיאה בטעינת מקצוע");
          setProfession("");
          setIsLoading(false);
          return;
        }

        if (data && data.profession) {
          setProfession(data.profession);
        } else {
          setProfession("");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("שגיאה בטעינת מקצוע");
        setProfession("");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfessionalProfession();
  }, []);

  return { profession, isLoading, error };
};