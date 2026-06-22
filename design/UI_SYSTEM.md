# UI System — "Almanac"

A ground-up visual language for a private, dignified daily recovery + life companion.
One user: a Muslim man in recovery who also runs a business. Phone-primary, desktop-secondary.

---

## 1. Design Point of View

**A warm paper almanac you keep on the desk — it holds your days with quiet confidence, never shouting, never scoring you.**

Three adjectives: **grounded, daylit, literate.**

### What we will NOT do (mapped to the slop bans)
- **No gradient text, no glow/neon.** Depth comes from paper, ink, hairlines, and one soft shadow — never light emission.
- **No glassmorphism.** Surfaces are opaque cream stock, not frosted glass.
- **No dark-mode-by-default.** Light/daylight is the identity. Dark is an opt-in "lamplight" theme, never the first render.
- **No emoji icons.** One stroke-icon set (Phosphor), consistent weight.
- **No purposeless gradients / cosmic backgrounds.** Background is flat warm paper. The only "scene" is the prayer sun-arc, which is functional.
- **No generic equal-card grid / dashboard-by-numbers.** Home is an editorial single column with deliberate rhythm and one hero, not a 2×N tile wall.
- **No monospace-as-decoration.** Numerals are tabular within real typefaces, not a "techy" mono.
- **No alarm-red panic button.** The relapse surface is warm clay and support-first, not punitive.
- **No minimal-serif-whitespace-as-premium and no filler copy.** Type has character (Fraunces opsz); copy is specific and human.
- **No reflex Inter / reflex mono.** Deliberate pairing below, with reasons.

---

## 2. Color System

Warm, light-first. Palette mined from Sunlitt's warm-neutral sun cards, Atoms' cream, 5 Minute Journal's cream+gold, and Timepage's sepia — daylight, not screens-at-night. oklch values are close approximations of the authoritative hex.

### Tokens

| Token | Role | Hex | oklch (approx) |
|---|---|---|---|
| `--paper` | App background | `#F7F1E6` | `oklch(95.5% 0.018 85)` |
| `--surface-raised` | Cards, sheets | `#FDFAF2` | `oklch(98% 0.010 85)` |
| `--surface-sunken` | Inset wells, inputs | `#EFE7D7` | `oklch(92.5% 0.022 84)` |
| `--ink` | Primary text | `#221E18` | `oklch(23% 0.012 70)` |
| `--ink-secondary` | Secondary text | `#5C544A` | `oklch(40% 0.014 75)` |
| `--ink-muted` | Captions/labels | `#6F6657` | `oklch(47% 0.016 78)` |
| `--hairline` | Borders | `#E3D9C6` | `oklch(88% 0.020 85)` |
| `--hairline-strong` | Dividers, focus-adjacent | `#D8CCB6` | `oklch(84% 0.025 85)` |
| `--accent` | Primary/brand (Indigo Ink) | `#234C5E` | `oklch(38% 0.050 230)` |
| `--accent-hover` | Pressed/hover | `#1B3B49` | `oklch(32% 0.048 230)` |
| `--accent-wash` | Selected tint bg | `#DBE6EA` | `oklch(91% 0.018 230)` |
| `--success` | Recovery / streak alive (Moss), text | `#4C6A3A` | `oklch(47% 0.070 130)` |
| `--success-fill` | Moss fill | `#5E7E47` | `oklch(54% 0.078 130)` |
| `--caution` | Warning text (Ochre) | `#8A5A12` | `oklch(48% 0.100 78)` |
| `--caution-fill` | Ochre fill | `#B5761F` | `oklch(62% 0.120 75)` |
| `--danger` | Relapse/destructive text (Clay) | `#8C3F30` | `oklch(44% 0.110 38)` |
| `--danger-fill` | Clay fill | `#A4503C` | `oklch(52% 0.110 40)` |

