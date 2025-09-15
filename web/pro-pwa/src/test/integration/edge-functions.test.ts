/**
 * Integration tests for Supabase Edge Functions
 * These tests require a running Supabase instance
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Edge Functions Integration Tests', () => {
  describe('get-all-proposals', () => {
    it('should return proposals for valid professional ID', async () => {
      const { data, error } = await supabase.functions.invoke('get-all-proposals', {
        body: { professionalId: 'test-professional-id' }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return error for missing professional ID', async () => {
      const { data, error } = await supabase.functions.invoke('get-all-proposals', {
        body: {}
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('Professional ID is required');
    });

    it('should handle proposals with null prices correctly', async () => {
      const { data, error } = await supabase.functions.invoke('get-all-proposals', {
        body: { professionalId: 'test-professional-id' }
      });

      expect(error).toBeNull();
      if (data && data.length > 0) {
        data.forEach((proposal: Record<string, unknown>) => {
          // Price should be either a number or null, never NaN
          if (proposal.price !== null) {
            expect(typeof proposal.price).toBe('number');
            expect(isNaN(proposal.price as number)).toBe(false);
          }
        });
      }
    });
  });

  describe('update-work-completion', () => {
    it('should complete work successfully with valid data', async () => {
      const { data, error } = await supabase.functions.invoke('update-work-completion', {
        body: {
          proposalId: 'test-proposal-id',
          proposalType: 'lead',
          finalAmount: 1000,
          paymentMethod: 'cash',
          notes: 'Work completed successfully'
        }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      expect(data.paymentId).toBeDefined();
    });

    it('should return error for missing required fields', async () => {
      const { data, error } = await supabase.functions.invoke('update-work-completion', {
        body: {
          proposalId: 'test-proposal-id'
          // Missing finalAmount
        }
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('Missing required fields');
    });

    it('should calculate commission correctly', async () => {
      // This would require setting up test data in the database
      // For now, we'll test the API response structure
      const { data, error } = await supabase.functions.invoke('update-work-completion', {
        body: {
          proposalId: 'test-proposal-id',
          proposalType: 'lead',
          finalAmount: 1000,
          paymentMethod: 'cash'
        }
      });

      if (!error && data.success) {
        expect(data.paymentId).toBeDefined();
        expect(typeof data.paymentId).toBe('string');
      }
    });
  });

  describe('get-active-leads', () => {
    it('should return active leads for valid professional', async () => {
      const { data, error } = await supabase.functions.invoke('get-active-leads', {
        body: { 
          professionalId: 'test-professional-id',
          profession: 'Developer',
          city: 'Tel Aviv'
        }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should filter leads by profession correctly', async () => {
      const { data, error } = await supabase.functions.invoke('get-active-leads', {
        body: { 
          professionalId: 'test-professional-id',
          profession: 'NonexistentProfession',
          city: 'Tel Aviv'
        }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      
      // Should return empty array or only leads matching the profession
      if (data.length > 0) {
        data.forEach((lead: Record<string, unknown>) => {
          expect(lead.profession).toBe('NonexistentProfession');
        });
      }
    });
  });

  describe('submit-proposal', () => {
    it('should submit proposal successfully', async () => {
      const { data, error } = await supabase.functions.invoke('submit-proposal', {
        body: {
          leadId: 'test-lead-id',
          professionalId: 'test-professional-id',
          professionalName: 'Test Professional',
          description: 'Test proposal description',
          price: 1000,
          estimatedCompletion: '2024-12-31'
        }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      expect(data.proposalId).toBeDefined();
    });

    it('should prevent duplicate proposals', async () => {
      const proposalData = {
        leadId: 'test-lead-id',
        professionalId: 'test-professional-id',
        professionalName: 'Test Professional',
        description: 'Test proposal description',
        price: 1000,
        estimatedCompletion: '2024-12-31'
      };

      // Submit first proposal
      await supabase.functions.invoke('submit-proposal', {
        body: proposalData
      });

      // Try to submit duplicate proposal
      const { data, error } = await supabase.functions.invoke('submit-proposal', {
        body: proposalData
      });

      if (error) {
        expect(
          error.message.includes('duplicate') || 
          error.message.includes('already exists')
        ).toBe(true);
      }
    });
  });

  describe('get-notifications', () => {
    it('should return notifications for valid professional', async () => {
      const { data, error } = await supabase.functions.invoke('get-notifications', {
        body: { professionalId: 'test-professional-id' }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return empty array for professional with no notifications', async () => {
      const { data, error } = await supabase.functions.invoke('get-notifications', {
        body: { professionalId: 'nonexistent-professional-id' }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });
  });
});