
import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useProfessionalId } from "@/hooks/useProfessionalId";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FileText } from "lucide-react";

import LeadsFilter from "@/components/leads/LeadsFilter";
import LeadsLoading from "@/components/leads/LeadsLoading";
import LeadsError from "@/components/leads/LeadsError";
import EmptyLeadsList from "@/components/leads/EmptyLeadsList";
import LeadsList from "@/components/leads/LeadsList";
import { useLeads } from "@/hooks/useLeads";
import { useStorageBuckets } from "@/hooks/useStorageBuckets";

const MyLeads = () => {
  const [activeTab, setActiveTab] = useState("active");
  const { professionalId } = useProfessionalId();
  const { leads, isLoading, error, getFilteredLeads, refreshLeads } = useLeads({ professionalId });

  // Initialize storage buckets
  useStorageBuckets();

  const filteredLeads = getFilteredLeads(activeTab);

  return (
    <MainLayout title="הלידים שלי">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        {/* Floating background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-32 left-1/4 w-72 h-72 bg-gradient-to-br from-green-400/15 to-blue-400/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 right-1/3 w-56 h-56 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"></div>
          <div className="absolute top-2/3 left-16 w-40 h-40 bg-gradient-to-br from-yellow-400/15 to-orange-400/15 rounded-full blur-3xl"></div>
        </div>

        <div className="px-6 pb-20" dir="rtl">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl shadow-green-500/10 border-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
                  <FileText size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">הלידים שלי</h2>
                  <p className="text-sm text-gray-600">ניהול כל הלידים שפרסמת</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <LeadsFilter
              activeTab={activeTab}
              onValueChange={setActiveTab}
            />
            <TabsContent value={activeTab} className="w-full">
              {isLoading ? (
                <LeadsLoading />
              ) : error ? (
                <LeadsError 
                  errorMessage={error} 
                  onRetry={refreshLeads}
                />
              ) : filteredLeads.length === 0 ? (
                <EmptyLeadsList activeTab={activeTab} />
              ) : (
                <LeadsList leads={filteredLeads} onLeadChange={refreshLeads} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
};

export default MyLeads;
