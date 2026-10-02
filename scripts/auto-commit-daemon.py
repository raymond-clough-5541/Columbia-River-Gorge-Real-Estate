#!/usr/bin/env python3
"""
Auto-commit daemon — a STANDALONE file-watcher that commits work-in-progress
to git periodically. NOT a cron job. Entirely separate from the post-commit
auto-push hook (which fires AFTER a commit succeeds — see
scripts/git-hooks/post-commit).

Design (the "entirely separated, standalone tools" the user mandated):
  ┌──────────────────────────┐   commit    ┌──────────────────────────┐
  │ auto-commit-daemon.py    │ ──────────► │ git commit on main       │
  │ (file-watcher, no cron)  │             │ (normal flow, gitleaks +  │
  │ does NOT push            │             │  methodology gates fire)  │
  └──────────────────────────┘             └────────────┬─────────────┘
                                                        │ commit succeeds
                                                        ▼
                                           ┌──────────────────────────┐
                                           │ post-commit hook         │
                                           │ (git hook, no cron)     │
                                           │ pushes to github +      │
                                           │ codeberg — separate tool │
                                           └──────────────────────────┘

  The daemon never calls `git push`. The hook never auto-commits.
  The daemon's job ends at `git commit`; the hook's job begins at the
  commit succeeding.

Behavior:
  - Polls `git status --porcelain` every POLL_INTERVAL seconds (default 15s).
  - Debounces: waits QUIET_PERIOD seconds (default 60s) of STABLE status —
    no new file writes — before committing. This avoids committing half-saved
    editor states.
  - MAX-AGE FORCE SAVE (R100, rollback lesson #5): if changes have been
    sitting uncommitted for MAX_AGE seconds (default 600s = 10 min), the
    daemon commits EVEN IF the status is still churning. Continuous
    editing used to starve saves forever (the debounce kept resetting) —
    this guarantees multiple saves per session no matter how busy it gets.
  - SCOPE=all (R100 default, was "docs"): stages EVERYTHING except noise
    (.pid files, .zscripts/ runtime churn). Docs-only changes commit via
    the normal gate path; anything touching non-docs files commits via
    CHECKPOINT MODE: the daemon sets METHODOLOGY_CHECKPOINT=1 + a literal
    [checkpoint] message token, and scripts/enforce-methodology.sh skips
    the round-end attestation checks (approval/scope/battery tokens) for
    that commit ONLY. gitleaks STILL RUNS (separate hook). Round-end
    commits are unaffected — they never set the env var.
  - Commit message includes [worklog: auto-commit-daemon] (a permanent
    Task ID in worklog.md) so CHECK 5 passes on the docs-only path.
  - Never uses --no-verify (respects pre-commit + commit-msg hooks including
    gitleaks secret scanning).
  - Never pushes (the post-commit hook does that — entirely separate tool).
  - Skips a poll cycle whenever .git/index.lock exists (another git
    operation is in flight — no racing the agent's own commits).
  - Double-fork detach pattern (re-parented to PID 1 / tini, survives
    across Bash-tool process reaps — same pattern as scripts/dev-daemon.py).

Logging:
  - All activity to logs/auto-commit.log
  - PID file at .auto-commit.pid

CRON-JOB-POLICY:
  This is NOT a cron job. It is a long-running file-watcher daemon, started
  manually (scripts/start-auto-commit.sh) and stopped manually
  (scripts/stop-auto-commit.sh). No `cron` tool calls; no `webDevReview`
  job; no `fixed_rate`/`cron` schedule types. The user explicitly authorized
  this approach: "re-enabling an auto-commit mechanism without cron job;
  they are supposed to be entirely separated; standalone tools".

Usage:
  python3 scripts/auto-commit-daemon.py            # foreground (debug)
  python3 scripts/auto-commit-daemon.py --daemon    # background daemon
  bash scripts/start-auto-commit.sh                 # background (production)
  bash scripts/stop-auto-commit.sh                  # stop

Environment variables (all optional):
  AUTOCOMMIT_POLL       seconds between status polls (default 15)
  AUTOCOMMIT_QUIET      seconds of stable status before commit (default 60)
  AUTOCOMMIT_SCOPE      "all" (default, R100) or "docs"
  AUTOCOMMIT_MAX_AGE    force-commit age in seconds (default 600)
  AUTOCOMMIT_DRY_RUN    "1" to log actions without staging/committing
  AUTOCOMMIT_MIN_FILES  minimum changed files to commit (default 1)
"""
import os
import sys
import time
import subprocess
import hashlib
import signal

