/**
 * OFAIR Payments Service
 * Handles B2B commission-based payment model with FastAPI Payments Service
 */

import apiClient from './apiClient';
import { SERVICE_ENDPOINTS } from '@/config/apiConfig';

export interface PaymentMethod {
  id: string;
  professional_id: string;
  type: 'credit_card' | 'bank_transfer';
  provider: 'stripe' | 'cardcom' | 'tranzilla';
  last_four?: string;
  expiry_month?: number;
  expiry_year?: number;
  bank_name?: string;
  account_number?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Balance {
  professional_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_paid: number;
  currency: 'ILS';
  last_updated: string;
}

export interface Transaction {
  id: string;
  professional_id: string;
  type: 'commission_charge' | 'referral_credit' | 'payout' | 'adjustment';
  amount: number;
  description: string;
  reference_id?: string; // lead_id, referral_id, etc.
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

export interface Invoice {
  id: string;
  professional_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  vat_amount: number; // 17% Israeli VAT
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  paid_at?: string;
  pdf_url?: string;
  line_items: InvoiceLineItem[];
  created_at: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  lead_id?: string;
  referral_id?: string;
}

export interface CommissionSummary {
  period: string;
  total_leads: number;
  customer_leads: {
    count: number;
    total_value: number;
    commission_rate: number; // 10%
    commission_owed: number;
  };
  professional_referrals: {
    count: number;
    total_value: number;
    commission_rate: number; // 5%
    commission_owed: number;
    revenue_share_earned: number;
  };
  net_amount: number; // commission_owed - revenue_share_earned
}

export class PaymentsService {
  /**
   * Get professional's balance information
   */
  static async getBalance(): Promise<Balance> {
    const response = await apiClient.get<Balance>(
      'payments',
      '/balances/me'
    );

    if (!response.data) {
      throw new Error('Failed to fetch balance');
    }

    return response.data;
  }

  /**
   * Get transaction history
   */
  static async getTransactions(params?: {
    page?: number;
    per_page?: number;
    type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    per_page: number;
  }> {
    const searchParams: Record<string, string> = {};

    if (params?.page) searchParams.page = params.page.toString();
    if (params?.per_page) searchParams.per_page = params.per_page.toString();
    if (params?.type) searchParams.type = params.type;
    if (params?.status) searchParams.status = params.status;
    if (params?.start_date) searchParams.start_date = params.start_date;
    if (params?.end_date) searchParams.end_date = params.end_date;

    const response = await apiClient.get<{
      transactions: Transaction[];
      total: number;
      page: number;
      per_page: number;
    }>(
      'payments',
      '/transactions/me',
      searchParams
    );

    if (!response.data) {
      throw new Error('Failed to fetch transactions');
    }

    return response.data;
  }

  /**
   * Get monthly commission summary
   */
  static async getCommissionSummary(params?: {
    year?: number;
    month?: number;
  }): Promise<CommissionSummary> {
    const searchParams: Record<string, string> = {};

    if (params?.year) searchParams.year = params.year.toString();
    if (params?.month) searchParams.month = params.month.toString();

    const response = await apiClient.get<CommissionSummary>(
      'payments',
      '/commissions/summary',
      searchParams
    );

    if (!response.data) {
      throw new Error('Failed to fetch commission summary');
    }

    return response.data;
  }

  /**
   * Get payment methods
   */
  static async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await apiClient.get<PaymentMethod[]>(
      'payments',
      '/payment-methods/me'
    );

    if (!response.data) {
      throw new Error('Failed to fetch payment methods');
    }

    return response.data;
  }

  /**
   * Add payment method
   */
  static async addPaymentMethod(paymentData: {
    type: 'credit_card' | 'bank_transfer';
    provider: 'stripe' | 'cardcom' | 'tranzilla';
    token?: string; // For credit cards from payment processor
    bank_details?: {
      bank_name: string;
      account_number: string;
      branch_number: string;
      account_holder_name: string;
    };
    set_as_default?: boolean;
  }): Promise<PaymentMethod> {
    const response = await apiClient.post<PaymentMethod>(
      'payments',
      '/payment-methods',
      paymentData
    );

    if (!response.data) {
      throw new Error('Failed to add payment method');
    }

    return response.data;
  }

