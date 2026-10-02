---
name: contrast-check
description: Measure contrast before acting on any claim about it — a dependency-free script that converts the real token values (including OKLCH, with the chroma/hue-to-Lab-a/b conversion the naive port gets wrong), composites alpha in sRGB space like CSS does, and emits the per-theme PASS/SOFT/FAIL pair table that is the machine evidence. Use this skill whenever a VLM/audit contrast claim is about to drive a fix, when opacity-dimmed text might sit under the 3:1 floor, or when porting a contrast checker to OKLCH themes.
license: MIT
---

# Machine Contrast Check (portable)

The failure class this skill prevents: (a) **acting on a VLM/audit
contrast claim that was never measured** — "the bubble reads ~2.3:1"
is an ESTIMATE about the wrong pair (usually the boundary, not the
text), and unmeasured color claims drive wrong fixes; (b) **the
quiet readability killer nobody notices** — an opacity-based reveal
dim pulling a small metadata text under the 3:1 floor while every
headline pair passes; (c) **alpha-compositing mistakes** — treating
CSS `oklch(L C H)` chroma+hue as Lab a/b axes, the classic port bug
that makes every ratio come out 1.00:1.

## The pattern

**Measure before acting, from the real token values, with the real
CSS compositing semantics.** One standalone script, zero
dependencies; the output IS the evidence (pairs with
`receipts-or-retract`).

### 1. OKLCH to sRGB (the correct path)

CSS `oklch(L C H)` carries chroma + a hue ANGLE in degrees — convert
to the Lab a/b axes before the Ottosson matrices, or every color
comes out the same garbage:

```
h = H * pi / 180
a = C * cos(h), b = C * sin(h)
l_ = L + 0.3963377774*a + 0.2158037573*b
m_ = L - 0.1055613458*a - 0.0638541728*b
s_ = L - 0.0894841775*a - 1.2914855480*b
l,m,s = l_^3, m_^3, s_^3
linear rgb = the standard LMS-to-RGB matrix
gamma: c <= 0.0031308 ? 12.92*c : 1.055*c^(1/2.4) - 0.055
```

### 2. Alpha compositing + relative luminance + the ratio

- CSS simple-alpha compositing happens in **sRGB space**:
  `over(fg, alpha, bg) = fg*alpha + bg*(1-alpha)` per channel — this
  is how `bg-primary/30` over the page background must be computed.
- WCAG relative luminance uses **linearized** channels:
  `0.2126*R + 0.7152*G + 0.0722*B`, then
  `contrast = (L_hi + 0.05)/(L_lo + 0.05)`.

### 3. Measure the pairs the claim is ABOUT — and the pairs it hides

For a chat surface the full set (per theme):

| Pair | Threshold | Why |
|---|---|---|
| bubble TEXT vs composited fill | 4.5:1 | the readability pair — usually PASSES by 10:1, disproving the claim |
| bubble BOUNDARY vs pane | 3:1 | the "weak polarity" pair — often sub-3; position/shape may legitimately carry the distinction |
| side polarity (mine vs theirs) | 3:1 | same class |
| metadata text at its REST dim | 3:1 | **the pair opacity dims silently break** — the real deficit in practice |
| metadata text at full ink | 4.5:1 | the pair the dim was hiding |
| badges/chips | 4.5:1 | per component |

Judge REST-dimmed progressive-disclosure text honestly: full ink on
hover/focus is a pattern, but the resting value still belongs in the
ledger — if it is under 3:1, move the dim onto the affordance (the
button) and let the information (the text) carry full ink.

### 4. Run it per selectable theme

Every theme the app ships — copy the token values verbatim from the
stylesheet into the script; they are facts, not config. A pair that
passes in light can fail in dark.

## The script shape (the reference instance)

A ~200-line dependency-free script: theme tables -> the conversion
above -> the pair table -> per-theme PASS/SOFT/FAIL output with the
hex of both computed colors. Commit the script WITH the numbers it
produced — they are the machine evidence the VLM claim gets checked
against.

## The decision rule

1. Text contrast FAIL -> fix the ink (always a real defect).
2. Boundary/polarity sub-3:1 -> check whether position/shape/ring
   already distinguishes the element; if yes, record the measured
   number + the distinction (a design-language tradeoff, not a
   violation — pairs with `four-axis-filter` for the triage); if no,
   strengthen.
3. The claim was about text and text passes 10:1 -> the claim is
   disproven; find what the claimant actually measured (usually the
   boundary) and answer THAT number.

Pairs with: `cold-audit-discipline` (the evidence-check before a
headline finding becomes an action) and `anti-ai-ui-style` (the
contrast pairs are part of the build-time rubric).
