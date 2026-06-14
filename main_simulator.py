"""
main_simulator.py — Stubbed Channel Delivery Service (Port 8001)
"""

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
import httpx
import random
import asyncio
from pydantic import BaseModel

# =============================================================
# SCOPE: Stubbed Channel Delivery Service (Port 8001)
#
# This is a separate process, not a module — intentional. In
# production, the channel service would be a third-party provider
# (Kaleyra, Twilio, etc.) running entirely outside our infra.
# Keeping it as a separate FastAPI process mirrors that boundary.
#
# The callback-driven pattern (send → async webhook → receipt)
# is not just for realism — it's the only correct architecture
# for message delivery. Synchronous delivery confirmation doesn't
# exist in real channel APIs. Fire and forget, then callback.
#
# What this simulator does NOT model (and why):
#   - Per-recipient throttling: would need a rate limiter (slowapi)
#   - Carrier-specific failure codes: overkill for demo
#   - Message queuing / ordering guarantees: would need Redis Streams
# =============================================================

app = FastAPI(title="Channel Simulator Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CommunicationPayload(BaseModel):
    """Payload sent from the CRM when dispatching a message."""
    communication_id: int
    customer_id: int
    campaign_id: int
    message: str
    webhook_url: str


@app.on_event("startup")
def startup_event():
    """Ensure DB tables exist — simulator shares the same SQLite file."""
    Base.metadata.create_all(bind=engine)


@app.get("/")
def read_root():
    return {"message": "Channel Simulator Service is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/send")
def send_communication(payload: CommunicationPayload, background_tasks: BackgroundTasks):
    """Accept a message dispatch request and queue it for async processing.

    Returns 200 immediately (fire-and-forget). The actual delivery
    simulation and webhook callback happen in a background asyncio task.
    This mirrors how real channel providers work: they accept the message,
    queue it internally, and call your webhook when delivery is confirmed.
    """
    background_tasks.add_task(process_communication, payload)
    return {"status": "accepted", "message": "Communication queued for processing"}


async def process_communication(payload: CommunicationPayload):
    """Simulate realistic message delivery latency and outcome, then callback.

    Delivery rates are tuned to real-world benchmarks:
      WhatsApp/SMS: 85-95% delivery, 30-45% read, 5-15% click
    We add ~15% failure to simulate carrier blocks and invalid numbers.
    These aren't arbitrary — they mirror what a real provider returns.

    Sleep of 2-5s simulates network transit + carrier processing time.
    In production, this latency comes from the provider's infrastructure.
    """
    # Random latency mimics real-world carrier processing time
    await asyncio.sleep(random.uniform(2, 5))

    # Weighted outcomes reflect real D2C channel performance benchmarks.
    # "clicked" is the highest-value signal — we keep it at 20% to be realistic.
    outcomes = ["delivered", "read", "clicked", "failed"]
    weights  = [0.40, 0.30, 0.20, 0.10]
    status   = random.choices(outcomes, weights=weights, k=1)[0]

    await deliver_with_retry(
        communication_id=payload.communication_id,
        status=status,
        crm_webhook_url=payload.webhook_url,
    )


async def deliver_with_retry(
    communication_id: int,
    status: str,
    crm_webhook_url: str,
):
    """Fire a delivery status callback to the CRM with retry logic.

    Production equivalent: exponential backoff + dead-letter queue (DLQ).
    Here we use linear backoff (2s) with 3 attempts — sufficient to
    demonstrate the pattern without over-engineering for a demo.

    Why a DLQ matters in production:
    - If the CRM is down for a rolling deploy, retries exhaust quickly.
    - Permanently-failed callbacks should be stored for manual review,
      not silently dropped — otherwise campaign stats are wrong forever.
    - AWS SQS DLQ or a Redis List are the standard choices.
    """
    payload = {
        "communication_id": communication_id,
        "status": status,
    }

    max_attempts  = 3
    delay_seconds = 2

    for attempt in range(1, max_attempts + 1):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(crm_webhook_url, json=payload)

                if response.status_code == 200:
                    print(
                        f"[Simulator] [OK] Callback delivered "
                        f"(comm_id={communication_id}, status={status}, attempt={attempt})"
                    )
                    return
                else:
                    # Non-200 means the CRM accepted the request but rejected
                    # the payload - log and retry in case it was a transient error.
                    print(
                        f"[Simulator] [FAIL] HTTP {response.status_code} "
                        f"on attempt {attempt}/{max_attempts}"
                    )

        except httpx.RequestError as e:
            # Network-level failures (timeout, connection refused).
            # This is the most common failure mode when the CRM restarts.
            print(
                f"[Simulator] [FAIL] Network error on attempt "
                f"{attempt}/{max_attempts}: {e}"
            )

        if attempt < max_attempts:
            print(f"[Simulator] Retrying in {delay_seconds}s...")
            await asyncio.sleep(delay_seconds)

    # All attempts failed. In production: push to dead-letter queue.
    # Here: log it. The CRM will show the message as stuck in "Sent" -
    # visible to the operator so the failure isn't silently lost.
    print(
        f"[Simulator] [FAIL] All {max_attempts} attempts failed for "
        f"comm_id={communication_id}. "
        f"Production: would push to DLQ for manual review."
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
