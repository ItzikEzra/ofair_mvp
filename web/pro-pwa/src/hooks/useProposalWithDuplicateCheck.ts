
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDuplicateProfessionalCheck } from "./useDuplicateProfessionalCheck";

interface ProposalData {
  leadId: string;
  description: string;
  price: number;
  professionalPhone: string;
  professionalName: string;
  profession: string;
  estimatedCompletion?: string;
  lowerPriceWilling?: boolean;
  lowerPriceValue?: number;
  mediaUrls?: string[];
}

export function useProposalWithDuplicateCheck() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { checkForDuplicate } = useDuplicateProfessionalCheck();

  const submitProposal = async (proposalData: ProposalData) => {
    setIsSubmitting(true);
    
    try {
      console.log("Starting proposal submission with duplicate check...");
      
      // בדיקת כפילויות לפי מספר טלפון
      const duplicateResult = await checkForDuplicate(proposalData.professionalPhone);
      
      let professionalId: string;
      
      if (duplicateResult.isDuplicate && duplicateResult.existingProfessional) {
        // שימוש במקצועי הקיים
        professionalId = duplicateResult.existingProfessional.id;
        console.log("Using existing professional:", professionalId);
        
        toast({
          title: "מקצועי קיים נמצא",
          description: `ההצעה תישלח תחת המקצועי הקיים: ${duplicateResult.existingProfessional.name}`,
        });
      } else {
        // יצירת מקצועי חדש
        console.log("Creating new professional...");
        
        const { data: newProfessional, error: professionalError } = await supabase
          .from('professionals')
          .insert({
            name: proposalData.professionalName,
            phone_number: proposalData.professionalPhone,
            profession: proposalData.profession,
            location: 'לא צוין' // ערך ברירת מחדל נדרש
          } as any)
          .select('id')
          .maybeSingle();

        if (professionalError) {
          console.error("Error creating professional:", professionalError);
          throw new Error("שגיאה ביצירת פרופיל המקצועי");
        }

        if (!newProfessional || newProfessional === null || typeof newProfessional !== 'object' || !('id' in newProfessional)) {
          throw new Error("שגיאה ביצירת פרופיל המקצועי");
        }

        professionalId = (newProfessional as any).id;
        console.log("Created new professional:", professionalId);
      }

      // יצירת הצעת המחיר
      console.log("Creating proposal for professional:", professionalId);
      
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          lead_id: proposalData.leadId,
          professional_id: professionalId,
          description: proposalData.description,
          price: proposalData.price,
          estimated_completion: proposalData.estimatedCompletion,
          lower_price_willing: proposalData.lowerPriceWilling,
          lower_price_value: proposalData.lowerPriceValue,
          media_urls: proposalData.mediaUrls,
          status: 'pending'
        } as any)
        .select()
        .maybeSingle();

      if (proposalError) {
        console.error("Error creating proposal:", proposalError);
        throw new Error("שגיאה ביצירת הצעת המחיר");
      }

      if (!proposal || proposal === null || typeof proposal !== 'object' || !('id' in proposal)) {
        throw new Error("שגיאה ביצירת הצעת המחיר");
      }

      console.log("Proposal created successfully:", proposal && typeof proposal === 'object' && 'id' in proposal ? (proposal as any).id : null);
      
      toast({
        title: "הצעת מחיר נשלחה בהצלחה",
        description: "ההצעה נוספה למערכת וממתינה לאישור",
      });

      return proposal;
    } catch (error) {
      console.error("Error in proposal submission:", error);
      
      const errorMessage = error instanceof Error ? error.message : "אירעה שגיאה לא צפויה";
      
      toast({
        title: "שגיאה בשליחת הצעת המחיר",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitProposal,
    isSubmitting
  };
}
