

'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Loader2, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { listTransactions } from '@/app/actions';
import { Transaction } from '@/lib/types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function CommissionPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchCommissionTransactions = useCallback(async (agentId: string) => {
        setLoading(true);
        // We list all transactions and then filter for commission on the client-side.
        // A more optimized approach would be a dedicated server action if performance becomes an issue.
        const allTransactions = await listTransactions(agentId, 'agent');
        const commissionTransactions = allTransactions.filter(tx => tx.type === 'commission');
        setTransactions(commissionTransactions);
        setLoading(false);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchCommissionTransactions(user.uid);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [fetchCommissionTransactions, router]);
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">My Commission</h1>
                 <Button variant="outline" size="sm" onClick={() => auth.currentUser && fetchCommissionTransactions(auth.currentUser.uid)} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Commission History</CardTitle>
                    <CardDescription>A record of all commission payments you have received.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <p className="text-muted-foreground text-center">No commission payments found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Amount (Coins)</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {transactions.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                                    <TableCell>Commission Earned</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="capitalize">
                                            {item.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-green-400">
                                       + <IndianRupee className="inline-block h-3 w-3 mx-1"/>
                                        {item.amount.toFixed(2)}
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
