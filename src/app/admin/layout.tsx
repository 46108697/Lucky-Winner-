
'use client';
import React from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { AdminSidebarContent } from './_components/sidebar';


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex bg-[var(--neon-bg)] text-[var(--neon-text)]">
      {/* --- Desktop Sidebar --- */}
      <aside className="hidden lg:flex neon-sidebar">
        <AdminSidebarContent />
      </aside>
      
      {/* --- Mobile Sidebar (Drawer) --- */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-[#08080d] border-r border-[var(--neon-border)]">
          <AdminSidebarContent onLinkClick={() => setIsSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col">
        <header className="neon-topbar lg:hidden">
          <div className="mx-auto max-w-[1600px] px-4 md:px-6 h-14 flex items-center justify-between">
            <Button size="icon" variant="ghost" onClick={() => setIsSheetOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold">Admin Panel</h2>
            <div className="w-8"></div>
          </div>
        </header>
        
        <main className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6">{children}</main>
      </div>
    </div>
  );
}
