
import React from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/types/leads";
import PaymentDetailsDialog from "./PaymentDetailsDialog";
import EditLeadModal from "./EditLeadModal";
import LeadCardHeader from "./LeadCardHeader";
import LeadCardContent from "./LeadCardContent";
import LeadCardActions from "./LeadCardActions";
import ProposalsDialog from "./ProposalsDialog";
import { useMyLeadCard } from "./hooks/useMyLeadCard";

interface MyLeadCardProps {
  lead: Lead;
  onStatusChange: () => void;
}

const MyLeadCard = ({ lead, onStatusChange }: MyLeadCardProps) => {
  const {
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
  } = useMyLeadCard({ lead, onStatusChange });

  return (
    <>
      <Card 
        dir="rtl"
        className={`
          shadow-2xl shadow-green-500/10 bg-white/90 backdrop-blur-sm rounded-3xl border-0 overflow-hidden w-full transition-all duration-300 hover:shadow-3xl hover:shadow-green-500/15
          ${highlightedProposalId ? 'ring-2 ring-yellow-500 animate-pulse' : ''}
          ${highlightedPaymentId ? 'ring-2 ring-blue-500' : ''}
          ${hasProposals ? 'ring-2 ring-ofair-blue ring-offset-2 animate-fade-in' : ''}
        `}
      >
        <LeadCardHeader
          lead={lead}
          hasProposals={hasProposals}
          canEdit={canEdit}
          onEditClick={handleEditClick}
        />
        
        <LeadCardContent lead={lead} />
        
        <LeadCardActions
          lead={lead}
          isUpdating={isUpdating}
          showProposals={showProposals}
          proposalCount={proposalCount}
          highlightedProposalId={highlightedProposalId}
          onToggleProposals={() => setShowProposals(!showProposals)}
          onOpenProposalsDialog={() => setIsProposalsDialogOpen(true)}
          onUpdateStatus={handleUpdateStatus}
          onPaymentUpdate={() => setPaymentDetailsDialogOpen(true)}
        />
      </Card>

      <EditLeadModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        lead={lead}
        onLeadUpdated={handleLeadUpdated}
      />

      <PaymentDetailsDialog
        open={paymentDetailsDialogOpen}
        onOpenChange={setPaymentDetailsDialogOpen}
        paymentDetails={paymentDetails}
        isLeadOwner={true}
      />

      <ProposalsDialog
        open={isProposalsDialogOpen}
        onOpenChange={setIsProposalsDialogOpen}
        leadId={lead.id}
        leadTitle={lead.title}
        sharePercentage={lead.share_percentage}
      />
    </>
  );
};

export default MyLeadCard;
