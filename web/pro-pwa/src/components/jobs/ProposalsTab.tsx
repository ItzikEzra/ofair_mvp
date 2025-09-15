
import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { ProposalType } from "@/types/jobs";
import { Button } from "@/components/ui/button";
import { useClientDetails } from "@/hooks/useClientDetails";
import ClientDetailsDialog from "../proposals/ClientDetailsDialog";
import SubmittedProposalsTab from "../proposals/SubmittedProposalsTab";

interface ProposalsTabProps {
  proposals: ProposalType[];
  setProposals?: React.Dispatch<React.SetStateAction<ProposalType[]>> | undefined;
  refreshProposals?: () => void;
  onlySubmitted?: boolean;
  highlightedProposalId?: string | null;
}

const ProposalsTab: React.FC<ProposalsTabProps> = ({ proposals, setProposals, refreshProposals, onlySubmitted, highlightedProposalId }) => {
  const [error, setError] = useState<string | null>(null);

  // Use the custom hook for client details
  const {
    clientDetails,
    selectedProposal,
    isDetailsDialogOpen,
    setIsDetailsDialogOpen,
    showClientDetails,
  } = useClientDetails();

  console.log("[PROPOSALS_TAB] Received proposals:", proposals);
  console.log("[PROPOSALS_TAB] Number of proposals:", proposals?.length || 0);

  // Debug the proposals data
  useEffect(() => {
    console.log("[PROPOSALS_TAB] Props changed - proposals:", proposals);
    console.log("[PROPOSALS_TAB] Proposals length:", proposals?.length);
    if (proposals && proposals.length > 0) {
      console.log("[PROPOSALS_TAB] First proposal:", proposals[0]);
    }
  }, [proposals]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-red-50 rounded-lg p-4 border border-red-200">
        <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-red-700 mb-4">{error}</p>
      </div>
    );
  }

  return (
    <>
      <SubmittedProposalsTab
        proposals={proposals || []}
        showClientDetails={showClientDetails}
        refreshProposals={refreshProposals}
        highlightedProposalId={highlightedProposalId}
      />
      <ClientDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        clientDetails={clientDetails}
        proposalTitle={selectedProposal?.title}
      />
    </>
  );
};

export default ProposalsTab;
