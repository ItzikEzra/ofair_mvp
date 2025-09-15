
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectType, ProposalType, DirectInquiryType } from "@/types/jobs";
import ProjectsTab from "@/components/jobs/ProjectsTab";
import ProposalsTab from "@/components/jobs/ProposalsTab";
import DirectInquiriesTab from "@/components/jobs/DirectInquiriesTab";
import ProjectsLoadingState from "@/components/jobs/ProjectsLoadingState";
import { useToast } from "@/hooks/use-toast";
import { saveProjects } from "@/services/projectService";

interface JobTabsProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  projects: ProjectType[];
  proposals: ProposalType[];
  directInquiries: DirectInquiryType[];
  setDirectInquiries: (inquiries: DirectInquiryType[]) => void;
  setProposals?: (proposals: ProposalType[]) => void;
  refreshProposals?: () => void;
  professionalId: string | null;
  directInquiriesError?: string | null;
  refreshDirectInquiries?: () => void;
  refreshProjects?: () => void;
  isLoadingProjects?: boolean;
  highlightedProposalId?: string | null;
}

const JobTabs: React.FC<JobTabsProps> = ({
  activeTab,
  setActiveTab,
  projects,
  proposals,
  directInquiries,
  setDirectInquiries,
  setProposals,
  refreshProposals,
  professionalId,
  directInquiriesError,
  refreshDirectInquiries,
  refreshProjects,
  isLoadingProjects = false,
  highlightedProposalId
}) => {
  const { toast } = useToast();

  const handleSaveProjects = async (updatedProjects: ProjectType[]) => {
    const success = await saveProjects(updatedProjects, professionalId);
    if (success) {
      toast({
        title: "פרויקטים נשמרו",
        description: "השינויים נשמרו בהצלחה",
      });
    } else {
      toast({
        title: "שגיאה בשמירת פרויקטים",
        description: "אירעה שגיאה בלתי צפויה",
        variant: "destructive",
      });
    }
    return success;
  };

  return (
    <div dir="rtl">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-lg">
          <TabsTrigger value="proposals" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">הצעות מחיר</TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white">פרויקטים</TabsTrigger>
          <TabsTrigger value="inquiries" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">פניות ישירות</TabsTrigger>
        </TabsList>
        
        <TabsContent value="proposals">
          <ProposalsTab
            proposals={proposals}
            setProposals={setProposals}
            refreshProposals={refreshProposals}
            onlySubmitted={true}
            highlightedProposalId={highlightedProposalId}
          />
        </TabsContent>
        
        <TabsContent value="projects">
          {isLoadingProjects ? (
            <ProjectsLoadingState />
          ) : (
            <ProjectsTab
              projects={projects}
              setProjects={handleSaveProjects}
              refreshProjects={refreshProjects}
            />
          )}
        </TabsContent>
        
        <TabsContent value="inquiries">
          <DirectInquiriesTab
            inquiries={directInquiries}
            setInquiries={setDirectInquiries}
            error={directInquiriesError}
            refreshInquiries={refreshDirectInquiries}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default JobTabs;
