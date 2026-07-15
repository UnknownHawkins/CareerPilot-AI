'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  Input, 
  Select, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  SelectContent,
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger, 
  Badge,
  SkeletonCard,
  SkeletonTable
} from '@/components/ui';
import { adminApi } from '@/lib/api';
import { 
  Users, 
  FileText, 
  MessageSquare, 
  Lock, 
  Search, 
  Shield, 
  Trash2, 
  AlertTriangle,
  Activity as ActivityIcon,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { addToast } = useUIStore();

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      if (activeTab === 'overview') {
        fetchStats();
      } else if (activeTab === 'users') {
        fetchUsers();
      }
    }
  }, [isAuthenticated, user, activeTab, page]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await adminApi.getStats();
      setStats(response.data);
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to fetch platform statistics',
        variant: 'error',
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await adminApi.getUsers({ page, limit: 10, search });
      setUsers(response.data);
      if (response.meta) {
        setTotalPages(response.meta.totalPages || 1);
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to fetch user directory',
        variant: 'error',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await adminApi.updateRole(userId, newRole);
      addToast({
        title: 'Success',
        description: 'User role updated successfully',
        variant: 'success',
      });
      // Refresh user list or stats
      if (activeTab === 'users') {
        fetchUsers();
      } else {
        fetchStats();
      }
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update user role',
        variant: 'error',
      });
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you absolutely sure you want to delete the user ${userEmail}? This will permanently wipe all their resumes, roadmap plans, matching records, and sessions from the database.`)) {
      return;
    }

    try {
      await adminApi.deleteUser(userId);
      addToast({
        title: 'Success',
        description: `Successfully deleted user ${userEmail}`,
        variant: 'success',
      });
      fetchUsers();
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete user',
        variant: 'error',
      });
    }
  };

  // If loading authentication state, wait
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <SkeletonCard />
        </div>
      </DashboardLayout>
    );
  }

  // Route security: prevent non-admins from loading components
  if (isAuthenticated && user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-destructive/20 rounded-xl p-8 max-w-md w-full text-center shadow-xl space-y-6"
          >
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                You do not have the administration credentials required to access the control panel. This attempt has been logged.
              </p>
            </div>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Return to Dashboard
            </Button>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-500" />
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Control Center</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Platform administration, statistics, user roles, and database purging
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={activeTab === 'overview' ? fetchStats : fetchUsers}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Data
          </Button>
        </div>

        {/* Tabs navigation */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }} className="space-y-6">
          <TabsList className="bg-muted border border-border/80 p-1 rounded-lg">
            <TabsTrigger value="overview" className="rounded-md">Overview & Stats</TabsTrigger>
            <TabsTrigger value="users" className="rounded-md">User Directory</TabsTrigger>
          </TabsList>

          {/* Overview Tab Content */}
          <TabsContent value="overview" className="space-y-6">
            {loadingStats ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
              </div>
            ) : (
              <>
                {/* Stats Cards Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                      <Users className="w-5 h-5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{stats?.totalUsers || 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">Platform registered profiles</p>
                    </CardContent>
                  </Card>

                  <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Resumes Evaluated</CardTitle>
                      <FileText className="w-5 h-5 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{stats?.totalResumes || 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">AI ATS analysis executions</p>
                    </CardContent>
                  </Card>

                  <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Mock Interviews</CardTitle>
                      <MessageSquare className="w-5 h-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{stats?.totalInterviews || 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">Completed practice sessions</p>
                    </CardContent>
                  </Card>

                  <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
                      <DollarSign className="w-5 h-5 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{stats?.totalSubscriptions || 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">Pro plan members active</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Plans & Summary Grid */}
                <div className="grid gap-6 md:grid-cols-3">
                  <Card className="md:col-span-1 border border-border/50 bg-card/60 backdrop-blur-md">
                    <CardHeader>
                      <CardTitle>Plan Distributions</CardTitle>
                      <CardDescription>Breakdown of user membership tiers</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-background/50 border">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <span className="w-3 h-3 bg-gray-400 rounded-full" />
                          Free Tier
                        </span>
                        <Badge variant="secondary">{stats?.plans?.free || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <span className="text-sm font-medium flex items-center gap-2 text-blue-400">
                          <span className="w-3 h-3 bg-blue-500 rounded-full" />
                          Pro Level
                        </span>
                        <Badge className="bg-blue-600 hover:bg-blue-600 text-white">{stats?.plans?.pro || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <span className="text-sm font-medium flex items-center gap-2 text-purple-400">
                          <span className="w-3 h-3 bg-purple-500 rounded-full" />
                          Enterprise
                        </span>
                        <Badge className="bg-purple-600 hover:bg-purple-600 text-white">{stats?.plans?.enterprise || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <span className="text-sm font-medium flex items-center gap-2 text-amber-400">
                          <span className="w-3 h-3 bg-amber-500 rounded-full" />
                          Administrators
                        </span>
                        <Badge className="bg-amber-600 hover:bg-amber-600 text-white">{stats?.plans?.admin || 0}</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2 border border-border/50 bg-card/60 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center gap-2">
                      <ActivityIcon className="w-5 h-5 text-blue-500" />
                      <div>
                        <CardTitle>Recent Platform Audit Trail</CardTitle>
                        <CardDescription>Latest user events and tracking activity logs</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                        <div className="space-y-3">
                          {stats.recentActivities.map((act: any) => (
                            <div key={act._id} className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {act.action} <span className="text-xs font-normal text-muted-foreground">({act.type})</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">{act.details}</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-1">
                                  User: {act.userId?.firstName} {act.userId?.lastName} ({act.userId?.email || 'unknown'})
                                </p>
                              </div>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {new Date(act.createdAt).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No recent system activity detected.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* User Directory Tab Content */}
          <TabsContent value="users" className="space-y-6">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3 bg-card border p-3 rounded-lg shadow-sm">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search directory by name, email, or user UID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
              <Button type="submit" size="sm" className="w-full sm:w-auto flex items-center justify-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </Button>
            </form>

            {loadingUsers ? (
              <SkeletonTable />
            ) : (
              <div className="bg-card border rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/60 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        <th className="p-4">User Details</th>
                        <th className="p-4">Registered Date</th>
                        <th className="p-4">Clerk Integration</th>
                        <th className="p-4">User Role</th>
                        <th className="p-4 text-right">Database Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {users.length > 0 ? (
                        users.map((u) => (
                          <tr key={u._id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold text-foreground">{u.firstName} {u.lastName}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{u.email}</div>
                              <div className="text-[10px] text-muted-foreground/50 mt-1">UserID: {u._id}</div>
                            </td>
                            <td className="p-4 text-muted-foreground text-xs">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-xs font-mono">
                              {u.clerkId ? (
                                <span className="text-green-500 flex items-center gap-1 font-semibold">
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Synced ({u.clerkId.substring(0, 10)}...)
                                </span>
                              ) : (
                                <span className="text-amber-500/70">Legacy Model</span>
                              )}
                            </td>
                            <td className="p-4">
                              <Select
                                value={u.role}
                                onValueChange={(val) => handleRoleChange(u._id, val)}
                              >
                                <SelectTrigger className="h-8 w-28 text-xs bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="pro">Pro</SelectItem>
                                  <SelectItem value="enterprise">Enterprise</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-4 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser(u._id, u.email)}
                                disabled={u._id === user?._id}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 rounded-md"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-muted-foreground">
                            No user records match the query search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                <div className="flex items-center justify-between p-4 border-t bg-muted/20 text-xs">
                  <div className="text-muted-foreground">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
