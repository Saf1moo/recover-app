# RECOVER — "Sakīnah / Fajr" Design System Spec (FINAL / AUTHORITATIVE)

Single source of truth for the visual + emotional remodel of `src/App.jsx`. **Inline `S` object + React hover/press state + one fully-replaced injected `<style id="r-theme-vars">`** (the lone CSS escape hatch: `:root` vars, `@keyframes`, a handful of forced `!important` interaction rules). All 8-theme structure, per-account accent, and the 4-stop score ramp keep working — retuned and territorially separated, not rebuilt. No new dependencies.

> This revision folds in **every** CRITICAL/HIGH fix (and the load-bearing MEDIUMs) from the Design, A11y, and Feasibility punch lists. Corrected values are inline. Where a punch-list item is resolved, the fix ID is cited like `[D-C1]`, `[A-C2]`, `[F-H3]`.

---

## 1. Direction Summary

**Sakīnah — Tranquil Depth.** Recover is a quiet room you return to at your lowest moment, lit from within by a single warm dawn-light: the day-count hero. **Oura's restraint is the chassis, Calm's serenity is the air, QUITTR's emotional gravity is kept but downgraded from "intense" to "steadfast" (istiqāmah).** Premium-calm is the baseline everywhere; raw emotion is rationed and spent on exactly two moments — milestone and relapse. The spiritual is expressed entirely as *light and dawn temperature*, never iconography.

North-star test for every screen: *Would this make someone at their lowest feel held and able to begin again — or judged? If judged, redesign it.*

**Six principles:**
1. **Lead with hope, not the ledger** — eye lands on momentum (day-count, next milestone, intention), never a KPI wall.
2. **Premium through restraint + depth, not density** — 4-step lightness ladder, borderless layered cards, warm soft shadows, generous space, one accent. Remove 40% before polishing.
3. **One sacred hero per view** — aggressive scale contrast (hero ~64px+ vs 13px metadata). **Every section gets a real hero metric, not just the dashboard** `[D-H1]`.
4. **Spiritual is first-class, expressed as light** — reverence = dawn-light + warmth + openness; **zero literal iconography**. The dawn light is the **`glow` token (warm horizon)**, never the per-account accent `[D-C1]`.
5. **Relapse/panic are acts of care** — compassionate copy, forward path, cumulative growth; never zeroed shame, never alarm-red.
6. **Motion & glow earn their place** — one slow fajr-bloom, soft transitions, gentle count-up; compositor-only; respects `prefers-reduced-motion`.

**Territorial law (governs all color):**
- **`glow` (warm horizon tint)** = the dawn/light identity: hero bloom radial, hero numeral text-shadow, milestone surge/glow, empty-state disc. `[D-C1]`
- **`accent` (per-account) + accent-glow** = affirmation chrome only: active nav rail, primary CTA fill, healthy ring stroke, check-off, success.
- **Score ramp** (green/blue/amber/rose) = diagnosis only, inside the 4 SVG viz (CircleRing, HeatmapGrid, LineChart last-dot, StatCard).
- **Accent never enters scored viz; ramp never becomes chrome.** Chrome caution gets its **own** muted rose `chromeRose`, distinct from the viz `SCORE.crit` swatch `[D-H2]`; chrome info gets its **own** blue distinct from `SCORE.mid` `[D-H3]`.
- **Red** is the single most dangerous color — reserved exclusively for the genuine panic/SOS surface and the relapse-confirm button, saturating only on press.

**Explicitly NOT doing:** casino gamification (confetti, coins, streak flames, XP, loss alarms); shame language; QUITTR panic-red theatrics & "brain rewiring" alarmism; religious kitsch; generic 4-up KPI dashboard / equal flat tiles / colored left-border-as-hierarchy; tiny dense 10–13px content; pure-black void, neon, multi-accent rainbow, glassmorphism-everywhere; mascots; any feature additions or new dependencies.

---

## 2. Tokens

### 2.1 Theme presets

8 presets (1 redesigned default + 6 dark + 1 light "dawn"). **Three new keys** on every preset: `surf3` (modal/hero plinth), `fg3` (empty/disabled/tertiary only), `glow` (warm horizon radial tint). The light `dawn` preset adds two more: `textAccent` (darkened, AA-passing accent for text/icons `[A-C2]`) and `lightRamp:true` (selects the light score ramp `[A-C1]`). Existing keys keep their names so nothing downstream breaks.

```js
const THEME_PRESETS = [
  // ---------- DEFAULT ----------
  { id:'fajr', name:'Fajr', desc:'Warm indigo pre-dawn. Light on the horizon.',
    category:'base', accent:'#34d399', glow:'#f2b06a',
    bg:'#0d0e13', surf:'#14151c', surf2:'#1b1c25', surf3:'#23242f',
    bord:'#1f2029', fg:'#ece9e4', fg2:'#8b8a94', fg3:'#5d5c66' },

  // ---------- BASE ----------
  { id:'obsidian', name:'Obsidian', desc:'Cool slate calm. Restrained and exact.',
    category:'base', accent:'#60a5fa', glow:'#7cb8ff',
    bg:'#0a0d12', surf:'#111620', surf2:'#18202c', surf3:'#202a38',
    bord:'#1c2531', fg:'#e6ebf2', fg2:'#838f9f', fg3:'#5f6b7a' },   // fg2 lifted #7a8696→#838f9f [A-M1]

  { id:'forest', name:'Forest', desc:'Warm moss dark. Grounded, alive, quiet.',
    category:'base', accent:'#34d399', glow:'#9bd66a',
    bg:'#0a0f0b', surf:'#111813', surf2:'#18211a', surf3:'#1f2a22',
    bord:'#1b251d', fg:'#e6eae3', fg2:'#828b7a', fg3:'#67705f' },

  { id:'noir', name:'Noir', desc:'Warm charcoal monochrome. Nothing shouts.',
    category:'base', accent:'#e3e0d8', glow:'#cdab78',
    bg:'#0a0a0b', surf:'#121214', surf2:'#1a1a1d', surf3:'#222226',
    bord:'#1e1e22', fg:'#ededea', fg2:'#8a8a8d', fg3:'#6d6d70' },

  // ---------- LIGHT ("dawn") ----------
  { id:'dawn', name:'Dawn', desc:'Light cream daybreak. Open, merciful, awake.',
    category:'base', lightRamp:true,
    accent:'#2f9e74', textAccent:'#1f7a52', glow:'#f0a85a',   // textAccent AA on light surfaces [A-C2]
    bg:'#f4efe7', surf:'#fbf8f2', surf2:'#fffefb', surf3:'#ffffff',
    bord:'#e6ddcf', fg:'#2a2723', fg2:'#6f6757', fg3:'#a89f8e' },

  // ---------- EXCLUSIVE ----------
  { id:'sakinah', name:'Sakīnah', desc:'Deep indigo, rose-gold dawn. Tranquil depth.',
    category:'exclusive', accent:'#d8a36b', glow:'#e9b985',
    bg:'#0c0d16', surf:'#131520', surf2:'#1a1d2b', surf3:'#222536',
    bord:'#1e2130', fg:'#ece8e0', fg2:'#85869a', fg3:'#6a6b7c' },

  { id:'plum', name:'Plum', desc:'Aubergine night, muted mauve. Soft and rare.',
    category:'exclusive', accent:'#c08ad0', glow:'#d6a0e0',
    bg:'#100a14', surf:'#18111e', surf2:'#201728', surf3:'#281e32',
    bord:'#241a2c', fg:'#ece6ef', fg2:'#8a8095', fg3:'#6f6678' },

  { id:'ember', name:'Ember', desc:'Warm brown-black, terracotta. Slow heat.',
    category:'exclusive', accent:'#e0875a', glow:'#f0a06a',
    bg:'#110c0a', surf:'#1a1310', surf2:'#231a15', surf3:'#2c221c',
    bord:'#271d18', fg:'#efe7df', fg2:'#928175', fg3:'#76695f' },
];

const DEFAULT_THEME = 'fajr';
```

