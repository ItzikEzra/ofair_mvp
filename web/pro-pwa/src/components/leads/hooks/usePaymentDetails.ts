import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PaymentDetails } from "@/types/payments";

export const usePaymentDetails = (leadId: string) => {
  const [searchParams] = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [highlightedPaymentId, setHighlightedPaymentId] = useState<string | null>(null);

  useEffect(() => {
    const paymentId = searchParams.get('payment');
    if (paymentId) {
      setHighlightedPaymentId(paymentId);
    }
  }, [searchParams]);

  return {
    paymentDetails,
    highlightedPaymentId
  };
};