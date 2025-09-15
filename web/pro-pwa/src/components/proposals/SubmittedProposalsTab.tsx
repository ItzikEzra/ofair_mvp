
import React, { useState, useEffect, useMemo } from "react";
import ProposalCard from "./ProposalCard";
import { ProposalType } from "@/types/jobs";
import { useClientDetails } from "@/hooks/useClientDetails";
import ProposalFiltersComponent, { ProposalFilters } from "./ProposalFilters";

interface SubmittedProposalsTabProps {
  proposals: ProposalType[];
  showClientDetails: (proposal: ProposalType) => void;
  refreshProposals?: () => void;
  highlightedProposalId?: string | null;
}

const SubmittedProposalsTab: React.FC<SubmittedProposalsTabProps> = ({
  proposals,
  showClientDetails,
  refreshProposals,
  highlightedProposalId
}) => {
  // מצב הסינונים
  const [filters, setFilters] = useState<ProposalFilters>({
    type: 'all',
    status: 'all'
  });

  // פונקציה לנקות סינונים
  const clearFilters = () => {
    setFilters({
      type: 'all',
      status: 'all'
    });
  };

  // סינון וחיפוש הצעות
  const filteredProposals = useMemo(() => {
    if (!proposals || proposals.length === 0) return [];

    return proposals.filter(proposal => {
      // סינון לפי סוג
      if (filters.type !== 'all') {
        // עבור ההפרדה הנכונה בין לידים ובקשות
        if (filters.type === 'lead' && !['lead', 'received_lead'].includes(proposal.type)) {
          return false;
        }
        if (filters.type === 'request' && proposal.type !== 'request') {
          return false;
        }
      }

      // סינון לפי סטטוס
      if (filters.status !== 'all') {
        // נוציא את הסטטוס המתאים
        let proposalStatus = proposal.status;
        if (proposal.type === 'request' && (proposal as any).request_status) {
          // עבור בקשות, נשתמש ב-request_status אם קיים
          const requestStatus = (proposal as any).request_status;
          if (requestStatus === 'waiting_for_rating' || requestStatus === 'approved') {
            proposalStatus = 'accepted';
          } else if (requestStatus === 'completed') {
            proposalStatus = 'completed';
          }
        }
        
        if (proposalStatus !== filters.status) {
          return false;
        }
      }

      // סינון לפי תאריך - נשתמש ב-created_at עבור תאריכים מדויקים יותר
      const proposalDate = proposal.created_at ? new Date(proposal.created_at) : new Date(proposal.date);
      
      if (filters.dateFrom && proposalDate < filters.dateFrom) {
        return false;
      }
      
      if (filters.dateTo && proposalDate > filters.dateTo) {
        return false;
      }

      return true;
    });
  }, [proposals, filters]);

  // חישוב מספרי הצעות לכל קטגוריה
  const proposalCounts = useMemo(() => {
    if (!proposals || proposals.length === 0) {
      return {
        total: 0,
        lead: 0,
        request: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        completed: 0
      };
    }

    const counts = {
      total: proposals.length,
      lead: proposals.filter(p => ['lead', 'received_lead'].includes(p.type)).length,
      request: proposals.filter(p => p.type === 'request').length,
      pending: 0,
      accepted: 0,
      rejected: 0,
      completed: 0
    };

    // ספירת סטטוסים
    proposals.forEach(proposal => {
      let status = proposal.status;
      if (proposal.type === 'request' && (proposal as any).request_status) {
        const requestStatus = (proposal as any).request_status;
        if (requestStatus === 'waiting_for_rating' || requestStatus === 'approved') {
          status = 'accepted';
        } else if (requestStatus === 'completed') {
          status = 'completed';
        }
      }

      switch (status) {
        case 'pending':
          counts.pending++;
          break;
        case 'accepted':
          counts.accepted++;
          break;
        case 'rejected':
          counts.rejected++;
          break;
        case 'completed':
          counts.completed++;
          break;
      }
    });

    return counts;
  }, [proposals]);
  console.log("[SUBMITTED_PROPOSALS_TAB] === Component Render ===");
  console.log("[SUBMITTED_PROPOSALS_TAB] Received proposals:", proposals);
  console.log("[SUBMITTED_PROPOSALS_TAB] Proposals count:", proposals?.length || 0);
  console.log("[SUBMITTED_PROPOSALS_TAB] Filtered proposals count:", filteredProposals?.length || 0);
  console.log("[SUBMITTED_PROPOSALS_TAB] Current filters:", filters);
  console.log("[SUBMITTED_PROPOSALS_TAB] Proposal counts:", proposalCounts);

  // Enhanced logging for proposal types
  useEffect(() => {
    if (proposals && proposals.length > 0) {
      const leadProposals = proposals.filter(p => p.type === 'lead');
      const requestQuotes = proposals.filter(p => p.type === 'request');
      
      console.log("[SUBMITTED_PROPOSALS_TAB] === Proposal Breakdown ===");
      console.log(`[SUBMITTED_PROPOSALS_TAB] Lead proposals: ${leadProposals.length}`);
      console.log(`[SUBMITTED_PROPOSALS_TAB] Request quotes: ${requestQuotes.length}`);
    }
  }, [proposals]);

  if (!proposals || proposals.length === 0) {
    console.log("[SUBMITTED_PROPOSALS_TAB] No proposals to display");
    return (
      <div className="text-center p-8 bg-white rounded-xl shadow-md" dir="rtl">
        <p className="text-gray-500">אין הצעות מחיר בינתיים</p>
        <p className="text-sm text-gray-400 mt-2">הצעות מחיר שתגיש יופיעו כאן</p>
      </div>
    );
  }

  // Sort proposals by date (newest first) to ensure proper display
  const sortedProposals = [...filteredProposals].sort((a, b) => {
    const dateA = new Date(a.date || a.created_at || 0);
    const dateB = new Date(b.date || b.created_at || 0);
    return dateB.getTime() - dateA.getTime();
  });

  console.log("[SUBMITTED_PROPOSALS_TAB] === Rendering Proposals ===");
  console.log(`[SUBMITTED_PROPOSALS_TAB] Total proposals to render: ${sortedProposals.length}`);

  return (
    <div className="space-y-4" dir="rtl">
      {/* רכיב הסינון */}
      <ProposalFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
        proposalCounts={proposalCounts}
      />

      {/* אם אין תוצאות אחרי סינון */}
      {sortedProposals.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-xl shadow-md">
          <p className="text-gray-500">לא נמצאו הצעות מחיר התואמות לקריטריונים</p>
          <p className="text-sm text-gray-400 mt-2">נסה לשנות את הסינונים או לנקות אותם</p>
        </div>
      ) : (
        <>
          {sortedProposals.map((proposal, index) => {
            console.log(`[SUBMITTED_PROPOSALS_TAB] === Rendering Proposal ${index + 1} ===`);
            console.log(`[SUBMITTED_PROPOSALS_TAB] Proposal ID: ${proposal.id}`);
            console.log(`[SUBMITTED_PROPOSALS_TAB] Proposal type: ${proposal.type}`);
            console.log(`[SUBMITTED_PROPOSALS_TAB] Proposal title: ${proposal.title}`);
            console.log(`[SUBMITTED_PROPOSALS_TAB] Proposal status: ${proposal.status}`);
            console.log(`[SUBMITTED_PROPOSALS_TAB] Request status: ${(proposal as any).request_status}`);
            console.log(`[SUBMITTED_PROPOSALS_TAB] Proposal price: ${proposal.price}`);
            
            return (
              <div key={proposal.id} id={`proposal-${proposal.id}`}>
                <ProposalCard
                  proposal={proposal}
                  showClientDetails={showClientDetails}
                  refreshProposals={refreshProposals}
                  isHighlighted={highlightedProposalId === proposal.id}
                />
              </div>
            );
          })}
          
          <div className="mt-4 text-center text-sm text-gray-500">
            מציג {sortedProposals.length} מתוך {proposals.length} הצעות מחיר
          </div>
        </>
      )}
    </div>
  );
};

export default SubmittedProposalsTab;
