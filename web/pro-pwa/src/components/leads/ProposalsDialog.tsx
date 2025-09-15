import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import ProposalSortDropdown from "@/components/leads/ProposalSortDropdown";
import ProposalCard from "@/components/leads/ProposalCard";
import { useProposalsManagement } from "@/components/leads/hooks/useProposalsManagement";
interface ProposalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadTitle: string;
  sharePercentage: number;
}
const ProposalsDialog: React.FC<ProposalsDialogProps> = ({
  open,
  onOpenChange,
  leadId,
  leadTitle,
  sharePercentage
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const {
    sortedProposals,
    isLoading,
    updatingProposalId,
    sortBy,
    setSortBy,
    handleUpdateProposalStatus,
    calculateEarnings,
  } = useProposalsManagement(leadId, sharePercentage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 gap-0 m-0 rounded-none border-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-right text-lg font-semibold">
            הצעות מחיר עבור: {leadTitle}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto bg-background" dir="rtl">
          <div className="p-4">
            {/* Header with title and filters */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter size={16} />
                  מסננים
                </Button>
                {showFilters && (
                  <ProposalSortDropdown 
                    sortBy={sortBy} 
                    onSortChange={setSortBy} 
                  />
                )}
              </div>
              <Badge variant="secondary" className="text-sm">
                {sortedProposals.length} הצעות מחיר
              </Badge>
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">טוען הצעות מחיר...</p>
                </div>
              </div>
            )}

            {/* Proposals list */}
            {!isLoading && sortedProposals.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-lg">אין הצעות מחיר עדיין</p>
                <p className="text-sm text-muted-foreground mt-2">
                  הצעות מחיר יופיעו כאן כשמקצועיים יגישו הצעות
                </p>
              </div>
            )}

            {!isLoading && sortedProposals.length > 0 && (
              <div className="space-y-4">
                {sortedProposals.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    isOwner={true}
                    isHighlighted={false}
                    onUpdateStatus={handleUpdateProposalStatus}
                    isUpdating={updatingProposalId === proposal.id}
                    sharePercentage={sharePercentage}
                    calculateEarnings={calculateEarnings}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default ProposalsDialog;