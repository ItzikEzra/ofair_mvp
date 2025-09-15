
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/utils/storageUtils";
import { useProfessionalId } from "./useProfessionalId";

// Helper function to get current professional ID using secure method
const getCurrentProfessionalId = async () => {
  console.log("Getting current professional ID...");
  
  try {
    const authToken = getAuthToken();
    console.log("Auth token from localStorage:", authToken ? "Present" : "Missing");
    
    if (!authToken) {
      throw new Error("אנא התחבר למערכת להגשת הצעת מחיר");
    }

    // Use the secure RPC function with token parameter
    const { data, error } = await supabase.rpc('get_current_professional_id_secure', {
      token_param: authToken
    });
    
    if (error) {
      console.error("Error calling get_current_professional_id_secure:", error);
      throw new Error("שגיאה בקבלת מזהה המקצועי");
    }
    
    if (!data) {
      console.log("No professional ID returned from RPC");
      throw new Error("לא נמצא פרופיל מקצועי פעיל. אנא התחבר שוב למערכת.");
    }
    
    console.log("Professional ID found via RPC:", data);
    return data;
  } catch (error) {
    console.error("Error in getCurrentProfessionalId:", error);
    throw error;
  }
};

interface ProposalFormData {
  description: string;
  price: string;
  estimatedCompletion: string;
  lowerPriceWilling: boolean;
  lowerPriceValue: string;
  mediaUrls: string[];
  professionalName: string;
  professionalPhone: string;
  profession: string;
  isAnonymous: boolean;
}

export const useProposalForm = (announcementId: string, announcementType: 'lead' | 'request' = 'lead') => {
  const [formData, setFormData] = useState<ProposalFormData>({
    description: "",
    price: "",
    estimatedCompletion: "",
    lowerPriceWilling: false,
    lowerPriceValue: "",
    mediaUrls: [],
    professionalName: "",
    professionalPhone: "",
    profession: "",
    isAnonymous: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { professionalId } = useProfessionalId();

  const updateFormData = (updates: Partial<ProposalFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const submitProposal = async () => {
    // Different validation for requests vs leads
    if (announcementType === 'request') {
      // For requests, only estimated completion is required
      if (!formData.estimatedCompletion) {
        toast({
          title: "שגיאה",
          description: "יש להזין זמן אספקה משוער",
          variant: "destructive"
        });
        return false;
      }
    } else {
      // For leads, all professional details are required
      if (!formData.professionalName || !formData.professionalPhone || !formData.profession) {
        toast({
          title: "שגיאה",
          description: "יש למלא את כל השדות הנדרשים",
          variant: "destructive"
        });
        return false;
      }
    }

    setIsSubmitting(true);

    try {
      let submittedProposalId = null;
      
      if (announcementType === 'request') {
        // Use professional ID from hook
        console.log("=== REQUEST PROPOSAL DEBUG ===");
        console.log("Professional ID from hook:", professionalId);
        console.log("Announcement ID:", announcementId);
        
        if (!professionalId) {
          console.error("No professional ID found in hook");
          throw new Error("לא נמצא פרופיל מקצועי. אנא התחבר שוב למערכת.");
        }

        // Get auth token for request
        const authToken = getAuthToken();
        console.log("Auth token for request:", authToken ? "Present" : "Missing");
        
        if (!authToken) {
          throw new Error("אנא התחבר למערכת להגשת הצעת מחיר");
        }
        console.log("Request body:", {
          request_id: announcementId,
          professional_id: professionalId,
          description: formData.description,
          price: formData.price ? parseFloat(formData.price) : null,
          estimated_time: formData.estimatedCompletion,
          media_urls: formData.mediaUrls
        });

        // For requests, call the submit-quote edge function
        const { data, error } = await supabase.functions.invoke('submit-quote', {
          headers: authToken ? {
            Authorization: `Bearer ${authToken}`
          } : {},
          body: {
            request_id: announcementId,
            professional_id: professionalId,
            description: formData.description,
            price: formData.price ? parseFloat(formData.price) : null,
            estimated_time: formData.estimatedCompletion,
            media_urls: formData.mediaUrls
          }
        });

        if (error) {
          console.error("Error submitting request proposal:", error);
          throw new Error("שגיאה בשליחת הצעת המחיר");
        }

        console.log("Request proposal submitted successfully:", data);
        submittedProposalId = data;
      } else {
        // For leads, use secure RPC function
        const authToken = getAuthToken();
        if (!authToken) {
          throw new Error("אנא התחבר למערכת להגשת הצעת מחיר");
        }

        // Use secure lead proposal submission
        const { data, error } = await supabase.functions.invoke('submit-lead-proposal', {
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          body: {
            lead_id: announcementId,
            professional_name: formData.professionalName,
            professional_phone: formData.professionalPhone,
            profession: formData.profession,
            description: formData.description,
            price: parseFloat(formData.price),
            estimated_completion: formData.estimatedCompletion,
            lower_price_willing: formData.lowerPriceWilling,
            lower_price_value: formData.lowerPriceValue ? parseFloat(formData.lowerPriceValue) : null,
            media_urls: formData.mediaUrls
          }
        });

        if (error) {
          console.error("Error submitting lead proposal:", error);
          throw new Error("שגיאה בשליחת הצעת המחיר");
        }

        console.log("Lead proposal submitted successfully:", data);
        submittedProposalId = data?.proposal_id;
      }

      toast({
        title: "הצעת מחיר נשלחה בהצלחה",
        description: "ההצעה נוספה למערכת וממתינה לאישור",
      });

      // Trigger custom event to refresh data
      const event = new CustomEvent('proposalSubmitted', { 
        detail: { proposalId: submittedProposalId, type: announcementType } 
      });
      window.dispatchEvent(event);

      return true;
    } catch (error) {
      console.error("Error in proposal submission:", error);
      
      const errorMessage = error instanceof Error ? error.message : "אירעה שגיאה לא צפויה";
      
      toast({
        title: "שגיאה בשליחת הצעת המחיר",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    isSubmitting,
    updateFormData,
    submitProposal
  };
};
