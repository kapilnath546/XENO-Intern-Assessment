"""
models.py — SQLAlchemy ORM definitions for the Xeno CRM.

Design decisions:
- Four tables only: Customer, Order, Campaign, Communication.
  Keeping the schema minimal mirrors real D2C CRM data contracts.
  Customers come from Shopify/WooCommerce imports, not UI forms.
- ChannelType and CommunicationStatus are Python enums stored as
  SQLite strings. This gives us type-safety in Python while keeping
  the DB portable (no DB-level ENUM migrations needed).
- Communication.channel is stored per-row (not per-campaign) so that
  future campaigns can mix channels — e.g. WhatsApp for high-value
  customers, SMS for at-risk. The current implementation sends one
  channel per campaign, but the schema is ready for that evolution.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class ChannelType(str, enum.Enum):
    """Delivery channels supported by the simulator.

    RCS is included for forward-compatibility — it is the emerging
    standard for rich messaging in India (JioPhone, BSNL rollout).
    """
    whatsapp = "WhatsApp"
    sms      = "SMS"
    email    = "Email"
    rcs      = "RCS"


class CommunicationStatus(str, enum.Enum):
    """Delivery lifecycle states for a single message.

    The progression is: sent → delivered → read → clicked.
    'failed' can occur at any step — carrier block, invalid number, etc.
    These mirror the webhook events a real channel provider (e.g. Kaleyra,
    Twilio) would fire back to our webhook endpoint.
    """
    sent      = "sent"
    delivered = "delivered"
    failed    = "failed"
    read      = "read"
    clicked   = "clicked"


class Customer(Base):
    """A brand's end customer, imported from their e-commerce platform.

    We store minimal PII: name, email, phone, city.
    Segment membership is NOT stored here — it is computed at query time
    from Order history so it stays accurate as purchase behaviour evolves.
    """
    __tablename__ = "customers"

    id       = Column(Integer, primary_key=True, index=True)
    name     = Column(String, nullable=False)
    email    = Column(String, unique=True, index=True)
    phone    = Column(String)
    city     = Column(String)
    # Legacy tag field — kept for backwards compatibility but not used
    # by the current segmentation engine (which derives everything from orders).
    segments = Column(String)

    orders         = relationship("Order",         back_populates="customer")
    communications = relationship("Communication", back_populates="customer")


class Order(Base):
    """A single purchase event from the customer's order history.

    Order history is the single source of truth for all segments.
    We only store what we need for segmentation: amount, category,
    and purchase date. Product-level detail (SKU, name) is in category.
    """
    __tablename__ = "orders"

    id            = Column(Integer, primary_key=True, index=True)
    customer_id   = Column(Integer, ForeignKey("customers.id"), nullable=False)
    amount        = Column(Float, nullable=False)   # in INR (₹)
    category      = Column(String)                  # e.g. "Coffee", "Apparel"
    purchase_date = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="orders")


class Campaign(Base):
    """A marketing campaign created from an AI recommendation or manual launch.

    Campaigns are append-only — we never edit or delete them.
    Status is kept simple ('active') for this scope; production would
    add 'scheduled', 'paused', 'completed' with timestamps for each state.
    """
    __tablename__ = "campaigns"

    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String, nullable=False)
    target_segment = Column(String)       # Human-readable segment description
    message        = Column(String, default="")
    status         = Column(String, default="active")
    created_at     = Column(DateTime, default=datetime.utcnow)

    communications = relationship("Communication", back_populates="campaign")


class Communication(Base):
    """A single message sent to one customer as part of a campaign.

    One campaign → many Communications (one per customer in the segment).
    The channel field tracks which delivery channel was used for this
    specific message — important for per-channel delivery analytics.

    Status is updated via webhook callback from the channel simulator.
    In production, the channel simulator would be replaced by a real
    provider (Kaleyra, Twilio, etc.) that fires the same webhook contract.
    """
    __tablename__ = "communications"

    id          = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"),  nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"),  nullable=False)
    # Channel stored per-communication so mixed-channel campaigns are possible.
    # Default is WhatsApp — the dominant D2C messaging channel in India.
    channel     = Column(SQLEnum(ChannelType), nullable=False, default=ChannelType.whatsapp)
    status      = Column(SQLEnum(CommunicationStatus), default=CommunicationStatus.sent)

    campaign = relationship("Campaign", back_populates="communications")
    customer = relationship("Customer", back_populates="communications")