**Ladder discipline (dark):** `bg→surf` ≈ +4% L, `surf→surf2` ≈ +3%, `surf2→surf3` ≈ +3%. `bord` sits ~1 step above `surf`, same hue / low chroma → reads as a subliminal ~6% hairline and never out-lights `surf2`. Hero sits on `surf3` over a `glow` radial. **Dawn inverts:** surfaces climb toward white, `bord` darkens, shadows soften (`ELEV_LIGHT`), and all scored viz + accent-as-text swap to the light ramp / `textAccent`.

**Resolutions baked in:** every `fg2` passes AA for 13px labels on `surf` (obsidian lifted to `#838f9f`); `fg3` is the **only** color for empty/disabled/tertiary content; `glow` is **chrome-radial only**, never text.

### 2.2 The single injected `<style>` — FULLY REPLACED, JS-built

The current `<style>` (`src/App.jsx:788-790`) writes only 7 vars and **lacks `--r-accent`**. Replace it wholesale `[F-H2]`. All alpha is interpolated in **JS** from the resolved accent hex `A` (a normalized 6-digit `#rrggbb` — see §2.8 note) and theme `T` — **no `color-mix()`, no `var()+alpha` concatenation** `[F-H3]` `[D-C2]` `[F-C3]`.

```js
// helpers (define once)
const hexA = (h, a2) => `${h}${a2}`;                 // h is #rrggbb, a2 is 2-hex alpha
const relLum = (h) => { const c=h.replace('#',''); const f=i=>{const v=parseInt(c.substr(i,2),16)/255; return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;}; return .2126*f(0)+.7152*f(2)+.0722*f(4); };
const onAccent = (h) => relLum(h) > 0.42 ? '#08120d' : '#ffffff';   // label/icon color over accent [D-H6][A-M4]
const A   = normalizeHex(account.accent);            // §2.8 note — always #rrggbb
const G   = T.glow || A;                             // warm horizon
const ACT = T.lightRamp ? (T.textAccent||A) : A;     // accent-as-text (AA on light) [A-C2]

`:root{
  --r-bg:${T.bg}; --r-surf:${T.surf}; --r-surf2:${T.surf2}; --r-surf3:${T.surf3};
  --r-bord:${T.bord}; --r-fg:${T.fg}; --r-fg2:${T.fg2}; --r-fg3:${T.fg3};
  --r-accent:${A}; --r-accent-text:${ACT}; --r-on-accent:${onAccent(A)};
  --r-glow:${G}; --r-font:${FONT.body};

  /* warm-tinted near-black indigo shadows (dark); ELEV_LIGHT swaps these on dawn */
  --r-shadow-sm:${T.lightRamp?'0 1px 2px rgba(40,32,20,.06)':'0 1px 2px rgba(7,8,14,.45)'};
  --r-shadow-md:${T.lightRamp?'0 8px 24px -8px rgba(40,32,20,.10),0 2px 6px rgba(40,32,20,.06)':'0 6px 20px -6px rgba(7,8,14,.55),0 2px 6px rgba(7,8,14,.40)'};
  --r-shadow-lg:${T.lightRamp?'0 24px 64px -18px rgba(40,32,20,.14),0 6px 16px rgba(40,32,20,.08)':'0 22px 60px -16px rgba(7,8,14,.66),0 6px 16px rgba(7,8,14,.44)'};
  --r-glow-hero:0 0 90px -8px ${G};
  --r-glow-active:0 0 0 1px ${hexA(A,'40')}, 0 0 16px -4px ${hexA(A,'55')};
  --r-inset:${T.lightRamp?'inset 0 1px 0 rgba(255,255,255,.6)':'inset 0 1px 0 rgba(255,255,255,.04)'};

  --r-ease-dawn:cubic-bezier(.22,1,.36,1);  /* entrances, ring-fill, count-up, settle */
  --r-ease-soft:cubic-bezier(.4,0,.2,1);    /* press, hover, quick UI */
  --r-ease-expo:cubic-bezier(.16,1,.3,1);   /* alt deceleration */
}

/* tabular figures ONLY where numbers change — NOT a universal selector [F-M2] */
.r-tnum{font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1}

::placeholder{color:var(--r-fg2)}                 /* fg2, not fg3 — placeholders must be readable [A-M2] */

/* inline styles beat stylesheet :focus/:hover unless forced — these MUST be !important [F-C1] */
input:focus,textarea:focus{
  outline:none !important;
  border-color:var(--r-accent) !important;
  box-shadow:0 0 0 3px ${hexA(A,'22')} !important;
  background:var(--r-surf3) !important;
}
/* focus-visible ring for non-input controls only (inputs handled above) [F-M3][A-M3] */
:focus-visible:not(input):not(textarea){
  outline:none;
  box-shadow:0 0 0 2px var(--r-bg), 0 0 0 4px var(--r-accent);  /* solid accent, ≥3:1 [A-M3] */
}

::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-thumb{background:var(--r-surf2);border-radius:8px}
::-webkit-scrollbar-track{background:transparent}

/* reduced-motion blanket EXEMPTS the therapeutic breathing pacer [A-M5][F-H1][D-M1] */
@media (prefers-reduced-motion:reduce){
  *:not(.r-breathe),*:not(.r-breathe)::before,*:not(.r-breathe)::after{
    animation-duration:.001ms !important; animation-iteration-count:1 !important;
    transition-duration:.001ms !important;
  }
  .r-breathe{animation:breatheCalm 11s ease-in-out infinite !important} /* ≤0.35 opacity pulse */
}
` + KEYFRAMES /* §4.10 */ + PRESS_UTIL /* §4.3 */
```

> All `@keyframes` and the `.r-press` / `.r-breathe` utilities append to **this same** `<style>`.

### 2.3 Type scale

**Families:** body/UI = **DM Sans** (in `FONT_PACKAGES`). Soul/hero = **Fraunces** (variable, soft optical axis) via existing Google-Fonts injection. Georgia = Fraunces fallback.

Inject a **continuous** weight range so 360/380/420/460 resolve instead of snapping to 400 `[D-C3]`:
```
https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,340..500&family=DM+Sans:wght@400;500;600;700&display=swap
```

| Token | Family | Size | Weight | Letter-spacing | Line-height | Notes |
|---|---|---|---|---|---|---|
| `display` (hero day-count) | Fraunces | `clamp(4rem,10vw,7rem)` | 360 | -0.02em | 0.95 | tabular; `10vw` (not 12) so it never overflows the sidebar-offset column `[F-M7]` |
| `metric` (major value / section hero) | Fraunces | 34 (range 34–48) | 400 | -0.02em | 1.0 | StatCard / score / per-section hero `[D-H1]` |
| `title` / `h1` | DM Sans | 26 (modal 21) | 600 | -0.02em | 1.18 | |
| `subtitle` / `h2` | DM Sans | 20–21 | 600 | -0.005em | 1.25 | |
| `body-lg` | DM Sans | 17 | 400 | 0 | 1.5 | hero subline, intentions |
| `body` | DM Sans | **15** (floor) | 400 | 0 | 1.55–1.6 | |
| `body-strong` | DM Sans | 15 | 500 | 0 | 1.5 | inline emphasis |
| `label` (eyebrow) | DM Sans | 13 | 600 | 0.08em | 1.2 | UPPERCASE — **only true section eyebrows** `[D-M4]` |
| `caption` | DM Sans | 13 | 500 | 0 | 1.3 | sentence-case: journalDate, formLabel, inline captions `[D-M4]` |
| `micro` | DM Sans | 11 | 500 | 0.04em | 1.3 | timestamps, legends, axis ticks ONLY |
| `num` (UI numerals) | DM Sans | inherit | 600 | 0 | 1 | tabular via `.r-tnum` |

Hierarchy carried by **scale** (display 112 → label 13 ≈ 8.6×), not weight. Max two non-display weights visible per screen. Apply `.r-tnum` to every changing number; the hero numeral additionally gets a fixed `minWidth` in `ch` to kill count-up width wobble `[F-M1]`. No content text below 13px except `micro`. Uppercase tracked labels are **rationed** to eyebrows only `[D-M4]`.

