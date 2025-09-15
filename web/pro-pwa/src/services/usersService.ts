/**
 * OFAIR Users Service
 * Handles user and professional profile management with FastAPI Users Service
 */

import apiClient from './apiClient';
import { SERVICE_ENDPOINTS } from '@/config/apiConfig';
import { Professional } from '@/types/profile';

export interface UserProfile {
  id: string;
  phone: string;
  email?: string;
  name: string;
  role: 'consumer' | 'professional' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface ProfessionalProfile extends Professional {
  user_id: string;
  is_verified: boolean;
  status: 'active' | 'inactive' | 'suspended';
  rating?: number;
  review_count?: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  profession?: string;
  company_name?: string;
  specialties?: string[];
  location?: string;
  about?: string;
  image?: string;
}

export interface ProfessionalListResponse {
  professionals: ProfessionalProfile[];
  total: number;
  page: number;
  per_page: number;
}

export class UsersService {
  /**
   * Get current user profile
   */
  static async getMyProfile(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>(
      'users',
      SERVICE_ENDPOINTS.users.me
    );

    if (!response.data) {
      throw new Error('Failed to fetch user profile');
    }

    return response.data;
  }

  /**
   * Update current user profile
   */
  static async updateMyProfile(updates: UpdateProfileRequest): Promise<UserProfile> {
    const response = await apiClient.put<UserProfile>(
      'users',
      SERVICE_ENDPOINTS.users.updateProfile,
      updates
    );

    if (!response.data) {
      throw new Error('Failed to update user profile');
    }

    return response.data;
  }

  /**
   * Get current professional profile (if user is a professional)
   */
  static async getMyProfessionalProfile(): Promise<ProfessionalProfile> {
    const response = await apiClient.get<ProfessionalProfile>(
      'users',
      '/professionals/me'
    );

    if (!response.data) {
      throw new Error('Professional profile not found');
    }

    return response.data;
  }

  /**
   * Create or update professional profile
   */
  static async updateProfessionalProfile(updates: UpdateProfileRequest): Promise<ProfessionalProfile> {
    const response = await apiClient.put<ProfessionalProfile>(
      'users',
      '/professionals/me',
      updates
    );

    if (!response.data) {
      throw new Error('Failed to update professional profile');
    }

    return response.data;
  }

  /**
   * Get public professional profiles (with pagination)
   */
  static async getProfessionals(params?: {
    page?: number;
    per_page?: number;
    profession?: string;
    location?: string;
    verified_only?: boolean;
  }): Promise<ProfessionalListResponse> {
    const searchParams: Record<string, string> = {};

    if (params?.page) searchParams.page = params.page.toString();
    if (params?.per_page) searchParams.per_page = params.per_page.toString();
    if (params?.profession) searchParams.profession = params.profession;
    if (params?.location) searchParams.location = params.location;
    if (params?.verified_only) searchParams.verified_only = 'true';

    const response = await apiClient.get<ProfessionalListResponse>(
      'users',
      SERVICE_ENDPOINTS.users.professionals,
      searchParams
    );

    if (!response.data) {
      throw new Error('Failed to fetch professionals');
    }

    return response.data;
  }

  /**
   * Get professional profile by ID (public view)
   */
  static async getProfessionalById(id: string): Promise<ProfessionalProfile> {
    const response = await apiClient.get<ProfessionalProfile>(
      'users',
      `${SERVICE_ENDPOINTS.users.professionalById}/${id}`
    );

    if (!response.data) {
      throw new Error('Professional not found');
    }

    return response.data;
  }

  /**
   * Check if professional exists by phone or email
   */
  static async checkProfessionalByIdentifier(identifier: string): Promise<{
    exists: boolean;
    professional?: ProfessionalProfile;
  }> {
    try {
      const isEmail = identifier.includes('@');
      const searchParams = {
        [isEmail ? 'email' : 'phone']: identifier
      };

      const response = await apiClient.get<ProfessionalProfile>(
        'users',
        '/professionals/check',
        searchParams
      );

      return {
        exists: !!response.data,
        professional: response.data
      };
    } catch (error) {
      // If professional not found, return exists: false
      if (error.message.includes('404') || error.message.includes('not found')) {
        return { exists: false };
      }
      throw error;
    }
  }

  /**
   * Upload professional certificate or image
   */
  static async uploadFile(file: File, type: 'certificate' | 'profile_image'): Promise<{
    url: string;
    file_id: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await apiClient.request<{
      url: string;
      file_id: string;
    }>(
      'users',
      '/upload',
      {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type, let browser set it with boundary
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

  /**
   * Request professional verification
   */
  static async requestVerification(documents: {
    certificate_url?: string;
    license_url?: string;
    additional_documents?: string[];
  }): Promise<{ message: string; request_id: string }> {
    const response = await apiClient.post<{ message: string; request_id: string }>(
      'users',
      '/professionals/verify-request',
      documents
    );

    if (!response.data) {
      throw new Error('Verification request failed');
    }

    return response.data;
  }
}

export default UsersService;