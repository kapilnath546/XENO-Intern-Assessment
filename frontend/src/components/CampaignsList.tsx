// CampaignsList.tsx — Live campaign tracker showing real-time delivery metrics.
// Polls every 3s via the Dashboard parent. The marketer watches Sent → Delivered → Read
// progress without needing to refresh — this is the core feedback loop of the product.

import { Campaign, CampaignMetrics } from '../types';
import { Send, CheckCircle, Eye, MousePointer2, XCircle } from 'lucide-react';
import { cn, formatLaunchedAt, deliveryRate } from '../utils';

interface CampaignsListProps {
  campaigns?: Campaign[] | null;
  compact?: boolean;
  showHeader?: boolean;
}

const EMPTY_METRICS: CampaignMetrics = {
  sent: 0,
  delivered: 0,
  read: 0,
  clicked: 0,
  failed: 0,
};

function getMetrics(campaign: Campaign): CampaignMetrics {
  return campaign?.metrics ?? EMPTY_METRICS;
}

export function CampaignsList({ campaigns, compact = false, showHeader = true }: CampaignsListProps) {
  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];

  if (safeCampaigns.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] py-16 text-center text-gray-500">
        <Send className="mx-auto mb-4 h-12 w-12 opacity-40" />
        <p className="font-medium">No active campaigns yet</p>
        <p className="mt-1 text-sm">Approve an AI recommendation above to launch one →</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Active Campaigns</h2>
          <span className="text-sm text-gray-500">{safeCampaigns.length} running</span>
        </div>
      )}

      <div className={cn('space-y-4', compact && 'space-y-3')}>
        {safeCampaigns.map((campaign, index) => {
          const metrics = getMetrics(campaign);
          const sent = metrics.sent ?? 0;
          const delivered = metrics.delivered ?? 0;
          const rate = deliveryRate(delivered, sent);
          const campaignKey = campaign?.id ?? `campaign-${index}`;

          return (
            <div
              key={campaignKey}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {campaign?.name ?? 'Untitled Campaign'}
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {campaign?.segment_name ?? 'No segment'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {campaign?.channel && <ChannelBadge channel={campaign.channel} />}
                  <span className="text-xs text-gray-400">
                    {formatLaunchedAt(campaign?.created_at)}
                  </span>
                </div>
              </div>

              <div className="relative mb-4 rounded-xl rounded-tl-sm border border-purple-100 bg-purple-50 px-4 py-3">
                <div className="absolute -left-1 top-3 h-3 w-3 rotate-45 border-b border-l border-purple-100 bg-purple-50" />
                <p className="text-sm leading-relaxed text-gray-700">
                  {campaign?.message ?? 'No message provided'}
                </p>
              </div>

              <div className="mb-4 grid grid-cols-5 gap-2">
                <StatPill icon={<Send className="h-3.5 w-3.5" />} label="Sent" value={sent} color="blue" />
                <StatPill icon={<CheckCircle className="h-3.5 w-3.5" />} label="Delivered" value={delivered} color="green" />
                <StatPill icon={<Eye className="h-3.5 w-3.5" />} label="Read" value={metrics.read ?? 0} color="purple" />
                <StatPill icon={<MousePointer2 className="h-3.5 w-3.5" />} label="Clicked" value={metrics.clicked ?? 0} color="orange" />
                <StatPill icon={<XCircle className="h-3.5 w-3.5" />} label="Failed" value={metrics.failed ?? 0} color="red" />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Delivery rate</span>
                <span className="font-semibold text-gray-700">{rate}% delivered</span>
              </div>

              <ProgressBar metrics={metrics} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}) {
  const colors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
  };

  return (
    <div className="rounded-lg border border-gray-100 bg-[#F9FAFB] px-2 py-2 text-center">
      <div className={cn('mx-auto mb-1 flex justify-center', colors[color])}>{icon}</div>
      <p className="text-lg font-bold text-gray-900">{Number.isFinite(value) ? value : 0}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
    </div>
  );
}

function ProgressBar({ metrics }: { metrics?: CampaignMetrics | null }) {
  const safe = metrics ?? EMPTY_METRICS;
  const total = safe.sent ?? 0;
  if (total <= 0) return null;

  const segments = [
    { pct: ((safe.delivered ?? 0) / total) * 100, color: 'bg-green-500' },
    { pct: ((safe.read ?? 0) / total) * 100, color: 'bg-purple-500' },
    { pct: ((safe.clicked ?? 0) / total) * 100, color: 'bg-orange-500' },
    { pct: ((safe.failed ?? 0) / total) * 100, color: 'bg-red-500' },
  ];

  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
      <div className="flex h-full">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={cn('h-full transition-all duration-500', seg.color)}
            style={{ width: `${seg.pct}%` }}
          />
        ))}
      </div>
    </div>
  );
}

const CHANNEL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  WhatsApp: { bg: 'bg-green-100', text: 'text-green-700', label: 'WhatsApp' },
  SMS:      { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'SMS' },
  Email:    { bg: 'bg-purple-100',text: 'text-purple-700',label: 'Email' },
  RCS:      { bg: 'bg-orange-100',text: 'text-orange-700',label: 'RCS' },
};

function ChannelBadge({ channel }: { channel: string }) {
  const style = CHANNEL_STYLES[channel] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: channel };
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-snug',
        style.bg,
        style.text
      )}
    >
      {style.label}
    </span>
  );
}
