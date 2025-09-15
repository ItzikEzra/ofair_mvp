import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import type { Notification } from "@/types/notifications";

interface UseNotificationsActionsProps {
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteAllNotifications: () => Promise<boolean>;
  refetch: () => void;
  setNotifications: (updateFn: (prev: Notification[]) => Notification[]) => void;
}

export const useNotificationsActions = ({
  markAsRead,
  markAllAsRead,
  deleteAllNotifications,
  refetch,
  setNotifications
}: UseNotificationsActionsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set());

  const handleNotificationClick = async (notification: Notification) => {
    console.log("[NOTIFICATIONS] Handling notification click:", notification);
    
    // Optimistic update - mark as read immediately in local state
    if (!notification.is_read) {
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id 
            ? { ...n, is_read: true }
            : n
        )
      );

      try {
        // Mark as read in database
        const success = await markAsRead(notification.id);
        
        if (!success) {
          // Rollback optimistic update if database update failed
          setNotifications(prev => 
            prev.map(n => 
              n.id === notification.id 
                ? { ...n, is_read: false }
                : n
            )
          );
          
          toast({
            title: "שגיאה",
            description: "לא ניתן לסמן את ההתראה כנקראה",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
        
        // Rollback optimistic update on error
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id 
              ? { ...n, is_read: false }
              : n
          )
        );
        
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בעת סימון ההתראה",
          variant: "destructive",
        });
        return;
      }
    }

    // Navigate based on notification type and related_id
    const { type, related_id } = notification;
    
    if (type === "new_direct_inquiry" && related_id) {
      navigate(`/my-jobs?tab=inquiries&id=${related_id}`);
    } else if (type === "new_proposal" && related_id) {
      navigate(`/my-leads?id=${related_id}`);
    } else if (type === "proposal_accepted" && related_id) {
      navigate(`/my-jobs?tab=proposals&id=${related_id}`);
    } else if (type === "new_lead_in_area" && related_id) {
      navigate(`/leads?id=${related_id}`);
    } else {
      // Fallback navigation
      if (type === "new_direct_inquiry") {
        navigate("/my-jobs?tab=inquiries");
      } else if (type === "new_proposal") {
        navigate("/my-leads");
      } else if (type === "proposal_accepted") {
        navigate("/my-jobs?tab=proposals");
      } else {
        navigate("/my-jobs");
      }
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleMarkAsRead = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setMarkingAsRead(prev => new Set(prev).add(notificationId));
    
    // Optimistic update
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId 
          ? { ...n, is_read: true }
          : n
      )
    );
    
    try {
      const success = await markAsRead(notificationId);
      if (!success) {
        // Rollback optimistic update
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, is_read: false }
              : n
          )
        );
        
        toast({
          title: "שגיאה",
          description: "לא ניתן לסמן את ההתראה כנקראה",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      
      // Rollback optimistic update
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: false }
            : n
        )
      );
      
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעת סימון ההתראה",
        variant: "destructive",
      });
    } finally {
      setMarkingAsRead(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAllAsRead(true);
    
    // Optimistic update - mark all as read
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    
    try {
      const success = await markAllAsRead();
      if (success) {
        toast({
          title: "הצלחה",
          description: "כל ההתראות סומנו כנקראות",
        });
      } else {
        // Rollback optimistic update
        refetch();
        toast({
          title: "שגיאה",
          description: "לא ניתן לסמן את ההתראות כנקראות",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      // Rollback optimistic update
      refetch();
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעת סימון ההתראות",
        variant: "destructive",
      });
    } finally {
      setIsMarkingAllAsRead(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    
    // Optimistic update - clear all notifications
    setNotifications(() => []);
    
    try {
      const success = await deleteAllNotifications();
      if (success) {
        toast({
          title: "הצלחה",
          description: "כל ההתראות נמחקו בהצלחה",
        });
      } else {
        // Rollback optimistic update by refetching
        refetch();
        toast({
          title: "שגיאה",
          description: "לא ניתן למחוק את ההתראות",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      // Rollback optimistic update by refetching
      refetch();
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעת מחיקת ההתראות",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  return {
    isMarkingAllAsRead,
    isDeletingAll,
    markingAsRead,
    handleNotificationClick,
    handleRefresh,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDeleteAll
  };
};
