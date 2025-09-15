import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock } from "lucide-react";
import { ProposalType } from "@/types/jobs";
import { getStatusBadge } from "@/utils/statusHelpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UnifiedWorkCompletionForm from "@/components/work/UnifiedWorkCompletionForm";
import WorkScheduleForm from "@/components/leads/WorkScheduleForm";
import { useProposalCard } from "./hooks/useProposalCard";
import { ProposalPrice } from "./components/ProposalPrice";
import { ProposalActions } from "./components/ProposalActions";
interface ProposalCardProps {
  proposal: ProposalType;
  showClientDetails?: (proposal: ProposalType) => void;
  refreshProposals?: () => void;
  isHighlighted?: boolean;
}
const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  showClientDetails,
  refreshProposals,
  isHighlighted = false
}) => {
  const {
    isCompletionDialogOpen,
    setIsCompletionDialogOpen,
    isScheduleDialogOpen,
    setIsScheduleDialogOpen,
    workDate,
    setWorkDate,
    workTime,
    setWorkTime,
    getDisplayStatus,
    getCardBackground,
    proposalType,
    handleCompletionClose
  } = useProposalCard(proposal);

  // Enhanced debugging logs
  console.log("[PROPOSAL_CARD] Rendering proposal:", proposal);
  console.log("[PROPOSAL_CARD] Proposal type:", proposal.type);
  console.log("[PROPOSAL_CARD] Proposal price:", proposal.price);
  console.log("[PROPOSAL_CARD] Proposal status:", proposal.status);
  console.log("[PROPOSAL_CARD] Request status:", (proposal as any).request_status);
  const displayStatus = getDisplayStatus();
  console.log("[PROPOSAL_CARD] Display status:", displayStatus);
  console.log("[PROPOSAL_CARD] Determined proposalType:", proposalType);
  return <>
      <Card key={proposal.id} className={`overflow-hidden ${getCardBackground()} ${isHighlighted ? 'ring-2 ring-primary ring-offset-2 shadow-lg' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg">{proposal.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {/* Type badge */}
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${proposal.type === 'lead' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                  {proposal.type === 'lead' ? 'מליד' : 'מבקשה'}
                </span>
              </div>
            </div>
            {getStatusBadge(displayStatus as any)}
          </div>
          {proposal.location && <div className="flex items-center text-sm text-gray-500">
              <MapPin size={14} className="ml-1" />
              {proposal.location}
            </div>}
          
          {/* תאריך ההצעה */}
          {(proposal.date || proposal.created_at) && (
            <div className="flex items-center text-xs text-gray-400 mt-1">
              <Clock size={12} className="ml-1" />
              תאריך הגשה: {new Date(proposal.date || proposal.created_at).toLocaleDateString('he-IL')}
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-0 pb-2">
          <p className="text-sm text-gray-700 mb-3">{proposal.description}</p>
          {(proposal.estimatedTime || proposal.estimatedCompletion) && <div className="flex items-center text-xs text-gray-500 mb-1">
              <Clock size={12} className="ml-1" />
              זמן אספקה משוער: {proposal.estimatedTime || proposal.estimatedCompletion}
            </div>}
          
          <ProposalPrice proposal={proposal} />
          
          <ProposalActions proposal={proposal} displayStatus={displayStatus} showClientDetails={showClientDetails} onWorkCompletion={() => setIsCompletionDialogOpen(true)} />
        </CardContent>
      </Card>
      
      {/* Work Completion Dialog */}
      <Dialog open={isCompletionDialogOpen} onOpenChange={setIsCompletionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">סיום עבודה</DialogTitle>
          </DialogHeader>
          <UnifiedWorkCompletionForm 
            workTitle={proposal.title}
            proposalId={proposal.id} 
            proposalType={proposalType === 'lead' ? 'proposal' : proposalType === 'request' ? 'quote' : proposalType} 
            onComplete={() => {
              // Close the dialog immediately
              setIsCompletionDialogOpen(false);
              // Refresh proposals to get updated data from server
              if (refreshProposals) {
                refreshProposals();
              }
            }}
            onClose={() => setIsCompletionDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Work Schedule Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>תזמון עבודה</DialogTitle>
          </DialogHeader>
          <WorkScheduleForm workDate={workDate} setWorkDate={setWorkDate} workTime={workTime} setWorkTime={setWorkTime} />
        </DialogContent>
      </Dialog>
    </>;
};
export default ProposalCard;