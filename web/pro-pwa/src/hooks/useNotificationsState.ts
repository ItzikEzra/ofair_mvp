
import { useState } from "react";
import type { Notification } from "@/types/notifications";

export function useNotificationsState() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  return {
    notifications,
    setNotifications,
    isLoading,
    setIsLoading,
  };
}
