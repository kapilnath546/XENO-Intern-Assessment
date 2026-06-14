// Dashboard.tsx — Main view showing AI recommendations and live campaign status.
// This is the marketer's daily starting point: see the AI's suggestions,
// approve a campaign, and watch delivery metrics update in real time.

import { useState, useEffect, useCallback } from 'react';
import { StatsRow } from '../components/StatsRow';
import { RecommendationsPanel } from '../components/RecommendationsPanel';
import { CampaignsList } from '../components/CampaignsList';
import { api } from '../api';
import { Recommendation, Campaign, DashboardStats } from '../types';
import { RefreshCw } from 'lucide-react';

const DEFAULT_STATS: DashboardStats = {
  total_customers: 0,
  total_orders: 0,
  active_campaigns: 0,
  total_messages_sent: 0,
};

export function DashboardPage() {
  const [stats, setStats]                   = useState<DashboardStats>(DEFAULT_STATS);
  const [campaigns, setCampaigns]           = useState<Campaign[]>([]);
  const [statsLoading, setStatsLoading]     = useState(true);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [loadError, setLoadError]           = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getStats();
      setStats(data ?? DEFAULT_STATS);
    } catch (error) {
      console.error('[Dashboard] Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadCampaigns = useCallback(async (isInitial = false) => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
      setLoadError(null);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[Dashboard] Failed to load campaigns:', error);
      setLoadError('Unable to reach the backend. Retrying every 3 seconds…');
      if (isInitial) setCampaigns([]);
    } finally {
      if (isInitial) setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadCampaigns(true);

    // 3-second polling interval — deliberate choice over WebSockets for this demo.
    // WebSockets need a stateful connection layer (Redis pub/sub); polling is correct
    // for a demo with <100 concurrent users and zero extra infrastructure.
    const interval = setInterval(() => {
      loadStats();
      loadCampaigns(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [loadStats, loadCampaigns]);

  const handleLaunchCampaign = async (recommendation: Recommendation) => {
    await api.launchCampaign(recommendation);
    await Promise.all([loadStats(), loadCampaigns(false)]);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500">Overview of your CRM performance</p>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <RefreshCw className="h-3.5 w-3.5" />
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      <StatsRow stats={stats} loading={statsLoading} />

      <div className="grid gap-8 xl:grid-cols-2">
        <section>
          <RecommendationsPanel 
            onLaunch={handleLaunchCampaign} 
            launchedSegmentNames={campaigns.map(c => c.name)} 
          />
        </section>

        <section>
          {loadError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {loadError}
            </div>
          )}
          {campaignsLoading ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-gray-200 bg-white">
              <RefreshCw className="h-8 w-8 animate-spin text-[#7C3AED]" />
            </div>
          ) : (
            <CampaignsList campaigns={campaigns} />
          )}
        </section>
      </div>
    </div>
  );
}
