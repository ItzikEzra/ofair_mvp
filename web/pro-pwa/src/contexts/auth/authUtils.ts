
import { supabase } from "@/integrations/supabase/client";
import { Professional } from "@/types/profile";
import { getProfessionalData, saveProfessionalData, clearProfessionalData } from "@/utils/storageUtils";

/**
 * Clears all authentication-related timeouts
 */
export const clearAuthTimeouts = (timeoutsRef: React.MutableRefObject<ReturnType<typeof setTimeout>[]>) => {
  timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
  timeoutsRef.current = [];
};

/**
 * Refreshes professional data from storage
 */
export const refreshProfessionalDataFromStorage = async (): Promise<Professional | null> => {
  try {
    const data = getProfessionalData();
    
    if (!data?.id) {
      console.log("No professional data found during refresh");
      return null;
    }

    console.log("Refreshed professional data:", data.name);
    return data;
  } catch (error) {
    console.error("Error refreshing professional data:", error);
    return null;
  }
};

/**
 * Checks if the user is authenticated by getting the current session
 */
export const checkAuthSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const storedProfessionalData = getProfessionalData();
  
  console.log("Auth check - session exists:", !!session?.user);
  console.log("Auth check - professionalData exists:", !!storedProfessionalData?.id);
  
  return { session, storedProfessionalData };
};
