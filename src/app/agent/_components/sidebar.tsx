
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Users,
  LayoutDashboard,
  Wallet,
  Ticket,
  Percent,
  LogOut,
  Gem,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

export const agentNavItems = [
  { href: '/agent', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/agent/users', icon: Users, label: 'My Users' },
  { href: '/agent/bets', icon: Ticket, label: 'User Bets' },
  { href: '/agent/commission', icon: Percent, label: 'Commission' },
  { href: '/agent/wallet', icon: Wallet, label: 'My Wallet' },
];

function AgentAuthStatus() {
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists() && userDoc.data().role === 'agent') {
                    setUserEmail(user.email);
                } else {
                    await signOut(auth);
                    router.push('/login');
                }
            } else {
                 router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/login');
    };
    
    if (!userEmail) {
        return null;
    }

    return (
        <div className="mt-auto p-4 border-t border-border">
            <div className="flex flex-col space-y-2">
                <div className="text-center text-sm p-2 bg-muted/50 rounded-md">
                    <p className="font-medium truncate">{userEmail}</p>
                    <p className="text-xs text-muted-foreground">Agent</p>
                </div>
                 <Button variant="destructive" className="w-full justify-center" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
    )
}

export function AgentSidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/agent" className="flex items-center gap-2 font-semibold" onClick={onLinkClick}>
          <Gem className="h-6 w-6 text-primary" />
          <span>Agent Panel</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {agentNavItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={onLinkClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                pathname === href && 'bg-muted text-primary'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
       <AgentAuthStatus />
    </div>
  );
}


export function AgentSidebar() {
  return (
    <div className="hidden border-r bg-muted/40 md:block h-full">
      <AgentSidebarContent />
    </div>
  );
}
