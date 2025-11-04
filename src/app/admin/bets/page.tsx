
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { listAllUsers, listLotteryGames, placeBet } from '@/app/actions';
import { UserProfile, Lottery, BetType, BetTime } from '@/lib/types';
import { Loader2, Ticket, IndianRupee } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auth } from '@/lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

function ManualBetForm({
    selectedUser,
    lottery,
    betType,
    onBetPlaced
}: {
    selectedUser: UserProfile;
    lottery: Lottery;
    betType: BetType;
    onBetPlaced: () => void;
}) {
    const [numbers, setNumbers] = useState('');
    const [amount, setAmount] = useState('');
    const [betTime, setBetTime] = useState<BetTime>('open');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const rules: Record<BetType, { maxLength: number, placeholder: string, label: string }> = {
        single_ank: { maxLength: 1, placeholder: 'e.g., 7', label: 'Single Ank (0-9)' },
        jodi: { maxLength: 2, placeholder: 'e.g., 42', label: 'Jodi (00-99)' },
        single_panna: { maxLength: 3, placeholder: 'e.g., 123', label: 'Single Panna' },
        double_panna: { maxLength: 3, placeholder: 'e.g., 112', label: 'Double Panna' },
        triple_panna: { maxLength: 3, placeholder: 'e.g., 555', label: 'Triple Panna' },
        starline: { maxLength: 1, placeholder: 'e.g., 5', label: 'Starline (0-9)' },
        half_sangam: { maxLength: 4, placeholder: 'Open Panna + Close Ank', label: 'Half Sangam' },
        full_sangam: { maxLength: 6, placeholder: 'Open Panna + Close Panna', label: 'Full Sangam' },
    };

    const currentRule = rules[betType];
    const showBetTimeSelector = betType.includes('ank') || betType.includes('panna');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const betAmount = parseInt(amount, 10);
        if (!betAmount || betAmount <= 0) {
            toast({ title: 'Invalid Amount', variant: 'destructive', description: "Please enter a valid bet amount." });
            setLoading(false);
            return;
        }

        if (numbers.length !== currentRule.maxLength) {
            toast({ title: 'Invalid Numbers', variant: 'destructive', description: `Expected ${currentRule.maxLength} digits for ${currentRule.label}.` });
            setLoading(false);
            return;
        }
        
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
            toast({ title: 'Authentication Error', variant: 'destructive', description: 'Could not authenticate admin.' });
            setLoading(false);
            return;
        }

        const result = await placeBet({
            authToken: token,
            userId: selectedUser.uid,
            lotteryName: lottery.name,
            betType: betType,
            numbers: numbers,
            amount: betAmount,
            betTime: showBetTimeSelector ? betTime : undefined,
        });

        if (result.success) {
            toast({ title: 'Bet Placed Successfully!', description: `₹${betAmount} bet for ${selectedUser.email} on ${lottery.name}.` });
            setNumbers('');
            setAmount('');
            onBetPlaced();
        } else {
            toast({ title: 'Bet Failed', description: result.message, variant: 'destructive' });
        }

        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border-t">
            <h3 className="font-semibold text-lg">{currentRule.label}</h3>
            {showBetTimeSelector && lottery.name !== 'Starline' && (
                <div className="space-y-2">
                    <Label>Bet Time</Label>
                    <RadioGroup value={betTime} onValueChange={(val: any) => setBetTime(val)} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="open" id="open" /><Label htmlFor="open">Open</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="close" id="close" /><Label htmlFor="close">Close</Label></div>
                    </RadioGroup>
                </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="numbers">Numbers</Label>
                    <Input id="numbers" value={numbers} onChange={e => setNumbers(e.target.value.replace(/[^0-9]/g, '').slice(0, currentRule.maxLength))} placeholder={currentRule.placeholder} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Bet Amount" className="pl-8" />
                    </div>
                </div>
            </div>
            <Button type="submit" disabled={loading || !numbers || !amount} className="w-full">
                {loading ? <Loader2 className="animate-spin" /> : `Place Bet for ${selectedUser.name}`}
            </Button>
        </form>
    );
}

