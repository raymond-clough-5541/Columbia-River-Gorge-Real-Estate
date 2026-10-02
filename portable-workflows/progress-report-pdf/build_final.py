#!/usr/bin/env python3
"""Merge cover.pdf (page 0) + body.pdf -> final PDF, normalized to A4."""
import os
from pypdf import PdfReader, PdfWriter

HERE = os.path.dirname(os.path.abspath(__file__))
COVER = os.path.join(HERE, "cover.pdf")
BODY = os.path.join(HERE, "body.pdf")
OUT = os.path.join(os.environ.get("REPORT_OUT_DIR", HERE), "final.pdf")

A4_W, A4_H = 595.28, 841.89


def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
    return page


writer = PdfWriter()
writer.add_page(normalize_page_to_a4(PdfReader(COVER).pages[0]))
for page in PdfReader(BODY).pages:
    writer.add_page(normalize_page_to_a4(page))
writer.add_metadata({
    "/Title": os.environ.get("REPORT_TITLE", "Free Trader - Progress Report"),
    "/Author": "Z.ai",
    "/Creator": "Z.ai",
    "/Subject": "Plain-language progress report for the Free Trader "
                "neighborhood marketplace project (portable PDF edition)",
})
with open(OUT, "wb") as f:
    writer.write(f)

r = PdfReader(OUT)
print("final.pdf pages:", len(r.pages))
for i, p in enumerate(r.pages[:3]):
    print("  page", i, round(float(p.mediabox.width), 1), "x",
          round(float(p.mediabox.height), 1))
