
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Notification } from "@/types/notifications";

interface UseNotificationRealtimeProps {
  professionalId: string | null;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  fetchNotifications: () => void;
}

export function useNotificationRealtime({ 
  professionalId, 
  setNotifications, 
  fetchNotifications 
}: UseNotificationRealtimeProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (!professionalId) return;

    console.log("Setting up notification real-time subscription for professional:", professionalId);

    // Subscribe to real-time notifications with improved filtering
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `professional_id=eq.${professionalId}`
        },
        (payload) => {
          console.log("New notification received via real-time:", payload.new);
          
          const newNotification = payload.new as Notification;
          
          // Add to notifications list immediately (check for duplicates)
          setNotifications(prev => {
            const exists = prev.some(notification => notification.id === newNotification.id);
            if (exists) {
              console.log("Notification already exists, skipping:", newNotification.id);
              return prev;
            }
            return [newNotification, ...prev];
          });
          
          // Show toast notification based on type
          const notificationType = newNotification.type;
          if (notificationType === 'new_direct_inquiry') {
            toast({
              title: "פנייה ישירה חדשה!",
              description: newNotification.description || "קיבלת פנייה ישירה חדשה",
              duration: 5000,
            });
          } else if (notificationType === 'new_proposal') {
            toast({
              title: "הצעת מחיר חדשה!",
              description: newNotification.description,
              duration: 5000,
            });
          } else if (notificationType === 'new_lead_in_area') {
            toast({
              title: newNotification.title,
              description: newNotification.description,
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referrals',
          filter: `professional_id=eq.${professionalId}`
        },
        (payload) => {
          console.log("New referral detected via real-time, showing notification");
          
          // Show immediate toast for new direct inquiry
          toast({
            title: "פנייה ישירה חדשה!",
            description: `קיבלת פנייה ישירה חדשה עבור ${payload.new.profession || 'שירות'}`,
            duration: 5000,
          });
          
          // Note: No need to fetch notifications as the trigger creates the notification
          // which will be caught by the notifications real-time subscription above
        }
      )
      .subscribe((status) => {
        console.log("Notifications real-time subscription status:", status);
        
        // If subscription fails, try to reconnect
        if (status === 'CHANNEL_ERROR') {
          console.error("Real-time subscription failed, retrying...");
          setTimeout(() => {
            fetchNotifications(); // Fallback to polling
          }, 2000);
        }
      });

    return () => {
      console.log("Cleaning up notification real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [professionalId, setNotifications, toast, fetchNotifications]);
}
