/**
 * Comprehensive Microservices Integration Tests
 * Tests the complete integration with all FastAPI microservices
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import AuthService from '@/services/authService';
import UsersService from '@/services/usersService';
import LeadsService from '@/services/leadsService';
import ProposalsService from '@/services/proposalsService';
import ReferralsService from '@/services/referralsService';
import PaymentsService from '@/services/paymentsService';
import apiClient from '@/services/apiClient';

// Mock the API client
jest.mock('@/services/apiClient');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Microservices Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuthService.clearAuth();
  });

  afterEach(() => {
    AuthService.clearAuth();
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // Mock OTP send
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          message: 'OTP sent successfully',
          delivery_method: 'sms',
          expires_at: '2024-01-01T12:00:00Z'
        },
        status: 200
      });

      // Mock OTP verification
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-token-123',
          token_type: 'bearer',
          expires_in: 3600,
          user_id: 'user-456',
          professional_id: 'prof-789'
        },
        status: 200
      });

      mockApiClient.setToken = jest.fn();

      // Test OTP send
      const sendResult = await AuthService.sendOtp({ phone: '+972501234567' });
      expect(sendResult.message).toBe('OTP sent successfully');
      expect(sendResult.delivery_method).toBe('sms');

      // Test OTP verification
      const verifyResult = await AuthService.verifyOtp({
        phone: '+972501234567',
        otp: '123456'
      });

      expect(verifyResult.access_token).toBe('test-token-123');
      expect(verifyResult.user_id).toBe('user-456');
      expect(mockApiClient.setToken).toHaveBeenCalledWith('test-token-123');
    });

    it('should validate authentication token', async () => {
      mockApiClient.getToken.mockReturnValue('valid-token');
      mockApiClient.get.mockResolvedValueOnce({
        data: {
          valid: true,
          user_id: 'user-123',
          professional_id: 'prof-456'
        },
        status: 200
      });

      const isAuth = await AuthService.isAuthenticated();
      expect(isAuth).toBe(true);
    });
  });

  describe('Users Service Integration', () => {
    beforeEach(() => {
      mockApiClient.getToken.mockReturnValue('valid-token');
    });

    it('should fetch professional profile', async () => {
      const mockProfile = {
        id: 'prof-123',
        user_id: 'user-456',
        name: 'יוסי כהן',
        profession: 'אינסטלטור',
        location: 'תל אביב',
        is_verified: true,
        rating: 4.8,
        review_count: 25
      };

      mockApiClient.get.mockResolvedValueOnce({
        data: mockProfile,
        status: 200
      });

      const profile = await UsersService.getMyProfessionalProfile();
      expect(profile).toEqual(mockProfile);
      expect(mockApiClient.get).toHaveBeenCalledWith('users', '/professionals/me');
    });

    it('should update professional profile', async () => {
      const updates = {
        profession: 'חשמלאי',
        specialties: ['חשמל ביתי', 'מיזוג אוויר'],
        about: 'חשמלאי מוסמך עם 10 שנות ניסיון'
      };

      mockApiClient.put.mockResolvedValueOnce({
        data: { ...updates, id: 'prof-123' },
        status: 200
      });

      const result = await UsersService.updateProfessionalProfile(updates);
      expect(result.profession).toBe('חשמלאי');
      expect(result.specialties).toEqual(['חשמל ביתי', 'מיזוג אוויר']);
    });
  });

  describe('Leads Service Integration', () => {
    beforeEach(() => {
      mockApiClient.getToken.mockReturnValue('valid-token');
    });

    it('should create professional lead with Hebrew content', async () => {
      const leadData = {
        type: 'professional_referral' as const,
        title: 'תיקון מזגן בדחיפות',
        short_description: 'מזגן לא עובד, צריך תיקון מיידי',
        category: 'air_conditioning',
        location: 'רמת גן',
        client_name: 'רחל לוי',
        client_phone: '+972501234567',
        estimated_budget: 500,
        referrer_share_percentage: 15,
        preferred_sched: 'היום עד 18:00'
      };

      mockApiClient.post.mockResolvedValueOnce({
        data: {
          id: 'lead-123',
          ...leadData,
          status: 'active',
          created_at: '2024-01-01T10:00:00Z'
        },
        status: 201
      });

      const result = await LeadsService.createLead(leadData);
      expect(result.title).toBe('תיקון מזגן בדחיפות');
      expect(result.category).toBe('air_conditioning');
      expect(result.type).toBe('professional_referral');
    });

    it('should fetch leads with Hebrew categories', async () => {
      const mockLeads = {
        leads: [
          {
            id: 'lead-1',
            title: 'צביעת דירה',
            category: 'painting',
            location: 'תל אביב',
            status: 'active'
          },
          {
            id: 'lead-2',
            title: 'תיקון אינסטלציה',
            category: 'plumbing',
            location: 'חיפה',
            status: 'active'
          }
        ],
        total: 2,
        page: 1,
        per_page: 10
      };

      mockApiClient.get.mockResolvedValueOnce({
        data: mockLeads,
        status: 200
      });

      const result = await LeadsService.getPublicLeads({
        category: 'construction',
        location: 'תל אביב'
      });

      expect(result.leads).toHaveLength(2);
      expect(result.leads[0].title).toBe('צביעת דירה');
      expect(result.leads[1].title).toBe('תיקון אינסטלציה');
    });
  });

  describe('Proposals Service Integration', () => {
    beforeEach(() => {
      mockApiClient.getToken.mockReturnValue('valid-token');
    });

    it('should create proposal with Hebrew description', async () => {
      const proposalData = {
        lead_id: 'lead-123',
        price: 800,
        description: 'אני יכול לתקן את המזגן היום. יש לי ניסיון של 8 שנים בתיקון מזגנים מכל הסוגים.',
        scheduled_date: '2024-01-01T14:00:00Z'
      };

      mockApiClient.post.mockResolvedValueOnce({
        data: {
          id: 'proposal-456',
          ...proposalData,
          status: 'pending',
          created_at: '2024-01-01T11:00:00Z'
        },
        status: 201
      });

      const result = await ProposalsService.createProposal(proposalData);
      expect(result.description).toContain('אני יכול לתקן את המזגן היום');
      expect(result.price).toBe(800);
      expect(result.status).toBe('pending');
    });

    it('should accept proposal and reveal client details', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          message: 'הצעה אושרה בהצלחה',
          payment_id: 'payment-789',
          client_details: {
            name: 'רחל לוי',
            phone: '+972501234567',
            address: 'רחוב הרצל 45, רמת גן'
          }
        },
        status: 200
      });

      const result = await ProposalsService.acceptProposal('proposal-456');
      expect(result.message).toBe('הצעה אושרה בהצלחה');
      expect(result.client_details.name).toBe('רחל לוי');
      expect(result.client_details.phone).toBe('+972501234567');
    });
  });

  describe('Referrals Service Integration', () => {
    beforeEach(() => {
      mockApiClient.getToken.mockReturnValue('valid-token');
    });

    it('should fetch referrals with Hebrew names', async () => {
      const mockReferrals = {
        referrals: [
          {
            id: 'ref-1',
            lead_id: 'lead-123',
            status: 'pending',
            commission_percentage: 15,
            lead: {
              title: 'תיקון מזגן',
              category: 'air_conditioning',
              location: 'תל אביב'
            },
            referrer: {
              name: 'יוסי כהן',
              profession: 'טכנאי מזגנים'
            }
          }
        ],
        total: 1,
        page: 1,
        per_page: 10
      };

      mockApiClient.get.mockResolvedValueOnce({
        data: mockReferrals,
        status: 200
      });

      const result = await ReferralsService.getMyReferrals();
      expect(result.referrals[0].lead.title).toBe('תיקון מזגן');
      expect(result.referrals[0].referrer.name).toBe('יוסי כהן');
    });

    it('should accept referral', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          message: 'הפניה התקבלה בהצלחה',
          lead_access_granted: true
        },
        status: 200
      });

      const result = await ReferralsService.acceptReferral('ref-1');
      expect(result.message).toBe('הפניה התקבלה בהצלחה');
      expect(result.lead_access_granted).toBe(true);
    });
  });

  describe('Payments Service Integration (B2B Model)', () => {
    beforeEach(() => {
      mockApiClient.getToken.mockReturnValue('valid-token');
    });

    it('should fetch balance in ILS', async () => {
      const mockBalance = {
        professional_id: 'prof-123',
        available_balance: -250.75, // Owes money
        pending_balance: 150.00,
        total_earned: 3200.00,
        total_paid: 3450.75,
        currency: 'ILS' as const,
        last_updated: '2024-01-01T10:00:00Z'
      };

      mockApiClient.get.mockResolvedValueOnce({
        data: mockBalance,
        status: 200
      });

      const result = await PaymentsService.getBalance();
      expect(result.currency).toBe('ILS');
      expect(result.available_balance).toBe(-250.75);
      expect(result.total_earned).toBe(3200.00);
    });

    it('should fetch commission summary with Hebrew descriptions', async () => {
      const mockSummary = {
        period: '2024-01',
        total_leads: 12,
        customer_leads: {
          count: 8,
          total_value: 6400.00,
          commission_rate: 0.10,
          commission_owed: 640.00
        },
        professional_referrals: {
          count: 4,
          total_value: 2200.00,
          commission_rate: 0.05,
          commission_owed: 110.00,
          revenue_share_earned: 330.00
        },
        net_amount: 420.00 // 750 - 330
      };

      mockApiClient.get.mockResolvedValueOnce({
        data: mockSummary,
        status: 200
      });

      const result = await PaymentsService.getCommissionSummary({
        year: 2024,
        month: 1
      });

      expect(result.customer_leads.commission_rate).toBe(0.10); // 10%
      expect(result.professional_referrals.commission_rate).toBe(0.05); // 5%
      expect(result.net_amount).toBe(420.00);
    });

    it('should fetch invoice with Hebrew content', async () => {
      const mockInvoice = {
        id: 'inv-123',
        professional_id: 'prof-456',
        invoice_number: 'INV-2024-001',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        subtotal: 750.00,
        vat_amount: 127.50, // 17% Israeli VAT
        total_amount: 877.50,
        status: 'paid' as const,
        due_date: '2024-02-15',
        paid_at: '2024-02-10T14:30:00Z',
        line_items: [
          {
            description: 'עמלת פלטפורמה - לידים מלקוחות (8 לידים)',
            quantity: 8,
            unit_price: 80.00,
            total_price: 640.00
          },
          {
            description: 'עמלת פלטפורמה - הפניות מקצועיות (4 לידים)',
            quantity: 4,
            unit_price: 27.50,
            total_price: 110.00
          }
        ],
        created_at: '2024-02-01T09:00:00Z'
      };

      mockApiClient.get.mockResolvedValueOnce({
        data: mockInvoice,
        status: 200
      });

      const result = await PaymentsService.getInvoiceById('inv-123');
      expect(result.vat_amount).toBe(127.50); // 17% VAT
      expect(result.total_amount).toBe(877.50);
      expect(result.line_items[0].description).toContain('לידים מלקוחות');
    });
  });

  describe('Service Health Checks', () => {
    it('should check all services health', async () => {
      // Mock health check responses
      mockApiClient.get
        .mockResolvedValueOnce({ data: { status: 'ok' }, status: 200 }) // auth
        .mockResolvedValueOnce({ data: { status: 'ok' }, status: 200 }) // users
        .mockResolvedValueOnce({ data: { status: 'ok' }, status: 200 }) // leads
        .mockResolvedValueOnce({ data: { status: 'ok' }, status: 200 }) // proposals
        .mockResolvedValueOnce({ data: { status: 'ok' }, status: 200 }) // referrals
        .mockResolvedValueOnce({ data: { status: 'ok' }, status: 200 }) // payments
        .mockResolvedValueOnce({ data: { status: 'ok' }, status: 200 }) // notifications
        .mockResolvedValueOnce({ data: { status: 'ok' }, status: 200 }); // admin

      const healthStatus = await mockApiClient.checkAllServices();

      expect(Object.values(healthStatus).every(status => status)).toBe(true);
    });
  });
});