import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, Calendar, CreditCard, FileUp } from "lucide-react";
import { PaymentDetails } from "@/types/payments";

interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentDetails: PaymentDetails | null;
  isLeadOwner: boolean;
}

const PaymentDetailsDialog: React.FC<PaymentDetailsDialogProps> = ({
  open,
  onOpenChange,
  paymentDetails,
  isLeadOwner
}) => {
  if (!paymentDetails) {
    return null;
  }

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case "cash":
        return "מזומן";
      case "check":
        return "צ'ק";
      case "credit":
        return "כרטיס אשראי (ישירות)";
      case "ofair":
        return "דרך אופיר";
      default:
        return method;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[calc(100vw-32px)]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <DollarSign className="h-5 w-5 text-blue-600 ml-2" />
            {isLeadOwner ? "פרטי עמלה" : "פרטי תשלום"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-2">
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium mb-2">{paymentDetails.leadTitle}</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-700">
                  <DollarSign className="h-4 w-4 ml-2 text-gray-500" />
                  <span>סכום סופי:</span>
                </div>
                <span className="font-medium">{formatCurrency(paymentDetails.finalAmount)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-700">
                  <CreditCard className="h-4 w-4 ml-2 text-gray-500" />
                  <span>אמצעי תשלום:</span>
                </div>
                <span>{formatPaymentMethod(paymentDetails.paymentMethod)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-700">
                  <Calendar className="h-4 w-4 ml-2 text-gray-500" />
                  <span>תאריך עדכון:</span>
                </div>
                <span>{new Date(paymentDetails.paymentDate).toLocaleDateString('he-IL')}</span>
              </div>
              
              {paymentDetails.invoiceUrl && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-700">
                    <FileUp className="h-4 w-4 ml-2 text-gray-500" />
                    <span>חשבונית:</span>
                  </div>
                  <a
                    href={paymentDetails.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ofair-blue hover:underline text-xs font-semibold"
                  >
                    הורד / הצג
                  </a>
                </div>
              )}
              
              {isLeadOwner && (
                <>
                  <div className="border-t border-gray-200 my-2 pt-2"></div>
                  <div className="flex items-center justify-between text-blue-700">
                    <span>אחוז עמלה:</span>
                    <span className="font-medium">{paymentDetails.sharePercentage}%</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-700 font-bold">
                    <span>סכום העמלה:</span>
                    <span>{formatCurrency(paymentDetails.commissionAmount)}</span>
                  </div>
                  <div className="bg-blue-50 p-2 rounded text-sm text-blue-700 text-center mt-2">
                    העמלה תועבר לחשבונך בהקדם
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDetailsDialog;
