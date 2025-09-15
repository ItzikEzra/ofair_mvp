/**
 * Integration tests for AuthService
 * Tests the FastAPI Auth Service integration
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import AuthService from '@/services/authService';
import apiClient from '@/services/apiClient';

// Mock the API client for testing
jest.mock('@/services/apiClient');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('AuthService Integration Tests', () => {
  beforeEach(() => {
    // Clear any existing tokens
    AuthService.clearAuth();
    jest.clearAllMocks();
  });

  afterEach(() => {
    AuthService.clearAuth();
  });

  describe('sendOtp', () => {
    it('should send OTP to phone number', async () => {
      const mockResponse = {
        data: {
          message: 'OTP sent successfully',
          delivery_method: 'sms',
          expires_at: '2024-01-01T12:00:00Z'
        },
        status: 200
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await AuthService.sendOtp({ phone: '+972501234567' });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        'auth',
        '/auth/send-otp',
        { phone: '+972501234567' }
      );

      expect(result).toEqual({
        message: 'OTP sent successfully',
        delivery_method: 'sms',
        expires_at: '2024-01-01T12:00:00Z'
      });
    });

    it('should send OTP to email', async () => {
      const mockResponse = {
        data: {
          message: 'OTP sent successfully',
          delivery_method: 'email',
          expires_at: '2024-01-01T12:00:00Z'
        },
        status: 200
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await AuthService.sendOtp({ email: 'test@example.com' });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        'auth',
        '/auth/send-otp',
        { email: 'test@example.com' }
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle send OTP failure', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: null, status: 400 });

      await expect(AuthService.sendOtp({ phone: '+972501234567' }))
        .rejects.toThrow('Failed to send OTP');
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP and return token', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-token',
          token_type: 'bearer',
          expires_in: 3600,
          user_id: 'user-123',
          professional_id: 'prof-456'
        },
        status: 200
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);
      mockApiClient.setToken = jest.fn();

      const result = await AuthService.verifyOtp({
        phone: '+972501234567',
        otp: '123456'
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        'auth',
        '/auth/verify-otp',
        { phone: '+972501234567', otp: '123456' }
      );

      expect(mockApiClient.setToken).toHaveBeenCalledWith('test-token');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle verify OTP failure', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: null, status: 401 });

      await expect(AuthService.verifyOtp({
        phone: '+972501234567',
        otp: '123456'
      })).rejects.toThrow('Failed to verify OTP');
    });
  });

  describe('validateToken', () => {
    it('should validate valid token', async () => {
      const mockResponse = {
        data: {
          valid: true,
          user_id: 'user-123',
          professional_id: 'prof-456',
          expires_at: '2024-01-01T12:00:00Z'
        },
        status: 200
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);
      mockApiClient.getToken.mockReturnValueOnce('test-token');

      const result = await AuthService.validateToken();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        'auth',
        '/auth/validate-token'
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should return invalid for missing token', async () => {
      mockApiClient.getToken.mockReturnValueOnce(null);

      const result = await AuthService.validateToken();

      expect(result).toEqual({ valid: false });
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should handle validation error', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Network error'));
      mockApiClient.getToken.mockReturnValueOnce('test-token');

      const result = await AuthService.validateToken();

      expect(result).toEqual({ valid: false });
    });
  });

  describe('isAuthenticated', () => {
    it('should return true for valid authentication', async () => {
      mockApiClient.getToken.mockReturnValueOnce('test-token');
      mockApiClient.get.mockResolvedValueOnce({
        data: { valid: true },
        status: 200
      });

      const result = await AuthService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false for no token', async () => {
      mockApiClient.getToken.mockReturnValueOnce(null);

      const result = await AuthService.isAuthenticated();

      expect(result).toBe(false);
    });

    it('should return false for invalid token', async () => {
      mockApiClient.getToken.mockReturnValueOnce('invalid-token');
      mockApiClient.get.mockResolvedValueOnce({
        data: { valid: false },
        status: 200
      });

      const result = await AuthService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('revokeToken', () => {
    it('should revoke token successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: {}, status: 200 });
      mockApiClient.setToken = jest.fn();

      const result = await AuthService.revokeToken();

      expect(mockApiClient.post).toHaveBeenCalledWith('auth', '/auth/revoke');
      expect(mockApiClient.setToken).toHaveBeenCalledWith(null);
      expect(result).toBe(true);
    });

    it('should clear token even on server error', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Server error'));
      mockApiClient.setToken = jest.fn();

      const result = await AuthService.revokeToken();

      expect(mockApiClient.setToken).toHaveBeenCalledWith(null);
      expect(result).toBe(false);
    });
  });
});