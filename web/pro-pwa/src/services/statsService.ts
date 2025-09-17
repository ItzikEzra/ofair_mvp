/**
 * OFAIR Statistics Service
 * Handles professional dashboard statistics with FastAPI backend
 */

import apiClient from './apiClient';

export interface DashboardStats {
  activeLeads: number;
  acceptedProposals: number;
  completedProjects: number;
  averageRating: number;
  totalReviews: number;
  estimatedEarnings: string;
  monthlyEarnings: number;
  pendingProposals: number;
}

export interface StatsResponse {
  stats: DashboardStats;
  success: boolean;
}

export class StatsService {
  /**
   * Get dashboard statistics for the current professional
   */
  static async getDashboardStats(professionalId?: string): Promise<DashboardStats> {
    try {
      console.log("Fetching dashboard stats for professional:", professionalId);

      // For now, return mock data since we need to implement the stats endpoint
      // TODO: Implement /users/me/stats endpoint in FastAPI
      const mockStats: DashboardStats = {
        activeLeads: 0,
        acceptedProposals: 0,
        completedProjects: 0,
        averageRating: 0,
        totalReviews: 0,
        estimatedEarnings: "0 ₪",
        monthlyEarnings: 0,
        pendingProposals: 0
      };

      // Try to get real stats from backend if endpoint exists
      try {
        const response = await apiClient.get<StatsResponse>(
          'users',
          '/users/me/stats'
        );

        if (response.data?.stats) {
          return response.data.stats;
        }
      } catch (error) {
        console.log("Stats endpoint not yet implemented, using mock data");
      }

      return mockStats;

    } catch (error) {
      console.error("Error fetching dashboard stats:", error);

      // Return empty stats on error
      return {
        activeLeads: 0,
        acceptedProposals: 0,
        completedProjects: 0,
        averageRating: 0,
        totalReviews: 0,
        estimatedEarnings: "0 ₪",
        monthlyEarnings: 0,
        pendingProposals: 0
      };
    }
  }

  /**
   * Get earnings statistics
   */
  static async getEarningsStats(professionalId?: string): Promise<{
    monthlyEarnings: number;
    totalEarnings: number;
    pendingPayments: number;
  }> {
    try {
      // Try to get from payments service
      const response = await apiClient.get(
        'payments',
        '/payments/earnings'
      );

      return response.data || {
        monthlyEarnings: 0,
        totalEarnings: 0,
        pendingPayments: 0
      };
    } catch (error) {
      console.log("Earnings endpoint not yet implemented");
      return {
        monthlyEarnings: 0,
        totalEarnings: 0,
        pendingPayments: 0
      };
    }
  }

  /**
   * Get professional rating and reviews
   */
  static async getRatingStats(professionalId?: string): Promise<{
    averageRating: number;
    totalReviews: number;
  }> {
    try {
      // Get from professional profile
      const response = await apiClient.get(
        'users',
        '/users/me/professional'
      );

      const profile = response.data;
      return {
        averageRating: profile?.rating || 0,
        totalReviews: profile?.total_reviews || 0
      };
    } catch (error) {
      console.log("Could not fetch rating stats");
      return {
        averageRating: 0,
        totalReviews: 0
      };
    }
  }
}

export default StatsService;