### 2.4 Spacing (2px base — honestly redefined `[D-H5]`)

```js
const SP = { x0:2, x1:4, x2:6, x3:8, x4:10, x5:12, x6:14, x7:16, x8:20,
             x9:24, x10:32, x11:40, x12:48, x13:64, x14:80 };
```
The scale is a **2px** base (the spec previously claimed 4px while shipping 11/13/14/18/22). All padding below now snaps to SP. Card inner padding `20px 24px`; card gap `16`; section gap `32`; hero vertical padding `40–48`; between-stat-tiles `12`; label→value `6`.

### 2.5 Radius

```js
const RAD = { xs:10, sm:8, md:12, lg:16, xl:20, hero:24, x2l:28, pill:999 };
```
`xs:10` added so off-grid `10` radii are legal `[D-H4]`. inputs/pills/chips `8–12`; resting cards `12–16`; raised cards `20`; **heroBlock `RAD.hero` (24)** `[D-H4]`; modals `16` (16–28); rings/dots `999`. navBtn → `RAD.xs` (10).

### 2.6 Elevation

```js
const ELEV = {
  sm:'var(--r-shadow-sm)',
  md:'var(--r-shadow-md)',
  lg:'var(--r-shadow-lg)',
  glowHero:'var(--r-glow-hero)',     // warm horizon halo (HERO ONLY) — driven by --r-glow
  glowActive:'var(--r-glow-active)', // active nav/CTA — valid JS-built var, NOT var()+alpha [D-C2][F-C3]
  inset:'var(--r-inset)',
};
```
Depth = lightness step + soft warm shadow + optional `inset` top-sheen. **Never** a brighter border. Light theme softens automatically (the vars switch in §2.2). Use the lighter single-layer feel only on resting chips/inputs; reserve two-layer `md` for raised/hover cards and modals.

**Accent / glow tint ramp** (append 2-hex alpha in JS via `hexA(hex, '0d')` etc.):

| Token | ≈Alpha | Use |
|---|---|---|
| `+'0d'` | 5% | hero gradient floor, faint zone fill |
| `+'18'`/`'1f'` | 9–12% | active nav bg, selected pill bg, hover-card tint |
| `+'28'` | 16% | hover on active element, ring track-behind |
| `+'40'` | 25% | active border (paired with a 1px solid accent edge, not alone) |
| `+'cc'` | 80% | secondary accent text/icon |
| (full) | 100% | primary CTA fill, active nav icon, healthy ring stroke |

### 2.7 Motion tokens

```js
const DUR = { instant:80, fast:150, normal:240, slow:360,
              ringFill:900, countUp:1000, bloom:8000 };
const EASE = {
  dawn:'cubic-bezier(.22,1,.36,1)', // entrances, ring-fill, count-up, settle
  soft:'cubic-bezier(.4,0,.2,1)',   // press, hover, quick UI
  expo:'cubic-bezier(.16,1,.3,1)',  // alt
};
```

| Interaction | Duration | Easing | Property |
|---|---|---|---|
| Hover (cards/nav) | 150 | soft | `background`, `box-shadow`, `transform:translateY(-1→-2px)` |
| Press / active | 80–120 | soft | `transform:scale(.97)` |
| Card/section mount | 240 | dawn | `fadeRise` (opacity + 8px) |
| View crossfade | 220 | dawn | `viewIn` (opacity + 6px) |
| Ring fill | 900 | dawn | `stroke-dashoffset` (state-driven, §4.2) |
| Hero count-up | 1000 | dawn (easeOutCubic JS) | numeric tween |
| Fajr-bloom | 8000 loop | ease-in-out | opacity + scale (≤4% delta) — easing reconciled to ease-in-out `[D-M7]` |
| Theme / accent swap | 360 | dawn | color/background cross-fade |
| LineChart draw-on | 800 | dawn | `stroke-dashoffset` (via `pathLength="1"` `[F-H4]`) |
| Heatmap cell develop | 400 + `col*16ms` | dawn | opacity + scale(.6→1) |

All motion compositor-only; collapses under `prefers-reduced-motion` (§4.9), except the SOS breathing pacer.

### 2.8 Semantic + score colors

**Score ramp — DARK surfaces** (dark themes). Used ONLY inside the 4 SVG viz. Now carries a **monotonic lightness step** (high→crit descends in value) so it survives deuteranopia/grayscale `[A-H2]`:

```js
const SCORE_DARK = {
  high:'#5ad6a0',  // 80+   brightest
  mid :'#5fa0e8',  // 60–79
  low :'#e0992f',  // 40–59
  crit:'#cf6f6f',  // <40   darkest, dignified rose ("sunset, not alarm")
};
```

**Score ramp — LIGHT surfaces** (`dawn`, gated by `T.lightRamp`). All pass ≥4.5 on `#fbf8f2` and `#f4efe7` `[A-C1]`:

```js
const SCORE_LIGHT = { high:'#18815a', mid:'#2b6bad', low:'#946312', crit:'#a8413f' };

const scoreRamp = (T) => T.lightRamp ? SCORE_LIGHT : SCORE_DARK;
function scoreColor(s, T){ const R=scoreRamp(T);
  return s>=80?R.high : s>=60?R.mid : s>=40?R.low : R.crit; }
// empty/no-data cell: var(--r-surf2) @ .4 opacity
```

**HeatmapGrid must not encode score by color alone** `[A-H2]`: keep the ramp, but each cell ALSO maps score→fill-opacity (e.g. `.45 + s/100*.5`) so value is encoded in lightness, and expose `aria-label`/`title="{date}: {score}"` per cell. Today cell adds a 1.5px accent stroke (position cue, allowed chrome).

**Semantic (chrome / messaging) — own swatches, no overlap with the ramp:**
```js
const SEM = {
  success  : 'var(--r-accent)',  // affirmation = brand
  info     : '#6aa8ef',          // chrome blue, DISTINCT from SCORE.mid #5fa0e8 [D-H3]
  warn     : '#e6a23c',
  chromeRose:'#9c6b6b',          // chrome caution: invalid input, panic-rest border, missed marker.
                                 //   DISTINCT from viz SCORE.crit — ramp never becomes chrome [D-H2][A-M6]
  danger   : '#e5484d',          // RESERVED: panic/SOS surface ONLY. pressed #ef4444; relapse-confirm #dc2626.
  bizBlue  : '#3b82f6',          // business sub-app (BIZ_BLUE), unchanged
};
```

**Red** appears nowhere except the panic/SOS action and the relapse-confirm button, saturating only on press. **Degradation rule:** scored elements degrade toward `low → crit` (amber → rose), never toward `danger`. Post-relapse count uses `--r-fg2` + a `crit` accent — never zeroed-red, never the panic color.

```js
const TOKENS = { THEME_PRESETS, DEFAULT_THEME, SP, RAD, ELEV,
                 DUR, EASE, SCORE_DARK, SCORE_LIGHT, scoreRamp, SEM, scoreColor,
                 FONT:{ hero:'Fraunces', body:'"DM Sans"', fallbackSerif:'Georgia' } };
```

> **Accent normalization (prerequisite for all alpha math `[F-M4]`):** the per-account accent is user-settable, so `normalizeHex()` MUST expand 3-digit / resolve named colors to exactly `#rrggbb` **on save**. Every `hexA(A,'40')` glow/shadow/tint assumes 6-digit hex; a 3-digit accent silently breaks all of them.

---

## 3. Component Specs (keyed to `S` keys + the 4 SVG signatures)

