/**
 * Hook for implementing optimistic updates with rollback capability.
 */

import { useState, useCallback, useRef } from 'react';
import { NetworkError } from '../utils/errorHandler';

export interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: NetworkError, rollbackData: T) => void;
  rollbackDelay?: number;
}

export interface OptimisticState<T> {
  data: T;
  loading: boolean;
  error: NetworkError | null;
  isOptimistic: boolean;
}

export function useOptimisticUpdate<T, P = any>(
  initialData: T,
  updateFunction: (params: P) => Promise<T>,
  options: OptimisticUpdateOptions<T> = {}
) {
  const {
    onSuccess,
    onError,
    rollbackDelay = 3000
  } = options;

  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    loading: false,
    error: null,
    isOptimistic: false
  });

  const rollbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalDataRef = useRef<T>(initialData);

  const executeOptimisticUpdate = useCallback(
    async (optimisticData: T, updateParams: P) => {
      // Clear any existing rollback timeout
      if (rollbackTimeoutRef.current) {
        clearTimeout(rollbackTimeoutRef.current);
      }

      // Store original data for potential rollback
      originalDataRef.current = state.data;

      // Apply optimistic update immediately
      setState(prev => ({
        ...prev,
        data: optimisticData,
        loading: true,
        error: null,
        isOptimistic: true
      }));

      try {
        // Execute the actual update
        const result = await updateFunction(updateParams);

        // Update with real data from server
        setState(prev => ({
          ...prev,
          data: result,
          loading: false,
          error: null,
          isOptimistic: false
        }));

        onSuccess?.(result);
      } catch (error: any) {
        const networkError = error instanceof NetworkError 
          ? error 
          : new NetworkError(error.message || 'Ошибка обновления');

        // Set up rollback timeout
        rollbackTimeoutRef.current = setTimeout(() => {
          setState(prev => ({
            ...prev,
            data: originalDataRef.current,
            loading: false,
            error: networkError,
            isOptimistic: false
          }));
        }, rollbackDelay);

        // Show error state but keep optimistic data temporarily
        setState(prev => ({
          ...prev,
          loading: false,
          error: networkError,
          isOptimistic: true // Still showing optimistic data
        }));

        onError?.(networkError, originalDataRef.current);
      }
    },
    [state.data, updateFunction, onSuccess, onError, rollbackDelay]
  );

  const rollbackImmediately = useCallback(() => {
    if (rollbackTimeoutRef.current) {
      clearTimeout(rollbackTimeoutRef.current);
    }

    setState(prev => ({
      ...prev,
      data: originalDataRef.current,
      isOptimistic: false,
      error: null
    }));
  }, []);

  const updateData = useCallback((newData: T) => {
    setState(prev => ({
      ...prev,
      data: newData,
      isOptimistic: false
    }));
    originalDataRef.current = newData;
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  return {
    ...state,
    executeOptimisticUpdate,
    rollbackImmediately,
    updateData,
    clearError
  };
}

/**
 * Specialized hook for optimistic list operations (add, remove, update items).
 */
export function useOptimisticList<T extends { id: string | number }>(
  initialList: T[],
  apiOperations: {
    add?: (item: Omit<T, 'id'>) => Promise<T>;
    remove?: (id: string | number) => Promise<void>;
    update?: (id: string | number, data: Partial<T>) => Promise<T>;
  }
) {
  const optimisticUpdateHook = useOptimisticUpdate<T[], { operation: string; id?: string | number; item?: Omit<T, 'id'>; data?: Partial<T>; currentList: T[] }>(
    initialList,
    async (params: { operation: string; id?: string | number; item?: Omit<T, 'id'>; data?: Partial<T>; currentList: T[] }): Promise<T[]> => {
      const { operation, currentList, ...args } = params;

      switch (operation) {
        case 'add':
          const newItem = await apiOperations.add?.(args.item!);
          return newItem ? [...currentList, newItem] : currentList;
        case 'remove':
          await apiOperations.remove?.(args.id!);
          return currentList.filter((item: T) => item.id !== args.id);
        case 'update':
          const updatedItem = await apiOperations.update?.(args.id!, args.data!);
          return updatedItem ? currentList.map((item: T) =>
            item.id === args.id ? updatedItem : item
          ) : currentList;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    }
  );

  const {
    data: list,
    executeOptimisticUpdate,
    updateData,
    ...state
  } = optimisticUpdateHook;

  const addItem = useCallback(
    (newItem: Omit<T, 'id'>) => {
      const tempId = `temp-${Date.now()}`;
      const optimisticItem = { ...newItem, id: tempId } as T;
      const optimisticList = [...list, optimisticItem];

      executeOptimisticUpdate(optimisticList, {
        operation: 'add',
        item: newItem,
        currentList: list
      });
    },
    [list, executeOptimisticUpdate]
  );

  const removeItem = useCallback(
    (id: string | number) => {
      const optimisticList = list.filter(item => item.id !== id);

      executeOptimisticUpdate(optimisticList, {
        operation: 'remove',
        id,
        currentList: list
      });
    },
    [list, executeOptimisticUpdate]
  );

  const updateItem = useCallback(
    (id: string | number, updates: Partial<T>) => {
      const optimisticList = list.map(item =>
        item.id === id ? { ...item, ...updates } : item
      );

      executeOptimisticUpdate(optimisticList, {
        operation: 'update',
        id,
        data: updates,
        currentList: list
      });
    },
    [list, executeOptimisticUpdate]
  );

  return {
    list,
    addItem,
    removeItem,
    updateItem,
    updateList: updateData,
    ...state
  };
}
