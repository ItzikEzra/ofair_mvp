/**
 * HTTP Client for OFAIR Microservices
 * Handles authentication, retries, and error handling for FastAPI services
 */

import { API_CONFIG, ServiceConfig, API_HEADERS } from '@/config/apiConfig';

export interface ApiResponse<T = any> {
  data: T;
  error?: string;
  status: number;
}

export interface ApiError {
  message: string;
  status: number;
  details?: any;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Initialize token from localStorage
    this.token = localStorage.getItem('ofair_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('ofair_token', token);
    } else {
      localStorage.removeItem('ofair_token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('ofair_token');
  }

  private getHeaders(additionalHeaders?: Record<string, string>): HeadersInit {
    const headers = { ...API_HEADERS };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return { ...headers, ...additionalHeaders };
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const status = response.status;

    try {
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || `HTTP ${status}`);
      }

      return { data, status };
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Response wasn't JSON
        const text = await response.text();
        throw new Error(`Invalid JSON response: ${text}`);
      }
      throw error;
    }
  }

  private async retryRequest<T>(
    url: string,
    options: RequestInit,
    retries: number,
    delay = 1000
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, options);
      return await this.handleResponse<T>(response);
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest<T>(url, options, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async request<T>(
    service: keyof typeof API_CONFIG,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const config = API_CONFIG[service];
    const url = `${config.baseURL}${endpoint}`;

    const requestOptions: RequestInit = {
      ...options,
      headers: this.getHeaders(options.headers as Record<string, string>),
    };

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await this.retryRequest<T>(url, requestOptions, config.retries);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${config.timeout}ms`);
      }

      throw error;
    }
  }

  // Convenience methods
  async get<T>(
    service: keyof typeof API_CONFIG,
    endpoint: string,
    params?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    return this.request<T>(service, url, { method: 'GET' });
  }

  async post<T>(
    service: keyof typeof API_CONFIG,
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    return this.request<T>(service, endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    service: keyof typeof API_CONFIG,
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    return this.request<T>(service, endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(
    service: keyof typeof API_CONFIG,
    endpoint: string
  ): Promise<ApiResponse<T>> {
    return this.request<T>(service, endpoint, { method: 'DELETE' });
  }

  // Health check method for service discovery
  async healthCheck(service: keyof typeof API_CONFIG): Promise<boolean> {
    try {
      const response = await this.get(service, '/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Check all services health
  async checkAllServices(): Promise<Record<string, boolean>> {
    const services = Object.keys(API_CONFIG) as (keyof typeof API_CONFIG)[];
    const healthChecks = await Promise.allSettled(
      services.map(service => this.healthCheck(service))
    );

    const results: Record<string, boolean> = {};
    services.forEach((service, index) => {
      const result = healthChecks[index];
      results[service] = result.status === 'fulfilled' && result.value;
    });

    return results;
  }
}

export const apiClient = new ApiClient();
export default apiClient;