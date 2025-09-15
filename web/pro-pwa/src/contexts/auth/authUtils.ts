
import { Professional } from "@/types/profile";
import { getProfessionalData, saveProfessionalData, clearProfessionalData, getAuthToken } from "@/utils/storageUtils";
import { AuthService } from "@/services/authService";

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
 * Checks if the user is authenticated using microservices token validation
 */
export const checkAuthSession = async () => {
  const token = getAuthToken();
  const storedProfessionalData = getProfessionalData();

  console.log("Auth check - token exists:", !!token);
  console.log("Auth check - professionalData exists:", !!storedProfessionalData?.id);

  // If we have both token and professional data, consider authenticated
  const isAuthenticated = !!(token && storedProfessionalData?.id);

  // Return session-like structure for compatibility
  return {
    session: isAuthenticated ? { user: { id: storedProfessionalData.id } } : null,
    storedProfessionalData
  };
};
