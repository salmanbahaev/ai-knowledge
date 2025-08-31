/**
 * Component for handling different data states (loading, error, empty, success).
 */

import React, { ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorFallback } from './ErrorBoundary';
import { NetworkError } from '../../utils/errorHandler';

export interface DataStateHandlerProps<T> {
  loading: boolean;
  error: NetworkError | null;
  data: T | null;
  
  // Render functions
  children: (data: T) => ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: (error: NetworkError, retry?: () => void) => ReactNode;
  emptyComponent?: ReactNode;
  
  // Options
  showEmptyState?: boolean;
  emptyChecker?: (data: T) => boolean;
  onRetry?: () => void;
  className?: string;
}

export function DataStateHandler<T>({
  loading,
  error,
  data,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
  showEmptyState = true,
  emptyChecker,
  onRetry,
  className = ''
}: DataStateHandlerProps<T>) {
  // Loading state
  if (loading && !data) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        {loadingComponent || <LoadingSpinner size="lg" text="Загрузка..." />}
      </div>
    );
  }

  // Error state (with optional data retention)
  if (error && !data) {
    return (
      <div className={className}>
        {errorComponent ? 
          errorComponent(error, onRetry) : 
          <ErrorFallback error={error} onRetry={onRetry} />
        }
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        {emptyComponent || <EmptyState />}
      </div>
    );
  }

  // Check for empty data
  const isEmpty = emptyChecker ? 
    emptyChecker(data) : 
    (Array.isArray(data) && data.length === 0);

  if (showEmptyState && isEmpty) {
    return (
      <div className={className}>
        {emptyComponent || <EmptyState />}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error.message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Попробовать снова
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Success state with data
  return (
    <div className={className}>
      {/* Show error banner if there's an error but we have data */}
      {error && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-yellow-700">{error.message}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-1 text-sm text-yellow-600 hover:text-yellow-800 underline"
                >
                  Обновить данные
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Show loading indicator if refreshing */}
      {loading && (
        <div className="mb-4 flex items-center p-2 bg-blue-50 border border-blue-200 rounded-md">
          <LoadingSpinner size="sm" className="mr-2" />
          <span className="text-sm text-blue-700">Обновление данных...</span>
        </div>
      )}

      {children(data)}
    </div>
  );
}

export const EmptyState: React.FC<{
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}> = ({
  title = 'Нет данных',
  description = 'Здесь пока ничего нет',
  action,
  icon,
  className = ''
}) => (
  <div className={`text-center py-12 ${className}`}>
    <div className="mb-4">
      {icon || (
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      )}
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 mb-6">{description}</p>
    {action}
  </div>
);

export default DataStateHandler;
