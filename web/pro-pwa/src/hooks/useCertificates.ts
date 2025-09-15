
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Certificate, CertificateUpload } from "@/types/certificates";
import { uploadImage } from "@/utils/imageUpload";
import { useProfessionalId } from "@/hooks/useProfessionalId";
import { getAuthToken } from "@/utils/storageUtils";

export const useCertificates = (professionalId: string | null) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { professionalId: contextProfessionalId } = useProfessionalId();

  const fetchCertificates = async () => {
    try {
      setIsLoading(true);
      
      // Use professional ID from context or parameter
      const currentProfId = professionalId || contextProfessionalId;
      
      if (!currentProfId) {
        console.log("No professional ID found");
        setCertificates([]);
        return;
      }
      
      console.log("Fetching certificates for professional:", currentProfId);
      
      // Get auth token for edge function
      const authToken = getAuthToken();
      
      if (!authToken) {
        console.log("No auth token found");
        setCertificates([]);
        return;
      }

      // Use Edge Function to fetch certificates
      const { data, error } = await supabase.functions.invoke('list-certificates', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      if (error) {
        console.error("Error fetching certificates:", error);
        toast({
          title: "שגיאה בטעינת התעודות",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      console.log("Certificates fetched:", data?.certificates?.length || 0);
      setCertificates(data?.certificates || []);
    } catch (error: any) {
      console.error("Unexpected error fetching certificates:", error);
      toast({
        title: "שגיאה בטעינת התעודות",
        description: "אירעה שגיאה לא צפויה",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadCertificate = async (upload: CertificateUpload): Promise<boolean> => {
    try {
      setIsUploading(true);
      
      // Use professional ID from context or parameter
      const currentProfId = professionalId || contextProfessionalId;
      
      if (!currentProfId) {
        toast({
          title: "שגיאה בהעלאת התעודה",
          description: "לא ניתן למצוא פרופיל מקצועי. נא להיכנס מחדש למערכת.",
          variant: "destructive"
        });
        return false;
      }
      
      // Upload file to storage
      const certificateUrl = await uploadImage(upload.file, 'professional-certificates', true);
      
      if (!certificateUrl) {
        throw new Error("שגיאה בהעלאת הקובץ");
      }

      // Save certificate data to database
      console.log("[CERTIFICATES DEBUG] Inserting certificate:", {
        professional_id: currentProfId,
        certificate_name: upload.name,
        file_name: upload.file.name
      });
      
      // Use edge function for secure upload with OTP token
      const authToken = getAuthToken();
      console.log('[CERTIFICATES DEBUG] Auth token from storage:', authToken ? 'Token found' : 'No token found');
      
      if (!authToken) {
        throw new Error('לא נמצא אסימון אימות. נא להיכנס מחדש למערכת.');
      }

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${authToken}`
      };

      console.log('[CERTIFICATES DEBUG] Calling edge function with headers:', headers);

      const { data, error } = await supabase.functions.invoke('upload-certificate', {
        body: {
          certificate_name: upload.name,
          certificate_url: certificateUrl,
          file_name: upload.file.name,
          file_size: upload.file.size
        },
        headers
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'שגיאה בשמירת התעודה');
      }

      toast({
        title: "תעודה הועלתה בהצלחה",
        description: `התעודה "${upload.name}" נשמרה בפרופיל שלך`
      });

      await fetchCertificates();
      return true;
    } catch (error: any) {
      console.error("Error uploading certificate:", error);
      toast({
        title: "שגיאה בהעלאת התעודה",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteCertificate = async (certificateId: string): Promise<boolean> => {
    try {
      // Get auth token for edge function
      const authToken = getAuthToken();
      
      if (!authToken) {
        toast({
          title: "שגיאה במחיקת התעודה",
          description: "לא נמצא אסימון אימות. נא להיכנס מחדש למערכת.",
          variant: "destructive"
        });
        return false;
      }

      // Use Edge Function to delete certificate
      const { data, error } = await supabase.functions.invoke('delete-certificate', {
        body: { certificate_id: certificateId },
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      if (error) {
        console.error("Error deleting certificate:", error);
        toast({
          title: "שגיאה במחיקת התעודה",
          description: error.message,
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "התעודה נמחקה בהצלחה",
        description: "התעודה הוסרה מהפרופיל שלך"
      });

      // Refresh certificates list
      await fetchCertificates();
      return true;
    } catch (error: any) {
      console.error("Unexpected error deleting certificate:", error);
      toast({
        title: "שגיאה במחיקת התעודה",
        description: "אירעה שגיאה לא צפויה",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    if (professionalId || contextProfessionalId) {
      fetchCertificates();
    }
  }, [professionalId, contextProfessionalId]);

  return {
    certificates,
    isLoading,
    isUploading,
    uploadCertificate,
    deleteCertificate,
    refetch: fetchCertificates
  };
};
