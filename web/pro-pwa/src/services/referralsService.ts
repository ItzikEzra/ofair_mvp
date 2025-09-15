/**
 * OFAIR Referrals Service
 * Handles referral management with FastAPI Referrals Service
 */

import apiClient from './apiClient';
import { SERVICE_ENDPOINTS } from '@/config/apiConfig';

export interface Referral {
  id: string;
  lead_id: string;
  referrer_professional_id: string;
  receiver_professional_id: string;
  commission_percentage: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  message?: string;
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
  lead?: {
    id: string;
    title: string;
    category: string;
    location: string;
    estimated_budget?: number;
  };
  referrer?: {
    id: string;
    name: string;
    profession: string;
  };
  receiver?: {
    id: string;
    name: string;
    profession: string;
  };
}

export interface ReferralsListResponse {
  referrals: Referral[];
  total: number;
  page: number;
  per_page: number;
}

export interface ReferralStats {
  sent_referrals: {
    total: number;
    accepted: number;
    completed: number;
    total_commission_earned: number;
  };
  received_referrals: {
    total: number;
    accepted: number;
    completed: number;
  };
  performance_tier: 'bronze' | 'silver' | 'gold' | 'premium';
  commission_rate: number;
}

export class ReferralsService {
  /**
   * Get referrals relevant to current professional
   * (both sent and received)
   */
  static async getMyReferrals(params?: {
    page?: number;
    per_page?: number;
    type?: 'sent' | 'received' | 'all';
    status?: string;
  }): Promise<ReferralsListResponse> {
    const searchParams: Record<string, string> = {};

    if (params?.page) searchParams.page = params.page.toString();
    if (params?.per_page) searchParams.per_page = params.per_page.toString();
    if (params?.type) searchParams.type = params.type;
    if (params?.status) searchParams.status = params.status;

    const response = await apiClient.get<ReferralsListResponse>(
      'referrals',
      SERVICE_ENDPOINTS.referrals.list,
      searchParams
    );

    if (!response.data) {
      throw new Error('Failed to fetch referrals');
    }

    return response.data;
  }

  /**
   * Accept a referral (receiver claims the lead)
   */
  static async acceptReferral(referralId: string): Promise<{
    message: string;
    lead_access_granted: boolean;
  }> {
    const response = await apiClient.post<{
      message: string;
      lead_access_granted: boolean;
    }>(
      'referrals',
      `${SERVICE_ENDPOINTS.referrals.accept}/${referralId}/accept`
    );

    if (!response.data) {
      throw new Error('Failed to accept referral');
    }

    return response.data;
  }

  /**
   * Reject a referral
   */
  static async rejectReferral(
    referralId: string,
    reason?: string
  ): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      'referrals',
      `${SERVICE_ENDPOINTS.referrals.reject}/${referralId}/reject`,
      { reason }
    );

    if (!response.data) {
      throw new Error('Failed to reject referral');
    }

    return response.data;
  }

  /**
   * Get referral by ID
   */
  static async getReferralById(referralId: string): Promise<Referral> {
    const response = await apiClient.get<Referral>(
      'referrals',
      `/referrals/${referralId}`
    );

    if (!response.data) {
      throw new Error('Referral not found');
    }

    return response.data;
  }

  /**
   * Get referral statistics for current professional
   */
  static async getReferralStats(): Promise<ReferralStats> {
    const response = await apiClient.get<ReferralStats>(
      'referrals',
      '/referrals/stats'
    );

    if (!response.data) {
      throw new Error('Failed to fetch referral stats');
    }

    return response.data;
  }

  /**
   * Get commission earnings breakdown
   */
  static async getCommissionEarnings(params?: {
    year?: number;
    month?: number;
  }): Promise<{
    total_earned: number;
    pending_earnings: number;
    paid_earnings: number;
    earnings_breakdown: Array<{
      date: string;
      referral_id: string;
      lead_title: string;
      commission_amount: number;
      status: 'pending' | 'paid';
    }>;
  }> {
    const searchParams: Record<string, string> = {};

    if (params?.year) searchParams.year = params.year.toString();
    if (params?.month) searchParams.month = params.month.toString();

    const response = await apiClient.get<{
      total_earned: number;
      pending_earnings: number;
      paid_earnings: number;
      earnings_breakdown: Array<{
        date: string;
        referral_id: string;
        lead_title: string;
        commission_amount: number;
        status: 'pending' | 'paid';
      }>;
    }>(
      'referrals',
      '/referrals/earnings',
      searchParams
    );

    if (!response.data) {
      throw new Error('Failed to fetch commission earnings');
    }

    return response.data;
  }

  /**
   * Get referral chain for a specific lead
   */
  static async getReferralChain(leadId: string): Promise<{
    chain_length: number;
    referral_chain: Array<{
      level: number;
      referrer: {
        id: string;
        name: string;
        profession: string;
      };
      commission_percentage: number;
    }>;
  }> {
    const response = await apiClient.get<{
      chain_length: number;
      referral_chain: Array<{
        level: number;
        referrer: {
          id: string;
          name: string;
          profession: string;
        };
        commission_percentage: number;
      }>;
    }>(
      'referrals',
      `/referrals/chain/${leadId}`
    );

    if (!response.data) {
      throw new Error('Failed to fetch referral chain');
    }

    return response.data;
  }

  /**
   * Update referral status (internal use - typically called by system)
   */
  static async updateReferralStatus(
    referralId: string,
    status: 'completed' | 'cancelled',
    reason?: string
  ): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>(
      'referrals',
      `/referrals/${referralId}/status`,
      { status, reason }
    );

    if (!response.data) {
      throw new Error('Failed to update referral status');
    }

    return response.data;
  }

  /**
   * Get available professionals for referral (based on category and location)
   */
  static async getAvailableProfessionalsForReferral(params: {
    category: string;
    location: string;
    exclude_current?: boolean;
  }): Promise<Array<{
    id: string;
    name: string;
    profession: string;
    location: string;
    rating?: number;
    review_count?: number;
    is_verified: boolean;
    availability_score: number;
  }>> {
    const searchParams: Record<string, string> = {
      category: params.category,
      location: params.location,
    };

    if (params.exclude_current) searchParams.exclude_current = 'true';

    const response = await apiClient.get<Array<{
      id: string;
      name: string;
      profession: string;
      location: string;
      rating?: number;
      review_count?: number;
      is_verified: boolean;
      availability_score: number;
    }>>(
      'referrals',
      '/referrals/available-professionals',
      searchParams
    );

    if (!response.data) {
      throw new Error('Failed to fetch available professionals');
    }

    return response.data;
  }
}

export default ReferralsService;