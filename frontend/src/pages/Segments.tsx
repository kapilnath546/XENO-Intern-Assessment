// Segments.tsx — Segment browser with AI-powered message regeneration via Gemini.
//
// Page load: instant messages from the client-side bank (no wait).
// Regenerate click: calls Gemini via the backend, shows a spinner, 
//   streams the fresh AI-written copy into the card.
// Falls back to cycling the client-side bank if the API is unavailable.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, ChevronRight, Loader2, ChevronDown, ChevronUp,
  Sparkles, CheckCircle, AlertCircle, Send,
} from 'lucide-react';
import { api } from '../api';
import { Segment, SegmentCustomer } from '../types';
import { SegmentCustomerModal } from '../components/SegmentCustomerModal';
import { cn } from '../utils';

// ---------------------------------------------------------------------------
// Tone & channel types
// ---------------------------------------------------------------------------

type ToneOption = 'friendly' | 'urgent' | 'exclusive' | 'grateful';
const TONE_OPTIONS: ToneOption[] = ['friendly', 'urgent', 'exclusive', 'grateful'];

// ---------------------------------------------------------------------------
// Client-side message bank — shown instantly on page load and used as fallback
// 4 variants per segment × tone so cycling still works if backend is down
// ---------------------------------------------------------------------------

const MESSAGE_BANK: Record<string, Record<ToneOption, string[]>> = {
  high_value: {
    friendly: [
      'Namaste! As one of our most valued shoppers, enjoy an exclusive 20% off your next order. Your loyalty means the world to us ✨',
      'Hi! We wanted to personally thank you for your continued support. Here is a special VIP reward — 25% off, just for you 🎁',
      'Hello! Our premium customers deserve the best. Enjoy complimentary priority shipping and 20% off your next purchase as our thank you!',
      'You are among our most cherished customers. We have unlocked an exclusive offer — 30% off our new collection, available only for VIPs like you 🌟',
    ],
    urgent: [
      'VIP ALERT: Your exclusive 24-hour offer is live NOW! 25% off everything — do not miss out! Shop before midnight 🚨',
      'Last chance, VIP! Your loyalty reward expires in 12 hours. Claim 30% off any order right now. Tap to unlock! ⏰',
      'URGENT: We reserved a premium deal just for you. 20% off + free shipping, valid for TODAY only. Grab it before it expires! ⚡',
      'Time-sensitive VIP offer: 35% off your favourites for the next 6 hours. You have earned it — claim your reward now! 🔥',
    ],
    exclusive: [
      'You have been granted early access to our members-only collection. Shop premium products at exclusive prices before anyone else 👑',
      'Your status has unlocked a members-only privilege: 25% off our limited edition range + complimentary gift wrapping. Exclusively yours.',
      'As a valued customer, you are invited to our private preview. Explore new arrivals before they go public — with an exclusive 20% member discount.',
      'Exclusive invitation: Our premium lounge is open just for you. Curated recommendations, VIP pricing, and a surprise gift with your next order 💎',
    ],
    grateful: [
      'From all of us — thank you. Your loyalty has made a real difference. Here is 25% off as our heartfelt appreciation 🙏',
      'We are truly grateful for your continued trust. As a token of appreciation, enjoy an exclusive reward on your next purchase.',
      'Your support has helped us grow. Thank you with something special — 30% off and free priority delivery on your next order ❤️',
      'Because of customers like you, we keep getting better. Thank you sincerely. Enjoy a VIP discount as our way of saying it means a lot.',
    ],
  },
  at_risk: {
    friendly: [
      'We have missed you! It has been a while since your last visit. Here is Rs. 500 off your next order — we would love to see you back ❤️',
      'Hey, we noticed you have not visited in a while! Discover what is new and enjoy a special comeback offer just for you 🌟',
      'Long time no see! We have been busy adding new arrivals we think you will love. Come explore with 15% off — valid for 48 hours!',
      'We miss having you around! Your favourites are waiting, and we have a special welcome-back reward ready. Come see what is new 🎁',
    ],
    urgent: [
      'DO NOT miss out! Your comeback offer expires in 24 hours: 20% off + free shipping. We would hate to see it go to waste. Shop NOW! ⏰',
      'FINAL REMINDER: Your exclusive re-engagement discount disappears at midnight. 25% off everything — claim it before it is gone! 🚨',
      'Only hours left on your special return offer! Come back today and get Rs. 500 off — this deal is not coming back. Act now! ⚡',
      'Last call! Your personalised win-back discount is about to expire. 30% off, free returns, valid TODAY only. Do not wait! 🔥',
    ],
    exclusive: [
      'You have been selected for our exclusive win-back programme. Enjoy a private 25% off code that cannot be found anywhere else. Welcome back!',
      'We saved something special for you. This exclusive comeback offer — 20% off + priority access — is available only for customers we genuinely miss.',
      'Our re-engagement rewards are reserved for customers like you. Enjoy VIP pricing on your return visit — a private 30% off, no strings attached.',
      'Not everyone gets this offer. As a valued returning customer, you have been granted exclusive access to our best deal of the month. Welcome back 💎',
    ],
    grateful: [
      'We are grateful you chose us before, and we hope we can earn your trust again. Here is Rs. 500 off as a genuine thank you for returning 🙏',
      'Thank you for considering us again. To show how much we appreciate it, enjoy 25% off and complimentary gift wrapping on your return order.',
      'It truly means a lot that you are back. Here is a heartfelt 20% welcome-back discount — because loyal customers deserve to feel valued ❤️',
      'We have not forgotten you, and we hope you have not forgotten us. Here is a grateful 30% off to celebrate your return. Welcome back!',
    ],
  },
  one_time_buyers: {
    friendly: [
      'Thanks for your first purchase with us — we hope you loved it! Here is 15% off your second order as a little nudge to explore more 🎁',
      'Great to have you with us! Many of our most loyal customers say their second purchase was when they truly fell in love. Give it a try — 15% off!',
      'Your first order was just the beginning! Discover even more great products and enjoy a special 200 INR off your next purchase 🛍️',
      'So glad you found us! Here is a friendly 10% off to make your second order even sweeter. We think you will love what comes next!',
    ],
    urgent: [
      'Your second-purchase bonus expires in 24 HOURS! 200 INR off your next order — use it before it disappears. Shop now! ⚡',
      'HURRY! Your first-timer reward ends at midnight. Get 15% off your next order — do not let it go to waste! ⏰',
      'Limited time: your exclusive second-purchase discount is almost gone! 20% off, valid for TODAY only. Tap to claim it now 🚨',
      'Only hours left on your welcome bonus! 200 INR off expires soon — come back and discover your next favourite product 🔥',
    ],
    exclusive: [
      'As one of our newest members, you have been selected for an exclusive second-purchase offer: 20% off anything in our collection. Just for you.',
      'First-time buyers who return unlock our loyalty tier early. Your exclusive 15% member discount is now active — shop and level up!',
      'You are officially part of our community! To celebrate, here is an exclusive 200 INR bonus reserved only for first-timers making their comeback.',
      'Members who return within 30 days unlock VIP pricing. Your exclusive window is still open — claim your 20% second-purchase reward now 💎',
    ],
    grateful: [
      'Thank you for trusting us with your first purchase. We are grateful for your support and would love the chance to serve you again — 15% off! 🙏',
      'Your first order meant a lot to us. Here is a heartfelt thank-you gift: 200 INR off your next purchase, because you deserve it ❤️',
      'We are truly thankful you chose us. As a gesture of appreciation, here is an exclusive 20% off for your second order with us.',
      'Every new customer is special to us. Thank you for giving us a try — here is 15% off to make your next visit just as great 🌟',
    ],
  },
  frequent_buyers: {
    friendly: [
      'VIP Alert! 🌟 As one of our most frequent shoppers, you get early access to our new collection before anyone else. Go explore!',
      'Hey superfan! Your loyalty has made you one of our top customers. Enjoy 25% off our newest arrivals — you deserve it 🎉',
      'You shop with us more than almost anyone — and we love you for it! Here is a special 20% VIP reward as our way of saying thank you.',
      'Frequent buyer, frequent rewards! 🏆 Your loyalty has unlocked an exclusive 30% off and early access to this season\'s best sellers.',
    ],
    urgent: [
      'VIP FLASH SALE — 6 HOURS ONLY! As a top customer, you get first access to 35% off everything. Shop before it sells out! ⚡',
      'URGENT for VIPs: The exclusive members sale starts NOW. 30% off, free shipping, priority checkout — for the next 12 hours only! 🚨',
      'Loyal shoppers get first access — and your window is closing! 25% off + a mystery gift, available for the next 3 hours only ⏰',
      'TOP CUSTOMER ALERT: Your limited-time loyalty reward activates NOW. 40% off our newest launch, today only. Do not miss it! 🔥',
    ],
    exclusive: [
      'You have earned the highest tier of loyalty. Your exclusive reward: early preview access + 30% off our limited-edition drop. Members only 👑',
      'Loyal customers get exclusive perks no one else sees. Your private offer: 25% off, priority shipping, and first access to new products.',
      'As a top-tier customer, you have been granted exclusive concierge shopping access. Personal recommendations, VIP deals, and 30% off await 💎',
      'You are in our inner circle. This exclusive invite gives you 35% off, free premium returns, and a first look at our upcoming collection.',
    ],
    grateful: [
      'Thank you for being such an amazing customer. Your loyalty is the reason we keep improving — here is 30% off as our sincere gratitude 🙏',
      'From the bottom of our hearts, thank you. You are the kind of loyal customer every brand hopes for. Here is 25% off as a real thank you ❤️',
      'Your continued support means everything to our team. We are grateful for each order — here is a special reward just for you: 35% off!',
      'We do not take your loyalty for granted. Thank you truly — here is our most generous loyalty reward, 40% off, as a heartfelt appreciation 🌟',
    ],
  },
  coffee_lovers: {
    friendly: [
      'Time for a refill? ☕ Get 10% off our freshest roasts today — because great coffee lovers deserve great deals!',
      'Your next perfect cup is waiting! Explore new blends arriving this week and enjoy 15% off as a fellow coffee lover 🫘',
      'Hey coffee enthusiast! We just got a new single-origin batch we think you will adore. Grab 10% off while stocks are fresh ☕',
      'For the love of coffee! Our freshest roasts just arrived. As one of our most passionate coffee buyers, enjoy 15% off today only!',
    ],
    urgent: [
      'FRESH ROAST ALERT: Limited batch just arrived — selling fast! Grab your 10% coffee lover discount before it is gone ⚡☕',
      'URGENT: New single-origin drops in 2 hours. Coffee lovers get first access + 15% off. Stock is extremely limited — order now! ⏰',
      'Last chance on this week\'s roast! 20% off for coffee enthusiasts — offer expires at midnight. Brew something amazing! 🔥',
      'Only 50 bags left of our best-selling blend! Your coffee lover discount: 15% off + free grind service. Claim it NOW! 🚨',
    ],
    exclusive: [
      'As a dedicated coffee lover, you have been invited to our private roaster preview. First access to new blends + 20% exclusive member pricing ☕👑',
      'Our coffee connoisseur club is exclusive — and you are in! Enjoy private access to limited micro-lots with 15% off before public release.',
      'Your taste for great coffee has earned you exclusive access to our reserve collection. Single-origin, small-batch, and 20% off for members only 💎',
      'Coffee lover status: VIP. Your exclusive perk: advance ordering on all new roasts with 25% off + tasting notes from our master roaster ☕',
    ],
    grateful: [
      'Thank you for being a true coffee devotee! Your passion for great brews keeps us sourcing the best beans. Here is 15% off as our appreciation ☕🙏',
      'We are grateful for every order you place. Coffee lovers like you make our work meaningful — enjoy 20% off our freshest roasts this week ❤️',
      'Your love of coffee inspires us to keep improving. Thank you sincerely — here is a grateful 15% off and a free sample of our newest blend!',
      'From our roasters to your cup — thank you. Your loyalty keeps the coffee flowing. Here is 20% off as a heartfelt thank-you gift 🫘',
    ],
  },
};

