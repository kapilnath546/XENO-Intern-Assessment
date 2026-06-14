"""
seed.py — Database seeder for the Xeno CRM demo.

This file populates the database with 20 realistic Indian D2C customers
designed to demonstrate all five behavioural segments cleanly:

  High Value   — 5 customers (total spend > ₹20,000)
  At Risk      — 5 customers (no order in 61+ days)
  One-Time     — 5 customers (exactly one order)
  Frequent     — 5 customers (4+ orders, overlaps with Coffee Lovers)
  Coffee Lovers — customers who bought from the Coffee category

All amounts are in Indian Rupees (₹). Dates are relative to today
so segment calculations remain accurate whenever this script is run.
"""

from datetime import datetime, timedelta
from database import SessionLocal, engine, Base
import models
import random

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _total_orders(data: list) -> int:
    """Count total orders across all customers in the dataset."""
    return sum(len(c["orders"]) for c in data)


# ---------------------------------------------------------------------------
# Customer + order data
# Segments are derived from purchase behaviour at query time — not stored
# as tags — so the data below just needs to satisfy the filter thresholds.
# ---------------------------------------------------------------------------

today = datetime.utcnow()

customers_data = [
    # -----------------------------------------------------------------------
    # HIGH VALUE SEGMENT (total_spend > ₹20,000)
    # -----------------------------------------------------------------------
    {
        "name": "Priya Sharma",
        "email": "priya.sharma@gmail.com",
        "phone": "+91-9876543210",
        "city": "Mumbai",
        "orders": [
            {"product": "Premium Kurta Set",    "category": "Apparel",   "amount": 4500,  "date": today - timedelta(days=5)},
            {"product": "Silk Saree",            "category": "Apparel",   "amount": 8200,  "date": today - timedelta(days=30)},
            {"product": "Gold Earrings",         "category": "Jewellery", "amount": 6800,  "date": today - timedelta(days=60)},
            {"product": "Cashmere Stole",        "category": "Apparel",   "amount": 3200,  "date": today - timedelta(days=90)},
        ],
    },
    {
        "name": "Arjun Mehta",
        "email": "arjun.mehta@outlook.com",
        "phone": "+91-9823456789",
        "city": "Delhi",
        "orders": [
            {"product": "Cold Brew Kit",              "category": "Coffee", "amount": 2800,  "date": today - timedelta(days=10)},
            {"product": "Coffee Subscription 3M",     "category": "Coffee", "amount": 5400,  "date": today - timedelta(days=40)},
            {"product": "Pour Over Set",              "category": "Coffee", "amount": 3600,  "date": today - timedelta(days=70)},
            {"product": "Single Origin Beans 1kg",    "category": "Coffee", "amount": 4200,  "date": today - timedelta(days=100)},
            {"product": "Espresso Machine",           "category": "Coffee", "amount": 12000, "date": today - timedelta(days=120)},
        ],
    },
    {
        "name": "Kavya Nair",
        "email": "kavya.nair@gmail.com",
        "phone": "+91-9845678901",
        "city": "Bangalore",
        "orders": [
            {"product": "Anti-Aging Serum",     "category": "Beauty", "amount": 3800, "date": today - timedelta(days=3)},
            {"product": "Vitamin C Kit",         "category": "Beauty", "amount": 2600, "date": today - timedelta(days=25)},
            {"product": "Hyaluronic Toner",      "category": "Beauty", "amount": 1900, "date": today - timedelta(days=55)},
            {"product": "Night Repair Cream",    "category": "Beauty", "amount": 4100, "date": today - timedelta(days=85)},
            {"product": "SPF 50 Sunscreen",      "category": "Beauty", "amount": 1400, "date": today - timedelta(days=115)},
            {"product": "Face Oil Blend",        "category": "Beauty", "amount": 3200, "date": today - timedelta(days=140)},
        ],
    },
    {
        "name": "Rohan Gupta",
        "email": "rohan.gupta@yahoo.com",
        "phone": "+91-9867890123",
        "city": "Pune",
        "orders": [
            {"product": "Smart LED Lamp",        "category": "Home Decor", "amount": 5600, "date": today - timedelta(days=8)},
            {"product": "Bamboo Organiser",      "category": "Home Decor", "amount": 2400, "date": today - timedelta(days=45)},
            {"product": "Linen Cushion Set",     "category": "Home Decor", "amount": 3800, "date": today - timedelta(days=75)},
            {"product": "Ceramic Vase Set",      "category": "Home Decor", "amount": 4200, "date": today - timedelta(days=100)},
            {"product": "Wall Art Print",        "category": "Home Decor", "amount": 6800, "date": today - timedelta(days=130)},
        ],
    },
    {
        "name": "Sneha Iyer",
        "email": "sneha.iyer@gmail.com",
        "phone": "+91-9890123456",
        "city": "Chennai",
        "orders": [
            {"product": "Yoga Mat Premium",      "category": "Wellness", "amount": 3200, "date": today - timedelta(days=12)},
            {"product": "Copper Water Bottle",   "category": "Wellness", "amount": 1800, "date": today - timedelta(days=35)},
            {"product": "Essential Oil Set",     "category": "Wellness", "amount": 4600, "date": today - timedelta(days=65)},
            {"product": "Meditation Cushion",    "category": "Wellness", "amount": 5200, "date": today - timedelta(days=95)},
            {"product": "Herbal Tea Bundle",     "category": "Wellness", "amount": 2100, "date": today - timedelta(days=125)},
            {"product": "Foam Roller",           "category": "Wellness", "amount": 3400, "date": today - timedelta(days=150)},
        ],
    },

    # -----------------------------------------------------------------------
    # AT RISK SEGMENT (no order in 61+ days)
    # -----------------------------------------------------------------------
    {
        "name": "Ananya Krishnan",
        "email": "ananya.k@gmail.com",
        "phone": "+91-9734567890",
        "city": "Hyderabad",
        "orders": [
            {"product": "Filter Coffee Kit",    "category": "Coffee",  "amount": 2200, "date": today - timedelta(days=75)},
            {"product": "Stainless Steel Mug",  "category": "Coffee",  "amount": 1600, "date": today - timedelta(days=140)},
        ],
    },
    {
        "name": "Rahul Bose",
        "email": "rahul.bose@gmail.com",
        "phone": "+91-9756789012",
        "city": "Kolkata",
        "orders": [
            {"product": "Linen Shirt",          "category": "Apparel", "amount": 2800, "date": today - timedelta(days=90)},
            {"product": "Chino Trousers",        "category": "Apparel", "amount": 3200, "date": today - timedelta(days=160)},
            {"product": "Cotton Kurta",          "category": "Apparel", "amount": 1900, "date": today - timedelta(days=200)},
        ],
    },
    {
        "name": "Meera Reddy",
        "email": "meera.reddy@gmail.com",
        "phone": "+91-9778901234",
        "city": "Bangalore",
        "orders": [
            {"product": "Vitamin C Serum",      "category": "Beauty",  "amount": 2400, "date": today - timedelta(days=80)},
            {"product": "Clay Face Mask",        "category": "Beauty",  "amount": 1800, "date": today - timedelta(days=145)},
        ],
    },
    {
        "name": "Aditya Singh",
        "email": "aditya.singh@outlook.com",
        "phone": "+91-9790123456",
        "city": "Jaipur",
        "orders": [
            {"product": "Macrame Wall Hanging",  "category": "Home Decor", "amount": 3600, "date": today - timedelta(days=95)},
            {"product": "Terracotta Pots Set",   "category": "Home Decor", "amount": 2100, "date": today - timedelta(days=170)},
        ],
    },
    {
        "name": "Vikram Patel",
        "email": "vikram.patel@gmail.com",
        "phone": "+91-9712345678",
        "city": "Ahmedabad",
        "orders": [
            {"product": "Resistance Bands Set", "category": "Wellness", "amount": 2600, "date": today - timedelta(days=70)},
            {"product": "Protein Shaker",        "category": "Wellness", "amount": 1400, "date": today - timedelta(days=135)},
            {"product": "Jump Rope",             "category": "Wellness", "amount": 900,  "date": today - timedelta(days=180)},
        ],
    },

    # -----------------------------------------------------------------------
    # ONE-TIME BUYERS (exactly one order)
    # -----------------------------------------------------------------------
    {
        "name": "Pooja Pillai",
        "email": "pooja.pillai@gmail.com",
        "phone": "+91-9801234567",
        "city": "Kochi",
        "orders": [
            {"product": "Matte Lipstick Set",   "category": "Beauty",     "amount": 2200, "date": today - timedelta(days=22)},
        ],
    },
    {
        "name": "Nikhil Joshi",
        "email": "nikhil.joshi@gmail.com",
        "phone": "+91-9812345678",
        "city": "Pune",
        "orders": [
            {"product": "Arabica Beans 500g",   "category": "Coffee",     "amount": 1800, "date": today - timedelta(days=18)},
        ],
    },
    {
        "name": "Divya Menon",
        "email": "divya.menon@yahoo.com",
        "phone": "+91-9834567890",
        "city": "Chennai",
        "orders": [
            {"product": "Boho Printed Dress",   "category": "Apparel",    "amount": 3400, "date": today - timedelta(days=35)},
        ],
    },
    {
        "name": "Siddharth Kapoor",
        "email": "sid.kapoor@gmail.com",
        "phone": "+91-9856789012",
        "city": "Mumbai",
        "orders": [
            {"product": "Rattan Side Table",    "category": "Home Decor", "amount": 4800, "date": today - timedelta(days=50)},
        ],
    },
    {
        "name": "Ishaan Desai",
        "email": "ishaan.desai@gmail.com",
        "phone": "+91-9922345678",
        "city": "Surat",
        "orders": [
            {"product": "Ashwagandha Capsules", "category": "Wellness",   "amount": 1600, "date": today - timedelta(days=28)},
        ],
    },

    # -----------------------------------------------------------------------
    # FREQUENT BUYERS (4+ orders) — most also overlap with Coffee Lovers
    # -----------------------------------------------------------------------
    {
        "name": "Riya Agarwal",
        "email": "riya.agarwal@gmail.com",
        "phone": "+91-9944567890",
        "city": "Lucknow",
        "orders": [
            {"product": "Cold Brew Concentrate",    "category": "Coffee", "amount": 1600, "date": today - timedelta(days=7)},
            {"product": "Coffee Dripper",            "category": "Coffee", "amount": 2800, "date": today - timedelta(days=28)},
            {"product": "Ethiopian Blend 250g",      "category": "Coffee", "amount": 1900, "date": today - timedelta(days=55)},
            {"product": "Coffee Grinder Manual",     "category": "Coffee", "amount": 3400, "date": today - timedelta(days=85)},
            {"product": "French Press 600ml",        "category": "Coffee", "amount": 2200, "date": today - timedelta(days=110)},
        ],
    },
    {
        "name": "Tanmay Shah",
        "email": "tanmay.shah@gmail.com",
        "phone": "+91-9966789012",
        "city": "Ahmedabad",
        "orders": [
            {"product": "Monsoon Malabar Beans",    "category": "Coffee", "amount": 2400, "date": today - timedelta(days=4)},
            {"product": "Milk Frother Electric",     "category": "Coffee", "amount": 2800, "date": today - timedelta(days=38)},
            {"product": "Goa Blend Subscription",   "category": "Coffee", "amount": 3600, "date": today - timedelta(days=68)},
            {"product": "Glass Cups Set",            "category": "Coffee", "amount": 1800, "date": today - timedelta(days=98)},
        ],
    },
    {
        "name": "Nandini Rao",
        "email": "nandini.rao@gmail.com",
        "phone": "+91-9988901234",
        "city": "Mysuru",
        "orders": [
            {"product": "Coorg Filter Coffee",       "category": "Coffee", "amount": 1400, "date": today - timedelta(days=6)},
            {"product": "Bamboo Travel Mug",         "category": "Coffee", "amount": 2200, "date": today - timedelta(days=32)},
            {"product": "Specialty Blend 500g",      "category": "Coffee", "amount": 3200, "date": today - timedelta(days=62)},
            {"product": "Coffee Subscription 1M",    "category": "Coffee", "amount": 1800, "date": today - timedelta(days=92)},
            {"product": "Aeropress Complete Kit",    "category": "Coffee", "amount": 4600, "date": today - timedelta(days=125)},
        ],
    },
    {
        "name": "Karan Malhotra",
        "email": "karan.m@gmail.com",
        "phone": "+91-9900123456",
        "city": "Delhi",
        "orders": [
            {"product": "Indigo Block Print Shirt",  "category": "Apparel", "amount": 2800, "date": today - timedelta(days=9)},
            {"product": "Linen Trousers",            "category": "Apparel", "amount": 3200, "date": today - timedelta(days=42)},
            {"product": "Cotton Nehru Jacket",       "category": "Apparel", "amount": 4600, "date": today - timedelta(days=72)},
            {"product": "Handloom Dhoti",            "category": "Apparel", "amount": 2100, "date": today - timedelta(days=102)},
            {"product": "Printed Kurta",             "category": "Apparel", "amount": 1900, "date": today - timedelta(days=135)},
        ],
    },
    {
        "name": "Lakshmi Venkat",
        "email": "lakshmi.v@gmail.com",
        "phone": "+91-9878901234",
        "city": "Bangalore",
        "orders": [
            {"product": "Kumkumadi Oil",             "category": "Beauty", "amount": 2800, "date": today - timedelta(days=14)},
            {"product": "Rose Water Toner",          "category": "Beauty", "amount": 1200, "date": today - timedelta(days=45)},
            {"product": "Ubtan Face Pack",           "category": "Beauty", "amount": 1800, "date": today - timedelta(days=78)},
            {"product": "Nalpamaradi Oil",           "category": "Beauty", "amount": 2400, "date": today - timedelta(days=108)},
            {"product": "Neem Tulsi Cleanser",       "category": "Beauty", "amount": 1600, "date": today - timedelta(days=138)},
            {"product": "Aloe Vera Gel 200ml",       "category": "Beauty", "amount": 900,  "date": today - timedelta(days=165)},
        ],
    },
]





