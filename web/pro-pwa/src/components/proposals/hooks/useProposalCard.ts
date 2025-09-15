
import { useState } from "react";
import { ProposalType } from "@/types/jobs";

export const useProposalCard = (proposal: ProposalType) => {
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [workDate, setWorkDate] = useState("");
  const [workTime, setWorkTime] = useState("");

  // Enhanced status handling for requests
  const getDisplayStatus = () => {
    const reqStatus = (proposal as any).request_status;
    console.log("[PROPOSAL_CARD] request_status:", reqStatus, "proposal.status:", proposal.status);
    
    // If the proposal itself is completed, show completed
    if (proposal.status === "completed") {
      return "completed";
    }
    
    // For requests, check request_status
    if (reqStatus === "waiting_for_rating" || reqStatus === "approved") {
      console.log("[PROPOSAL_CARD] Converting request_status to accepted");
      return "accepted";
    }
    
    return proposal.status;
  };

  // Get the appropriate card background color
  const getCardBackground = () => {
    const displayStatus = getDisplayStatus();
    switch (displayStatus) {
      case 'accepted':
      case 'approved':
        return 'border-green-300 bg-green-50';
      case 'scheduled':
        return 'border-ofair-blue bg-blue-50';
      case 'completed':
        return 'border-gray-300 bg-gray-50';
      case 'pending':
        return 'border-yellow-300 bg-yellow-50';
      case 'rejected':
        return 'border-red-300 bg-red-50';
      default:
        return '';
    }
  };

  // Determine proposal type safely - use the type field directly if available
  const proposalType: "lead" | "request" = proposal.type === 'request' ? 'request' : 'lead';

  const handleCompletionClose = (refreshProposals?: () => void) => {
    setIsCompletionDialogOpen(false);
    if (refreshProposals) {
      refreshProposals();
    }
  };

  return {
    isCompletionDialogOpen,
    setIsCompletionDialogOpen,
    isScheduleDialogOpen,
    setIsScheduleDialogOpen,
    workDate,
    setWorkDate,
    workTime,
    setWorkTime,
    getDisplayStatus,
    getCardBackground,
    proposalType,
    handleCompletionClose
  };
};