**Accent reason (Indigo Ink `#234C5E`):** it reads as *fountain-pen ink on paper* — the binding color of a field journal (echoes stoic./Timepage editorial restraint). It is a cool, low-chroma anchor that lets the warm cream stay the star, and it is semantically clean: distinct from Moss (success), Ochre (caution), and Clay (danger), so an interactive element is never confused with a status.

**Recovery / relapse handled with dignity:** the streak/recovery state is **Moss green** — growth, tended, alive (and culturally resonant green) — not gold-trophy gamification. Relapse is **Clay terracotta**, a warm grounding earth tone, never alarm-red. The message is "you are still here," not "you failed."

### Verified WCAG contrast (sRGB, computed)

Body text needs ≥4.5:1, large/UI ≥3:1.

| Pairing | Ratio | Passes |
|---|---|---|
| `--ink` on `--paper` | **14.74:1** | AAA body |
| `--ink` on `--surface-raised` | ~15.2:1 | AAA body |
| `--ink-secondary` on `--paper` | **6.62:1** | AA body |
| `--ink-muted` on `--paper` | **5.03:1** | AA body |
| `--accent` on `--paper` | **8.24:1** | AAA large / AA body |
| white on `--accent` (primary button) | **9.27:1** | AAA body |
| `--success` text on `--paper` | **5.45:1** | AA body |
| `--caution` text on `--paper` | **5.26:1** | AA body |
| `--danger` text on `--paper` | **6.51:1** | AA body |
| `--hairline-strong` on `--paper` (UI boundary) | ~1.4:1 | decorative only (not load-bearing) |
| focus ring `--accent` on `--paper` | 8.24:1 | AA non-text ✓ |

Decorative hairlines intentionally sit below 3:1 (they whisper); any *meaningful* boundary or state uses ink/accent/semantic tokens, which all pass. Fills (`--caution-fill`, `--danger-fill`, `--success-fill`) are for large shapes/icons, paired with `--ink` or white text that is independently verified.

### Dark mode — optional, not default ("Lamplight")
Opt-in only. `--paper #1C1A16`, `--surface-raised #25221C`, `--ink #ECE4D5`, accents lifted ~12% lightness (`--accent #6E97A8`, `--success #8FAE6E`, `--danger #C97A63`). Never the first render; no auto `prefers-color-scheme` switch without a settings toggle.

---

## 3. Typography

**A real pass, not Inter-by-reflex.** Two families (within the two-family performance budget). Both free + self-hostable.

### Faces
- **Display — Fraunces** (variable: `opsz` 9–144, `wght`, `SOFT`, `WONK`). Google Fonts, SIL OFL. An old-style serif with optical sizing and soft, slightly "wonky" terminals. Reason: at display sizes it gives warmth and literary character — the hand of an almanac/field journal — without the cold "minimal-serif premium" cliché, because we run it *large and characterful*, not as thin small-caps whitespace bait.
- **Text / UI / data — Hanken Grotesk** (variable `wght`). Fontshare + Google Fonts, SIL OFL. A humanist grotesque with round terminals and genuine tabular figures. Reason: warmer and kinder than Inter (rounder, more humanist), reads calmly in long checklists and journal UI, and ships real `tnum` for streak/score alignment.

**Why not default mono / Inter:** Inter is the ubiquitous neutral-slop default and reads cold; mono would be decorative noise here. Hanken carries the "kind, grown-up" tone; numerals stay legible via tabular figures inside real type, not a mono gimmick.

### Type scale (clamp, fluid 360→1280px)
```css
--font-display: "Fraunces", Georgia, serif;
--font-text:    "Hanken Grotesk", system-ui, sans-serif;

--text-xs:   0.75rem;                               /* 12 — meta, timestamps */
--text-sm:   0.875rem;                              /* 14 — labels, captions */
--text-base: 1rem;                                  /* 16 — body */
--text-md:   clamp(1.0625rem, 1rem + 0.3vw, 1.1875rem);   /* 17–19 — reading/journal */
--text-lg:   clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);      /* 20–24 — section titles */
--text-xl:   clamp(1.5rem, 1.25rem + 1.1vw, 2rem);        /* 24–32 — screen heading */
--text-2xl:  clamp(2rem, 1.6rem + 1.8vw, 3rem);           /* 32–48 — greeting/hero */
--text-num:  clamp(3.25rem, 2.4rem + 3.6vw, 5rem);        /* 52–80 — streak/score */
```

