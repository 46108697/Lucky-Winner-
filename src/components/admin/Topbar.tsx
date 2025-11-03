'use client';
import { Bell, RefreshCw, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Home, Users, BarChart3, Settings, HandCoins, ArrowDown } from 'lucide-react'
import { AdminSidebarContent } from '@/app/admin/_components/sidebar';

export default function Topbar() {
  const path = usePathname();

  return (
    <header className="neon-topbar hidden lg:flex">
      <div className="mx-auto max-w-[1600px] px-4 md:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <h2 className="text-lg font-semibold">Admin Panel</h2>
           <span className="neon-sub hidden sm:inline">Manage users, payments & results</span>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="btn-outline">
            <RefreshCw className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Sync</span>
          </Button>
          <Button size="icon" className="btn-neon h-9 w-9 p-0">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
