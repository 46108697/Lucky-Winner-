
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wallet as WalletIcon, IndianRupee, ArrowRight, ArrowLeft, CircleDollarSign, Landmark, History, Loader2, ArrowLeft as BackIcon, RefreshCw } from "lucide-react";
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import type { UserProfile, Transaction } from '@/lib/types';
import { listTransactions } from '@/app/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';


export default function AgentWalletPage() {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const router = useRouter();

    const fetchData = useCallback(async (user: User) => {
        setLoading(true);
        const fetchedTransactions = await listTransactions(user.uid, 'agent');
        setTransactions(fetchedTransactions);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!auth) {
            router.push('/login');
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user && db) {
                setCurrentUser(user);
                
                const userDocRef = doc(db, "users", user.uid);
                const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists() && docSnap.data().role === 'agent') {
                        const profile = { uid: user.uid, ...docSnap.data() } as UserProfile;
                        setUserProfile(profile);
                    } else {
                        auth.signOut();
                        router.push('/login');
                    }
                });
                
                return () => unsubscribeProfile();
            } else {
                 router.push('/login');
                 setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (currentUser) {
            fetchData(currentUser);
        }
    }, [currentUser, fetchData]);

    const handleRefresh = () => {
        if(currentUser) {
            fetchData(currentUser);
        }
    }


    const getTransactionTypeDetails = (tx: Transaction) => {
        if (tx.fromId === userProfile?.uid) { // Money is going out
            return {
                direction: 'Debit' as const,
                text: `Sent to ${tx.toEmail}`,
                icon: <ArrowRight className="h-4 w-4 text-red-400" />
            };
        }
         // Money is coming in
        return {
            direction: 'Credit' as const,
            text: `Received from ${tx.fromEmail}`,
            icon: <ArrowLeft className="h-4 w-4 text-green-400" />
        };
    };

    const handleBack = () => {
        router.push('/agent');
    };

    return (
        <div className="space-y-6">
             <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={handleBack}>
                    <BackIcon />
                </Button>
                <h1 className="text-3xl font-bold">My Wallet</h1>
            </div>
             <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                        <WalletIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {!userProfile ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                            <div className="text-2xl font-bold flex items-center">
                                <IndianRupee className="h-6 w-6 mr-2" />
                                {userProfile?.walletBalance?.toFixed(2) ?? '0.00'}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">Cash + Credit</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {!userProfile ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                            <div className="text-2xl font-bold flex items-center">
                                <IndianRupee className="h-6 w-6 mr-2" />
                                {userProfile?.cashBalance?.toFixed(2) ?? '0.00'}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">Available balance</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Credit (Udhaar)</CardTitle>
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {!userProfile ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                            <div className="text-2xl font-bold flex items-center">
                                <IndianRupee className="h-6 w-6 mr-2" />
                                {userProfile?.creditBalance?.toFixed(2) ?? '0.00'}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">Credit balance provided</p>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History />
                        <div>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>A record of all your wallet transactions.</CardDescription>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading || !currentUser}>
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        <span className="ml-2 hidden sm:inline">Refresh</span>
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <p className="text-muted-foreground text-center py-10">No transactions recorded yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx) => {
                                    const { direction, text, icon } = getTransactionTypeDetails(tx);
                                    const amount = tx.amount;
                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell>{new Date(tx.timestamp).toLocaleString()}</TableCell>
                                            <TableCell className="flex items-center gap-2">{icon} {text}</TableCell>
                                            <TableCell>
                                                <Badge variant={direction === 'Debit' ? 'destructive' : 'secondary'} className="capitalize">{direction}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={tx.paymentType === 'credit' ? 'outline' : 'default'} className="capitalize">
                                                    {tx.paymentType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${direction === 'Debit' ? 'text-red-400' : 'text-green-400'}`}>
                                                {direction === 'Debit' ? '-' : '+'}
                                                <IndianRupee className="inline-block h-3 w-3 mx-1"/>
                                                {amount.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
