
import React from "react";
import { CardFooter } from "@/components/ui/card";
import { Lead } from "@/types/leads";
import LeadActions from "./LeadActions";
import ProposalsList from "./ProposalsList";

interface LeadCardActionsProps {
  lead: Lead;
  isUpdating: boolean;
  showProposals: boolean;
  proposalCount: number;
  highlightedProposalId: string | null;
  onToggleProposals: () => void;
  onOpenProposalsDialog?: () => void;
  onUpdateStatus: (status: string) => void;
  onPaymentUpdate: () => void;
}

const LeadCardActions: React.FC<LeadCardActionsProps> = ({
  lead,
  isUpdating,
  showProposals,
  proposalCount,
  highlightedProposalId,
  onToggleProposals,
  onOpenProposalsDialog,
  onUpdateStatus,
  onPaymentUpdate
}) => {
  return (
    <CardFooter className="flex flex-col border-t border-white/10 pt-3 p-4 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm">
      <LeadActions
        status={lead.status}
        isUpdating={isUpdating}
        showProposals={showProposals}
        onToggleProposals={onToggleProposals}
        onOpenProposalsDialog={onOpenProposalsDialog}
        onUpdateStatus={onUpdateStatus}
        proposalCount={proposalCount}
        leadId={lead.id}
      />
      
      {showProposals && (
        <ProposalsList 
          leadId={lead.id} 
          isOwner={true} 
          sharePercentage={lead.share_percentage}
          leadTitle={lead.title}
          highlightedProposalId={highlightedProposalId}
          onPaymentUpdate={onPaymentUpdate}
        />
      )}
    </CardFooter>
  );
};

export default LeadCardActions;
