
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationArea {
  id: string;
  professional_id: string;
  area_name: string;
  radius_km: number;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useNotificationAreas = (professionalId: string | null) => {
  const [areas, setAreas] = useState<NotificationArea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAreas = useCallback(async () => {
    if (!professionalId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('professional_notification_areas')
        .select('*')
        .eq('professional_id', professionalId as any)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setAreas((data || []) as any);
    } catch (err: any) {
      console.error('Error fetching notification areas:', err);
      setError('שגיאה בטעינת אזורי התראות');
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את אזורי ההתראות",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [professionalId, toast]);

  const addArea = useCallback(async (areaData: Omit<NotificationArea, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('professional_notification_areas')
        .insert(areaData as any)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      setAreas(prev => [data as any, ...prev]);
      toast({
        title: "הצלחה",
        description: "אזור התראה נוסף בהצלחה"
      });
      return true;
    } catch (err: any) {
      console.error('Error adding notification area:', err);
      toast({
        title: "שגיאה",
        description: "לא ניתן להוסיף אזור התראה",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const updateArea = useCallback(async (areaId: string, updates: Partial<NotificationArea>) => {
    try {
      const { data, error } = await supabase
        .from('professional_notification_areas')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', areaId as any)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      setAreas(prev => prev.map(area => 
        area.id === areaId ? data as any : area
      ));
      
      toast({
        title: "הצלחה",
        description: "אזור התראה עודכן בהצלחה"
      });
      return true;
    } catch (err: any) {
      console.error('Error updating notification area:', err);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן אזור התראה",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const deleteArea = useCallback(async (areaId: string) => {
    try {
      const { error } = await supabase
        .from('professional_notification_areas')
        .delete()
        .eq('id', areaId as any);

      if (error) {
        throw error;
      }

      setAreas(prev => prev.filter(area => area.id !== areaId));
      toast({
        title: "הצלחה",
        description: "אזור התראה נמחק בהצלחה"
      });
      return true;
    } catch (err: any) {
      console.error('Error deleting notification area:', err);
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק אזור התראה",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  return {
    areas,
    isLoading,
    error,
    addArea,
    updateArea,
    deleteArea,
    refetch: fetchAreas
  };
};
