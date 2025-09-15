import { supabase } from "@/integrations/supabase/client";
import { getAuthToken } from "@/utils/storageUtils";

/**
 * Service for secure professional data access
 * Handles both public (non-sensitive) and authenticated (full) professional data
 */
export class SecureProfessionalService {
  
  /**
   * Get public professional data (safe for display, no contact info)
   * SECURITY: This method excludes all sensitive contact information
   */
  static async getPublicProfessionals() {
    try {
      console.log("Fetching public professionals via secure database function");
      
      // Use the secure database function directly
      const { data, error } = await supabase.rpc('get_public_professionals_secure');
      
      if (error) {
        console.error("Error from secure professionals function:", error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} professionals with secure data filtering`);
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching secure public professionals:', error);
      return { data: [], error };
    }
  }

  /**
   * Get professional by identifier (phone/email) - returns full data for authenticated requests only
   */
  static async getProfessionalByIdentifier(identifier: string, isEmail: boolean = false) {
    try {
      const { data, error } = await supabase.rpc('get_professional_by_identifier', {
        identifier_param: identifier,
        is_email_param: isEmail
      });
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching professional by identifier:', error);
      return { data: null, error };
    }
  }

  /**
   * Get own complete professional profile (includes sensitive data)
   * Only works for authenticated users accessing their own data
   */
  static async getOwnProfile(professionalId: string) {
    try {
      console.log('getOwnProfile called with professionalId:', professionalId);
      
      // Get the auth token from localStorage
      const authToken = getAuthToken();
      console.log('Auth token available for profile fetch:', !!authToken);
      
      // Get current professional ID using updated function
      const { data: currentProf, error: currentError } = await supabase.rpc('get_current_professional_id_secure', {
        token_param: authToken
      });
      
      if (currentError) {
        console.error('Error getting current professional ID:', currentError);
        throw currentError;
      }
      
      const currentProfessionalId = currentProf;
      console.log('Current professional ID from function:', currentProfessionalId);
      
      if (!currentProfessionalId) {
        throw new Error('לא ניתן לזהות מקצוען מחובר');
      }
      
      // Fetch the profile data
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', currentProfessionalId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile from database:', error);
        throw error;
      }
      
      if (!data) {
        console.log('No profile data found for professional ID:', currentProfessionalId);
        throw new Error('לא נמצא פרופיל מקצועי');
      }
      
      console.log('Profile data fetched successfully:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching own profile:', error);
      return { data: null, error };
    }
  }

  /**
   * Update own professional profile
   */
  static async updateOwnProfile(professionalId: string, updates: any) {
    try {
      console.log('updateOwnProfile called with data:', updates);
      
      // Get the auth token from localStorage
      const authToken = getAuthToken();
      console.log('Auth token available for profile update:', !!authToken);
      
      // Get current professional ID from secure function
      const { data: currentProf, error: currentError } = await supabase.rpc('get_current_professional_id_secure', {
        token_param: authToken
      });
      
      if (currentError || !currentProf) {
        console.error('Error getting current professional ID for update:', currentError);
        throw new Error('לא ניתן לזהות מקצוען מחובר');
      }
      
      // Add timestamp for update tracking
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('professionals')
        .update(updateData)
        .eq('id', currentProf)
        .select()
        .maybeSingle();
      
      if (error) {
        console.error('Error updating professional profile:', error);
        return { data: null, error };
      }

      // Update local storage with fresh data
      if (data) {
        const { saveProfessionalData } = await import('@/utils/storageUtils');
        saveProfessionalData(data);
      }

      console.log('Profile updated successfully:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { data: null, error };
    }
  }
}