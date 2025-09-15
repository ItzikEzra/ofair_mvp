
import { useState } from "react";
import { DirectInquiryType } from "@/types/jobs";
import { useToast } from "@/hooks/use-toast";
import { updateReferralStatus } from "@/services/referralService";

export function useDirectInquiriesTab(
  inquiries: DirectInquiryType[],
  setInquiries: React.Dispatch<React.SetStateAction<DirectInquiryType[]>>
) {
  const { toast } = useToast();
  
  const [workCompletionDialog, setWorkCompletionDialog] = useState<{
    open: boolean;
    inquiryId: string | number;
    inquiryTitle: string;
  }>({ open: false, inquiryId: '', inquiryTitle: '' });
  
  const [workClosedDialog, setWorkClosedDialog] = useState<{
    open: boolean;
    inquiryId: string | number;
    clientName: string;
  }>({ open: false, inquiryId: '', clientName: '' });

  const markAsContacted = async (id: number | string) => {
    console.log("[DIRECT_INQUIRIES_TAB] Marking inquiry as contacted:", id);
    
    // Update the UI immediately for better UX
    const updatedInquiries = inquiries.map(inquiry => {
      if (inquiry.id === id) {
        return { ...inquiry, isContacted: true };
      }
      return inquiry;
    });
    
    setInquiries(updatedInquiries);
    
    // Update in the database
    const success = await updateReferralStatus(id, true);
    
    if (success) {
      toast({
        title: "סומן כיצרתי קשר",
        description: "הפנייה סומנה כפנייה שיצרת איתה קשר",
      });
    } else {
      // Revert UI change if the database update failed
      toast({
        title: "שגיאה בעדכון סטטוס",
        description: "לא ניתן לעדכן את סטטוס הפנייה",
        variant: "destructive"
      });
      
      // Revert the UI change
      setInquiries(inquiries);
    }
  };

  const handleTalkedToClient = (id: number | string, clientName: string) => {
    console.log("[DIRECT_INQUIRIES_TAB] Opening work closed dialog for inquiry:", id);
    
    setWorkClosedDialog({
      open: true,
      inquiryId: id,
      clientName: clientName
    });
  };

  const handleWorkClosedAnswer = (workCompleted: boolean) => {
    if (workCompleted) {
      // Open work completion form
      setWorkCompletionDialog({
        open: true,
        inquiryId: workClosedDialog.inquiryId,
        inquiryTitle: `פנייה ישירה מ${workClosedDialog.clientName}`
      });
    } else {
      // Just mark as contacted
      markAsContacted(workClosedDialog.inquiryId);
    }
    
    setWorkClosedDialog({ open: false, inquiryId: '', clientName: '' });
  };

  const handleWorkCompletionComplete = async () => {
    console.log("[DIRECT_INQUIRIES_TAB] Work completion completed for inquiry:", workCompletionDialog.inquiryId);
    
    // Update the inquiry status to closed
    const updatedInquiries = inquiries.map(inquiry => {
      if (inquiry.id === workCompletionDialog.inquiryId) {
        return { ...inquiry, isClosed: true, isContacted: true };
      }
      return inquiry;
    });
    
    setInquiries(updatedInquiries);
    
    // Update status in database to completed
    const success = await updateReferralStatus(workCompletionDialog.inquiryId, true, 'completed');
    
    if (success) {
      toast({
        title: "העבודה הושלמה בהצלחה",
        description: "הפנייה הישירה סומנה כמושלמת",
      });
    } else {
      toast({
        title: "שגיאה בעדכון סטטוס",
        description: "לא ניתן לעדכן את סטטוס הפנייה",
        variant: "destructive"
      });
    }
    
    setWorkCompletionDialog({ open: false, inquiryId: '', inquiryTitle: '' });
  };

  return {
    workCompletionDialog,
    setWorkCompletionDialog,
    workClosedDialog,
    setWorkClosedDialog,
    markAsContacted,
    handleTalkedToClient,
    handleWorkClosedAnswer,
    handleWorkCompletionComplete
  };
}
