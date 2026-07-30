#!/usr/bin/env python3
"""
Normalise the three CRM partner marks in assets/img/logos/ for the integration row.

They arrive as a 1920px JPEG, a 268px PNG and a 1920px WebP — different formats,
different resolutions, different amounts of surrounding whitespace, and two of the
three are painted on solid white. Dropped into a row at a fixed CSS height they
would read at wildly different weights: Bitrix24's wordmark is 5.6 : 1, the
Salesforce cloud is 1.4 : 1.

So each is trimmed to its ink, lifted off white into real alpha, then scaled so
all three cover the same *ink area* rather than the same height — which is how a
logo row is balanced by eye — and centred on one shared canvas. The markup can
then use a single box size for all three and they sit level.

    python3 src/crm.py
"""
from pathlib import Path
from PIL import Image

IMG = Path(__file__).resolve().parent.parent / "assets" / "img"
SRC = IMG / "logos"

CANVAS_H = 264           # shared 2x canvas height; width follows each mark
TARGET_INK = 40_000      # ink pixels each mark is scaled to cover
TARGET_BOX = 90_000      # bounding-box pixels each mark is scaled to cover
FLOOR = 12               # coverage below this is JPEG/WebP ringing

MARKS = [
    ("bitrix24.jpg",   "crm-bitrix.webp"),
    ("salesforce.png", "crm-salesforce.webp"),
    ("zoho.webp",      "crm-zoho.webp"),
]


def to_alpha(img):
    """Lift a white-backed mark into real alpha; pass through one that has it."""
    if img.mode in ("RGBA", "LA", "P"):
        rgba = img.convert("RGBA")
        if rgba.getextrema()[3][0] < 250:        # already has meaningful alpha
            return rgba
        img = rgba
    src = img.convert("RGB")
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


def ink_area(rgba):
    """Alpha-weighted pixel count — a mark's visual mass, not its bounding box."""
    return sum(rgba.getchannel("A").histogram()[i] * i for i in range(256)) / 255


def balance(rgba):
    """Scale that puts this mark at the same apparent size as its neighbours.

    Matching ink alone over-rewards outline marks: Zoho's four hollow squares
    carry a third of the ink of Bitrix24's solid wordmark across a far larger
    area, so equal-ink would blow the squares up. Matching bounding boxes alone
    does the reverse and shrinks any long wordmark to nothing. The geometric
    mean of the two lands where a designer's eye does.
    """
    by_ink = (TARGET_INK / ink_area(rgba)) ** 0.5
    by_box = (TARGET_BOX / (rgba.width * rgba.height)) ** 0.5
    return (by_ink * by_box) ** 0.5


def main():
    for name, out_name in MARKS:
        mark = to_alpha(Image.open(SRC / name))
        box = mark.getbbox()
        if box:
            mark = mark.crop(box)

        scale = min(balance(mark), CANVAS_H / mark.height)
        mark = mark.resize((max(1, round(mark.width * scale)),
                            max(1, round(mark.height * scale))), Image.LANCZOS)

        # One shared canvas height, natural width: the markup sets a single
        # CSS height and each mark lands at its balanced size, flush left.
        canvas = Image.new("RGBA", (mark.width, CANVAS_H), (0, 0, 0, 0))
        canvas.alpha_composite(mark, (0, (CANVAS_H - mark.height) // 2))
        path = IMG / out_name
        canvas.save(path, "WEBP", quality=92, method=6)
        print(f"  {out_name:22} {canvas.width}x{canvas.height}"
              f"  mark {mark.width}x{mark.height}  {path.stat().st_size / 1024:5.1f} KB")


if __name__ == "__main__":
    main()
