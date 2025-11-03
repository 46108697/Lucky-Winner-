
'use client';

import { useState, useEffect, useCallback } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDashboardStats } from '@/app/actions';
import { UserProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Users, IndianRupee, Ticket, Percent, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface AgentReportStats {
    agent: UserProfile;
    totalUsers: number;
    totalBetVolume: number;
    totalCommission: number;
    activeUsers: { email: string; name: string; count: number; amount: number }[];
}

function StatCard({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) {
    return (
        <Card className="neon-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[var(--neon-dim)]">{title}</CardTitle>
                <Icon className="h-5 w-5 text-[var(--neon-cyan)]" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}

export default function AgentReportPage() {
    const params = useParams();
    const agentId = params.agentId as string;
    
    const [report, setReport] = useState<AgentReportStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReport = useCallback(async () => {
        if (!agentId) return;
        setLoading(true);
        try {
            const response = await getDashboardStats(agentId);
            if (response.success) {
                setReport(response.stats);
            } else {
                setError(response.message);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch report.');
        } finally {
            setLoading(false);
        }
    }, [agentId]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-12 w-12 neon-loader" />
            </div>
        )
    }

    if (error) {
         return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                 <h2 className="text-2xl font-bold text-destructive mb-2">Error Loading Report</h2>
                 <p className="text-muted-foreground">{error}</p>
                 <Button asChild variant="link" className="mt-4">
                    <Link href="/admin/agents">Go Back to Agents List</Link>
                 </Button>
            </div>
        );
    }
    
    if (!report) {
        notFound();
    }
    
    const { agent, totalUsers, totalBetVolume, totalCommission, activeUsers } = report;

    return (
        <div className="space-y-6">
             <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon">
                    <Link href="/admin/agents">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Agent Report: {agent.name}</h1>
                    <p className="text-sm text-muted-foreground">ID: {agent.customId} &bull; {agent.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Users" value={totalUsers} icon={Users} />
                <StatCard title="Total Bet Volume" value={`₹${totalBetVolume.toFixed(2)}`} icon={Ticket} />
                <StatCard title="Total Commission" value={`₹${totalCommission.toFixed(2)}`} icon={Percent} />
            </div>

            <Card className="neon-card">
                <CardHeader>
                    <CardTitle>Top Active Users</CardTitle>
                    <CardDescription className="neon-sub">Users under this agent, sorted by bet count.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/10">
                                <TableHead className="neon-sub">User Name</TableHead>
                                <TableHead className="neon-sub">Email</TableHead>
                                <TableHead className="text-right neon-sub">Bets Placed</TableHead>
                                <TableHead className="text-right neon-sub">Total Bet Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeUsers.length > 0 ? activeUsers.map((user, index) => (
                                <TableRow key={index} className="neon-row">
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell className="text-right">{user.count}</TableCell>
                                    <TableCell className="text-right font-mono">₹{user.amount.toFixed(2)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 neon-sub">No user activity found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