### Cross-cutting rules
- Every `0.5px solid var(--r-bord)` → `1px solid var(--r-bord)` (token is now low-alpha; 0.5px renders inconsistently). **This includes the business tables** (`td` borders ~lines 3480–3896) — retokenize them to `var(--r-bord)` too, or they vanish/over-show `[F-M6]`.
- Every `fontFamily:"monospace"` on numerals → Fraunces + `.r-tnum`.
- **Remove every colored `borderTop`/`borderLeft` used purely as hierarchy** → replace with type scale, an `inset` rail, or a soft tint fill.
- Body floor 15px; nothing below 13px except `micro`.
- `--r-fg2` = labels/secondary AND **interactive control outlines** `[A-H1]`; `--r-fg3` = ONLY static empty/disabled/tertiary text.
- Accent-as-text uses `var(--r-accent-text)` (AA on light); accent-as-fill/stroke uses `var(--r-accent)`.
- Score ramp lives inside the 4 SVG viz only. Accent never enters scored viz; ramp never becomes chrome.

### Hover/press delivery `[F-C2]`
The codebase has **zero** hover today and inline styles cannot express `:hover`. Add one tiny hook and merge a hovered style object — this is the delivery mechanism for all card/nav/row/button hover specs:
```jsx
function useHover(){ const [h,setH]=useState(false);
  return [h,{ onMouseEnter:()=>setH(true), onMouseLeave:()=>setH(false),
              onTouchStart:()=>setH(true), onTouchEnd:()=>setH(false) }]; }
// usage: const [hov,hp]=useHover();  <div {...hp} style={{...S.card, ...(hov&&S.cardHover)}} />
```
`.r-press` (filter+scale only) handles press feedback; everything that changes background/border/box-shadow/transform on hover uses `useHover`. Touch targets keep ≥44px hit area via padding / invisible layer `[A-H3]`.

### 3.1 `app` / `sidebar` / `navBtn` / `navIcon`
- **app:** bg `var(--r-bg)`; color `var(--r-fg)`; fontFamily `var(--r-font,'DM Sans',system-ui,sans-serif)`. Keep flex/minHeight.
- **sidebar (240px):** bg `var(--r-surf)`; `borderRight:1px solid var(--r-bord)` + `boxShadow:"6px 0 24px rgba(7,8,14,.35)"`; padding `20px 14px`. `logo`: 17px Fraunces wght 460 (now resolvable `[D-C3]`), -0.02em, `--r-fg`; accent dot beside it, `boxShadow:hexA(A,'66')` glow.
- **navBtn:** padding `10px 12px` (≥44px hit area on mobile via min-height) `[A-H3]`; radius `RAD.xs` (10) `[D-H4]`; gap 10; **fontSize 15**; wght 500; color `var(--r-fg2)`; transparent; mb 2; `transition:"color 200ms var(--r-ease-soft),background 200ms var(--r-ease-soft)"`; `position:relative`. `className="r-press"` + `useHover`.
  - hover (state): bg `var(--r-surf2)`, color `var(--r-fg)`.
  - active: bg `var(--r-surf2)` (or `linear-gradient(90deg,${hexA(A,'1f')},${hexA(A,'0a')})`), color `var(--r-fg)`, wght 600 — **plus a sliding accent rail** (§4.4): absolute 3px bar, left 0, `height:active?20:0`, `borderRadius:2`, `background:var(--r-accent)`, `boxShadow:active?ELEV.glowActive:"none"`, `transition:"height 260ms var(--r-ease-dawn)"`. Icon tinted `var(--r-accent)`.
- **navIcon:** width 20, fontSize 15, color inherits; `transform:active?scale(1):scale(.94)`, opacity `.7→1`, `transition:"transform 200ms var(--r-ease-soft)"`.

### 3.2 `card` / `statCard` / `cardLabel` / `statGrid`
- **card:** bg `var(--r-surf)`; `1px solid var(--r-bord)`; radius 12; padding **`20px 24px`** `[D-H5]`; mb 16; boxShadow `ELEV.sm`. Interactive cards (via `useHover`): `cardHover` = `boxShadow:ELEV.md, transform:"translateY(-1px)"`. Static cards do NOT lift. Empty state inside: `--r-fg3`, 15px, centered, padding `28px 0`.
- **statCard:** **kill the colored `borderTop:2px`.** bg `var(--r-surf)`; `1px solid var(--r-bord)`; radius 12; padding **`16px 20px`** `[D-H5]`; boxShadow `ELEV.sm`; NO top border. Used only OFF dashboard (4-up grid killed — §5). Internals: label = `caption`/`label` token (13px `--r-fg2`, mb 10); value = **Fraunces metric 34 wght 400 tabular -0.02em lh 1**, color `--r-fg` (neutral) unless **diagnostic**, then `scoreColor(s,T)`.
- **statGrid:** gap 14; `1fr 1fr` mobile, `repeat(auto-fit,minmax(150px,1fr))` desktop.
- **cardLabel:** 13px, `--r-fg2`, wght 600, mb 14. Uppercase+tracking ONLY when it's a true section eyebrow `[D-M4]`.

### 3.3 `primaryBtn` / `secondaryBtn` / `ghostBtn` / `linkBtn`
- **primaryBtn (accent territory):** bg `var(--r-accent)`; color **`var(--r-on-accent)`** (luminance-derived, never hardcoded `#08120d` `[D-H6][A-M4]`); no border; padding `12px 18px`; radius `RAD.xs` (10); 15px/600; -0.01em; boxShadow `0 2px 12px ${hexA(A,'33')}`. hover (state) `filter:brightness(1.06)`, boxShadow `0 4px 18px ${hexA(A,'4d')}`. active `transform:translateY(1px),filter:brightness(.96)`. disabled bg `var(--r-surf2)`, color `var(--r-fg3)`, no shadow. `className="r-press"`.
- **secondaryBtn (neutral confirm):** bg `var(--r-surf2)`; color `var(--r-fg)`; `1px solid var(--r-bord)`; padding `12px 18px`; radius 10; 15px/600. hover bg `var(--r-surf3)`, border `rgba(255,255,255,.1)`. active `translateY(1px)`.
- **ghostBtn (tertiary/cancel):** transparent; color `var(--r-fg2)`; no border; padding `10px 14px`; radius 8; 15px/500. hover bg `var(--r-surf2)`, color `var(--r-fg)`. (≥44px hit area on mobile.)
- **linkBtn:** inline text links only; retint to `var(--r-accent-text)` (drop hardcoded `#60a5fa`).

### 3.4 `input` / `textarea`
- Both: bg `var(--r-surf2)`; `1px solid var(--r-bord)`; radius 8; color `var(--r-fg)`; **fontSize 15**; `transition:"border-color .15s,box-shadow .15s,background .15s"`.
- input padding `11px 13px`; textarea padding `12px 14px`, lh 1.6, `resize:vertical`, minHeight ~88.
- placeholder `var(--r-fg2)` (readable `[A-M2]`).
- focus (forced `!important` rule, §2.2 `[F-C1]`): border `var(--r-accent)`, `box-shadow:0 0 0 3px ${hexA(A,'22')}`, bg `var(--r-surf3)`.
- invalid: `1px solid var(SEM.chromeRose #9c6b6b)` — chrome rose, never the viz crit swatch, never pure red `[D-H2]`.

### 3.5 `overlay` / `modalBox` / setup
- **overlay:** bg `rgba(7,8,14,.72)` + `backdropFilter:"blur(8px)"` **and `WebkitBackdropFilter:"blur(8px)"`** (iOS PWA `[F-H5]`); flex-center; zIndex 100.
- **modalBox:** bg `var(--r-surf3)`; `1px solid rgba(255,255,255,.08)`; radius 16; padding 28; maxWidth 460; boxShadow `ELEV.lg`. Open anim §4.8.
  - `modalTitle`: 21px DM Sans 600, -0.02em, `--r-fg`, mb 8.
  - `modalSub`: 15px, `--r-fg2`, lh 1.6, mb 18.
  - `formRow` gap 8; `formLabel` 13px sentence-case `caption` `--r-fg2` `[D-M4]`.
- **setupCard:** bg `var(--r-surf3)`, radius 16, boxShadow `ELEV.lg`, padding `40px 34px`; `setupTitle` Fraunces 26 wght 420; `setupSub` 15px/`--r-fg2`.

### 3.6 Dashboard hero — new keys
`heroBlock`, `heroNumeral`, `heroMeta`, `heroMilestone`, `momentumRow` — full layout §5.1.

