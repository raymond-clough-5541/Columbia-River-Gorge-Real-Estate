#!/usr/bin/env python3
"""R221 — the filter-repo callback module (the second eraser's engine door).

Loaded by the git-filter-repo callbacks (blob + message). Gating:
  - BLOBS: only the pre-computed TARGET set (scripts/r221/hist-census.py —
    carrier-path blobs whose content changes under the v6.1 engine). Every
    other blob passes through byte-identical. Binary-safe via
    surrogateescape round-trip (no UTF-8 replacement corruption).
  - MESSAGES: every commit message passes through the v6.1 engine (the
    round markers quote the owner's asks; DR-35 cleaned from here on).
"""
import sys

sys.path.insert(0, "/home/z/my-project/scripts/r221")
sys.path.insert(0, "/home/z/my-project/scripts/r220")

_TARGETS = None

def _targets():
    global _TARGETS
    if _TARGETS is None:
        _TARGETS = set(l.strip() for l in open("/tmp/eraser-r221/target-oids.txt") if l.strip())
    return _TARGETS

def maybe_clean_blob(oid, data):
    """The blob-callback door: clean ONLY target blobs; all else untouched.
    (filter-repo hands original_id as BYTES — decode before the set lookup;
    the pass-1 no-op was exactly this bytes-vs-str mismatch, caught by the
    object-store scan and disclosed in the round doc.)"""
    if isinstance(oid, bytes):
        oid = oid.decode("ascii", errors="replace")
    if oid not in _targets():
        return data
    if b"\0" in data[:8192]:
        return data
    from engine import clean_text
    text = data.decode("utf-8", errors="surrogateescape")
    new, _, _ = clean_text(text)
    return new.encode("utf-8", errors="surrogateescape")

def clean_message(message):
    """The message-callback door: clean every commit message."""
    from engine import clean_text
    text = message.decode("utf-8", errors="surrogateescape")
    new, _, _ = clean_text(text)
    return new.encode("utf-8", errors="surrogateescape")
