'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ProgressOverview } from '@/components/dashboard/ProgressOverview';
import { SkeletonStats } from '@/components/ui';
import { authApi } from '@/lib/api';
import {
  FileText,
  MessageSquare,
  Briefcase,
  Map,
  TrendingUp,
  Award,
  Target,
  Zap,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  const fetchStats = async () => {
    try {
      const response = (await authApi.getStats()) as any;
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your career journey
          </p>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <SkeletonStats />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Resume Analyses"
              value={stats?.resume?.totalAnalyses || 0}
              description="Total analyses"
              icon={FileText}
              trend={stats?.resume?.averageScore > 70 ? 'up' : 'neutral'}
              trendValue={`Avg: ${stats?.resume?.averageScore || 0}%`}
              color="blue"
            />
            <StatsCard
              title="Mock Interviews"
              value={stats?.interview?.completedSessions || 0}
              description="Completed sessions"
              icon={MessageSquare}
              trend={stats?.interview?.averageScore > 70 ? 'up' : 'neutral'}
              trendValue={`Avg: ${stats?.interview?.averageScore || 0}%`}
              color="green"
            />
            <StatsCard
              title="Job Matches"
              value={stats?.jobMatch?.totalJobs || 0}
              description="Saved jobs"
              icon={Briefcase}
              trend={stats?.jobMatch?.appliedJobs > 0 ? 'up' : 'neutral'}
              trendValue={`${stats?.jobMatch?.appliedJobs || 0} applied`}
              color="purple"
            />
            <StatsCard
              title="Career Roadmaps"
              value={stats?.roadmap?.activeRoadmaps || 0}
              description="Active roadmaps"
              icon={Map}
              trend={stats?.roadmap?.overallProgress > 50 ? 'up' : 'neutral'}
              trendValue={`${stats?.roadmap?.overallProgress || 0}% complete`}
              color="orange"
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Progress Overview */}
          <div className="lg:col-span-2">
            <ProgressOverview stats={stats} isLoading={isLoading} />
          </div>

          {/* Quick Actions */}
          <div>
            <QuickActions />
          </div>
        </div>

        {/* Recent Activity */}
        <RecentActivity />
      </div>
    </DashboardLayout>
  );
}
