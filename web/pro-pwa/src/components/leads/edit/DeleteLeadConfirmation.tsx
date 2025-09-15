
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/leads";

interface DeleteLeadConfirmationProps {
  lead: Lead;
  isDeleting: boolean;
  setIsDeleting: (value: boolean) => void;
  onLeadUpdated: () => void;
  onClose: () => void;
  disabled?: boolean;
}

const DeleteLeadConfirmation: React.FC<DeleteLeadConfirmationProps> = ({
  lead,
  isDeleting,
  setIsDeleting,
  onLeadUpdated,
  onClose,
  disabled = false
}) => {
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הליד? פעולה זו לא ניתנת לביטול וכל ההצעות הקשורות אליו יידחו.")) {
      return;
    }

    setIsDeleting(true);
    
    try {
      console.log("Calling delete-lead edge function for lead:", lead.id);
      
      const { data, error } = await supabase.functions.invoke('delete-lead', {
        body: { leadId: lead.id }
      });

      if (error) {
        console.error("Error from delete-lead function:", error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to delete lead");
      }

      console.log("Lead deleted successfully:", data);
      
      toast({
        title: "הליד נמחק בהצלחה",
        description: "הליד וכל ההצעות הקשורות אליו נמחקו מהמערכת"
      });

      onLeadUpdated();
      onClose();
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast({
        title: "שגיאה במחיקת הליד",
        description: "אירעה שגיאה במחיקת הליד. נסה שוב מאוחר יותר.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      onClick={handleDelete}
      disabled={isDeleting || disabled}
      variant="destructive"
      className="flex-1"
    >
      {isDeleting ? (
        <>
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          מוחק...
        </>
      ) : (
        <>
          <Trash2 className="ml-2 h-4 w-4" />
          מחק ליד
        </>
      )}
    </Button>
  );
};

export default DeleteLeadConfirmation;
