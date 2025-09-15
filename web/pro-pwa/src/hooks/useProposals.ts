import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProposalType } from '@/types/jobs';
import { useAuth } from '@/contexts/auth/AuthContext';
import { getAuthToken } from '@/utils/storageUtils';

export const useProposals = () => {
  const [submittedProposals, setSubmittedProposals] = useState<ProposalType[]>([]);
  const [receivedProposals, setReceivedProposals] = useState<ProposalType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { professionalData } = useAuth();

  useEffect(() => {
    const fetchProposals = async () => {
      if (!professionalData?.id) return;
      
      setIsLoading(true);
      
      try {
        // Use secure function to get all proposals (submitted and received)
        const authToken = getAuthToken();
        const { data: proposalsData, error } = await supabase.rpc('get_proposals_secure', {
          token_param: authToken || null
        });

        if (error) {
          console.error('Error fetching proposals:', error);
          return;
        }

        console.log('📋 Raw proposals data:', proposalsData?.length || 0);

        if (!proposalsData) {
          setSubmittedProposals([]);
          setReceivedProposals([]);
          return;
        }

        // Get unique lead IDs to fetch lead details in batch
        const leadIds = [...new Set(proposalsData.map(p => p.lead_id).filter(Boolean))];
        console.log('🔍 Fetching details for leads:', leadIds.length);
        
        // Fetch lead details in batch
        const { data: leadsData } = await supabase
          .from('leads')
          .select('id, title, location, client_name')
          .in('id', leadIds);

        // Create a map for quick lookup
        const leadsMap = new Map();
        leadsData?.forEach(lead => {
          leadsMap.set(lead.id, lead);
        });

        // Fetch quotes (requests) data using secure function
        const { data: quotesResponse, error: quotesError } = await supabase.rpc('get_quotes_secure', {
          token_param: authToken || null
        });

        console.log('📋 Quotes data:', quotesResponse?.length || 0);

        // Get unique request IDs to fetch request details
        const uniqueRequestIds = [...new Set((quotesResponse || []).map((q: any) => q.request_id).filter(Boolean))] as string[];
        console.log('🔍 Fetching details for requests:', uniqueRequestIds.length);
        
        // Fetch request details in batch
        const { data: requestsData } = await supabase
          .from('requests')
          .select('id, title, description, location, date, timing')
          .in('id', uniqueRequestIds.length > 0 ? uniqueRequestIds : ['']);

        // Create a map for quick lookup
        const requestsMap = new Map();
        requestsData?.forEach(request => {
          requestsMap.set(request.id, request);
        });

        // Separate submitted and received proposals
        const submitted: ProposalType[] = [];
        const received: ProposalType[] = [];

        // Process lead proposals
        proposalsData.forEach(proposal => {
          const lead = leadsMap.get(proposal.lead_id);
          const leadTitle = lead?.title || 'ליד';
          const leadLocation = lead?.location || '';
          const clientName = lead?.client_name || 'לקוח באמצעות אופיר';

          if (proposal.professional_id === professionalData.id) {
            // This is a submitted proposal - convert to ProposalType format
            submitted.push({
              id: proposal.id,
              title: leadTitle,
              client: clientName,
              price: proposal.price,
              date: new Date(proposal.created_at).toLocaleDateString('he-IL'),
              status: proposal.status,
              leadId: proposal.lead_id,
              description: proposal.description,
              estimatedCompletion: proposal.estimated_completion,
              location: leadLocation,
              type: 'lead',
              created_at: proposal.created_at,
              final_amount: (proposal as any).final_amount
            });
          } else {
            // This is a received proposal - convert to ProposalType format
            received.push({
              id: proposal.id,
              title: leadTitle,
              client: `${proposal.professional_name}`,
              price: proposal.price,
              date: new Date(proposal.created_at).toLocaleDateString('he-IL'),
              status: proposal.status,
              leadId: proposal.lead_id,
              description: proposal.description,
              estimatedCompletion: proposal.estimated_completion,
              location: proposal.professional_location || leadLocation,
              type: 'received_lead',
              created_at: proposal.created_at,
              final_amount: (proposal as any).final_amount
            });
          }
        });

        // Process quotes (requests)
        const quotesData = quotesResponse || [];
        quotesData.forEach((quote: any) => {
          const request = requestsMap.get(quote.request_id);
          const requestTitle = request?.title || 'בקשה';
          const requestLocation = request?.location || '';

          if (quote.professional_id === professionalData.id) {
            // This is a submitted quote - convert to ProposalType format
            submitted.push({
              id: quote.id,
              title: requestTitle,
              client: 'לקוח באמצעות אופיר',
              price: quote.price ? parseFloat(quote.price) : null,
              date: new Date(quote.created_at).toLocaleDateString('he-IL'),
              status: quote.status,
              requestId: quote.request_id,
              description: quote.description,
              estimatedTime: quote.estimated_time,
              location: requestLocation,
              type: 'request',
              created_at: quote.created_at,
              request_status: quote.request_status
            });
          }
        });

        console.log('✅ Processed proposals:', { submitted: submitted.length, received: received.length });
        setSubmittedProposals(submitted);
        setReceivedProposals(received);
      } catch (error) {
        console.error('Error fetching proposals:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposals();
  }, [professionalData?.id]);

  const fetchProposals = async () => {
    if (!professionalData?.id) return;
    
    setIsLoading(true);
    
    try {
      // Use secure function to get all proposals (submitted and received)
      const authToken = getAuthToken();
      const { data: proposalsData, error } = await supabase.rpc('get_proposals_secure', {
        token_param: authToken || null
      });

      if (error) {
        console.error('Error fetching proposals:', error);
        return;
      }

      console.log('📋 Raw proposals data:', proposalsData?.length || 0);

      if (!proposalsData) {
        setSubmittedProposals([]);
        setReceivedProposals([]);
        return;
      }

      // Get unique lead IDs to fetch lead details in batch
      const leadIds = [...new Set(proposalsData.map(p => p.lead_id).filter(Boolean))];
      console.log('🔍 Fetching details for leads:', leadIds.length);
      
      // Fetch lead details in batch
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, title, location, client_name')
        .in('id', leadIds);

      // Create a map for quick lookup
      const leadsMap = new Map();
      leadsData?.forEach(lead => {
        leadsMap.set(lead.id, lead);
      });

      // Fetch quotes (requests) data using secure function
      const { data: quotesResponse, error: quotesError } = await supabase.rpc('get_quotes_secure', {
        token_param: authToken || null
      });

      console.log('📋 Quotes data:', quotesResponse?.length || 0);

      // Get unique request IDs to fetch request details
      const uniqueRequestIds = [...new Set((quotesResponse || []).map((q: any) => q.request_id).filter(Boolean))] as string[];
      console.log('🔍 Fetching details for requests:', uniqueRequestIds.length);
      
      // Fetch request details in batch
      const { data: requestsData } = await supabase
        .from('requests')
        .select('id, title, description, location, date, timing')
        .in('id', uniqueRequestIds.length > 0 ? uniqueRequestIds : ['']);

      // Create a map for quick lookup
      const requestsMap = new Map();
      requestsData?.forEach(request => {
        requestsMap.set(request.id, request);
      });

      // Separate submitted and received proposals
      const submitted: ProposalType[] = [];
      const received: ProposalType[] = [];

      // Process lead proposals
      proposalsData.forEach(proposal => {
        const lead = leadsMap.get(proposal.lead_id);
        const leadTitle = lead?.title || 'ליד';
        const leadLocation = lead?.location || '';
        const clientName = lead?.client_name || 'לקוח באמצעות אופיר';

        if (proposal.professional_id === professionalData.id) {
          // This is a submitted proposal - convert to ProposalType format
          submitted.push({
            id: proposal.id,
            title: leadTitle,
            client: clientName,
            price: proposal.price,
            date: new Date(proposal.created_at).toLocaleDateString('he-IL'),
            status: proposal.status,
            leadId: proposal.lead_id,
            description: proposal.description,
            estimatedCompletion: proposal.estimated_completion,
            location: leadLocation,
            type: 'lead',
            created_at: proposal.created_at,
            final_amount: (proposal as any).final_amount
          });
        } else {
          // This is a received proposal - convert to ProposalType format
          received.push({
            id: proposal.id,
            title: leadTitle,
            client: `${proposal.professional_name}`,
            price: proposal.price,
            date: new Date(proposal.created_at).toLocaleDateString('he-IL'),
            status: proposal.status,
            leadId: proposal.lead_id,
            description: proposal.description,
            estimatedCompletion: proposal.estimated_completion,
            location: proposal.professional_location || leadLocation,
            type: 'received_lead',
            created_at: proposal.created_at,
            final_amount: (proposal as any).final_amount
          });
        }
      });

      // Process quotes (requests)
      const quotesData = quotesResponse || [];
      quotesData.forEach((quote: any) => {
        const request = requestsMap.get(quote.request_id);
        const requestTitle = request?.title || 'בקשה';
        const requestLocation = request?.location || '';

        if (quote.professional_id === professionalData.id) {
          // This is a submitted quote - convert to ProposalType format
          submitted.push({
            id: quote.id,
            title: requestTitle,
            client: 'לקוח באמצעות אופיר',
            price: quote.price ? parseFloat(quote.price) : null,
            date: new Date(quote.created_at).toLocaleDateString('he-IL'),
            status: quote.status,
            requestId: quote.request_id,
            description: quote.description,
            estimatedTime: quote.estimated_time,
            location: requestLocation,
            type: 'request',
            created_at: quote.created_at,
            request_status: quote.request_status
          });
        }
      });

      console.log('✅ Processed proposals:', { submitted: submitted.length, received: received.length });
      setSubmittedProposals(submitted);
      setReceivedProposals(received);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProposals = () => {
    if (professionalData?.id) {
      fetchProposals();
    }
  };

  return {
    submittedProposals,
    receivedProposals,
    isLoading,
    refreshProposals
  };
};