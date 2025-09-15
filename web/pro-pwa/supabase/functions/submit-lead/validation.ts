
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

export interface LeadSubmissionData {
  professional_id: string;
  title: string;
  description: string;
  location?: string;
  budget?: number;
  share_percentage?: number;
  status?: string;
  client_name?: string;
  client_phone?: string;
  client_address?: string;
  work_date?: string;
  work_time?: string;
  image_url?: string;
  notes?: string;
  media_urls?: string[];
  profession?: string;
  constraints?: string;
  latitude?: number;
  longitude?: number;
}

export const validateRequiredFields = (data: LeadSubmissionData): string | null => {
  if (!data.professional_id || !data.title || !data.description) {
    return "Missing required fields";
  }
  return null;
};

export const validateProfessionalExists = async (
  supabase: any,
  professionalId: string
): Promise<{ isValid: boolean; error?: string }> => {
  const { data: professionalData, error: professionalError } = await supabase
    .from('professionals')
    .select('id')
    .eq('id', professionalId)
    .single();
    
  if (professionalError || !professionalData) {
    console.error("Professional not found:", professionalError);
    return {
      isValid: false,
      error: "Professional not found. Please ensure your profile is properly set up."
    };
  }
  
  return { isValid: true };
};

export const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Server configuration error");
  }
  
  return createClient(supabaseUrl, supabaseKey);
};
