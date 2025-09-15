
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfessionalId } from "@/hooks/useProfessionalId";
import { useAddressToCoords } from "@/hooks/useAddressToCoords";

interface FormData {
  title: string;
  description: string;
  extractedCity: string;
  profession: string;
  agreedPrice: string;
  constraints: string;
  sharePercentage: number[];
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  workDate: string;
  workTime: string;
  mediaUrls: string[];
  latitude: number | null;
  longitude: number | null;
}

export const useLeadSubmission = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { professionalId } = useProfessionalId();
  const { getCoordinates } = useAddressToCoords();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLead = async (formData: FormData, resubmitLeadId?: string | null) => {
    if (!professionalId) {
      toast({
        title: "שגיאה",
        description: "לא נמצא פרופיל בעל מקצוע",
        variant: "destructive"
      });
      return;
    }

    if (!formData.title || !formData.description || !formData.profession) {
      toast({
        title: "שגיאה",
        description: "יש למלא את כל השדות הנדרשים",
        variant: "destructive"
      });
      return;
    }

    if (!formData.clientAddress) {
      toast({
        title: "שגיאה",
        description: "יש למלא כתובת לקוח",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Enhanced coordinate and city handling
      let finalLatitude = formData.latitude;
      let finalLongitude = formData.longitude;
      let finalCity = formData.extractedCity;

      // If we have client address but no coordinates, try to get them
      if (formData.clientAddress && !formData.latitude && !formData.longitude) {
        console.log("Getting coordinates for client address before submitting");
        const coords = await getCoordinates(formData.clientAddress);
        if (coords) {
          finalLatitude = coords.lat;
          finalLongitude = coords.lng;
        }
      }

      // CRITICAL FIX: Ensure we have a proper city name - use extractedCity as the main location
      if (!finalCity || finalCity.trim() === "" || finalCity === "לא צוין") {
        console.log("No valid extractedCity, attempting fallback extraction from address");
        // Try to extract city from address as fallback
        if (formData.clientAddress) {
          const addressParts = formData.clientAddress.split(',');
          for (let i = addressParts.length - 2; i >= 0; i--) {
            const part = addressParts[i]?.trim();
            if (part && part.length >= 3 && !part.match(/^\d+$/) && !part.toLowerCase().includes('israel')) {
              finalCity = part;
              console.log("Fallback city extracted:", finalCity);
              break;
            }
          }
        }
      }

      // Final fallback
      if (!finalCity || finalCity.trim() === "") {
        finalCity = "לא צוין";
      }

      console.log("🚀 ENHANCED: Submitting lead with location data:", {
        extractedCity: finalCity,
        clientAddress: formData.clientAddress,
        coordinates: { lat: finalLatitude, lng: finalLongitude },
        source: formData.extractedCity && formData.extractedCity !== "לא צוין" && formData.extractedCity.length >= 3 ? "Google Places Enhanced" : "Fallback Processing"
      });

      const leadData = {
        professional_id: professionalId,
        title: formData.title,
        description: formData.description,
        // KEY FIX: Pass the extracted city directly in the location field
        location: finalCity,
        // Pass extractedCity as a separate field for the server to process
        extractedCity: finalCity,
        profession: formData.profession,
        budget: formData.agreedPrice ? parseFloat(formData.agreedPrice) : null,
        notes: formData.constraints,
        share_percentage: formData.sharePercentage[0],
        client_name: formData.clientName || null,
        client_phone: formData.clientPhone || null,
        client_address: formData.clientAddress || null,
        work_date: formData.workDate || null,
        work_time: formData.workTime || null,
        constraints: formData.constraints || null,
        media_urls: formData.mediaUrls.length > 0 ? formData.mediaUrls : null,
        status: 'active',
        latitude: finalLatitude,
        longitude: finalLongitude
      };

      console.log("📤 Final lead data being submitted:", leadData);

      const { error } = await supabase.functions.invoke('submit-lead', {
        body: leadData
      });

      if (error) {
        throw error;
      }

      const actionText = resubmitLeadId ? "הוגש מחדש" : "נשלח";
      toast({
        title: `הליד ${actionText} בהצלחה!`,
        description: "הליד שלך פורסם בלוח המודעות"
      });
      navigate("/my-leads");
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast({
        title: "שגיאה בשליחת הליד",
        description: "אירעה שגיאה בפרסום הליד. נסה שנית מאוחר יותר.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitLead,
    isSubmitting
  };
};
