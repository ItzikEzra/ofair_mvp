
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Notification, ClientDetails } from "@/types/notifications";

// Cache for notifications to prevent re-fetching on every page
const notificationsCache = new Map<string, {
  data: Notification[];
  timestamp: number;
  unreadCount: number;
}>();

const CACHE_DURATION = 30000; // 30 seconds

export const useOptimizedNotifications = (professionalId: string | null) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastFetchTimeRef = useRef<number>(0);

  // Get cached data if available and fresh
  const getCachedData = useCallback(() => {
    if (!professionalId) return null;
    
    const cached = notificationsCache.get(professionalId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached;
    }
    return null;
  }, [professionalId]);

  // Optimized fetch with caching and debouncing
  const fetchNotifications = useCallback(async (force = false) => {
    if (!professionalId) return;

    // Check cache first unless forced
    if (!force) {
      const cached = getCachedData();
      if (cached) {
        setNotifications(cached.data);
        setUnreadCount(cached.unreadCount);
        return;
      }
    }

    // Prevent too frequent calls
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < 10000) {
      return;
    }

    setIsLoading(true);
    setError(null);
    lastFetchTimeRef.current = now;

    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Set timeout for the request
    fetchTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setError('טעינת התראות נכשלה - תם הזמן');
    }, 8000);

    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('professional_id', professionalId as any)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      if (fetchError) {
        console.error('Error fetching notifications:', fetchError);
        setError('שגיאה בטעינת התראות');
        return;
      }

      // Transform the data
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        client_details: item.client_details as ClientDetails | null
      }));

      const unreadNotifications = transformedData.filter(n => !n.is_read).length;

      // Update cache
      notificationsCache.set(professionalId, {
        data: transformedData,
        timestamp: Date.now(),
        unreadCount: unreadNotifications
      });

      setNotifications(transformedData);
      setUnreadCount(unreadNotifications);
    } catch (err: any) {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      console.error('Failed to fetch notifications:', err);
      
      if (err.name === 'AbortError') {
        setError('טעינת התראות נכשלה - תם הזמן');
      } else {
        setError('שגיאה בטעינת התראות');
      }
    } finally {
      setIsLoading(false);
    }
  }, [professionalId, getCachedData]);

  // Mark notification as read with cache update
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('id', notificationId as any);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      // Update local state and cache
      const updateFn = (prev: Notification[]) => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        );

      setNotifications(updateFn);
      
      // Update cache
      if (professionalId) {
        const cached = notificationsCache.get(professionalId);
        if (cached) {
          const updatedData = updateFn(cached.data);
          const newUnreadCount = updatedData.filter(n => !n.is_read).length;
          notificationsCache.set(professionalId, {
            data: updatedData,
            timestamp: cached.timestamp,
            unreadCount: newUnreadCount
          });
          setUnreadCount(newUnreadCount);
        }
      }

      return true;
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      return false;
    }
  }, [professionalId]);

  // Initial load with cache check
  useEffect(() => {
    if (!professionalId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Try cache first
    const cached = getCachedData();
    if (cached) {
      setNotifications(cached.data);
      setUnreadCount(cached.unreadCount);
    } else {
      // Delayed fetch to avoid blocking initial render
      const timer = setTimeout(() => {
        fetchNotifications(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [professionalId, getCachedData, fetchNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Lightweight realtime subscription for new notifications and updates
  useEffect(() => {
    if (!professionalId) return;

    const subscription = supabase
      .channel('notifications-optimized')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `professional_id=eq.${professionalId}`
        }, 
        (payload) => {
          const newNotification = {
            ...payload.new,
            client_details: payload.new.client_details as ClientDetails | null
          } as Notification;
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Update cache
          const cached = notificationsCache.get(professionalId);
          if (cached) {
            notificationsCache.set(professionalId, {
              data: [newNotification, ...cached.data],
              timestamp: cached.timestamp,
              unreadCount: cached.unreadCount + 1
            });
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `professional_id=eq.${professionalId}`
        },
        (payload) => {
          const updatedNotification = {
            ...payload.new,
            client_details: payload.new.client_details as ClientDetails | null
          } as Notification;

          setNotifications(prev => 
            prev.map(notification => 
              notification.id === updatedNotification.id 
                ? updatedNotification 
                : notification
            )
          );

          // Recalculate unread count
          setNotifications(currentNotifications => {
            const newUnreadCount = currentNotifications.filter(n => !n.is_read).length;
            setUnreadCount(newUnreadCount);

            // Update cache
            const cached = notificationsCache.get(professionalId);
            if (cached) {
              const updatedData = cached.data.map(notification => 
                notification.id === updatedNotification.id 
                  ? updatedNotification 
                  : notification
              );
              notificationsCache.set(professionalId, {
                data: updatedData,
                timestamp: cached.timestamp,
                unreadCount: newUnreadCount
              });
            }

            return currentNotifications;
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [professionalId]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    refetch: () => fetchNotifications(true)
  };
};