### 3.7 `milestoneChip` / `mLabel`
*Next* milestone absorbed into the hero (§5.1). Chip grid remains as the **past-milestone ledger** (demoted to Goals view).
- base: flex column, gap 4, padding `12px 6px`, radius 10, `1px solid var(--r-bord)`, bg `var(--r-surf)`, `transition:"all .3s"`.
- locked: bg `var(--r-surf)`, value `--r-fg3`, mLabel `--r-fg3`.
- reached: bg `linear-gradient(180deg,${hexA(A,'1f')},transparent)`, `1px solid ${hexA(A,'40')}`, value `var(--r-accent-text)`, `boxShadow:"0 0 12px ${hexA(A,'22')}"`. **No flame/confetti.**
- `mLabel`: 11px micro `--r-fg2`. `milestonesGrid` gap 8.

### 3.8 `habitCard` / `habitDot` / `checkBtn`
- **habitCard:** bg `var(--r-surf)`; `1px solid var(--r-bord)`; radius 12; padding **`12px 16px`** `[D-H5]`; mb 10; boxShadow `ELEV.sm`. Active/streak: **replace `borderLeft:3px`** with bg `linear-gradient(90deg,${hexA(A,'12')},var(--r-surf) 40%)` + `boxShadow:"${ELEV.sm}, inset 2px 0 0 var(--r-accent)"`. title 15px/`--r-fg`/600; meta 13px/`--r-fg2`. `lvlBadge`: bg `${hexA(A,'1a')}`, `1px solid ${hexA(A,'33')}`, color `var(--r-accent-text)`, 11px, radius 999, padding `2px 9px`.
- **habitDot:** visual size **18**, radius 999, `transition:"all .2s"`; **≥44px hit area via padding/invisible layer** `[A-H3]`. empty: `2px solid var(--r-fg2)` (outline must meet 3:1 — fg2 not fg3 `[A-H1]`), transparent. hover: `2px solid var(--r-accent)`. done: `2px solid var(--r-accent)`, bg `var(--r-accent)`, `boxShadow:"0 0 8px ${hexA(A,'55')}"`. missed: distinguished by **shape, not color alone** — a small centered dash/dot in solid `SEM.chromeRose`, not a faint low-alpha ring `[A-M6][D-H2]`. On unchecked→checked: `animation:justChecked?"checkPop 360ms var(--r-ease-dawn)":"none"`.
- **checkBtn:** visual size **30**, radius 999, flex-center, `transition:"all .2s"`, `className="r-press"`, **≥44px hit area** `[A-H3]`. default `2px solid var(--r-fg2)` `[A-H1]`, color `--r-fg2`. hover `2px solid var(--r-accent)`, color accent. checked `2px solid var(--r-accent)`, bg accent, color `var(--r-on-accent)`, `boxShadow:"0 0 10px ${hexA(A,'55')}"`.

### 3.9 `scheduleRow`
- Drop `borderLeft:2px` + per-row `borderBottom`. flex align center, padding `12px 14px`, radius 10, mb 4. **Touch-safe separation** (hover alone fails on mobile `[D-M5]`): a `var(--r-surf2)` inset hairline under each row OR zebra alternation, plus row gap 6–8 on mobile. hover (state) bg `var(--r-surf2)`.
- done: leading filled-accent `habitDot` + text `--r-fg2` + `textDecoration:"line-through"` @ .6 opacity.
- pending/now: 6px accent dot `boxShadow:"0 0 6px ${hexA(A,'66')}"` leading marker; time 13px tabular `--r-fg2`; label 15px `--r-fg`.

### 3.10 `journalEntry` / `journalDate` / `journalText`
- entry: bg `var(--r-surf)`; `1px solid var(--r-bord)`; radius 12; padding `18px 20px`; mb 12; boxShadow `ELEV.sm`. hover (if clickable) `ELEV.md`.
- `journalDate`: 13px **sentence-case `caption`** (not uppercase eyebrow `[D-M4]`), `--r-fg2`, mb 8.
- `journalText`: **15px**, color `var(--r-fg)`, lh 1.8; optional Fraunces wght 380.

### 3.11 Relapse / Panic / SOS — `panicBtn` / `sosBlock` / `relapseHero`
- **panicBtn (dashboard rescue, dignified at rest):** bg `var(--r-surf2)`; `1px solid ${hexA('#9c6b6b','48')}` (chrome rose `[D-H2]`); radius 10; padding `12px 16px`; color `#e6b3b3`; 15px/600; gap 8; boxShadow `ELEV.sm`; `className="r-press"`; ≥44px. Label "I need a moment". hover bg `rgba(156,107,107,.10)`, color `#f0c4c4`. **active/in-crisis: bg `#ef4444`, color `#fff`, boxShadow `0 0 24px rgba(239,68,68,.5)`** — the only pure red.
- **sosBlock / relapse modal:** bg `var(--r-surf3)`; `1px solid ${hexA('#9c6b6b','3a')}`; radius 16; padding 28; boxShadow `ELEV.lg`; atmosphere `radial-gradient(100% 70% at 50% 0%, rgba(156,107,107,.10), transparent)`. Title Fraunces 24 wght 420 `--r-fg`; body 15px/`--r-fg2`/1.7. Primary = `primaryBtn` (accent) "Begin again". Counter reframes cumulative growth; never "0"/"streak lost".
- **actionCard:** bg `var(--r-surf)`; `1px solid var(--r-bord)`; radius 10; padding `14px 16px`; mb 8; boxShadow `ELEV.sm`; title 15px/600 `--r-fg`; desc 15px/`--r-fg2`. Post-relapse cards tinted **accent**, not rose.

### 3.12 SVG components

**CircleRing({value,size,strokeWidth,delay=0,glow=false,role='diagnostic'})** — line 310
- Track stroke → `var(--r-bord)`. Progress arc: `stroke=role==='identity'?'var(--r-accent)':scoreColor(pct,T)`.
- State-driven fill (§4.2): `drawn` starts 0, `requestAnimationFrame(()=>setDrawn(pct))`; `transition:"stroke-dashoffset 900ms var(--r-ease-dawn)"`, optional `transitionDelay:${delay}ms` (cluster 0/120/240). Circle length = `2πr` (inline, no measure).
- Center text: **Fraunces chosen by ROLE, not pixel size** `[D-M2]` — identity/momentum/hero rings = Fraunces always; small inline diagnostic rings may use DM Sans. `fontSize:size*0.30`, wght 400, fill `var(--r-fg)` (neutral on identity; `scoreColor` only on diagnostic); unit label below `--r-fg2`; `.r-tnum`.
- `glow` prop (momentum/hero rings only): wrap in `filter:"drop-shadow(0 0 6px ${col}55)"` where **`col` is the ring's own score/identity color, NOT accent** `[D-M3]` — accent must not enter a scored viz.
- empty: track only @ .5 opacity, center "—" `--r-fg3`.
- reduced-motion: `drawn=pct` immediately, `transition:"none"`.

**HeatmapGrid({getScore})** — line 332
- CELL 11→**13**, GAP 2→**3**, rx 2→**3**.
- empty fill `var(--r-surf2)`, opacity **.4**.
- filled `scoreColor(s,T)`, **opacity encodes value too** `.45+s/100*.5` (non-color cue `[A-H2]`); `<40` renders the ramp rose (`crit`), never a harsh red block. Each cell: `aria-label`/`title="{date}: {score}"` `[A-H2]`.
- today cell: `stroke:"var(--r-accent)"`, `strokeWidth:1.5`.
- Mount: cells fade+scale in, staggered by column: `opacity drawn?1:0; transform drawn?scale(1):scale(.6); transition:"opacity 400ms var(--r-ease-dawn),transform 400ms var(--r-ease-dawn)"; transitionDelay:${col*16}ms`. Keep `overflowX:auto`.

