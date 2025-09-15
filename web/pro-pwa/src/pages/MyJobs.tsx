import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useLocation } from "react-router-dom";
import JobTabs from "@/components/jobs/JobTabs";
import LoadingState from "@/components/jobs/LoadingState";
import { useProfessionalId } from "@/hooks/useProfessionalId";
import { useProjects } from "@/hooks/useProjects";
import { useDirectInquiries } from "@/hooks/useDirectInquiries";
import { useProposals } from "@/hooks/useProposals";
import { Briefcase } from "lucide-react";
const MyJobs = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("proposals");

  // Get professional ID
  const {
    professionalId,
    isLoading: isLoadingProfessional
  } = useProfessionalId();

  // Get projects data
  const {
    projects,
    isLoading: isLoadingProjects,
    refreshProjects
  } = useProjects(professionalId);

  // Get direct inquiries data
  const {
    directInquiries,
    setDirectInquiries,
    isLoading: isLoadingDirectInquiries,
    error: directInquiriesError,
    refreshInquiries: refreshDirectInquiries
  } = useDirectInquiries(professionalId);

  // Get proposals data
  const {
    submittedProposals,
    receivedProposals,
    isLoading: isLoadingProposals,
    refreshProposals
  } = useProposals();

  // Parse URL parameters and handle proposal submission events
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get("tab");
    const proposalId = searchParams.get("proposalId");
    if (tabParam === "projects" || tabParam === "proposals" || tabParam === "inquiries") {
      setActiveTab(tabParam);
    }

    // If there's a proposalId, ensure we're on the proposals tab and scroll to it
    if (proposalId && tabParam === "proposals") {
      setTimeout(() => {
        const proposalElement = document.getElementById(`proposal-${proposalId}`);
        if (proposalElement) {
          proposalElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          // Add a highlight effect
          proposalElement.classList.add('animate-pulse');
          setTimeout(() => {
            proposalElement.classList.remove('animate-pulse');
          }, 2000);
        }
      }, 500);
    }

    // Listen for proposal submission events
    const handleProposalSubmitted = (event: CustomEvent) => {
      const {
        proposalId: newProposalId
      } = event.detail;

      // Switch to proposals tab
      setActiveTab('proposals');

      // Refresh proposals data
      if (refreshProposals) {
        refreshProposals();
      }

      // Update URL and scroll to new proposal
      const newUrl = `/my-jobs?tab=proposals&proposalId=${newProposalId}`;
      window.history.pushState({}, '', newUrl);

      // Scroll to the new proposal after a short delay
      setTimeout(() => {
        const proposalElement = document.getElementById(`proposal-${newProposalId}`);
        if (proposalElement) {
          proposalElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          proposalElement.classList.add('animate-pulse');
          setTimeout(() => {
            proposalElement.classList.remove('animate-pulse');
          }, 2000);
        }
      }, 1000);
    };
    window.addEventListener('proposalSubmitted', handleProposalSubmitted as EventListener);
    return () => {
      window.removeEventListener('proposalSubmitted', handleProposalSubmitted as EventListener);
    };
  }, [location, refreshProposals]);

  // Show loading state only if professional ID is still loading
  if (isLoadingProfessional) {
    return <MainLayout title="העבודות שלי">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
          <LoadingState />
        </div>
      </MainLayout>;
  }
  return <MainLayout title="העבודות שלי">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        {/* Floating background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-40 right-1/4 w-64 h-64 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-32 left-1/3 w-48 h-48 bg-gradient-to-br from-blue-400/15 to-cyan-400/15 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 right-10 w-32 h-32 bg-gradient-to-br from-emerald-400/15 to-teal-400/15 rounded-full blur-3xl"></div>
        </div>

        <div className="p-6">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl shadow-purple-500/10 border-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25 mx-0 px-[12px]">
                  <Briefcase size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">העבודות שלי</h2>
                  <p className="text-sm text-gray-600">ניהול כל הפרויקטים וההצעות שלך במקום אחד</p>
                </div>
              </div>
            </div>
          </div>

           {/* Jobs Content */}
           <JobTabs activeTab={activeTab} setActiveTab={setActiveTab} projects={projects} proposals={[...submittedProposals, ...receivedProposals]} directInquiries={directInquiries} setDirectInquiries={setDirectInquiries} setProposals={() => {}} refreshProposals={refreshProposals || (() => {})} professionalId={professionalId} directInquiriesError={directInquiriesError} refreshDirectInquiries={refreshDirectInquiries} refreshProjects={refreshProjects} isLoadingProjects={isLoadingProjects} highlightedProposalId={new URLSearchParams(location.search).get("proposalId")} />
        </div>
      </div>
    </MainLayout>;
};
export default MyJobs;