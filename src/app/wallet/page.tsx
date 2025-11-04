
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wallet as WalletIcon, IndianRupee, ArrowRight, ArrowLeft, CircleDollarSign, Landmark, History, Loader2, ArrowLeft as BackIcon, RefreshCw, ArrowDown, ArrowUp } from "lucide-react";
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import type { UserProfile, Transaction } from '@/lib/types';
import { listTransactions, createWithdrawalRequest, getGameSettings, createDepositRequest } from '@/app/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Label } from '@/components/ui/label';

function DepositDialog({ agentCustomId, upiId, qrCodeUrl, onDepositRequested }: { agentCustomId?: string, upiId?: string, qrCodeUrl?: string, onDepositRequested: () => void }) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleDeposit = async () => {
        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
            return;
        }
        if (!transactionId.trim()) {
            toast({ title: "Invalid Transaction ID", description: "Please enter the transaction ID from your payment.", variant: "destructive" });
            return;
        }

        setLoading(true);
        const result = await createDepositRequest(depositAmount, transactionId);
        setLoading(false);

        if (result.success) {
            toast({
                title: "Request Submitted",
                description: result.message
            });
            setAmount('');
            setTransactionId('');
            setOpen(false); // Close dialog on success
            onDepositRequested();
        } else {
             toast({
                title: "Request Failed",
                description: result.message,
                variant: "destructive"
            });
        }
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <Button size="lg" className="h-auto py-4">
                    <ArrowDown className="mr-2 h-6 w-6"/>
                    <div>
                        <p className="font-bold text-lg">Deposit</p>
                        <p className="font-normal text-xs">Add funds to your wallet</p>
                    </div>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Deposit Funds</DialogTitle>
                </DialogHeader>
                 <div className="py-4 space-y-4 text-center">
                    {agentCustomId ? (
                        <div>
                            <DialogDescription>
                                To add funds to your wallet, please contact your assigned agent directly.
                            </DialogDescription>
                            <div className="mt-4 p-4 bg-muted rounded-lg">
                                <h3 className="font-semibold text-lg">Your Agent's ID</h3>
                                <p className="font-mono text-xl tracking-widest text-primary bg-background p-2 rounded-md inline-block mt-2">{agentCustomId}</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <DialogDescription>
                                Use the details below to make a payment, then submit a deposit request.
                            </DialogDescription>
                            {qrCodeUrl ? (
                                <div className="w-40 h-40 relative my-2 mx-auto">
                                    <Image src={qrCodeUrl} alt="UPI QR Code" layout="fill" objectFit="contain" />
                                </div>
                            ) : (
                                <div className="w-40 h-40 bg-muted my-2 mx-auto flex items-center justify-center rounded-lg">
                                    <p className="text-muted-foreground text-sm">QR Code not available</p>
                                </div>
                            )}
                        
                            {upiId && <p>UPI ID: <span className="font-mono bg-muted p-1 rounded-md">{upiId}</span></p>}
                            
                            <div className="space-y-4 text-left mt-6">
                                <div className="space-y-2">
                                    <Label htmlFor="deposit-amount">Amount</Label>
                                    <Input id="deposit-amount" type="number" placeholder="Enter amount paid" value={amount} onChange={e => setAmount(e.target.value)} disabled={loading}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="txn-id">Transaction ID</Label>
                                    <Input id="txn-id" type="text" placeholder="Enter UPI Transaction ID" value={transactionId} onChange={e => setTransactionId(e.target.value)} disabled={loading}/>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    {!agentCustomId && (
                         <Button onClick={handleDeposit} disabled={loading || !amount || !transactionId}>
                            {loading ? <Loader2 className="animate-spin" /> : "Submit Request"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function WithdrawDialog({ cashBalance, onWithdrawalRequested }: { cashBalance: number, onWithdrawalRequested: () => void }) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleWithdraw = async () => {
        const withdrawAmount = parseFloat(amount);
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
            return;
        }
        if (withdrawAmount > cashBalance) {
            toast({ title: "Insufficient Balance", description: "Withdrawal amount cannot exceed your cash balance.", variant: "destructive" });
            return;
        }

        setLoading(true);
        const result = await createWithdrawalRequest(withdrawAmount);
        setLoading(false);

        if (result.success) {
            toast({
                title: "Request Submitted",
                description: result.message
            });
            setAmount('');
            setOpen(false); // Close dialog on success
            onWithdrawalRequested();
        } else {
             toast({
                title: "Request Failed",
                description: result.message,
                variant: "destructive"
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <Button size="lg" variant="secondary" className="h-auto py-4">
                    <ArrowUp className="mr-2 h-6 w-6"/>
                    <div>
                        <p className="font-bold text-lg">Withdraw</p>
                        <p className="font-normal text-xs">Request a payout</p>
                    </div>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Withdraw Funds</DialogTitle>
                    <DialogDescription>
                        You can withdraw from your cash balance of <span className="font-bold text-primary">₹{cashBalance.toFixed(2)}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Input
                        type="number"
                        placeholder="Enter amount to withdraw"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={loading}
                    />
                     <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleWithdraw} disabled={loading || !amount}>
                            {loading ? <Loader2 className="animate-spin" /> : "Submit Request"}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}


export default function UserWalletPage() {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [settings, setSettings] = useState<{ upiId?: string, qrCodeUrl?: string }>({});
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const router = useRouter();

    const fetchData = useCallback(async (user: User) => {
        setLoading(true);
        const fetchedTransactions = await listTransactions(user.uid, 'user');
        setTransactions(fetchedTransactions);
        const gameSettings = await getGameSettings();
        setSettings({ upiId: gameSettings.upiId, qrCodeUrl: gameSettings.qrCodeUrl });
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
                    if (docSnap.exists()) {
                        const profile = { uid: user.uid, ...docSnap.data() } as UserProfile;
                        setUserProfile(profile);
                    }
                });

                // IIFE to call async function inside useEffect
                (async () => {
                    await fetchData(user);
                })();
                
                return () => unsubscribeProfile();
            } else {
                 router.push('/login');
                 setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, [router, fetchData]);

    const handleRefresh = () => {
        if(currentUser) {
            fetchData(currentUser);
        }
    }


    const getTransactionTypeDetails = (tx: Transaction) => {
        if (tx.fromId === userProfile?.uid) { // Money is going out
            return {
                direction: 'Debit' as const,
                variant: 'destructive' as const,
                text: tx.type === 'bet' ? `Bet Placed` : tx.type === 'withdrawal' ? 'Withdrawal Approved' : `Sent to ${tx.toEmail}`,
                icon: <ArrowRight className="h-4 w-4 text-red-400" />
            };
        }
         // Money is coming in
        return {
            direction: 'Credit' as const,
            variant: 'default' as const,
            text: tx.type === 'win' ? 'Bet Won' : tx.type === 'deposit' ? 'Deposit Approved' : `Received from ${tx.fromEmail}`,
            icon: <ArrowLeft className="h-4 w-4 text-green-400" />
        };
    };

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
                        <BackIcon />
                    </Button>
                    <h1 className="text-3xl font-bold text-primary">My Wallet</h1>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                    {userProfile && <DepositDialog agentCustomId={userProfile.agentCustomId} upiId={settings.upiId} qrCodeUrl={settings.qrCodeUrl} onDepositRequested={handleRefresh} />}
                    {userProfile && <WithdrawDialog cashBalance={userProfile.cashBalance} onWithdrawalRequested={handleRefresh} />}
                </div>


                <div className="grid gap-6 md:grid-cols-3 mb-6">
                    <Card className="bg-card/80 backdrop-blur-sm">
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
                     <Card className="bg-card/80 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Withdrawable Balance</CardTitle>
                            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                             {!userProfile ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                <div className="text-2xl font-bold flex items-center">
                                    <IndianRupee className="h-6 w-6 mr-2" />
                                    {userProfile?.cashBalance?.toFixed(2) ?? '0.00'}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">Real money balance</p>
                        </CardContent>
                    </Card>
                     <Card className="bg-card/80 backdrop-blur-sm">
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
                            <p className="text-xs text-muted-foreground">Loan balance from agent</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="bg-card/80 backdrop-blur-sm">
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
                            <p className="text-muted-foreground text-center py-10">No transactions have been recorded yet.</p>
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
                                        const { direction, variant, text, icon } = getTransactionTypeDetails(tx);
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
                                                <TableCell className={`text-right font-medium ${variant === 'destructive' ? 'text-red-400' : 'text-green-400'}`}>
                                                    {variant === 'destructive' ? '-' : '+'}
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
            </main>
        </div>
    );
}

      