### Roles, weights, line-height, tracking
| Role | Family | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|---|
| Greeting / hero | Fraunces (opsz~72, SOFT~50) | `--text-2xl` | 460 | 1.05 | -0.01em |
| Streak / score numeral | Fraunces, `tnum` `lnum` | `--text-num` | 480 | 0.95 | -0.02em |
| Section title | Fraunces (opsz~36) | `--text-lg` | 500 | 1.15 | 0 |
| Screen heading | Fraunces | `--text-xl` | 480 | 1.1 | -0.005em |
| Body | Hanken | `--text-base` | 400 | 1.55 | 0 |
| Reading / journal entry | Hanken | `--text-md` | 400 | 1.65 | 0 |
| Label / button | Hanken | `--text-sm` | 600 | 1.2 | 0.01em |
| Caption / meta | Hanken | `--text-xs` | 500 | 1.3 | 0.02em |
| Inline data (times, counts) | Hanken `tnum` | `--text-sm`/`base` | 500 | 1.3 | 0 |

**Numeric treatment:** all counts use `font-variant-numeric: tabular-nums lining-nums` so a streak ticking 9→10→100 never reflows. Large streak/score numerals are **Fraunces** (the "almanac page number" feel); inline times and small counts are **Hanken tabular**.

---

## 4. Spacing, Radius, Depth, Grid

### Spacing — 4px base, hand-tuned (not uniform padding everywhere)
`--space-1:4px · 2:8 · 3:12 · 4:16 · 5:20 · 6:24 · 8:32 · 10:40 · 12:48 · 16:64 · 20:80`
Rhythm rule: tight inside components (12–16), generous between sections (32–48), hero breathes (64+). Phone screen side margin `--space-5` (20px); desktop reading column padded `--space-8`.

### Radius — soft, gently varied (avoid one-radius-everywhere)
`--radius-sm:8px` (chips, inputs) · `--radius-md:14px` (cards) · `--radius-lg:20px` (sheets, hero card) · `--radius-pill:999px` (toggle/segmented) · primary numerals card uses `--radius-lg`. Slight variation reads handmade, not template-uniform.

### Borders + elevation — depth WITHOUT glass/glow
Two layers only, always combined:
1. **Hairline:** `1px solid var(--hairline)` on raised surfaces — the "edge of the paper."
2. **One warm soft shadow**, tinted brown not black, low and short (paper on a desk, not floating glass):
```css
--shadow-card:  0 1px 2px rgba(58,46,30,0.05), 0 4px 12px rgba(58,46,30,0.06);
--shadow-sheet: 0 -2px 8px rgba(58,46,30,0.06), 0 -12px 32px rgba(58,46,30,0.10);
--shadow-press: 0 1px 1px rgba(58,46,30,0.08);   /* pressed = sinks */
```
No blur-backdrop, no inner glow, no neon ring. Elevation = surface lightness step (`paper → surface-raised`) + hairline + soft shadow. Pressed states *reduce* shadow (sink into paper).

### Grid
- **Phone:** single editorial column, 20px margins, vertical rhythm from spacing scale. No tile walls.
- **Desktop:** centered reading column `max-width: 680px` for primary content; optional right rail `300px` (gap 48px) for the prayer arc + at-a-glance, only ≥1024px. Content stays book-width; we do not stretch edge-to-edge.

---

## 5. Iconography

