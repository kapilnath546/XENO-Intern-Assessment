// StatsRow.tsx — Four headline KPI cards shown at the top of the Dashboard.
// Provides instant orientation for the marketer: how big is the customer base,
// how many campaigns are running, how many messages have been sent.

import { Users, ShoppingBag, Megaphone, Send } from 'lucide-react';
import { DashboardStats } from '../types';
import { cn } from '../utils';

interface StatsRowProps {
  stats: DashboardStats;
  loading?: boolean;
}

const statConfig = [
  {
    key: 'total_customers' as const,
    label: 'Total Customers',
    icon: Users,
    color: 'text-purple-600 bg-purple-50 border-purple-100',
  },
  {
    key: 'total_orders' as const,
    label: 'Total Orders',
    icon: ShoppingBag,
    color: 'text-blue-600 bg-blue-50 border-blue-100',
  },
  {
    key: 'active_campaigns' as const,
    label: 'Active Campaigns',
    icon: Megaphone,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
  {
    key: 'total_messages_sent' as const,
    label: 'Total Messages Sent',
    icon: Send,
    color: 'text-orange-600 bg-orange-50 border-orange-100',
  },
];

export function StatsRow({ stats, loading }: StatsRowProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statConfig.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-5 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {loading ? '—' : (stats?.[key] ?? 0).toLocaleString()}
              </p>
            </div>
            <div className={cn('rounded-lg border p-2.5', color)}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
