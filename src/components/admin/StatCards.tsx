'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Wallet, Users, Trophy, IndianRupee } from 'lucide-react'

export default function StatCards({ stats }: { stats: { title: string, value: string | number, icon: 'users'|'wallet'|'trophy'|'revenue' }[] }) {
  const ICONS = { users: Users, wallet: Wallet, trophy: Trophy, revenue: IndianRupee }
  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s, i) => {
        const Icon = ICONS[s.icon]
        return (
          <Card key={i} className="neon-card glow-outline">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <div className="text-sm text-[var(--neon-dim)]">{s.title}</div>
                <div className="text-2xl font-semibold">{s.value}</div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-[#171631] grid place-items-center shadow-[0_0_12px_rgba(127,91,255,.35)]">
                <Icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}