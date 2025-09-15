
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DuplicateProfessionalResult {
  isDuplicate: boolean;
  existingProfessional?: {
    id: string;
    name: string;
    phone_number: string;
    profession: string;
  };
}

export function useDuplicateProfessionalCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkForDuplicate = async (phoneNumber: string): Promise<DuplicateProfessionalResult> => {
    if (!phoneNumber) {
      return { isDuplicate: false };
    }

    setIsChecking(true);
    
    try {
      console.log("Checking for duplicate professional with phone:", phoneNumber);
      
      // Use secure service to check for existing professional
      const { data: responseData, error } = await supabase.functions.invoke('get-professional-by-identifier', {
        body: { 
          identifier: phoneNumber,
          isEmail: false 
        }
      });
      
      const existingProfessional = responseData && !error ? {
        id: responseData.id,
        name: responseData.name, 
        phone_number: responseData.phone_number,
        profession: responseData.profession
      } : null;

      if (error) {
        console.error("Error checking for duplicate professional:", error);
        toast({
          title: "שגיאה בבדיקת כפילויות",
          description: "לא ניתן לבדוק אם המקצועי כבר קיים במערכת",
          variant: "destructive"
        });
        return { isDuplicate: false };
      }

      if (existingProfessional && typeof existingProfessional === 'object') {
        console.log("Found existing professional:", existingProfessional);
        return {
          isDuplicate: true,
          existingProfessional: existingProfessional as any
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error("Unexpected error checking for duplicate:", error);
      toast({
        title: "שגיאה בבדיקת כפילויות",
        description: "אירעה שגיאה לא צפויה",
        variant: "destructive"
      });
      return { isDuplicate: false };
    } finally {
      setIsChecking(false);
    }
  };

  return {
    checkForDuplicate,
    isChecking
  };
}
