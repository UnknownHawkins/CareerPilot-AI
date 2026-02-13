'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';

export function useAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshUser } = useAuthStore();

  useEffect(() => {
    if (requireAuth && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [requireAuth, isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Refresh user data on mount if authenticated
    if (isAuthenticated && !user) {
      refreshUser();
    }
  }, [isAuthenticated, user, refreshUser]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isPro: user?.role === 'pro' || user?.role === 'admin',
  };
}

export function useProFeature() {
  const { user } = useAuthStore();
  
  const hasProAccess = () => {
    return user?.role === 'pro' || user?.role === 'admin';
  };

  const checkFeatureLimit = (feature: string, used: number, limit: number) => {
    if (hasProAccess()) return { canUse: true, remaining: -1 };
    const remaining = limit - used;
    return { canUse: remaining > 0, remaining };
  };

  return {
    hasProAccess,
    checkFeatureLimit,
    isPro: hasProAccess(),
  };
}
