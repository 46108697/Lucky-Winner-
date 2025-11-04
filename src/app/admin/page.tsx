
'use client'
import { useState, useEffect, useCallback } from 'react';
import StatCards from '@/components/admin/StatCards'
import { RevenueChart, UsersChart } from '@/components/admin/NeonCharts'
import { getDashboardStats } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminDashboardStats {
    totalRevenue: number;
    totalUsers: number;
    totalAgents: number;
    pendingWithdrawals: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDashboardStats();
      if(response.success) {
        setStats(response.stats);
      } else {
        toast({ title: 'Error', description: response.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch dashboard data.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  
  if(loading) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-12 w-12 neon-loader" />
        </div>
    )
  }

  const formattedStats = stats ? [
    { title: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: 'revenue' as const },
    { title: 'Total Users', value: stats.totalUsers, icon: 'users' as const },
    { title: 'Total Agents', value: stats.totalAgents, icon: 'wallet' as const },
    { title: 'Pending Withdrawals', value: stats.pendingWithdrawals, icon: 'trophy' as const },
  ] : [];

  return (
    <div className="space-y-6">
      <h1 className="neon-title">Dashboard Overview</h1>
      <StatCards stats={formattedStats} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <UsersChart />
      </div>
    </div>
  )
}
