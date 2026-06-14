"""
message_bank.py - Hardcoded Professional Marketing Messages
100% Fixed Messaging System - Uses exact user-provided messages
"""

MESSAGE_BANK = {
    "high_spenders": {
        "friendly": {
            "whatsapp": "Hi [Name], we hope you enjoyed your first order. Here's a special offer for your next purchase.",
            "email": "Hi [Name], thank you for being one of our most valued customers. Enjoy 30% off our premium collection and complimentary shipping."
        },
        "urgent": {
            "whatsapp": "Hi [Name], your continued support inspires us. Limited time: exclusive premium rewards available NOW.",
            "email": "Thank you for choosing us repeatedly, [Name]. Act now to enjoy a customer-exclusive premium offer with 30% off."
        },
        "exclusive": {
            "whatsapp": "Exceptional customers deserve exceptional benefits. Enjoy exclusive rewards today, [Name].",
            "email": "We've got something special waiting for you, [Name]. Discover premium products at exclusive prices and member-only discounts."
        },
        "grateful": {
            "whatsapp": "Your loyalty means everything to us, [Name]. Unlock exclusive savings of 30% on premium products today.",
            "email": "Your support has made a difference, [Name]. Reward yourself with premium products at 30% off as our heartfelt thank you."
        }
    },
    "repeat_customers": {
        "friendly": {
            "whatsapp": "Hi [Name], many of our customers find their favorites on their second purchase. Explore today.",
            "email": "Thank you for your recent order. Come back and discover something new with special rewards waiting."
        },
        "urgent": {
            "whatsapp": "Your next purchase is waiting! [Name], come back today and enjoy exclusive member benefits.",
            "email": "Hi [Name], don't miss out. Your favorite products are calling you back with exclusive savings inside."
        },
        "exclusive": {
            "whatsapp": "We think you'll love what comes next, [Name]. Shop again and enjoy exclusive perks.",
            "email": "Hi [Name], because you're a valued customer, we've reserved special savings just for your next order."
        },
        "grateful": {
            "whatsapp": "Thank you for choosing us, [Name]. Discover even more products you'll love.",
            "email": "We appreciate your trust, [Name]. Come back and enjoy exclusive benefits reserved for loyal customers."
        }
    },
    "at_risk": {
        "friendly": {
            "whatsapp": "We noticed it's been some time since your last visit. Here's a reward to make your return worthwhile.",
            "email": "Come back and see what's new, [Name]. We've prepared an exclusive offer for you and fresh arrivals you'll love."
        },
        "urgent": {
            "whatsapp": "Come back now, [Name]! Your favorite products are waiting with special limited-time savings.",
            "email": "It's never too late to reconnect, [Name]. Enjoy exclusive savings on your next purchase - offer ends soon."
        },
        "exclusive": {
            "whatsapp": "Come back and experience what's new, [Name]. Exclusive savings await your return.",
            "email": "Your journey with us isn't over yet. Come back and enjoy exclusive rewards reserved just for you."
        },
        "grateful": {
            "whatsapp": "Hi [Name], we miss having you with us. Come back today and enjoy 25% off your next purchase.",
            "email": "We've missed you, [Name]. Enjoy a special discount and rediscover the products you love with our heartfelt welcome back."
        }
    },
    "new_customers": {
        "friendly": {
            "whatsapp": "Hi [Name], your next purchase comes with special rewards waiting for you.",
            "email": "Great customers deserve a second visit. Enjoy exclusive savings on your next order with us."
        },
        "urgent": {
            "whatsapp": "Don't wait, [Name]! Your welcome bonus is ready - shop now and get exclusive member benefits.",
            "email": "Act fast, [Name]! Your special first-time customer offer is limited. Redeem your exclusive discount today."
        },
        "exclusive": {
            "whatsapp": "Your journey with us has just begun. Explore more and enjoy exclusive rewards today.",
            "email": "We think you'll love what comes next, [Name]. Come back and enjoy exclusive perks on your second purchase."
        },
        "grateful": {
            "whatsapp": "Thank you for your first purchase, [Name]. We'd love to serve you again.",
            "email": "Thank you for joining our community, [Name]. Enjoy special rewards on your next purchase with us."
        }
    },
    "coffee_lovers": {
        "friendly": {
            "whatsapp": "Hi [Name], discover your next favorite coffee blend today with member-exclusive prices.",
            "email": "Start your day right with premium coffee and exclusive offers reserved for coffee lovers like you."
        },
        "urgent": {
            "whatsapp": "Fresh brews and exclusive rewards are here NOW, [Name]. Limited stock - shop your favorite blends today!",
            "email": "Don't miss out, [Name]! Premium coffee selection is running low. Enjoy special savings before it's gone."
        },
        "exclusive": {
            "whatsapp": "Your next perfect cup is waiting. Explore exclusive coffee offers today, [Name].",
            "email": "Discover new flavors and enjoy exclusive savings on every sip. Premium blends reserved for members like you."
        },
        "grateful": {
            "whatsapp": "Hi [Name], your favorite coffee is waiting. Enjoy special savings today.",
            "email": "Because great coffee deserves great rewards, enjoy special member savings on your favorite selections today."
        }
    },
    "vip": {
        "friendly": {
            "whatsapp": "Hi [Name], as one of our top customers, you deserve exclusive rewards today.",
            "email": "Hello [Name], premium experiences are meant for customers like you. Enjoy exclusive savings right now."
        },
        "urgent": {
            "whatsapp": "VIP Alert! [Name], limited-time premium rewards await you - claim yours today!",
            "email": "Exclusive VIP opportunity, [Name]. Premium access ends soon. Don't miss this special offer."
        },
        "exclusive": {
            "whatsapp": "Exceptional customers deserve exceptional benefits. Enjoy exclusive rewards today, [Name].",
            "email": "We've got something special waiting for you, [Name]. Discover premium products at exclusive member prices."
        },
        "grateful": {
            "whatsapp": "Your loyalty deserves recognition, [Name]. Shop premium products with exclusive rewards today.",
            "email": "We're grateful for your loyalty, [Name]. Unlock special access to 30% savings on our premium range."
        }
    },
    "browsing_visitors": {
        "friendly": {
            "whatsapp": "Hi [Name], we saw you browsing. Come back and find your perfect purchase today.",
            "email": "Welcome! We noticed you were interested in our collection. Complete your purchase and enjoy member benefits."
        },
        "urgent": {
            "whatsapp": "Your favorites are still waiting, [Name]. Limited stock available - complete your order now!",
            "email": "Hurry, [Name]! The items you viewed are selling fast. Don't miss out - shop now with special savings."
        },
        "exclusive": {
            "whatsapp": "As a site visitor, enjoy exclusive first-time offers, [Name]. Shop now.",
            "email": "We saved you a special offer. First-time customer exclusive savings are waiting inside."
        },
        "grateful": {
            "whatsapp": "Thank you for visiting, [Name]. Enjoy a special welcome reward on your first purchase.",
            "email": "Thank you for browsing with us, [Name]. Enjoy a member-exclusive welcome offer on your next visit."
        }
    }
}


def get_message(segment: str, tone: str, channel: str) -> str:
    """
    Retrieve a professional message from the bank.
    
    Args:
        segment: Customer segment (vip, repeat_customers, at_risk, high_spenders, new_customers, browsing_visitors)
        tone: Message tone (friendly, urgent, exclusive, grateful)
        channel: Communication channel (whatsapp, email)
    
    Returns:
        The message text, or a fallback if not found
    """
    try:
        return MESSAGE_BANK.get(segment, {}).get(tone, {}).get(channel, 
            f"Thank you for choosing us, [Name]! We appreciate your business. [Shop Now]")
    except (KeyError, TypeError):
        return "Thank you for being a valued customer! [Shop Now]"


def list_all_messages() -> dict:
    """Return all messages organized by segment and tone."""
    return MESSAGE_BANK


def get_segments() -> list:
    """Return all available segments."""
    return list(MESSAGE_BANK.keys())


def get_tones() -> list:
    """Return all available tones."""
    return ["friendly", "urgent", "exclusive", "grateful"]


def get_channels() -> list:
    """Return all available channels."""
    return ["whatsapp", "email"]
