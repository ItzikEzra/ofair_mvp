
import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useNotifications } from "@/hooks/useNotifications";
import { useProfessionalId } from "@/hooks/useProfessionalId";
import { useNotificationsActions } from "@/hooks/useNotificationsActions";
import NotificationsHeader from "@/components/notifications/NotificationsHeader";
import NotificationsEmptyState from "@/components/notifications/NotificationsEmptyState";
import NotificationsLoadingState from "@/components/notifications/NotificationsLoadingState";
import NotificationsErrorState from "@/components/notifications/NotificationsErrorState";
import NotificationsList from "@/components/notifications/NotificationsList";

const Notifications = () => {
  const { professionalId } = useProfessionalId();
  const {
    notifications,
    setNotifications,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteAllNotifications,
    refetch
  } = useNotifications(professionalId);

  const {
    isMarkingAllAsRead,
    isDeletingAll,
    markingAsRead,
    handleNotificationClick,
    handleRefresh,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDeleteAll
  } = useNotificationsActions({
    markAsRead,
    markAllAsRead,
    deleteAllNotifications,
    refetch,
    setNotifications
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (error) {
    return (
      <MainLayout title="התראות">
        <NotificationsErrorState error={error} onRefresh={handleRefresh} />
      </MainLayout>
    );
  }

  return (
    <MainLayout title="התראות">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-32 right-1/4 w-72 h-72 bg-gradient-to-br from-indigo-400/15 to-purple-400/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 left-1/3 w-56 h-56 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"></div>
        </div>
        <div className="w-full max-w-full overflow-x-hidden p-6" dir="rtl">
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl shadow-indigo-500/10 border-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5m-5-5H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2zM12 6v6m0 0l-3-3m3 3l3-3" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">התראות</h2>
                  <p className="text-sm text-gray-600">עדכונים והודעות חשובות</p>
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-4xl mx-auto min-w-0">
          <NotificationsHeader
            unreadCount={unreadCount}
            notificationsCount={notifications.length}
            isLoading={isLoading}
            isMarkingAllAsRead={isMarkingAllAsRead}
            isDeletingAll={isDeletingAll}
            onMarkAllAsRead={handleMarkAllAsRead}
            onDeleteAll={handleDeleteAll}
            onRefresh={handleRefresh}
          />

          {isLoading && notifications.length === 0 ? (
            <NotificationsLoadingState />
          ) : notifications.length === 0 ? (
            <NotificationsEmptyState />
          ) : (
            <NotificationsList
              notifications={notifications}
              markingAsRead={markingAsRead}
              onNotificationClick={handleNotificationClick}
              onMarkAsRead={handleMarkAsRead}
            />
          )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Notifications;
