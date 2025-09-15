
import { ProjectType } from "@/types/jobs";
import { supabase } from "@/integrations/supabase/client";

export async function saveProjects(
  updatedProjects: ProjectType[], 
  professionalId: string | null
): Promise<boolean> {
  if (!professionalId) {
    console.error("No professional ID available");
    return false;
  }
  
  try {
    for (const project of updatedProjects) {
      // Check if this is a new project (numeric ID)
      const isNewProject = typeof project.id === 'number';
      
      // Format for database
      const projectForDB = {
        professional_id: professionalId,
        title: project.title,
        client: project.client,
        price: project.price,
        start_date: project.startDate,
        end_date: project.endDate,
        status: project.status,
        progress: project.progress
      };
      
      if (isNewProject) {
        // For new projects, insert directly
        const { error } = await supabase
          .from('projects')
          .insert([projectForDB]);
        
        if (error) {
          console.error("Error saving new project:", error);
          throw error;
        }
      } else {
        // For existing projects, update directly
        const projectId = String(project.id); // Ensure ID is a string
        const { error } = await supabase
          .from('projects')
          .update(projectForDB)
          .eq('id', projectId);
        
        if (error) {
          console.error("Error updating project:", error);
          throw error;
        }

        // Create notification for significant project updates
        if (project.status === 'completed') {
          const notification = {
            professional_id: professionalId,
            type: 'project_completed',
            title: 'פרויקט הושלם',
            description: `הפרויקט "${project.title}" הושלם בהצלחה`,
            related_id: String(project.id), // Convert to string
            related_type: 'project'
          };
          
          const { success } = await import('./secureProjectService').then(mod => 
            mod.SecureProjectService.createNotification(notification)
          );
        }
      }
    }
    
    return true;
  } catch (err) {
    console.error("Unexpected error saving projects:", err);
    return false;
  }
}
