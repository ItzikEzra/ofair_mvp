
import React, { useEffect } from "react";
import ProposalSortDropdown from "./ProposalSortDropdown";
import ProposalCard from "./ProposalCard";
import { useProposalsManagement } from "./hooks/useProposalsManagement";

interface ProposalsListProps {
  leadId: string;
  isOwner: boolean;
  sharePercentage: number;
  leadTitle: string;
  highlightedProposalId?: string | null;
  onPaymentUpdate?: () => void;
}

const ProposalsList: React.FC<ProposalsListProps> = ({
  leadId,
  isOwner,
  sharePercentage,
  leadTitle,
  highlightedProposalId,
  onPaymentUpdate
}) => {
  const {
    sortedProposals,
    isLoading,
    updatingProposalId,
    sortBy,
    setSortBy,
    handleUpdateProposalStatus,
    calculateEarnings,
    refreshProposals
  } = useProposalsManagement(leadId, sharePercentage);

  const handleStatusUpdate = async (proposalId: string, newStatus: string) => {
    await handleUpdateProposalStatus(proposalId, newStatus);
    
    // Trigger a custom event to notify other components
    if (newStatus === 'accepted') {
      window.dispatchEvent(new CustomEvent('proposalStatusUpdated', { 
        detail: { proposalId, newStatus, leadId } 
      }));
      
      if (onPaymentUpdate) {
        onPaymentUpdate();
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">טוען הצעות מחיר...</div>;
  }

  if (sortedProposals.length === 0) {
    return <div className="text-center py-4 text-gray-500">אין הצעות מחיר עדיין</div>;
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">הצעות מחיר ({sortedProposals.length})</h4>
      </div>
      
      <ProposalSortDropdown sortBy={sortBy} onSortChange={setSortBy} />
      
      {sortedProposals.map(proposal => (
        <ProposalCard
          key={proposal.id}
          proposal={proposal}
          isOwner={isOwner}
          sharePercentage={sharePercentage}
          isHighlighted={highlightedProposalId === proposal.id}
          isUpdating={updatingProposalId === proposal.id}
          onUpdateStatus={handleStatusUpdate}
          calculateEarnings={calculateEarnings}
        />
      ))}
    </div>
  );
};

export default ProposalsList;
