# Agent Skills — vendored design-system registries

Vendored **round 16** (2026-10-02) at the owner's direction. These registries
give every future agent working in this repo a shared, versioned vocabulary
for design-system decisions — they are reference material, tracked in git so
they travel with every clone.

## Provenance

| Registry | Upstream | License | Contents |
| --- | --- | --- | --- |
| `design-systems/` | https://github.com/bergside/awesome-design-skills | MIT (`LICENSE.design-systems`) | 67 design-system `SKILL.md` files (agentic, bento, editorial, impeccable, minimal, premium, …) + `index.json` |
| `ui-skills/` | https://github.com/ibelick/ui-skills | MIT (`LICENSE.ui-skills`) | 7 engineering skills: `baseline-ui`, `create-design-md`, `fixing-accessibility`, `fixing-metadata`, `fixing-motion-performance`, `improve-ui`, `ui-skills-root` |

Both are plain Markdown — no build step, no network dependency. Submodules
were deliberately rejected: this repo must stay clone-able offline.

## How this repo uses them

1. **`ui-skills/baseline-ui`** — the deslop checklist applied to every styling
   pass: spacing rhythm, `h-dvh` over `h-screen`, compositor-only animation,
   `aria-label` on icon-only buttons, existing primitives first.
2. **`ui-skills/create-design-md`** — produced the repo-root `DESIGN.md`
   (the durable design-language contract for future agents).
3. **`design-systems/*`** — consulted for token discipline (typography scale,
   spacing scale, semantic-token preference, WCAG 2.2 AA gates). This app keeps
   its own identity (emerald-on-zinc "capital intelligence" language); the
   registries inform *discipline*, not re-skins.

## Refreshing

```bash
git clone --depth 1 https://github.com/bergside/awesome-design-skills.git /tmp/ads
git clone --depth 1 https://github.com/ibelick/ui-skills.git /tmp/uis
rsync -a --delete /tmp/ads/skills/ agent-skills/design-systems/
rsync -a --delete /tmp/uis/skills/ agent-skills/ui-skills/
```
