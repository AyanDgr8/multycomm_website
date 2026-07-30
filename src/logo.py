#!/usr/bin/env python3
"""
Derive the site's logo assets from the one supplied master, assets/img/logo.webp.

The master is a 767x179 lossy WebP with no alpha channel: navy wordmark and coral
handset painted on solid white. Three things are wrong with using it directly —
it carries a white box onto the dark footer, the baked-in tagline is illegible at
header size, and there is no square crop for the chat avatar or favicon.

So it is cut into parts and each part rebuilt with real transparency:

  logo-lockup.webp        handset + "MultyComm", original ink       -> header
  logo-lockup-light.webp  same geometry, white ink + brand coral    -> footer, dark bands
  logo-full.webp          the entire master incl. tagline, ink      -> light surfaces
  logo-full-light.webp    the entire master incl. tagline, white    -> footer lockup
  logo-mark.webp          the handset alone, square canvas          -> chat avatar
  logo-mark-light.webp    the handset alone, white outline          -> dark avatars
  favicon.svg             handset traced as vector                  -> tab icon

Alpha comes from ink coverage: a pixel painted at coverage `a` over white reads
back as C = F*a + 255*(1 - a), so a = 1 - min(C)/255 recovers the coverage and
F = (C - 255*(1 - a))/a recovers the paint. That keeps the antialiased edges soft
instead of leaving the white fringe a colour-key would.

    python3 src/logo.py
"""
from pathlib import Path
from PIL import Image

IMG = Path(__file__).resolve().parent.parent / "assets" / "img"
SRC = IMG / "logo.webp"

# measured off the master by ink-density profiling, not guessed
MARK     = (26, 11, 137, 160)    # the handset outline
WORDMARK = (150, 47, 756, 112)   # "MultyComm"
TAGLINE  = (150, 127, 756, 149)  # "Seamless Connection, Anytime and Anywhere"
GAP      = 14                    # master's own spacing between handset and text

BRAND = (254, 102, 0)            # --brand, the site's orange
WHITE = (255, 255, 255)

SCALE = 2                        # export at 2x: ~300px tall, ample for a 36-56px lockup
FLOOR = 14                       # coverage below this is WebP ringing, not ink


def unpaint(rgb_img):
    """White-backed RGB -> RGBA with the white unmultiplied back out.

    The master is lossy, so every glyph sits in a halo of 1-5% ringing. Left in,
    that haze is invisible but triples the file size and greys the dark footer.
    Coverage under FLOOR is dropped and what survives is restretched, which keeps
    the edge ramp smooth while the background goes properly empty.
    """
    src = rgb_img.convert("RGB")
    out = Image.new("RGBA", src.size, (0, 0, 0, 0))
    sp, op = src.load(), out.load()
    w, h = src.size
    for y in range(h):
        for x in range(w):
            r, g, b = sp[x, y]
            cover = 255 - min(r, g, b)
            if cover <= FLOOR:
                continue
            a = cover / 255
            base = 255 * (1 - a)
            op[x, y] = (
                min(255, max(0, round((r - base) / a))),
                min(255, max(0, round((g - base) / a))),
                min(255, max(0, round((b - base) / a))),
                round((cover - FLOOR) * 255 / (255 - FLOOR)),
            )
    return out


def recolour(rgba, ink, accent):
    """Repaint: cool pixels take `ink`, warm (the handset) take `accent`."""
    out = rgba.copy()
    p = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = p[x, y]
            if not a:
                continue
            p[x, y] = ((accent if r - b > 30 else ink) + (a,))
    return out


def compose(parts, gap, scale=SCALE):
    """Lay parts out in a row, vertically centred, on a transparent canvas."""
    parts = [q.resize((q.width * scale, q.height * scale), Image.LANCZOS) for q in parts]
    g = gap * scale
    w = sum(q.width for q in parts) + g * (len(parts) - 1)
    h = max(q.height for q in parts)
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    x = 0
    for q in parts:
        canvas.alpha_composite(q, (x, (h - q.height) // 2))
        x += q.width + g
    return canvas


def save(img, name):
    path = IMG / name
    img.save(path, "WEBP", quality=92, method=6)
    print(f"  {name:26} {img.width}x{img.height}  {path.stat().st_size / 1024:5.1f} KB")


def stack(top, bottom, gap, align_left, scale=SCALE):
    """Wordmark over tagline, both left-aligned to the same edge."""
    top, bottom = (q.resize((q.width * scale, q.height * scale), Image.LANCZOS)
                   for q in (top, bottom))
    g = gap * scale
    canvas = Image.new("RGBA", (max(top.width, bottom.width), top.height + g + bottom.height),
                       (0, 0, 0, 0))
    canvas.alpha_composite(top, (0, 0))
    canvas.alpha_composite(bottom, (align_left * scale, top.height + g))
    return canvas


def main():
    master = Image.open(SRC)
    mark = unpaint(master.crop(MARK))
    word = unpaint(master.crop(WORDMARK))
    tag = unpaint(master.crop(TAGLINE))

    ink = (30, 86, 133)          # the master's own navy, measured
    coral = (239, 111, 83)       # --coral, the master's handset within a point or two

    # --- horizontal lockup: handset + wordmark, no tagline -------------------
    save(compose([mark, word], GAP), "logo-lockup.webp")
    save(compose([recolour(mark, WHITE, BRAND), recolour(word, WHITE, BRAND)], GAP),
         "logo-lockup-light.webp")

    # --- full lockup: everything the master has, tagline included ------------
    text = stack(word, tag, 15, TAGLINE[0] - WORDMARK[0], scale=1)
    save(compose([mark, text], GAP), "logo-full.webp")
    save(compose([recolour(mark, WHITE, BRAND), recolour(text, WHITE, BRAND)], GAP),
         "logo-full-light.webp")

    # --- the handset alone, on a square canvas, for avatars ------------------
    def square(m):
        s = max(m.size) + 8
        c = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        c.alpha_composite(m, ((s - m.width) // 2, (s - m.height) // 2))
        return c.resize((s * SCALE, s * SCALE), Image.LANCZOS)

    save(square(mark), "logo-mark.webp")
    save(square(recolour(mark, WHITE, WHITE)), "logo-mark-light.webp")

    print(f"\n  ink {ink} · coral {coral} · brand {BRAND}")


if __name__ == "__main__":
    main()
