import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfessionalId } from './useProfessionalId';

interface ClientDetails {
  name?: string;
  phone?: string;
  address?: string;
  workDate?: string;
  workTime?: string;
  notes?: string;
}

export const useSecureClientDetails = (proposalId: string, proposalType: 'lead' | 'request') => {
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const { professionalId } = useProfessionalId();

  useEffect(() => {
    const fetchClientDetails = async () => {
      if (!proposalId || !professionalId) return;

      try {
        setIsLoading(true);
        
        // Use the secure edge function to get client details
        const { data, error } = await supabase.functions.invoke('get-client-details', {
          body: {
            proposalId,
            proposalType,
            professionalId
          }
        });

        if (error) {
          console.error('Error fetching client details:', error);
          setHasAccess(false);
          return;
        }

        if (data) {
          setClientDetails(data);
          setHasAccess(true);
        }
      } catch (error) {
        console.error('Failed to fetch client details:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientDetails();
  }, [proposalId, proposalType, professionalId]);

  return { clientDetails, isLoading, hasAccess };
};