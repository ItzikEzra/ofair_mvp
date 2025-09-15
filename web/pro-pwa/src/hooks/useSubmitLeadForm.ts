
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import LeadsService from "@/services/leadsService";

export const useSubmitLeadForm = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const resubmitLeadId = searchParams.get('resubmit');

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    extractedCity: "",
    profession: "",
    agreedPrice: "",
    constraints: "",
    sharePercentage: [5],
    clientName: "",
    clientPhone: "",
    clientAddress: "",
    workDate: "",
    workTime: "",
    mediaUrls: [] as string[],
    latitude: null as number | null,
    longitude: null as number | null,
    hasLocationData: false
  });

  // Load existing lead data if resubmitting
  useEffect(() => {
    const loadLeadData = async () => {
      if (!resubmitLeadId) return;

      try {
        const lead = await LeadsService.getLeadById(resubmitLeadId);

        if (lead) {
          // Handle both consumer and professional lead types
          const isProfessionalLead = lead.type === 'professional_referral';

          setFormData({
            title: lead.title || "",
            description: isProfessionalLead
              ? (lead as any).estimated_budget?.toString() || ""
              : (lead as any).full_description || "",
            extractedCity: lead.location || "",
            profession: lead.category || "",
            agreedPrice: isProfessionalLead
              ? (lead as any).estimated_budget?.toString() || ""
              : lead.final_amount?.toString() || "",
            constraints: "", // Not directly mapped
            sharePercentage: isProfessionalLead
              ? [(lead as any).referrer_share_percentage || 5]
              : [5],
            clientName: (lead as any).client_name || "",
            clientPhone: (lead as any).client_phone || "",
            clientAddress: isProfessionalLead
              ? ""
              : (lead as any).client_address || "",
            workDate: isProfessionalLead
              ? (lead as any).preferred_sched || ""
              : "",
            workTime: "",
            mediaUrls: isProfessionalLead
              ? (lead as any).attachments || []
              : [],
            latitude: null, // Location data would need to be parsed
            longitude: null,
            hasLocationData: false
          });

          toast({
            title: "נתוני הליד נטענו",
            description: "נתוני הליד הקודם נטענו. עדכן את התאריך והשעה לפי הצורך"
          });
        }
      } catch (err) {
        console.error('Error loading lead data:', err);
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את נתוני הליד",
          variant: "destructive"
        });
      }
    };

    loadLeadData();
  }, [resubmitLeadId, toast]);

  const updateFormData = (updates: Partial<typeof formData> | ((prev: typeof formData) => Partial<typeof formData>)) => {
    if (typeof updates === 'function') {
      setFormData(prev => ({ ...prev, ...updates(prev) }));
    } else {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  };

  return {
    formData,
    updateFormData,
    resubmitLeadId
  };
};
