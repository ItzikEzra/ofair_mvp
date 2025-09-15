import { supabase } from "@/integrations/supabase/client";
import { ProposalType } from "@/types/jobs";

export async function updateProposalStatus(
  proposalId: string,
  newStatus: string,
  type: 'proposal' | 'quote' = 'proposal'
): Promise<{ success: boolean; rejectedOthers?: boolean; error?: string }> {
  try {
    console.log(`Updating ${type} ${proposalId} to status: ${newStatus}`);
    
    const { data, error } = await supabase.functions.invoke('update-proposal-status', {
      body: {
        proposalId,
        status: newStatus,
        proposalType: type
      }
    });
    
    if (error) {
      console.error(`Error updating ${type} status:`, error);
      return { success: false, error: error.message };
    }
    
    if (!data?.success) {
      console.error(`Failed to update ${type}:`, data);
      return { success: false, error: data?.error || 'Failed to update proposal' };
    }
    
    console.log(`Successfully updated ${type}:`, data);
    return { 
      success: true, 
      rejectedOthers: data.rejectedOthers || false 
    };
  } catch (err) {
    console.error(`Unexpected error updating ${type} status:`, err);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

export async function cancelProposal(proposalId: string, type: 'proposal' | 'quote' = 'proposal'): Promise<boolean> {
  const result = await updateProposalStatus(proposalId, 'cancelled', type);
  return result.success;
}

export async function acceptProposal(proposalId: string, type: 'proposal' | 'quote' = 'proposal'): Promise<{ success: boolean; rejectedOthers?: boolean; error?: string }> {
  return updateProposalStatus(proposalId, 'accepted', type);
}

export async function rejectProposal(proposalId: string, type: 'proposal' | 'quote' = 'proposal'): Promise<boolean> {
  const result = await updateProposalStatus(proposalId, 'rejected', type);
  return result.success;
}

// Define TypeScript interfaces for database records
interface ProposalRecord {
  id: string;
  description: string;
  price: number;
  created_at: string;
  status: string;
  professional_id: string;
  lead_id: string;
  estimated_completion: string | null;
}

interface QuoteRecord {
  id: string;
  description: string;
  price: string;
  created_at: string;
  updated_at: string;
  status: string;
  professional_id: string;
  request_id: string;
  estimated_time: string | null;
}

export async function fetchProposalById(
  proposalId: string,
  type: 'proposal' | 'quote' = 'proposal'
): Promise<ProposalType | null> {
  try {
    const tableName = type === 'proposal' ? 'proposals' : 'quotes';
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', proposalId)
      .single();
    
    if (error) {
      console.error(`Error fetching ${type}:`, error);
      return null;
    }
    
    // Format based on proposal type
    if (type === 'proposal') {
      // This is a lead proposal
      const proposalData = data as ProposalRecord;
      return {
        id: proposalData.id,
        title: 'ליד', // This would normally come from a join with leads
        client: 'לקוח באמצעות אופיר',
        price: proposalData.price,
        date: new Date(proposalData.created_at).toLocaleDateString('he-IL'),
        status: proposalData.status as ProposalType['status'],
        description: proposalData.description,
        leadId: proposalData.lead_id,
        estimatedCompletion: proposalData.estimated_completion,
        type: 'lead'
      };
    } else {
      // This is a request quote
      const quoteData = data as QuoteRecord;
      return {
        id: quoteData.id,
        title: 'בקשת לקוח', // This would normally come from a join with requests
        client: 'לקוח ישיר',
        price: parseInt(quoteData.price) || 0,
        date: new Date(quoteData.created_at).toLocaleDateString('he-IL'),
        status: quoteData.status as ProposalType['status'],
        description: quoteData.description,
        requestId: quoteData.request_id,
        estimatedCompletion: quoteData.estimated_time,
        type: 'request'
      };
    }
  } catch (err) {
    console.error(`Unexpected error fetching ${type}:`, err);
    return null;
  }
}

// Add function to update quote price
export async function updateQuotePrice(
  quoteId: string,
  newPrice: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('quotes')
      .update({ 
        price: newPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId);
    
    if (error) {
      console.error("Error updating quote price:", error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Unexpected error updating quote price:", err);
    return false;
  }
}
