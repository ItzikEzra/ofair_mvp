
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// סך הכל רווחים נטו מהחודש הנוכחי
const useMonthlyCommission = (professionalId: string | null) => {
  const [commission, setCommission] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!professionalId) {
      setCommission(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const isoFirstDay = firstDay.toISOString();

    async function fetchCommission() {
      // Get net earnings from lead payments (commission_amount is what the professional earns)
      const { data: leadPayments, error: leadError } = await supabase
        .from("lead_payments")
        .select("commission_amount, created_at")
        .eq("professional_id", professionalId as any)
        .gte("created_at", isoFirstDay);

      // Get net earnings from quote payments
      const { data: quotePayments, error: quoteError } = await supabase
        .from("quote_payments")
        .select("final_amount, commission_amount, created_at")
        .eq("professional_id", professionalId as any)
        .gte("created_at", isoFirstDay);

      // Get net earnings from work completions (referrals)
      const { data: workCompletions, error: workError } = await supabase
        .from("work_completions")
        .select("final_amount, created_at")
        .eq("professional_id", professionalId as any)
        .gte("created_at", isoFirstDay)
        .not("final_amount", "is", null);

      let totalNetEarnings = 0;

      // Calculate from lead payments - use commission_amount (what professional gets)
      if (!leadError && Array.isArray(leadPayments)) {
        const leadEarnings = leadPayments.reduce(
          (sum, row) => sum + (Number((row as any).commission_amount) || 0),
          0
        );
        totalNetEarnings += leadEarnings;
      }

      // Calculate from quote payments - use commission_amount (what professional gets)
      if (!quoteError && Array.isArray(quotePayments)) {
        const quoteEarnings = quotePayments.reduce((sum, row) => {
          // Use commission_amount if available, otherwise calculate net earnings
          const commissionAmount = Number((row as any).commission_amount) || 0;
          if (commissionAmount > 0) {
            return sum + commissionAmount;
          }
          // Fallback calculation if commission_amount is not available
          const finalAmount = Number((row as any).final_amount) || 0;
          const oFairCommission = finalAmount * 0.10; // 10% oFair commission for quotes
          const netEarnings = finalAmount - oFairCommission;
          return sum + netEarnings;
        }, 0);
        totalNetEarnings += quoteEarnings;
      }

      // Calculate from work completions (referrals) - net after oFair commission (10%)
      if (!workError && Array.isArray(workCompletions)) {
        const referralEarnings = workCompletions.reduce((sum, row) => {
          const finalAmount = Number((row as any).final_amount) || 0;
          const oFairCommission = finalAmount * 0.10; // 10% oFair commission for referrals
          const netEarnings = finalAmount - oFairCommission;
          return sum + netEarnings;
        }, 0);
        totalNetEarnings += referralEarnings;
      }

      setCommission(totalNetEarnings);
      setIsLoading(false);
    }
    
    fetchCommission();

    // Listen for work completion events
    const handleWorkCompleted = () => {
      console.log('[useMonthlyCommission] Work completed event received, refreshing...');
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('workCompleted', handleWorkCompleted);

    return () => {
      window.removeEventListener('workCompleted', handleWorkCompleted);
    };
  }, [professionalId, refreshTrigger]);

  const refresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return { commission, isLoading, refresh };
};

export default useMonthlyCommission;
