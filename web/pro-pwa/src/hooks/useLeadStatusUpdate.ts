
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useLeadStatusUpdate = (leadId: string, onSuccess: () => void) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    console.log("Updating lead status:", leadId, "to:", newStatus);
    
    try {
      // Use the edge function for status updates
      const { data, error } = await supabase.functions.invoke('update-lead-status', {
        body: { 
          leadId: leadId,
          status: newStatus 
        }
      });

      console.log("Response from update-lead-status function:", { data, error });

      if (error) {
        console.error("Error from update-lead-status function:", error);
        toast({
          title: "שגיאה",
          description: "לא ניתן היה לעדכן את סטטוס הליד",
          variant: "destructive"
        });
        return;
      }

      // Check if the response indicates success
      if (!data || !data.success) {
        console.error("Update failed:", data?.error || data);
        toast({
          title: "שגיאה",
          description: data?.error || "לא ניתן היה לעדכן את סטטוס הליד",
          variant: "destructive"
        });
        return;
      }

      console.log("Lead status updated successfully:", data);
      
      const statusMessages = {
        'completed': 'הליד הושלם בהצלחה',
        'cancelled': 'הליד בוטל בהצלחה',
        'active': 'הליד הופעל מחדש'
      };
      
      toast({
        title: "הסטטוס עודכן",
        description: statusMessages[newStatus as keyof typeof statusMessages] || "סטטוס הליד עודכן בהצלחה"
      });
      
      // Call the success callback to refresh the UI
      onSuccess();
    } catch (err) {
      console.error("Failed to update lead status:", err);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בלתי צפויה",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return { isUpdating, handleUpdateStatus };
};
