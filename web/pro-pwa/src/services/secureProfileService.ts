import { supabase } from "@/integrations/supabase/client";
import { getAuthToken } from "@/utils/storageUtils";
import { Professional } from "@/types/profile";

/**
 * Service for secure professional profile operations using auth tokens
 */
export class SecureProfileService {
  
  /**
   * Get own professional profile with auth token
   */
  static async getOwnProfile(): Promise<{ data: Professional | null, error: any }> {
    try {
      const authToken = getAuthToken();
      
      if (!authToken) {
        return { data: null, error: { message: 'No authentication token found' } };
      }

      const { data, error } = await supabase.functions.invoke('get-professional-profile', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (error) {
        console.error("Error fetching profile via secure function:", error);
        return { data: null, error };
      }
      
      return { data: data?.professional || null, error: null };
    } catch (error) {
      console.error('Error in getOwnProfile:', error);
      return { data: null, error };
    }
  }

  /**
   * Update own professional profile with auth token
   */
  static async updateOwnProfile(updates: Partial<Professional>): Promise<{ data: Professional | null, error: any }> {
    try {
      const authToken = getAuthToken();
      
      if (!authToken) {
        return { data: null, error: { message: 'No authentication token found' } };
      }

      const { data, error } = await supabase.functions.invoke('update-professional-profile', {
        body: { updates },
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (error) {
        console.error("Error updating profile via secure function:", error);
        return { data: null, error };
      }
      
      return { data: data?.professional || null, error: null };
    } catch (error) {
      console.error('Error in updateOwnProfile:', error);
      return { data: null, error };
    }
  }
}