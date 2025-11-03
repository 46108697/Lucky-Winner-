
"use client";

import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Marquee } from '@/components/Marquee';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { LotteryResult, Lottery } from '@/lib/types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { listLotteryGames } from './actions';

function GameCard({ name, result }: { name: string; result?: LotteryResult }) {
    const getResultDisplay = () => {
        if (!result || result.status === 'pending') {
            return {
                text: "Result awaited...",
                label: "Waiting for result"
            };
        }
        if (result.status === 'open') {
            return {
                text: `${result.openPanna}-${result.openAnk}`,
                label: "Open Result"
            };
        }
        if (result.status === 'closed') {
            return {
                text: result.fullResult || `${result.openPanna}-${result.jodi}-${result.closePanna}`,
                label: "Result Declared"
            };
        }
        return { text: "Loading...", label: "" };
    };

    const { text, label } = getResultDisplay();

    return (
        <div className="bg-darkCard border border-gold rounded-2xl shadow-lg p-4 hover:shadow-gold/30 hover:scale-105 transition-all duration-300 flex flex-col items-center text-center">
            <div className="w-full flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold font-cinzel text-white">{name}</h3>
                 <Button asChild variant="outline" size="sm" className="bg-transparent border-gold/50 text-gold/80 hover:bg-gold/10 hover:text-gold">
                    <Link href={`/chart/${encodeURIComponent(name)}`}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Chart
                    </Link>
                </Button>
            </div>
            <div className="mb-4 flex-grow flex flex-col justify-center">
                <span className='text-2xl font-mono tracking-widest px-4 py-2 text-gold'>{text}</span>
                {label && <p className='text-xs text-lightGray mt-1'>{label}</p>}
            </div>
            <Button asChild className="bg-gold text-royalBlue font-bold px-6 py-2 rounded-full hover:bg-transparent hover:border hover:border-gold hover:text-gold transition transform hover:scale-105 w-full mt-auto">
                <Link href={`/play/${encodeURIComponent(name)}`}>Play Now</Link>
            </Button>
        </div>
    );
}

function GameCardSkeleton() {
    return (
        <div className="bg-darkCard border border-gold/20 rounded-2xl shadow-lg p-4 flex flex-col items-center text-center space-y-4">
            <div className="w-full flex justify-between items-center">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10 w-full rounded-full" />
        </div>
    );
}

function AppFooter() {
  return (
    <footer className="bg-darkCard/50 border-t border-gold/30 mt-12 py-8">
      <div className="container mx-auto px-4 text-center text-lightGray">
        <div className="flex justify-center gap-4 md:gap-8 mb-4">
          <Link href="/about" className="text-sm hover:text-gold">About Us</Link>
          <Link href="/contact" className="text-sm hover:text-gold">Contact Us</Link>
          <Link href="/terms" className="text-sm hover:text-gold">Terms & Conditions</Link>
          <Link href="/privacy" className="text-sm hover:text-gold">Privacy Policy</Link>
          <Link href="/refund" className="text-sm hover:text-gold">Refund Policy</Link>
        </div>
        <p className="text-xs">&copy; {new Date().getFullYear()} Lucky Winner. All rights reserved.</p>
        <p className="text-xs mt-2">Please play responsibly. This game may be addictive.</p>
      </div>
    </footer>
  );
}

export default function HomePage() {
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [results, setResults] = useState<Record<string, LotteryResult>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGames() {
        setLoading(true);
        const games = await listLotteryGames();
        setLotteries(games);
        // We set loading to false here, but the results listener will continue to update.
        // This provides a faster initial render of the game cards.
        setLoading(false);
    }
    
    fetchGames();
    
    const resultsCollectionRef = collection(db, 'results');
    const unsubscribeResults = onSnapshot(resultsCollectionRef, (snapshot) => {
        const newResults: Record<string, LotteryResult> = {};
        snapshot.forEach(doc => {
            newResults[doc.id] = { lotteryName: doc.id, ...doc.data() } as LotteryResult;
        });
        setResults(newResults);
    }, (error) => {
        console.error("Error fetching results: ", error);
    });

    return () => {
        unsubscribeResults();
    };
  }, []);

  return (
    <div className="bg-royalBlue min-h-screen text-white">
      <Header />
      <main className="pt-16">
        <Marquee text="Welcome to Lucky Winner! Bet responsibly and enjoy the game. Results are declared on time." />
        <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-gold tracking-wider font-cinzel">Today's Games</h2>
                <p className="text-lightGray mt-2">Select a game to place your bet. Good luck!</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading 
                    ? Array.from({ length: 8 }).map((_, i) => <GameCardSkeleton key={i} />)
                    : lotteries.map((lottery) => (
                        <GameCard key={lottery.name} name={lottery.name} result={results[lottery.name]} />
                    ))
                }
            </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
