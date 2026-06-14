// Analytics.tsx — Campaign performance comparison view with bar chart and data table.
// Gives the marketer a historical view of all campaigns so they can learn what
// segments, channels, and messages delivered the best results.

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { api } from '../api';
import { AnalyticsCampaign } from '../types';
import { formatLaunchedAt } from '../utils';

export function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<AnalyticsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await api.getAnalyticsCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics data.');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];

  const chartData = safeCampaigns.map((c) => ({
    name: c.name.length > 18 ? `${c.name.slice(0, 16)}…` : c.name,
    Sent: c.sent,
    Delivered: c.delivered,
    Read: c.read,
    Clicked: c.clicked,
    Failed: c.failed,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
        <p className="text-sm text-gray-500">Campaign performance comparison across all launches</p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : safeCampaigns.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] py-16 text-center text-gray-500">
          <p>No campaign data yet. Launch a campaign to see analytics.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-base font-semibold text-gray-900">Campaign Performance</h3>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '13px',
                  }}
                />
                <Legend />
                <Bar dataKey="Sent" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Delivered" fill="#22C55E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Read" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Clicked" fill="#F97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Failed" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-[#F9FAFB] text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Segment</th>
                    <th className="px-6 py-3">Launched</th>
                    <th className="px-6 py-3 text-right">Sent</th>
                    <th className="px-6 py-3 text-right">Delivered</th>
                    <th className="px-6 py-3 text-right">Read</th>
                    <th className="px-6 py-3 text-right">Clicked</th>
                    <th className="px-6 py-3 text-right">Failed</th>
                    <th className="px-6 py-3 text-right">Delivery Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {safeCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-6 py-4 font-medium text-gray-900">{campaign.name}</td>
                      <td className="px-6 py-4 text-gray-600">{campaign.segment_name}</td>
                      <td className="px-6 py-4 text-gray-600">{formatLaunchedAt(campaign.launched_at)}</td>
                      <td className="px-6 py-4 text-right text-gray-900">{campaign.sent}</td>
                      <td className="px-6 py-4 text-right text-green-600">{campaign.delivered}</td>
                      <td className="px-6 py-4 text-right text-purple-600">{campaign.read}</td>
                      <td className="px-6 py-4 text-right text-orange-600">{campaign.clicked}</td>
                      <td className="px-6 py-4 text-right text-red-600">{campaign.failed}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        {campaign.delivery_rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
