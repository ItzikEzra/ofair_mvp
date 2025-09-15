import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PaymentsContent from "@/components/payments/PaymentsContent";
import { supabase } from "@/integrations/supabase/client";
import { useProfessionalId } from "@/hooks/useProfessionalId";
import { getAuthToken } from "@/utils/storageUtils";

const Payments = () => {
  const [paymentData, setPaymentData] = useState({
    leadPayments: [],
    icountTransactions: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const { professionalId } = useProfessionalId();

  useEffect(() => {
    const fetchPaymentData = async () => {
      setIsLoading(true);
      try {
        // Get auth token for secure functions
        const authToken = getAuthToken();
        
        // Use secure function to get payment history
        const { data: paymentHistory, error: paymentError } = await supabase.rpc('get_my_payments_secure', {
          token_param: authToken || null
        });
        
        if (paymentError) {
          console.log("Error fetching payment history:", paymentError);
          setPaymentData({ leadPayments: [], icountTransactions: [] });
          return;
        }

        // Get current professional ID for icount transactions
        const { data: currentProfId, error: profError } = await supabase.rpc('get_current_professional_id_secure', {
          token_param: authToken || null
        });

        let icountTransactions = [];
        if (currentProfId && !profError) {
          // Fetch icount transactions
          const { data: icount } = await supabase
            .from('icount_transactions')
            .select('*')
            .eq('professional_id', currentProfId);
          icountTransactions = icount || [];
        }

        setPaymentData({ 
          leadPayments: paymentHistory || [], 
          icountTransactions 
        });
      } catch (error) {
        console.error('Error fetching payment data:', error);
        setPaymentData({ leadPayments: [], icountTransactions: [] });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentData();
  }, []);

  const paymentHistory = [...paymentData.leadPayments, ...paymentData.icountTransactions];
  const monthlyCommission = paymentData.leadPayments.reduce((sum: number, payment: any) => sum + (payment.commission_amount || 0), 0);

  return <MainLayout title="התשלומים שלי">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-cyan-50/20">
        {/* Floating background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-32 right-1/4 w-72 h-72 bg-gradient-to-br from-emerald-400/15 to-teal-400/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 left-1/3 w-56 h-56 bg-gradient-to-br from-cyan-400/15 to-blue-400/15 rounded-full blur-3xl"></div>
          <div className="absolute top-2/3 right-16 w-40 h-40 bg-gradient-to-br from-green-400/15 to-emerald-400/15 rounded-full blur-3xl"></div>
        </div>

        <div className="p-6 px-0">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl shadow-emerald-500/10 border-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">התשלומים שלי</h2>
                  <p className="text-sm text-gray-600">עמלות ורווחים מהעבודות שלך</p>
                </div>
              </div>
            </div>
          </div>

          <PaymentsContent />
        </div>
      </div>
    </MainLayout>;
};
export default Payments;