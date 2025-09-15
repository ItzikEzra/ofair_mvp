
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useStorageBuckets = () => {
  useEffect(() => {
    const createBuckets = async () => {
      try {
        console.log("Initializing storage buckets...");
        const { error } = await supabase.functions.invoke('create-media-buckets');
        
        if (error) {
          console.error("Error creating storage buckets:", error);
        } else {
          console.log("Storage buckets initialized successfully");
        }
      } catch (error) {
        console.error("Failed to initialize storage buckets:", error);
      }
    };

    createBuckets();
  }, []);
};
