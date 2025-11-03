'use client';

import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export function AdminStatCard({
  title,
  value,
  icon: Icon,
  change,
  color = "from-primary to-purple-500"
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  color?: string;
}) {
  return (
    <Card className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all">
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-20`} />
      <CardContent className="relative p-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm text-white/70 font-medium">{title}</h2>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {change && (
            <p className="text-xs mt-1 text-emerald-400 font-medium">
              ▲ {change} this week
            </p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md">
          <Icon className="h-7 w-7 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}
