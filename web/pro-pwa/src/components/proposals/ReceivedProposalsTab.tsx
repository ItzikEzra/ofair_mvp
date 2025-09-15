
import React, { useState, useMemo } from "react";
import { Lead } from "@/types/leads";
import { LeadProposal } from "@/types/leads";
import ReceivedProposalCard from "./ReceivedProposalCard";
import EmptyStateMessage from "./EmptyStateMessage";
import SortDropdown, { SortOption } from "./SortDropdown";

interface ReceivedProposalsTabProps {
  myLeads: Lead[];
  leadProposals: LeadProposal[];
}

const ReceivedProposalsTab: React.FC<ReceivedProposalsTabProps> = ({ 
  myLeads,
  leadProposals
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  console.log("[RECEIVED_PROPOSALS_TAB] My leads:", myLeads);
  console.log("[RECEIVED_PROPOSALS_TAB] Lead proposals:", leadProposals);

  const getLeadForProposal = (leadId: string) => {
    return myLeads.find(lead => lead.id === leadId);
  };

  const sortedProposals = useMemo(() => {
    const sorted = [...leadProposals];
    
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'price_low':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price_high':
        return sorted.sort((a, b) => b.price - a.price);
      case 'rating_high':
        return sorted.sort((a, b) => {
          const ratingA = a.professionals?.rating || a.professional_rating || 0;
          const ratingB = b.professionals?.rating || b.professional_rating || 0;
          return ratingB - ratingA;
        });
      case 'rating_low':
        return sorted.sort((a, b) => {
          const ratingA = a.professionals?.rating || a.professional_rating || 0;
          const ratingB = b.professionals?.rating || b.professional_rating || 0;
          return ratingA - ratingB;
        });
      default:
        return sorted;
    }
  }, [leadProposals, sortBy]);

  if (myLeads.length === 0) {
    return (
      <EmptyStateMessage
        title="לא פרסמת לידים עדיין"
        description="הצעות מחיר שתקבל ללידים שפרסמת יופיעו כאן"
        actionText="פרסם ליד חדש"
        actionPath="/submit-lead"
      />
    );
  } 
  
  if (leadProposals.length === 0) {
    return (
      <EmptyStateMessage
        title="לא התקבלו הצעות ללידים שלך"
        description="ההצעות שתקבל ללידים שפרסמת יופיעו כאן"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          הצעות מחיר שהתקבלו ({leadProposals.length})
        </h3>
        <SortDropdown sortBy={sortBy} onSortChange={setSortBy} />
      </div>
      
      <div className="grid gap-4">
        {sortedProposals.map((proposal) => {
          const relatedLead = getLeadForProposal(proposal.lead_id);
          console.log("[RECEIVED_PROPOSALS_TAB] Proposal:", proposal);
          console.log("[RECEIVED_PROPOSALS_TAB] Related lead:", relatedLead);
          return (
            <ReceivedProposalCard 
              key={proposal.id} 
              proposal={proposal}
              relatedLead={relatedLead}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ReceivedProposalsTab;
