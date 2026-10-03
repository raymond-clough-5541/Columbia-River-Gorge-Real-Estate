# Installing the Collection (per tool)

The format every skill speaks is the open Agent Skills standard (per
the R179 research): one folder per skill, `SKILL.md` with
name/description YAML frontmatter, supporting files one level deep,
a lean self-contained body. What follows is the honest per-tool
import guide — where each tool's mechanism was verified, it says so;
where it is approximate, it says that too.

**Prerequisite for five skills:** `human-e2e-testing`,
`battery-runner`, `realtime-service`, `review-gallery`, and
`progress-report-pdf` reference executable packages. Copy the
`portable-workflows/` folder into the target project ALONGSIDE the
skill folders (or keep the relative path referenced in those
SKILL.md files intact). The other 19 skills run from SKILL.md alone.

## Claude Code (verified mechanism)

Copy skill folders into either location:

- **Per-project:** `.claude/skills/<name>/` inside the project
  (committed to the repo, shared with every collaborator).
- **User-global:** `~/.claude/skills/<name>/` (available in all
  your projects on that machine).

```bash
# per-project, all 27:
mkdir -p .claude/skills
cp -r portable-skills/* .claude/skills/
# plus the executable packages:
cp -r portable-workflows ./
```

Claude Code discovers each `<name>/SKILL.md`, reads the frontmatter
description as the retrieval contract (the what+when trigger), and
loads the body when the skill is relevant. The `description` field
is the trigger — do not edit it down to a bare label, or discovery
degrades.

## OpenCode (per the R179 finding)

Per the R179 research's comparison table, OpenCode reads
SKILL.md-style skill folders through its agent/skill configuration —
the same one-folder-per-skill shape. Place the collection where your
OpenCode config discovers skills (its skills/agents config directory
or the project's configured skill path), e.g. copy the 24 folders
into the location your `.opencode` config points at, or into the
project root's configured skills directory. SKILL.md bodies are
plain markdown any agent ingests; the frontmatter is the same
standard shape. If your OpenCode version expects a different
registration, the SKILL.md files need no changes — point the
registration at them.

## Cursor (approximate mapping — one paragraph, honest)

Cursor has no SKILL.md-folder mechanism; its native unit is the
rules file (`.cursor/rules/` or legacy `.cursorrules`). The honest
mapping: create one rule file per skill you want active
(e.g. `.cursor/rules/<name>.mdc`) whose body is the SKILL.md body —
the frontmatter does not travel, so paste the "what + when" from the
description into the rule header as a comment, and prefer the
`Always` rule type for the process disciplines (task-fidelity,
receipts-or-retract, planning-mode) and `Agent Requested`/`Manual`
for the rest. This is an approximation: Cursor rules lack the
per-skill folder + supporting-file structure, so skills with
supporting files (`verified-build-round/round-checklist.md`,
`agent-context-state/templates.md`, `owner-decision-format/decision-template.md`,
`feature-gap-analysis/matrix-template.md`) need those files
referenced by path in the rule text or inlined.

## Z.ai full-stack sessions

Copy the skill folders into the target project's `skills/`
directory — the session reads them at session start. The
`zai-fullstack-session` skill is the day-one entry point here (the
environment contract + the recovery playbook); `production-deploy-stack`
loads when the project must ship:

```bash
cp -r portable-skills/* <target-project>/skills/
cp -r portable-workflows <target-project>/   # for the executable five
```

Two caveats, disclosed:

1. **The platform-managed-clobber caveat:** in the source workspace,
   the `skills/` directory is partly platform-managed, and one
   platform auto-commit (212ee4b) deleted a skill and stripped
   passages from another. Keep `portable-skills/` as the canonical
   copy in your own repos; if a session's `skills/` copy drifts or
   vanishes, re-copy from canonical. The source project ships
   `scripts/sync-methodology-skills.mjs` (default sync + `--check`
   drift detection) — bring it along if you want the check.
2. **No hot reload:** the CURRENT session does not re-read
   `skills/` mid-session — the synced skills are visible to FUTURE
   sessions. Sync first, then start the session.

## Generic agents (anything that reads markdown)

An agent that can read files can run this collection: point it at
the folders (or paste the SKILL.md contents into its
instructions/rules/preamble). The bodies are written to be
self-contained (an agent holding ONLY the folder can run the
workflow) and project-agnostic (project material appears only as
clearly-labeled examples). Suggested minimum preamble set for a
coding agent: `task-fidelity` (its portable prompt block is
copy-paste), `receipts-or-retract`, `planning-mode`,
`agent-context-state`, `verified-build-round`.

## After installing

- Validate the collection if you have the source repo's tooling:
  `bun scripts/validate-skill-collection.mjs` (asserts frontmatter,
  name/folder match, description <= 1024 chars, body <= 500 lines,
  no absolute paths, no TODO markers).
- The load order for a new project is in the collection README
  ("The load order for a new project").
- Marketplace PUBLISHING of these skills is owner-gated (the R179
  stance: the skills carry no `_meta.json` by design — repo-native,
  import-ready; publishing is a separate decision).
