"""
main_crm.py — CRM Core API Service (Port 8000)
"""

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
import random as _random
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text, func
from database import engine, Base, get_db
import models
import ai_agent
import segments
import httpx
import google.generativeai as genai
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import logging
import os
from dotenv import load_dotenv
from functools import lru_cache
import message_bank

load_dotenv()

# Configure Gemini at module level
# Strip quotes if present (in case they're included in .env)
api_key = (os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or "").strip('"').strip("'")
if not api_key:
    raise ValueError("GEMINI_API_KEY or OPENAI_API_KEY not found in .env")
genai.configure(api_key=api_key)

# Simple cache for generated messages to respect free tier limits
# Key: (segment_name, channel, tone) -> Value: message
message_cache = {}
CACHE_MAX_SIZE = 100

from schemas import (
    CampaignResponse,
    CampaignMetrics,
    StatsResponse,
    SegmentResponse,
    SegmentCustomerResponse,
    AnalyticsCampaignResponse,
)

# =============================================================
# SCOPE: This file is the CRM's core API layer.
#
# What it handles: campaign creation, segment queries, webhook
# ingestion, stats aggregation, and AI recommendation serving.
#
# What it intentionally does NOT handle:
#   - Customer CRUD: brands import from source systems, not UI forms.
#     A manual add/edit form would be wrong for D2C — they sync
#     from Shopify or WooCommerce via API.
#   - Auth middleware: out of scope for this assignment.
#     Production would use JWT + RBAC (python-jose + FastAPI Security).
#   - Rate limiting: would add in production via slowapi or a gateway.
#   - Pagination: dataset is demo-sized; production would use cursor
#     pagination for 100k+ customer records.
# =============================================================

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [CRM] %(message)s")

app = FastAPI(title="CRM Core Service")

# CORS is open (*) for the demo. Production would restrict this to
# the specific frontend domain to prevent cross-origin data leakage.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic request/response models
# ---------------------------------------------------------------------------

class RecommendationRequest(BaseModel):
    """Payload sent when the marketer approves an AI recommendation."""
    segment_name: str
    target_criteria: str
    suggested_message: str
    ai_reasoning: str
    # Channel is optional — if not provided, the system picks one.
    # This allows the AI to recommend a channel and the UI to pass it through.
    channel: Optional[str] = None


class WebhookPayload(BaseModel):
    """Callback payload from the channel simulator after delivery."""
    communication_id: int
    status: str


class MessageGenerateRequest(BaseModel):
    segment_description: str
    channel: str = "WhatsApp"
    tone: str = "friendly"


# ---------------------------------------------------------------------------
# Schema migrations (SQLite ALTER TABLE approach)
# ---------------------------------------------------------------------------

def _ensure_schema_migrations():
    """Add new columns to existing SQLite databases without a full reset.

    SQLite doesn't support multi-column ALTER TABLE, so we inspect
    existing columns and add missing ones individually. This is the
    pragmatic SQLite migration approach — production would use Alembic.
    """
    inspector = inspect(engine)

    if "campaigns" in inspector.get_table_names():
        existing = {col["name"] for col in inspector.get_columns("campaigns")}
        with engine.begin() as conn:
            if "message" not in existing:
                conn.execute(text("ALTER TABLE campaigns ADD COLUMN message VARCHAR DEFAULT ''"))
            if "created_at" not in existing:
                conn.execute(text("ALTER TABLE campaigns ADD COLUMN created_at DATETIME"))

    if "customers" in inspector.get_table_names():
        existing = {col["name"] for col in inspector.get_columns("customers")}
        with engine.begin() as conn:
            if "city" not in existing:
                conn.execute(text("ALTER TABLE customers ADD COLUMN city VARCHAR DEFAULT ''"))


# ---------------------------------------------------------------------------
# Helper functions — kept private (underscore prefix) to signal they are
# internal serializers, not API endpoints
# ---------------------------------------------------------------------------

