#!/usr/bin/env python3
"""
Assemble the inner pages of site-multycomm.

index.html is the source of truth for the shared chrome (icon sprite, topbar,
header, drawer, footer). This lifts those blocks out of it and splices them
around each page body fragment, so the nine pages can never drift apart.
"""
import re
from pathlib import Path

ROOT  = Path(__file__).resolve().parent.parent
PARTS = Path(__file__).resolve().parent / "parts"

index = (ROOT / "index.html").read_text()

def slab(start, end, inclusive_end=True):
    i = index.index(start)
    j = index.index(end, i)
    return index[i:j + (len(end) if inclusive_end else 0)]

SPRITE = slab("<!-- icon sprite -->", "</defs></svg>")
CHROME = slab("<!-- ═══════════ header ═══════════ -->", '<main id="main">', inclusive_end=False)
FOOTER = slab("<!-- ═══════════ footer ═══════════ -->", "</footer>")
CHAT   = slab("<!-- ═══════════ chat ═══════════ -->", "<!-- /chat -->")

PAGES = [
    ("products",  "products.html",  "Products — carrier &amp; enterprise cloud communication platforms",
     "A single unified IP-PBX, contact centre and UCaaS platform. Carrier-grade clusters, enterprise telephony, collaboration and bulk marketing tools, and CRM integration."),
    ("solutions", "solutions.html", "Solutions — cloud communication built for your industry",
     "Cloud telephony and contact centre solutions configured for hospitality, multi-branch enterprises, travel, education, BPO and banking."),
    ("services",  "services.html",  "Services — 24x7 global cloud telephony support",
     "Planning, network design, installation, acceptance testing, 24x7 Tier 1-3 support and preventive maintenance for your communication platform."),
    ("pricing",   "pricing.html",   "Pricing &amp; bundles — value for money, scaleable, ready to use",
     "Six MultyComm bundles: Cloud PBX Connect, Outbound Voice Dialer, Unified Dual Voice CX, Social Media Connect, Web Video Connect and AI Connect."),
    ("about",     "about.html",     "About MultyComm — industry veterans in cloud communication",
     "Over 2000 man-years of combined technical experience, serving BFSI, healthcare, education, retail, logistics, hospitality, government and more."),
    ("partners",  "partners.html",  "Partners — sales, technology and integration partnerships",
     "MultyComm works with sales and channel, technology, integration and third-party solution partners across the globe."),
    ("insights",  "insights.html",  "Insights — notes on AI, CX and cloud communication",
     "Articles from the MultyComm platform team on agentic AI, CRM integration, omnichannel CX, virtual receptionists and industry communication."),
    ("contact",   "contact.html",   "Contact MultyComm — talk to the platform team",
     "MultyComm Interactive Media Private Limited, Okhla, New Delhi. Email info@multycomm.com or call +91 98112 73194."),
]

TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | MultyComm</title>
<meta name="description" content="{desc}">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/css/site.css">
<meta property="og:title" content="{title} | MultyComm">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
</head>
<body>

<a class="skip" href="#main">Skip to main content</a>

{sprite}

{chrome}
{body}

{footer}

{chat}

<script src="assets/js/site.js"></script>
</body>
</html>
"""

def mark_active(chrome_html, href):
    """Put aria-current on whichever nav/drawer links point at this page."""
    out = re.sub(r'aria-current="page"\s*', '', chrome_html)
    out = out.replace('<a href="%s">' % href, '<a href="%s" aria-current="page">' % href)
    return out

written = []
for slug, href, title, desc in PAGES:
    frag = PARTS / f"{slug}.html"
    if not frag.exists():
        print(f"  .. skipped {slug} (no fragment yet)")
        continue
    page = TEMPLATE.format(
        title=title, desc=desc,
        sprite=SPRITE,
        chrome=mark_active(CHROME, href),
        body=frag.read_text().strip(),
        footer=FOOTER,
        chat=CHAT,
    )
    (ROOT / href).write_text(page)
    written.append((href, len(page)))
    print(f"  ✓ {href:16} {len(page)/1024:6.1f} KB")

print(f"\nsprite {len(SPRITE)/1024:.1f} KB · chrome {len(CHROME)/1024:.1f} KB · footer {len(FOOTER)/1024:.1f} KB")
print(f"{len(written)} pages assembled")
