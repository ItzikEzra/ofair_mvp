
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth/AuthContext";
import { debugLog } from "@/utils/debugLogger";

export const useProfessionalId = () => {
  const { professionalData } = useAuth();
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Memoize the professional data ID to prevent unnecessary effects
  const professionalDataId = useMemo(() => professionalData?.id, [professionalData?.id]);

  useEffect(() => {
    const fetchProfessionalId = async () => {
      debugLog.info("Starting professional ID fetch", { hasData: !!professionalDataId });
      
      if (!professionalDataId) {
        debugLog.info("No professional data ID, checking localStorage");
        
        // Check localStorage for professional data
        const storedId = localStorage.getItem("professionalId");
        debugLog.info("Retrieved stored professional ID", { found: !!storedId });
        
        if (storedId) {
          setProfessionalId(storedId);
        } else {
          setProfessionalId(null);
        }
        setIsLoading(false);
        return;
      }

      try {
        debugLog.info("Using professional ID from context", { id: professionalDataId });
        setProfessionalId(professionalDataId);
        
        // Store the professional ID from context
        debugLog.success("Professional ID set from context", { id: professionalDataId });
        
      } catch (err) {
        debugLog.error("Unexpected error:", err);
        setProfessionalId(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfessionalId();
  }, [professionalDataId]);

  // Only log state changes when in debug mode
  debugLog.info("Professional ID state", { 
    professionalId, 
    isLoading, 
    professionalDataId,
    professionalDataName: professionalData?.name 
  });

  return { professionalId, isLoading };
};
