
import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import ClientsHistory from "@/components/history/ClientsHistory";

const History = () => {
  return (
    <MainLayout title="לקוחות והיסטוריה">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-yellow-50/20">
        {/* Floating background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-32 right-1/4 w-72 h-72 bg-gradient-to-br from-orange-400/15 to-amber-400/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 left-1/3 w-56 h-56 bg-gradient-to-br from-yellow-400/15 to-orange-400/15 rounded-full blur-3xl"></div>
          <div className="absolute top-2/3 right-16 w-40 h-40 bg-gradient-to-br from-amber-400/15 to-yellow-400/15 rounded-full blur-3xl"></div>
        </div>

        <div className="p-6">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl shadow-orange-500/10 border-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">לקוחות והיסטוריה</h2>
                  <p className="text-sm text-gray-600">היסטוריית עבודות ופרטי לקוחות</p>
                </div>
              </div>
            </div>
          </div>

          <ClientsHistory />
        </div>
      </div>
    </MainLayout>
  );
};

export default History;
