'use client'
import StatCards from '@/components/admin/StatCards'
import { RevenueChart, UsersChart } from '@/components/admin/NeonCharts'

export default function AdminDashboardPage() {
  const stats = [
    { title: 'Total Revenue', value: '₹12,84,000', icon: 'revenue' as const },
    { title: 'Active Users', value: 1284, icon: 'users' as const },
    { title: 'Wallet Balance', value: '₹3,20,500', icon: 'wallet' as const },
    { title: 'Winners (Today)', value: 42, icon: 'trophy' as const },
  ]
  return (
    <div className="space-y-6">
      <h1 className="neon-title">Dashboard Overview</h1>
      <StatCards stats={stats} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <UsersChart />
      </div>
    </div>
  )
}