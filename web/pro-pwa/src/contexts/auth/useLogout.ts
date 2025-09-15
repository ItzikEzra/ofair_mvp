
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { clearProfessionalData } from "@/utils/storageUtils";
import AuthService from "@/services/authService";

export const useLogout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const logout = async () => {
    setIsLoading(true);
    
    try {
      console.log("Starting logout process");
      
      // Revoke token from FastAPI Auth Service
      await AuthService.revokeToken();

      // Clear all stored professional data
      clearProfessionalData();
      
      toast({
        title: "התנתקות בוצעה בהצלחה",
      });
      
      // Navigate to auth page
      navigate("/auth", { replace: true });
    } catch (error) {
      console.error("Error during logout:", error);
      toast({
        title: "שגיאה בהתנתקות",
        description: "אנא נסה שנית מאוחר יותר",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    logout,
    isLoading
  };
};
