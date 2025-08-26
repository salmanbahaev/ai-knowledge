/**
 * Dashboard API service.
 */

import { api } from './api';
import { ApiResponse, DashboardData } from '../types/api';

export const dashboardService = {
  /**
   * Get dashboard statistics and recent activities.
   */
  async getStats(): Promise<DashboardData> {
    const response = await api.get<ApiResponse<DashboardData>>('/dashboard/stats');
    return response.data.data;
  }
};
