/**
 * Security utilities for edge functions
 */

export const validateInputLength = (input: string | null | undefined, maxLength: number, fieldName: string): void => {
  if (input && input.length > maxLength) {
    throw new Error(`Field ${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
};

export const sanitizeInput = (input: string | null | undefined): string => {
  if (!input) return '';
  
  // Remove potential XSS characters and trim
  return input
    .replace(/[<>\"']/g, '') // Remove basic XSS characters
    .trim()
    .slice(0, 1000); // Hard limit to prevent DoS
};

export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  
  // Israeli phone number validation
  const phoneRegex = /^(\+972|0)?[2-9]\d{7,8}$/;
  return phoneRegex.test(phone.replace(/[-\s]/g, ''));
};

export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const addSecurityHeaders = (headers: Record<string, string> = {}): Record<string, string> => {
  return {
    ...headers,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
};

export const maskSensitiveData = (data: string, visibleChars: number = 2): string => {
  if (!data || data.length <= visibleChars * 2) {
    return '*'.repeat(data?.length || 0);
  }
  
  const start = data.slice(0, visibleChars);
  const end = data.slice(-visibleChars);
  const middle = '*'.repeat(data.length - (visibleChars * 2));
  
  return start + middle + end;
};