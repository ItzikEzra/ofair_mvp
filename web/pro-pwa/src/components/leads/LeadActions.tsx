
import React from "react";
import { Button } from "@/components/ui/button";
import { Receipt, CheckCircle, XCircle, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LeadActionsProps {
  status: string;
  isUpdating: boolean;
  showProposals: boolean;
  onToggleProposals: () => void;
  onOpenProposalsDialog?: () => void;
  onUpdateStatus: (status: string) => void;
  proposalCount?: number;
  leadId?: string;
}

const LeadActions = ({
  status,
  isUpdating,
  showProposals,
  onToggleProposals,
  onOpenProposalsDialog,
  onUpdateStatus,
  proposalCount = 0,
  leadId,
}: LeadActionsProps) => {
  const navigate = useNavigate();

  const handleResubmit = () => {
    if (leadId) {
      navigate(`/submit-lead?resubmit=${leadId}`);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-col sm:flex-row gap-2 w-full">
        <Button
          variant="outline"
          onClick={onOpenProposalsDialog || onToggleProposals}
          className={`w-full relative flex items-center`}
        >
          <Receipt className="mr-1" size={16} />
          צפה בהצעות
          {proposalCount > 0 && (
            <span className="ml-1 text-ofair-blue font-bold animate-pulse">
              ({proposalCount})
            </span>
          )}
        </Button>
      </div>
      
      {/* Status update buttons based on current status */}
      <div className="flex flex-col sm:flex-row gap-2 w-full">
        {status === 'active' && (
          <>
            <Button
              variant="default"
              onClick={() => onUpdateStatus('completed')}
              disabled={isUpdating}
              className="w-full flex items-center bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-1" size={16} />
              סמן כהושלם
            </Button>
            <Button
              variant="destructive"
              onClick={() => onUpdateStatus('cancelled')}
              disabled={isUpdating}
              className="w-full flex items-center"
            >
              <XCircle className="mr-1" size={16} />
              בטל ליד
            </Button>
          </>
        )}
        
        {(status === 'completed' || status === 'cancelled') && (
          <Button
            variant="default"
            onClick={handleResubmit}
            className="w-full flex items-center bg-ofair-blue hover:bg-ofair-blue/80"
          >
            <PlusCircle className="mr-1" size={16} />
            הגש מחדש
          </Button>
        )}
      </div>
    </div>
  );
};

export default LeadActions;
