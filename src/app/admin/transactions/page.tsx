

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listTransactions } from '@/app/actions';
import { UserProfile, Transaction, UserRole } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IndianRupee, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        // NOTE: For simplicity, assuming a fixed admin user for now.
        // In a real app, you'd get the current admin's ID.
        const fetchedTransactions = await listTransactions('admin', 'admin');
        setTransactions(fetchedTransactions);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Transaction Ledger</h1>
                <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Platform Transaction History</CardTitle>
                    <CardDescription>A record of all transactions across the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="ml-4">Loading history...</p>
                        </div>
                    ) : transactions.length === 0 ? (
                        <p className="text-muted-foreground text-center">No transactions yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>From</TableHead>
                                        <TableHead>To</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Amount (Coins)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell>{new Date(tx.timestamp).toLocaleString()}</TableCell>
                                            <TableCell>{tx.fromEmail || tx.fromId}</TableCell>
                                            <TableCell>{tx.toEmail || tx.toId}</TableCell>
                                            <TableCell>
                                                <Badge variant={tx.paymentType === 'credit' ? 'secondary' : 'default'} className="capitalize">
                                                    {tx.type} ({tx.paymentType})
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                <span className={cn(tx.type === 'win' || tx.type === 'deposit' || tx.type === 'commission' ? 'text-green-400' : 'text-red-400')}>
                                                  {tx.type === 'win' || tx.type === 'deposit' || tx.type === 'commission' ? '+' : '-'}
                                                  <IndianRupee className="inline-block h-3 w-3 mx-1"/>
                                                  {tx.amount.toFixed(2)}
                                                </span>
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
