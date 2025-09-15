
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UnifiedWorkCompletionForm from "@/components/work/UnifiedWorkCompletionForm";

interface WorkClosedDialogState {
  open: boolean;
  inquiryId: string | number;
  clientName: string;
}

interface WorkCompletionDialogState {
  open: boolean;
  inquiryId: string | number;
  inquiryTitle: string;
}

interface DirectInquiryDialogsProps {
  workClosedDialog: WorkClosedDialogState;
  setWorkClosedDialog: React.Dispatch<React.SetStateAction<WorkClosedDialogState>>;
  workCompletionDialog: WorkCompletionDialogState;
  setWorkCompletionDialog: React.Dispatch<React.SetStateAction<WorkCompletionDialogState>>;
  onWorkClosedAnswer: (workCompleted: boolean) => void;
  onWorkCompletionComplete: () => void;
}

const DirectInquiryDialogs: React.FC<DirectInquiryDialogsProps> = ({
  workClosedDialog,
  setWorkClosedDialog,
  workCompletionDialog,
  setWorkCompletionDialog,
  onWorkClosedAnswer,
  onWorkCompletionComplete
}) => {
  return (
    <>
      {/* Work Closed Confirmation Dialog */}
      <Dialog 
        open={workClosedDialog.open} 
        onOpenChange={(open) => setWorkClosedDialog({ ...workClosedDialog, open })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">האם העבודה הושלמה?</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4" dir="rtl">
            <p className="text-center text-gray-700">
              דיברת עם {workClosedDialog.clientName}. האם העבודה הושלמה?
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={() => onWorkClosedAnswer(true)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                כן, העבודה הושלמה
              </Button>
              <Button
                variant="outline"
                onClick={() => onWorkClosedAnswer(false)}
                className="flex-1"
              >
                לא, רק דיברתי איתו
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Work Completion Dialog */}
      <Dialog 
        open={workCompletionDialog.open} 
        onOpenChange={(open) => setWorkCompletionDialog({ ...workCompletionDialog, open })}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">השלמת עבודה</DialogTitle>
          </DialogHeader>
          
          <UnifiedWorkCompletionForm
            workTitle={workCompletionDialog.inquiryTitle}
            proposalId={workCompletionDialog.inquiryId.toString()}
            proposalType="referral"
            onComplete={onWorkCompletionComplete}
            onClose={() => setWorkCompletionDialog({ ...workCompletionDialog, open: false })}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DirectInquiryDialogs;
