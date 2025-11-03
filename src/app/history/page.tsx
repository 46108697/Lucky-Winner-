
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listBets } from '@/app/actions';
import { Bet } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, Loader2, ArrowLeft, RefreshCw, Trophy } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function GameHistoryPage() {
    const [bets, setBets] = useState<Bet[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    const fetchBets = useCallback(async (currentUser: User) => {
        setLoading(true);
        listBets(currentUser.uid).then((fetchedBets) => {
            setBets(fetchedBets);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchBets(currentUser);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router, fetchBets]);

    const handleRefresh = () => {
        if(user) {
            fetchBets(user);
        }
    }

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push('/');
        }
    };

    return (
        <div className="bg-[#171d22] min-h-screen text-white">
            <Header />
            <main className="pt-20 container mx-auto px-4 pb-16">
                 <div className="flex items-center gap-4 mb-6">
                    <Button variant="outline" size="icon" onClick={handleBack}>
                        <ArrowLeft />
                    </Button>
                    <h1 className="text-3xl font-bold text-primary">Game History</h1>
                </div>

                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                       <div>
                         <CardTitle>My Placed Bets</CardTitle>
                         <CardDescription>A list of all the bets you've placed.</CardDescription>
                       </div>
                       <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                            <span className="ml-2 hidden sm:inline">Refresh</span>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center items-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : bets.length === 0 ? (
                            <p className="text-muted-foreground text-center py-10">You haven't placed any bets yet.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Game</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Numbers</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-right">Payout</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bets.map((bet) => (
                                        <TableRow key={bet.id}>
                                            <TableCell>{new Date(bet.createdAt).toLocaleString()}</TableCell>
                                            <TableCell>{bet.lotteryName}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="capitalize">{bet.betType.replace(/_/g, ' ')}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono">{bet.numbers}</TableCell>
                                            <TableCell>
                                                <Badge className="capitalize" variant={bet.status === 'placed' ? 'default' : bet.status === 'won' ? 'secondary' : 'destructive'}>
                                                    {bet.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                <IndianRupee className="inline-block h-3 w-3 mr-1"/>
                                                {bet.amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-green-400">
                                                {bet.status === 'won' && bet.payout ? (
                                                    <span className="flex items-center justify-end">
                                                        <Trophy className="inline-block h-4 w-4 mr-1 text-primary" />
                                                        <IndianRupee className="inline-block h-3.5 w-3.5 mr-1"/>
                                                        {bet.payout.toFixed(2)}
                                                    </span>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
