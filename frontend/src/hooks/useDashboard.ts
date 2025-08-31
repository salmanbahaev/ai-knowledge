/**
 * Custom hook for dashboard data management with optimized loading and caching.
 */

import { useEffect } from 'react';
import { useAsyncOperation } from './useAsyncOperation';
import { dashboardService } from '../services/dashboardService';
import { DashboardData } from '../types/api';

export function useDashboard() {
  const {
    data,
    loading,
    error,
    execute,
    isStale,
    clearError
  } = useAsyncOperation<DashboardData>(
    dashboardService.getStats,
    {
      onSuccess: (data) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Dashboard data loaded:', data);
        }
      },
      onError: (error) => {
        console.error('❌ Dashboard loading failed:', error.message);
      },
      retainDataOnError: true // Keep showing old data if refresh fails
    }
  );

  // Auto-load on mount
  useEffect(() => {
    execute();
  }, [execute]);

  // Auto-refresh stale data every 2 minutes
  useEffect(() => {
    if (isStale) {
      execute();
    }
  }, [isStale, execute]);

  const refresh = async () => {
    try {
      await dashboardService.refreshStats();
      await execute();
    } catch (error) {
      // Error handled by useAsyncOperation
    }
  };

  return {
    data,
    loading,
    error,
    isStale,
    refresh,
    clearError
  };
}