# ── Config (env-overridable) ────────────────────────────────────────────────
POLL_INTERVAL = int(os.environ.get("AUTOCOMMIT_POLL", "15"))
QUIET_PERIOD = int(os.environ.get("AUTOCOMMIT_QUIET", "60"))
# R100: default scope is ALL — the daemon must save src/ work too (the
# docs-only default is exactly how the R96-local re-derivation got lost).
SCOPE = os.environ.get("AUTOCOMMIT_SCOPE", "all")
# R100: force-commit age — continuous editing must not starve saves.
MAX_AGE = int(os.environ.get("AUTOCOMMIT_MAX_AGE", "600"))
DRY_RUN = os.environ.get("AUTOCOMMIT_DRY_RUN", "0") == "1"
MIN_FILES = int(os.environ.get("AUTOCOMMIT_MIN_FILES", "1"))

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_FILE = f"{PROJECT_ROOT}/logs/auto-commit.log"
PID_FILE = f"{PROJECT_ROOT}/.auto-commit.pid"
WORKLOG_TASK_ID = "auto-commit-daemon"

# Set True by daemonize(): after the double-fork, stdout/stderr point at
# LOG_FILE, so log() must not ALSO print (that duplicated every line).
DAEMONIZED = False

# Safe file patterns — these pass the methodology gate (DOCS_ONLY bypass)
# without an approval token. They MUST stay docs/configs only.
SAFE_PATTERNS = [
    "docs/",                  # all documentation
    ".gitignore",
    "LICENSE",
    "worklog.md",
]
# Any .md anywhere is docs
SAFE_SUFFIXES = [".md"]

# R100: never staged by the daemon — runtime churn that would produce
# checkpoint noise without protecting any real work.
EXCLUDE_SUFFIXES = [".pid"]
EXCLUDE_PREFIXES = [".zscripts/"]


def log(msg):
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    line = f"[{ts}] {msg}"
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass
    # also print to stdout if foreground (in daemon mode stdout IS the
    # log file — printing here would duplicate every line)
    if not DAEMONIZED:
        print(line, flush=True)


def git(args, check=True, env=None):
    cmd = ["git", "-C", PROJECT_ROOT] + args
    run_env = dict(os.environ)
    if env:
        run_env.update(env)
    result = subprocess.run(cmd, capture_output=True, text=True, env=run_env)
    if check and result.returncode != 0:
        raise RuntimeError(
            f"git {' '.join(args)} failed (rc={result.returncode}): "
            f"stderr={result.stderr.strip()[:400]}"
        )
    return result


def get_status():
    """Return list of (status, path) tuples for changed files."""
    r = git(["status", "--porcelain"])
    files = []
    for line in r.stdout.splitlines():
        if not line.strip():
            continue
        status = line[:2]
        path = line[3:]
        # Strip surrounding quotes (git uses them for paths with special chars)
        if path.startswith('"') and path.endswith('"'):
            path = path[1:-1]
        files.append((status, path))
    return files


def is_safe(path):
    """True if the path passes the methodology DOCS_ONLY bypass."""
    for pat in SAFE_PATTERNS:
        if path.startswith(pat) or path == pat:
            return True
    for suf in SAFE_SUFFIXES:
        if path.endswith(suf):
            return True
    return False


def is_excluded(path):
    """True if the path is runtime noise the daemon never stages."""
    for suf in EXCLUDE_SUFFIXES:
        if path.endswith(suf):
            return True
    for pref in EXCLUDE_PREFIXES:
        if path.startswith(pref):
            return True
    return False


def status_hash(files):
    """Stable hash of the current status — used to detect 'stable' periods."""
    h = hashlib.sha1()
    for status, path in sorted(files):
        h.update(f"{status} {path}\n".encode())
    return h.hexdigest()


