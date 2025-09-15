/**
 * OFAIR Proposals Service
 * Handles proposal management with FastAPI Proposals Service
 */

import apiClient from './apiClient';
import { SERVICE_ENDPOINTS } from '@/config/apiConfig';

export interface Proposal {
  id: string;
  lead_id: string;
  professional_id: string;
  price: number;
  description: string;
  media_urls: string[];
  scheduled_date?: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at?: string;
  professional?: {
    id: string;
    name: string;
    profession: string;
    rating?: number;
    review_count?: number;
    is_verified: boolean;
  };
}

export interface CreateProposalRequest {
  lead_id: string;
  price: number;
  description: string;
  media_urls?: string[];
  scheduled_date?: string;
}

export interface UpdateProposalRequest {
  price?: number;
  description?: string;
  media_urls?: string[];
  scheduled_date?: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

export interface ProposalsListResponse {
  proposals: Proposal[];
  total: number;
  page: number;
  per_page: number;
}

export class ProposalsService {
  /**
   * Create a new proposal for a lead
   */
  static async createProposal(proposalData: CreateProposalRequest): Promise<Proposal> {
    const response = await apiClient.post<Proposal>(
      'proposals',
      SERVICE_ENDPOINTS.proposals.create,
      proposalData
    );

    if (!response.data) {
      throw new Error('Failed to create proposal');
    }

    return response.data;
  }

  /**
   * Get proposals for a specific lead
   * - Lead owners can see all proposals
   * - Professionals can see only their own proposals
   */
  static async getProposalsForLead(
    leadId: string,
    params?: {
      page?: number;
      per_page?: number;
    }
  ): Promise<ProposalsListResponse> {
    const searchParams: Record<string, string> = {};

    if (params?.page) searchParams.page = params.page.toString();
    if (params?.per_page) searchParams.per_page = params.per_page.toString();

    const response = await apiClient.get<ProposalsListResponse>(
      'proposals',
      `/leads/${leadId}/proposals`,
      searchParams
    );

    if (!response.data) {
      throw new Error('Failed to fetch proposals');
    }

    return response.data;
  }

  /**
   * Get my proposals (all proposals submitted by current professional)
   */
  static async getMyProposals(params?: {
    page?: number;
    per_page?: number;
    status?: string;
  }): Promise<ProposalsListResponse> {
    const searchParams: Record<string, string> = {};

    if (params?.page) searchParams.page = params.page.toString();
    if (params?.per_page) searchParams.per_page = params.per_page.toString();
    if (params?.status) searchParams.status = params.status;

    const response = await apiClient.get<ProposalsListResponse>(
      'proposals',
      '/proposals/my-proposals',
      searchParams
    );

    if (!response.data) {
      throw new Error('Failed to fetch my proposals');
    }

    return response.data;
  }

  /**
   * Update a proposal (owner only)
   */
  static async updateProposal(
    proposalId: string,
    updates: UpdateProposalRequest
  ): Promise<Proposal> {
    const response = await apiClient.put<Proposal>(
      'proposals',
      `${SERVICE_ENDPOINTS.proposals.update}/${proposalId}`,
      updates
    );

    if (!response.data) {
      throw new Error('Failed to update proposal');
    }

    return response.data;
  }

  /**
   * Accept a proposal (lead owner only)
   * This triggers payment initiation and PII revelation
   */
  static async acceptProposal(proposalId: string): Promise<{
    message: string;
    payment_id: string;
    client_details: {
      name: string;
      phone: string;
      address?: string;
    };
  }> {
    const response = await apiClient.post<{
      message: string;
      payment_id: string;
      client_details: {
        name: string;
        phone: string;
        address?: string;
      };
    }>(
      'proposals',
      `${SERVICE_ENDPOINTS.proposals.accept}/${proposalId}/accept`
    );

    if (!response.data) {
      throw new Error('Failed to accept proposal');
    }

    return response.data;
  }

  /**
   * Reject a proposal (lead owner only)
   */
  static async rejectProposal(
    proposalId: string,
    reason?: string
  ): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      'proposals',
      `/proposals/${proposalId}/reject`,
      { reason }
    );

    if (!response.data) {
      throw new Error('Failed to reject proposal');
    }

    return response.data;
  }

  /**
   * Get proposal by ID
   */
  static async getProposalById(proposalId: string): Promise<Proposal> {
    const response = await apiClient.get<Proposal>(
      'proposals',
      `/proposals/${proposalId}`
    );

    if (!response.data) {
      throw new Error('Proposal not found');
    }

    return response.data;
  }

  /**
   * Upload media for a proposal
   */
  static async uploadProposalMedia(file: File): Promise<{ url: string; file_id: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.request<{ url: string; file_id: string }>(
      'proposals',
      '/proposals/upload-media',
      {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiClient.getToken()}`
        }
      }
    );

    if (!response.data) {
      throw new Error('Media upload failed');
    }

    return response.data;
  }

  /**
   * Withdraw a proposal (before acceptance)
   */
  static async withdrawProposal(proposalId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      'proposals',
      `/proposals/${proposalId}`
    );

    if (!response.data) {
      throw new Error('Failed to withdraw proposal');
    }

    return response.data;
  }

  /**
   * Check if professional has already submitted a proposal for a lead
   */
  static async checkExistingProposal(leadId: string): Promise<{
    exists: boolean;
    proposal?: Proposal;
  }> {
    try {
      const response = await apiClient.get<Proposal>(
        'proposals',
        `/leads/${leadId}/my-proposal`
      );

      return {
        exists: true,
        proposal: response.data
      };
    } catch (error) {
      // If no proposal found, return exists: false
      if (error.message.includes('404') || error.message.includes('not found')) {
        return { exists: false };
      }
      throw error;
    }
  }
}

export default ProposalsService;