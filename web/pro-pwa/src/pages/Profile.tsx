
import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import ProfileForm from "@/components/profile/ProfileForm";
import CertificatesSection from "@/components/profile/CertificatesSection";

const Profile = () => {
  return (
    <MainLayout title="פרופיל מקצועי">
      <div className="min-h-screen">
        <div className="p-6">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl shadow-blue-500/10 border-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">פרופיל מקצועי</h2>
                  <p className="text-sm text-gray-600">נהל את הפרופיל והאישורים שלך</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <ProfileForm />
            <CertificatesSection />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
