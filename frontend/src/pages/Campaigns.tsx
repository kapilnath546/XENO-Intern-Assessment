// Campaigns.tsx — Dedicated full-page view of all active campaigns with live delivery metrics.
// Mirrors the campaign panel on the Dashboard but gives more vertical space for
// monitoring multiple concurrent campaigns.

import { useState, useEffect, useCallback } from 'react';
import { CampaignsList } from '../components/CampaignsList';
import { api } from '../api';
import { Campaign } from '../types';
import { RefreshCw } from 'lucide-react';

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadCampaigns = useCallback(async (isInitial = false) => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[Campaigns] Failed to load campaigns:', err);
      setError('Unable to reach the backend. Retrying every 3 seconds…');
      if (isInitial) setCampaigns([]);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns(true);
    const interval = setInterval(() => loadCampaigns(false), 3000);
    return () => clearInterval(interval);
  }, [loadCampaigns]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Campaigns</h2>
          <p className="text-sm text-gray-500">Monitor all active marketing campaigns in real time</p>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <RefreshCw className="h-3.5 w-3.5" />
            Live · {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-gray-200 bg-white">
          <RefreshCw className="h-8 w-8 animate-spin text-[#7C3AED]" />
        </div>
      ) : (
        <CampaignsList campaigns={campaigns} showHeader={false} />
      )}
    </div>
  );
}