def do_commit(files):
    """Stage committable files + commit. Returns True on success.

    R100: two commit paths —
      - docs-only staged set → normal gate path (DOCS_ONLY bypass +
        [worklog: auto-commit-daemon] token; full methodology applies).
      - anything else       → CHECKPOINT path: METHODOLOGY_CHECKPOINT=1 env
        + [checkpoint] message token; enforce-methodology.sh skips the
        round-end attestation checks for this commit only (gitleaks still
        runs — separate hook). This is what saves src/ work mid-round.
    """
    # Determine which files to stage (exclusions are never staged)
    if SCOPE == "all":
        to_stage = [p for s, p in files if not is_excluded(p)]
    else:  # "docs"
        to_stage = [p for s, p in files if is_safe(p) and not is_excluded(p)]

    if not to_stage:
        log(f"no committable files (scope={SCOPE}); "
            f"{len(files)} changed file(s) left for manual commit")
        return False

    if len(to_stage) < MIN_FILES:
        log(f"only {len(to_stage)} committable file(s) (< MIN_FILES={MIN_FILES}); skipping")
        return False

    # Stage each committable file
    staged = []
    for path in to_stage:
        if DRY_RUN:
            log(f"[dry-run] would stage: {path}")
            staged.append(path)
            continue
        try:
            git(["add", "--", path])
            staged.append(path)
        except RuntimeError as e:
            log(f"failed to stage {path}: {e}")
            continue

    if not staged:
        log("nothing staged after `git add` — skipping")
        return False

    # Verify something is actually staged (git add respects .gitignore)
    r = git(["diff", "--cached", "--name-only"])
    actually_staged = [l for l in r.stdout.splitlines() if l.strip()]
    if not actually_staged:
        log("nothing actually staged (likely .gitignore) — skipping")
        return False

    # R100: checkpoint path if anything staged is beyond the docs-safe set.
    checkpoint = any(not is_safe(p) for p in actually_staged)

    # Build commit message — includes [worklog: auto-commit-daemon] so
    # methodology CHECK 5 passes on the docs-only path, and the literal
    # [checkpoint] token when riding the checkpoint path.
    file_list = ", ".join(actually_staged[:5])
    if len(actually_staged) > 5:
        file_list += f" (+{len(actually_staged)-5} more)"
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    kind = "checkpoint" if checkpoint else "auto-commit"
    msg = (
        f"{kind}: {ts} — {len(actually_staged)} files ({file_list})\n\n"
        f"[worklog: {WORKLOG_TASK_ID}] "
        + ("[checkpoint] WIP auto-save (crash protection, not a round-end "
           "attestation — the full methodology gate applies to round commits). "
           if checkpoint else "")
        + f"Generated by scripts/auto-commit-daemon.py "
        f"(standalone file-watcher, NOT a cron job). "
        f"Pushes via the post-commit hook (separate tool). "
        f"Scope={SCOPE}; quiet={QUIET_PERIOD}s; max-age={MAX_AGE}s."
    )

    if DRY_RUN:
        log(f"[dry-run] would commit ({kind}) {len(actually_staged)} files: {file_list}")
        # Unstage to keep working tree clean for next round
        try:
            git(["reset", "--"] + actually_staged, check=False)
        except Exception:
            pass
        return True

    # Commit (normal flow — pre-commit + commit-msg hooks fire, including
    # gitleaks on both paths). NEVER use --no-verify.
    commit_env = {"METHODOLOGY_CHECKPOINT": "1"} if checkpoint else None
    r = git(["commit", "-m", msg], check=False, env=commit_env)
    if r.returncode != 0:
        log(f"commit FAILED ({'checkpoint' if checkpoint else 'docs'} path — "
            f"gate or gitleaks rejected) — leaving staged for manual review")
        log(f"  stderr: {r.stderr.strip()[:500]}")
        log(f"  stdout: {r.stdout.strip()[:500]}")
        # Unstage so the next poll doesn't immediately retry the same failing
        # commit (it will retry if the user changes anything else).
        try:
            git(["reset", "--"] + actually_staged, check=False)
        except Exception:
            pass
        return False

    # Capture the commit hash
    r2 = git(["rev-parse", "HEAD"])
    head = r2.stdout.strip()
    short = head[:7] if head else "?"
    log(f"committed {short} ({kind}) — {len(actually_staged)} files ({file_list}); "
        f"post-commit hook will push")
    return True


