
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Notification } from "@/types/notifications";

interface UseNotificationApiProps {
  professionalId: string | null;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useNotificationApi({ professionalId, setNotifications, setIsLoading }: UseNotificationApiProps) {
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!professionalId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('get-notifications', {
        body: { professionalId }
      });

      if (error) {
        throw error;
      }

      setNotifications(data || []);
    } catch (err) {
      toast({
        title: "שגיאה בטעינת התראות",
        description: "לא ניתן לטעון את ההתראות כרגע",
        variant: "destructive"
      });
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [professionalId, setNotifications, setIsLoading, toast]);

  // actions return boolean if they succeeded
  const markAsRead = async (notificationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('id', notificationId as any);

      if (error) {
        toast({
          title: "שגיאה בעדכון התראה",
          description: "לא ניתן לסמן כהתראה נקראה",
          variant: "destructive"
        });
        return false;
      }
      await fetchNotifications();
      return true;
    } catch {
      toast({
        title: "שגיאה בעדכון התראה",
        description: "לא ניתן לסמן כהתראה נקראה",
        variant: "destructive"
      });
      return false;
    }
  };

  const markAllAsRead = async (notifications: Notification[]): Promise<boolean> => {
    if (notifications.length === 0 || !professionalId) return true;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('professional_id', professionalId as any)
        .is('is_read', false);

      if (error) {
        toast({
          title: "שגיאה בסימון כל ההתראות",
          description: "לא הצלחנו לסמן את ההתראות.",
          variant: "destructive"
        });
        return false;
      }
      await fetchNotifications();
      return true;
    } catch {
      toast({
        title: "שגיאה בסימון כל ההתראות",
        description: "לא הצלחנו לסמן את ההתראות.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteNotification = async (notificationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId as any);

      if (error) {
        toast({
          title: "שגיאה במחיקת התראה",
          description: "לא ניתן למחוק את ההתראה",
          variant: "destructive"
        });
        return false;
      }
      await fetchNotifications();
      toast({
        title: "התראה נמחקה",
        description: "ההתראה נמחקה בהצלחה.",
      });
      return true;
    } catch {
      toast({
        title: "שגיאה במחיקת התראה",
        description: "לא ניתן למחוק את ההתראה",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
