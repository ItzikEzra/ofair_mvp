
import React, { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DirectInquiryType } from "@/types/jobs";
import { useDirectInquiriesTab } from "./direct-inquiries/useDirectInquiriesTab";
import DirectInquiryCard from "./direct-inquiries/DirectInquiryCard";
import DirectInquiryDialogs from "./direct-inquiries/DirectInquiryDialogs";
import DirectInquiriesEmptyState from "./direct-inquiries/DirectInquiriesEmptyState";

interface DirectInquiriesTabProps {
  inquiries: DirectInquiryType[];
  setInquiries: React.Dispatch<React.SetStateAction<DirectInquiryType[]>>;
  error?: string | null;
  refreshInquiries?: () => void;
}

const DirectInquiriesTab: React.FC<DirectInquiriesTabProps> = ({ 
  inquiries = [], 
  setInquiries,
  error,
  refreshInquiries
}) => {
  const {
    workCompletionDialog,
    setWorkCompletionDialog,
    workClosedDialog,
    setWorkClosedDialog,
    handleTalkedToClient,
    handleWorkClosedAnswer,
    handleWorkCompletionComplete
  } = useDirectInquiriesTab(inquiries, setInquiries);

  // Enhanced logging for debugging
  useEffect(() => {
    console.log("[DIRECT_INQUIRIES_TAB] === Component State Update ===");
    console.log("[DIRECT_INQUIRIES_TAB] Received inquiries:", inquiries);
    console.log("[DIRECT_INQUIRIES_TAB] Inquiries count:", inquiries?.length || 0);
    console.log("[DIRECT_INQUIRIES_TAB] Error:", error);
  }, [inquiries, error]);

  const handleCall = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

  console.log("[DIRECT_INQUIRIES_TAB] === Rendering Component ===");
  console.log("[DIRECT_INQUIRIES_TAB] Final render with inquiries count:", inquiries?.length || 0);

  // Enhanced safety checks for inquiries array
  if (inquiries === null || inquiries === undefined) {
    console.log("[DIRECT_INQUIRIES_TAB] Inquiries is null/undefined, showing loading state");
    return (
      <div className="text-center p-8 bg-white rounded-xl shadow-md" dir="rtl">
        <p className="text-gray-500">טוען פניות ישירות...</p>
      </div>
    );
  }

  if (!Array.isArray(inquiries)) {
    console.log("[DIRECT_INQUIRIES_TAB] Inquiries is not an array, showing error state");
    return (
      <div className="text-center p-8 bg-white rounded-xl shadow-md" dir="rtl">
        <p className="text-red-500">שגיאה בטעינת פניות ישירות</p>
        <p className="text-sm text-gray-400 mt-2">נסה לרענן את הדף</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4" dir="rtl">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              {refreshInquiries && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshInquiries}
                  className="mr-2"
                >
                  <RefreshCw size={14} className="mr-1" />
                  רענן
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Refresh Button */}
        {refreshInquiries && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={refreshInquiries}
              className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              <RefreshCw size={16} className="mr-1" />
              רענן פניות
            </Button>
          </div>
        )}

        {inquiries.length === 0 ? (
          <DirectInquiriesEmptyState />
        ) : (
          <>
            {inquiries.map((inquiry, index) => {
              console.log(`[DIRECT_INQUIRIES_TAB] === Rendering Inquiry ${index + 1} ===`);
              console.log(`[DIRECT_INQUIRIES_TAB] Inquiry data:`, inquiry);
              
              return (
                <DirectInquiryCard
                  key={inquiry.id}
                  inquiry={inquiry}
                  onCall={handleCall}
                  onTalkedToClient={handleTalkedToClient}
                />
              );
            })}
            
            <div className="mt-4 text-center text-sm text-gray-500" dir="rtl">
              מציג {inquiries.length} פניות ישירות
            </div>
          </>
        )}
      </div>

      <DirectInquiryDialogs
        workClosedDialog={workClosedDialog}
        setWorkClosedDialog={setWorkClosedDialog}
        workCompletionDialog={workCompletionDialog}
        setWorkCompletionDialog={setWorkCompletionDialog}
        onWorkClosedAnswer={handleWorkClosedAnswer}
        onWorkCompletionComplete={handleWorkCompletionComplete}
      />
    </>
  );
};

export default DirectInquiriesTab;
