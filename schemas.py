from pydantic import BaseModel
from typing import List, Optional


class CampaignMetrics(BaseModel):
    sent: int = 0
    delivered: int = 0
    read: int = 0
    clicked: int = 0
    failed: int = 0


class CampaignResponse(BaseModel):
    id: str
    name: str
    segment_name: str
    message: str
    created_at: str
    channel: Optional[str] = None
    metrics: CampaignMetrics


class RecommendationResponse(BaseModel):
    segment_name: str
    target_criteria: str
    suggested_message: str
    ai_reasoning: str
    segment_size: int = 0


class StatsResponse(BaseModel):
    total_customers: int
    total_orders: int
    active_campaigns: int
    total_messages_sent: int


class SegmentResponse(BaseModel):
    id: str
    name: str
    description: str
    customer_count: int


class SegmentCustomerResponse(BaseModel):
    id: int
    name: str
    email: str
    city: str
    total_spend: float
    order_count: int


class AnalyticsCampaignResponse(BaseModel):
    id: str
    name: str
    segment_name: str
    launched_at: str
    sent: int
    delivered: int
    read: int
    clicked: int
    failed: int
    delivery_rate: float
