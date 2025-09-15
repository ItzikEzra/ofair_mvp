
import { useState } from "react";
import { ProposalType } from "@/types/jobs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/utils/storageUtils";

interface ClientDetails {
  name?: string;
  phone?: string;
  address?: string;
  date?: string;
  time?: string;
  workDate?: string;
  workTime?: string;
  notes?: string;
  category?: string;
  constraints?: string;
}

export function useClientDetails() {
  const [isLoading, setIsLoading] = useState(false);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<ProposalType | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const { toast } = useToast();

  const showClientDetails = async (proposal: ProposalType) => {
    // Check if status allows showing client details
    const validStatuses = ['accepted', 'approved', 'waiting_for_rating', 'scheduled', 'completed'];
    const requestStatus = (proposal as any).request_status;
    
    console.log("[CLIENT_DETAILS] Checking status validity:", { 
      proposalStatus: proposal.status, 
      requestStatus,
      validStatuses 
    });
    
    const isValidStatus = validStatuses.includes(proposal.status) || 
                         validStatuses.includes(requestStatus);
    
    if (!isValidStatus) {
      console.log("[CLIENT_DETAILS] Invalid status for client details:", { 
        status: proposal.status, 
        requestStatus 
      });
      toast({
        title: "לא ניתן להציג פרטי לקוח",
        description: "פרטי לקוח זמינים רק עבור הצעות שאושרו או הושלמו",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Determine proposal type based on the proposal object
      const proposalType = proposal.type || (proposal.leadId ? 'lead' : 'request');
      
      console.log("[CLIENT_DETAILS] Debug proposal object:", {
        id: proposal.id,
        type: proposal.type,
        leadId: proposal.leadId,
        requestId: proposal.requestId,
        title: proposal.title,
        proposalTypeResult: proposalType,
        fullProposal: proposal
      });
      
      console.log("[CLIENT_DETAILS] Processing proposal:", { 
        proposalId: proposal.id, 
        type: proposalType, 
        leadId: proposal.leadId,
        requestId: proposal.requestId,
        status: proposal.status,
        requestStatus
      });
      
      // Get the auth token for OTP authentication
      const authToken = getAuthToken();
      console.log("[CLIENT_DETAILS] Auth token:", authToken ? "Found" : "Missing");
      
      if (!authToken) {
        console.error("[CLIENT_DETAILS] No auth token found");
        toast({
          title: "שגיאה באותנטיקציה",
          description: "אין אישור כניסה. אנא התחבר מחדש",
          variant: "destructive"
        });
        return;
      }
      
      // Use the new database function to get client details, passing the token directly
      console.log("[CLIENT_DETAILS] Calling database function with:", {
        proposalId: proposal.id,
        proposalType,
        token: authToken ? "Present" : "Missing"
      });
      
      const { data, error } = await supabase.rpc('get_client_details_for_proposal', {
        proposal_id_param: proposal.id,
        proposal_type_param: proposalType,
        token_param: authToken
      });
      
      if (error) {
        console.error("[CLIENT_DETAILS] Database function error:", error);
        toast({
          title: "שגיאה בטעינת פרטי לקוח",
          description: error.message || "לא ניתן לטעון את פרטי הלקוח",
          variant: "destructive"
        });
        return;
      }
      
      console.log("[CLIENT_DETAILS] Database function result:", data);
      
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const clientData = {
          name: (data as any).name || 'לא זמין',
          phone: (data as any).phone || 'לא זמין',
          address: (data as any).address || 'לא זמין',
          date: (data as any).date,
          time: (data as any).time,
          workDate: (data as any).workDate,
          workTime: (data as any).workTime,
          notes: (data as any).notes
        };
        
        console.log("[CLIENT_DETAILS] Setting client details:", clientData);
        setClientDetails(clientData);
      } else {
        console.log("[CLIENT_DETAILS] No client data returned from function");
        toast({
          title: "לא נמצאו פרטי לקוח",
          description: "לא ניתן למצוא פרטי לקוח עבור הצעה זו",
          variant: "destructive"
        });
        return;
      }
      
      setSelectedProposal(proposal);
      setIsDetailsDialogOpen(true);
      
    } catch (err) {
      console.error("Failed to fetch client details:", err);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בלתי צפויה",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    clientDetails,
    selectedProposal,
    isDetailsDialogOpen,
    setIsDetailsDialogOpen,
    showClientDetails
  };
}
