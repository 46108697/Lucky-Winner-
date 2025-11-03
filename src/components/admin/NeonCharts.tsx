'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid } from 'recharts'

const revenueData = Array.from({ length: 12 }).map((_, i) => ({
  m: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
  v: Math.round(400 + Math.random()*800)
}))

export function RevenueChart() {
  return (
    <Card className="neon-card">
      <CardHeader>
        <CardTitle>Monthly Revenue</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueData} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--neon-cyan)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#000000" stopOpacity={0} />
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,91,255,.25)" />
            <XAxis dataKey="m" stroke="#9aa" tickLine={false} axisLine={false} />
            <YAxis stroke="#9aa" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{
              background: '#15152a',
              borderColor: 'rgba(127,91,255,.35)',
              borderRadius: '10px'
            }}/>
            <Area type="monotone" dataKey="v" stroke="var(--neon-cyan)" fill="url(#grad)" strokeWidth={2.2} filter="url(#glow)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

const usersData = Array.from({ length: 10 }).map((_, i) => ({
  d: `D${i+1}`, u: Math.round(10 + Math.random()*40) }))

export function UsersChart() {
  return (
    <Card className="neon-card">
      <CardHeader>
        <CardTitle>New Users (Last 10 days)</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={usersData} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,91,255,.25)" />
            <XAxis dataKey="d" stroke="#9aa" tickLine={false} axisLine={false} />
            <YAxis stroke="#9aa" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{
              background: '#15152a',
              borderColor: 'rgba(127,91,255,.35)',
              borderRadius: '10px'
            }}/>
            <Line type="monotone" dataKey="u" stroke="var(--neon-purple)" strokeWidth={2.4} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}