
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getProfessionalData, getAuthToken } from "@/utils/storageUtils";

export const useProposalHandler = (
  announcementId: string, 
  announcementType: 'lead' | 'request', 
  announcementTitle: string, 
  announcementBudget?: number
) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);

  console.log("useProposalHandler initialized:", { 
    announcementId, 
    announcementType,
    announcementTitle,
    announcementBudget
  });

  const handleOpenProposalDialog = async () => {
    console.log("Opening proposal dialog");
    
    // Verify authentication before opening dialog
    try {
      setIsCheckingAuth(true);
      // First check if we have stored professional data (for OTP auth flow)
      const storedProfessionalData = getProfessionalData();
      
      if (storedProfessionalData?.id) {
        console.log("Found stored professional data:", storedProfessionalData.id);
        setProposalDialogOpen(true);
        return;
      }
      
      // Fall back to session check
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session && !storedProfessionalData?.id) {
        toast({
          title: "התחברות נדרשת",
          description: "יש להתחבר למערכת כדי להגיש הצעת מחיר",
          variant: "destructive",
        });
        
        // Store the current URL so we can redirect back after login
        sessionStorage.setItem('redirectAfterAuth', window.location.pathname);
        
        // Navigate with window.location to prevent any React state issues
        window.location.href = '/auth';
        return;
      }
      
      setProposalDialogOpen(true);
    } catch (error) {
      console.error("Error checking authentication:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בבדיקת החיבור, נסה שנית",
        variant: "destructive",
      });
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleSubmitProposal = async (
    price: string, 
    description: string, 
    completionDate: string,
    sampleImageUrl?: string,
    lowerPriceOption?: {willing: boolean, price: string}
  ) => {
    try {
      console.log("Submitting proposal:", { price, description, completionDate, sampleImageUrl });
      setIsSubmitting(true);
      
      // Try to get professional ID from storage first (for OTP flow)
      const storedProfessionalData = getProfessionalData();
      let professionalId = storedProfessionalData?.id;
      
      // If not found in storage, try to get from session
      if (!professionalId) {
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData.session) {
          toast({
            title: "שגיאת התחברות",
            description: "יש צורך להתחבר מחדש",
            variant: "destructive",
          });
          return false;
        }
        
        // Get professional data from database
        const { data: professionalData, error: profileError } = await supabase
          .from('professionals')
          .select('id')
          .eq('user_id', sessionData.session.user.id as any)
          .maybeSingle();
          
        if (profileError) {
          console.error("Error fetching professional data:", profileError);
          toast({
            title: "שגיאה",
            description: "לא ניתן למצוא את פרטי בעל המקצוע",
            variant: "destructive",
          });
          return false;
        }
        
        professionalId = professionalData && 'id' in professionalData ? professionalData.id : null;
      }

      // Try using secure function first (for better OTP support)
      try {
        const authToken = getAuthToken();
        const { data: proposalId, error: secureError } = await supabase.rpc('submit_proposal_secure', {
          p_lead_id: announcementId,
          p_price: parseFloat(price),
          p_description: description,
          p_estimated_completion: completionDate,
          p_sample_image_url: sampleImageUrl,
          p_lower_price_willing: lowerPriceOption?.willing || false,
          p_lower_price_value: lowerPriceOption?.price ? parseFloat(lowerPriceOption.price) : null,
          token_param: authToken || null
        });

        if (secureError) {
          throw secureError;
        }

        if (proposalId) {
          // Success with secure function
          toast({
            title: "ההצעה נשלחה בהצלחה",
            description: "הצעת המחיר שלך נשמרה בהצלחה",
          });
          
          setProposalDialogOpen(false);
          
          // Trigger a custom event to refresh proposals data
          window.dispatchEvent(new CustomEvent('proposalSubmitted', { 
            detail: { proposalId, type: 'lead' } 
          }));
          
          // Navigate using client-side routing to avoid full page reload
          setTimeout(() => {
            const currentPath = window.location.pathname;
            const newUrl = `/my-jobs?tab=proposals&proposalId=${proposalId}`;
            
            if (currentPath.includes('my-jobs')) {
              // Already on my-jobs page, just update URL params
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'proposals');
              url.searchParams.set('proposalId', proposalId);
              window.history.pushState({}, '', url.toString());
            } else {
              // Navigate to my-jobs page
              window.history.pushState({}, '', newUrl);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }, 100);
          
          return true;
        }
      } catch (secureError) {
        console.error("Secure function failed, trying edge function:", secureError);
        
        // Fallback to edge function
        const { error } = await supabase.functions.invoke('submit-proposal', {
          body: {
            professionalId,
            announcementId,
            announcementType,
            price,
            description,
            estimatedCompletion: completionDate,
            sampleImageUrl,
            lowerPriceOption
          }
        });
        
        if (error) {
          console.error("Error submitting proposal:", error);
          toast({
            title: "שגיאת שרת",
            description: `אירעה שגיאה בעת שמירת ההצעה: ${error.message}`,
            variant: "destructive",
          });
          return false;
        }
        
        // Success with edge function
        toast({
          title: "ההצעה נשלחה בהצלחה",
          description: "הצעת המחיר שלך נשמרה בהצלחה",
        });
        
        setProposalDialogOpen(false);
        
        // Trigger event and navigate using client-side routing
        window.dispatchEvent(new CustomEvent('proposalSubmitted', { 
          detail: { type: 'lead' } 
        }));
        
        setTimeout(() => {
          const currentPath = window.location.pathname;
          const newUrl = '/my-jobs?tab=proposals';
          
          if (currentPath.includes('my-jobs')) {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', 'proposals');
            window.history.pushState({}, '', url.toString());
          } else {
            window.history.pushState({}, '', newUrl);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }, 100);
        
        return true;
      }
    } catch (err) {
      console.error("Unexpected error submitting proposal:", err);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בלתי צפויה",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { 
    handleSubmitProposal,
    handleOpenProposalDialog,
    proposalDialogOpen,
    setProposalDialogOpen,
    isSubmitting,
    isCheckingAuth,
    announcementId,
    announcementType,
    announcementTitle,
    announcementBudget
  };
};
