import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PaymentDetails } from "@/types/payments";

export const usePaymentDetails = () => {
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [paymentDetailsDialogOpen, setPaymentDetailsDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchPaymentDetails = async (paymentId: string) => {
    try {
      // Get the payment details
      const { data: paymentData, error: paymentError } = await supabase
        .from('lead_payments')
        .select('*, leads!inner(*)')
        .eq('id', paymentId as any)
        .maybeSingle();
        
      if (paymentError) {
        throw paymentError;
      }
      
      if (paymentData && typeof paymentData === 'object') {
        const data = paymentData as any;
        setPaymentDetails({
          leadTitle: data.leads?.title || 'ליד',
          finalAmount: data.final_amount,
          paymentMethod: data.payment_method,
          sharePercentage: data.share_percentage,
          commissionAmount: data.commission_amount,
          paymentDate: data.created_at,
          invoiceUrl: data.invoice_url || undefined,
        });
        
        setPaymentDetailsDialogOpen(true);
      }
    } catch (err) {
      console.error("Error fetching payment details:", err);
      toast({
        title: "שגיאה בטעינת פרטי תשלום",
        description: "לא ניתן לטעון את פרטי התשלום",
        variant: "destructive"
      });
    }
  };

  return { 
    paymentDetails, 
    paymentDetailsDialogOpen, 
    setPaymentDetailsDialogOpen, 
    fetchPaymentDetails 
  };
};
