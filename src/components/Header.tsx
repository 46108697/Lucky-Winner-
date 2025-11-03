
'use client';

import { Button } from './ui/button';
import { Gem, LogOut, UserCircle, Wallet, History, User, ChevronDown, Bot, Scale, Clock } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { doc, getDoc } from 'firebase/firestore';

export function Header() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    if (!auth || !db) {
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
         const userDocRef = doc(db, "users", currentUser.uid);
         const userDoc = await getDoc(userDocRef);
         if(userDoc.exists() && (userDoc.data().role === 'user' || !userDoc.data().role)) {
            setUser(currentUser);
         } else {
            setUser(null);
         }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null);
    router.push('/login');
  };

  return (
    <header className="bg-darkCard/50 border-b border-gold/30 fixed top-0 w-full z-50 shadow-lg backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-3">
                <Gem className="h-8 w-8 text-gold" />
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gold font-cinzel">
                Lucky Winner
                </h1>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {!isClient ? (
                <div className="h-8 w-24 animate-pulse rounded-full bg-royalBlue"></div>
            ) : user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 rounded-full px-2">
                           <UserCircle className="h-8 w-8 text-gold" />
                           <ChevronDown className="h-4 w-4 text-gold/80 ml-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">My Account</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link href="/wallet">
                                    <Wallet className="mr-2 h-4 w-4 text-gold" />
                                    <span>My Wallet</span>
                                </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                                <Link href="/history">
                                    <History className="mr-2 h-4 w-4 text-gold" />
                                    <span>Game History</span>
                                </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                                <Link href="/profile">
                                    <User className="mr-2 h-4 w-4 text-gold" />
                                    <span>My Profile</span>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                         <DropdownMenuGroup>
                            <DropdownMenuLabel>Information</DropdownMenuLabel>
                             <DropdownMenuItem asChild>
                                <Link href="/rates">
                                    <Scale className="mr-2 h-4 w-4 text-gold" />
                                    <span>Game Rates</span>
                                </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                                <Link href="/timings">
                                    <Clock className="mr-2 h-4 w-4 text-gold" />
                                    <span>Game Timings</span>
                                </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                                <Link href="/support">
                                    <Bot className="mr-2 h-4 w-4 text-gold" />
                                    <span>Support</span>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
              <>
                <Button asChild className="bg-transparent border border-gold text-gold font-bold px-4 py-2 rounded-full hover:bg-gold hover:text-royalBlue transition transform hover:scale-105 text-xs uppercase">
                    <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="bg-gold text-royalBlue font-bold px-4 py-2 rounded-full hover:bg-transparent hover:border hover:border-gold hover:text-gold transition transform hover:scale-105 text-xs uppercase">
                    <Link href="/register">Register</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
