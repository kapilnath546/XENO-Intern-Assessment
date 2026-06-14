// RecommendationsPanel.tsx — Displays AI campaign recommendations with enriched metadata.
// This is the marketer's primary decision surface: they see who to target, why, and how,
// then approve with a single click to launch the campaign.

import { useState, useEffect } from 'react';
import { Recommendation } from '../types';
import { api } from '../api';
import { Sparkles, CheckCircle, Loader2, Users, Lightbulb } from 'lucide-react';
import { cn } from '../utils';

interface RecommendationsPanelProps {
  onLaunch: (recommendation: Recommendation) => Promise<void>;
}

// Channel colour mapping — consistent with CampaignsList ChannelBadge
const CHANNEL_STYLES: Record<string, { bg: string; text: string }> = {
  WhatsApp: { bg: 'bg-green-100',  text: 'text-green-700'  },
  SMS:      { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  Email:    { bg: 'bg-purple-100', text: 'text-purple-700' },
  RCS:      { bg: 'bg-orange-100', text: 'text-orange-700' },
};

// Priority colours for the dot indicator
const PRIORITY_STYLES: Record<string, { dot: string; text: string }> = {
  High:   { dot: 'bg-red-500',   text: 'text-red-600'   },
  Medium: { dot: 'bg-amber-400', text: 'text-amber-600' },
  Low:    { dot: 'bg-gray-400',  text: 'text-gray-500'  },
};

export function RecommendationsPanel({ onLaunch }: RecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [dataInsight, setDataInsight]         = useState<string>('');
  const [loading, setLoading]                 = useState(true);
  const [loadError, setLoadError]             = useState<string | null>(null);
  const [launching, setLaunching]             = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const data = await api.getRecommendations();
      setRecommendations(Array.isArray(data.recommendations) ? data.recommendations : []);
      setDataInsight(data.data_insight || '');
      setLoadError(null);
    } catch (error) {
      console.error('[RecommendationsPanel] Failed to load recommendations:', error);
      setRecommendations([]);
      setLoadError('Unable to load recommendations. Ensure the backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async (recommendation: Recommendation) => {
    const launchKey = recommendation?.segment_name ?? 'unknown';
    setLaunching(launchKey);
    try {
      await onLaunch(recommendation);
      // Remove the launched recommendation from the list — it's now a live campaign
      setRecommendations((prev) =>
        (prev ?? []).filter((item) => item?.segment_name !== recommendation?.segment_name)
      );
    } catch (error) {
      console.error('[RecommendationsPanel] Failed to launch campaign:', error);
    } finally {
      setLaunching(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
          <p className="text-sm text-gray-500">Analysing customer data…</p>
        </div>
      </div>
    );
  }

  const safeRecommendations = Array.isArray(recommendations) ? recommendations : [];

  if (loadError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 py-12 text-center text-amber-800">
        <Sparkles className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <p className="font-medium">Click &apos;Generate AI Recommendations&apos; to analyze your customer data.</p>
        <p className="mt-2 text-sm">{loadError}</p>
      </div>
    );
  }

  if (safeRecommendations.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] py-12 text-center text-gray-500">
        <Sparkles className="mx-auto mb-4 h-12 w-12 opacity-40" />
        <p className="font-medium">No recommendations available</p>
        <p className="mt-1 text-sm text-gray-400">Approve an AI recommendation above to launch a campaign →</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Panel header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#7C3AED]" />
        <h2 className="text-lg font-semibold text-gray-900">AI Recommendations</h2>
      </div>

      {/* AI Insight box — shows the top-level data observation from the model */}
      {dataInsight && (
        <div className="flex gap-3 rounded-xl border-l-4 border-[#7C3AED] bg-[#F3F0FF] px-4 py-3">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#7C3AED]" />
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#7C3AED]">
              AI Insight
            </p>
            <p className="text-sm leading-relaxed text-gray-700">{dataInsight}</p>
          </div>
        </div>
      )}

      {/* Recommendation cards */}
      <div className="grid gap-4">
        {safeRecommendations.map((rec, index) => {
          const segmentName   = rec?.segment_name ?? `Recommendation ${index + 1}`;
          const isLaunching   = launching === segmentName;
          const audienceSize  = rec?.segment_size ?? rec?.estimated_audience ?? 0;
          const channel       = rec?.channel;
          const channelReason = rec?.channel_reason;
          const priority      = rec?.priority;
          const openRate      = rec?.expected_open_rate;

          const channelStyle  = channel ? (CHANNEL_STYLES[channel] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }) : null;
          const priorityStyle = priority ? (PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.Low) : null;

          return (
            <div
              key={segmentName}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Header row: name + audience count */}
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{segmentName}</h3>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {rec?.target_criteria ?? rec?.segment_filter ?? 'No target criteria'}
                  </p>
                </div>
                {audienceSize > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-[#7C3AED]">
                    <Users className="h-3.5 w-3.5" />
                    {audienceSize} customers
                  </span>
                )}
              </div>

              {/* Channel badge + priority dot row */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                {channel && channelStyle && (
                  <div className="flex flex-col gap-0.5">
                    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold', channelStyle.bg, channelStyle.text)}>
                      {channel}
                    </span>
                    {channelReason && (
                      <span className="max-w-[200px] text-[10px] italic text-gray-400">{channelReason}</span>
                    )}
                  </div>
                )}
                {priority && priorityStyle && (
                  <div className="flex items-center gap-1.5">
                    <span className={cn('h-2 w-2 rounded-full', priorityStyle.dot)} />
                    <span className={cn('text-xs font-medium', priorityStyle.text)}>{priority} Priority</span>
                  </div>
                )}
              </div>

              {/* Suggested message */}
              <div className="mb-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Suggested Message
                </p>
                <p className="rounded-lg border border-gray-100 bg-[#F9FAFB] p-4 text-sm leading-relaxed text-gray-700">
                  {rec?.suggested_message ?? rec?.message ?? 'No message provided'}
                </p>
              </div>

              {/* AI reasoning */}
              <div className="mb-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  AI Reasoning
                </p>
                <p className="text-sm italic text-gray-600">
                  {rec?.ai_reasoning ?? 'No reasoning provided'}
                </p>
              </div>

              {/* Expected open rate footer */}
              {openRate && (
                <p className="mb-4 text-xs text-gray-400">
                  ~{openRate} open rate
                </p>
              )}

              {/* Launch button */}
              <button
                id={`launch-${segmentName.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => handleLaunch(rec)}
                disabled={isLaunching}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                  isLaunching
                    ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                    : 'bg-[#7C3AED] text-white hover:bg-purple-700'
                )}
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Launching...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Approve &amp; Launch
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