export default function AdminBetsPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [lotteries, setLotteries] = useState<Lottery[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedLotteryName, setSelectedLotteryName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        const [userList, gameList] = await Promise.all([listAllUsers(), listLotteryGames()]);
        setUsers(userList);
        setLotteries(gameList);
        setLoading(false);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                (async () => {
                    await fetchInitialData();
                })();
            } else {
                router.push('/admin/login');
            }
        });
        return () => unsubscribe();
    }, [fetchInitialData, router]);

    const selectedUser = users.find(u => u.uid === selectedUserId);
    const selectedLottery = lotteries.find(l => l.name === selectedLotteryName);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 neon-loader" /></div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Manual Bet Placement</h1>

            <Card className="neon-card">
                <CardHeader>
                    <CardTitle>Place a Bet for a User</CardTitle>
                    <CardDescription className="neon-sub">Select a user and a game to place a bet on their behalf.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Select User</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a user..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map(user => (
                                        <SelectItem key={user.uid} value={user.uid}>{user.name} ({user.email})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Select Game</Label>
                            <Select value={selectedLotteryName} onValueChange={setSelectedLotteryName}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a game..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {lotteries.map(lottery => (
                                        <SelectItem key={lottery.name} value={lottery.name}>{lottery.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {selectedUser && (
                        <div className="text-sm p-3 bg-muted rounded-md">
                            Selected User: <span className="font-bold">{selectedUser.name}</span> | Wallet: <span className="font-bold">₹{selectedUser.walletBalance.toFixed(2)}</span>
                        </div>
                    )}
                </CardContent>

                {selectedUser && selectedLottery && (
                    <Tabs defaultValue="single_ank" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
                            <TabsTrigger value="single_ank">Single Ank</TabsTrigger>
                            <TabsTrigger value="jodi">Jodi</TabsTrigger>
                            <TabsTrigger value="single_panna">Single Panna</TabsTrigger>
                            <TabsTrigger value="double_panna">Double Panna</TabsTrigger>
                            <TabsTrigger value="triple_panna">Triple Panna</TabsTrigger>
                            <TabsTrigger value="half_sangam">Half Sangam</TabsTrigger>
                            <TabsTrigger value="full_sangam">Full Sangam</TabsTrigger>
                             {selectedLottery.name === 'Starline' && <TabsTrigger value="starline">Starline</TabsTrigger>}
                        </TabsList>
                        <TabsContent value="single_ank"><ManualBetForm selectedUser={selectedUser} lottery={selectedLottery} betType="single_ank" onBetPlaced={fetchInitialData} /></TabsContent>
                        <TabsContent value="jodi"><ManualBetForm selectedUser={selectedUser} lottery={selectedLottery} betType="jodi" onBetPlaced={fetchInitialData} /></TabsContent>
                        <TabsContent value="single_panna"><ManualBetForm selectedUser={selectedUser} lottery={selectedLottery} betType="single_panna" onBetPlaced={fetchInitialData} /></TabsContent>
                        <TabsContent value="double_panna"><ManualBetForm selectedUser={selectedUser} lottery={selectedLottery} betType="double_panna" onBetPlaced={fetchInitialData} /></TabsContent>
                        <TabsContent value="triple_panna"><ManualBetForm selectedUser={selectedUser} lottery={selectedLottery} betType="triple_panna" onBetPlaced={fetchInitialData} /></TabsContent>
                         <TabsContent value="half_sangam"><ManualBetForm selectedUser={selectedUser} lottery={selectedLottery} betType="half_sangam" onBetPlaced={fetchInitialData} /></TabsContent>
                        <TabsContent value="full_sangam"><ManualBetForm selectedUser={selectedUser} lottery={selectedLottery} betType="full_sangam" onBetPlaced={fetchInitialData} /></TabsContent>
                        {selectedLottery.name === 'Starline' && <TabsContent value="starline"><ManualBetForm selectedUser={selectedUser} lottery={selectedLottery} betType="starline" onBetPlaced={fetchInitialData} /></TabsContent>}
                    </Tabs>
                )}
            </Card>
        </div>
    );
}
