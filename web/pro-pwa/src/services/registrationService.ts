/**
 * Professional Registration Service
 * Handles professional registration with Users Service
 */

import apiClient from './apiClient';

export interface ProfessionalRegistrationData {
  // Personal information
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;

  // Business information
  businessName: string;
  businessNumber?: string;
  profession: string;
  experienceYears: number;
  serviceArea: string;
  description: string;
}

export interface ProfessionalRegistrationResponse {
  success: boolean;
  message: string;
  message_he: string;
  user_id?: string;
  professional_id?: string;
}

export class RegistrationService {
  /**
   * Register new professional
   */
  static async registerProfessional(
    data: ProfessionalRegistrationData
  ): Promise<ProfessionalRegistrationResponse> {
    const response = await apiClient.post<ProfessionalRegistrationResponse>(
      'users',
      '/users/register/professional',
      {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        email: data.email || undefined,
        business_name: data.businessName,
        business_number: data.businessNumber || undefined,
        profession: data.profession,
        experience_years: data.experienceYears,
        service_area: data.serviceArea,
        description: data.description,
      }
    );

    if (!response.data) {
      throw new Error('Failed to register professional');
    }

    return response.data;
  }

  /**
   * Check if phone number is already registered
   */
  static async checkPhoneAvailability(phone: string): Promise<boolean> {
    try {
      // This would be a dedicated endpoint in a real implementation
      // For now, we'll handle this in the registration endpoint
      return true;
    } catch (error) {
      console.error('Phone availability check failed:', error);
      return false;
    }
  }

  /**
   * Validate Hebrew text input
   */
  static validateHebrewText(text: string, fieldName: string): string | null {
    if (!text || !text.trim()) {
      return `${fieldName} לא יכול להיות ריק`;
    }

    const hasHebrew = /[\u0590-\u05FF]/.test(text);
    if (!hasHebrew) {
      return `${fieldName} חייב להכיל תווים בעברית`;
    }

    return null;
  }

  /**
   * Validate Israeli phone number
   */
  static validateIsraeliPhone(phone: string): string | null {
    if (!phone) {
      return 'מספר טלפון נדרש';
    }

    // Remove spaces and dashes
    const cleanPhone = phone.replace(/[\s-]/g, '');

    // Check Israeli phone format
    const israeliPhoneRegex = /^(\+972|972|0)[0-9]{9}$/;
    if (!israeliPhoneRegex.test(cleanPhone)) {
      return 'מספר טלפון לא תקין. יש להזין מספר ישראלי';
    }

    return null;
  }

  /**
   * Format phone number to international format
   */
  static formatPhoneNumber(phone: string): string {
    const cleanPhone = phone.replace(/[\s-]/g, '');

    if (cleanPhone.startsWith('+972')) {
      return cleanPhone;
    } else if (cleanPhone.startsWith('972')) {
      return `+${cleanPhone}`;
    } else if (cleanPhone.startsWith('0')) {
      return `+972${cleanPhone.substring(1)}`;
    }

    return phone;
  }
}

export default RegistrationService;