def _build_campaign_metrics(communications: list) -> CampaignMetrics:
    """Aggregate raw communication records into a metrics summary.

    We compute these counts in Python rather than with SQL GROUP BY
    because the communications are already loaded via SQLAlchemy's
    eager/lazy loading on the campaign relationship. A dedicated
    analytics query would use SQL aggregates for better performance.
    """
    return CampaignMetrics(
        sent=len(communications),
        delivered=sum(1 for c in communications if c.status == models.CommunicationStatus.delivered),
        read=sum(1 for c in communications if c.status == models.CommunicationStatus.read),
        clicked=sum(1 for c in communications if c.status == models.CommunicationStatus.clicked),
        failed=sum(1 for c in communications if c.status == models.CommunicationStatus.failed),
    )


def _delivery_rate(metrics: CampaignMetrics) -> float:
    """Calculate delivery rate as a percentage, safe against zero division."""
    if metrics.sent == 0:
        return 0.0
    return round((metrics.delivered / metrics.sent) * 100, 1)


def _serialize_campaign(campaign: models.Campaign) -> CampaignResponse:
    """Convert a Campaign ORM object to the API response schema.

    We derive the channel from the first communication record rather than
    storing it on the campaign — this keeps the data normalised and allows
    future mixed-channel campaigns (different channels per recipient).
    """
    metrics = _build_campaign_metrics(campaign.communications or [])
    created_at = campaign.created_at or datetime.utcnow()

    # Derive channel from the first communication record.
    # All communications in this implementation share the same channel,
    # so reading the first one is accurate.
    channel: Optional[str] = None
    if campaign.communications:
        ch = campaign.communications[0].channel
        channel = ch.value if ch else None

    return CampaignResponse(
        id=str(campaign.id),
        name=campaign.name or "Untitled Campaign",
        segment_name=campaign.target_segment or campaign.name or "",
        message=campaign.message or "",
        created_at=created_at.isoformat(),
        channel=channel,
        metrics=metrics,
    )


def _serialize_analytics_campaign(campaign: models.Campaign) -> AnalyticsCampaignResponse:
    """Convert a Campaign to the analytics table row format."""
    metrics = _build_campaign_metrics(campaign.communications or [])
    created_at = campaign.created_at or datetime.utcnow()
    return AnalyticsCampaignResponse(
        id=str(campaign.id),
        name=campaign.name or "Untitled Campaign",
        segment_name=campaign.target_segment or campaign.name or "",
        launched_at=created_at.isoformat(),
        sent=metrics.sent,
        delivered=metrics.delivered,
        read=metrics.read,
        clicked=metrics.clicked,
        failed=metrics.failed,
        delivery_rate=_delivery_rate(metrics),
    )


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

