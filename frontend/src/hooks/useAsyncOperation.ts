/**
 * Custom hook for managing async operations with loading states and error handling.
 */

import { useState, useCallback, useRef } from 'react';
import { NetworkError } from '../utils/errorHandler';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: NetworkError | null;
  lastUpdated: number | null;
}

export interface UseAsyncOperationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: NetworkError) => void;
  retainDataOnError?: boolean;
  debounceMs?: number;
}

export function useAsyncOperation<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOperationOptions = {}
) {
  const {
    onSuccess,
    onError,
    retainDataOnError = true,
    debounceMs = 0
  } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const execute = useCallback(async (...args: any[]) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const executeOperation = async () => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState(prev => ({
        ...prev,
        loading: true,
        error: null
      }));

      try {
        const result = await asyncFunction(...args);
        
        // Check if operation was aborted
        if (abortController.signal.aborted) {
          return;
        }

        setState(prev => ({
          ...prev,
          data: result,
          loading: false,
          error: null,
          lastUpdated: Date.now()
        }));

        onSuccess?.(result);
      } catch (error: any) {
        // Check if operation was aborted
        if (abortController.signal.aborted) {
          return;
        }

        const networkError = error instanceof NetworkError 
          ? error 
          : new NetworkError(error.message || 'Неизвестная ошибка');

        setState(prev => ({
          ...prev,
          data: retainDataOnError ? prev.data : null,
          loading: false,
          error: networkError,
          lastUpdated: Date.now()
        }));

        onError?.(networkError);
      } finally {
        abortControllerRef.current = null;
      }
    };

    if (debounceMs > 0) {
      debounceTimeoutRef.current = setTimeout(executeOperation, debounceMs);
    } else {
      await executeOperation();
    }
  }, [asyncFunction, onSuccess, onError, retainDataOnError, debounceMs]);

  const reset = useCallback(() => {
    // Cancel any pending operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setState({
      data: null,
      loading: false,
      error: null,
      lastUpdated: null
    });
  }, []);

  const setData = useCallback((newData: T) => {
    setState(prev => ({
      ...prev,
      data: newData,
      lastUpdated: Date.now()
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
    clearError,
    isStale: state.lastUpdated ? Date.now() - state.lastUpdated > 5 * 60 * 1000 : false
  };
}
