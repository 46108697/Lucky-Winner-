
import { adminDb } from '@/lib/firebase/admin';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listBets, listTransactions } from '@/app/actions';
import { Bet, Transaction, UserProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Fingerprint, Mail, Users, IndianRupee, Phone, Calendar, ArrowLeft, Ticket, History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function getUserData(userId: string): Promise<UserProfile | null> {
    const userRef = adminDb.collection('users').doc(userId);
    const doc = await userRef.get();
    if (!doc.exists) {
        return null;
    }
    return { uid: doc.id, ...doc.data() } as UserProfile;
}

function ProfileDetail({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | number | null }) {
    if (!value) return null;
    return (
        <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-sm">{label}:</span>
            <span className="text-sm text-foreground/80">{value}</span>
        </div>
    );
}

function StatCard({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}

export default async function UserDetailsPage({ params }: { params: { userId: string } }) {
    const { userId } = params;
    
    const [user, bets, transactions] = await Promise.all([
        getUserData(userId),
        listBets(userId),
        listTransactions(userId, 'user')
    ]);

    if (!user) {
        notFound();
    }

    return (
        <div className="space-y-6">
             <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon">
                    <Link href="/admin/users">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">User Profile</h1>
                    <p className="text-sm text-muted-foreground">{user.name} ({user.customId})</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <StatCard title="Total Wallet Balance" value={`₹${user.walletBalance.toFixed(2)}`} icon={IndianRupee} />
                <StatCard title="Total Bets Placed" value={bets.length} icon={Ticket} />
                <StatCard title="Total Transactions" value={transactions.length} icon={History} />
            </div>

             <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <ProfileDetail icon={Mail} label="Email" value={user.email} />
                    <ProfileDetail icon={Fingerprint} label="Customer ID" value={user.customId} />
                    <ProfileDetail icon={Phone} label="Mobile" value={user.mobile} />
                    <ProfileDetail icon={Users} label="Agent ID" value={user.agentCustomId} />
                    <ProfileDetail icon={Calendar} label="Joined On" value={new Date(user.createdAt).toLocaleDateString()} />
                    <ProfileDetail icon={IndianRupee} label="UPI ID" value={user.upiId} />
                     <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">Status:</span>
                        <Badge variant={user.disabled ? 'destructive' : 'default'}>
                          {user.disabled ? 'Inactive' : 'Active'}
                        </Badge>
                     </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Bet History</CardTitle>
                    <CardDescription>Last 100 bets placed by this user.</CardDescription>
                </CardHeader>
                <CardContent>
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
                            {bets.length > 0 ? bets.map((bet: Bet) => (
                                <TableRow key={bet.id}>
                                    <TableCell>{new Date(bet.createdAt).toLocaleString()}</TableCell>
                                    <TableCell>{bet.lotteryName}</TableCell>
                                    <TableCell><Badge variant="secondary">{bet.betType.replace(/_/g, ' ')}</Badge></TableCell>
                                    <TableCell className="font-mono">{bet.numbers}</TableCell>
                                    <TableCell><Badge variant={bet.status === 'won' ? 'default' : bet.status === 'lost' ? 'destructive' : 'secondary'}>{bet.status}</Badge></TableCell>
                                    <TableCell className="text-right">₹{bet.amount.toFixed(2)}</TableCell>
                                    <TableCell className="text-right text-green-400 font-bold">{bet.payout ? `₹${bet.payout.toFixed(2)}` : '-'}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={7} className="text-center">No bets found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                     <CardDescription>All wallet transactions for this user.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>From</TableHead>
                                <TableHead>To</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {transactions.length > 0 ? transactions.map((tx: Transaction) => (
                                <TableRow key={tx.id}>
                                    <TableCell>{new Date(tx.timestamp).toLocaleString()}</TableCell>
                                    <TableCell><Badge>{tx.type}</Badge></TableCell>
                                    <TableCell>{tx.fromEmail || tx.fromId}</TableCell>
                                    <TableCell>{tx.toEmail || tx.toId}</TableCell>
                                    <TableCell><Badge variant="outline">{tx.paymentType}</Badge></TableCell>
                                    <TableCell className={`text-right font-bold ${tx.toId === userId ? 'text-green-400' : 'text-red-400'}`}>
                                        {tx.toId === userId ? '+' : '-'}₹{tx.amount.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={6} className="text-center">No transactions found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

