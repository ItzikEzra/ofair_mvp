
import React, { useState } from "react";
import { ProjectType } from "@/types/jobs";
import ProjectCard from "@/components/jobs/ProjectCard";
import AddProjectDialog from "@/components/jobs/AddProjectDialog";
import UpdateProjectStatusDialog from "@/components/jobs/UpdateProjectStatusDialog";
import { useProjects } from "@/hooks/useProjects";
import { useProfessionalId } from "@/hooks/useProfessionalId";

interface ProjectsTabProps {
  projects: ProjectType[];
  setProjects: (projects: ProjectType[]) => Promise<boolean>;
  refreshProjects?: () => void;
}

const ProjectsTab: React.FC<ProjectsTabProps> = ({ projects, setProjects, refreshProjects }) => {
  const { professionalId } = useProfessionalId();
  const { addProject } = useProjects(professionalId);
  const [selectedProject, setSelectedProject] = useState<ProjectType | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  const handleAddProject = async (projectData: Omit<ProjectType, 'id'>) => {
    const success = await addProject(projectData);
    if (success && refreshProjects) {
      // Refresh the projects in the parent component as well
      await refreshProjects();
    }
    return success;
  };

  const handleUpdateStatus = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSelectedProject(project);
      setIsUpdateDialogOpen(true);
    }
  };

  const handleProjectUpdate = async (updatedProject: ProjectType) => {
    const updatedProjects = projects.map(project => 
      project.id === updatedProject.id ? updatedProject : project
    );
    
    const success = await setProjects(updatedProjects);
    if (success && refreshProjects) {
      await refreshProjects();
    }
    return success;
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-12" dir="rtl">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">אין פרויקטים</h3>
          <p className="text-gray-600">התחל על ידי הוספת הפרויקט הראשון שלך</p>
        </div>
        <AddProjectDialog onAdd={handleAddProject} />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">הפרויקטים שלי</h2>
        <AddProjectDialog onAdd={handleAddProject} />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            onUpdateStatus={() => handleUpdateStatus(project.id)} 
          />
        ))}
      </div>

      {selectedProject && (
        <UpdateProjectStatusDialog
          isOpen={isUpdateDialogOpen}
          onClose={() => {
            setIsUpdateDialogOpen(false);
            setSelectedProject(null);
          }}
          project={selectedProject}
          onUpdate={handleProjectUpdate}
        />
      )}
    </div>
  );
};

export default ProjectsTab;