**Phosphor Icons** (`regular` weight default, `bold`/`fill` for active/emphasis). Reason: Phosphor's slightly rounded joins read kinder and more human than Lucide's sharper geometry, fitting the "warm, grown-up" tone — and it has a `fill` variant we use for selected nav/checked states. SIL-style free, self-hosted as an inline SVG sprite.
- Stroke: **1.75px** at 24px, **1.5px** at 20px (Phosphor `regular`).
- Sizes: `20` inline/list, `24` nav/buttons, `28` feature. Active nav swaps to `fill`.
- Color inherits `currentColor` (ink/accent/semantic). **Never emoji, never multicolor.**

---

## 6. Component Specs

### Buttons
Shape: `--radius-pill` for primary actions, `--radius-sm` for inline/utility. Label Hanken 600 `--text-sm`, icon-gap 8px, min touch target **44×44**, height 48 (primary) / 40 (secondary).
| Variant | Default | Hover | Pressed | Disabled | Focus |
|---|---|---|---|---|---|
| Primary | `--accent` bg, white text (9.27:1) | `--accent-hover` | sink (`--shadow-press`, translateY 1px) | `--ink-muted` bg @40%, no shadow | 2px `--accent` ring, 2px offset |
| Secondary | `--surface-raised`, `1px --hairline-strong`, `--ink` text | bg `--surface-sunken` | hairline → `--accent` | text/hairline @45% | same ring |
| Ghost | transparent, `--accent` text | `--accent-wash` bg | wash deepen | text @45% | same ring |
| Danger | `--danger-fill` bg, white text | darken 8% | sink | n/a | `--danger` ring |
Tertiary text-link: `--accent`, underline on hover only.

### Cards / surfaces
`--surface-raised`, `--radius-md`, `1px --hairline`, `--shadow-card`, padding `--space-5`. Hover (desktop/interactive only): shadow → slightly deeper, no lift jump >2px. No equal-grid card wall — cards vary by content weight (hero card is larger, list cards are flush rows).

### Streak / score display (the hero)
A single wide "almanac" card, `--radius-lg`. Layout: small Fraunces label "Days clear" (`--text-sm`, `--ink-muted`), then the count in **Fraunces `--text-num`, `--success` ink, tabular** — e.g. `48`. Beneath: a thin Moss underline meter showing progress to the next personal milestone (see progress). A quiet caption: "Since 5 May · longest yet". The number is the page; everything else whispers around it. No badges, no confetti, no trophy.

### Progress: ring vs bar
- **Ring** reserved for *cyclical daily* completion (today's habits, today's prayers) — a 4px-stroke open arc, `--success-fill` on a `--surface-sunken` track, sized 56–72px, center holds a tabular count `3/5`. Calm, not a gamey filling-up dopamine ring.
- **Bar** for *linear journeys* (streak → next milestone, weekly trend) — 6px height, `--radius-pill`, Moss fill on sunken track, label above. Never both for the same metric.

### List rows
Flush rows separated by `1px --hairline`, not boxed cards. Height 56, padding `--space-4`. Left: 20px Phosphor icon in `--ink-secondary`. Center: title (Hanken 500 base) + optional meta (`--text-xs --ink-muted`). Right: control/chevron. Pressed: row bg `--surface-sunken`.

### Habit check control
Custom checkbox, **not** a stock tick. 24px circle, `1.5px --hairline-strong` ring when unchecked; checked = `--success-fill` fill + white Phosphor `check` (`fill` weight), with a single 200ms scale-in (0.9→1) and ring→fill cross-fade. Whole row is the tap target (44px). No sound, no burst. Reduced-motion: instant fill.

### Inputs / forms
`--surface-sunken` well, `1px --hairline-strong`, `--radius-sm`, inset feel (sunken, not raised). Label Hanken 600 `--text-sm` above. Focus: hairline → `--accent` + 2px `--accent-wash` glow-free ring. Placeholder `--ink-muted`. Error: `--danger` hairline + `--danger` helper text (icon `warning-circle`), never a red flash. Journal textarea uses `--text-md`, line-height 1.65, generous padding.

