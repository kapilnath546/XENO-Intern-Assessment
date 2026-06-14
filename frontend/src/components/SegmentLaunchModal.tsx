// SegmentLaunchModal.tsx — Campaign launch form for manual segment targeting.
// Gives the marketer channel selection and message editing before sending,
// so they retain control over tone and timing even in a manual workflow.

import { useState } from 'react';
import { X, Rocket, Loader2 } from 'lucide-react';
import { api } from '../api';
import { Segment } from '../types';
import { cn } from '../utils';

interface SegmentLaunchModalProps {
  segment: Segment;
  onClose: () => void;
  onLaunched: () => void;
}

const CHANNELS = ['WhatsApp', 'SMS', 'Email', 'RCS'] as const;
type Channel = (typeof CHANNELS)[number];

const CHANNEL_STYLES: Record<Channel, string> = {
  WhatsApp: 'border-green-400 bg-green-50 text-green-700',
  SMS: 'border-blue-400 bg-blue-50 text-blue-700',
  Email: 'border-purple-400 bg-purple-50 text-purple-700',
  RCS: 'border-orange-400 bg-orange-50 text-orange-700',
};

function suggestMessage(segment: Segment): string {
  return `Hi! We have an exclusive offer just for you — our ${segment.name} customers. Shop now and enjoy special rewards tailored to your preferences. Don't miss out! 🎁`;
}

export function SegmentLaunchModal({ segment, onClose, onLaunched }: SegmentLaunchModalProps) {
  const [message, setMessage] = useState(suggestMessage(segment));
  const [channel, setChannel] = useState<Channel>('WhatsApp');
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLaunch = async () => {
    if (!message.trim()) return;
    setLaunching(true);
    setError(null);
    try {
      await api.launchSegmentCampaign(segment.name, segment.description, message.trim(), channel);
      setSuccess(true);
      setTimeout(() => {
        onLaunched();
        onClose();
      }, 1200);
    } catch (err) {
      setError('Failed to launch campaign. Make sure the backend is running.');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Launch Campaign</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Segment: <span className="font-medium text-[#7C3AED]">{segment.name}</span>
              &nbsp;·&nbsp;{segment.customer_count} customers
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Channel selector */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Channel
            </p>
            <div className="flex gap-2">
              {CHANNELS.map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={cn(
                    'flex-1 rounded-lg border-2 py-1.5 text-xs font-semibold transition-all',
                    channel === ch
                      ? CHANNEL_STYLES[ch]
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  )}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* Message textarea */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Message
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-xl border border-gray-200 bg-[#F9FAFB] px-4 py-3 text-sm leading-relaxed text-gray-800 outline-none transition focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100"
              placeholder="Type your campaign message…"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{message.length} chars</p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
              Campaign launched successfully! 🚀
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={launching || !message.trim() || success}
            className={cn(
              'flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors',
              launching || success
                ? 'cursor-not-allowed bg-gray-400'
                : 'bg-[#7C3AED] hover:bg-purple-700'
            )}
          >
            {launching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Launching…
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Launch
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
