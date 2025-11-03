
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, Users, Ticket, Percent, RefreshCw, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { getDashboardStats } from '@/app/actions';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

interface AgentDashboardStats {
    totalUsers: number;
    totalBets: number;
    totalCommission: number;
}

export default function AgentDashboard() {
    const [stats, setStats] = useState<AgentDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    
    const fetchStats = useCallback(async (agentId: string) => {
        setLoading(true);
        const fetchedStats = await getDashboardStats(agentId);
        setStats(fetchedStats);
        setLoading(false);
    }, []);

    useEffect(() => {
       const unsubscribe = onAuthStateChanged(auth, (user) => {
           if (user) {
               fetchStats(user.uid);
           } else {
               router.push('/login');
           }
       });
       return () => unsubscribe();
    }, [fetchStats, router]);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Agent Dashboard</h1>
                <Button variant="outline" size="sm" onClick={() => auth.currentUser && fetchStats(auth.currentUser.uid)} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                </Button>
            </div>
            
            {loading ? (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card><CardContent className="h-24 flex items-center justify-center"><Loader2 className="animate-spin" /></CardContent></Card>
                    <Card><CardContent className="h-24 flex items-center justify-center"><Loader2 className="animate-spin" /></CardContent></Card>
                    <Card><CardContent className="h-24 flex items-center justify-center"><Loader2 className="animate-spin" /></CardContent></Card>
                 </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
                            <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{stats?.totalCommission?.toFixed(2) || '0.00'}</div>
                            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">My Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                            <p className="text-xs text-muted-foreground">Total users under you</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Bets (from users)</CardTitle>
                            <Ticket className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.totalBets || 0}</div>
                            <p className="text-xs text-muted-foreground">Total bets placed by your users</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
