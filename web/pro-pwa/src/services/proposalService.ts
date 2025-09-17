/**
 * Legacy Proposal Service Wrapper
 * Redirects to FastAPI ProposalsService for backward compatibility
 */

import ProposalsService, { UpdateProposalRequest } from './proposalsService';
import { ProposalType } from "@/types/jobs";

export async function updateProposalStatus(
  proposalId: string,
  newStatus: string,
  type: 'proposal' | 'quote' = 'proposal'
): Promise<{ success: boolean; rejectedOthers?: boolean; error?: string }> {
  try {
    console.log(`Updating ${type} ${proposalId} to status: ${newStatus}`);

    const updateRequest: UpdateProposalRequest = {
      status: newStatus as 'pending' | 'accepted' | 'rejected'
    };

    const result = await ProposalsService.updateProposal(proposalId, updateRequest);

    console.log(`Successfully updated ${type}:`, result);
    return {
      success: true,
      rejectedOthers: newStatus === 'accepted' // Assuming other proposals are rejected when one is accepted
    };

  } catch (error) {
    console.error(`Error updating ${type} status:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update proposal'
    };
  }
}

export async function getMyProposalsData(filters?: {
  status?: string;
  leadId?: string;
}): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const response = await ProposalsService.getMyProposals(
      filters?.status as 'pending' | 'accepted' | 'rejected',
      1, // page
      50, // per_page
      filters?.leadId
    );

    return {
      data: response.proposals,
      error: null
    };
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch proposals'
    };
  }
}

// Export for backward compatibility
export { ProposalsService };
export default ProposalsService;