**LineChart({data,height})** — line 363
- empty "Not enough data": `--r-fg3`, **14px**, DM Sans.
- **actual line stays neutral/accent ALWAYS** — never recolored by latest score `[D-H7]`: `stroke="var(--r-accent)"`, strokeWidth **2**. Area fill under: `<path fill="${hexA(A,'14')}">` to baseline. Draw-on via `pathLength="1"` + `strokeDasharray="1" strokeDashoffset` animated 0→ over **800ms** `var(--r-ease-dawn)` (no `getTotalLength` `[F-H4]`).
- **last dot only** colored by `scoreColor(latest,T)` (r 3.5); other dots r 2.5 match line.
- target line: `rgba(255,255,255,.18)`, dashed `4 3`; fades in @ .4 opacity after actual finishes.
- axis labels: `--r-fg2`, **11px** DM Sans (drop monospace). Legend `--r-fg2` 11px.

**StatCard** (line 4179) — §3.2 (Fraunces metric value, no top stripe, `scoreColor` only when diagnostic). **BizStatCard:** same but keep `BIZ_BLUE` territory; drop `borderLeft:3px` → boxShadow `ELEV.sm` + small `BIZ_BLUE` category dot; radius 10→12; value Fraunces 28.

---

## 4. Motion & Whimsy

Two spent emotions only: **milestone** (§4.5) and **relapse/SOS** (§4.7). All `transform`/`opacity`/`filter`/`stroke-dashoffset`; collapses under `prefers-reduced-motion` (§4.9) except the SOS pacer. **All alpha in keyframes is precomputed JS hex (`${hexA(...)}`), no `color-mix()`** `[F-H3]`.

### 4.1 Home hero — entrance + number roll
```jsx
const [heroIn,setHeroIn]=useState(false);
useEffect(()=>{const id=requestAnimationFrame(()=>setHeroIn(true));return()=>cancelAnimationFrame(id);},[]);
```
Each element: `opacity heroIn?1:0; transform heroIn?translateY(0):translateY(12px); transition:"opacity 700ms var(--r-ease-dawn),transform 700ms var(--r-ease-dawn)"; transitionDelay:…`.

| Element | delay | transition |
|---|---|---|
| fajr-bloom radial | 0ms | `opacity 1200ms dawn` |
| day numeral | 120ms | 700ms dawn |
| "days" label | 220ms | 600ms dawn |
| milestone subline | 320ms | 600ms dawn |
| "since {date}" | 400ms | 600ms dawn |
| panic button | 560ms | 600ms soft |

**Fajr-bloom** = absolutely-positioned div, `inset:0`, `borderRadius:"inherit"`, `pointerEvents:"none"`, **`background:"radial-gradient(120% 90% at 50% 18%, ${hexA(G,'38')} 0%, transparent 60%)"` — driven by `--r-glow` (warm horizon), NOT accent `[D-C1]`**, `animation:"fajrBloom 8s ease-in-out infinite"`. The only infinite ambient animation. **On an empty day-0 dashboard, the hero bloom is the single bloom — suppress the empty-state disc when the hero bloom is present** `[F-M8]`.

**Number roll** — once on mount, ~1000ms easeOutCubic, from `max(0,N-12)`:
```jsx
const [shownDays,setShownDays]=useState(()=>Math.max(0,dayCount-12));
useEffect(()=>{
  if(prefersReducedMotion){setShownDays(dayCount);return;}
  const from=Math.max(0,dayCount-12),to=dayCount,dur=1000,t0=performance.now();let raf;
  const tick=now=>{const p=Math.min(1,(now-t0)/dur);const e=1-Math.pow(1-p,3);
    setShownDays(Math.round(from+(to-from)*e));if(p<1)raf=requestAnimationFrame(tick);};
  raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
},[dayCount,prefersReducedMotion]);
```
Numeral: Fraunces `clamp(4rem,10vw,7rem)`, `.r-tnum` + fixed `minWidth` in `ch` (kills width wobble `[F-M1][F-M7]`), wght 360, lh 1, -0.02em, `--r-fg`, **`textShadow:"0 0 28px ${hexA(G,'4d')}"` — `--r-glow`, not accent `[D-C1]`**.

### 4.2 Ring fill (CircleRing)
State-driven, 900ms `var(--r-ease-dawn)`, arc sweeps from 12 o'clock as inner number counts in lockstep (`drawn` drives both). Cluster stagger via `delay` → `transitionDelay` 0/120/240ms. Track → `var(--r-bord)`. Center typeface chosen by **role** (§3.12 `[D-M2]`). Glow drop-shadow uses the ring's own color, never accent `[D-M3]`. Reduced-motion: `drawn=pct` immediately, `transition:"none"`.

### 4.3 Button press feedback
Append to the injected `<style>`:
```css
.r-press{transition:transform 120ms var(--r-ease-soft),filter 120ms var(--r-ease-soft);-webkit-tap-highlight-color:transparent}
.r-press:active{transform:scale(.97)}
.r-press:hover{filter:brightness(1.06)}
```
Attach to navBtn, checkBtn, catBtn, claimBtn, primaryBtn, actionCard, SOS button. Background/border/shadow hover changes go through `useHover` (§3, `[F-C2]`), NOT this class.

**Check-off micro-reward:** on unchecked→checked the dot runs `checkPop 360ms var(--r-ease-dawn)` (scale .8→1.12→1 + accent box-shadow flash). The single repeated dopamine beat — accent (affirmation), no confetti/sound.

### 4.4 Nav active transition
Sliding accent rail + fg shift + subtle surface lift; never repainted borders. Rail (absolute, left 0, 3px, `borderRadius:2`, `background:var(--r-accent)`, `height active?20:0`, `transform:translateY(-50%)`, `boxShadow active?ELEV.glowActive:"none"`, `transition:"height 260ms var(--r-ease-dawn),box-shadow 260ms var(--r-ease-soft)"`). Inactive icons `scale(.94)`. **View crossfade:** `<div key={view} style={{animation:"viewIn 220ms var(--r-ease-dawn)"}}>` — confirm no view holds uncommitted local form state before remounting on nav `[F-M5]`.

### 4.5 Milestone moment (spent emotion #1)
```jsx
const milestones=[7,14,30,60,90,180,270,365,500,730,1000];
const reached=milestones.filter(m=>dayCount>=m).pop();
useEffect(()=>{ if(reached&&reached!==account.lastSeenMilestone){setCelebrate(reached);upd({lastSeenMilestone:reached});} },[reached]);
```
In place on the hero (no modal). Auto-dismiss ~5s or tap:
1. Bloom surges: `fajrBloomSurge 2400ms var(--r-ease-dawn)` (glow alpha rises, scales larger, settles) — **glow-driven, warm** `[D-C1]`.
2. Numeral runs `milestoneGlow 2400ms` (glow text-shadow 28px→60px→28px).
3. Dignified line rises (opacity + translateY(14px)→0, 600ms, delay 300ms):
   - 7 "One week. The hardest part is behind you."
   - 14 "Fourteen days. This is becoming who you are."
   - 30 "A month of choosing differently. Quietly remarkable."
   - 60 "Sixty days. The new normal is taking root."
   - 90 "Ninety days. A new season of your life."
   - 180 "Half a year. This is who you are now."
   - 270 "Nine months. Steady, and still walking."
   - 365 "One year. Look how far the light has travelled."
   - 500 "Five hundred days. Quiet, uncommon strength."
   - 730 "Two years. A life rebuilt, day by day."
   - 1000 "A thousand days. Few ever walk this far."
   - *(fallback template for any uncovered value `[D-L3]`):* "{n} days. Still here, still walking."
4. Optional single `lightSweep 1400ms` diagonal ray (glow-tinted), one pass, then unmount.

### 4.6 Empty states — hope-first, glow disc not illustration
Reusable shape (`S.emptyState/emptyGlyph/emptyTitle/emptyBody/emptyCta`): centered, `padding:"clamp(2.5rem,8vh,5rem) 1.5rem"`, max-width 420. **Visual = 88px glow disc** (`borderRadius:"50%"`, **`background:"radial-gradient(circle at 50% 40%, ${hexA(G,'2e')}, transparent 70%)"` — `--r-glow`** `[D-C1]`, `animation:"fajrBloom 8s ease-in-out infinite"`). **Suppress this disc on the dashboard when the hero bloom is showing — only one bloom per screen** `[F-M8]`. Title Fraunces ~22px, body 15px `--r-fg2`, one CTA `r-press`. Entrance opacity 0→1 + translateY(10px)→0, 500ms dawn.

