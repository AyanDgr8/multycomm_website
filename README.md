# site-multycomm

A rebuilt marketing site for **MultyComm**, a multi-tenant UCaaS/CCaaS platform for carriers and
enterprises. Nine static pages, no build step required to view, no external requests at runtime.

Source of content and brand: `https://www.multycomm.com` (a Wix site), scraped 30 Jul 2026.

```bash
python3 ../serve.py site-multycomm 8412      # then open http://localhost:8412/
# or just double-click index.html — everything works over file:// too
```

## Pages

| file | what's on it |
|---|---|
| `index.html` | hero, client marquee, six capabilities, carrier-grade band, AI & language, industries, CRM integration, support, insights, CTA |
| `products.html` | carrier platforms (17 specs), enterprise platforms (44), collaboration & bulk marketing (23), CRM integration |
| `solutions.html` | six industries with their real bullet lists, eleven sectors served, what every deployment includes |
| `services.html` | 24×7 support promise, the six-stage delivery lifecycle, four support channels, satisfaction guarantee |
| `pricing.html` | the six real bundles with full feature lists, what's always included |
| `about.html` | mission, vision, sectors, how they work |
| `partners.html` | four partner types, technology integrations, twelve customer logos |
| `insights.html` | six featured articles plus the categorised archive |
| `contact.html` | validating contact form, real address/phone/email, quick routes |

## Where the design came from

Nothing here is invented styling — the palette and type pairing were read out of the live site's own
CSS custom properties and computed styles:

| token | live value | used as |
|---|---|---|
| `--color_41` / `--color_45` | `rgb(254,102,0)` | `--brand` — primary action, headings accent |
| `--color_44` | `rgb(239,111,83)` | `--coral` |
| `--color_43` | `rgb(217,135,24)` | `--amber` |
| `--color_42` | `rgb(54,76,99)` | `--slate` |
| `--font_2..6` | `rubik-medium` | headings (`--display`) |
| `--font_7..9` | `montserrat` | body copy (`--sans`) |

Both typefaces are variable fonts, self-hosted from Google Fonts at `assets/fonts/` (latin +
latin-ext, one file per subset covering the whole weight axis — 4 files, 155 KB total). No network
call at runtime.

The logo is redrawn as SVG (`assets/img/logo.svg`) from the original raster mark: the same handset
outline, plus two signal arcs. It takes its colours from CSS variables so it works on light and dark
backgrounds; the raster original is kept at `assets/img/logo.jpg` for reference.

## Content

Copy is the real MultyComm copy wherever the live site had any — the hero paragraph, the platform
spec lists, the six industry bullet lists, the six pricing bundles, the service lifecycle
descriptions, mission and vision statements, and the contact details are all theirs, lightly
restructured for the new layout.

Obvious typos in the source were corrected (`Integratiopn` → integration, `Coversational` →
conversational, `Transaltion` → translation, `Braoadcast` → broadcast, `Huwayei` → Huawei,
`Calender` → calendar, `Spottting` → spotting, and about a dozen more). Where the live site
published no figure — it lists no prices — the pricing cards say "Quoted" rather than inventing one.

## Imagery

45 images pulled from the Wix CDN at layout-appropriate sizes and re-encoded (3.4 MB total, down
from 11.9 MB as delivered). The twelve customer logos — Del Monte, Hutch, Cellcard, Biz2Credit,
EZMS, Spiderlink, Rai University, Kreditstack, BikeSetu, Triliv, Cube, Unahttar — were cropped out
of the three carousel strips the live site serves them in, so each can be laid out individually.

## The chat widget

The live site's bottom-right chat is **Wix Chat** — a cross-origin iframe served from
`engage.wixapps.net/chat-widget-server/renderChatWidget`, authenticated with a signed `instance`
token tied to their Wix site and backed by Wix Inbox. There is no source to lift: it is hosted SaaS,
and it cannot be pointed at anything else.

So it's rebuilt natively, matching the original's anatomy and copy exactly as captured:

| | live widget | rebuild |
|---|---|---|
| launcher | 230×66 pill, "Let's Chat!" | same, `.chat__launch` |
| panel | 370×610 | same |
| header | avatar · **MultyComm** · "We'll reply within a few minutes" | same |
| greeting | "Hi there 👋! Welcome to the site. Let me know if you have any questions." | same |
| lead prompt | "Please leave your details so we can contact you even if you are no longer on the site." | same |
| fields | Name · Email · Phone · Message · Submit | same |
| channels | Chat / WhatsApp switcher | same, WhatsApp deep-links to `wa.me/919811273194` |
| accent | Wix default indigo `#5D62F9` | brand orange `#FE6600` |

Added on top: four quick-reply chips answering real questions (pricing, WhatsApp campaigns, carrier
platform, support hours) with a typing indicator, `Escape` to close, focus returned to the launcher,
and a first-visit unread badge held in `sessionStorage`.

It talks to nobody. Replies are canned, the form validates and is never transmitted, and the panel
says so in place, pointing at `info@multycomm.com`.

## Structure

```
index.html              hand-written; also the source of the shared chrome
products.html …         generated by src/build.py
assets/css/site.css     design system — tokens, components, dark bands, responsive
assets/css/fonts.css    self-hosted @font-face
assets/js/site.js       sticky header, scroll progress, drawer, reveals, counters,
                        accordions, pricing expanders, marquee, form validation,
                        chat widget
assets/img/             45 photos/logos + logo.svg + favicon.svg
src/build.py            splices chrome from index.html around src/parts/*.html
src/parts/*.html        the unique <main> of each inner page
```

`index.html` is the single source of truth for the icon sprite, topbar, header, drawer, footer and
chat widget.
`src/build.py` lifts those blocks out of it and wraps them around each fragment, so the nine pages
cannot drift apart. Edit the chrome in `index.html`, edit a page body in `src/parts/`, then:

```bash
python3 src/build.py
```

## Verified

Every page, loaded over `file://` with a full scroll pass:

| | result |
|---|---|
| pages | 9 |
| images resolved | 98 / 98 |
| chat widget opens + replies | on all 9 pages |
| failed requests | 0 |
| JS errors | 0 |
| scroll-reveal elements shown | 100% |

Layout was audited separately at **360 / 390 / 768 / 1180 / 1440 px** — 45 page-viewport
combinations, zero overflowing elements.

That audit measures element geometry rather than `document.scrollWidth`, because `scrollWidth`
reports clean whenever an ancestor clips. It caught a real bug the `overflow-x` guards were hiding:
the hero console's `white-space: nowrap` message rows forced a 453px track inside a 390px viewport,
since grid and flex items default to `min-width: auto`. Fixed at the source with `min-width: 0` on
layout children, not by clipping.

## Notes

- The contact and newsletter forms validate in the browser and then say so — there is no backend,
  and nothing is transmitted.
- Article links on `insights.html` are placeholders; the posts themselves live on the real blog.
- Motion respects `prefers-reduced-motion`: reveals, the marquee, the console rotation and the
  count-ups all stand down.
- Built for offline/archival and demonstration use; the content and marks belong to MultyComm.
# multycomm_website