### Navigation
- **Mobile:** bottom bar, `--surface-raised`, top `1px --hairline`, soft top shadow. 4 items: Today, Journey, Reflect, More. Phosphor `regular` → `fill` + `--accent` label on active; inactive `--ink-muted`. No center FAB, no panic button. 56px + safe-area inset.
- **Desktop:** left rail 240px, `--surface-raised`, hairline divider. Same items as text+icon rows; active = `--accent-wash` pill behind the row. App title in Fraunces at top.

### Modal / sheet
Mobile = bottom sheet, `--radius-lg` top corners, `--surface-raised`, `--shadow-sheet`, grab handle (32×4 `--hairline-strong`). Scrim `rgba(34,30,24,0.32)` (ink-tinted, no blur). Desktop = centered dialog max-width 480px, same surface. Enter: translateY(8px)+fade 200ms; scrim fades. Esc/scrim-tap/swipe-down to dismiss.

### Prayer "sun-arc" component
Informed by **Sunlitt's sun-arc cards** — a daytime horizontal arc, not a dark sky. Wide card, `--surface-raised`, `--radius-lg`.
- A `--hairline-strong` arc (SVG path, ~160° shallow dome) spans the card width, representing the day Fajr→Isha.
- Five **nodes** sit along the arc at each prayer's relative time. Completed = `--success-fill` filled dot; current/next = `--accent` ring pulse (single, reduced-motion off); upcoming = hollow `--hairline-strong` dot.
- A small **sun marker** (8px `--caution-fill` disc, no glow — a warm dot) rides the arc at the live clock position, with a faint `--caution`-tinted *fill under the arc up to "now"* (flat opacity wash, not a gradient glow).
- Below the arc: next prayer name in Fraunces `--text-lg`, countdown in Hanken tabular `--text-sm --ink-secondary` ("Asr in 1h 12m"). Tapping a node logs/marks the prayer.
- Night (after Isha): arc dims to a thin `--hairline` with a small Hanken caption "Isha done · rest well" — never a cosmic night scene.

### Charts
Light data-viz, anti-dark-slop (per Apple Health sleep reference). Background `--paper`/`--surface-raised`. Single-series bar/line in `--success` or `--accent`; gridlines `--hairline`; axis labels `--text-xs --ink-muted` tabular. No gradients, no glow, no 3D. Weekly mood/urge log = small bars; streak history = stepped line. Tooltips = small `--surface-raised` card with hairline + soft shadow.

---

## 7. Motion

Compositor-friendly only (`transform`, `opacity`, `clip-path`). Nothing else animates.
- **Durations:** `--dur-fast:120ms` (state/tap feedback), `--dur-base:200ms` (enter/check/toggle), `--dur-slow:320ms` (sheet/page transition).
- **Easings:** `--ease-out: cubic-bezier(0.2, 0.8, 0.2, 1)` (entrances, default), `--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)` (moves), `--ease-press: cubic-bezier(0.3, 0, 0.7, 1)` (button sink).
- **What animates:** habit check (scale-in), sheet/modal (translateY + fade), nav active (wash pill cross-fade), the prayer sun marker (position tween at most once/min), streak number on increment (single subtle scale 1→1.06→1 over `--dur-base`).
- **What does NOT:** background, type, layout, no parallax, no looping ambient motion, no shimmer. Nothing pulses for attention except the single current-prayer ring.
- **Reduced motion (`prefers-reduced-motion: reduce`):** all translate/scale removed → opacity cross-fade only at `--dur-fast`; the prayer marker and streak number update instantly; sheets appear without slide. Essential feedback remains via color/state, never motion-dependent.

---

## 8. Key Screens

### HOME / TODAY
Single editorial column, warm paper, top-down rhythm (no tile grid):

