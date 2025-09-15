
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useLeadProposals(leadId: string) {
  const [hasProposals, setHasProposals] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [proposalCount, setProposalCount] = useState<number>(0);
  const [proposals, setProposals] = useState<any[]>([]);

  useEffect(() => {
    const checkProposals = async () => {
      if (!leadId) {
        setIsLoading(false);
        return;
      }

      try {
        console.log("Checking proposals for lead:", leadId);
        
        // קבלת כל ההצעות עבור הליד הזה כולל פרטי המקצועיים עם דירוג ועיר
        const { data, error } = await supabase
          .from("proposals")
          .select(`
            id,
            description,
            price,
            status,
            created_at,
            estimated_completion,
            lower_price_willing,
            lower_price_value,
            professional_id,
            professionals!proposals_professional_id_fkey (
              id,
              name,
              phone_number,
              profession,
              location,
              rating,
              review_count
            )
          `)
          .eq("lead_id", leadId as any)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error checking proposals:", error);
          setHasProposals(false);
          setProposalCount(0);
          setProposals([]);
        } else {
          const count = data?.length || 0;
          console.log(`Found ${count} proposals for lead ${leadId}`);
          console.log("Proposals data:", data);
          
          setProposalCount(count);
          setHasProposals(count > 0);
          setProposals(data || []);
          
          // בדיקה אם יש כפילויות פוטנציאליות
          if (data && data.length > 0) {
            const phoneNumbers = data
              .map(p => (p as any).professionals?.phone_number)
              .filter(Boolean);
            
            const uniquePhones = new Set(phoneNumbers);
            
            if (phoneNumbers.length !== uniquePhones.size) {
              console.warn("Potential duplicate professionals detected in proposals");
            }
          }
        }
      } catch (err) {
        console.error("Unexpected error checking proposals:", err);
        setHasProposals(false);
        setProposalCount(0);
        setProposals([]);
      } finally {
        setIsLoading(false);
      }
    };

    checkProposals();
  }, [leadId]);

  const refreshProposals = async () => {
    setIsLoading(true);
    const checkProposals = async () => {
      if (!leadId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("proposals")
          .select(`
            id,
            description,
            price,
            status,
            created_at,
            estimated_completion,
            lower_price_willing,
            lower_price_value,
            professional_id,
            professionals!proposals_professional_id_fkey (
              id,
              name,
              phone_number,
              profession,
              location,
              rating,
              review_count
            )
          `)
          .eq("lead_id", leadId as any)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error refreshing proposals:", error);
        } else {
          const count = data?.length || 0;
          setProposalCount(count);
          setHasProposals(count > 0);
          setProposals(data || []);
        }
      } catch (err) {
        console.error("Unexpected error refreshing proposals:", err);
      } finally {
        setIsLoading(false);
      }
    };

    await checkProposals();
  };

  return { 
    hasProposals, 
    proposalCount, 
    isLoading, 
    proposals,
    refreshProposals 
  };
}
