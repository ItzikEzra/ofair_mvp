
import React from "react";
import NotificationItem from "../NotificationItem";
import NotificationsEmptyState from "./NotificationsEmptyState";
import { Notification } from "@/types/notifications";

interface NotificationsSectionContentProps {
  notifications: Notification[];
  professionalId: string | null;
  isLoading: boolean;
  error: string | null;
  forceLoaded: boolean;
  onShowDetails: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  onRefresh: () => void;
}

const NotificationsSectionContent: React.FC<NotificationsSectionContentProps> = ({
  notifications,
  professionalId,
  isLoading,
  error,
  forceLoaded,
  onShowDetails,
  onMarkAsRead,
  onRefresh
}) => {
  // Filter to show only unread notifications in dashboard
  const unreadNotifications = notifications.filter(n => !n.is_read);
  
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow">
      {(unreadNotifications && unreadNotifications.length > 0) ? (
        <div>
          {unreadNotifications.slice(0, 3).map((notification) => (
            <NotificationItem
              key={notification.id}
              id={notification.id}
              title={notification.title}
              description={notification.description}
              createdAt={notification.created_at}
              isRead={notification.is_read}
              type={notification.type}
              relatedId={notification.related_id}
              relatedType={notification.related_type}
              markAsRead={onMarkAsRead}
              isNew={!notification.is_read}
              onShowDetails={onShowDetails}
              onRead={() => onMarkAsRead(notification.id)}
            />
          ))}
        </div>
      ) : (
        <NotificationsEmptyState
          professionalId={professionalId}
          isLoading={isLoading}
          error={error}
          forceLoaded={forceLoaded}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};

export default NotificationsSectionContent;

