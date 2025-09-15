
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useProfessionalId } from './useProfessionalId';

interface ProposalReminder {
  id: string;
  proposal_id: string;
  proposal_type: string;
  last_reminder: string;
  reminder_count: number;
  is_scheduled: boolean;
  created_at: string;
  proposal: {
    id: string;
    description: string;
    lead_id?: string;
    request_id?: string;
    created_at: string;
    scheduled_date?: string;
    type: 'proposal' | 'quote';
  };
}

export function useReminderSystem() {
  const [activeReminder, setActiveReminder] = useState<ProposalReminder | null>(null);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { professionalId } = useProfessionalId();
  
  // Function to check for reminders with timeout and error handling
  const checkReminders = useCallback(async () => {
    if (!professionalId || isLoading) return;
    
    // Don't check too frequently (at least 2 minutes between checks)
    const now = Date.now();
    if (now - lastCheckTime < 120000) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setLastCheckTime(now);
    
    // Set timeout for the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const { data, error } = await supabase.functions.invoke('check-reminder-status', {
        body: { professionalId }
      });
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('Error checking reminders:', error);
        setError('שגיאה בבדיקת תזכורות');
        return;
      }
      
      // If we have active reminders, show the dialog
      if (data?.hasReminders && data.activeReminders?.length > 0) {
        const reminder = data.activeReminders[0];
        setActiveReminder(reminder);
        setIsReminderOpen(true);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Failed to check reminders:', err);
      
      if (err.name === 'AbortError') {
        setError('בדיקת התזכורות נכשלה - תם הזמן');
      } else {
        setError('שגיאה בבדיקת תזכורות');
      }
    } finally {
      setIsLoading(false);
    }
  }, [professionalId, lastCheckTime, isLoading]);
  
  // Check for reminders when the component mounts and periodically
  useEffect(() => {
    if (!professionalId) return;
    
    // Initial check after a short delay
    const initialTimer = setTimeout(() => {
      checkReminders();
    }, 1000);
    
    // Set up interval - check every 3 hours
    const intervalId = setInterval(() => {
      checkReminders();
    }, 10800000); // 3 hours
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [professionalId]);
  
  return {
    activeReminder,
    isReminderOpen,
    setIsReminderOpen,
    checkReminders,
    isLoading,
    error
  };
}
