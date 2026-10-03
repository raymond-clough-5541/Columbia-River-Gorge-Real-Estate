#!/usr/bin/env python3
"""R221 — the map-key census over the working tree (the definitive clean-tree check).

The R220 census searched for STRONG signature tokens — which is why stragglers
like 'dirrect' (a map key that never made the STRONG list) survived: the span
carried no STRONG token, so it was never flagged, and the final apply pass
never re-ran over it.

This census instead scans EVERY tracked text file for EVERY map key (word map,
word-boundary, case-insensitive; phrase map, literal) and reports every hit
outside the ALLOWED contexts:
  - scripts/r220/** + scripts/r221/**  (the eraser tooling — the keys ARE the data)
  - key=>value / key→value citation pairs (documentation of the map)
Everything else is a MISS of the first eraser -> to fix before the history purge.
Exit code 1 on any non-allowed hit (CI-able).
"""
import subprocess, re, os, sys, bisect

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import WORD_RE, PHRASE_RE  # the v6 engine — guarded regexes, single source

TEXT_EXT = {".md",".ts",".tsx",".js",".jsx",".mjs",".cjs",".py",".sh",".json",".txt",".yml",".yaml",".html",".css",".sql",".env",".prisma",".mts"}
TOOLING = ("scripts/r220/", "scripts/r221/")
# The R220-documented non-owner-content exclusions (legit domains, design
# templates/pinyin, gaokao, market-research, the R219 evidence corpus):
EXCLUDE = ("data/disposable-domains.txt", "skills/design/", "skills/gaokao/",
           "skills/market-research/", "portable-skills/market-research/", "docs/research/")

def line_of(offsets, pos):
    return bisect.bisect_right(offsets, pos)

def main():
    tracked = subprocess.run(["git","ls-files"], capture_output=True, text=True).stdout.splitlines()
    misses = []
    for f in tracked:
        ext = "." + f.rsplit(".",1)[-1].lower() if "." in f else ""
        if ext not in TEXT_EXT: continue
        if f.startswith(TOOLING): continue
        if f.startswith(EXCLUDE): continue
        try: text = open(f, encoding="utf-8", errors="replace").read()
        except Exception: continue
        # line-start offsets for line numbering
        offs = [0]
        for i, ch in enumerate(text):
            if ch == "\n": offs.append(i+1)
        line_hits = {}  # lineno -> set(keys)
        for m in WORD_RE.finditer(text):
            after = text[m.end():m.end()+4]
            before = text[max(0,m.start()-2):m.start()]
            # citation forms: key=>value, key→value, 'key': 'value', "key": "value", key': 'value
            if after.startswith("=>") or after.startswith("\u2192") or after.startswith("\u2014") \
               or (after.startswith("':") and before.endswith("'")) \
               or (after.startswith('":') and before.endswith('"')) \
               or after.startswith("': '") :
                continue
            ln = line_of(offs, m.start())
            line_hits.setdefault(ln, set()).add(m.group(1).lower())
        for m in PHRASE_RE.finditer(text):
            # already-clean guard: a phrase key that is a prefix of its value
            # ('are named differ' inside 'are named differently') is NOT a hit
            from engine import PHRASE_MAP
            val = PHRASE_MAP.get(m.group(1)) or PHRASE_MAP.get(m.group(1).lower())
            if val and val.lower().startswith(m.group(1).lower()) \
               and text[m.end():m.end()+len(val)-len(m.group(1))].lower() == val[len(m.group(1)):].lower():
                continue
            ln = line_of(offs, m.start())
            line_hits.setdefault(ln, set()).add("PHRASE:" + m.group(1).lower())
        if not line_hits: continue
        lines = text.split("\n")
        for ln in sorted(line_hits):
            misses.append((f, ln, sorted(line_hits[ln]), lines[ln-1].strip()[:220]))
    print(f"MAP-KEY CENSUS: {len(misses)} hit lines outside tooling")
    for f, n, keys, ln in misses:
        print(f"  {f}:{n}  {keys}")
        print(f"      {ln}")
    return 1 if misses else 0

if __name__ == "__main__":
    sys.exit(main())
