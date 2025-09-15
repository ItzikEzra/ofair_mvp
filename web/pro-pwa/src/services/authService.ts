/**
 * OFAIR Authentication Service
 * Handles OTP authentication with FastAPI Auth Service
 */

import apiClient from './apiClient';
import { SERVICE_ENDPOINTS } from '@/config/apiConfig';

export interface SendOtpRequest {
  phone?: string;
  email?: string;
}

export interface SendOtpResponse {
  message: string;
  delivery_method: string;
  expires_at: string;
}

export interface VerifyOtpRequest {
  phone?: string;
  email?: string;
  otp: string;
}

export interface VerifyOtpResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  professional_id?: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  user_id?: string;
  professional_id?: string;
  expires_at?: string;
}

export class AuthService {
  /**
   * Send OTP to phone or email
   */
  static async sendOtp(request: SendOtpRequest): Promise<SendOtpResponse> {
    const response = await apiClient.post<SendOtpResponse>(
      'auth',
      SERVICE_ENDPOINTS.auth.sendOtp,
      request
    );

    if (!response.data) {
      throw new Error('Failed to send OTP');
    }

    return response.data;
  }

  /**
   * Verify OTP and get authentication token
   */
  static async verifyOtp(request: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    const response = await apiClient.post<VerifyOtpResponse>(
      'auth',
      SERVICE_ENDPOINTS.auth.verifyOtp,
      request
    );

    if (!response.data) {
      throw new Error('Failed to verify OTP');
    }

    // Store the token in the API client
    apiClient.setToken(response.data.access_token);

    return response.data;
  }

  /**
   * Validate current authentication token
   */
  static async validateToken(token?: string): Promise<TokenValidationResponse> {
    const tokenToValidate = token || apiClient.getToken();

    if (!tokenToValidate) {
      return { valid: false };
    }

    try {
      const response = await apiClient.get<TokenValidationResponse>(
        'auth',
        '/auth/validate-token'
      );

      return response.data || { valid: false };
    } catch (error) {
      console.error('Token validation failed:', error);
      return { valid: false };
    }
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(): Promise<VerifyOtpResponse | null> {
    try {
      const response = await apiClient.post<VerifyOtpResponse>(
        'auth',
        SERVICE_ENDPOINTS.auth.refresh
      );

      if (response.data) {
        // Update token in API client
        apiClient.setToken(response.data.access_token);
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  /**
   * Revoke authentication token (logout)
   */
  static async revokeToken(): Promise<boolean> {
    try {
      await apiClient.post('auth', SERVICE_ENDPOINTS.auth.revoke);

      // Clear token from API client
      apiClient.setToken(null);

      return true;
    } catch (error) {
      console.error('Token revocation failed:', error);
      // Still clear the token locally even if server call fails
      apiClient.setToken(null);
      return false;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = apiClient.getToken();
    if (!token) {
      return false;
    }

    const validation = await this.validateToken(token);
    return validation.valid;
  }

  /**
   * Get current authentication token
   */
  static getToken(): string | null {
    return apiClient.getToken();
  }

  /**
   * Set authentication token
   */
  static setToken(token: string | null): void {
    apiClient.setToken(token);
  }

  /**
   * Clear authentication state
   */
  static clearAuth(): void {
    apiClient.setToken(null);
  }
}

export default AuthService;