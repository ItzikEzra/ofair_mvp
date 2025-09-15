import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import InvoiceUploadInput from "./InvoiceUploadInput";
import { uploadInvoiceFile } from "@/utils/invoiceUpload";

interface PaymentUpdateFormProps {
  proposalId: string;
  leadId: string;
  onClose: () => void;
  leadTitle: string;
  sharePercentage: number;
}

const PaymentUpdateForm: React.FC<PaymentUpdateFormProps> = ({
  proposalId,
  leadId,
  onClose,
  leadTitle,
  sharePercentage,
}) => {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [finalAmount, setFinalAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!finalAmount || isNaN(parseFloat(finalAmount)) || parseFloat(finalAmount) <= 0) {
      setError("יש להזין סכום תשלום תקין");
      return;
    }
    if (!invoiceFile) {
      setError("נדרש לצרף קובץ חשבונית");
      return;
    }
    if (invoiceFile.size > 6 * 1024 * 1024) {
      setError("החשבונית גדולה מדי (מקסימום 6MB)");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let invoiceUrl: string | null = null;
      if (invoiceFile) {
        invoiceUrl = await uploadInvoiceFile(invoiceFile);
        if (!invoiceUrl) throw new Error("שגיאה בהעלאת החשבונית");
      }

      const { data, error: updateError } = await supabase.functions.invoke('update-payment', {
        body: {
          proposalId,
          leadId,
          finalAmount: parseFloat(finalAmount),
          paymentMethod,
          sharePercentage,
          invoice_url: invoiceUrl
        }
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      toast({
        title: "העדכון נשלח בהצלחה",
        description: "פרטי התשלום עודכנו ובעל הליד קיבל התראה",
      });
    } catch (err) {
      console.error("Error updating payment:", err);
      setError("אירעה שגיאה בעדכון התשלום. אנא נסה שוב מאוחר יותר.");
      toast({
        title: "שגיאה בעדכון תשלום",
        description: "אירעה שגיאה בעדכון התשלום",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center p-4">
        <div className="text-green-600 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-bold text-lg mb-2">העדכון נשלח בהצלחה</h3>
        <p className="text-gray-600 mb-4">פרטי התשלום עודכנו ובעל הליד קיבל התראה</p>
        <Button onClick={onClose}>סגור</Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="font-bold text-lg mb-4">עדכון תשלום</h3>
      <p className="text-sm text-gray-600 mb-4">
        אנא עדכן את סכום התשלום הסופי עבור "{leadTitle}"
      </p>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="finalAmount">סכום סופי שהתקבל (₪)</Label>
          <Input
            id="finalAmount"
            type="number"
            min="0"
            step="0.01"
            value={finalAmount}
            onChange={(e) => setFinalAmount(e.target.value)}
            placeholder="הכנס סכום"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label>אמצעי תשלום</Label>
          <RadioGroup 
            value={paymentMethod} 
            onValueChange={setPaymentMethod}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="cash" id="cash" />
              <Label htmlFor="cash">מזומן</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="check" id="check" />
              <Label htmlFor="check">צ'ק</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="credit" id="credit" />
              <Label htmlFor="credit">כרטיס אשראי (ישירות)</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="ofair" id="ofair" />
              <Label htmlFor="ofair">דרך אופיר (עמלה נגבתה מראש)</Label>
            </div>
          </RadioGroup>
        </div>
        
        <InvoiceUploadInput value={invoiceFile} onChange={setInvoiceFile} />
        
        {sharePercentage > 0 && (
          <div className="bg-blue-50 p-3 rounded-md text-sm">
            <p>אחוז העמלה: {sharePercentage}%</p>
            <p>
              סכום העמלה המשוער: 
              {finalAmount ? ` ₪${(parseFloat(finalAmount) * sharePercentage / 100).toFixed(2)}` : ' -'}
            </p>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            עדכן תשלום
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PaymentUpdateForm;
