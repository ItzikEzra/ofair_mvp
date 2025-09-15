
import React, { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useProfessionalId } from "@/hooks/useProfessionalId";
import { useNotificationRealtime } from "@/hooks/useNotificationRealtime";
import { useReminderSystem } from "@/hooks/useReminderSystem";
import { useNotificationsNavigation } from "@/hooks/useNotificationsNavigation";
import ClientDetailsDialog from "../proposals/ClientDetailsDialog";
import ReminderDialog from "../dialogs/ReminderDialog";
import NotificationsSectionHeader from "./notifications/NotificationsSectionHeader";
import NotificationsSectionContent from "./notifications/NotificationsSectionContent";
import NotificationsLoadingState from "./notifications/NotificationsLoadingState";
import NotificationsErrorState from "./notifications/NotificationsErrorState";
import { useToast } from "../ui/use-toast";

const NotificationsSection = () => {
  console.log("[NOTIFICATIONS SECTION DEBUG] Component rendering");
  
  const { professionalId } = useProfessionalId();
  console.log("[NOTIFICATIONS SECTION DEBUG] professionalId from hook:", professionalId);
  console.log("[NOTIFICATIONS SECTION DEBUG] professionalId type:", typeof professionalId);
  
  // Also check localStorage directly
  const storedId = localStorage.getItem("professionalId");
  const storedData = localStorage.getItem("professionalData");
  console.log("[NOTIFICATIONS SECTION DEBUG] localStorage professionalId:", storedId);
  console.log("[NOTIFICATIONS SECTION DEBUG] localStorage professionalData exists:", !!storedData);
  
  const { 
    notifications, 
    setNotifications, 
    isLoading, 
    error, 
    markAsRead, 
    getNotificationWithClientDetails,
    refetch
  } = useNotifications(professionalId);
  
  console.log("[NOTIFICATIONS SECTION DEBUG] Hook data:", {
    notificationsCount: notifications.length,
    isLoading,
    error,
    notifications: notifications.slice(0, 2) // Just first 2 for debugging
  });
  
  const [forceLoaded, setForceLoaded] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const { toast } = useToast();
  
  const { handleNotificationClick, handleDialogNavigation } = useNotificationsNavigation();
  
  // Initialize the reminder system
  const { activeReminder, isReminderOpen, setIsReminderOpen } = useReminderSystem();
  
  // Set up real-time notifications
  useNotificationRealtime({
    professionalId,
    setNotifications,
    fetchNotifications: refetch
  });
  
  // Force load after 2 seconds to prevent infinite loading for OTP users
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("[NOTIFICATIONS SECTION DEBUG] Force loading timeout reached");
      setForceLoaded(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // Calculate unread count only for display purposes
  const unreadCount = notifications.filter(n => !n.is_read).length;
  console.log("[NOTIFICATIONS SECTION DEBUG] Unread count:", unreadCount);

  const handleMarkOneAsRead = async (notificationId: string) => {
    console.log("[NOTIFICATIONS SECTION DEBUG] Marking single notification as read:", notificationId);
    
    // Optimistically update UI
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );

    // Call DB
    const success = await markAsRead(notificationId);
    if (!success) {
      console.error("Failed to mark notification as read in DB, rolling back UI.");
      toast({ title: "שגיאה", description: "לא ניתן לסמן את ההתראה כנקראה", variant: "destructive" });
      // Rollback on failure
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: false } : n)
      );
    }
  };

  const handleShowDetails = async (notificationId: string) => {
    console.log("[NOTIFICATIONS SECTION DEBUG] Showing details for notification:", notificationId);
    
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    // Mark as read (optimistic + db)
    if (!notification.is_read) {
      handleMarkOneAsRead(notificationId);
    }

    // Handle dialog/navigation
    if (notification.client_details) {
      setSelectedNotification(notification);
      setIsDetailsDialogOpen(true);
    } else {
      handleNotificationClick(notification);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDetailsDialogOpen(open);
    if (!open && selectedNotification) {
      // After closing the dialog, navigate based on notification type
      const notificationType = selectedNotification.type;
      handleDialogNavigation(notificationType);
    }
  };
  
  const handleReminderComplete = () => {
    setIsReminderOpen(false);
  };

  const handleRefresh = () => {
    console.log("[NOTIFICATIONS SECTION DEBUG] Manual refresh triggered");
    refetch();
  };

  // Show loading only for first 2 seconds and if we don't have data
  if (isLoading && !forceLoaded && notifications.length === 0) {
    console.log("[NOTIFICATIONS SECTION DEBUG] Showing loading state");
    return <NotificationsLoadingState onRefresh={handleRefresh} />;
  }

  // Show error state with more helpful information
  if (error) {
    console.log("[NOTIFICATIONS SECTION DEBUG] Showing error state:", error);
    return <NotificationsErrorState error={error} onRefresh={handleRefresh} />;
  }

  console.log("[NOTIFICATIONS SECTION DEBUG] Rendering notifications list, count:", notifications.length);

  return (
    <div className="mb-6">
      <NotificationsSectionHeader 
        unreadCount={unreadCount}
        onRefresh={handleRefresh}
      />
      
      <NotificationsSectionContent
        notifications={notifications}
        professionalId={professionalId}
        isLoading={isLoading}
        error={error}
        forceLoaded={forceLoaded}
        onShowDetails={handleShowDetails}
        onMarkAsRead={handleMarkOneAsRead}
        onRefresh={handleRefresh}
      />

      {/* Client Details Dialog */}
      <ClientDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={handleDialogClose}
        clientDetails={selectedNotification?.client_details || null}
        proposalTitle={selectedNotification?.title}
        notificationType={selectedNotification?.type}
      />
      
      {/* Reminder Dialog */}
      <ReminderDialog 
        open={isReminderOpen}
        onOpenChange={setIsReminderOpen}
        reminder={activeReminder}
        onScheduleComplete={handleReminderComplete}
      />
    </div>
  );
};

export default NotificationsSection;
