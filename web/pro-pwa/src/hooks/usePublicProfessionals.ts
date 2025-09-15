import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PublicProfessional {
  id: string;
  name: string;
  profession: string;
  location: string;
  rating: number;
  review_count: number;
  image?: string;
  about?: string;
  specialties?: string[];
  experience_range?: string;
  is_verified: boolean;
  status: string;
}

export function usePublicProfessionals() {
  const [professionals, setProfessionals] = useState<PublicProfessional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicProfessionals();
  }, []);

  const fetchPublicProfessionals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Fetching public professionals using secure function (contact info excluded)");
      
      // Use the updated secure endpoint that explicitly excludes contact information
      const { data, error: functionError } = await supabase.functions.invoke('get-public-professionals');
      
      if (functionError) {
        console.error("Error from secure function:", functionError);
        throw functionError;
      }
      
      console.log(`Successfully fetched ${data?.length || 0} professionals (secure data only)`);
      setProfessionals(data || []);
    } catch (err) {
      console.error('Error fetching secure public professionals:', err);
      setError('Failed to load professionals');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    professionals,
    isLoading,
    error,
    refetch: fetchPublicProfessionals
  };
}