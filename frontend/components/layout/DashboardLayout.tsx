'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/store';
import { Button } from '@/components/ui';
import { UserButton } from '@clerk/nextjs';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Linkedin,
  Briefcase,
  Map,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  User,
  Tv2,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditWidget } from '@/components/ui';
import { PWAInstallButton } from '@/components/PWAInstallButton';

const navItems = [
  { label: 'Dashboard',       href: '/dashboard', icon: LayoutDashboard },
  { label: 'Resume Analyzer', href: '/resume',    icon: FileText },
  { label: 'Mock Interviews', href: '/interview', icon: MessageSquare },
  { label: 'LinkedIn Review', href: '/linkedin',  icon: Linkedin },
  { label: 'Job Matches',     href: '/jobs',      icon: Briefcase },
  { label: 'Career Roadmaps', href: '/roadmap',   icon: Map },
  { label: 'Watch Ads',       href: '/ads',       icon: Tv2, adBadge: true },
  { label: 'Upgrade Plan',    href: '/pricing',   icon: Sparkles, primary: true },
];

const bottomNavItems = [
  { label: 'Settings', href: '/settings', icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-background">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold">CareerPilot AI</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {(sidebarOpen || (mounted && window.innerWidth >= 1024)) && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3 }}
              className={cn(
                'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r lg:sticky lg:top-0 lg:h-screen flex flex-col',
                !sidebarOpen && 'lg:hidden'
              )}
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold truncate">CareerPilot AI</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden shrink-0"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="p-4 space-y-1 flex-1 overflow-y-auto overflow-x-hidden">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <item.icon className={cn(
                        'w-5 h-5 shrink-0',
                        (item as any).primary && 'text-amber-500',
                        (item as any).adBadge && !isActive && 'text-teal-500'
                      )} />
                      <span className="truncate">{item.label}</span>
                      {(item as any).adBadge && !isActive && (
                        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-600 border border-teal-500/30">
                          +Credits
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-4 h-4 ml-auto shrink-0" />}
                    </Link>
                  );
                })}
              </nav>

              {/* Bottom Navigation */}
              <div className="mt-auto p-4 border-t bg-card">
                {bottomNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1',
                      pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}

                {/* User Menu */}
                <div className="mt-2 flex items-center justify-between p-2 rounded-lg bg-accent/30 border border-border/50">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <UserButton 
                      afterSignOutUrl="/login"
                      appearance={{
                        elements: {
                          avatarBox: "w-8 h-8 rounded-full border border-border"
                        }
                      }}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {user?.firstName || 'User'} {user?.lastName || ''}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Top bar with credit widget */}
          <div className="flex items-center justify-end gap-3 px-4 lg:px-8 pt-4 pb-0">
            <PWAInstallButton />
            <CreditWidget />
          </div>
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
