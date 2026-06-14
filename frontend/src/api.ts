// api.ts — All fetch calls to the CRM backend.
// Single source of truth for API communication, normalisation, and error handling.

import {
  Recommendation,
  RecommendationsResponse,
  Campaign,
  CampaignMetrics,
  DashboardStats,
  Segment,
  SegmentCustomer,
  AnalyticsCampaign,
} from './types';

// Centralised base URL — uses Vite proxy in dev (see vite.config.ts).
// In production, set VITE_API_URL to the deployed CRM backend URL.
// This is critical for deployment: the URL changes when we go live.
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const DEFAULT_METRICS: CampaignMetrics = {
  sent: 0,
  delivered: 0,
  read: 0,
  clicked: 0,
  failed: 0,
};

const DEFAULT_STATS: DashboardStats = {
  total_customers: 0,
  total_orders: 0,
  active_campaigns: 0,
  total_messages_sent: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeMetrics(raw: unknown): CampaignMetrics {
  if (!isRecord(raw)) return { ...DEFAULT_METRICS };
  return {
    sent: Number(raw.sent) || 0,
    delivered: Number(raw.delivered) || 0,
    read: Number(raw.read) || 0,
    clicked: Number(raw.clicked) || 0,
    failed: Number(raw.failed) || 0,
  };
}

function normalizeRecommendation(raw: unknown): Recommendation | null {
  if (!isRecord(raw)) return null;
  // Support both old schema (segment_name) and new schema (name field)
  const segmentName = raw.segment_name || raw.name;
  if (typeof segmentName !== 'string' || !segmentName.trim()) return null;
  return {
    segment_name:     segmentName,
    target_criteria:  typeof raw.target_criteria === 'string' ? raw.target_criteria : (typeof raw.segment_filter === 'string' ? raw.segment_filter : ''),
    suggested_message: typeof raw.suggested_message === 'string' ? raw.suggested_message : (typeof raw.message === 'string' ? raw.message : ''),
    ai_reasoning:     typeof raw.ai_reasoning === 'string' ? raw.ai_reasoning : '',
    segment_size:     Number(raw.segment_size) || Number(raw.estimated_audience) || 0,
    // New enriched fields
    channel:          typeof raw.channel === 'string' ? raw.channel : undefined,
    channel_reason:   typeof raw.channel_reason === 'string' ? raw.channel_reason : undefined,
    priority:         (['High', 'Medium', 'Low'].includes(raw.priority as string) ? raw.priority as 'High' | 'Medium' | 'Low' : undefined),
    expected_open_rate: typeof raw.expected_open_rate === 'string' ? raw.expected_open_rate : undefined,
    estimated_audience: Number(raw.estimated_audience) || undefined,
    data_insight:     typeof raw.data_insight === 'string' ? raw.data_insight : undefined,
    name:             typeof raw.name === 'string' ? raw.name : undefined,
    segment:          typeof raw.segment === 'string' ? raw.segment : undefined,
    segment_filter:   typeof raw.segment_filter === 'string' ? raw.segment_filter : undefined,
    message:          typeof raw.message === 'string' ? raw.message : undefined,
  };
}

function normalizeRecommendations(data: unknown): Recommendation[] {
  if (Array.isArray(data)) {
    return data.map(normalizeRecommendation).filter((item): item is Recommendation => item !== null);
  }
  if (isRecord(data) && Array.isArray(data.recommendations)) {
    return normalizeRecommendations(data.recommendations);
  }
  return [];
}

function normalizeCampaign(raw: unknown): Campaign | null {
  if (!isRecord(raw)) return null;
  const id = raw.id;
  if (id === undefined || id === null) return null;
  return {
    id: String(id),
    name: typeof raw.name === 'string' ? raw.name : 'Untitled Campaign',
    segment_name:
      typeof raw.segment_name === 'string'
        ? raw.segment_name
        : typeof raw.target_segment === 'string'
          ? raw.target_segment
          : '',
    message: typeof raw.message === 'string' ? raw.message : '',
    created_at: typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString(),
    channel: typeof raw.channel === 'string' ? raw.channel : undefined,
    metrics: normalizeMetrics(raw.metrics),
  };
}

function normalizeCampaigns(data: unknown): Campaign[] {
  if (Array.isArray(data)) {
    return data.map(normalizeCampaign).filter((item): item is Campaign => item !== null);
  }
  if (isRecord(data) && Array.isArray(data.campaigns)) {
    return normalizeCampaigns(data.campaigns);
  }
  return [];
}

function normalizeStats(data: unknown): DashboardStats {
  if (!isRecord(data)) return { ...DEFAULT_STATS };
  return {
    total_customers: Number(data.total_customers) || 0,
    total_orders: Number(data.total_orders) || 0,
    active_campaigns: Number(data.active_campaigns) || 0,
    total_messages_sent: Number(data.total_messages_sent) || 0,
  };
}

function normalizeSegment(raw: unknown): Segment | null {
  if (!isRecord(raw)) return null;
  const id = raw.id;
  if (typeof id !== 'string') return null;
  return {
    id,
    name: typeof raw.name === 'string' ? raw.name : id,
    description: typeof raw.description === 'string' ? raw.description : '',
    customer_count: Number(raw.customer_count) || 0,
  };
}

function normalizeSegments(data: unknown): Segment[] {
  if (Array.isArray(data)) {
    return data.map(normalizeSegment).filter((item): item is Segment => item !== null);
  }
  if (isRecord(data) && Array.isArray(data.segments)) {
    return normalizeSegments(data.segments);
  }
  return [];
}

function normalizeSegmentCustomer(raw: unknown): SegmentCustomer | null {
  if (!isRecord(raw)) return null;
  const id = raw.id;
  if (id === undefined || id === null) return null;
  return {
    id: Number(id),
    name: typeof raw.name === 'string' ? raw.name : 'Unknown',
    email: typeof raw.email === 'string' ? raw.email : '',
    city: typeof raw.city === 'string' ? raw.city : 'Unknown',
    total_spend: Number(raw.total_spend) || 0,
    order_count: Number(raw.order_count) || 0,
  };
}

function normalizeSegmentCustomers(data: unknown): SegmentCustomer[] {
  if (Array.isArray(data)) {
    return data.map(normalizeSegmentCustomer).filter((item): item is SegmentCustomer => item !== null);
  }
  if (isRecord(data) && Array.isArray(data.customers)) {
    return normalizeSegmentCustomers(data.customers);
  }
  return [];
}

function normalizeAnalyticsCampaign(raw: unknown): AnalyticsCampaign | null {
  if (!isRecord(raw)) return null;
  const id = raw.id;
  if (id === undefined || id === null) return null;
  return {
    id: String(id),
    name: typeof raw.name === 'string' ? raw.name : 'Untitled',
    segment_name: typeof raw.segment_name === 'string' ? raw.segment_name : '',
    launched_at: typeof raw.launched_at === 'string' ? raw.launched_at : '',
    sent: Number(raw.sent) || 0,
    delivered: Number(raw.delivered) || 0,
    read: Number(raw.read) || 0,
    clicked: Number(raw.clicked) || 0,
    failed: Number(raw.failed) || 0,
    delivery_rate: Number(raw.delivery_rate) || 0,
  };
}

function normalizeAnalytics(data: unknown): AnalyticsCampaign[] {
  if (Array.isArray(data)) {
    return data.map(normalizeAnalyticsCampaign).filter((item): item is AnalyticsCampaign => item !== null);
  }
  if (isRecord(data) && Array.isArray(data.campaigns)) {
    return normalizeAnalytics(data.campaigns);
  }
  return [];
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export const api = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    const data = await parseJsonSafely(response);
    return normalizeStats(data);
  },

  getRecommendations: async (): Promise<RecommendationsResponse> => {
    const response = await fetch(`${API_BASE}/recommendations`);
    if (!response.ok) throw new Error('Failed to fetch recommendations');
    const data = await parseJsonSafely(response);
    // Extract top-level data_insight and recommendations array
    const recommendations = normalizeRecommendations(data);
    const dataInsight = isRecord(data) && typeof data.data_insight === 'string'
      ? data.data_insight
      : (recommendations[0]?.data_insight ?? '');
    return { recommendations, data_insight: dataInsight };
  },

  launchCampaign: async (recommendation: Recommendation, channel?: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/campaigns/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segment_name:      recommendation.segment_name,
        target_criteria:   recommendation.target_criteria,
        suggested_message: recommendation.suggested_message,
        ai_reasoning:      recommendation.ai_reasoning,
        // Pass the AI-recommended channel so delivery goes to the right provider
        ...(channel || recommendation.channel ? { channel: channel || recommendation.channel } : {}),
      }),
    });
    if (!response.ok) throw new Error('Failed to launch campaign');
  },

  launchSegmentCampaign: async (
    segmentName: string,
    targetCriteria: string,
    message: string,
    channel?: string
  ): Promise<void> => {
    const response = await fetch(`${API_BASE}/campaigns/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segment_name:      segmentName,
        target_criteria:   targetCriteria,
        suggested_message: message,
        ai_reasoning:      `Manual campaign launched for segment: ${segmentName}`,
        ...(channel ? { channel } : {}),
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to launch segment campaign`);
    }
  },

  getCampaigns: async (): Promise<Campaign[]> => {
    const response = await fetch(`${API_BASE}/campaigns`);
    if (!response.ok) throw new Error('Failed to fetch campaigns');
    const data = await parseJsonSafely(response);
    return normalizeCampaigns(data);
  },

  getSegments: async (): Promise<Segment[]> => {
    const response = await fetch(`${API_BASE}/segments`);
    if (!response.ok) throw new Error('Failed to fetch segments');
    const data = await parseJsonSafely(response);
    return normalizeSegments(data);
  },

  getSegmentCustomers: async (segmentId: string): Promise<SegmentCustomer[]> => {
    const response = await fetch(`${API_BASE}/segments/${segmentId}/customers`);
    if (!response.ok) throw new Error('Failed to fetch segment customers');
    const data = await parseJsonSafely(response);
    return normalizeSegmentCustomers(data);
  },

  getAnalyticsCampaigns: async (): Promise<AnalyticsCampaign[]> => {
    const response = await fetch(`${API_BASE}/analytics/campaigns`);
    if (!response.ok) throw new Error('Failed to fetch analytics');
    const data = await parseJsonSafely(response);
    return normalizeAnalytics(data);
  },
};
