
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

export async function uploadImage(file: File, bucketName: string, isAuthenticated: boolean = false): Promise<string | null> {
  try {
    console.log(`Starting upload to bucket: ${bucketName}`);
    
    // For authentication check - first use the passed auth state or check if there's a professional ID in session
    let authValid = isAuthenticated;
    
    if (!authValid) {
      console.log("No authentication state provided, checking session directly");
      
      // Check for professional ID in localStorage (for OTP auth)
      const professionalId = localStorage.getItem('professionalId');
      
      // Double check with an actual session call as fallback
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData.session || professionalId) {
        console.log("Session or professional ID found, proceeding with upload");
        authValid = true;
      } else {
        console.error("No active session or professional ID found during image upload");
        toast.error("יש להתחבר מחדש כדי להעלות תמונה");
        return null;
      }
    } else {
      console.log("Using provided authentication state, proceeding with upload");
    }
    
    // Prepare file for upload
    const fileExt = file.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Use edge function for secure upload (bypassing RLS issues)
    console.log("Using edge function for secure upload");

    // Fallback: Use the edge function for upload
    console.log("Using edge function fallback for upload");
    
    // Create FormData to send the file
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", bucketName);
    
    const { data, error } = await supabase.functions.invoke('upload-image', {
      body: formData,
    });
    
    if (error) {
      console.error("Edge function upload failed:", error);
      toast.error(`שגיאה בהעלאת התמונה: ${error.message}`);
      
      // Try one more fallback bucket before giving up
      if (bucketName === 'proposal-samples') {
        console.log("Trying alternative bucket: lead-images");
        return uploadImage(file, 'lead-images', authValid);
      } else if (bucketName === 'lead-images') {
        console.log("Trying alternative bucket: proposal-samples");
        return uploadImage(file, 'proposal-samples', authValid);
      }
      return null;
    }

    console.log("Edge function upload successful:", data);
    return data.publicUrl;
  } catch (error) {
    console.error("Unexpected error uploading image:", error);
    toast.error("שגיאה בהעלאת התמונה");
    return null;
  }
}
