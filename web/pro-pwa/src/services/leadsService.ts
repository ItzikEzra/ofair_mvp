/**
 * OFAIR Leads Service
 * Handles lead management with FastAPI Leads Service
 */

import apiClient from './apiClient';
import { SERVICE_ENDPOINTS } from '@/config/apiConfig';

export interface Lead {
  id: string;
  type: 'consumer' | 'professional_referral';
  title: string;
  short_description: string;
  category: string;
  location: string;
  status: 'active' | 'pending' | 'closed';
  created_by_user_id: string;
  created_by_professional_id?: string;
  final_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface ConsumerLead extends Lead {
  client_name: string;
  client_phone: string; // PII - restricted access
  client_address: string;
  full_description: string;
}

export interface ProfessionalLead extends Lead {
  client_name: string;
  client_phone: string; // PII - restricted access
  estimated_budget: number;
  attachments: string[];
  preferred_sched: string;
  referrer_share_percentage: number;
}

export interface CreateLeadRequest {
  type: 'consumer' | 'professional_referral';
  title: string;
  short_description: string;
  category: string;
  location: string;

  // Consumer lead fields
  client_name?: string;
  client_phone?: string;
  client_address?: string;
  full_description?: string;

  // Professional lead fields
  estimated_budget?: number;
  attachments?: string[];
  preferred_sched?: string;
  referrer_share_percentage?: number;
}

export interface LeadsListResponse {
  leads: Lead[];
  total: number;
  page: number;
  per_page: number;
}

export interface ShareLeadRequest {
  receiver_professional_id: string;
  message?: string;
}

export class LeadsService {
  /**
   * Get public leads (Lead Board)
   */
  static async getPublicLeads(params?: {
    page?: number;
    per_page?: number;
    category?: string;
    location?: string;
    radius?: number;
    subscription_filter?: boolean;
  }): Promise<LeadsListResponse> {
    const searchParams: Record<string, string> = {};

    if (params?.page) searchParams.page = params.page.toString();
    if (params?.per_page) searchParams.per_page = params.per_page.toString();
    if (params?.category) searchParams.category = params.category;
    if (params?.location) searchParams.location = params.location;
    if (params?.radius) searchParams.radius = params.radius.toString();
    if (params?.subscription_filter) searchParams.subscription_filter = 'true';

    const response = await apiClient.get<LeadsListResponse>(
      'leads',
      SERVICE_ENDPOINTS.leads.public,
      searchParams
    );

    if (!response.data) {
      throw new Error('Failed to fetch public leads');
    }

    return response.data;
  }

  /**
   * Create a new lead
   */
  static async createLead(leadData: CreateLeadRequest): Promise<Lead> {
    const response = await apiClient.post<Lead>(
      'leads',
      SERVICE_ENDPOINTS.leads.create,
      leadData
    );

    if (!response.data) {
      throw new Error('Failed to create lead');
    }

    return response.data;
  }

  /**
   * Get lead by ID (includes PII if authorized)
   */
  static async getLeadById(id: string): Promise<ConsumerLead | ProfessionalLead> {
    const response = await apiClient.get<ConsumerLead | ProfessionalLead>(
      'leads',
      `${SERVICE_ENDPOINTS.leads.getById}/${id}`
    );

    if (!response.data) {
      throw new Error('Lead not found');
    }

    return response.data;
  }

  /**
   * Update lead (owner only)
   */
  static async updateLead(
    id: string,
    updates: Partial<CreateLeadRequest>
  ): Promise<Lead> {
    const response = await apiClient.put<Lead>(
      'leads',
      `${SERVICE_ENDPOINTS.leads.update}/${id}`,
      updates
    );

    if (!response.data) {
      throw new Error('Failed to update lead');
    }

    return response.data;
  }

  /**
   * Share/refer lead to another professional
   */
  static async shareLead(
    leadId: string,
    shareData: ShareLeadRequest
  ): Promise<{ message: string; referral_id: string }> {
    const response = await apiClient.post<{ message: string; referral_id: string }>(
      'leads',
      `${SERVICE_ENDPOINTS.leads.share}/${leadId}/share`,
      shareData
    );

    if (!response.data) {
      throw new Error('Failed to share lead');
    }

    return response.data;
  }

  /**
   * Get my created leads
   */
  static async getMyLeads(params?: {
    page?: number;
    per_page?: number;
    status?: string;
  }): Promise<LeadsListResponse> {
    const searchParams: Record<string, string> = {};

    if (params?.page) searchParams.page = params.page.toString();
    if (params?.per_page) searchParams.per_page = params.per_page.toString();
    if (params?.status) searchParams.status = params.status;

    const response = await apiClient.get<LeadsListResponse>(
      'leads',
      '/leads/my-leads',
      searchParams
    );

    if (!response.data) {
      throw new Error('Failed to fetch my leads');
    }

    return response.data;
  }

  /**
   * Get lead categories
   */
  static async getLeadCategories(): Promise<{ id: string; name: string; name_he: string }[]> {
    const response = await apiClient.get<{ id: string; name: string; name_he: string }[]>(
      'leads',
      '/leads/categories'
    );

    if (!response.data) {
      throw new Error('Failed to fetch lead categories');
    }

    return response.data;
  }

  /**
   * Upload lead attachment
   */
  static async uploadAttachment(file: File): Promise<{ url: string; file_id: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.request<{ url: string; file_id: string }>(
      'leads',
      '/leads/upload-attachment',
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
      throw new Error('File upload failed');
    }

    return response.data;
  }
}

export default LeadsService;