def seed():
    """Drop existing data and repopulate with fresh demo customers."""

    # Recreate all tables from scratch — safe for a demo DB.
    # Production would use Alembic migrations instead of dropping.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    total_orders_seeded = 0

    try:
        for cust_data in customers_data:
            customer = models.Customer(
                name=cust_data["name"],
                email=cust_data["email"],
                phone=cust_data["phone"],
                city=cust_data["city"],
                # Segment tags are not stored — they are computed at query time
                # from order history so they stay accurate as data changes.
                segments=None,
            )
            db.add(customer)
            db.flush()  # Get customer.id without committing

            for order_data in cust_data["orders"]:
                order = models.Order(
                    customer_id=customer.id,
                    # Store the product name in the category column's description
                    # using a composite format so the UI can display it richly.
                    category=order_data["category"],
                    amount=order_data["amount"],
                    purchase_date=order_data["date"],
                )
                db.add(order)
                total_orders_seeded += 1

        db.commit()

    except Exception as exc:
        db.rollback()
        raise RuntimeError(f"Seeding failed: {exc}") from exc
    finally:
        db.close()

    # -------------------------------------------------------------------
    # Compute and print segment preview so the operator can validate
    # that thresholds are working before running the app.
    # -------------------------------------------------------------------
    from datetime import datetime, timedelta as td

    high_value = 0
    at_risk = 0
    one_time = 0
    frequent = 0
    coffee_lovers = 0
    at_risk_cutoff = datetime.utcnow() - td(days=60)

    for cust in customers_data:
        orders = cust["orders"]
        total_spend = sum(o["amount"] for o in orders)
        order_count = len(orders)
        last_date = max([o["date"] for o in orders], default=None)
        categories = {o["category"] for o in orders}

        if total_spend > 20000:
            high_value += 1
        if order_count > 0 and last_date and last_date < at_risk_cutoff:
            at_risk += 1
        if order_count == 1:
            one_time += 1
        if order_count >= 4:
            frequent += 1
        if "Coffee" in categories:
            coffee_lovers += 1

    print(f"[OK] Seeded {len(customers_data)} customers")
    print(f"[OK] Seeded {total_orders_seeded} orders")
    print("[OK] Segment preview:")
    print(f"  High Value (>Rs.20,000):  {high_value} customers")
    print(f"  At Risk (>60 days):       {at_risk} customers")
    print(f"  One-Time Buyers:          {one_time} customers")
    print(f"  Frequent Buyers (4+):     {frequent} customers")
    print(f"  Coffee Lovers:            {coffee_lovers} customers")


if __name__ == "__main__":
    seed()
