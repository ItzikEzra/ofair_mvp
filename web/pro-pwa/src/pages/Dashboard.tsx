
import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import StatsSection from "@/components/dashboard/StatsSection";
import ProposalsPreviewSection from "@/components/dashboard/ProposalsPreviewSection";
import NotificationsSection from "@/components/dashboard/NotificationsSection";
import WorkCompletionNotifications from "@/components/dashboard/WorkCompletionNotifications";
import DailyTip from "@/components/dashboard/DailyTip";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { LeadProposal } from "@/types/leads";

const Dashboard = () => {
  const { professionalData, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Data is already loaded from auth context
    if (professionalData && !authLoading) {
      setIsLoading(false);
    }
  }, [professionalData, authLoading]);


  // Create title with professional name and profession
  const dashboardTitle = professionalData 
    ? `שלום ${professionalData.name} ${professionalData.profession}`
    : "דף הבית";

  if (isLoading || authLoading) {
    return (
      <MainLayout title="דף הבית">
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100">
          <div className="p-4 space-y-6">
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-gray-200 rounded-3xl"></div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={dashboardTitle}>
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-200/30 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 p-4 space-y-6">
          <StatsSection professionalData={professionalData} />
          <ProposalsPreviewSection />
          <NotificationsSection />
          <WorkCompletionNotifications />
          <DailyTip />
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
