import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export const useProposalsCheck = (leadId: string) => {
  const [searchParams] = useSearchParams();
  const [hasProposals, setHasProposals] = useState(false);
  const [proposalCount, setProposalCount] = useState(0);
  const [highlightedProposalId, setHighlightedProposalId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(true);

  useEffect(() => {
    const proposalId = searchParams.get('proposal');
    if (proposalId) {
      setHighlightedProposalId(proposalId);
    }
  }, [searchParams]);

  // For now, return default values - this can be enhanced later with actual data fetching
  return {
    hasProposals,
    proposalCount,
    highlightedProposalId,
    canEdit
  };
};