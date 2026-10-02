#!/usr/bin/env python3
"""R221 — the HISTORY census: the exact rewrite target set.

Simulates the v6 engine over the repository's history:

  CARRIER blobs (docs/** minus docs/research/, worklog.md, audits/**,
  agent-ctx/**, the 5 quote-carrying code files) -> full engine; every blob
  whose content changes is a REWRITE TARGET (path-gated rewrite).

  NON-CARRIER text blobs (< 2 MB, not on excluded paths) -> prefilter + full
  engine for the completeness report: any blob here whose content would
  change is printed for the eyeball disposition (either an owner-quote
  carrier missed by the R220 path list -> promote to carrier, or legit
  content -> leave untouched, receipted).

  EXCLUDED-PATH-ONLY blobs (skills/design/**, skills/gaokao/**, market
  research sets, docs/research/** — the R220-documented non-owner-content
  exclusions) and non-carrier blobs >= 2 MB (design templates, PDFs,
  binaries) are never requested from the object store — listed by count in
  the report. The rewrite can never touch them (path-gated target set).

Output:
  /tmp/eraser-r221/target-oids.txt   one oid per line (the rewrite gate set)
  /tmp/eraser-r221/hist-census.md    the full receipt
"""
import subprocess, re, os, sys, collections, threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import clean_text, maybe_dirty, is_carrier, CARRIER_PREFIXES, CODE_CARRIERS

EXCLUDED_PATHS = ("skills/design/", "skills/gaokao/", "skills/market-research/",
                  "portable-skills/market-research/", "docs/research/",
                  "data/disposable-domains.txt")
MAX_NONCARRIER = 2 * 1024 * 1024  # 2 MB

def main():
    # 1) oid -> set(paths) across all history
    print("mapping paths (git log --all --raw)...")
    raw = subprocess.run(["git","log","--all","--raw","--format=%H","--no-renames","--no-abbrev"],
                         capture_output=True, text=True).stdout
    oid_paths = collections.defaultdict(set)
    for ln in raw.split("\n"):
        if not ln.startswith(":"): continue
        m = re.match(r"^:(\d+) (\d+) ([0-9a-f]+) ([0-9a-f]+) ([A-Z])\t(.+)$", ln)
        if not m: continue
        src, dst, status, path = m.group(3), m.group(4), m.group(5), m.group(6)
        is_zero = lambda s: set(s) == {"0"}
        if not is_zero(src): oid_paths[src].add(path)
        if not is_zero(dst) and status != "D": oid_paths[dst].add(path)
    print(f"path-bearing blobs: {len(oid_paths)}")

    # 2) classify + size-check (cheap batch-check, no content transfer)
    p = subprocess.run(["git","cat-file","--batch-check"], input="\n".join(sorted(oid_paths)),
                       capture_output=True, text=True)
    oid_size = {}
    for l in p.stdout.split("\n"):
        parts = l.split()
        if len(parts) == 3 and parts[1] != "missing":
            oid_size[parts[0]] = int(parts[2])
    carrier_oids, noncarrier_oids, excluded, oversize = set(), set(), 0, []
    for oid, paths in oid_paths.items():
        sz = oid_size.get(oid, 0)
        if any(is_carrier(pp) for pp in paths):
            carrier_oids.add(oid)
        elif all(pp.startswith(EXCLUDED_PATHS) for pp in paths):
            excluded += 1
        elif sz > MAX_NONCARRIER:
            oversize.append((oid, sz, sorted(paths)[:2]))
        else:
            noncarrier_oids.add(oid)
    print(f"carrier blobs: {len(carrier_oids)}  non-carrier text blobs: {len(noncarrier_oids)}"
          f"  excluded-path: {excluded}  oversize non-carrier: {len(oversize)}")

    # 3) read the needed blobs only
    need = sorted(carrier_oids | noncarrier_oids)
    proc = subprocess.Popen(["git","cat-file","--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    out = {}
    def reader():
        for _ in range(len(need)):
            hdr = proc.stdout.readline().decode()
            if not hdr: break
            parts = hdr.strip().split(" ", 2)
            if len(parts) < 3 or parts[1] == "missing": continue
            oid, _, sz = parts
            data = proc.stdout.read(int(sz))
            proc.stdout.read(1)
            out[oid] = data
    t = threading.Thread(target=reader); t.start()
    for oid in need:
        proc.stdin.write((oid + "\n").encode())
    proc.stdin.close(); t.join()
    print(f"read {len(out)} blobs")

    # 4) engine: carrier -> targets; non-carrier -> completeness report
    targets, per_path = set(), collections.Counter()
    n_word = n_phrase = 0
    noncarrier_changed = []
    for oid in sorted(carrier_oids):
        data = out.get(oid)
        if data is None or b"\0" in data[:8192]: continue
        text = data.decode("utf-8", errors="replace")
        new, nw, np_ = clean_text(text)
        if new != text:
            targets.add(oid); n_word += nw; n_phrase += np_
            for pp in oid_paths[oid]:
                if is_carrier(pp): per_path[pp] += 1
    for oid in sorted(noncarrier_oids):
        data = out.get(oid)
        if data is None or b"\0" in data[:8192]: continue
        text = data.decode("utf-8", errors="replace")
        if not maybe_dirty(text): continue
        new, nw, np_ = clean_text(text)
        if new != text:
            noncarrier_changed.append((oid, sorted(oid_paths[oid])[:3], nw, np_))

    # 5) receipts
    os.makedirs("/tmp/eraser-r221", exist_ok=True)
    with open("/tmp/eraser-r221/target-oids.txt","w") as f:
        f.write("\n".join(sorted(targets)) + ("\n" if targets else ""))
    rep = open("/tmp/eraser-r221/hist-census.md","w")
    rep.write("# R221 history census (the rewrite target set)\n\n")
    rep.write(f"- path-bearing blobs: {len(oid_paths)}\n")
    rep.write(f"- carrier blobs: {len(carrier_oids)} -> REWRITE TARGETS: {len(targets)}\n")
    rep.write(f"- simulated replacements: {n_word} word + {n_phrase} phrase\n")
    rep.write(f"- excluded-path-only blobs (never requested): {excluded}\n")
    rep.write(f"- oversize non-carrier blobs (never requested): {len(oversize)}\n")
    rep.write(f"- non-carrier blobs whose content WOULD change: {len(noncarrier_changed)}\n\n")
    rep.write("## Target blobs per carrier path (top 40)\n\n")
    for pp, c in per_path.most_common(40):
        rep.write(f"- {c:5d}  {pp}\n")
    rep.write("\n## Non-carrier would-change blobs (eyeball disposition)\n\n")
    for oid, paths, nw, np_ in noncarrier_changed[:80]:
        rep.write(f"- {oid[:12]} w{nw}/p{np_} {paths}\n")
    rep.write("\n## Oversize non-carrier blobs skipped (list)\n\n")
    for oid, sz, paths in oversize[:20]:
        rep.write(f"- {oid[:12]} {sz//1024}KB {paths}\n")
    rep.close()
    print(f"TARGETS: {len(targets)}  (word {n_word} / phrase {n_phrase})")
    print(f"non-carrier would-change: {len(noncarrier_changed)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
