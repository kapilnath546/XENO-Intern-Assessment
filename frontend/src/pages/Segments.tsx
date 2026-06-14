// Segments.tsx — Behavioural segment browser with targeting rationale.
// Shows each pre-built segment with live customer count, customer list modal,
// manual campaign launch, and an expandable "why target this?" explanation
// that gives marketers the strategic context behind each segment.

import { useState, useEffect } from 'react';
import { Users, ChevronRight, Loader2, Rocket, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api';
import { Segment, SegmentCustomer } from '../types';
import { SegmentCustomerModal } from '../components/SegmentCustomerModal';
import { SegmentLaunchModal } from '../components/SegmentLaunchModal';

const SEGMENT_COLORS: Record<string, string> = {
  high_value:      'border-purple-200 bg-purple-50',
  at_risk:         'border-red-200 bg-red-50',
  one_time_buyers: 'border-blue-200 bg-blue-50',
  frequent_buyers: 'border-emerald-200 bg-emerald-50',
  coffee_lovers:   'border-amber-200 bg-amber-50',
};

// Expandable targeting rationale — gives marketers the strategic WHY
// behind each segment so they can make confident campaign decisions.
const SEGMENT_RATIONALE: Record<string, string> = {
  high_value: `These customers have proven willingness to spend. Retention costs 5x less than acquisition. A loyalty reward now increases lifetime value and signals that premium spend is recognised.`,
  at_risk: `60+ days of silence is the industry threshold for churn risk. A targeted offer now costs far less than winning them back later — or re-acquiring through paid ads after they've moved to a competitor.`,
  one_time_buyers: `Single-purchase customers converted once — meaning they trust the brand. A second-purchase nudge converts 20-30% of them on average. This is your highest-leverage growth lever right now.`,
  frequent_buyers: `Your most loyal customers. Treat them as VIPs. Early access, rewards, and referral incentives have the highest ROI here. They also drive word-of-mouth — the cheapest acquisition channel.`,
  coffee_lovers: `Category affinity signals re-purchase intent. Cross-sell complementary categories while the interest is warm. Coffee buyers in India are a high-intent, habitual purchase cohort.`,
};

export function SegmentsPage() {
  const [segments, setSegments]               = useState<Segment[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [customers, setCustomers]             = useState<SegmentCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [launchSegment, setLaunchSegment]     = useState<Segment | null>(null);
  // Track which segment cards have the rationale panel open
  const [expandedRationale, setExpandedRationale] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      const data = await api.getSegments();
      setSegments(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('[Segments] Failed to load segments:', err);
      setError('Failed to load segments. Ensure the backend is running.');
      setSegments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCustomers = async (segment: Segment) => {
    setSelectedSegment(segment);
    setCustomersLoading(true);
    setCustomers([]);
    try {
      const data = await api.getSegmentCustomers(segment.id);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[Segments] Failed to load customers:', err);
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  };

  const toggleRationale = (segmentId: string) => {
    setExpandedRationale((prev) => {
      const next = new Set(prev);
      if (next.has(segmentId)) {
        next.delete(segmentId);
      } else {
        next.add(segmentId);
      }
      return next;
    });
  };

  const safeSegments = Array.isArray(segments) ? segments : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Segments</h2>
        <p className="text-sm text-gray-500">
          Pre-built customer segments based on purchase behaviour — computed live from order history
        </p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {safeSegments.map((segment) => {
            const isRationaleOpen = expandedRationale.has(segment.id);
            const rationale = SEGMENT_RATIONALE[segment.id];

            return (
              <div
                key={segment.id}
                className={`rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${SEGMENT_COLORS[segment.id] ?? 'border-gray-200'}`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-lg bg-white/80 p-2">
                    <Users className="h-5 w-5 text-[#7C3AED]" />
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-gray-900">
                    {segment.customer_count ?? 0}
                  </span>
                </div>

                <h3 className="mb-1 text-base font-semibold text-gray-900">{segment.name}</h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-600">{segment.description}</p>

                {/* Expandable "Why target this segment?" section */}
                {rationale && (
                  <div className="mb-4">
                    <button
                      id={`rationale-toggle-${segment.id}`}
                      onClick={() => toggleRationale(segment.id)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-[#7C3AED] transition-colors hover:bg-purple-50"
                    >
                      <span>Why target this segment?</span>
                      {isRationaleOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                    {isRationaleOpen && (
                      <div className="mt-2 rounded-lg bg-white/70 px-3 py-3">
                        <p className="text-xs leading-relaxed text-gray-600">{rationale}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    id={`view-customers-${segment.id}`}
                    onClick={() => handleViewCustomers(segment)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-[#7C3AED] hover:text-[#7C3AED]"
                  >
                    View Customers
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    id={`launch-segment-${segment.id}`}
                    onClick={() => setLaunchSegment(segment)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                  >
                    <Rocket className="h-4 w-4" />
                    Launch Campaign to Segment
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedSegment && (
        <SegmentCustomerModal
          segmentName={selectedSegment.name}
          customers={customers}
          loading={customersLoading}
          onClose={() => setSelectedSegment(null)}
        />
      )}

      {launchSegment && (
        <SegmentLaunchModal
          segment={launchSegment}
          onClose={() => setLaunchSegment(null)}
          onLaunched={() => {
            setLaunchSegment(null);
            loadSegments();
          }}
        />
      )}
    </div>
  );
}