  /**
   * Update payment method
   */
  static async updatePaymentMethod(
    methodId: string,
    updates: {
      is_default?: boolean;
      is_active?: boolean;
    }
  ): Promise<PaymentMethod> {
    const response = await apiClient.put<PaymentMethod>(
      'payments',
      `/payment-methods/${methodId}`,
      updates
    );

    if (!response.data) {
      throw new Error('Failed to update payment method');
    }

    return response.data;
  }

  /**
   * Delete payment method
   */
  static async deletePaymentMethod(methodId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      'payments',
      `/payment-methods/${methodId}`
    );

    if (!response.data) {
      throw new Error('Failed to delete payment method');
    }

    return response.data;
  }

  /**
   * Get invoices
   */
  static async getInvoices(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    year?: number;
  }): Promise<{
    invoices: Invoice[];
    total: number;
    page: number;
    per_page: number;
  }> {
    const searchParams: Record<string, string> = {};

    if (params?.page) searchParams.page = params.page.toString();
    if (params?.per_page) searchParams.per_page = params.per_page.toString();
    if (params?.status) searchParams.status = params.status;
    if (params?.year) searchParams.year = params.year.toString();

    const response = await apiClient.get<{
      invoices: Invoice[];
      total: number;
      page: number;
      per_page: number;
    }>(
      'payments',
      '/invoices/me',
      searchParams
    );

    if (!response.data) {
      throw new Error('Failed to fetch invoices');
    }

    return response.data;
  }

  /**
   * Get invoice by ID with PDF download URL
   */
  static async getInvoiceById(invoiceId: string): Promise<Invoice> {
    const response = await apiClient.get<Invoice>(
      'payments',
      `/invoices/${invoiceId}`
    );

    if (!response.data) {
      throw new Error('Invoice not found');
    }

    return response.data;
  }

  /**
   * Download invoice PDF
   */
  static async downloadInvoicePdf(invoiceId: string): Promise<Blob> {
    const response = await apiClient.request<Blob>(
      'payments',
      `/invoices/${invoiceId}/pdf`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
          'Authorization': `Bearer ${apiClient.getToken()}`
        }
      }
    );

    if (!response.data) {
      throw new Error('Failed to download invoice PDF');
    }

    return response.data;
  }

  /**
   * Pay invoice (trigger automatic payment)
   */
  static async payInvoice(
    invoiceId: string,
    paymentMethodId?: string
  ): Promise<{
    message: string;
    payment_id: string;
    status: 'processing' | 'completed' | 'failed';
  }> {
    const response = await apiClient.post<{
      message: string;
      payment_id: string;
      status: 'processing' | 'completed' | 'failed';
    }>(
      'payments',
      `/invoices/${invoiceId}/pay`,
      { payment_method_id: paymentMethodId }
    );

    if (!response.data) {
      throw new Error('Failed to process payment');
    }

    return response.data;
  }

  /**
   * Request payout (for positive balances)
   */
  static async requestPayout(amount: number): Promise<{
    message: string;
    payout_id: string;
    estimated_delivery: string;
  }> {
    const response = await apiClient.post<{
      message: string;
      payout_id: string;
      estimated_delivery: string;
    }>(
      'payments',
      '/payouts/request',
      { amount }
    );

    if (!response.data) {
      throw new Error('Failed to request payout');
    }

    return response.data;
  }

  /**
   * Get payout history
   */
  static async getPayouts(params?: {
    page?: number;
    per_page?: number;
    status?: string;
  }): Promise<{
    payouts: Array<{
      id: string;
      amount: number;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      requested_at: string;
      completed_at?: string;
      failure_reason?: string;
    }>;
    total: number;
    page: number;
    per_page: number;
  }> {
    const searchParams: Record<string, string> = {};

    if (params?.page) searchParams.page = params.page.toString();
    if (params?.per_page) searchParams.per_page = params.per_page.toString();
    if (params?.status) searchParams.status = params.status;

    const response = await apiClient.get<{
      payouts: Array<{
        id: string;
        amount: number;
        status: 'pending' | 'processing' | 'completed' | 'failed';
        requested_at: string;
        completed_at?: string;
        failure_reason?: string;
      }>;
      total: number;
      page: number;
      per_page: number;
    }>(
      'payments',
      '/payouts/me',
      searchParams
    );

    if (!response.data) {
      throw new Error('Failed to fetch payouts');
    }

    return response.data;
  }
}

export default PaymentsService;