#!/usr/bin/env python3
"""R221 — THE ERASER ENGINE (v6): the single source of truth for cleaning.

Every consumer (apply_v6.py, census-mapkeys.py, hist-census.py, the
filter-repo rewrite callbacks) imports THIS module — no drift between the
tree fix, the census, and the history rewrite.

Engine v6 fixes over the R220 v5 engine:
  1. TRAILING-APOSTROPHE HOLE: R220's word lookahead (?![A-Za-z0-9']) let
     '...explicit dirrect' (typo + closing quote) escape BOTH the census and
     the apply — the exact mechanism behind the R220 straggler. v6 allows a
     trailing apostrophe; a leading one still blocks (contraction tails like
     don't stay protected).
  2. CITATION GUARD: map keys cited AS map documentation (key→value,
     key->value, key=>value, optionally quote-wrapped) are never replaced —
     the R220 round doc and worklog cite correction pairs and must keep them.
  3. ALREADY-CLEAN PHRASE GUARD: a phrase key that is a prefix of its own
     value ('are named differ' -> 'are named differently') would corrupt
     already-clean text into 'are named differentlyently'; v6 skips any
     phrase match whose continuation already spells the corrected tail.

IMPLEMENTATION (speed): the v5 engine ran a 1,333-alternative regex over
every text — O(text x alternatives), minutes per base64-heavy blob. The v6
engine tokenizes once (C-speed finditer) and does O(1) set lookups per word,
with the boundary/citation semantics enforced per token. Phrases run first
(longest-first, hint-pruned) exactly like v5's apply order.

The map itself lives at scripts/r220/_map_data.py (WORD_MAP + PHRASE_MAP,
FINAL v6 — the R221 audit removed the one key==value no-op entry).
"""
import re, os, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "r220"))
from _map_data import WORD_MAP, PHRASE_MAP

_TOKEN_RE = re.compile(r"[A-Za-z]+")
_KEYSET = {k.lower() for k in WORD_MAP}
_PREV_BLOCK = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'")
_NEXT_BLOCK = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

# ---------------------------------------------------------------------------
# THE CARRIER SET (shared by apply / census / hist-census / the rewrite):
# where owner chat text lives. The R220 round-doc carriers + the R220
# addendum's five late-found quote-carrying files + tool-results/ captures
# (committed tool-output copies of carrier content — they carry owner quotes).
# ---------------------------------------------------------------------------
CODE_CARRIERS = {
    "mini-services/review-gallery/report.ts",
    "mini-services/review-gallery/index.ts",
    "portable-workflows/review-gallery/report.ts",
    "portable-workflows/review-gallery/index.ts",
    "scripts/enforce-methodology.sh",
    ".gitignore",
    "scripts/antiai-check.mts",
    "scripts/r63-antiai-analysis.mts",
    "scripts/r64-verification.mts",
    "src/lib/auth/config.ts",
}
CARRIER_PREFIXES = ("docs/", "audits/", "agent-ctx/", "tool-results/")

def is_carrier(path):
    """The R221 carrier set (owner-chat-text paths)."""
    if path.startswith("docs/research/"): return False   # R219 corpus: vendor-doc evidence
    if path.startswith(CARRIER_PREFIXES): return True
    if path == "worklog.md": return True
    return path in CODE_CARRIERS

# phrases: compiled pattern with citation guard, replacement, corrected tail,
# and a hint word (its longest word) for fast pruning per blob
_PHRASE_TABLE = []
for _p in sorted(PHRASE_MAP, key=len, reverse=True):
    _val = PHRASE_MAP[_p]
    _tail = _val[len(_p):] if _val.lower().startswith(_p.lower()) else None
    _hint = max(re.findall(r"[A-Za-z]+", _p), key=len).lower()
    _PHRASE_TABLE.append((
        re.compile(re.escape(_p) + r"(?!(?:['\"])?(?:\u2192|->|=>))", re.IGNORECASE),
        _val, _tail, _hint))
_PHRASE_HINTS = {h for (_, _, _, h) in _PHRASE_TABLE}
_HINTSET = _KEYSET | _PHRASE_HINTS

# full-alternation regexes kept for callers that want them (census line work
# on small texts); the fast path below is used by clean_text/maybe_dirty
WORD_RE = re.compile(
    r"(?<![A-Za-z0-9'])(" + "|".join(re.escape(w) for w in sorted(WORD_MAP, key=len, reverse=True)) + r")(?![A-Za-z0-9])(?!(?:['\"])?(?:\u2192|->|=>))",
    re.IGNORECASE)
PHRASE_RE = re.compile(
    r"(" + "|".join(re.escape(p) for p in sorted(PHRASE_MAP, key=len, reverse=True)) + r")(?!(?:['\"])?(?:\u2192|->|=>))",
    re.IGNORECASE)

def preserve_case(src, repl):
    if src.isupper(): return repl.upper()
    if src[0].isupper(): return repl[0].upper() + repl[1:]
    return repl

def maybe_dirty(text):
    """Fast prefilter: does this text contain any map key / phrase hint?"""
    for w in _TOKEN_RE.findall(text):
        if w.lower() in _HINTSET:
            return True
    return False

def clean_text(text):
    """Apply the v6.1 map, ITERATED TO A FIXED POINT (max 4 rounds).
    One pass is not enough: a phrase replacement can leave behind (or newly
    expose) a shorter phrase/word match that only a subsequent round fixes
    (discovered on the R71 marker message: pass 1 created 'analysis e make',
    pass 2 fixed it). Rounds with no change stop the loop; 4 is the bound.
    Returns (cleaned_text, n_word, n_phrase)."""
    if not maybe_dirty(text):
        return text, 0, 0
    total_w = total_p = 0
    for _round in range(4):
        text, n_word, n_phrase = _clean_once(text)
        total_w += n_word; total_p += n_phrase
        if n_word == 0 and n_phrase == 0:
            break
    return text, total_w, total_p

def _clean_once(text):
    n_word = n_phrase = 0

    # ---- phrase pass first (longest-first, hint-pruned, guarded) ----
    tokset = {w.lower() for w in _TOKEN_RE.findall(text)}
    for pat, val, tail, hint in _PHRASE_TABLE:
        if hint not in tokset:
            continue
        out, i = [], 0
        while True:
            m = pat.search(text, i)
            if not m:
                out.append(text[i:]); break
            if tail is not None and text[m.end():m.end()+len(tail)].lower() == tail.lower():
                out.append(text[i:m.end()]); i = m.end(); continue  # already clean
            out.append(text[i:m.start()]); out.append(val)
            i = m.end(); n_phrase += 1
        text = "".join(out)

    # ---- word pass: tokenize + O(1) lookups, v6 boundary semantics ----
    out, last = [], 0
    for m in _TOKEN_RE.finditer(text):
        w = m.group(0)
        lw = w.lower()
        if lw not in _KEYSET:
            continue
        p, q = m.start(), m.end()
        if p > 0 and text[p-1] in _PREV_BLOCK:
            continue  # tail of a contraction / part of a larger token
        if q < len(text) and text[q] in _NEXT_BLOCK:
            continue  # inside a larger alphanumeric token
        rest = text[q:q+4]
        if rest.lstrip("'\"").startswith(("\u2192", "->", "=>")):
            continue  # cited as a correction pair — documentation
        out.append(text[last:p])
        out.append(preserve_case(w, WORD_MAP[lw]))
        last = q
        n_word += 1
    out.append(text[last:])
    return "".join(out), n_word, n_phrase
