
import { useState, useEffect } from "react";
import { ProjectType } from "@/types/jobs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useProjects(professionalId: string | null) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = async () => {
    if (!professionalId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("Fetching projects for professional:", professionalId);
      
      const { data, error } = await supabase.functions.invoke('get-projects', {
        body: { professionalId },
      });
      
      if (error) {
        console.error("Error fetching projects from edge function:", error);
        throw error;
      }
      
      if (data && Array.isArray(data) && data.length > 0) {
        console.log("Received projects data:", data);
        
        const formattedProjects: ProjectType[] = data.map((project: any) => ({
          id: project.id,
          title: project.title,
          client: project.client,
          price: project.price,
          startDate: project.start_date,
          endDate: project.end_date,
          status: project.status,
          progress: project.progress || 0
        }));
        
        setProjects(formattedProjects);
      } else {
        console.log("No projects found in database, projects array is empty");
        setProjects([]);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      
      toast({
        title: "שגיאה בטעינת פרויקטים",
        description: "לא ניתן לטעון את רשימת הפרויקטים מבסיס הנתונים",
        variant: "destructive"
      });
      
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addProject = async (projectData: Omit<ProjectType, 'id'>) => {
    if (!professionalId) {
      toast({
        title: "שגיאה",
        description: "לא ניתן להוסיף פרויקט ללא זיהוי מקצועי",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log("Adding new project:", projectData);
      
      const { data, error } = await supabase.functions.invoke('insert-project', {
        body: { 
          project: {
            professionalId,
            title: projectData.title,
            client: projectData.client,
            price: projectData.price,
            startDate: projectData.startDate,
            endDate: projectData.endDate,
            status: projectData.status,
            progress: projectData.progress || 0
          }
        },
      });
      
      if (error) {
        console.error("Error adding project:", error);
        throw error;
      }
      
      console.log("Project added successfully:", data);
      
      // Refresh projects list
      await fetchProjects();
      
      toast({
        title: "פרויקט נוסף בהצלחה",
        description: "הפרויקט החדש נשמר במערכת"
      });
      
      return true;
    } catch (err) {
      console.error("Error adding project:", err);
      
      toast({
        title: "שגיאה בהוספת פרויקט",
        description: "לא ניתן לשמור את הפרויקט החדש",
        variant: "destructive"
      });
      
      return false;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [professionalId, toast]);

  return { projects, isLoading, addProject, refreshProjects: fetchProjects };
}
