/**
 * OFAIR Microservices API Configuration
 * Service discovery and API client configuration for FastAPI microservices
 */

export interface ServiceConfig {
  baseURL: string;
  timeout: number;
  retries: number;
}

export interface ApiConfig {
  auth: ServiceConfig;
  users: ServiceConfig;
  leads: ServiceConfig;
  proposals: ServiceConfig;
  referrals: ServiceConfig;
  payments: ServiceConfig;
  notifications: ServiceConfig;
  admin: ServiceConfig;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '10000');

export const API_CONFIG: ApiConfig = {
  auth: {
    baseURL: `${API_BASE_URL}:${import.meta.env.VITE_AUTH_SERVICE_PORT || '8001'}`,
    timeout: API_TIMEOUT,
    retries: 3
  },
  users: {
    baseURL: `${API_BASE_URL}:${import.meta.env.VITE_USERS_SERVICE_PORT || '8002'}`,
    timeout: API_TIMEOUT,
    retries: 3
  },
  leads: {
    baseURL: `${API_BASE_URL}:${import.meta.env.VITE_LEADS_SERVICE_PORT || '8003'}`,
    timeout: API_TIMEOUT,
    retries: 3
  },
  proposals: {
    baseURL: `${API_BASE_URL}:${import.meta.env.VITE_PROPOSALS_SERVICE_PORT || '8004'}`,
    timeout: API_TIMEOUT,
    retries: 3
  },
  referrals: {
    baseURL: `${API_BASE_URL}:${import.meta.env.VITE_REFERRALS_SERVICE_PORT || '8005'}`,
    timeout: API_TIMEOUT,
    retries: 3
  },
  payments: {
    baseURL: `${API_BASE_URL}:${import.meta.env.VITE_PAYMENTS_SERVICE_PORT || '8006'}`,
    timeout: API_TIMEOUT,
    retries: 3
  },
  notifications: {
    baseURL: `${API_BASE_URL}:${import.meta.env.VITE_NOTIFICATIONS_SERVICE_PORT || '8007'}`,
    timeout: API_TIMEOUT,
    retries: 3
  },
  admin: {
    baseURL: `${API_BASE_URL}:${import.meta.env.VITE_ADMIN_SERVICE_PORT || '8008'}`,
    timeout: API_TIMEOUT,
    retries: 3
  }
};

export const SERVICE_ENDPOINTS = {
  auth: {
    sendOtp: '/auth/send-otp',
    verifyOtp: '/auth/verify-otp',
    revoke: '/auth/revoke',
    refresh: '/auth/refresh'
  },
  users: {
    me: '/users/me',
    updateProfile: '/users/me',
    professionals: '/professionals',
    professionalById: '/professionals',
    verifyProfessional: '/professionals'
  },
  leads: {
    public: '/leads/public',
    create: '/leads',
    getById: '/leads',
    update: '/leads',
    share: '/leads',
    proposals: '/leads'
  },
  proposals: {
    create: '/proposals',
    getByLead: '/proposals',
    accept: '/proposals',
    update: '/proposals'
  },
  referrals: {
    list: '/referrals',
    accept: '/referrals',
    reject: '/referrals'
  },
  payments: {
    initiate: '/payments/initiate',
    webhook: '/payments/webhook',
    status: '/payments',
    withdraw: '/wallets'
  },
  notifications: {
    list: '/notifications',
    send: '/notifications/send',
    markRead: '/notifications'
  }
} as const;

export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
} as const;