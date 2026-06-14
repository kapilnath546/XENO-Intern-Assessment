// types.ts — TypeScript interfaces for all API response shapes.
// Kept flat and explicit so TypeScript can catch mismatches at compile time.

export interface Recommendation {
  segment_name: string;
  target_criteria: string;
  suggested_message: string;
  ai_reasoning: string;
  segment_size?: number;
  // New AI-enriched fields from the upgraded agent
  channel?: string;
  channel_reason?: string;
  priority?: 'High' | 'Medium' | 'Low';
  expected_open_rate?: string;
  estimated_audience?: number;
  data_insight?: string;
  name?: string;
  segment?: string;
  segment_filter?: string;
  message?: string;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  data_insight: string;
}

export interface CampaignMetrics {
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  failed: number;
}

export interface Campaign {
  id: string;
  name: string;
  segment_name: string;
  message: string;
  created_at: string;
  channel?: string;
  metrics: CampaignMetrics;
}

export interface DashboardStats {
  total_customers: number;
  total_orders: number;
  active_campaigns: number;
  total_messages_sent: number;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  customer_count: number;
}

export interface SegmentCustomer {
  id: number;
  name: string;
  email: string;
  city: string;
  total_spend: number;
  order_count: number;
}

export interface AnalyticsCampaign {
  id: string;
  name: string;
  segment_name: string;
  launched_at: string;
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  failed: number;
  delivery_rate: number;
}

export type NavPage = 'dashboard' | 'segments' | 'campaigns' | 'analytics';
