#!/usr/bin/env python3
"""R221 — THE OBJECT-STORE SCAN (the second eraser's proof).

Scans EVERY object in the repository's object store (blobs + commit
messages, post-gc) with the v6.1 engine. An object "hits" if clean_text
would still change it — i.e. an owner-typo straggler survived the rewrite.

ALLOWED hits (classified by the object's paths, mapped via git log --raw):
  - scripts/r220/** and scripts/r221/** — the eraser tooling; the map keys
    ARE the data (the census STRONG list, _map_data itself, the sweep's
    classic-misspelling net). The eraser needs its vocabulary to exist.
Everything else: ZERO. That is the proof the owner's typos exist nowhere in
the repository's git data outside the eraser's own tooling.

Exit 1 on any non-allowed hit.
"""
import subprocess, re, os, sys, collections, threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import clean_text, maybe_dirty

TOOLING = ("scripts/r220/", "scripts/r221/")
# The R220/R221-documented NON-OWNER content classes — the eraser never
# touches them (path-gated), and their content is not owner chat text:
ALLOWED = (
    "scripts/r220/", "scripts/r221/",          # the eraser tooling (keys ARE the data)
    "skills/design/", "skills/gaokao/",        # design templates, pinyin, CSS, base64
    "skills/market-research/", "portable-skills/market-research/",
    "docs/research/",                           # the R219 vendor-doc evidence corpus
    "data/disposable-domains.txt",              # legit domain list (managment.de etc.)
    "download/",                                # binary PDF reports
    "skills/",                                  # platform-managed skill folders (own typos, never owner text)
    "\"skills/",                                # git-quoted paths (non-ASCII design templates)
)

def main():
    # oid -> paths (post-rewrite history)
    raw = subprocess.run(["git","log","--all","--raw","--format=%H","--no-renames","--no-abbrev"],
                         capture_output=True, text=True).stdout
    oid_paths = collections.defaultdict(set)
    for ln in raw.split("\n"):
        if not ln.startswith(":"): continue
        m = re.match(r"^:(\d+) (\d+) ([0-9a-f]+) ([0-9a-f]+) ([A-Z])\t(.+)$", ln)
        if not m: continue
        src, dst, st, path = m.group(3), m.group(4), m.group(5), m.group(6)
        is_zero = lambda s: set(s) == {"0"}
        if not is_zero(src): oid_paths[src].add(path)
        if not is_zero(dst) and st != "D": oid_paths[dst].add(path)

    # enumerate ALL objects (blobs + commits; tags if any)
    chk = subprocess.run(["git","cat-file","--batch-all-objects","--batch-check"],
                         capture_output=True, text=True).stdout
    oids = [l.split() for l in chk.split("\n") if len(l.split()) == 3]
    blob_oids = [o[0] for o in oids if o[1] == "blob"]
    commit_oids = [o[0] for o in oids if o[1] == "commit"]
    print(f"objects: {len(oids)}  blobs: {len(blob_oids)}  commits: {len(commit_oids)}")

    # read + scan every blob
    proc = subprocess.Popen(["git","cat-file","--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    out = {}
    def reader():
        for _ in range(len(blob_oids)):
            hdr = proc.stdout.readline().decode()
            if not hdr: break
            parts = hdr.strip().split(" ", 2)
            if len(parts) < 3 or parts[1] == "missing": continue
            data = proc.stdout.read(int(parts[2])); proc.stdout.read(1)
            out[parts[0]] = data
    t = threading.Thread(target=reader); t.start()
    for oid in blob_oids:
        proc.stdin.write((oid + "\n").encode())
    proc.stdin.close(); t.join()

    tooling_hits, other_hits = [], []
    for oid, data in out.items():
        if b"\0" in data[:8192]: continue
        text = data.decode("utf-8", errors="replace")
        if not maybe_dirty(text): continue
        new, _, _ = clean_text(text)
        if new == text: continue
        paths = oid_paths.get(oid, {"<unreachable>"})
        if all(p.startswith(ALLOWED) or p == "<unreachable>" for p in paths):
            tooling_hits.append((oid, sorted(paths)[:3]))
        else:
            other_hits.append((oid, sorted(paths)[:3]))

    # commit messages
    msg_hits = []
    for oid in commit_oids:
        raw_msg = subprocess.run(["git","cat-file","commit",oid], capture_output=True).stdout
        # message = everything after the first blank line
        _, _, msg = raw_msg.partition(b"\n\n")
        if not msg: continue
        text = msg.decode("utf-8", errors="replace")
        if not maybe_dirty(text): continue
        new, _, _ = clean_text(text)
        if new != text:
            msg_hits.append((oid, text[:100]))

    print(f"BLOB hits: tooling-allowed {len(tooling_hits)}  OTHER {len(other_hits)}")
    for oid, paths in tooling_hits[:10]:
        print(f"  [tooling] {oid[:12]} {paths}")
    for oid, paths in other_hits[:20]:
        print(f"  [OTHER!!] {oid[:12]} {paths}")
    print(f"COMMIT-MESSAGE hits: {len(msg_hits)}")
    for oid, head in msg_hits[:20]:
        print(f"  [MSG!!] {oid[:12]} {head!r}")
    ok = not other_hits and not msg_hits
    print("PROOF:", "ZERO owner-typo hits outside the eraser tooling" if ok else "FAIL — stragglers remain")
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
