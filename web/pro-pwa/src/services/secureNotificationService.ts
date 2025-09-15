import { supabase } from "@/integrations/supabase/client";

/**
 * Service for secure notification data access
 * Uses proper authentication methods for both OTP and email/password users
 */
export class SecureNotificationService {
  
  /**
   * Get notifications for the current professional
   */
  static async getNotifications() {
    try {
      console.log("Fetching notifications via direct database query");
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error from notifications query:", error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} notifications`);
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { data: [], error };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select();
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete notifications
   */
  static async deleteNotifications(notificationIds: string[]) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds)
        .select();
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error deleting notifications:', error);
      return { data: null, error };
    }
  }
}