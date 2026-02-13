'use client';

import { useUIStore } from '@/store';

export function useToast() {
  const { addToast } = useUIStore();

  const toast = {
    success: (title: string, description?: string) => {
      addToast({ title, description, variant: 'success' });
    },
    error: (title: string, description?: string) => {
      addToast({ title, description, variant: 'error' });
    },
    warning: (title: string, description?: string) => {
      addToast({ title, description, variant: 'warning' });
    },
    info: (title: string, description?: string) => {
      addToast({ title, description, variant: 'info' });
    },
  };

  return toast;
}
