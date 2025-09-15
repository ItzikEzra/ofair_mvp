
import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { ProposalType } from "@/types/jobs";

interface ProposalActionsProps {
  proposal: ProposalType;
  displayStatus: string;
  showClientDetails?: (proposal: ProposalType) => void;
  onWorkCompletion: () => void;
}

export const ProposalActions: React.FC<ProposalActionsProps> = ({
  proposal,
  displayStatus,
  showClientDetails,
  onWorkCompletion
}) => {
  const renderClientDetailsButton = () => {
    if (displayStatus === 'accepted' || displayStatus === 'approved' || displayStatus === 'waiting_for_rating' || displayStatus === 'scheduled' || displayStatus === 'completed') {
      return (
        <Button
          variant="outline"
          size="sm"
          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 mt-2"
          onClick={() => showClientDetails && showClientDetails({ ...proposal, status: displayStatus as any })}
        >
          הצג פרטי לקוח
        </Button>
      );
    }
    return null;
  };
  
  const renderWorkCompletionButton = () => {
    // Work completion button is redundant - proposals are automatically marked as complete upon approval
    return null;
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {renderClientDetailsButton()}
      {renderWorkCompletionButton()}
    </div>
  );
};
