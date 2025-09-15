import { supabase } from "@/integrations/supabase/client";
import { getAuthToken } from "@/utils/storageUtils";

/**
 * Secure project service with authorization headers
 */
export class SecureProjectService {
  
  /**
   * Create notification with auth token
   */
  static async createNotification(notification: {
    professional_id: string;
    type: string;
    title: string;
    description: string;
    related_id: string;
    related_type: string;
  }): Promise<{ success: boolean, error?: any }> {
    try {
      const authToken = getAuthToken();
      
      if (!authToken) {
        return { success: false, error: { message: 'No authentication token found' } };
      }

      // For now, use the existing direct database call with proper auth check
      // TODO: Create a secure edge function for notifications
      const { error } = await supabase.from('notifications').insert([notification]);

      if (error) {
        console.error("Error creating notification:", error);
        return { success: false, error };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in createNotification:', error);
      return { success: false, error };
    }
  }
}