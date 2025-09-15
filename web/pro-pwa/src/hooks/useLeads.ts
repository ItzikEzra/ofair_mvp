
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/leads";

interface UseLeadsProps {
  professionalId: string | null;
}

export const useLeads = ({ professionalId }: UseLeadsProps) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLeads = async () => {
    if (!professionalId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      
      console.log("Fetching my leads via edge function for professional:", professionalId);
      const { data, error } = await supabase.functions.invoke('get-my-leads', {
        body: { professionalId }
      });
      
      if (error) {
        console.error("Error fetching my leads:", error);
        setError("אירעה שגיאה בטעינת הלידים שלי, נסה שוב מאוחר יותר");
        return;
      }
      
      console.log(`Received ${data?.length || 0} leads from the API`);
      setLeads(data || []);
    } catch (err) {
      console.error("Failed to fetch my leads:", err);
      setError("אירעה שגיאה בלתי צפויה, נסה שוב מאוחר יותר");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [professionalId]);

  const getFilteredLeads = (activeTab: string) => {
    if (activeTab === "all") {
      return leads;
    }
    
    return leads.filter(lead => {
      if (activeTab === "active") {
        return lead.status === "active";
      }
      if (activeTab === "approved") {
        return lead.status === "approved";
      }
      if (activeTab === "completed") {
        return lead.status === "completed";
      }
      if (activeTab === "cancelled") {
        return lead.status === "cancelled";
      }
      return true;
    });
  };

  const refreshLeads = () => {
    console.log("Refreshing leads list");
    fetchLeads();
  };

  return {
    leads,
    isLoading,
    error,
    getFilteredLeads,
    refreshLeads
  };
};
