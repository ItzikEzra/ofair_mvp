
import React, { createContext, useContext, useCallback, useState, useEffect } from "react";
import { useAuthState } from "./useAuthState";
import { useLogout } from "./useLogout";
import { getProfessionalData } from "@/utils/storageUtils";
import { AuthState, UserProfile } from "./types";
import { AuthService } from "@/services/authService";

const AuthContext = createContext<AuthState>({
  isLoggedIn: null,
  isLoading: true,
  professionalData: null,
  userProfile: null,
  userRole: null,
  logout: async () => {},
  refreshProfessionalData: async () => false,
  refreshUserProfile: async () => false,
  setIsLoggedIn: () => {},
  isProfessional: () => false,
  isAdmin: () => false,
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

  // Role and profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Load user profile and role when authentication state changes
  useEffect(() => {
    const loadUserProfile = async () => {
      if (isLoggedIn) {
        try {
          const profile = await AuthService.getUserProfile();
          const role = await AuthService.getUserRole();
          setUserProfile(profile);
          setUserRole(role);
        } catch (error) {
          console.error("Failed to load user profile:", error);
        }
      } else {
        setUserProfile(null);
        setUserRole(null);
      }
    };

    loadUserProfile();
  }, [isLoggedIn]);
  
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

  const refreshUserProfile = useCallback(async (): Promise<boolean> => {
    try {
      const profile = await AuthService.getUserProfile();
      const role = await AuthService.getUserRole();

      if (profile && role) {
        setUserProfile(profile);
        setUserRole(role);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error refreshing user profile:", error);
      return false;
    }
  }, []);

  const isProfessional = useCallback((): boolean => {
    return userRole === 'professional';
  }, [userRole]);

  const isAdmin = useCallback((): boolean => {
    return userRole === 'admin';
  }, [userRole]);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isLoading,
        professionalData,
        userProfile,
        userRole,
        logout,
        refreshProfessionalData,
        refreshUserProfile,
        setIsLoggedIn,
        isProfessional,
        isAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
