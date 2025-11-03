

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listBets } from '@/app/actions';
import { Bet } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function AgentBetsPage() {
    const [bets, setBets] = useState<Bet[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchBets = useCallback(async (agentId: string) => {
        setLoading(true);
        const fetchedBets = await listBets(undefined, agentId);
        setBets(fetchedBets);
        setLoading(false);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchBets(user.uid);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [fetchBets, router]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">User Bets</h1>
                <Button variant="outline" size="sm" onClick={() => auth.currentUser && fetchBets(auth.currentUser.uid)} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Bets from My Users</CardTitle>
                    <CardDescription>A real-time list of all bets placed by users assigned to you.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : bets.length === 0 ? (
                        <p className="text-muted-foreground text-center">No bets found for your users.</p>
                    ) : (
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User Email</TableHead>
                                    <TableHead>Game</TableHead>
                                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                                    <TableHead className="hidden md:table-cell">Numbers</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bets.map((bet) => (
                                    <TableRow key={bet.id}>
                                        <TableCell>
                                            <div>{bet.userEmail}</div>
                                            <div className="text-xs text-muted-foreground sm:hidden">{new Date(bet.createdAt).toLocaleString()}</div>
                                        </TableCell>
                                        <TableCell>{bet.lotteryName}</TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            <Badge variant="secondary" className="capitalize">{bet.betType.replace(/_/g, ' ')}</Badge>
                                        </TableCell>
                                        <TableCell className="font-mono hidden md:table-cell">{bet.numbers}</TableCell>
                                        <TableCell>
                                            <Badge className="capitalize" variant={bet.status === 'placed' ? 'default' : bet.status === 'won' ? 'secondary' : 'destructive'}>
                                                {bet.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            <IndianRupee className="inline-block h-3 w-3 mr-1"/>
                                            {bet.amount.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
