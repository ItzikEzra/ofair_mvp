
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useProfessionalId } from './useProfessionalId';

interface WorkCompletionNotification {
  id: string;
  title: string;
  description: string;
  related_id: string;
  related_type: string;
  created_at: string;
  proposal_details?: {
    id: string;
    description: string;
    lead_title?: string;
    request_title?: string;
  };
}

export const useWorkCompletionNotifications = () => {
  const [notifications, setNotifications] = useState<WorkCompletionNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { professionalId } = useProfessionalId();

  const fetchWorkCompletionNotifications = useCallback(async () => {
    if (!professionalId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('professional_id', professionalId as any)
        .eq('type', 'work_completion_reminder' as any)
        .eq('is_read', false as any)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching work completion notifications:', error);
        return;
      }

      // עבור כל התראה, נשלוף את פרטי ההצעה
      const notificationsWithDetails = await Promise.all(
        (data || []).map(async (notification: any) => {
          let proposalDetails = null;
          
          if (notification.related_type === 'proposal') {
            const { data: proposalData } = await supabase
              .from('proposals')
              .select(`
                id,
                description,
                leads!inner(title)
              `)
              .eq('id', notification.related_id as any)
              .maybeSingle();
            
            if (proposalData && proposalData !== null && typeof proposalData === 'object') {
              proposalDetails = {
                id: (proposalData as any).id,
                description: (proposalData as any).description,
                lead_title: (proposalData as any).leads?.title
              };
            }
          } else if (notification.related_type === 'quote') {
            const { data: quoteData } = await supabase
              .from('quotes')
              .select(`
                id,
                description,
                requests!inner(title)
              `)
              .eq('id', notification.related_id as any)
              .maybeSingle();
            
            if (quoteData && quoteData !== null && typeof quoteData === 'object') {
              proposalDetails = {
                id: (quoteData as any).id,
                description: (quoteData as any).description,
                request_title: (quoteData as any).requests?.title
              };
            }
          }

          return {
            ...notification,
            proposal_details: proposalDetails
          };
        })
      );

      setNotifications(notificationsWithDetails);
    } catch (error) {
      console.error('Error fetching work completion notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [professionalId]);

  useEffect(() => {
    fetchWorkCompletionNotifications();
  }, [fetchWorkCompletionNotifications]);

  // מחיקת התראה לאחר מילוי הטופס
  const markNotificationAsCompleted = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('id', notificationId as any);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      return true;
    } catch (error) {
      console.error('Error marking notification as completed:', error);
      return false;
    }
  }, []);

  return {
    notifications,
    isLoading,
    refetch: fetchWorkCompletionNotifications,
    markAsCompleted: markNotificationAsCompleted
  };
};