// Fallback cycling index when backend is unreachable
const fallbackIndex: Record<string, number> = {};

function getFallbackMessage(segmentId: string, tone: ToneOption): string {
  const pool = MESSAGE_BANK[segmentId]?.[tone];
  if (!pool?.length) return 'Hi! We have an exclusive offer just for you. Check it out now!';
  const key = `${segmentId}:${tone}`;
  if (fallbackIndex[key] === undefined) fallbackIndex[key] = 0;
  else fallbackIndex[key] = (fallbackIndex[key] + 1) % pool.length;
  return pool[fallbackIndex[key]];
}

// ---------------------------------------------------------------------------
// Segment colours & rationale
// ---------------------------------------------------------------------------

const SEGMENT_COLORS: Record<string, string> = {
  high_value:      'border-purple-200 bg-purple-50',
  at_risk:         'border-red-200 bg-red-50',
  one_time_buyers: 'border-blue-200 bg-blue-50',
  frequent_buyers: 'border-emerald-200 bg-emerald-50',
  coffee_lovers:   'border-amber-200 bg-amber-50',
};

const SEGMENT_RATIONALE: Record<string, string> = {
  high_value:
    'These customers have proven willingness to spend. Retention costs 5x less than acquisition. A loyalty reward now increases lifetime value and signals that premium spend is recognised.',
  at_risk:
    '60+ days of silence is the industry threshold for churn risk. A targeted offer now costs far less than winning them back later — or re-acquiring through paid ads.',
  one_time_buyers:
    'Single-purchase customers converted once, meaning they trust the brand. A second-purchase nudge converts 20-30% of them on average. This is your highest-leverage growth lever.',
  frequent_buyers:
    'Your most loyal customers. Treat them as VIPs. Early access, rewards, and referral incentives have the highest ROI here. They also drive word-of-mouth.',
  coffee_lovers:
    'Category affinity signals re-purchase intent. Coffee buyers in India are a high-intent, habitual purchase cohort — cross-sell while the interest is warm.',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LaunchState = 'idle' | 'launching' | 'launched' | 'duplicate' | 'error';

interface CardState {
  message: string;
  history: string[];
  tone: ToneOption;
  generating: boolean;
  launchState: LaunchState;
  errorMsg: string;
  rationaleOpen: boolean;
}

function initCard(segmentId: string): CardState {
  return {
    message: MESSAGE_BANK[segmentId]?.friendly?.[0]
      ?? 'Hi! We have an exclusive offer just for customers in this segment.',
    history: [],
    tone: 'friendly',
    generating: false,
    launchState: 'idle',
    errorMsg: '',
    rationaleOpen: false,
  };
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? '/api';

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [customers, setCustomers] = useState<SegmentCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const launchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const patchCard = useCallback(
    (id: string, patch: Partial<CardState>) =>
      setCards(prev => ({ ...prev, [id]: { ...prev[id], ...patch } })),
    [],
  );

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getSegments();
        const safe = Array.isArray(data) ? data : [];
        setSegments(safe);
        const initial: Record<string, CardState> = {};
        for (const seg of safe) initial[seg.id] = initCard(seg.id);
        setCards(initial);
      } catch {
        setPageError('Failed to load segments. Ensure the backend is running on port 8000.');
      } finally {
        setLoading(false);
      }
    })();
    return () => Object.values(launchTimers.current).forEach(clearTimeout);
  }, []);

  // ---------------------------------------------------------------------------
  // Regenerate — calls Gemini via backend, falls back to local bank if down
  // ---------------------------------------------------------------------------

  const handleRegenerate = useCallback((segmentId: string) => {
    setCards(prev => {
      const card = prev[segmentId];
      if (!card || card.generating) return prev;

      // Start spinner immediately — optimistic UI
      const withSpinner = {
        ...prev,
        [segmentId]: { ...card, generating: true },
      };

      // Fire the async Gemini call outside of setState
      const tone = card.tone;
      const oldMessage = card.message;

      fetch(`${API_BASE}/segments/${encodeURIComponent(segmentId)}/generate-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment_description: segmentId, channel: 'whatsapp', tone }),
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data: { message?: string }) => {
          const newMsg = data.message?.trim() ?? '';
          if (!newMsg) throw new Error('empty');
          setCards(c => {
            const cur = c[segmentId];
            return {
              ...c,
              [segmentId]: {
                ...cur,
                generating: false,
                message: newMsg,
                history: [...(cur?.history ?? []), oldMessage],
              },
            };
          });
        })
        .catch(() => {
          // Backend down or Gemini error → fall back to next variant in local bank
          const fallback = getFallbackMessage(segmentId, tone);
          setCards(c => {
            const cur = c[segmentId];
            return {
              ...c,
              [segmentId]: {
                ...cur,
                generating: false,
                message: fallback,
                history: [...(cur?.history ?? []), oldMessage],
              },
            };
          });
        });

      return withSpinner;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Tone change — switch to first message of that tone pool, then regenerate
  // ---------------------------------------------------------------------------

  const handleToneChange = useCallback((segmentId: string, tone: ToneOption) => {
    setCards(prev => {
      const card = prev[segmentId];
      if (!card || card.generating || card.tone === tone) return prev;
      // Reset fallback index for the new tone
      fallbackIndex[`${segmentId}:${tone}`] = 0;
      const preview = MESSAGE_BANK[segmentId]?.[tone]?.[0]
        ?? `Hi! We have an exclusive offer for our ${segmentId.replace(/_/g, ' ')} customers.`;
      return {
        ...prev,
        [segmentId]: {
          ...card,
          tone,
          message: preview,
          history: [...card.history, card.message],
        },
      };
    });
    // After the state settles, fire a Gemini regenerate for the new tone
    setTimeout(() => handleRegenerate(segmentId), 50);
  }, [handleRegenerate]);

  // ---------------------------------------------------------------------------
  // Previous
  // ---------------------------------------------------------------------------

  const handlePrevious = useCallback((segmentId: string) => {
    setCards(prev => {
      const card = prev[segmentId];
      if (!card || card.history.length === 0) return prev;
      const history = [...card.history];
      const restored = history.pop()!;
      return { ...prev, [segmentId]: { ...card, history, message: restored } };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Launch
  // ---------------------------------------------------------------------------

  const handleLaunch = useCallback(async (segmentId: string) => {
    setCards(prev => {
      const card = prev[segmentId];
      if (!card || card.launchState === 'launching' || card.launchState === 'launched') return prev;
      return { ...prev, [segmentId]: { ...card, launchState: 'launching', errorMsg: '' } };
    });

    // Read card state at call time
    setCards(prev => {
      const card = prev[segmentId];
      if (!card) return prev;

      const seg = segments.find(s => s.id === segmentId);
      if (!seg) return prev;

      api.launchSegmentCampaign(seg.name, segmentId, card.message)
        .then(() => {
          setCards(c => ({ ...c, [segmentId]: { ...c[segmentId], launchState: 'launched' } }));
        })
        .catch((err: unknown) => {
          const is409 = err instanceof Error && err.message.includes('409');
          const errorMsg = is409
            ? 'A campaign for this segment was already launched in the last 24 hours.'
            : 'Launch failed. Check the backend is running and try again.';
          setCards(c => ({
            ...c,
            [segmentId]: { ...c[segmentId], launchState: is409 ? 'duplicate' : 'error', errorMsg },
          }));
          launchTimers.current[segmentId] = setTimeout(
            () => setCards(c => ({ ...c, [segmentId]: { ...c[segmentId], launchState: 'idle', errorMsg: '' } })),
            6000,
          );
        });

      return prev;
    });
  }, [segments]);

  // ---------------------------------------------------------------------------
  // View customers
  // ---------------------------------------------------------------------------

  const handleViewCustomers = async (segment: Segment) => {
    setSelectedSegment(segment);
    setCustomersLoading(true);
    setCustomers([]);
    try {
      const data = await api.getSegmentCustomers(segment.id);
      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
      ) : pageError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {segments.map(segment => {
            const card = cards[segment.id];
            if (!card) return null;
            return (
              <SegmentCard
                key={segment.id}
                segment={segment}
                card={card}
                rationale={SEGMENT_RATIONALE[segment.id]}
                colorClass={SEGMENT_COLORS[segment.id] ?? 'border-gray-200'}
                onRegenerate={() => handleRegenerate(segment.id)}
                onToneChange={tone => handleToneChange(segment.id, tone)}
                onPrevious={() => handlePrevious(segment.id)}
                onLaunch={() => handleLaunch(segment.id)}
                onViewCustomers={() => handleViewCustomers(segment)}
                onToggleRationale={() => patchCard(segment.id, { rationaleOpen: !card.rationaleOpen })}
                onMessageChange={msg => patchCard(segment.id, { message: msg })}
              />
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// SegmentCard
// ---------------------------------------------------------------------------

interface SegmentCardProps {
  segment: Segment;
  card: CardState;
  rationale?: string;
  colorClass: string;
  onRegenerate: () => void;
  onToneChange: (t: ToneOption) => void;
  onPrevious: () => void;
  onLaunch: () => void;
  onViewCustomers: () => void;
  onToggleRationale: () => void;
  onMessageChange: (msg: string) => void;
}

function SegmentCard({
  segment, card, rationale, colorClass,
  onRegenerate, onToneChange, onPrevious,
  onLaunch, onViewCustomers, onToggleRationale, onMessageChange,
}: SegmentCardProps) {
  return (
    <div className={cn('rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md', colorClass)}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-lg bg-white/80 p-2">
          <Users className="h-5 w-5 text-[#7C3AED]" />
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-gray-900">
          {segment.customer_count ?? 0} customers
        </span>
      </div>

      <h3 className="mb-1 text-lg font-semibold text-gray-900">{segment.name}</h3>
      <p className="mb-4 text-sm leading-relaxed text-gray-600">{segment.description}</p>

      {/* Why target accordion */}
      {rationale && (
        <div className="mb-4">
          <button
            onClick={onToggleRationale}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-[#7C3AED] transition-colors hover:bg-purple-50"
          >
            <span>Why target this segment?</span>
            {card.rationaleOpen
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {card.rationaleOpen && (
            <div className="mt-2 rounded-lg bg-white/70 px-3 py-3">
              <p className="text-xs leading-relaxed text-gray-600">{rationale}</p>
            </div>
          )}
        </div>
      )}

      {/* Message block */}
      <div className="mt-4 border-t border-gray-100 pt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Campaign Message</p>

        {/* Textarea with loading overlay */}
        <div className="relative mb-2 min-h-[88px] rounded-lg border border-purple-100 bg-[#F3F0FF] p-4">
          {card.generating ? (
            <div className="flex h-full min-h-[60px] flex-col items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-[#7C3AED]" />
              <p className="text-xs text-purple-400">Generating with Gemini AI…</p>
            </div>
          ) : (
            <textarea
              key={card.message}
              defaultValue={card.message}
              onChange={e => onMessageChange(e.target.value)}
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-gray-800 outline-none"
              rows={3}
              placeholder="Write your campaign message here…"
            />
          )}
        </div>

        {/* Meta row */}
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-green-600">
            <CheckCircle className="h-3 w-3 text-green-500" />
            {card.generating ? 'Generating AI message…' : 'AI-powered message'}
          </div>
          {card.history.length > 0 && !card.generating && (
            <button onClick={onPrevious} className="text-[10px] font-medium text-gray-500 hover:text-[#7C3AED]">
              ← Previous
            </button>
          )}
        </div>

        {/* Tone pills */}
        <div className="mb-5">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Tone:</span>
            {TONE_OPTIONS.map(tone => (
              <button
                key={tone}
                onClick={() => onToneChange(tone)}
                disabled={card.generating}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-medium capitalize transition-colors disabled:opacity-40',
                  card.tone === tone
                    ? 'bg-[#7C3AED] text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-[#7C3AED] hover:text-[#7C3AED]',
                )}
              >
                {tone}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400">
            Select a tone or click Regenerate — Gemini writes a fresh message each time
          </p>
        </div>

        {/* Error / duplicate banner */}
        {(card.launchState === 'error' || card.launchState === 'duplicate') && (
          <div className={cn(
            'mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
            card.launchState === 'duplicate'
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-red-200 bg-red-50 text-red-700',
          )}>
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{card.errorMsg}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onRegenerate}
            disabled={card.generating}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-all hover:border-[#7C3AED] hover:bg-purple-50 hover:text-[#7C3AED] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {card.generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Regenerate Message</>
            )}
          </button>

          <LaunchButton state={card.launchState} onClick={onLaunch} />
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={onViewCustomers}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#7C3AED] hover:underline"
          >
            <ChevronRight className="h-3.5 w-3.5" />
            View {segment.customer_count} customers in segment
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LaunchButton
// ---------------------------------------------------------------------------

function LaunchButton({ state, onClick }: { state: LaunchState; onClick: () => void }) {
  const disabled = state === 'launching' || state === 'launched';
  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all active:scale-95',
          state === 'idle'      && 'bg-[#7C3AED] text-white hover:bg-purple-700',
          state === 'launching' && 'cursor-not-allowed bg-gray-300 text-gray-500',
          state === 'launched'  && 'cursor-default bg-green-100 text-green-700',
          state === 'duplicate' && 'bg-amber-500 text-white hover:bg-amber-600',
          state === 'error'     && 'bg-red-500 text-white hover:bg-red-600',
        )}
      >
        {state === 'idle'      && <><Send className="h-4 w-4" />Launch to Segment</>}
        {state === 'launching' && <><Loader2 className="h-4 w-4 animate-spin" />Launching…</>}
        {state === 'launched'  && <><CheckCircle className="h-4 w-4" />Launched ✓</>}
        {state === 'duplicate' && <>Already Launched — Retry?</>}
        {state === 'error'     && <>Failed — Retry?</>}
      </button>
      {state === 'launched' && (
        <span className="mt-1.5 text-[10px] text-gray-400">Next launch available tomorrow</span>
      )}
    </div>
  );
}
