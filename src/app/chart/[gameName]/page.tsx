
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { getHistoricalResults } from '@/app/actions';
import type { LotteryResult } from '@/lib/types';
import { Loader2, ArrowLeft, BarChartBig } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export default function ChartPage() {
    const params = useParams();
    const router = useRouter();
    const [results, setResults] = useState<LotteryResult[]>([]);
    const [loading, setLoading] = useState(true);

    const gameName = Array.isArray(params.gameName) ? params.gameName[0] : params.gameName;
    const decodedGameName = decodeURIComponent(gameName || '');

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const fetchResults = useCallback(async () => {
        setLoading(true);
        if (decodedGameName) {
            const historicalResults = await getHistoricalResults(decodedGameName);
            setResults(historicalResults);
        }
        setLoading(false);
    }, [decodedGameName]);

    useEffect(() => {
        fetchResults();
    }, [fetchResults]);

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
                    <div className="flex items-center gap-2">
                        <BarChartBig className="h-7 w-7 text-primary" />
                        <h1 className="text-3xl font-bold text-primary">{decodedGameName} Chart</h1>
                    </div>
                </div>
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Historical Results</CardTitle>
                        <CardDescription>
                            Showing the last 100 results for {decodedGameName}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                             <div className="flex justify-center items-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : results.length === 0 ? (
                            <p className="text-muted-foreground text-center py-10">No historical results found for this game.</p>
                        ) : (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-center">Result</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map((result, index) => (
                                        <TableRow key={`${result.drawDate}-${index}`}>
                                            <TableCell>{new Date(result.drawDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</TableCell>
                                            <TableCell className="text-center">
                                                 <Badge variant="secondary" className="text-lg font-mono tracking-widest px-4 py-1">
                                                    {result.fullResult || `${result.openPanna || '***'}-${result.openAnk || '*'}`}
                                                 </Badge>
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
