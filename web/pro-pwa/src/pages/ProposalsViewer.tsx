
import React, { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, Loader2 } from "lucide-react";
import ProposalSortDropdown from "@/components/leads/ProposalSortDropdown";
import ProposalCard from "@/components/leads/ProposalCard";
import { useProposalsManagement } from "@/components/leads/hooks/useProposalsManagement";

const ProposalsViewer = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const [searchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  
  if (!leadId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-8">
          <p className="text-muted-foreground text-lg">ליד לא נמצא</p>
        </div>
      </div>
    );
  }

  const sharePercentage = parseInt(searchParams.get('sharePercentage') || '0');
  const leadTitle = searchParams.get('title') || '';
  const proposalId = searchParams.get('proposalId');

  return (
    <ProposalsViewerContent 
      leadId={leadId}
      sharePercentage={sharePercentage}
      leadTitle={leadTitle}
      showFilters={showFilters}
      setShowFilters={setShowFilters}
      highlightedProposalId={proposalId}
    />
  );
};

interface ProposalsViewerContentProps {
  leadId: string;
  sharePercentage: number;
  leadTitle: string;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  highlightedProposalId?: string | null;
}

const ProposalsViewerContent: React.FC<ProposalsViewerContentProps> = ({
  leadId,
  sharePercentage,
  leadTitle,
  showFilters,
  setShowFilters,
  highlightedProposalId
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
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">טוען הצעות מחיר...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20" dir="rtl">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-32 right-1/4 w-72 h-72 bg-gradient-to-br from-indigo-400/15 to-purple-400/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-1/3 w-56 h-56 bg-gradient-to-br from-blue-400/15 to-cyan-400/15 rounded-full blur-3xl"></div>
        <div className="absolute top-2/3 right-16 w-40 h-40 bg-gradient-to-br from-violet-400/15 to-pink-400/15 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-white/50 shadow-lg">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">הצעות מחיר</h1>
              {leadTitle && (
                <p className="text-sm text-muted-foreground truncate">{leadTitle}</p>
              )}
            </div>
            <Badge variant="secondary" className="shrink-0 bg-indigo-100 text-indigo-800 border-indigo-200">
              {sortedProposals.length}
            </Badge>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 bg-white/70 border-white/50 hover:bg-white/90"
            >
              <Filter className="h-4 w-4" />
              סינון
            </Button>
            {showFilters && (
              <div className="flex-1">
                <ProposalSortDropdown sortBy={sortBy} onSortChange={setSortBy} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {sortedProposals.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-sm mx-auto">
              <div className="w-16 h-16 bg-white/60 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">אין הצעות מחיר עדיין</h3>
              <p className="text-muted-foreground text-sm">
                הליד שלך עדיין לא קיבל הצעות מחיר. 
                כאשר מקצועיים יגישו הצעות, הן יופיעו כאן.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshProposals}
                className="mt-4 bg-white/70 border-white/50 hover:bg-white/90"
              >
                רענן
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {sortedProposals.map(proposal => (
              <div key={proposal.id} className="w-full">
                <ProposalCard
                  proposal={proposal}
                  isOwner={true}
                  sharePercentage={sharePercentage}
                  isHighlighted={highlightedProposalId === proposal.id}
                  isUpdating={updatingProposalId === proposal.id}
                  onUpdateStatus={handleStatusUpdate}
                  calculateEarnings={calculateEarnings}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalsViewer;
