'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useAuthStore } from '@/store';
import { authApi } from '@/lib/api';

function ClerkSync() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { setUser, logout, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && clerkUser) {
      const syncUser = async () => {
        try {
          const token = await getToken();
          if (!token) return;

          localStorage.setItem('accessToken', token);

          // Get profile & details (which creates user in MongoDB if not present)
          const response = await authApi.getMe() as any;
          const dbUser = response.data?.user || response.data;
          if (dbUser) {
            setUser(dbUser);
          }
        } catch (error) {
          console.error('Failed to sync Clerk authentication with database:', error);
        }
      };
      syncUser();
    } else {
      // Signed out in Clerk, ensure logged out locally
      if (isAuthenticated) {
        logout();
      }
    }
  }, [isLoaded, isSignedIn, clerkUser, getToken, setUser, logout, isAuthenticated]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // Handle theme on mount
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'system';
    const root = window.document.documentElement;
    
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          registration => {
            console.log('SW registered: ', registration);
          },
          registrationError => {
            console.log('SW registration failed: ', registrationError);
          }
        );
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ClerkSync />
      {children}
    </QueryClientProvider>
  );
}
