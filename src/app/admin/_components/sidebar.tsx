
"use client";

import { Home, Users, Settings, Wallet, History, LogOut, Ticket, HandCoins, ArrowDown, Award, UserPlus, BarChart3, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminSidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const path = usePathname();

  const nav = [
    { name: "Dashboard", href: "/admin", icon: Home },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Agents", href: "/admin/agents", icon: UserPlus },
    { name: "Bets", href: "/admin/bets", icon: Ticket },
    { name: "Deposits", href: "/admin/deposits", icon: ArrowDown },
    { name: "Withdrawals", href: "/admin/withdrawals", icon: HandCoins },
    { name: "Transactions", href: "/admin/transactions", icon: History },
    { name: "Results", href: "/admin/results", icon: Award },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Notifications", href: "/admin/notifications", icon: Bell },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="neon-sidebar flex !h-full">
      <div>
        <h1 className="text-xl font-bold mb-6 text-white drop-shadow-[0_0_6px_#7f5bff]">
          Lucky Winner Admin✨
        </h1>
        <nav className="space-y-1 flex-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} onClick={onLinkClick}>
              <div className={cn('neon-nav-item', path === item.href ? "neon-nav-active" : "")}>
                <item.icon />
                {item.name}
              </div>
            </Link>
          ))}
        </nav>
      </div>

      <button className="mt-auto neon-nav-item text-red-400 hover:text-red-200 hover:shadow-[0_0_12px_#ff0055cc]">
        <LogOut className="text-red-400" /> Logout
      </button>
    </div>
  );
}


export function AdminSidebar() {
  return (
      <AdminSidebarContent />
  );
}
