
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getGameSettings, updateGameSettings, listLotteryGames, createLotteryGame, deleteLotteryGame, updateLotteryGameTimes } from '@/app/actions';
import type { BetType, Lottery } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, Edit, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TimePicker } from '@/components/ui/time-picker';
import { auth } from '@/lib/firebase/client';


const BET_TYPES: BetType[] = ['single_ank', 'jodi', 'single_panna', 'double_panna', 'triple_panna', 'half_sangam', 'full_sangam', 'starline'];

const formatLabel = (betType: string) => {
    return betType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

function CreateGameDialog({ onGameCreated }: { onGameCreated: () => void }) {
    const [open, setOpen] = useState(false);
    const [gameName, setGameName] = useState('');
    const [openTime, setOpenTime] = useState<string | undefined>();
    const [closeTime, setCloseTime] = useState<string | undefined>();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleCreateGame = () => {
        startTransition(async () => {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                toast({ title: 'Error', description: 'Authentication failed.', variant: 'destructive' });
                return;
            }
            if (!gameName.trim()) {
                toast({ title: 'Error', description: 'Game name is required.', variant: 'destructive' });
                return;
            }

            const newGame: Omit<Lottery, 'id'> = {
                name: gameName.trim(),
                openTime: openTime || null,
                closeTime: closeTime || null,
            };

            const result = await createLotteryGame(token, newGame);
            if (result.success) {
                toast({ title: 'Success', description: result.message });
                onGameCreated();
                setGameName('');
                setOpenTime(undefined);
                setCloseTime(undefined);
                setOpen(false);
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Game
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a New Lottery Game</DialogTitle>
                    <DialogDescription>
                        Enter the details for the new game. Timings are in 24-hour format (IST). Leave times blank for 24/7 games like Starline.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="game-name">Game Name</Label>
                        <Input id="game-name" value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="e.g., Kalyan Morning" />
                    </div>
                    <div className="space-y-2">
                        <Label>Open Time</Label>
                        <TimePicker value={openTime} onChange={setOpenTime} />
                    </div>
                    <div className="space-y-2">
                        <Label>Close Time</Label>
                        <TimePicker value={closeTime} onChange={setCloseTime} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleCreateGame} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Game
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EditGameDialog({ game, onGameUpdated }: { game: Lottery; onGameUpdated: () => void }) {
    const [open, setOpen] = useState(false);
    const [openTime, setOpenTime] = useState<string | undefined>(game.openTime || undefined);
    const [closeTime, setCloseTime] = useState<string | undefined>(game.closeTime || undefined);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleUpdateGame = () => {
        startTransition(async () => {
            const token = await auth.currentUser?.getIdToken();
             if (!token) {
                toast({ title: 'Error', description: 'Authentication failed.', variant: 'destructive' });
                return;
            }
            if (!game.id) {
                toast({ title: 'Error', description: 'Game ID not found.', variant: 'destructive' });
                return;
            }

            const result = await updateLotteryGameTimes(token, game.id, openTime || null, closeTime || null);

            if (result.success) {
                toast({ title: 'Success', description: result.message });
                onGameUpdated();
                setOpen(false);
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Timings for {game.name}</DialogTitle>
                     <DialogDescription>
                        Update the opening and closing times for this game.
                    </DialogDescription>
                </DialogHeader>
                 <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Open Time</Label>
                        <TimePicker value={openTime} onChange={setOpenTime} />
                    </div>
                    <div className="space-y-2">
                        <Label>Close Time</Label>
                        <TimePicker value={closeTime} onChange={setCloseTime} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleUpdateGame} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function SettingsPage() {
    const [rates, setRates] = useState<Record<BetType, number>>({
        single_ank: 0, jodi: 0, single_panna: 0, double_panna: 0, triple_panna: 0, half_sangam: 0, full_sangam: 0, starline: 0
    });
    const [commission, setCommission] = useState<number>(0);
    const [upiId, setUpiId] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [games, setGames] = useState<Lottery[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const fetchSettingsAndGames = async () => {
        setLoading(true);
        const [settings, gameList] = await Promise.all([getGameSettings(), listLotteryGames()]);
        setRates(settings.rates);
        setCommission(settings.commission * 100); // Convert to percentage for display
        setUpiId(settings.upiId || '');
        setQrCodeUrl(settings.qrCodeUrl || '');
        setGames(gameList);
        setLoading(false);
    }

    useEffect(() => {
        fetchSettingsAndGames();
    }, []);

    const handleSaveSettings = () => {
        startTransition(async () => {
            const commissionRate = commission / 100; // Convert back to decimal for storage
            const numericRates = Object.fromEntries(
                Object.entries(rates).map(([key, value]) => [key, Number(value)])
            ) as Record<BetType, number>;

            const result = await updateGameSettings(numericRates, commissionRate, upiId, qrCodeUrl);
            if (result.success) {
                toast({ title: 'Success', description: result.message });
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        });
    };

    const handleDeleteGame = (gameId: string) => {
        startTransition(async () => {
            const token = await auth.currentUser?.getIdToken();
             if (!token) {
                toast({ title: 'Error', description: 'Authentication failed.', variant: 'destructive' });
                return;
            }
            const result = await deleteLotteryGame(token, gameId);
             if (result.success) {
                toast({ title: 'Success', description: result.message });
                fetchSettingsAndGames();
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        })
    }


    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Game Settings</h1>
            
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Manage Games</CardTitle>
                        <CardDescription>Add, edit, or remove lottery games from the platform.</CardDescription>
                    </div>
                    <CreateGameDialog onGameCreated={fetchSettingsAndGames} />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Game Name</TableHead>
                                <TableHead>Open Time</TableHead>
                                <TableHead>Close Time</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {games.map(game => (
                                <TableRow key={game.id}>
                                    <TableCell className="font-medium">{game.name}</TableCell>
                                    <TableCell>{game.openTime || '24 Hours'}</TableCell>
                                    <TableCell>{game.closeTime || '24 Hours'}</TableCell>
                                    <TableCell className="text-right">
                                        <EditGameDialog game={game} onGameUpdated={fetchSettingsAndGames} />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete the game "{game.name}". This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteGame(game.id!)} disabled={isPending}>
                                                        {isPending ? 'Deleting...' : 'Delete'}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Payout Rates</CardTitle>
                    <CardDescription>
                        Configure the winning multipliers for each bet type. This is how many times the bet amount will be multiplied for a win.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {BET_TYPES.map((type) => (
                            <div key={type} className="space-y-2">
                                <Label htmlFor={`rate-${type}`}>{formatLabel(type)} (e.g., 1:X)</Label>
                                <Input
                                    id={`rate-${type}`}
                                    type="number"
                                    value={rates[type] || ''}
                                    onChange={(e) => setRates({ ...rates, [type]: Number(e.target.value) })}
                                    placeholder="e.g., 90"
                                />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Agent Commission</CardTitle>
                    <CardDescription>
                        Set the commission percentage agents will earn on the total bet amount from their users.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                     <Label htmlFor="commission">Commission Rate (%)</Label>
                    <Input
                        id="commission"
                        type="number"
                        value={commission}
                        onChange={(e) => setCommission(Number(e.target.value))}
                        placeholder="e.g., 5 for 5%"
                        className="max-w-xs"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Deposit Settings</CardTitle>
                    <CardDescription>
                        Provide UPI details for users to deposit funds.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="upiId">UPI ID</Label>
                        <Input
                            id="upiId"
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="e.g., yourname@oksbi"
                            className="max-w-md"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="qrCodeUrl">QR Code Image URL</Label>
                        <Input
                            id="qrCodeUrl"
                            type="text"
                            value={qrCodeUrl}
                            onChange={(e) => setQrCodeUrl(e.target.value)}
                            placeholder="https://your-image-host.com/qr.png"
                             className="max-w-md"
                        />
                         <p className="text-xs text-muted-foreground">Upload your QR code to an image hosting service and paste the direct link here.</p>
                     </div>
                </CardContent>
            </Card>

             <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin" /> : 'Save All Settings'}
                </Button>
            </div>
        </div>
    );
}
