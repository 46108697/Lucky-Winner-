
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IndianRupee, Wallet, Loader2, ArrowLeft, Lock, Star } from 'lucide-react';
import { UserProfile, BetType, Lottery, BetTime } from '@/lib/types';
import { listLotteryGames, placeBet } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { auth } from '@/lib/firebase/client';

interface GamePlayProps {
  gameName: string;
  user: {
    uid: string;
    profile: UserProfile;
  };
}

// Get IST time HH:MM
const getCurrentISTTime = () => {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return now.toTimeString().slice(0, 5);
};

function BetForm({
  gameName, betType, userId, onBetPlaced, disabled, disabledMessage
}: {
  gameName: string;
  betType: BetType;
  userId: string;
  onBetPlaced: () => void;
  disabled: boolean;
  disabledMessage: string;
}) {
  const [numbers, setNumbers] = useState('');
  const [openPanna, setOpenPanna] = useState('');
  const [closeAnk, setCloseAnk] = useState('');
  const [closePanna, setClosePanna] = useState('');
  const [amount, setAmount] = useState('');
  const [betTime, setBetTime] = useState<BetTime>('open');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const rules = {
    single_ank: { maxLength: 1, placeholder: 'e.g., 7', label: 'Single Ank (0-9)' },
    jodi: { maxLength: 2, placeholder: 'e.g., 42', label: 'Jodi (00-99)' },
    single_panna: { maxLength: 3, placeholder: 'e.g., 123', label: 'Single Panna' },
    double_panna: { maxLength: 3, placeholder: 'e.g., 112', label: 'Double Panna' },
    triple_panna: { maxLength: 3, placeholder: 'e.g., 555', label: 'Triple Panna' },
    starline: { maxLength: 1, placeholder: 'e.g., 5', label: 'Single Ank (0-9)' },
    half_sangam: { maxLength: 4, placeholder: '', label: 'Half Sangam' },
    full_sangam: { maxLength: 6, placeholder: '', label: 'Full Sangam' }
  }[betType] ?? { maxLength: 10, placeholder: 'Enter numbers', label: 'Numbers' };

  const showBetTimeSelector = (betType.includes('ank') || betType.includes('panna')) && gameName !== 'Starline' && betType !== 'jodi';

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (disabled) return;

    const betAmount = parseInt(amount, 10);
    if (!betAmount || betAmount <= 0) {
      toast({ title: 'Invalid Amount', variant: 'destructive' });
      return;
    }

    let finalNumbers = numbers;
    if (betType === 'half_sangam') finalNumbers = `${openPanna}${closeAnk}`;
    if (betType === 'full_sangam') finalNumbers = `${openPanna}${closePanna}`;

    if (finalNumbers.length !== rules.maxLength) {
      toast({ title: 'Invalid Numbers', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const result = await placeBet({
        authToken: token,
        lotteryName: gameName,
        betType,
        numbers: finalNumbers,
        amount: betAmount,
        betTime: showBetTimeSelector ? betTime : undefined
      });

      if (result.success) {
        toast({ title: 'Success!', description: result.message });
        setNumbers('');
        setAmount('');
        setOpenPanna('');
        setCloseAnk('');
        setClosePanna('');
        onBetPlaced();
      } else {
        toast({ title: 'Bet Failed', description: result.message, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (disabled) {
    return (
      <Alert variant="destructive" className="text-center">
        <Lock className="h-4 w-4" />
        <AlertTitle>Betting Closed</AlertTitle>
        <AlertDescription>{disabledMessage}</AlertDescription>
      </Alert>
    );
  }

  // Half & Full Sangam UI
  if (betType === 'half_sangam' || betType === 'full_sangam') {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Open Panna</Label>
            <Input value={openPanna} onChange={e => setOpenPanna(e.target.value.slice(0,3))} />
          </div>

          {betType === 'half_sangam' ? (
            <div>
              <Label>Close Ank</Label>
              <Input value={closeAnk} onChange={e => setCloseAnk(e.target.value.slice(0,1))} />
            </div>
          ) : (
            <div>
              <Label>Close Panna</Label>
              <Input value={closePanna} onChange={e => setClosePanna(e.target.value.slice(0,3))} />
            </div>
          )}
        </div>

        <Label>Amount</Label>
        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />

        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : 'Submit Bet'}
        </Button>
      </form>
    );
  }

  // Regular Bet UI
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showBetTimeSelector && (
        <RadioGroup value={betTime} onValueChange={val => setBetTime(val as BetTime)} className="flex gap-4">
          <div className="flex items-center space-x-2"><RadioGroupItem value="open" /><Label>Open</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="close" /><Label>Close</Label></div>
        </RadioGroup>
      )}

      <Label>{rules.label}</Label>
      <Input value={numbers} onChange={e => setNumbers(e.target.value.slice(0, rules.maxLength))} placeholder={rules.placeholder} />

      <Label>Amount</Label>
      <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />

      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : 'Submit Bet'}
      </Button>
    </form>
  );
}

// PANNA SELECTOR
function PannaBetting({ gameName, userId, onBetPlaced, disabled, disabledMessage }: Omit<Parameters<typeof BetForm>[0], 'betType'>) {
  const [pannaType, setPannaType] = useState<"single_panna" | "double_panna" | "triple_panna">("single_panna");

  if (disabled) return (
    <Alert variant="destructive" className="text-center">
      <Lock className="h-4 w-4" />
      <AlertTitle>Betting Closed</AlertTitle>
      <AlertDescription>{disabledMessage}</AlertDescription>
    </Alert>
  );

  return (
    <div className="space-y-4">
      <Label>Select Panna Type</Label>
      <RadioGroup value={pannaType} onValueChange={val => setPannaType(val as any)} className="flex gap-4">
        <div className="flex items-center space-x-2"><RadioGroupItem value="single_panna" /><Label>Single</Label></div>
        <div className="flex items-center space-x-2"><RadioGroupItem value="double_panna" /><Label>Double</Label></div>
        <div className="flex items-center space-x-2"><RadioGroupItem value="triple_panna" /><Label>Triple</Label></div>
      </RadioGroup>

      <BetForm gameName={gameName} betType={pannaType} userId={userId} onBetPlaced={onBetPlaced} disabled={disabled} disabledMessage={disabledMessage} />
    </div>
  );
}

// MAIN UI
export function GamePlay({ gameName, user }: GamePlayProps) {
  const router = useRouter();
  const [gameDetails, setGameDetails] = useState<Lottery | null>(null);
  const [marketOpen, setMarketOpen] = useState({ isOpen: false, message: 'Loading...' });
  const [marketClose, setMarketClose] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    listLotteryGames().then(g => setGameDetails(g.find(x => x.name === gameName) ?? null));
  }, [gameName]);

  useEffect(() => {
    if (!gameDetails || gameDetails.name.toLowerCase() === 'starline') {
        setMarketOpen({ isOpen: true, message: 'Market is open 24/7' });
        setMarketClose({ isOpen: true, message: '' });
        return;
    };

    const check = () => {
      const now = getCurrentISTTime();
      // Check if openTime is defined before comparing
      const isOpenMarket = gameDetails.openTime ? now < gameDetails.openTime : true;
      setMarketOpen({
        isOpen: isOpenMarket,
        message: gameDetails.openTime ? `Open closes at ${gameDetails.openTime}` : 'Market is open 24/7',
      });

      // Check if closeTime is defined before comparing
      const isCloseMarket = gameDetails.closeTime ? now < gameDetails.closeTime : true;
      setMarketClose({
        isOpen: isCloseMarket,
        message: isCloseMarket && gameDetails.closeTime ? `Close closes at ${gameDetails.closeTime}` : `Market Closed`,
      });
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [gameDetails]);

  const isDisabled = !marketOpen.isOpen && !marketClose.isOpen;

  const back = () => window.history.length > 1 ? router.back() : router.push('/');

  if (gameName.toLowerCase() === "starline") {
    return (
        <div className="space-y-6">
            <Button variant="outline" size="icon" onClick={back}><ArrowLeft /></Button>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Star className="text-primary"/> Starline</CardTitle>
                    <CardDescription>This market is open 24/7. Results are declared periodically.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-between items-center">
                    <span className="text-sm font-medium">Your Balance:</span>
                    <span className="font-bold flex items-center gap-1">
                        <IndianRupee className="h-4 w-4" /> 
                        {user.profile.walletBalance.toFixed(2)}
                    </span>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Place Your Bet</CardTitle>
                </CardHeader>
                <CardContent>
                    <BetForm 
                        gameName={gameName} 
                        betType="starline" 
                        userId={user.uid} 
                        disabled={false} 
                        disabledMessage="" 
                        onBetPlaced={() => {}} 
                    />
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="icon" onClick={back}><ArrowLeft /></Button>

      <Card>
        <CardHeader>
          <CardTitle>{gameName}</CardTitle>
          <CardDescription>{marketOpen.isOpen ? marketOpen.message : marketClose.message}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-between">
            <span className="text-sm font-medium">Balance:</span>
            <span className="font-bold flex items-center gap-1">
                <IndianRupee className="h-4 w-4" /> 
                {user.profile.walletBalance.toFixed(2)}
            </span>
        </CardContent>
      </Card>

      <Tabs defaultValue="single_ank">
        <TabsList className="grid grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="single_ank">Single Ank</TabsTrigger>
          <TabsTrigger value="jodi">Jodi</TabsTrigger>
          <TabsTrigger value="panna">Panna</TabsTrigger>
          <TabsTrigger value="half_sangam">Half Sangam</TabsTrigger>
          <TabsTrigger value="full_sangam">Full Sangam</TabsTrigger>
        </TabsList>

        <Card className="mt-4"><CardContent className="pt-6">
          <TabsContent value="single_ank">{<BetForm gameName={gameName} betType="single_ank" userId={user.uid} onBetPlaced={() => {}} disabled={isDisabled} disabledMessage="Market Closed" />}</TabsContent>
          <TabsContent value="jodi">{<BetForm gameName={gameName} betType="jodi" userId={user.uid} onBetPlaced={() => {}} disabled={!marketOpen.isOpen} disabledMessage="Jodi only before open" />}</TabsContent>
          <TabsContent value="panna">{<PannaBetting gameName={gameName} userId={user.uid} disabled={isDisabled} disabledMessage="Market Closed" onBetPlaced={() => {}} />}</TabsContent>
          <TabsContent value="half_sangam">{<BetForm gameName={gameName} betType="half_sangam" userId={user.uid} onBetPlaced={() => {}} disabled={!marketOpen.isOpen} disabledMessage="Only before open" />}</TabsContent>
          <TabsContent value="full_sangam">{<BetForm gameName={gameName} betType="full_sangam" userId={user.uid} onBetPlaced={() => {}} disabled={!marketOpen.isOpen} disabledMessage="Only before open" />}</TabsContent>
        </CardContent></Card>
      </Tabs>
    </div>
  );
}