@app.on_event("startup")
def startup_event():
    """Create DB tables and run schema migrations on server startup."""
    Base.metadata.create_all(bind=engine)
    _ensure_schema_migrations()


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"message": "CRM Core Service is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    """Return high-level CRM stats for the dashboard header cards.

    We query aggregates at the DB level rather than loading all records
    into Python — this matters at scale where a brand might have 500k
    customers. SQLAlchemy's .count() pushes the work to SQLite's engine.

    3-second polling on the frontend is a deliberate tradeoff. WebSockets
    would be more real-time but require a stateful connection layer
    (e.g. Redis pub/sub). For a demo with fewer than 100 concurrent users,
    polling is the correct and simpler choice.
    """
    try:
        total_customers      = db.query(models.Customer).count()
        total_orders         = db.query(models.Order).count()
        active_campaigns     = (
            db.query(models.Campaign)
            .filter(models.Campaign.status == "active")
            .count()
        )
        total_messages_sent  = db.query(models.Communication).count()

        return StatsResponse(
            total_customers=total_customers,
            total_orders=total_orders,
            active_campaigns=active_campaigns,
            total_messages_sent=total_messages_sent,
        )
    except Exception as exc:
        logger.exception("Failed to fetch stats")
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {exc}")


@app.get("/api/recommendations")
def get_recommendations(db: Session = Depends(get_db)):
    """Serve AI-generated campaign recommendations.

    The AI agent queries the DB independently for stats, then calls
    OpenAI. This endpoint just orchestrates and enriches the result
    with actual segment sizes so the UI can show "👥 6 customers".
    """
    try:
        recommendations = ai_agent.generate_campaign_recommendations()
        enriched = []
        for rec in recommendations:
            rec_copy = dict(rec)
            # Estimate audience size by matching the recommendation's criteria
            # against live segment data — ensures the count is always fresh.
            rec_copy["segment_size"] = segments.estimate_recommendation_audience(db, rec_copy)
            enriched.append(rec_copy)

        # Return both the recommendations and the top-level data_insight
        data_insight = enriched[0].get("data_insight", "") if enriched else ""
        return {"recommendations": enriched, "data_insight": data_insight}

    except Exception as exc:
        logger.exception("Failed to generate recommendations")
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {exc}")


@app.get("/api/segments", response_model=List[SegmentResponse])
def get_segments(db: Session = Depends(get_db)):
    """Return all segment definitions with live customer counts."""
    try:
        return segments.get_all_segments(db)
    except Exception as exc:
        logger.exception("Failed to fetch segments")
        raise HTTPException(status_code=500, detail=f"Failed to fetch segments: {exc}")


@app.get("/api/segments/{segment_id}/customers", response_model=List[SegmentCustomerResponse])
def get_segment_customers(segment_id: str, db: Session = Depends(get_db)):
    """Return the list of customers currently in a given segment."""
    try:
        customers = segments.get_segment_customers(db, segment_id)
        if customers is None:
            raise HTTPException(status_code=404, detail=f"Segment '{segment_id}' not found")
        return customers
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch segment customers")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch customers for segment '{segment_id}': {exc}",
        )


@app.get("/api/campaigns", response_model=List[CampaignResponse])
def get_campaigns(db: Session = Depends(get_db)):
    """Return active campaigns with live communication metrics.

    Ordered by newest first so the most recently launched campaign
    appears at the top of the dashboard. The frontend polls this every
    3s to show real-time delivery progress.
    """
    try:
        campaigns = (
            db.query(models.Campaign)
            .filter(models.Campaign.status == "active")
            .order_by(models.Campaign.id.desc())
            .all()
        )
        return [_serialize_campaign(campaign) for campaign in campaigns]
    except Exception as exc:
        logger.exception("Failed to fetch campaigns")
        raise HTTPException(status_code=500, detail=f"Failed to fetch campaigns: {exc}")


@app.get("/api/analytics/campaigns", response_model=List[AnalyticsCampaignResponse])
def get_analytics_campaigns(db: Session = Depends(get_db)):
    """Return all campaigns (including historical) for the Analytics view."""
    try:
        campaigns = db.query(models.Campaign).order_by(models.Campaign.id.desc()).all()
        return [_serialize_analytics_campaign(campaign) for campaign in campaigns]
    except Exception as exc:
        logger.exception("Failed to fetch analytics")
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics: {exc}")


def get_customers_for_segment(segment_filter: str, db: Session):
    """
    Returns customers matching a segment filter.
    
    We evaluate the filter here rather than in Python to keep
    the query efficient. At 100k customers, Python-side filtering
    would load the entire table into memory — unacceptable.
    
    Production version: a proper query builder or rule engine
    (e.g. SpEL, JSON Logic) for arbitrary segment conditions.
    For demo: we pattern-match on known filter strings.
    """
    if "total_spend > 20000" in segment_filter or "High Value" in segment_filter:
        return db.query(models.Customer).join(models.Order).group_by(models.Customer.id)\
            .having(func.sum(models.Order.amount) > 20000).all()
    
    elif "60+ days" in segment_filter or "at_risk" in segment_filter or "no purchase" in segment_filter:
        cutoff = datetime.utcnow() - timedelta(days=60)
        return db.query(models.Customer).join(models.Order).group_by(models.Customer.id)\
            .having(func.max(models.Order.created_at) < cutoff).all()
    
    elif "one_time" in segment_filter or "order_count = 1" in segment_filter:
        return db.query(models.Customer).join(models.Order).group_by(models.Customer.id)\
            .having(func.count(models.Order.id) == 1).all()
    
    elif "frequent" in segment_filter or "order_count >= 4" in segment_filter:
        return db.query(models.Customer).join(models.Order).group_by(models.Customer.id)\
            .having(func.count(models.Order.id) >= 4).all()
    
    elif "Coffee" in segment_filter or "coffee" in segment_filter:
        return db.query(models.Customer).join(models.Order)\
            .filter(models.Order.category == "Coffee")\
            .group_by(models.Customer.id).all()
    
    else:
        # Fallback: all customers
        # Log this so we know a new filter type needs to be added
        print(f"[CRM] Unknown segment filter: '{segment_filter}' "
              f"— falling back to all customers. Add this pattern.")
        return db.query(models.Customer).all()


@app.post("/api/campaigns/send")
def send_campaign(
    recommendation: RecommendationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a campaign and dispatch communications to matching customers."""
    try:
        # Prevent duplicate launches of the same segment within 24 hours.
        # localStorage handles the UI layer; this handles direct API calls.
        # In production, this would be a distributed lock in Redis.
        yesterday = datetime.utcnow() - timedelta(hours=24)
        existing = db.query(models.Campaign).filter(
            models.Campaign.target_segment == recommendation.target_criteria,
            models.Campaign.created_at >= yesterday
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "duplicate_campaign",
                    "message": f"A campaign for '{recommendation.segment_name}' was already "
                               f"launched in the last 24 hours.",
                    "launched_at": existing.created_at.isoformat(),
                    "tip": "Wait 24 hours or change the segment to launch again."
                }
            )
        # Map the channel name from the AI recommendation to our enum.
        # If the channel is unrecognised, pick one randomly — this ensures
        # the demo always works even if the AI returns an unexpected value.
        _channel_map = {
            "WhatsApp": models.ChannelType.whatsapp,
            "SMS":      models.ChannelType.sms,
            "Email":    models.ChannelType.email,
            "RCS":      models.ChannelType.rcs,
        }
        if recommendation.channel and recommendation.channel in _channel_map:
            chosen_channel = _channel_map[recommendation.channel]
        else:
            chosen_channel = _random.choice(list(models.ChannelType))

        campaign = models.Campaign(
            name=recommendation.segment_name,
            target_segment=recommendation.target_criteria,
            message=recommendation.suggested_message,
            status="active",
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)

        matching_customers = get_customers_for_segment(
            recommendation.target_criteria, db
        )

        # 4. Create communication records (one per customer)
        # ---------------------------------------------------------
        # Read CRM_BASE_URL from env for production; fallback to localhost for dev.
        crm_base = os.getenv("CRM_BASE_URL", "http://localhost:8000")
        
        # Point the simulator URL to our internally hosted simulator endpoint
        simulator_url = os.getenv("SIMULATOR_URL", f"{crm_base}/simulator/send")

        communications = []
        for customer in matching_customers:
            communication = models.Communication(
                campaign_id=campaign.id,
                customer_id=customer.id,
                channel=chosen_channel,
                status=models.CommunicationStatus.sent,
            )
            db.add(communication)
            communications.append(communication)

        db.commit()
        
        for communication in communications:
            db.refresh(communication)
            # Queue the actual HTTP dispatch as a background task so
            # this endpoint returns immediately (no blocking on network I/O).
            background_tasks.add_task(
                send_to_simulator,
                simulator_url,
                communication.id,
                communication.customer_id,
                campaign.id,
                recommendation.suggested_message,
            )

        print(f"[CRM] Campaign '{campaign.name}' launched to "
              f"{len(matching_customers)} customers "
              f"(segment: {recommendation.target_criteria})")

        return {
            "campaign_id": campaign.id,
            "channel": chosen_channel.value,
            "message": f"Campaign created and {len(matching_customers)} communications queued for sending",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to send campaign")
        raise HTTPException(status_code=500, detail=f"Failed to send campaign: {exc}")


async def send_to_simulator(
    simulator_url: str,
    communication_id: int,
    customer_id: int,
    campaign_id: int,
    message: str
):
    """POST a single communication payload to the channel simulator.

    This is intentionally simple — the retry logic lives in the simulator,
    not here. This mirrors the real architecture: the CRM fires and forgets,
    and the channel provider's infrastructure handles reliability.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Read CRM_BASE_URL from env for production; fallback to localhost for dev.
        crm_base = os.getenv("CRM_BASE_URL", "http://localhost:8000")
        payload = {
            "communication_id": communication_id,
            "customer_id":      customer_id,
            "campaign_id":      campaign_id,
            "message":          message,
            "webhook_url":      f"{crm_base}/api/webhook/receipt",
        }
        try:
            response = await client.post(simulator_url, json=payload)
            logger.info("Sent comm %d to simulator: HTTP %d", communication_id, response.status_code)
        except Exception as e:
            logger.error("Error sending comm %d to simulator: %s", communication_id, e)


# ===========================================================================
# BUILT-IN CHANNEL SIMULATOR (Merged for easy hosting)
# ===========================================================================
# In a real architecture, this would be a separate third-party service 
# (e.g. Twilio). We embed it here so the demo can run on a single cloud server.

import asyncio
import random

class SimulatorPayload(BaseModel):
    communication_id: int
    customer_id: int
    campaign_id: int
    message: str
    webhook_url: str

@app.post("/simulator/send")
def simulator_receive_dispatch(payload: SimulatorPayload, background_tasks: BackgroundTasks):
    """Simulator receives the dispatch and queues the delivery simulation."""
    background_tasks.add_task(simulator_process_delivery, payload)
    return {"status": "accepted"}

async def simulator_process_delivery(payload: SimulatorPayload):
    """Simulate latency and varying delivery outcomes, then fire the webhook."""
    # 1. Simulate network transit latency (2 to 5 seconds)
    await asyncio.sleep(random.uniform(2, 5))

    # 2. Simulate real-world delivery funnel metrics
    outcomes = ["delivered", "read", "clicked", "failed"]
    weights  = [0.40, 0.30, 0.20, 0.10]
    status   = random.choices(outcomes, weights=weights, k=1)[0]

    # 3. Fire the webhook back to the CRM
    callback_data = {
        "communication_id": payload.communication_id,
        "status": status,
    }
    
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(payload.webhook_url, json=callback_data)
                if res.status_code == 200:
                    logger.info("[Simulator] Webhook delivered for comm %d (status: %s)", payload.communication_id, status)
                    return
        except Exception as e:
            logger.warning("[Simulator] Webhook attempt %d failed: %s", attempt, e)
            
        if attempt < max_attempts:
            await asyncio.sleep(2)


# ===========================================================================
# WEBHOOK HANDLERS
# ===========================================================================

@app.post("/api/webhook/receipt")
def webhook_receipt(payload: WebhookPayload, db: Session = Depends(get_db)):
    """Receive delivery status callbacks from the channel simulator.

    The simulator calls this endpoint after each message delivery attempt.
    We update the Communication record's status so the dashboard reflects
    the current delivery state in real time (via 3-second polling).

    Idempotent by design: calling this multiple times with the same status
    is safe — it just overwrites with the same value. Real providers may
    fire duplicate webhooks under failure conditions.
    """
    communication = db.query(models.Communication).filter(
        models.Communication.id == payload.communication_id
    ).first()

    if not communication:
        raise HTTPException(status_code=404, detail="Communication not found")

    status_map = {
        "delivered": models.CommunicationStatus.delivered,
        "read":      models.CommunicationStatus.read,
        "clicked":   models.CommunicationStatus.clicked,
        "failed":    models.CommunicationStatus.failed,
    }

    # Unknown statuses fall back to "sent" rather than crashing.
    # This defensive default means the row stays visible in the UI
    # even if the simulator sends an unexpected status string.
    communication.status = status_map.get(payload.status, models.CommunicationStatus.sent)
    db.commit()

    return {"message": "Status updated successfully"}


@app.post("/api/segments/{segment_name}/generate-message")
async def generate_segment_message(
    segment_name: str,
    request: MessageGenerateRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a fresh AI marketing message via Gemini for a given segment and tone.
    Falls back to the professional message bank if Gemini is unavailable.
    """
    tone = request.tone.lower()
    channel = request.channel.lower()

    # Human-readable segment labels for the AI prompt
    segment_labels: dict[str, str] = {
        "high_value":      "High Value customers (lifetime spend > ₹20,000, premium buyers)",
        "at_risk":         "At-Risk customers (no purchase in 60+ days, churn risk)",
        "one_time_buyers": "One-Time Buyers (made exactly one purchase, need a nudge to return)",
        "frequent_buyers": "Frequent Buyers (4+ orders, highly loyal, treat as VIPs)",
        "coffee_lovers":   "Coffee Lovers (strong category affinity, habitual buyers)",
    }

    segment_label = segment_labels.get(
        segment_name.lower(),
        segment_name.replace("_", " ").title() + " customers"
    )

    tone_descriptions: dict[str, str] = {
        "friendly":  "warm, conversational, and approachable",
        "urgent":    "time-sensitive with urgency, FOMO-driven",
        "exclusive": "premium, members-only, elevated",
        "grateful":  "sincere, appreciative, heartfelt",
    }
    tone_desc = tone_descriptions.get(tone, tone)

    channel_ctx: dict[str, str] = {
        "whatsapp": "WhatsApp message (short, personal, uses emojis naturally)",
        "sms":      "SMS text (very concise, under 160 chars)",
        "email":    "marketing email body (slightly longer, professional)",
    }
    channel_hint = channel_ctx.get(channel, channel)

    prompt = (
        f"You are an expert D2C marketing copywriter for an Indian brand.\n"
        f"Write ONE short, punchy campaign message for: {segment_label}.\n"
        f"Tone: {tone_desc}.\n"
        f"Format: {channel_hint}.\n"
        f"Rules:\n"
        f"- 2-3 sentences maximum\n"
        f"- Natural, human, no corporate jargon\n"
        f"- Include one specific benefit or offer (discount, access, reward)\n"
        f"- Use Indian cultural context (₹ for currency, relatable references)\n"
        f"- End with a clear call-to-action\n"
        f"- Do NOT use placeholders like [Name] or [link]\n"
        f"- Return ONLY the message text. No quotes. No explanation."
    )

    generated_message: str = ""

    # Model priority: lite models have separate quotas and lowest latency.
    # Confirmed working on free tier for this key via direct API test.
    models_to_try = [
        "gemini-flash-lite-latest",
        "gemini-flash-latest",
        "gemini-pro-latest",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
    ]

    for model_name in models_to_try:
        try:
            logger.info("[CRM] Calling %s for segment='%s' tone='%s'", model_name, segment_name, tone)
            ai_model = genai.GenerativeModel(model_name)
            response = ai_model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.95,
                    max_output_tokens=200,
                ),
            )
            raw = (response.text or "").strip()
            raw = raw.strip('"').strip("'").strip("`").strip()
            if raw:
                generated_message = raw
                logger.info("[CRM] %s generated message (%d chars)", model_name, len(raw))
                break
        except Exception as exc:
            logger.warning("[CRM] %s failed (%s) — trying next model", model_name, exc)

    # Fall back to message bank if Gemini gave nothing
    if not generated_message:
        segment_map = {
            "high_value":      "high_spenders",
            "at_risk":         "at_risk",
            "one_time_buyers": "new_customers",
            "frequent_buyers": "vip",
            "coffee_lovers":   "coffee_lovers",
        }
        bank_key = segment_map.get(segment_name.lower(), "vip")
        generated_message = message_bank.get_message(bank_key, tone, channel)
        source = "message_bank"
    else:
        source = "gemini"

    return {
        "message": generated_message,
        "segment": segment_name,
        "channel": request.channel,
        "tone": request.tone,
        "generated_at": datetime.utcnow().isoformat(),
        "source": source,
    }


@app.get("/api/messages/all")
async def get_all_messages():
    """
    Get all professional messages organized by segment, tone, and channel.
    Perfect for the frontend to display all available campaign options.
    """
    return {
        "messages": message_bank.list_all_messages(),
        "segments": message_bank.get_segments(),
        "tones": message_bank.get_tones(),
        "channels": message_bank.get_channels()
    }


@app.get("/api/messages/segments")
async def get_available_segments():
    """Get list of all available customer segments."""
    return {"segments": message_bank.get_segments()}


@app.get("/api/messages/tones")
async def get_available_tones():
    """Get list of all available message tones."""
    return {"tones": message_bank.get_tones()}


@app.get("/api/messages/channels")
async def get_available_channels():
    """Get list of all available communication channels."""
    return {"channels": message_bank.get_channels()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
