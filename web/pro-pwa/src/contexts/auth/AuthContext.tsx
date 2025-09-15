
import React, { createContext, useContext, useCallback } from "react";
import { useAuthState } from "./useAuthState";
import { useLogout } from "./useLogout";
import { getProfessionalData } from "@/utils/storageUtils";
import { AuthState } from "./types";

const AuthContext = createContext<AuthState>({
  isLoggedIn: null,
  isLoading: true,
  professionalData: null,
  logout: async () => {},
  refreshProfessionalData: async () => false,
  setIsLoggedIn: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    isLoggedIn, 
    setIsLoggedIn, 
    isLoading, 
    professionalData, 
    setProfessionalData
  } = useAuthState();
  
  const { logout } = useLogout();
  
  const refreshProfessionalData = useCallback(async (): Promise<boolean> => {
    try {
      // First check local storage
      const localData = getProfessionalData();
      if (!localData?.id) {
        return false;
      }

      // Fetch fresh data from Users Service
      const freshData = await (await import("@/services/usersService")).UsersService.getMyProfessionalProfile();

      // Update both state and local storage with fresh data
      setProfessionalData(freshData);
      return true;
    } catch (error) {
      console.error("Error in refreshProfessionalData:", error);
      // Fall back to local storage data
      const localData = getProfessionalData();
      if (localData) {
        setProfessionalData(localData);
        return true;
      }
      return false;
    }
  }, [setProfessionalData]);

  return (
    <AuthContext.Provider 
      value={{ 
        isLoggedIn, 
        isLoading, 
        professionalData, 
        logout,
        refreshProfessionalData,
        setIsLoggedIn
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
