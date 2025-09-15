
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Lead } from "@/types/leads";
import { useLeadStatusUpdate } from "@/hooks/useLeadStatusUpdate";
import { useProposalsCheck } from "./useProposalsCheck";
import { usePaymentDetails } from "./usePaymentDetails";
import { useNavigate, useSearchParams } from "react-router-dom";

interface UseMyLeadCardProps {
  lead: Lead;
  onStatusChange: () => void;
}

export const useMyLeadCard = ({ lead, onStatusChange }: UseMyLeadCardProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  const [showProposals, setShowProposals] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProposalsDialogOpen, setIsProposalsDialogOpen] = useState(false);
  const [paymentDetailsDialogOpen, setPaymentDetailsDialogOpen] = useState(false);

  const { isUpdating, handleUpdateStatus } = useLeadStatusUpdate(lead.id, () => {
    console.log("Lead status updated, refreshing data");
    onStatusChange();
    // Also invalidate queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['my-leads'] });
  });

  const {
    hasProposals,
    proposalCount,
    highlightedProposalId,
    canEdit
  } = useProposalsCheck(lead.id);

  const {
    paymentDetails,
    highlightedPaymentId
  } = usePaymentDetails(lead.id);

  // Handle URL highlighting for proposals
  useEffect(() => {
    const proposalId = searchParams.get('proposal');
    if (proposalId && hasProposals) {
      setShowProposals(true);
    }
  }, [searchParams, hasProposals]);

  const handleLeadUpdated = () => {
    console.log("Lead updated, refreshing data");
    onStatusChange();
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['my-leads'] });
  };

  const handleEditClick = () => {
    if (canEdit) {
      setIsEditModalOpen(true);
    }
  };

  // Listen for proposal status changes to refresh the page
  useEffect(() => {
    const handleProposalStatusChange = () => {
      console.log("Proposal status changed, refreshing lead data");
      handleLeadUpdated();
    };

    // Listen for custom events that might be triggered by proposal updates
    window.addEventListener('proposalStatusUpdated', handleProposalStatusChange);
    
    return () => {
      window.removeEventListener('proposalStatusUpdated', handleProposalStatusChange);
    };
  }, []);

  return {
    showProposals,
    setShowProposals,
    isEditModalOpen,
    setIsEditModalOpen,
    isProposalsDialogOpen,
    setIsProposalsDialogOpen,
    isUpdating,
    handleUpdateStatus,
    paymentDetails,
    paymentDetailsDialogOpen,
    setPaymentDetailsDialogOpen,
    hasProposals,
    proposalCount,
    highlightedProposalId,
    highlightedPaymentId,
    handleLeadUpdated,
    handleEditClick,
    canEdit
  };
};
