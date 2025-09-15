
import { useState, useEffect } from "react";
import { DirectInquiryType } from "@/types/jobs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useDirectInquiries(professionalId: string | null) {
  const { toast } = useToast();
  const [directInquiries, setDirectInquiries] = useState<DirectInquiryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch direct inquiries from referrals
  const fetchDirectInquiries = async () => {
    console.log("[DIRECT_INQUIRIES] === Starting Fetch ===");
    console.log("[DIRECT_INQUIRIES] Professional ID received:", professionalId);
    
    if (!professionalId) {
      console.log("[DIRECT_INQUIRIES] No professional ID provided, setting loading to false");
      setIsLoading(false);
      setDirectInquiries([]);
      setError("לא נמצא מזהה מקצועי");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("[DIRECT_INQUIRIES] Calling get-referrals function...");
      
      const { data, error } = await supabase.functions.invoke('get-referrals', {
        body: { professionalId },
      });
      
      console.log("[DIRECT_INQUIRIES] Response received");
        
      if (error) {
        console.error("[DIRECT_INQUIRIES] Error from Edge Function:", error);
        const errorMessage = `שגיאה בטעינת פניות ישירות: ${error.message || 'שגיאה לא ידועה'}`;
        setError(errorMessage);
        toast({
          title: "שגיאה בטעינת פניות ישירות",
          description: errorMessage,
          variant: "destructive"
        });
        setDirectInquiries([]);
        return;
      }
      
      if (data && Array.isArray(data)) {
        console.log(`[DIRECT_INQUIRIES] Processing ${data.length} referrals`);
        setDirectInquiries(data);
        setError(null);
        
        if (data.length === 0) {
          setError("לא נמצאו פניות ישירות למקצועי זה");
        }
      } else if (data === null || data === undefined) {
        console.log("[DIRECT_INQUIRIES] Data is null/undefined, setting empty array");
        setDirectInquiries([]);
        setError("לא התקבלו נתונים מהשרת");
      } else {
        console.log("[DIRECT_INQUIRIES] Invalid data format received");
        setDirectInquiries([]);
        setError("פורמט נתונים לא תקין");
      }
    } catch (err) {
      console.error("[DIRECT_INQUIRIES] Unexpected error:", err);
      const errorMessage = `שגיאה בלתי צפויה: ${err.message}`;
      setError(errorMessage);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בלתי צפויה בטעינת הפניות",
        variant: "destructive"
      });
      setDirectInquiries([]);
    } finally {
      console.log("[DIRECT_INQUIRIES] Fetch complete");
      setIsLoading(false);
    }
  };

  // Manual refresh function
  const refreshInquiries = () => {
    console.log("[DIRECT_INQUIRIES] Manual refresh triggered");
    fetchDirectInquiries();
  };

  // Initial fetch when professionalId changes
  useEffect(() => {
    console.log("[DIRECT_INQUIRIES] Effect triggered - Professional ID:", professionalId);
    fetchDirectInquiries();
  }, [professionalId]);

  // Set up real-time subscription for new referrals
  useEffect(() => {
    if (!professionalId) return;

    console.log("[DIRECT_INQUIRIES] Setting up real-time subscription");
    
    const channel = supabase
      .channel('referrals-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referrals',
          filter: `professional_id=eq.${professionalId}`
        },
        (payload) => {
          console.log("[DIRECT_INQUIRIES] New referral via real-time:", payload.new);
          
          // Show immediate notification
          toast({
            title: "פנייה ישירה חדשה!",
            description: `קיבלת פנייה ישירה חדשה עבור ${payload.new.profession || 'שירות'}`,
            duration: 5000,
          });
          
          // Refresh the data after a short delay
          setTimeout(() => {
            fetchDirectInquiries();
          }, 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'referrals',
          filter: `professional_id=eq.${professionalId}`
        },
        (payload) => {
          console.log("[DIRECT_INQUIRIES] Referral updated via real-time");
          fetchDirectInquiries();
        }
      )
      .subscribe((status) => {
        console.log("[DIRECT_INQUIRIES] Real-time subscription status:", status);
      });

    return () => {
      console.log("[DIRECT_INQUIRIES] Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [professionalId, toast]);

  return { 
    directInquiries, 
    setDirectInquiries, 
    isLoading, 
    error,
    refreshInquiries 
  };
}
