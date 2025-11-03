import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getGameSettings } from '@/app/actions';
import { Scale } from 'lucide-react';

const formatLabel = (betType: string) => {
    return betType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default async function RatesPage() {
    const { rates } = await getGameSettings();

    const rateEntries = Object.entries(rates);

    return (
        <div className="bg-[#171d22] min-h-screen text-white">
            <Header />
            <main className="pt-20 container mx-auto px-4 pb-16">
                <div className="flex items-center gap-4 mb-6">
                    <Scale className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold text-primary">Game Rates</h1>
                </div>
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Current Payout Rates</CardTitle>
                        <CardDescription>
                            Here are the current winning payout rates for different bet types. For every 1 coin you bet, you will win the amount shown below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Game Type</TableHead>
                                    <TableHead className="text-right">Winning Rate (per 1 coin)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rateEntries.map(([type, rate]) => (
                                    <TableRow key={type}>
                                        <TableCell className="font-medium">{formatLabel(type)}</TableCell>
                                        <TableCell className="text-right font-bold text-lg text-green-400 flex items-center justify-end gap-1">
                                            1 <span className="text-sm text-muted-foreground">COIN</span> {' ➤ '} {rate} <span className="text-sm text-muted-foreground">COINS</span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
