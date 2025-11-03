
'use client';

import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lottery } from '@/lib/types';
import { listLotteryGames } from '@/app/actions';
import { Clock, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function TimingsPage() {
    const router = useRouter();
    const [lotteries, setLotteries] = useState<Lottery[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchGames = async () => {
            const games = await listLotteryGames();
            setLotteries(games);
            setLoading(false);
        }
        fetchGames();
    }, []);

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
                        <Clock className="h-7 w-7 text-primary" />
                        <h1 className="text-3xl font-bold text-primary">Game Timings</h1>
                    </div>
                </div>
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Market Timings</CardTitle>
                        <CardDescription>
                            Here are the opening and closing times for all markets. All times are in IST (Indian Standard Time).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       {loading ? (
                            <div className="flex justify-center items-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Market Name</TableHead>
                                        <TableHead>Open Time</TableHead>
                                        <TableHead>Close Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lotteries.map((game) => (
                                        <TableRow key={game.name}>
                                            <TableCell className="font-medium">{game.name}</TableCell>
                                            <TableCell>{game.openTime || '24 Hours'}</TableCell>
                                            <TableCell>{game.closeTime || '24 Hours'}</TableCell>
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