| Section | Title | Body | CTA |
|---|---|---|---|
| dashboard (day 0) | "Today is day one." | "Everything starts from a single quiet decision. You've already made it." | Set today's intention |
| routine | "Your day, designed." | "Add the few things that make a day feel like yours. Small and repeatable beats big and brittle." | Add first routine |
| habits | "Nothing to track yet — and that's fine." | "Choose one habit worth showing up for. One is enough to begin." | Add a habit |
| schedule | "An open calendar." | "Block the time you want to protect before the day fills itself." | Add a block |
| health/sleep | "No nights logged yet." | "Log last night whenever you're ready. Rest is part of the work, not a reward for it." | Log last night |
| goals/vision | "What are you walking toward?" | "Name one thing you want to become. Direction matters more than speed." | Name a goal |
| relapse | "A clean page." | "There's nothing here, and that's a good thing. If a hard moment comes, you'll find help here — not judgment." | *(no CTA; calm SOS entry only)* |
| rewards | "Promises to yourself." | "Set a small, kind reward for the milestones ahead. Something you'll actually look forward to." | Add a reward |
| journal | "The page is listening." | "A line or two is plenty. Tonight-you is writing to tomorrow-you." | Write the first entry |
| business/IhsanEd | "Your work, in one place." | "When you're ready to build alongside recovery, it starts here." | Add first client |

Relapse is the only empty state with **no CTA and no urging**.

