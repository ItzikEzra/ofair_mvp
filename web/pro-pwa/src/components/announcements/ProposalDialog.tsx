import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LeadProposalForm from "@/components/leads/LeadProposalForm";
import RequestProposalForm from "@/components/requests/RequestProposalForm";
interface ProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcementType: 'lead' | 'request';
  announcementTitle: string;
  announcementId: string;
  announcementBudget?: number;
  sharePercentage?: number;
  onSubmit?: (price: string, description: string, completionDate: string, sampleImageUrl?: string, lowerPriceOption?: {
    willing: boolean;
    price: string;
  }) => Promise<boolean>;
}
const ProposalDialog: React.FC<ProposalDialogProps> = ({
  open,
  onOpenChange,
  announcementType,
  announcementTitle,
  announcementBudget = 0,
  announcementId,
  sharePercentage = 0,
  onSubmit
}) => {
  console.log("ProposalDialog rendered:", {
    announcementType,
    announcementId,
    announcementTitle,
    announcementBudget,
    sharePercentage
  });

  // Handle close request
  const handleClose = () => {
    console.log("Dialog close requested");
    onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md w-[calc(100vw-32px)] mx-auto max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-right">הגשת הצעת מחיר</DialogTitle>
        </DialogHeader>
        
        <div className="w-full">
          {announcementType === 'lead' ? <LeadProposalForm leadId={announcementId} leadTitle={announcementTitle} leadBudget={announcementBudget || 0} sharePercentage={sharePercentage} onClose={handleClose} /> : <RequestProposalForm requestId={announcementId} requestTitle={announcementTitle} onClose={handleClose} />}
        </div>
      </DialogContent>
    </Dialog>;
};
export default ProposalDialog;