/**
 * Client-side authentication validation and security utilities
 */

import { supabase } from "@/integrations/supabase/client";
import { Professional } from "@/types/profile";

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface RateLimitStatus {
  isAllowed: boolean;
  retryAfter?: number;
  attemptsRemaining?: number;
}

export class AuthSecurityValidator {
  private static readonly MAX_ATTEMPTS_PER_HOUR = 5;
  private static readonly LOCKOUT_DURATION_MINUTES = 60;
  private static readonly TOKEN_STORAGE_KEY = 'ofair_auth_token';
  private static readonly ATTEMPTS_STORAGE_KEY = 'ofair_auth_attempts';

  /**
   * Validate phone number format and security
   */
  static validatePhone(phone: string): ValidationResult {
    if (!phone) {
      return { isValid: false, error: 'Phone number is required' };
    }

    if (typeof phone !== 'string') {
      return { isValid: false, error: 'Invalid phone number format' };
    }

    // Check length to prevent DoS
    if (phone.length > 20) {
      return { isValid: false, error: 'Phone number too long' };
    }

    // Israeli phone number validation
    const normalizedPhone = phone.replace(/[-\s]/g, '');
    const phoneRegex = /^(\+972|0)?[2-9]\d{7,8}$/;
    
    if (!phoneRegex.test(normalizedPhone)) {
      return { isValid: false, error: 'Invalid Israeli phone number format' };
    }

    return { isValid: true };
  }

  /**
   * Validate OTP code format and security
   */
  static validateOTP(otp: string): ValidationResult {
    if (!otp) {
      return { isValid: false, error: 'OTP code is required' };
    }

    if (typeof otp !== 'string') {
      return { isValid: false, error: 'Invalid OTP format' };
    }

    // Check for common security issues
    if (otp.length < 4 || otp.length > 8) {
      return { isValid: false, error: 'Invalid OTP length' };
    }

    if (!/^\d+$/.test(otp)) {
      return { isValid: false, error: 'OTP must contain only numbers' };
    }

    return { isValid: true };
  }

  /**
   * Check rate limiting for authentication attempts
   */
  static checkRateLimit(identifier: string): RateLimitStatus {
    const storageKey = `${this.ATTEMPTS_STORAGE_KEY}_${identifier}`;
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) {
      return { isAllowed: true, attemptsRemaining: this.MAX_ATTEMPTS_PER_HOUR - 1 };
    }

    try {
      const { attempts, lastAttempt } = JSON.parse(stored);
      const hourAgo = Date.now() - (60 * 60 * 1000); // 1 hour ago
      
      // Reset if more than an hour has passed
      if (lastAttempt < hourAgo) {
        localStorage.removeItem(storageKey);
        return { isAllowed: true, attemptsRemaining: this.MAX_ATTEMPTS_PER_HOUR - 1 };
      }

      // Check if rate limit exceeded
      if (attempts >= this.MAX_ATTEMPTS_PER_HOUR) {
        const lockoutEnd = lastAttempt + (this.LOCKOUT_DURATION_MINUTES * 60 * 1000);
        const retryAfter = Math.max(0, lockoutEnd - Date.now());
        
        if (retryAfter > 0) {
          return { isAllowed: false, retryAfter: Math.ceil(retryAfter / 1000) };
        } else {
          // Lockout expired, reset
          localStorage.removeItem(storageKey);
          return { isAllowed: true, attemptsRemaining: this.MAX_ATTEMPTS_PER_HOUR - 1 };
        }
      }

      return { 
        isAllowed: true, 
        attemptsRemaining: this.MAX_ATTEMPTS_PER_HOUR - attempts - 1 
      };
    } catch (error) {
      // Invalid stored data, reset
      localStorage.removeItem(storageKey);
      return { isAllowed: true, attemptsRemaining: this.MAX_ATTEMPTS_PER_HOUR - 1 };
    }
  }

  /**
   * Record authentication attempt
   */
  static recordAttempt(identifier: string, success: boolean): void {
    const storageKey = `${this.ATTEMPTS_STORAGE_KEY}_${identifier}`;
    const stored = localStorage.getItem(storageKey);
    
    if (success) {
      // Clear attempts on successful auth
      localStorage.removeItem(storageKey);
      return;
    }

    const now = Date.now();
    let attempts = 1;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const hourAgo = now - (60 * 60 * 1000);
        
        if (parsed.lastAttempt > hourAgo) {
          attempts = parsed.attempts + 1;
        }
      } catch (error) {
        // Invalid data, start fresh
      }
    }

    localStorage.setItem(storageKey, JSON.stringify({
      attempts,
      lastAttempt: now
    }));
  }

  /**
   * Validate authentication token
   */
  static validateToken(token: string | null): ValidationResult {
    if (!token) {
      return { isValid: false, error: 'No authentication token' };
    }

    if (typeof token !== 'string') {
      return { isValid: false, error: 'Invalid token format' };
    }

    // Basic token format validation
    if (token.length < 10) {
      return { isValid: false, error: 'Token too short' };
    }

    if (token.length > 500) {
      return { isValid: false, error: 'Token too long' };
    }

    return { isValid: true };
  }

  /**
   * Sanitize professional data for client-side use
   */
  static sanitizeProfessionalData(professional: any): Professional | null {
    if (!professional || typeof professional !== 'object') {
      return null;
    }

    // Only include safe fields for client-side storage
    return {
      id: professional.id,
      name: professional.name || '',
      profession: professional.profession || '',
      location: professional.location || '',
      image: professional.image || '',
      about: professional.about || '',
      specialties: Array.isArray(professional.specialties) ? professional.specialties : [],
      experience_range: professional.experience_range || '',
      is_verified: Boolean(professional.is_verified),
      rating: Number(professional.rating) || 0,
      review_count: Number(professional.review_count) || 0,
      status: professional.status || 'pending',
      // Exclude sensitive data from client storage
      phone_number: '', // Never store phone numbers client-side
      email: '', // Never store emails client-side
      user_id: '', // Never store user IDs client-side
    } as Professional;
  }

  /**
   * Secure logout - clear all authentication data
   */
  static secureLogout(): void {
    try {
      // Clear all auth-related data
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('auth') || 
          key.includes('token') || 
          key.includes('professional') ||
          key.includes('ofair_')
        )) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Also clear session storage
      try {
        sessionStorage.clear();
      } catch (error) {
        // Ignore session storage errors
      }

      // Sign out from Supabase
      supabase.auth.signOut();

    } catch (error) {
      console.error('Error during secure logout:', error);
    }
  }

  /**
   * Get formatted error message for security errors
   */
  static getSecurityErrorMessage(error: string): string {
    switch (error) {
      case 'rate_limit_exceeded':
        return 'יותר מדי ניסיונות התחברות. אנא נסה שוב מאוחר יותר.';
      case 'invalid_phone':
        return 'מספר טלפון לא תקין. אנא הכנס מספר טלפון ישראלי תקין.';
      case 'invalid_otp':
        return 'קוד אימות לא תקין. אנא בדוק את הקוד ונסה שוב.';
      case 'token_invalid':
        return 'תקופת ההתחברות פגה. אנא התחבר מחדש.';
      case 'security_violation':
        return 'זוהתה פעילות חשודה. אנא פנה לתמיכה.';
      default:
        return 'אירעה שגיאה בתהליך ההתחברות. אנא נסה שוב.';
    }
  }
}