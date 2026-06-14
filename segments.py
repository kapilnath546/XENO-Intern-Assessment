"""
segments.py — Customer segmentation engine for the Xeno CRM.

Segments are computed at query time from live order history rather than
stored as static tags. This means:
  - A customer moves between segments automatically as their behaviour changes.
  - No background job needed to keep segment memberships fresh.
  - The data model stays simple — no many-to-many segment table required.

The tradeoff: each segment query scans all customer-order data.
For a demo with 20 customers, this is fine. At 500k customers, we'd
cache segment counts in Redis (TTL: 1 hour) and compute them via a
scheduled job rather than on every API request.
"""

from datetime import datetime, timedelta
from typing import Callable, Dict, List, Optional

from sqlalchemy.orm import Session

import models

# ---------------------------------------------------------------------------
# Segment definitions — displayed in the UI as cards
# ---------------------------------------------------------------------------

SEGMENT_DEFINITIONS: Dict[str, Dict[str, str]] = {
    "high_value": {
        "name": "High Value",
        # INR threshold: ₹20,000 lifetime spend. Equivalent to a brand's
        # top 10-20% by revenue — the segment most worth protecting.
        "description": "Customers with total lifetime spend greater than ₹20,000",
    },
    "at_risk": {
        "name": "At Risk",
        # 60 days is the industry-standard D2C churn signal.
        # Below this: normal purchase cadence. Above: active churn risk.
        "description": "Customers with no order in the last 60 days — at risk of churning",
    },
    "one_time_buyers": {
        "name": "One-Time Buyers",
        "description": "Customers who have placed exactly one order — ready for second-purchase nudge",
    },
    "frequent_buyers": {
        "name": "Frequent Buyers",
        # 4+ orders signals habitual loyalty — these customers have made
        # repeat purchase a habit, not a one-off event.
        "description": "Customers with 4 or more orders — your most loyal cohort",
    },
    "coffee_lovers": {
        "name": "Coffee Lovers",
        # Category affinity is the simplest form of cross-sell signal.
        # If a customer bought coffee twice, they are likely to buy again
        # or be receptive to adjacent categories (accessories, wellness).
        "description": "Customers who have purchased in the Coffee category",
    },
}


# ---------------------------------------------------------------------------
# Per-customer stats helper
# ---------------------------------------------------------------------------

def _customer_stats(customer: models.Customer) -> Dict:
    """Compute derived metrics for a single customer from their order history."""
    orders = customer.orders or []
    total_spent = sum(order.amount for order in orders)
    order_count = len(orders)
    last_order_date = max((order.purchase_date for order in orders), default=None)
    categories = {order.category for order in orders if order.category}
    return {
        "total_spent":     round(total_spent, 2),
        "order_count":     order_count,
        "last_order_date": last_order_date,
        "categories":      categories,
    }


# ---------------------------------------------------------------------------
# Segment filter predicates — pure functions, easy to unit test
# ---------------------------------------------------------------------------

def _is_high_value(stats: Dict) -> bool:
    """Total lifetime spend exceeds ₹20,000 (INR threshold)."""
    return stats["total_spent"] > 20000


def _is_at_risk(stats: Dict) -> bool:
    """Last order was more than 60 days ago — active churn risk."""
    if stats["order_count"] == 0 or stats["last_order_date"] is None:
        return False
    cutoff = datetime.utcnow() - timedelta(days=60)
    return stats["last_order_date"] < cutoff


def _is_one_time_buyer(stats: Dict) -> bool:
    """Exactly one purchase — trust established, second-purchase nudge ready."""
    return stats["order_count"] == 1


def _is_frequent_buyer(stats: Dict) -> bool:
    """Four or more orders — habitual loyalty established."""
    return stats["order_count"] >= 4


def _is_coffee_lover(stats: Dict) -> bool:
    """Has purchased at least once in the Coffee category."""
    return "Coffee" in stats["categories"]


