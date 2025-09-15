import { supabase } from "@/integrations/supabase/client";
import { SecureProfileService } from "@/services/secureProfileService";

/**
 * Service for retrieving statistics and dashboard data
 * Works with direct database queries using RLS policies
 */
export class StatsService {
  
  /**
   * Get dashboard statistics for the current professional
   */
  static async getDashboardStats(professionalId: string) {
    try {
      console.log("Fetching dashboard stats for professional:", professionalId);
      
      // Get proposals data - count accepted proposals
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('proposals')
        .select('id, status')
        .eq('professional_id', professionalId);
      
      if (proposalsError) {
        console.error("Error fetching proposals:", proposalsError);
      }

      // Get leads data - count active leads owned by this professional
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, status')
        .eq('professional_id', professionalId);
      
      if (leadsError) {
        console.error("Error fetching leads:", leadsError);
      }

      // Get projects data
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('professional_id', professionalId);
      
      if (projectsError) {
        console.error("Error fetching projects:", projectsError);
      }

      // Get professional rating using secure service
      const { data: professionalData, error: professionalError } = await SecureProfileService.getOwnProfile();
      
      if (professionalError) {
        console.error("Error fetching professional data:", professionalError);
      }

      // Calculate statistics
      const proposals = proposalsData || [];
      const leads = leadsData || [];
      const projects = projectsData || [];

      const acceptedProposals = proposals.filter((p: any) => p.status === 'accepted').length;
      const activeLeads = leads.filter((l: any) => l.status === 'active').length;
      const totalProjects = projects.length;
      const averageRating = professionalData?.rating || 0;

      // Calculate estimated earnings from lead payments
      const { data: leadPayments } = await supabase
        .from('lead_payments')
        .select('commission_amount')
        .eq('professional_id', professionalId);

      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data: monthlyPayments } = await supabase
        .from('lead_payments')
        .select('commission_amount')
        .eq('professional_id', professionalId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      const estimatedEarnings = (monthlyPayments || [])
        .reduce((sum: number, payment: any) => sum + (payment.commission_amount || 0), 0);

      return {
        acceptedProposals,
        activeLeads,
        totalProjects,
        averageRating,
        estimatedEarnings: `${estimatedEarnings.toLocaleString('he-IL')} ₪`,
        proposalsData: proposals,
        leadsData: leads,
        projectsData: projects
      };

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        acceptedProposals: 0,
        activeLeads: 0,
        totalProjects: 0,
        averageRating: 0,
        estimatedEarnings: "0 ₪",
        proposalsData: [],
        leadsData: [],
        projectsData: []
      };
    }
  }

  /**
   * Get payment data for the professional
   */
  static async getPaymentData(professionalId: string) {
    try {
      // Fetch lead payments
      const { data: leadPayments } = await supabase
        .from('lead_payments')
        .select('*')
        .eq('professional_id', professionalId);

      // Fetch icount transactions
      const { data: icountTransactions } = await supabase
        .from('icount_transactions')
        .select('*')
        .eq('professional_id', professionalId);

      return {
        leadPayments: leadPayments || [],
        icountTransactions: icountTransactions || []
      };
    } catch (error) {
      console.error('Error fetching payment data:', error);
      return {
        leadPayments: [],
        icountTransactions: []
      };
    }
  }
}