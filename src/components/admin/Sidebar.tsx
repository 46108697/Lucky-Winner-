'use client'
import { Home, Users, Settings, Wallet, Ticket, BarChart3, ArrowDown, HandCoins } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Withdrawals', href: '/admin/withdrawals', icon: HandCoins },
  { name: 'Deposits', href: '/admin/deposits', icon: ArrowDown },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside className="neon-sidebar hidden lg:flex">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--neon-purple)] to-[var(--neon-cyan)]" />
        <div>
          <div className="font-bold">Lucky Admin</div>
          <div className="text-xs text-[var(--neon-dim)]">Dark Neon Premium</div>
        </div>
      </div>

      <nav className="space-y-1 flex-1">
        {NAV.map((item) => {
          const Active = path === item.href
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} className={`neon-nav-item ${Active ? 'neon-nav-active' : ''}`}>
              <Icon />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto text-[var(--neon-dim)] text-xs">v1.0 • © {new Date().getFullYear()}</div>
    </aside>
  )
}