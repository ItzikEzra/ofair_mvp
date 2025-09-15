import { useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAuthToken, saveAuthToken, clearProfessionalData } from "@/utils/storageUtils";
import { useNavigate } from 'react-router-dom';

export const useTokenManager = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const currentToken = getAuthToken();
      
      if (!currentToken) {
        console.log("No current token to refresh");
        return false;
      }

      const { data, error } = await supabase.functions.invoke('refresh-token', {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });

      if (error || !data?.token) {
        console.error("Token refresh failed:", error);
        return false;
      }

      // Save new token
      saveAuthToken(data.token, data.expiresAt);
      console.log("Token refreshed successfully");
      return true;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return false;
    }
  }, []);

  const handleTokenExpiry = useCallback(() => {
    console.log("Token expired, redirecting to login");
    clearProfessionalData();
    
    toast({
      title: "פגת תוקף הכניסה למערכת",
      description: "יש להתחבר שוב למערכת",
      variant: "destructive"
    });
    
    navigate("/auth", { replace: true });
  }, [toast, navigate]);

  const validateTokenAndRefresh = useCallback(async (): Promise<boolean> => {
    const token = getAuthToken();
    
    if (!token) {
      handleTokenExpiry();
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('validate-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (error || !data?.valid) {
        // Try to refresh token first
        const refreshed = await refreshToken();
        if (!refreshed) {
          handleTokenExpiry();
          return false;
        }
        return true;
      }

      return true;
    } catch (error) {
      console.error("Token validation error:", error);
      handleTokenExpiry();
      return false;
    }
  }, [refreshToken, handleTokenExpiry]);

  return {
    refreshToken,
    handleTokenExpiry,
    validateTokenAndRefresh
  };
};