### 4.7 Relapse / SOS interaction (spent emotion #2)
**7a. Panic button:** resting §3.11 (dignified, chrome-rose, not red), `r-press`, "I need a moment". On press: calming overlay fades in 400ms (backdrop → `rgba(0,0,0,0.6)`), panel rises translateY(20px)→0 500ms dawn.
- **Breathing guide:** single circle with `className="r-breathe"`, `animation:"breathe 11s ease-in-out infinite"` (4s in / 7s out) + "Breathe with this." **This node survives reduced-motion** (it's exempted in §2.2 and falls back to `breatheCalm`, a ≤0.35 opacity pulse) `[A-M5][F-H1]`.
- Copy (Fraunces, calm): "This feeling will pass. You don't have to act on it. You've gotten through 100% of your hardest days so far."
- Forward actions (vertical, large, `r-press`, ≥44px): "Call someone" / "Read my reasons" / "Du'a / breathe more" / "I'm okay now."
- Quiet "I slipped — log it" link at the very bottom, small.

**7b. Logging a relapse:** confirm button is the **only red surface** (`#dc2626`-class), framed "Yes, reset the count". Never failed/lost/broke/dirty. On confirm (~1600ms):
1. Number eases down over **1200ms** dawn; hero field shifts warm → muted rose (`#cf6f6f` low-alpha) — "a sunset, not an alarm."
2. Reframe line rises (600ms, delay 600ms): "You're here, and that matters. Begin again — not from zero, but from everything you've learned."
3. Persistent true tally: "Longest stretch: 34 days · 3rd fresh start."
4. After ~2.5s the rose fades back to the normal dawn field.
5. Follow-up: `postRelapseActions` as soft **accent** cards with `viewIn` stagger.

### 4.8 Secondary delight
- **HeatmapGrid:** cells fade+scale by column, "develops like a photo" (`col*16ms`, capped).
- **LineChart:** path draw-on via `pathLength="1"` dashoffset 800ms; target line fades to .4 after.
- **Dashboard cards:** stagger-rise (§4.1 pattern), 60ms steps.
- **Modal:** backdrop opacity 0→1 200ms; box opacity 0→1 + translateY(16px)→0 + scale(.98→1) 320ms dawn. Close reverses 180ms.
- **Reward claim (`claimBtn`):** one `checkPop`-style settle + small `fajrBloomSurge` behind the card.
- **Toast:** slide-up translateY(100%)→0 300ms dawn, auto-dismiss 2.8s, fade 200ms. Warm copy ("Saved. Sleep well.").

### 4.9 Reduced-motion gate
```jsx
const prefersReducedMotion=useSyncExternalStore(
  cb=>{const m=matchMedia("(prefers-reduced-motion: reduce)");m.addEventListener("change",cb);return()=>m.removeEventListener("change",cb);},
  ()=>matchMedia("(prefers-reduced-motion: reduce)").matches, ()=>false);
```
All count-ups jump to final; all `transition`/`animation` gate to `"none"`; CSS belt in §2.2 scopes the blanket to `*:not(.r-breathe)`. **SOS breathing circle stays** (functional) and reduces to a ≤0.35 opacity pulse via `breatheCalm` — nothing flashes/strobes/exceeds WCAG flash thresholds `[A-M5][F-H1]`.

### 4.10 @keyframes (append to the one injected `<style>`)
All alpha precomputed in JS — the strings below show the resolved form; emit them via template literals with `${hexA(G,'…')}` / `${hexA(A,'…')}`.
```css
/* slow dawn breath behind hero — the ONLY infinite ambient anim. ease-in-out [D-M7] */
@keyframes fajrBloom{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.04);opacity:1}}
/* milestone surge — sun cresting, one-shot ~2.4s */
@keyframes fajrBloomSurge{0%{transform:scale(1);opacity:.85}45%{transform:scale(1.28);opacity:1}100%{transform:scale(1);opacity:.85}}
/* habit/prayer check settle — accent flash (JS-built alpha, no color-mix) */
@keyframes checkPop{0%{transform:scale(.8);box-shadow:0 0 0 0 ${A}8c}55%{transform:scale(1.12);box-shadow:0 0 0 6px ${A}00}100%{transform:scale(1);box-shadow:0 0 0 0 transparent}}
/* view crossfade on nav change */
@keyframes viewIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
/* generic card/section mount */
@keyframes fadeRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
/* therapeutic SOS breathing pacer — 4s in / 7s out */
@keyframes breathe{0%{transform:scale(1);opacity:.55}36%{transform:scale(1.35);opacity:1}100%{transform:scale(1);opacity:.55}}
/* reduced-motion-safe SOS fallback — opacity only, ≤0.35 delta, no transform [A-M5] */
@keyframes breatheCalm{0%,100%{opacity:.6}50%{opacity:.92}}
/* single light-ray sweep on milestone (glow-tinted) */
@keyframes lightSweep{from{transform:translateX(-120%) skewX(-12deg);opacity:0}30%{opacity:1}to{transform:translateX(120%) skewX(-12deg);opacity:0}}
/* milestone numeral glow — warm horizon (--r-glow), NOT accent [D-C1] */
@keyframes milestoneGlow{0%{text-shadow:0 0 28px ${G}4d}50%{text-shadow:0 0 60px ${G}99}100%{text-shadow:0 0 28px ${G}4d}}
```
Consolidated: `viewIn` (6px) for view changes, `fadeRise` (8px) for card mounts; numeric count-ups are JS (§4.1); `ringFill` keyframe dropped (ring fill is state-driven §4.2).

**Motion budget:** one infinite ambient anim per screen (fajrBloom ~8s, ≤4% delta) — and on a day-0 dashboard the empty-state disc is suppressed so the count stays at one `[F-M8]`. One repeated micro-beat (checkPop). Entrances 220–900ms one-shot. Two emotional spends (milestone surge, relapse descent) slow + rare. Glow drives all warm bloom; accent drives affirmation; ramp never animates as chrome; red only on SOS/relapse-confirm.

---

## 5. Per-section Layout Notes

### 5.1 Dashboard — hero block owns top third
Replaces the 4-up `statGrid` + 8-ring radar (radar → Goals; KPI tiles killed; full milestone ledger → Goals).
- **`heroBlock`:** **`background:"radial-gradient(120% 90% at 50% 0%, ${hexA(G,'2a')} 0%, transparent 55%), linear-gradient(180deg, var(--r-surf3) 0%, var(--r-surf) 100%)"` — warm-horizon `--r-glow`, NOT accent** `[D-C1]`; `1px solid var(--r-bord)`; radius **`RAD.hero` (24)** `[D-H4]`; padding `clamp(28px,6vw,56px) 24px 32px`; mb 16; `position:relative; overflow:hidden; textAlign:center`; boxShadow `ELEV.md`. Contains the fajr-bloom child (§4.1).
- **`heroNumeral`:** Fraunces `clamp(4rem,10vw,7rem)` `[F-M7]`, wght 360, lh 0.95, -0.02em, `--r-fg`, `.r-tnum` + fixed `ch` minWidth; glow text-shadow; count-up §4.1.
- **`heroMeta`** ("since {date}"): 15px, `--r-fg2`, mt 4.
- **`heroMilestone`** ("12 days to 30 · steady"): 13px tinted `var(--r-accent-text)` @ .9, mt 12 + thin 4px progress sliver, bg `var(--r-surf2)`, fill `linear-gradient(90deg,var(--r-accent),${hexA(A,'cc')})`, radius 999, maxWidth 240, margin auto.
- **`momentumRow`** (replaces KPI tiles): flex, gap `clamp(16px,4vw,40px)`, justify center, padding `8px 0 4px`. 3 `CircleRing` (Routine · Salah · Sleep) size 80 desktop / 64 mobile, `glow` on (score-colored drop-shadow `[D-M3]`), Fraunces center by role `[D-M2]`, staggered 0/120/240ms; under it "3 of 5 done today" 15px `--r-fg2`. Then today-list as `scheduleRow`s.
- **Panic entry** lives inside/adjacent to heroBlock.
- Eye-arc: numeral → momentum → goals/last-night → reference.

### 5.2 Other sections — every view gets a real hero metric `[D-H1]`
Make these prescriptive (Fraunces `metric` 34–48px), not "card stacks":
- **habits:** hero = `X / Y today` completion (Fraunces); then `habitCard` stack.
- **routine:** hero = % of routine done / next item; then row stack.
- **schedule:** hero = next-block time (Fraunces); then `scheduleRow`s with touch-safe separators `[D-M5]`.
- **health/sleep:** hero = last-night duration (Fraunces metric); `LineChart` trend (neutral line, score-colored last dot `[D-H7]`, target dashed); "Log last night" CTA.
- **goals/vision:** hero = the named goal in Fraunces; hosts the demoted 8-ring life-areas radar (editable here) + past-milestone chip ledger (§3.7).
- **relapse:** calm by default; empty state with no urging; SOS flow §4.7; relapse-confirm is the only red surface; cumulative tally honored.
- **rewards:** hero = next reward / count claimed; `rewardCard` + `claimBtn`.
- **journal:** hero = a large Fraunces pull-quote of the latest line (or entry count); then `journalEntry` stack (15px body).
- **settings:** theme picker exposes 8 presets (`category:'base'|'exclusive'`), per-account accent (normalized to 6-hex on save `[F-M4]`), FONT_PACKAGES; `accRow`/`formRow` use new input/`caption` tokens; theme/accent swap cross-fades 360ms.
- **business/IhsanEd:** keeps `BIZ_BLUE`; `BizStatCard` restyled (Fraunces 28 value, no left stripe, category dot); same elevation/spacing/motion; blue where the main app uses accent. **Retokenize the existing business-table borders (~3480–3896) to `var(--r-bord)`** `[F-M6]`.

**Responsive:** desktop sidebar 240px (bg `--r-surf`, rightward shadow); mobile fixed 52px header + hamburger; hero scales (numeral `clamp` capped at `10vw` `[F-M7]`, momentum rings 64px). All primary touch targets ≥44px hit area `[A-H3]`. Mobile-first usable throughout.

---

## 6. Implementation Order Checklist

1. **Foundation (blocking) `[F-H2]`.** Add `surf3`, `fg3`, `glow` to all 8 presets; add `textAccent` + `lightRamp` to `dawn`. Add `normalizeHex()` on accent save `[F-M4]`. Replace the injected `<style>` (lines 788–790) wholesale with the §2.2 JS-built block (writes `--r-accent`, `--r-accent-text`, `--r-on-accent`, `--r-glow`, `--r-surf3`, `--r-fg3`, `--r-ease-*`, shadows, glow-active). Add `hexA`, `relLum`, `onAccent` helpers. No `color-mix`, no `var()+alpha` `[F-H3][D-C2][F-C3]`.
2. **Keyframes + utilities.** Append §4.10 keyframes, `.r-press`, `.r-tnum`, `.r-breathe` fallback, and the forced-`!important` `input:focus` / scoped `:focus-visible` rules `[F-C1][A-M3]`. Verify reduced-motion exempts `.r-breathe` `[A-M5][F-H1]`.
3. **Fonts `[D-C3]`.** Swap the Google-Fonts URL to `Fraunces:opsz,wght@9..144,340..500` + DM Sans; wire Fraunces into FONT_PACKAGES.
4. **Tokens.** Add `SP` (2px base), `RAD` (with `xs:10`), `ELEV` (var-backed), `DUR`/`EASE`, `SCORE_DARK`/`SCORE_LIGHT`/`scoreRamp`, `SEM` (own `info`/`chromeRose`), `scoreColor(s,T)`, `onAccent`.
5. **Hover/press infra `[F-C2]`.** Add `useHover()`; thread `prefersReducedMotion` (§4.9).
6. **SVG components.** CircleRing (state-fill, role-typeface `[D-M2]`, own-color glow `[D-M3]`), HeatmapGrid (opacity-encoded + aria `[A-H2]`, light ramp `[A-C1]`), LineChart (`pathLength="1"` `[F-H4]`, neutral line + score last-dot `[D-H7]`), StatCard/BizStatCard.
7. **Shared chrome.** Restyle `S`: app, sidebar, navBtn (+rail), card/statCard, input/textarea (chromeRose invalid `[D-H2]`), primaryBtn (`--r-on-accent` `[D-H6]`)/secondaryBtn/ghostBtn, overlay (`WebkitBackdropFilter` `[F-H5]`)/modalBox. Snap all padding to SP `[D-H5]`; control outlines fg2 `[A-H1]`; ≥44px hit areas `[A-H3]`.
8. **Dashboard hero (§5.1).** heroBlock (glow radial `[D-C1]`), heroNumeral (count-up + glow shadow + `ch` minWidth `[F-M1]`), momentumRow, panic entry, fajr-bloom (single bloom rule `[F-M8]`).
9. **Per-section heroes `[D-H1]`.** Add the §5.2 hero metric to habits/routine/schedule/health/goals/rewards/journal/business; touch-safe schedule separators `[D-M5]`; retokenize business-table borders `[F-M6]`.
10. **Emotional surfaces.** Milestone (§4.5, glow-driven, full copy table incl. fallback `[D-L3]`), relapse/SOS (§4.7, chrome-rose rest, lone red confirm, breathing pacer), empty states (§4.6).
11. **A11y/light pass.** Verify `dawn` ramp + `textAccent` contrast `[A-C1][A-C2]`; obsidian fg2 `[A-M1]`; placeholders fg2 `[A-M2]`; uppercase labels rationed to eyebrows `[D-M4]`; heatmap non-color cue under grayscale `[A-H2]`.
12. **Motion audit.** One infinite bloom per screen; reduced-motion collapses everything except the SOS pacer; count-ups jump to final; no `getTotalLength` reflow.

**Fix-first priority (the differentiator):** Step 1 + the `--r-glow` routing in steps 8/10 (`[D-C1]`), `ELEV.glowActive` as a var (`[D-C2]`), the Fraunces weight range (`[D-C3]`), and the light-theme ramp/textAccent (`[A-C1][A-C2]`). Without these the product renders *green and flat*, not *dawn* — that is the line between "Oura-grade warm" and "another dark dashboard with a big number."