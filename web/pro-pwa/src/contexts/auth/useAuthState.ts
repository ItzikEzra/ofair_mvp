
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getProfessionalData, clearProfessionalData, getAuthToken } from "@/utils/storageUtils";
import AuthService from "@/services/authService";
import UsersService from "@/services/usersService";

export const useAuthState = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [professionalData, setProfessionalData] = useState(null);

  useEffect(() => {
    console.log("[CUSTOM AUTH DEBUG] Starting authentication check with custom tokens");

    const checkAuth = async (retryCount = 0) => {
      let scheduledRetry = false;
      
      try {
        // Add small delay to allow localStorage to be fully written after login
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const storedProfessionalData = getProfessionalData();
        const authToken = getAuthToken();

        console.log("[CUSTOM AUTH DEBUG] Stored professional data exists:", !!storedProfessionalData?.id);
        console.log("[CUSTOM AUTH DEBUG] Auth token exists:", !!authToken);

        // Only authenticated if BOTH professional data AND valid token exist
        if (storedProfessionalData?.id && storedProfessionalData.phone_number && authToken) {
          // Set token in AuthService
          AuthService.setToken(authToken);

          // Validate token with FastAPI Auth Service
          try {
            const validation = await AuthService.validateToken(authToken);

            if (!validation.valid) {
              console.log("[FASTAPI AUTH DEBUG] Token validation failed: Invalid token");

              // If this is a fresh login attempt (retry = 0), try once more
              if (retryCount === 0) {
                console.log("[FASTAPI AUTH DEBUG] Retrying token validation in 300ms...");
                scheduledRetry = true;
                setTimeout(() => checkAuth(1), 300);
                return;
              }

              setIsLoggedIn(false);
              setProfessionalData(null);
              clearProfessionalData();
              AuthService.clearAuth();
            } else {
              console.log("[FASTAPI AUTH DEBUG] Token valid, user authenticated");

              // Try to refresh professional data from Users Service
              try {
                const freshProfessionalData = await UsersService.getMyProfessionalProfile();
                console.log("[FASTAPI AUTH DEBUG] Fresh professional data retrieved");
                setIsLoggedIn(true);
                setProfessionalData(freshProfessionalData);
              } catch (profileError) {
                console.warn("[FASTAPI AUTH DEBUG] Could not fetch fresh profile, using cached data:", profileError);
                // Fall back to cached data
                setIsLoggedIn(true);
                setProfessionalData(storedProfessionalData);
              }
            }
          } catch (validationError) {
            console.error("[FASTAPI AUTH DEBUG] Token validation error:", validationError);

            // Retry logic for network errors
            if (retryCount === 0) {
              console.log("[FASTAPI AUTH DEBUG] Retrying after validation error...");
              scheduledRetry = true;
              setTimeout(() => checkAuth(1), 500);
              return;
            }

            setIsLoggedIn(false);
            setProfessionalData(null);
            clearProfessionalData();
            AuthService.clearAuth();
          }
        } else {
          console.log("[CUSTOM AUTH DEBUG] Missing professional data or token, clearing auth");
          setIsLoggedIn(false);
          setProfessionalData(null);
          
          // Only clear if we actually had some data - avoid clearing on fresh page load
          if (storedProfessionalData || authToken) {
            clearProfessionalData();
          }
        }
      } catch (err) {
        console.error("[CUSTOM AUTH DEBUG] Error checking auth:", err);
        setIsLoggedIn(false);
        setProfessionalData(null);
        clearProfessionalData();
      } finally {
        // Set loading to false if no retry was scheduled
        if (!scheduledRetry) {
          setIsLoading(false);
          console.log("[CUSTOM AUTH DEBUG] Authentication check completed");
        }
      }
    };

    checkAuth();

    // Set up localStorage listener for auth state changes (when user logs out from another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'professional_data' || e.key === null) {
        console.log("[CUSTOM AUTH DEBUG] Storage change detected, rechecking auth");
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate, toast]);

  return {
    isLoggedIn,
    setIsLoggedIn,
    isLoading,
    professionalData,
    setProfessionalData,
  };
};
