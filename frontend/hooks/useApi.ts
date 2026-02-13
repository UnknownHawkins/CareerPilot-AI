'use client';

import { useState, useCallback } from 'react';
import { useToast } from './useToast';

interface UseApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
) {
  const { showErrorToast = true, showSuccessToast = false, successMessage } = options;
  const toast = useToast();
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: any[]) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await apiFunction(...args);
        setData(result);
        
        if (showSuccessToast && successMessage) {
          toast.success(successMessage);
        }
        
        return result;
      } catch (err: any) {
        const error = err instanceof Error ? err : new Error(err.message || 'An error occurred');
        setError(error);
        
        if (showErrorToast) {
          toast.error('Error', error.message);
        }
        
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [apiFunction, showErrorToast, showSuccessToast, successMessage, toast]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    isLoading,
    error,
    execute,
    reset,
  };
}

export function useMutation<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
) {
  const { showErrorToast = true, showSuccessToast = true, successMessage = 'Success' } = options;
  const toast = useToast();
  
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(
    async (...args: any[]) => {
      setIsLoading(true);
      
      try {
        const result = await apiFunction(...args);
        
        if (showSuccessToast) {
          toast.success(successMessage);
        }
        
        return result;
      } catch (err: any) {
        if (showErrorToast) {
          toast.error('Error', err.response?.data?.message || err.message || 'An error occurred');
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiFunction, showErrorToast, showSuccessToast, successMessage, toast]
  );

  return {
    mutate,
    isLoading,
  };
}
