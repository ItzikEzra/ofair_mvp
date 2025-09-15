
import { useState, useEffect } from "react";
import { Lead } from "@/types/leads";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseEditLeadFormProps {
  lead: Lead;
  open: boolean;
  onLeadUpdated: () => void;
  onClose: () => void;
}

export const useEditLeadForm = ({ lead, open, onLeadUpdated, onClose }: UseEditLeadFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [profession, setProfession] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [constraints, setConstraints] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [workTime, setWorkTime] = useState("");
  const [sharePercentage, setSharePercentage] = useState([0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (lead && open) {
      console.log("Loading lead data for editing:", lead);
      setTitle(lead.title || "");
      setDescription(lead.description || "");
      setCity(lead.location || "");
      setProfession(lead.profession || "");
      setEstimatedPrice(lead.budget?.toString() || "");
      setNotes(lead.notes || "");
      setConstraints(lead.constraints || "");
      setClientName(lead.client_name || "");
      setClientPhone(lead.client_phone || "");
      setClientAddress(lead.client_address || "");
      setWorkDate(lead.work_date || "");
      setWorkTime(lead.work_time || "");
      setSharePercentage([lead.share_percentage || 0]);
    }
  }, [lead, open]);

  const handleClientAddressChange = (newAddress: string) => {
    setClientAddress(newAddress);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    
    try {
      console.log("Saving lead with data:", {
        id: lead.id,
        title,
        description,
        location: city,
        profession,
        budget: estimatedPrice ? parseFloat(estimatedPrice) : null,
        notes,
        constraints,
        client_name: clientName,
        client_phone: clientPhone,
        client_address: clientAddress,
        work_date: workDate || null,
        work_time: workTime || null,
        share_percentage: sharePercentage[0]
      });

      const { error } = await supabase
        .from('leads')
        .update({
          title,
          description,
          location: city,
          profession: profession,
          budget: estimatedPrice ? parseFloat(estimatedPrice) : null,
          notes,
          constraints,
          client_name: clientName,
          client_phone: clientPhone,
          client_address: clientAddress,
          work_date: workDate || null,
          work_time: workTime || null,
          share_percentage: sharePercentage[0]
        } as any)
        .eq('id', lead.id as any);

      if (error) {
        console.error("Error updating lead:", error);
        throw error;
      }

      console.log("Lead updated successfully");
      toast({
        title: "הליד עודכן בהצלחה",
        description: "הפרטים נשמרו במערכת"
      });

      onLeadUpdated();
      onClose();
    } catch (error) {
      console.error("Error updating lead:", error);
      toast({
        title: "שגיאה בעדכון הליד",
        description: error?.message || "אירעה שגיאה בשמירת הפרטים",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData: {
      title,
      description,
      city,
      profession,
      estimatedPrice,
      notes,
      constraints,
      clientName,
      clientPhone,
      clientAddress,
      workDate,
      workTime,
      sharePercentage
    },
    setters: {
      setTitle,
      setDescription,
      setCity,
      setProfession,
      setEstimatedPrice,
      setNotes,
      setConstraints,
      setClientName,
      setClientPhone,
      setClientAddress: handleClientAddressChange,
      setWorkDate,
      setWorkTime,
      setSharePercentage
    },
    state: {
      isSubmitting,
      isDeleting,
      setIsDeleting
    },
    actions: {
      handleSave
    }
  };
};
