
'use client';

import React, { useState, useEffect } from 'react';
import { AgentSidebar, AgentSidebarContent } from './_components/sidebar';
import { AuthProvider } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import Loading from '../loading';

function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="sm:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
    </header>
  );
}

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [authenticating, setAuthenticating] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace('/login');
      } else {
        setAuthenticating(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (authenticating) {
    return <Loading />;
  }

  return (
    <AuthProvider>
       <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden md:block">
          <AgentSidebar />
        </div>
        <div className="flex flex-col">
          {isMobile ? (
            <Sheet open={open} onOpenChange={setOpen}>
              <MobileHeader onMenuClick={() => setOpen(true)} />
              <SheetContent side="left" className="p-0 bg-muted/40 w-[280px]">
                <AgentSidebarContent onLinkClick={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          ) : null}
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
