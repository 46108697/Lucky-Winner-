
'use client'
import { useState, useEffect, useCallback } from 'react';
import StatCards from '@/components/admin/StatCards'
import { RevenueChart, UsersChart } from '@/components/admin/NeonCharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardStats } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminAnalytics {
    mostPlayedGame: string;
    highestRevenueGame: string;
    topPerformingAgent: string;
    topAgentCommission: number;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AdminAnalytics | null>(null);
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
      toast({ title: 'Error', description: 'Failed to fetch analytics data.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const gameStats = stats ? [
    { title: 'Most Played Game', value: stats.mostPlayedGame, icon: 'trophy' as const },
    { title: 'Highest Revenue Game', value: stats.highestRevenueGame, icon: 'revenue' as const },
  ] : [];

   const agentStats = stats ? [
    { title: 'Top Performing Agent', value: `Agent #${stats.topPerformingAgent}`, icon: 'users' as const },
    { title: 'Highest Commission', value: `₹${stats.topAgentCommission.toFixed(2)}`, icon: 'wallet' as const },
  ] : [];

  if(loading) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-12 w-12 neon-loader" />
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="neon-title">Game & Player Analytics</h1>
        <p className="neon-sub mt-2">An overview of platform performance and user engagement.</p>
      </div>
      
      <div className="space-y-6">
        {stats && (
            <>
                <div>
                    <h2 className="text-xl font-bold text-[var(--neon-cyan)] mb-4">Top Game Performance</h2>
                    <StatCards stats={gameStats} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-[var(--neon-cyan)] mb-4">Top Agent Performance</h2>
                    <StatCards stats={agentStats} />
                </div>
            </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <UsersChart />
      </div>
       <Card className="neon-card">
        <CardHeader>
          <CardTitle>Real-Time Bet Status</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="neon-sub">[Real-time chart displaying placed, won, and lost bets will be implemented here]</p>
        </CardContent>
      </Card>
    </div>
  )
}