# Map segment ID → filter function for clean lookup
SEGMENT_FILTERS: Dict[str, Callable[[Dict], bool]] = {
    "high_value":      _is_high_value,
    "at_risk":         _is_at_risk,
    "one_time_buyers": _is_one_time_buyer,
    "frequent_buyers": _is_frequent_buyer,
    "coffee_lovers":   _is_coffee_lover,
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_segment_ids() -> List[str]:
    """Return all known segment IDs."""
    return list(SEGMENT_DEFINITIONS.keys())


def get_segment_meta(segment_id: str) -> Optional[Dict[str, str]]:
    """Return name + description for a segment, or None if unknown."""
    return SEGMENT_DEFINITIONS.get(segment_id)


def filter_customers_by_segment(
    customers: List[models.Customer], segment_id: str
) -> List[models.Customer]:
    """Return the subset of customers matching a segment's filter predicate."""
    predicate = SEGMENT_FILTERS.get(segment_id)
    if predicate is None:
        return []

    matched = []
    for customer in customers:
        stats = _customer_stats(customer)
        if predicate(stats):
            matched.append(customer)
    return matched


def serialize_segment_customer(customer: models.Customer) -> Dict:
    """Convert a Customer ORM object to the segment customer API schema."""
    stats = _customer_stats(customer)
    return {
        "id":          customer.id,
        "name":        customer.name,
        "email":       customer.email,
        "city":        customer.city or "Unknown",
        "total_spend": stats["total_spent"],   # in INR (₹)
        "order_count": stats["order_count"],
    }


def get_all_segments(db: Session) -> List[Dict]:
    """Return all segments with live customer counts for the Segments page."""
    # Load all customers in one query, then filter in Python.
    # At demo scale (20 customers) this is fast. At 100k+ customers,
    # this would be replaced by SQL COUNT queries with WHERE clauses
    # pushed down to the database.
    customers = db.query(models.Customer).all()
    result = []
    for segment_id, meta in SEGMENT_DEFINITIONS.items():
        matched = filter_customers_by_segment(customers, segment_id)
        result.append(
            {
                "id":             segment_id,
                "name":           meta["name"],
                "description":    meta["description"],
                "customer_count": len(matched),
            }
        )
    return result


def get_segment_customers(db: Session, segment_id: str) -> Optional[List[Dict]]:
    """Return serialized customers for a given segment ID, or None if unknown."""
    if segment_id not in SEGMENT_DEFINITIONS:
        return None

    customers = db.query(models.Customer).all()
    matched = filter_customers_by_segment(customers, segment_id)
    return [serialize_segment_customer(customer) for customer in matched]


def estimate_recommendation_audience(db: Session, recommendation: Dict) -> int:
    """Estimate audience size for an AI recommendation based on its criteria text.

    This is a heuristic matcher — it reads the AI's segment_filter or
    segment_name text and maps it to the closest known segment. It's
    intentionally simple: the AI outputs human-readable criteria, and
    we match keywords to segments. Production would use the segment_filter
    as a proper query predicate instead.
    """
    text = " ".join(
        [
            recommendation.get("segment_name", ""),
            recommendation.get("segment", ""),
            recommendation.get("target_criteria", ""),
            recommendation.get("segment_filter", ""),
        ]
    ).lower()

    customers = db.query(models.Customer).all()

    if "coffee" in text:
        return len(filter_customers_by_segment(customers, "coffee_lovers"))
    if "one-time" in text or "one time" in text or "order count" in text or "order_count" in text:
        return len(filter_customers_by_segment(customers, "one_time_buyers"))
    if "high" in text and ("spend" in text or "value" in text or "20000" in text or "₹20" in text):
        return len(filter_customers_by_segment(customers, "high_value"))
    if "re-engagement" in text or "lapsed" in text or "at risk" in text or "at_risk" in text or "60" in text:
        return len(filter_customers_by_segment(customers, "at_risk"))
    if "frequent" in text or "loyal" in text:
        return len(filter_customers_by_segment(customers, "frequent_buyers"))

    # Default: return total customers when we can't infer the segment
    return len(customers)
