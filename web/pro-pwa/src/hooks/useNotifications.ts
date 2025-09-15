
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Notification, ClientDetails } from "@/types/notifications";

export const useNotifications = (professionalId: string | null) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    console.log("[NOTIFICATIONS DEBUG] Starting fetchNotifications for professionalId:", professionalId);
    
    if (!professionalId) {
      console.log("[NOTIFICATIONS DEBUG] No professional ID provided, clearing notifications");
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("[NOTIFICATIONS DEBUG] Getting current session...");
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("[NOTIFICATIONS DEBUG] Current session user:", sessionData?.session?.user?.id);
      
      // For OTP users (no auth session), use edge function with service role
      if (!sessionData?.session?.user) {
        console.log("[NOTIFICATIONS DEBUG] No auth session found, using edge function for OTP user...");
        
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('get-notifications', {
          body: { professionalId }
        });
        
        if (edgeError) {
          console.error("[NOTIFICATIONS DEBUG] Edge function error:", edgeError);
          setError('שגיאה בטעינת התראות: ' + edgeError.message);
          setNotifications([]);
          return;
        }
        
        if (edgeData) {
          const transformedData = edgeData.map((item: any) => ({
            ...item,
            client_details: item.client_details as ClientDetails | null
          }));
          setNotifications(transformedData);
          setError(null);
        } else {
          setNotifications([]);
        }
        return;
      }
      
      // For authenticated users, try direct query
      console.log("[NOTIFICATIONS DEBUG] Attempting direct query to notifications table...");
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('professional_id', professionalId as any)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error("[NOTIFICATIONS DEBUG] Error fetching notifications:", fetchError);
        setError('שגיאה בטעינת התראות: ' + fetchError.message);
        setNotifications([]);
        return;
      }
      
      console.log(`[NOTIFICATIONS DEBUG] Successfully fetched ${data?.length || 0} notifications`);

      const transformedData = (data || []).map((item: any) => ({
        ...item,
        client_details: item.client_details as ClientDetails | null
      }));

      setNotifications(transformedData);
    } catch (err: any) {
      console.error('[NOTIFICATIONS DEBUG] Failed to fetch notifications:', err);
      setError('שגיאה בטעינת התראות: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [professionalId]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    console.log("[NOTIFICATIONS DEBUG] Marking notification as read:", notificationId);
    
    // Optimistic update - update local state immediately
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, is_read: true }
          : notification
      )
    );
    
    try {
      // Check if we have an auth session
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session?.user) {
        console.log("[NOTIFICATIONS DEBUG] No auth session, using edge function for mark as read");
        const { error } = await supabase.functions.invoke('mark-notification-read', {
          body: { notificationId }
        });
        
        if (error) {
          console.error('Error marking notification as read via edge function:', error);
          // Rollback optimistic update on error
          setNotifications(prev => 
            prev.map(notification => 
              notification.id === notificationId 
                ? { ...notification, is_read: false }
                : notification
            )
          );
          return false;
        }
        
        console.log("[NOTIFICATIONS DEBUG] Notification marked as read successfully via edge function");
        return true;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('id', notificationId as any);

      if (error) {
        console.error('Error marking notification as read:', error);
        // Rollback optimistic update on error
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, is_read: false }
              : notification
          )
        );
        return false;
      }

      console.log("[NOTIFICATIONS DEBUG] Notification marked as read successfully");
      return true;
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      // Rollback optimistic update on error
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: false }
            : notification
        )
      );
      return false;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!professionalId) return false;
    
    // Optimistic update - mark all unread notifications as read immediately
    const previousNotifications = notifications;
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, is_read: true }))
    );
    
    try {
      // Check if we have an auth session
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session?.user) {
        console.log("[NOTIFICATIONS DEBUG] No auth session, using edge function for mark all as read");
        const { error } = await supabase.functions.invoke('delete-notifications', {
          body: { professionalId, type: 'markAllAsRead' }
        });
        
        if (error) {
          console.error('Error marking all notifications as read via edge function:', error);
          // Rollback optimistic update on error
          setNotifications(previousNotifications);
          return false;
        }
        
        return true;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('professional_id', professionalId as any)
        .eq('is_read', false as any);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        // Rollback optimistic update on error
        setNotifications(previousNotifications);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      // Rollback optimistic update on error
      setNotifications(previousNotifications);
      return false;
    }
  }, [professionalId, notifications]);

  // Delete all notifications
  const deleteAllNotifications = useCallback(async (): Promise<boolean> => {
    if (!professionalId) return false;
    
    try {
      // Check if we have an auth session
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session?.user) {
        console.log("[NOTIFICATIONS DEBUG] No auth session, using edge function for delete all");
        const { error } = await supabase.functions.invoke('delete-notifications', {
          body: { professionalId, type: 'deleteAll' }
        });
        
        if (error) {
          console.error('Error deleting all notifications via edge function:', error);
          return false;
        }
        
        return true;
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('professional_id', professionalId as any);

      if (error) {
        console.error('Error deleting all notifications:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Failed to delete all notifications:', err);
      return false;
    }
  }, [professionalId]);

  // Get notification with client details
  const getNotificationWithClientDetails = useCallback((notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    return notification;
  }, [notifications]);

  // Initial fetch when professionalId changes
  useEffect(() => {
    if (professionalId) {
      fetchNotifications();
    }
  }, [professionalId, fetchNotifications]);

  return {
    notifications,
    setNotifications,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteAllNotifications,
    getNotificationWithClientDetails,
    refetch: fetchNotifications
  };
};
