# Xeno AI-Native Mini CRM

> An AI-powered campaign decision engine for D2C brands.  
> Built for the Xeno Engineering Take-Home Assignment, June 2026.

## The Product Bet

Most CRM tools give marketers a blank canvas and expect them to 
figure everything out. This submission makes the opposite bet:

**The AI does the thinking. The marketer makes the call.**

The system reads customer purchase history, identifies who needs 
attention and why, writes the message, picks the channel, and 
tracks delivery end-to-end. One tight loop, done well.

## What I Built

| Feature | Description |
|---|---|
| AI Campaign Agent | GPT-4o-mini reads purchase data → recommends WHO, WHAT, and WHICH channel |
| Behavioural Segments | High Value, At-Risk, One-Time Buyers, Frequent Buyers, Category-specific |
| Async Delivery Loop | CRM → Channel Simulator → Webhook callback with retry logic |
| Live Performance Tracking | Sent / Delivered / Read / Clicked / Failed, updating every 3s |
| Analytics View | Campaign comparison chart + performance table |

## What I Deliberately Did NOT Build

This is as important as what I built:

| Not Built | Why |
|---|---|
| Customer add/edit/delete UI | D2C brands import from Shopify or WooCommerce via API. A manual form would be shallow and wrong for this use case. |
| User authentication | Adds 4+ hours of complexity with zero evaluation signal. Production would use JWT + RBAC. |
| Real WhatsApp / SMS / Email API | Assignment explicitly says to stub. Wiring a real provider would hide the architecture under API credentials. |
| A/B testing engine | Valid CRM feature, but not in the core brief. Depth on the AI loop beats breadth on nice-to-haves. |
| Email template drag-and-drop builder | Powerful, but completely outside the scope of "who to reach and what to say." |
| Campaign scheduling / automation | Post-MVP. The AI recommends; the marketer manually approves for this scope. |

## Architecture

```
┌─────────────┐     POST /send      ┌──────────────────┐
│  CRM API    │ ──────────────────► │ Channel Simulator │
│  Port 8000  │                     │  Port 8001        │
│             │ ◄────────────────── │                   │
│  FastAPI    │   POST /webhook/    │  async + retry    │
│  SQLite     │   receipt           │  3 attempts       │
└─────────────┘                     └──────────────────┘
       ▲
       │  /api/*
       │
┌─────────────┐
│  React SPA  │  Vite dev server proxies /api → :8000
│  Port 5173  │  Polling every 3s for live campaign metrics
│  TypeScript │
└─────────────┘
       ▲
       │  recommendations
       │
┌─────────────┐
│  AI Agent   │  GPT-4o-mini
│  ai_agent.py│  Real DB stats → structured JSON prompt
└─────────────┘  → 3 campaign recommendations + data insight
```

## Scale Tradeoffs

| What I used | Why | At production scale |
|---|---|---|
| SQLite | Zero config, perfect for demo | PostgreSQL + pgBouncer connection pooling |
| asyncio background task | Simple, works for 20 users | Celery + Redis or AWS SQS for 1M+ messages |
| 3-second polling | Easy, no extra infra | WebSockets or Server-Sent Events |
| 3 retries, 2s delay | Demonstrates the pattern | Exponential backoff + dead-letter queue |
| On-demand AI calls | Fine for demo | Scheduled cron job, results cached in Redis |
| No auth | Demo only | JWT access tokens + refresh tokens + RBAC |

## Running Locally

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Set your OpenAI key
echo "OPENAI_API_KEY=your_key_here" > .env

# 3. Seed the database
python seed.py

# 4. Start CRM backend
uvicorn main_crm:app --reload --port 8000

# 5. Start Channel Simulator (new terminal)
uvicorn main_simulator:app --reload --port 8001

# 6. Start Frontend (new terminal)
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

> Without a valid OpenAI key, the app falls back to pre-built recommendation
> templates that use the same INR thresholds and segment logic as the live AI.

## AI-Native Development Workflow

Built using Cursor and Antigravity as AI pair programmers.
Every architectural decision was made by me — AI accelerated 
implementation. I can explain and defend every line of code.

Key AI-assisted decisions I reviewed and validated:
- SQLAlchemy relationship structure (`models.py`)
- Async webhook pattern in simulator (`main_simulator.py`)
- GPT-4o-mini prompt engineering for structured JSON output (`ai_agent.py`)
- React polling mechanism and defensive rendering (`Dashboard.tsx`, `api.ts`)
