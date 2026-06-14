// RecommendationsPanel.tsx — Displays AI campaign recommendations with enriched metadata.
// This is the marketer's primary decision surface: they see who to target, why, and how,
// then approve with a two-click confirmation to launch the campaign.
//
// Launch UX flow (human-in-the-loop design):
//   idle → "Approve & Launch" (purple)
//   1st click → "Confirm Launch →" (amber, 3s timer)
//   2nd click → "Launching..." (gray, disabled, spinner)
//   success → "✓ Launched" (green, permanently disabled)
//   failure → reverts to idle so the user can retry

import { useState, useEffect, useRef } from 'react';
import { Recommendation } from '../types';
import { api } from '../api';
import { Sparkles, CheckCircle, Loader2, Users, Lightbulb, AlertTriangle } from 'lucide-react';
import { cn } from '../utils';

interface RecommendationsPanelProps {
  onLaunch: (recommendation: Recommendation) => Promise<void>;
  launchedSegmentNames?: string[];
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

type LaunchState = 'idle' | 'confirm' | 'launching' | 'launched';

export function RecommendationsPanel({ onLaunch, launchedSegmentNames = [] }: RecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [dataInsight, setDataInsight]         = useState<string>('');
  const [loading, setLoading]                 = useState(true);
  const [loadError, setLoadError]             = useState<string | null>(null);

  // Per-card launch state: keyed by index so two cards with same name don't clash
  const [launchStates, setLaunchStates] = useState<Record<number, LaunchState>>({});
  // Track custom edited messages
  const [customMessages, setCustomMessages] = useState<Record<number, string>>({});
  // Track confirm-timeout timers so we can cancel them if needed
  const confirmTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    loadRecommendations();
    // Clear any pending timers on unmount
    return () => {
      Object.values(confirmTimers.current).forEach(clearTimeout);
    };
  }, []);

  const loadRecommendations = async () => {
    try {
      const data = await api.getRecommendations();
      const safeData = Array.isArray(data) ? data : (data.recommendations || []);
      setRecommendations(safeData);
      
      // The backend returns a data insight as a top-level property sometimes
      if ((data as any).data_insight) {
        setDataInsight((data as any).data_insight);
      }
      setLoadError(null);
    } catch (error) {
      console.error('[RecommendationsPanel] Failed to load recommendations:', error);
      setLoadError('Failed to generate AI recommendations. Please check API key or connectivity.');
    } finally {
      setLoading(false);
    }
  };

  const setCardState = (index: number, state: LaunchState) => {
    setLaunchStates(prev => ({ ...prev, [index]: state }));
  };

  const handleMessageChange = (index: number, newMessage: string) => {
    setCustomMessages(prev => ({ ...prev, [index]: newMessage }));
  };

  const handleButtonClick = async (rec: Recommendation, index: number) => {
    const currentState = launchStates[index] ?? 'idle';

    if (currentState === 'idle') {
      // First click: enter confirm mode, start 3s revert timer
      setCardState(index, 'confirm');
      confirmTimers.current[index] = setTimeout(() => {
        setLaunchStates(prev => {
          // Only revert if still in confirm — don't overwrite a launched state
          if ((prev[index] ?? 'idle') === 'confirm') {
            return { ...prev, [index]: 'idle' };
          }
          return prev;
        });
      }, 3000);
      return;
    }

    if (currentState === 'confirm') {
      // Second click within 3s: cancel the revert timer and launch
      clearTimeout(confirmTimers.current[index]);
      setCardState(index, 'launching');
      try {
        const editedMessage = customMessages[index] ?? (rec.suggested_message ?? rec.message ?? 'No message provided');
        await onLaunch({ ...rec, suggested_message: editedMessage });
        setCardState(index, 'launched');
        
        // Store in localStorage to prevent duplicates on reload
        const slug = (rec.segment_name ?? `Recommendation ${index + 1}`).toLowerCase().replace(/\s+/g, '-');
        const key = `launched_rec_${slug}`;
        localStorage.setItem(key, new Date().toISOString());
        
      } catch (error) {
        console.error('[RecommendationsPanel] Failed to launch campaign:', error);
        // Revert to idle on failure so the user can retry
        setCardState(index, 'idle');
      }
      return;
    }

    // 'launching' or 'launched' — button is disabled, clicks are ignored
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
      <div className="rounded-xl border border-red-200 bg-red-50 py-10 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <p className="font-medium text-red-700">Unable to connect to server</p>
        <p className="mt-1 text-sm text-red-500">{loadError}</p>
        <button
          onClick={() => { setLoading(true); setLoadError(null); loadRecommendations(); }}
          className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (safeRecommendations.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] py-12 text-center text-gray-500">
        <Sparkles className="mx-auto mb-4 h-12 w-12 opacity-40" />
        <p className="font-medium">All recommendations launched!</p>
        <p className="mt-1 text-sm text-gray-400">Check Active Campaigns below to monitor delivery →</p>
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
          const cardState     = launchStates[index] ?? 'idle';
          const audienceSize  = rec?.segment_size ?? rec?.estimated_audience ?? 0;
          const channel       = rec?.channel;
          const channelReason = rec?.channel_reason;
          const priority      = rec?.priority;
          const openRate      = rec?.expected_open_rate;
          const slug = segmentName.toLowerCase().replace(/\s+/g, '-');
          const localLaunched = !!localStorage.getItem(`launched_rec_${slug}`);
          const alreadyLaunched = launchedSegmentNames.includes(segmentName) || localLaunched || cardState === 'launched';

          const channelStyle  = channel ? (CHANNEL_STYLES[channel] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }) : null;
          const priorityStyle = priority ? (PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.Low) : null;

          return (
            <div
              key={`${segmentName}-${index}`}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {/* "Already launched today" banner */}
              {alreadyLaunched && (
                <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 border-b border-amber-100">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Already launched today
                </div>
              )}

              <div className="p-6">
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
                        <span className="max-w-[220px] text-[10px] italic text-gray-400">{channelReason}</span>
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
                  <textarea
                    value={customMessages[index] ?? (rec?.suggested_message ?? rec?.message ?? '')}
                    onChange={(e) => handleMessageChange(index, e.target.value)}
                    disabled={cardState === 'launching' || cardState === 'launched'}
                    className="w-full resize-none rounded-lg border border-gray-200 bg-[#F9FAFB] p-4 text-sm leading-relaxed text-gray-700 outline-none transition-colors focus:border-[#7C3AED] focus:bg-white"
                    rows={3}
                    placeholder="Write your campaign message here..."
                  />
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
                  <p className="mb-4 text-xs text-gray-400">~{openRate} open rate</p>
                )}

                {/* Launch button — 3-state: idle → confirm → launching → launched */}
                <LaunchButton
                  index={index}
                  segmentName={segmentName}
                  cardState={alreadyLaunched ? 'launched' : cardState}
                  onClick={() => handleButtonClick(rec, index)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Extracted to keep JSX clean — renders differently based on LaunchState
function LaunchButton({
  index,
  segmentName,
  cardState,
  onClick,
}: {
  index: number;
  segmentName: string;
  cardState: LaunchState;
  onClick: () => void;
}) {
  const isDisabled = cardState === 'launching' || cardState === 'launched';
  const slug = segmentName.toLowerCase().replace(/\s+/g, '-');

  const buttonClass = cn(
    'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
    cardState === 'idle'      && 'bg-[#7C3AED] text-white hover:bg-purple-700 cursor-pointer',
    cardState === 'confirm'   && 'bg-amber-500 text-white hover:bg-amber-600 cursor-pointer animate-pulse',
    cardState === 'launching' && 'cursor-not-allowed bg-gray-200 text-gray-500',
    cardState === 'launched'  && 'cursor-not-allowed bg-green-100 text-green-700',
  );

  return (
    <button
      id={`launch-${slug}-${index}`}
      onClick={onClick}
      disabled={isDisabled}
      className={buttonClass}
    >
      {cardState === 'idle' && (
        <>
          <CheckCircle className="h-4 w-4" />
          Approve &amp; Launch
        </>
      )}
      {cardState === 'confirm' && (
        <>
          <span className="text-base">🚀</span>
          Confirm Launch →
        </>
      )}
      {cardState === 'launching' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Launching...
        </>
      )}
      {cardState === 'launched' && (
        <>
          <CheckCircle className="h-4 w-4" />
          ✓ Launched
        </>
      )}
    </button>
  );
}
