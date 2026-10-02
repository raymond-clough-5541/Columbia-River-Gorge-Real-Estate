#!/usr/bin/env python3
"""R221 — apply_v6: the straggler-fixing apply pass (the R220 apply, engine-fixed).

Two engine defects in the R220 apply/census regex are fixed here:
  1. THE TRAILING-APOSTROPHE HOLE: the R220 word regex ended with the
     lookahead (?![A-Za-z0-9']) — an apostrophe after the typo (a closing
     single-quote, e.g. ...explicit dirrect') BLOCKED the match. That is the
     exact mechanism by which 'dirrect' survived the first eraser inside
     scripts/enforce-methodology.sh CHECK 8. Fixed: lookahead (?![A-Za-z0-9]).
  2. THE SELF-CORRUCTING PHRASE: the phrase key 'are named differ' is a prefix
     of its own value ('are named differently') — applied to already-clean
     text it would produce 'are named differentlyently'. Fixed: the
     already-clean guard skips any phrase match whose continuation already
     spells the corrected form.

Scope: CARRIERS ONLY (the R220 round-doc carrier set — docs/** minus
docs/research/**, worklog.md, audits/**, agent-ctx/**, and the 5
quote-carrying code files). Non-carrier text files are never touched
(the R220 over-reach lesson).

Modes: default = DRY RUN (prints what would change). --apply = write.
Receipt: per-file changed-run counts printed; exit 1 if a dry run found work.
"""
import subprocess, re, os, sys, difflib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import clean_text, is_carrier  # the v6.1 engine + shared carrier set

APPLY = "--apply" in sys.argv

TEXT_EXT = {".md",".ts",".tsx",".js",".jsx",".mjs",".cjs",".py",".sh",".json",".txt",".yml",".yaml",".html",".css",".sql",".env",".prisma",".mts"}

# v6 engine: imported from engine.py (the trailing-apostrophe fix, the
# citation guard, and the already-clean phrase guard live there).

def main():
    tracked = subprocess.run(["git","ls-files"], capture_output=True, text=True).stdout.splitlines()
    carriers = []
    for f in tracked:
        ext = "." + f.rsplit(".",1)[-1].lower() if "." in f else ""
        if ext not in TEXT_EXT: continue
        if f == "data/disposable-domains.txt": continue
        if is_carrier(f):
            carriers.append(f)
    changed = 0
    for f in sorted(carriers):
        try: text = open(f, encoding="utf-8").read()
        except Exception as e:
            print(f"  SKIP {f}: {e}"); continue
        new, nw, np_ = clean_text(text)
        if new != text:
            d = sum(1 for op in difflib.SequenceMatcher(None, text.split(), new.split()).get_opcodes() if op[0] != "equal")
            print(f"  {'APPLIED' if APPLY else 'WOULD FIX'} {f}: +{nw} word fixes, +{np_} phrase fixes (~{d} runs)")
            if APPLY:
                open(f, "w", encoding="utf-8").write(new)
            changed += 1
    print(f"\ncarriers scanned: {len(carriers)}   files {'changed' if APPLY else 'with work'}: {changed}")
    if changed and not APPLY:
        print("DRY RUN — re-run with --apply to write")
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