1. **Header band (no card):** Fraunces greeting keyed to time + name — "Good morning, Ihsan" (`--text-2xl`, ink), and beneath in Hanken `--text-sm --ink-muted` the Hijri + Gregorian date: "12 Dhul-Hijjah · Sun 22 Jun". No avatar chrome, no notification bell clutter.

2. **Streak hero card** (`--radius-lg`, `--shadow-card`): label "Days clear", the count `48` in Fraunces `--text-num` Moss tabular, a thin Moss milestone bar ("12 to your best — 60"), caption "Since 5 May". This is the visual anchor — one big, calm number, like the date on an almanac page.

3. **Prayer sun-arc card:** the daytime arc with five nodes, live sun marker, and "Asr in 1h 12m" below. The day's spiritual spine, glanceable.

4. **Today's intentions (list, not cards):** 3–5 flush habit rows with circular check controls — "Morning dhikr", "Walk 20 min", "Reach out to one person", "Close the books by 6". A small daily ring (`3/5`) sits in the section header, not a celebration.

5. **One gentle prompt card:** a single reflective line in Fraunces ("What's one thing steadying you today?") with a ghost "Write" button opening the journal sheet. Just one — no feed, no infinite cards.

6. **Quiet footer line:** Hanken `--text-xs --ink-muted` — a rotating grounding sentence (a du'a or a recovery line), no decoration.

Bottom nav: Today (active, `fill` + accent), Journey, Reflect, More. Generous bottom spacing above the bar. The whole screen reads top-to-bottom like a page you turn to each morning — confident, uncluttered, daylit.

### RELAPSE / SUPPORT
Reached from a calm, plainly-labeled "I'm struggling" text-link in More and as a low-key option on the streak card's menu — **never** a red panic button. The screen's job is support and re-grounding, not alarm or shame.

- **Tone surface:** background stays `--paper`; the screen's accent shifts to warm **Clay** (`--danger`/`--danger-fill`) used sparingly — grounding earth, not warning. Heading in Fraunces: "This is a hard moment." Subhead Hanken `--ink-secondary`: "You came here instead of disappearing. That counts."

- **Immediate grounding (top, no scrolling needed):** a single full-width primary action in Clay — **"Breathe with me — 1 minute"** — opening a slow, reduced-motion-respecting breathing guide (a circle that expands/contracts, opacity+scale only). Below it, two secondary ghost actions: **"Call my anchor"** (the one trusted contact) and **"Read my reasons"** (the user's own pre-written note on why he started).

- **If a relapse already happened:** a quiet, dignified logging row — "Mark today" — that, when used, resets the counter to **"Day 1 again"** rendered in Fraunces with a Moss (not Clay) caption: "The streak resets. You don't. Begin again." The history keeps prior streaks visible as past chapters, not erased failures.

- **Aftercare list:** three flush rows — "Write what led here" (journal), "A short du'a", "Plan the next hour" — Phosphor icons in `--ink-secondary`. Calm, finite, actionable.

- **Exit:** a soft "I'm okay for now" secondary button returns Home. No scoring, no streak-loss animation, no red. The entire surface is built to lower the temperature and restore dignity.

---

### Token quick-reference (CSS custom properties)
```css
:root {
  /* paper & ink */
  --paper:#F7F1E6; --surface-raised:#FDFAF2; --surface-sunken:#EFE7D7;
  --ink:#221E18; --ink-secondary:#5C544A; --ink-muted:#6F6657;
  --hairline:#E3D9C6; --hairline-strong:#D8CCB6;
  /* accent + semantics */
  --accent:#234C5E; --accent-hover:#1B3B49; --accent-wash:#DBE6EA;
  --success:#4C6A3A; --success-fill:#5E7E47;
  --caution:#8A5A12; --caution-fill:#B5761F;
  --danger:#8C3F30; --danger-fill:#A4503C;
  /* type */
  --font-display:"Fraunces",Georgia,serif; --font-text:"Hanken Grotesk",system-ui,sans-serif;
  /* radius / shadow / motion as specified above */
}
```