def main_loop():
    log(f"auto-commit daemon started — poll={POLL_INTERVAL}s "
        f"quiet={QUIET_PERIOD}s max_age={MAX_AGE}s scope={SCOPE} "
        f"dry_run={DRY_RUN} min_files={MIN_FILES}")

    # Graceful shutdown on SIGTERM (sent by scripts/stop-auto-commit.sh).
    # Removes the PID file + logs the exit so the stop is observable.
    def _sigterm(_signo, _frame):
        log("received SIGTERM — shutting down gracefully")
        try:
            os.remove(PID_FILE)
        except FileNotFoundError:
            pass
        sys.exit(0)
    signal.signal(signal.SIGTERM, _sigterm)

    last_hash = None
    last_change_time = time.time()
    last_commit_time = 0.0
    first_dirty_time = None   # when the current dirty state began (max-age clock)
    # Cooldown after a successful commit to avoid tight loops
    COOLDOWN = max(QUIET_PERIOD, 30)

    while True:
        try:
            # R100: never race an in-flight git operation (the agent's own
            # add/commit/rebase between polls). Skip the cycle entirely.
            if os.path.exists(os.path.join(PROJECT_ROOT, ".git", "index.lock")):
                time.sleep(POLL_INTERVAL)
                continue

            # R222: the self-healing GitHub PAT drop-file. If the owner
            # dropped a fresh token into upload/GITHUB-PAT.txt, apply it now
            # (validate + re-point remotes) — so pushes heal even when no
            # files are dirty and no commit fires. Cheap check (one stat);
            # the refresh script renames the file on success/rejection so
            # this never loops on the same drop.
            for _drop in ("upload/GITHUB-PAT.txt", "upload/github-pat.txt"):
                if os.path.exists(os.path.join(PROJECT_ROOT, _drop)):
                    log(f"GITHUB-PAT drop-file detected ({_drop}) — "
                        f"running scripts/github-pat-refresh.sh")
                    try:
                        subprocess.run(
                            ["bash", os.path.join(PROJECT_ROOT, "scripts",
                                                  "github-pat-refresh.sh")],
                            cwd=PROJECT_ROOT, timeout=120,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    except Exception as _e:  # never kill the daemon over this
                        log(f"github-pat-refresh.sh error (non-fatal): {_e}")
                    break

            files = get_status()
            committable = [f for f in files if not is_excluded(f[1])]
            if not committable:
                # Working tree clean (or only excluded noise) — reset everything
                last_hash = None
                last_change_time = time.time()
                first_dirty_time = None
                time.sleep(POLL_INTERVAL)
                continue

            now = time.time()
            if first_dirty_time is None:
                first_dirty_time = now

            current_hash = status_hash(files)
            if current_hash != last_hash:
                # Status changed — reset the debounce timer (but NOT the
                # max-age clock: continuous editing must not starve saves).
                last_hash = current_hash
                last_change_time = now

            age = now - first_dirty_time
            quiet_elapsed = now - last_change_time
            cooldown_elapsed = now - last_commit_time
            quiet_ok = quiet_elapsed >= QUIET_PERIOD
            age_ok = age >= MAX_AGE          # force save despite churn
            cooldown_ok = cooldown_elapsed >= COOLDOWN

            if not (quiet_ok or age_ok):
                time.sleep(POLL_INTERVAL)
                continue
            if not (cooldown_ok or age_ok):  # max-age outranks cooldown too —
                time.sleep(POLL_INTERVAL)    # crash protection comes first
                continue

            if age_ok and not quiet_ok:
                log(f"max-age force save: changes {int(age)}s old "
                    f"(>= {MAX_AGE}s) despite churn — committing")

            # Quiet period elapsed (or max-age forced) — commit
            committed = do_commit(files)
            last_hash = None
            last_change_time = time.time()
            first_dirty_time = None
            if committed:
                last_commit_time = time.time()

            time.sleep(POLL_INTERVAL)
        except Exception as e:
            log(f"ERROR in main loop: {e}")
            time.sleep(POLL_INTERVAL)


def daemonize():
    """Double-fork detach pattern — re-parent to PID 1, survive Bash-tool reaps.
    Same pattern as scripts/dev-daemon.py (proven across Bash-tool reaps).

    NOTE: we only ignore SIGHUP (terminal hangup), NOT SIGTERM — the stop
    script (scripts/stop-auto-commit.sh) sends SIGTERM for graceful shutdown.
    """
    # Step 1: first fork — parent exits so the calling Bash returns
    try:
        pid = os.fork()
    except OSError as e:
        sys.stderr.write(f"first fork failed: {e}\n")
        sys.exit(1)
    if pid > 0:
        os._exit(0)

    # Step 2: child becomes session leader (new session, no controlling tty)
    os.setsid()
    # Ignore SIGHUP (terminal hangup) so the daemon survives shell exits.
    # Do NOT ignore SIGTERM — the stop script sends it for graceful shutdown.
    signal.signal(signal.SIGHUP, signal.SIG_IGN)

    # Step 3: second fork — first child exits, grandchild re-parented to PID 1
    try:
        pid = os.fork()
    except OSError:
        sys.exit(1)
    if pid > 0:
        os._exit(0)

    # Step 4: grandchild writes PID + runs
    global DAEMONIZED
    DAEMONIZED = True
    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))

    # Redirect stdio — no controlling tty; stdout/stderr → log file
    sys.stdout.flush()
    sys.stderr.flush()
    with open("/dev/null", "rb") as f:
        os.dup2(f.fileno(), sys.stdin.fileno())
    with open(LOG_FILE, "ab") as f:
        os.dup2(f.fileno(), sys.stdout.fileno())
        os.dup2(f.fileno(), sys.stderr.fileno())


if __name__ == "__main__":
    if "--daemon" in sys.argv:
        daemonize()
    # Always run main loop (in either mode). After daemonize(), the
    # grandchild continues here with stdio redirected to the log file.
    main_loop()
