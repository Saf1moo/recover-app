# Accessibility Specification — Recover PWA
## Target: WCAG 2.2 Level AA (AAA where noted)
## Status: Binding — all new and modified UI must comply before merge

---

## 0. Scope and Architecture Notes

**Platform:** Web PWA, React + Vite, single-page (no router), phone-primary.  
**Theme:** Warm light-first "almanac" aesthetic. The `Dawn` preset (`bg:#f4efe7`, `fg:#2a2723`) is the reference theme for all contrast verification. Dark themes (Fajr, etc.) are secondary and must independently pass all ratios.  
**Single-file constraint:** All styles live in the `S` object and `buildThemeCSS`. ARIA attributes, semantic HTML, and focus management are coded inline in JSX. This spec references those exact implementation points.

---

## 1. Color and Contrast

### 1.1 Required Ratios

| Text Type | Minimum Ratio | WCAG SC |
|---|---|---|
| Body text (< 18px regular, < 14px bold) | **4.5 : 1** | 1.4.3 AA |
| Large text (≥ 18px regular or ≥ 14px bold) | **3 : 1** | 1.4.3 AA |
| UI components (borders, icons, controls) | **3 : 1** | 1.4.11 AA |
| Focus indicator ring against adjacent color | **3 : 1** | 2.4.11 AA |
| Focus indicator enhanced (target AAA) | **4.5 : 1** | 2.4.13 AAA |
| Score ring track (unfilled arc) | **3 : 1** against background | 1.4.11 AA |

### 1.2 Per-Token Verification (Dawn / Light Theme as reference)

Run every token pair through the APCA/WCAG contrast formula before shipping. The values below are the **minimum required passing states**; if a token fails, it must be adjusted before use.

| Token pair | Usage | Required ratio |
|---|---|---|
| `fg` (`#2a2723`) on `bg` (`#f4efe7`) | Body text | 4.5 : 1 |
| `fg2` (`#6f6757`) on `bg` (`#f4efe7`) | Secondary text (small) | 4.5 : 1 — **must be verified; this pair is marginal** |
| `fg2` on `surf` (`#fbf8f2`) | Card secondary labels | 4.5 : 1 |
| `fg3` (`#a89f8e`) on any surface | Tertiary / placeholder | 3 : 1 minimum for non-text; **not usable for body text** |
| `accent` (`#2f9e74` textAccent in Dawn) on `bg` | Links, interactive labels | 4.5 : 1 |
| `SCORE_LIGHT.high` (`#18815a`) on `surf` (`#fbf8f2`) | Score text/ring stroke | 4.5 : 1 (text), 3 : 1 (graphic) |
| `SCORE_LIGHT.mid` (`#2b6bad`) on `surf` | Score text/ring stroke | 4.5 : 1 (text), 3 : 1 (graphic) |
| `SCORE_LIGHT.low` (`#946312`) on `surf` | Score text/ring stroke | 4.5 : 1 (text), 3 : 1 (graphic) — **must verify** |
| `SCORE_LIGHT.crit` (`#a8413f`) on `surf` | Score text/ring stroke | 4.5 : 1 (text), 3 : 1 (graphic) — **must verify** |
| White on `accent` (button label) | Primary button text | 4.5 : 1 — `onAccent()` already computes this; keep it |

For dark themes verify the same pairs against their respective `bg`/`surf` values.

### 1.3 No Color-Only Information Rule (SC 1.4.1)

**Every** status communicated by color must also carry a text label, icon, or shape. No exceptions.

| Component | Color meaning | Required redundant indicator |
|---|---|---|
| Streak ring (`CircleRing`) | Score quality | Numeric value inside ring + aria-label with score and band (e.g. "78 — Good") |
| Score color band (green/blue/amber/red) | Performance tier | Text label adjacent to ring: "Good", "Fair", "Low", "Critical" |
| Habit category dot | Category type | Category name always visible alongside dot |
| Prayer on-time indicator | Logged / missed | Checkmark icon + "Logged" or "Missed" text, not only fill color |
| Heatmap cell | Completion intensity | `aria-label` with date and score value on each cell |
| Reward locked state | Locked/unlocked | Lock icon + "X days remaining" text (already present, keep) |
| Error state on inputs | Invalid | Border color change + error icon + error text below field |
| Relapse-log "reset" warning | Destructive action | Warning icon + explicit text; never red-only |

### 1.4 Contrast Acceptance Checklist

Before any PR touching visual tokens, theme presets, or new UI components:

- [ ] Run all `fg`/`fg2` text pairings through [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/) or equivalent
- [ ] Run all score colors (light + dark variants) at both body-text size and graphic sizes
- [ ] Run focus ring color (`--r-accent`) against `--r-bg` and against the darkest adjacent surface — must reach 3 : 1 for SC 2.4.11
- [ ] Confirm `fg3` / placeholder color is never used as the sole carrier of essential information
- [ ] Confirm interactive element borders (input, button outlines) reach 3 : 1 against their background
- [ ] Re-run after any theme-preset change

---

## 2. Typography and Zoom

### 2.1 Minimum Font Sizes

| Use | Minimum | Recommended |
|---|---|---|
| Body / paragraph | **16px** | 16–17px |
| UI labels (nav, form labels) | **14px** | 15px |
| Secondary / metadata (dates, sub-labels) | **12px** with 3 : 1 contrast minimum | 13px |
| Absolute minimum anywhere | **11px** — only timestamps/badges; never interactive labels | — |

The current `fontSize: 11` entries in the code (prayer breakdown, goal period labels) are at the floor. No new UI may go below 11px, and existing 11px text must meet 3 : 1 contrast minimum against its background.

### 2.2 Zoom and Reflow (SC 1.4.4, 1.4.10)

- All text must remain readable and functional at **200% browser zoom** (SC 1.4.4).
- The layout must **reflow without loss of content or horizontal scrolling** at a **320px CSS viewport width** (SC 1.4.10). This is equivalent to 400% zoom on a 1280px screen.
- **Required implementation:** No fixed-width containers in the main content flow. Use `max-width` with `width: 100%`. The sidebar collapses to a bottom bar on mobile (already implemented) — verify the mobile bottom-bar + main area reflow at 320px with no content cut off.
- Do not use `overflow: hidden` on containers that hold essential text unless paired with a visible expand mechanism.
- The dashboard ring layout (three rings side-by-side) must stack vertically or shrink gracefully below ~400px — specify a `flex-wrap: wrap` fallback.

### 2.3 Text Spacing (SC 1.4.12)

Users must be able to apply the following overrides without loss of content or functionality:

```css
/* Test by injecting this bookmarklet */
* {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
p { margin-bottom: 2em !important; }
```

Required baseline values (do not use values below these in the `S` object):

| Property | Minimum in code |
|---|---|
| `lineHeight` on body text | **1.5** |
| `lineHeight` on headings | **1.2** |
| `lineHeight` on UI labels | **1.4** |
| `letterSpacing` | Leave as `normal`/`0` unless overridden — do not set a tight negative value |

Do not clip text with `overflow: hidden` + fixed `height` on paragraphs that may expand under user overrides.

---

## 3. Semantic Structure

### 3.1 Document Landmarks

The app shell must use these HTML5 landmark elements. No `<div>`s in place of these roles.

```jsx
// App shell (abbreviated)
<body>
  <a href="#main-content" className="skip-link">Skip to main content</a>

  {/* Mobile top bar: renders as <header> */}
  <header aria-label="App header">
    <button aria-label="Open navigation menu" aria-expanded={sidebarOpen} aria-controls="sidebar-nav">
      {/* hamburger icon */}
    </button>
    <span aria-hidden="true">{viewTitle}</span>
    {/* visible title — screen readers get the h1 inside main */}
  </header>

  {/* Sidebar: renders as <nav> */}
  <nav id="sidebar-nav" aria-label="Main navigation">
    {/* nav items */}
  </nav>

  {/* Content area */}
  <main id="main-content" tabIndex={-1}>
    {/* view content */}
  </main>
</body>
```

The `<nav>` already exists in the codebase (line 1434 / 1485). Ensure:
- It carries `aria-label="Main navigation"` (no duplicate unlabelled `<nav>` elements).
- The mobile hamburger button has `aria-expanded` and `aria-controls="sidebar-nav"`.
- `<main>` has `id="main-content"` and `tabIndex={-1}` so the skip link can focus it.

### 3.2 Heading Order

One `<h1>` per view, placed at the top of `<main>`. Subsequent headings descend: `h2` for sections, `h3` for subsections. Never skip levels.

| View | h1 | h2 examples |
|---|---|---|
| Dashboard | "Dashboard" (visually styled large) | "Today's Routine", "Habits", "Goals" |
| Routine | "Routine" | "Sleep", "Prayer" |
| Habits | "Habits" | each habit name (if expanded as a card) |
| Journal | "Journal" | entry dates |
| Relapse | "Relapse Protocol" | "Post-relapse tools", "My protocol" |
| Settings | "Settings" | "Account", "Theme", "Notifications" |

Currently the app uses `<div style={S.sectionTitle}>` in many places. These must become `<h2>` (or be `role="heading" aria-level="2"` only as a last resort — prefer native elements).

The PIN/lock screen's `<h1>` already exists ("Welcome back" / "Set your PIN") — keep it.

### 3.3 Lists

- Habit lists: `<ul>` / `<li>` per habit item.
- Prayer time list: `<ul>` with each prayer as `<li>`.
- Navigation items inside `<nav>`: `<ul>` / `<li>` wrapping each `<button>`.
- Post-relapse action checklist: `<ul role="list">` with each action as `<li>`.
- Milestone list: `<ol>` (ordered) since sequence matters.
- Journal entries: `<ul>` sorted by date, each entry as `<li>` containing `<article>`.

### 3.4 SPA View-Change Announcement Strategy

Since there is no router and no URL change, screen readers receive no natural navigation event. The following mechanism is required:

**Step 1 — Announce region (add once to App shell):**

```jsx
// Placed once at the bottom of <body>, outside <main>
<div
  id="route-announcer"
  role="status"
  aria-live="polite"
  aria-atomic="true"
  style={{
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    border: 0,
  }}
/>
```

**Step 2 — Fire on every view change:**

```jsx
// Inside the setView wrapper
function navigateTo(newView) {
  setView(newView);
  // Defer one tick so the DOM has updated
  setTimeout(() => {
    const el = document.getElementById('route-announcer');
    if (el) el.textContent = '';
    requestAnimationFrame(() => {
      if (el) el.textContent = VIEW_TITLES[newView] + ' — loaded';
    });
  }, 0);
}
```

**Step 3 — Move focus to `<main>`:**

```jsx
// In the same navigateTo, after announcement
requestAnimationFrame(() => {
  document.getElementById('main-content')?.focus();
});
```

`VIEW_TITLES` is a constant map of view ID → human label, e.g.:
```js
const VIEW_TITLES = {
  dashboard: 'Dashboard',
  routine: 'Routine',
  habits: 'Habits',
  goals: 'Goals',
  relapse: 'Relapse Protocol',
  rewards: 'Rewards',
  journal: 'Journal',
  settings: 'Settings',
  schedule: 'Schedule',
  health: 'Health',
};
```

### 3.5 Active Navigation State (SC 4.1.2)

Active nav button must carry `aria-current="page"`:

```jsx
<button
  aria-current={view === n.id ? 'page' : undefined}
  onClick={() => navigateTo(n.id)}
>
```

---

## 4. Keyboard Operability

### 4.1 Full Keyboard Coverage

Every interactive element must be reachable and operable with keyboard alone. Mandatory checks:

- All `<button>` and `<a>` elements receive focus in logical DOM order.
- No `onClick` on non-interactive elements (`<div>`, `<span>`, `<li>`) without adding `role="button"` + `tabIndex={0}` + `onKeyDown` for Enter/Space. Prefer converting to `<button>`.
- The hamburger/sidebar toggle: native `<button>`.
- All modal close buttons: native `<button>` receiving focus on modal open.
- Habit check-off: native `<button>` or `<input type="checkbox">`.
- The "Log a relapse" sidebar item: native `<button>`.
- Heatmap cells: if interactive, `<button>`; if decorative/informational only, `role="img"` with `aria-label` on the `<svg>` and individual cells described.

### 4.2 Tab Order

Logical left-to-right, top-to-bottom within each view. Rules:

- `tabIndex={0}` only on non-native elements that must receive focus.
- `tabIndex={-1}` on: `<main id="main-content">` (programmatic focus only), modal containers (focus moves to first focusable child).
- Never use `tabIndex > 0` (positive integers) — these create non-obvious ordering.
- The sidebar navigation and main content area should be in DOM order that matches visual reading order. On mobile, ensure the bottom nav renders after `<main>` in DOM so tab order goes: skip link → main content → bottom nav.

### 4.3 Focus Indicator Specification (SC 2.4.11 AA, 2.4.13 AAA target)

The existing global rule in `buildThemeCSS`:

```css
:focus-visible:not(input):not(textarea) {
  outline: none;
  box-shadow: 0 0 0 2px var(--r-bg), 0 0 0 4px var(--r-accent);
}
```

This double-ring (2px offset + 2px visible ring) satisfies SC 2.4.11 **only if** `--r-accent` achieves ≥ 3 : 1 contrast against `--r-bg`. The `--r-accent` for each theme must be verified (see Section 1 checklist).

**For SC 2.4.13 (AAA target):** The ring must additionally have ≥ 3 : 1 contrast against adjacent non-focused UI. The ring's minimum area must be at least a 2px perimeter. The current 4px total ring (2px offset + 2px ring) satisfies this. Do not reduce below 2px ring width.

**Input-specific focus rule** (already in code):

```css
input:focus, textarea:focus {
  outline: none !important;
  border-color: var(--r-accent) !important;
  box-shadow: 0 0 0 3px [accent at 13% opacity] !important;
}
```

The accent border alone on an input may not reach 3 : 1 against the input background color. Add the double-ring to inputs too:

```css
input:focus-visible, textarea:focus-visible, select:focus-visible {
  border-color: var(--r-accent) !important;
  box-shadow: 0 0 0 2px var(--r-bg), 0 0 0 4px var(--r-accent) !important;
}
```

**Never** suppress `focus-visible` without providing an equivalent visible alternative.

### 4.4 Skip Link (SC 2.4.1)

Required at the very top of the DOM, before any other focusable element:

```jsx
// In App return, first element
<a
  href="#main-content"
  style={{
    position: 'absolute',
    top: -9999,
    left: -9999,
    zIndex: 9999,
    padding: '12px 20px',
    background: 'var(--r-accent)',
    color: 'var(--r-on-accent)',
    fontWeight: 600,
    fontSize: 15,
    borderRadius: 8,
    textDecoration: 'none',
  }}
  onFocus={e => {
    e.currentTarget.style.top = '8px';
    e.currentTarget.style.left = '8px';
  }}
  onBlur={e => {
    e.currentTarget.style.top = '-9999px';
    e.currentTarget.style.left = '-9999px';
  }}
>
  Skip to main content
</a>
```

### 4.5 Modal / Sheet Focus Management (SC 2.1.2)

Every modal (`modal === "sleepLog"`, `"relapseLog"`, `"postRelapse"`, `"panic"`, habit add/edit, settings, etc.) must:

1. **On open:** Move focus to the modal container or its first meaningful focusable child (the heading or the first interactive control — not a destructive action).
2. **Trap focus inside:** Tab and Shift+Tab cycle only within the modal. Implement with a focus-trap utility:

```jsx
// useFocusTrap hook
import { useEffect, useRef } from 'react';

export function useFocusTrap(isActive) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const focusable = containerRef.current.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    function handleKeyDown(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}
```

3. **On close:** Return focus to the element that triggered the modal open. Store the trigger ref before opening:

```jsx
const triggerRef = useRef(null);
// When opening:
triggerRef.current = document.activeElement;
setModal('relapseLog');
// When closing:
setModal(null);
triggerRef.current?.focus();
```

4. **Escape key:** Close the modal. Add to the modal container's `onKeyDown`:

```jsx
onKeyDown={e => { if (e.key === 'Escape') closeModal(); }}
```

5. **ARIA on modal container:**

```jsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title-id"
  ref={trapRef}
>
  <h2 id="modal-title-id">{title}</h2>
  ...
</div>
```

The backdrop `onClick` close (already present) is correct. Ensure `e.stopPropagation()` stays on the inner box.

### 4.6 No Keyboard Traps (SC 2.1.2)

After implementing focus trap in modals, verify:
- Once a modal is closed, no focusable element is stranded outside the natural tab order.
- The sidebar on mobile must not trap focus; Escape or the close button must return focus to the hamburger trigger.

---

## 5. Touch and Pointer

### 5.1 Target Size (SC 2.5.8 AA — minimum 24x24px; design to 44x44px)

| Component | Minimum rendered size | Note |
|---|---|---|
| Primary action buttons | **44 × 44 px** | `minHeight: 44, minWidth: 44` |
| Navigation buttons (`S.navBtn`) | **44 × 40 px** — already `minHeight: 40`; expand to 44 | Increase to `minHeight: 44` |
| Icon-only buttons (close modal, edit, delete) | **44 × 44 px** — use padding to expand hit area, not visual size | |
| Habit checkbox / toggle | **44 × 44 px** hit area | |
| Prayer log cells | **44 × 44 px** | |
| Heatmap cells | Visual size acceptable below 44px **only if** non-interactive (display only) | If tappable: ≥ 44px |
| Score ring (decorative) | No target requirement if non-interactive | |

**Implementation:** When the visual size must remain small, expand the hit area with `padding` or an absolutely-positioned `::after` pseudo-element:

```css
/* For a 24px icon button that needs 44px hit area */
.icon-btn {
  position: relative;
  width: 24px;
  height: 24px;
}
.icon-btn::after {
  content: '';
  position: absolute;
  inset: -10px; /* expands to 44px total */
}
```

In React inline-style context:

```jsx
<button
  style={{
    position: 'relative',
    width: 24,
    height: 24,
    padding: 10,         // expands clickable area to 44px
    margin: -10,         // compensates layout shift
    boxSizing: 'content-box',
  }}
/>
```

### 5.2 Spacing Between Adjacent Targets (SC 2.5.8)

Adjacent interactive elements must have at least **4px** of non-interactive space between their bounding boxes. Navigation buttons stacked vertically with `marginBottom: 2` currently provide 2px — increase to `marginBottom: 4`.

### 5.3 No Path-Based or Multi-Point Gestures (SC 2.5.1)

No swipe-only gestures for essential functionality. If swipe-to-dismiss or pull-to-refresh is added, provide a visible alternative button.

### 5.4 Drag Alternatives (SC 2.5.7)

If any draggable UI is introduced (reordering habits, goals, schedule items), a single-pointer (tap/click) alternative must exist — e.g., up/down arrow buttons for reordering.

---

## 6. Screen Reader Support

### 6.1 Icon-Only Button Labelling (SC 4.1.2)

Every button that carries no visible text label must have an `aria-label`. The label text must describe the action, not the icon.

| Button | aria-label |
|---|---|
| Close modal (×) | `"Close"` |
| Delete habit | `"Delete habit: {habit.name}"` |
| Edit habit | `"Edit habit: {habit.name}"` |
| Add new habit | `"Add new habit"` |
| Lock app | `"Lock app"` |
| Open sidebar | `"Open navigation menu"` |
| Close sidebar | `"Close navigation menu"` |
| Prayer log toggle | `"Log {prayerName} prayer"` or `"Mark {prayerName} as missed"` |
| Habit check-off | `"Mark {habit.name} complete"` or `"Unmark {habit.name}"` |

All emoji icons in buttons must be wrapped in `<span aria-hidden="true">` to suppress their verbose VoiceOver descriptions:

```jsx
<button aria-label="Delete habit: Morning mindfulness">
  <span aria-hidden="true">🗑</span>
</button>
```

### 6.2 CircleRing Announcement

The `CircleRing` SVG component currently accepts `aria-label` as a prop but renders it on the `<svg>` element. The full required pattern:

```jsx
// CircleRing — accessible version
<svg
  role="img"
  aria-label={label ?? `Score: ${value} out of 100`}
  width={size}
  height={size}
  viewBox={`0 0 ${size} ${size}`}
  focusable="false"    // IE/Edge compat — prevents svg from being focusable
>
  {/* SVG paths */}
</svg>
```

The `label` prop passed to `CircleRing` must include both the value and the contextual band:

```jsx
// Dashboard combined score ring
<CircleRing
  value={todayCombinedScore}
  label={`Today's score: ${todayCombinedScore} out of 100, ${scoreBand(todayCombinedScore)}`}
/>

// Sleep ring
<CircleRing
  value={todaySleepScore}
  label={`Sleep score: ${todaySleepScore ?? 'no data'} out of 100`}
/>

// Prayer ring
<CircleRing
  value={todayPrayerScore}
  label={`Prayer score: ${todayPrayerScore ?? 'no data'} out of 100`}
/>
```

`scoreBand` helper:
```js
function scoreBand(s) {
  if (s >= 80) return 'Good';
  if (s >= 60) return 'Fair';
  if (s >= 40) return 'Low';
  return 'Critical';
}
```

Purely decorative rings (background track arc) carry `aria-hidden="true"`.

### 6.3 Sobriety Streak Announcement

The streak counter on the dashboard is a number + ring + milestone label. Screen readers must get the complete picture without reading color:

```jsx
<div aria-label={`Sobriety streak: ${daysSober} days sober since ${sobrietyStartFormatted}`}>
  <span aria-hidden="true">{daysSober}</span>
  <span aria-hidden="true">days sober</span>
</div>
```

If a milestone is active:
```jsx
<div aria-label={`Sobriety streak: ${daysSober} days. Milestone reached: ${milestone.label}`}>
```

### 6.4 Live Region Strategy

One persistent `role="status" aria-live="polite"` region and one `role="alert" aria-live="assertive"` region placed at the bottom of `<body>`.

```jsx
// In App shell, outside <main>
<div id="polite-announcer"  role="status" aria-live="polite"  aria-atomic="true" style={srOnly} />
<div id="urgent-announcer" role="alert"  aria-live="assertive" aria-atomic="true" style={srOnly} />
```

The `srOnly` style (same as skip link when not focused):
```js
const srOnly = {
  position: 'absolute', width: 1, height: 1,
  padding: 0, margin: -1, overflow: 'hidden',
  clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
};
```

Helper:
```js
function announce(message, priority = 'polite') {
  const id = priority === 'assertive' ? 'urgent-announcer' : 'polite-announcer';
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = message; });
}
```

| Event | Priority | Message |
|---|---|---|
| Habit checked | `polite` | `"{habit.name} marked complete"` |
| Habit unchecked | `polite` | `"{habit.name} unmarked"` |
| Prayer logged | `polite` | `"{prayerName} prayer logged"` |
| Sleep logged | `polite` | `"Sleep logged. Score: {score}"` |
| Score updates after logging | `polite` | `"Today's score updated to {score}"` |
| Form validation error | `assertive` | `"Error: {error message}"` |
| PIN incorrect | `assertive` | `"Incorrect PIN. Please try again."` |
| Relapse logged — streak reset | `polite` (NOT assertive — see Section 9) | `"Relapse logged. Sobriety counter has been reset. Opening your post-relapse protocol."` |
| Reward claimed | `polite` | `"Reward claimed: {reward.name}"` |
| Network / save error | `assertive` | `"Unable to save. Check your connection."` |

### 6.5 ARIA Usage Discipline

Use ARIA only where native HTML semantics are insufficient.

**Use native HTML first:**
- `<button>` over `<div role="button">`
- `<input type="checkbox">` over a `<div>` with custom check behavior
- `<ul>/<li>` over `role="list"` unless resetting `list-style:none` in Safari (in which case add `role="list"` to the `<ul>`)
- `<label>` over `aria-label` on inputs where a visible label exists

**Legitimate ARIA uses in this app:**
- `role="dialog" aria-modal="true"` on modals (no native `<dialog>` equivalent in current code structure)
- `aria-live` regions for dynamic content
- `aria-expanded` on sidebar toggle button
- `aria-current="page"` on active nav
- `aria-label` on icon-only buttons
- `aria-describedby` pointing to error messages
- `role="img"` on SVG charts
- `aria-hidden="true"` on decorative emoji, icons, and purely visual elements

---

## 7. Forms

### 7.1 Label Association (SC 1.3.1, 3.3.2)

Every input must have a visible, associated label. Use `<label htmlFor>` as the primary method.

```jsx
// Journal entry
<label htmlFor="journal-entry-input">Journal entry</label>
<textarea id="journal-entry-input" ... />

// Sleep bedtime
<label htmlFor="sleep-bedtime">Bedtime</label>
<input id="sleep-bedtime" type="time" ... />

// Habit name
<label htmlFor="habit-name-input">Habit name</label>
<input id="habit-name-input" type="text" ... />
```

Where a visible label would be redundant (e.g., a search input inside a `<form role="search">` with a visible placeholder), provide `aria-label` on the input. **Placeholder text alone is never sufficient** as a label — it disappears on focus and has inadequate contrast in most themes.

### 7.2 Required Fields (SC 3.3.2)

Required inputs must be marked with:
1. A visible indicator (an asterisk `*` with a legend "* Required" at the top of the form, or the word "Required").
2. `required` attribute (or `aria-required="true"` if the field is custom).

```jsx
<label htmlFor="relapse-note">
  What happened?
  <span aria-hidden="true"> (optional)</span>
</label>
<textarea
  id="relapse-note"
  aria-describedby="relapse-note-hint"
/>
<span id="relapse-note-hint" style={{ fontSize: 12, color: 'var(--r-fg2)' }}>
  Optional. You can write as much or as little as you need.
</span>
```

### 7.3 Error Identification and Recovery (SC 3.3.1, 3.3.3)

**On error:**
1. Mark the input invalid: `aria-invalid="true"`
2. Connect the error message: `aria-describedby="{input-id}-error"`
3. Display the error as visible text with an error icon — never color alone
4. Move focus to the first errored field (not a banner at top of form)
5. Announce via `assertive` live region

```jsx
// Error state example
<div>
  <label htmlFor="pin-input">PIN</label>
  <input
    id="pin-input"
    type="password"
    inputMode="numeric"
    aria-invalid={authError ? 'true' : 'false'}
    aria-describedby={authError ? 'pin-error' : undefined}
  />
  {authError && (
    <span
      id="pin-error"
      role="alert"
      style={{ color: 'var(--r-danger)', fontSize: 13, marginTop: 4, display: 'flex', gap: 4 }}
    >
      <span aria-hidden="true">⚠</span>
      {authError}
    </span>
  )}
</div>
```

Note: `role="alert"` on the error message span provides a per-field error live region as an alternative to the global announcer. Both approaches are acceptable; pick one and be consistent.

### 7.4 PIN / Lock Input Accessibility

```jsx
// New PIN creation
<label htmlFor="pin-new">Choose a PIN (4–8 digits)</label>
<input
  id="pin-new"
  type="password"
  inputMode="numeric"
  autoComplete="new-password"
  minLength={4}
  maxLength={8}
  pattern="[0-9]*"
  aria-describedby="pin-new-hint"
/>
<span id="pin-new-hint">Your PIN must be 4 to 8 digits. No letters.</span>

// PIN confirm
<label htmlFor="pin-confirm">Confirm PIN</label>
<input
  id="pin-confirm"
  type="password"
  inputMode="numeric"
  autoComplete="new-password"
/>

// Unlock (existing PIN)
<label htmlFor="pin-unlock">PIN</label>
<input
  id="pin-unlock"
  type="password"
  inputMode="numeric"
  autoComplete="current-password"
/>
```

The `inputMode="numeric"` is already correct (line 1278). Add `autoComplete` attributes as above.

Do not provide a "show PIN" toggle that is icon-only without a label. If added: `aria-label="Show PIN"` / `aria-label="Hide PIN"` with `aria-pressed` state.

### 7.5 Sleep Entry Form

```jsx
<form aria-labelledby="sleep-form-title">
  <h2 id="sleep-form-title">Log your sleep</h2>

  <label htmlFor="sleep-bedtime">Bedtime</label>
  <input id="sleep-bedtime" type="time" aria-describedby="sleep-bedtime-hint" />
  <span id="sleep-bedtime-hint">Enter the time you went to bed</span>

  <label htmlFor="sleep-waketime">Wake time</label>
  <input id="sleep-waketime" type="time" />
</form>
```

### 7.6 Journal Entry Form

```jsx
<form aria-labelledby="journal-form-title">
  <h2 id="journal-form-title">New journal entry</h2>
  <label htmlFor="journal-content">Entry</label>
  <textarea
    id="journal-content"
    aria-describedby="journal-hint"
    rows={6}
  />
  <span id="journal-hint" style={srOnly}>
    Write freely. Your journal is private and stored only on your device.
  </span>
</form>
```

### 7.7 Autocomplete (SC 1.3.5)

Where applicable, add `autoComplete` hints:

| Field | `autoComplete` value |
|---|---|
| Name (account setup) | `"name"` |
| PIN (new) | `"new-password"` |
| PIN (unlock) | `"current-password"` |
| All other app fields | `"off"` or omit (personal health data — do not autofill) |

### 7.8 Redundant Entry (SC 3.3.7)

Do not ask for the same information twice in a single flow. The post-relapse form and settings form do not have this issue currently. If multi-step forms are added, pre-populate confirmed fields.

---

## 8. Motion

### 8.1 `prefers-reduced-motion` (SC 2.3.3 AAA target)

The existing CSS already handles this correctly (line 210 of `buildThemeCSS`):

```css
@media (prefers-reduced-motion: reduce) {
  *:not(.r-breathe), *:not(.r-breathe)::before, *:not(.r-breathe)::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
  .r-breathe {
    animation: breatheCalm 11s ease-in-out infinite !important;
  }
}
```

This is compliant. Additional requirements:

- The `viewIn` / `fadeRise` view-transition animations: acceptable at full duration, but must be suppressed under reduced-motion. They are already caught by the global rule.
- The `fajrBloom` glow pulse on the dashboard: already caught. Confirm the background radial gradient pulse (line 4316 `animation: prm ? "none" : "fajrBloom"...`) respects the `prm` state correctly.
- **`prm` state must be derived from `window.matchMedia('(prefers-reduced-motion: reduce)')`** and must update dynamically (use `useSyncExternalStore` or a `useEffect` listener):

```jsx
const prm = useSyncExternalStore(
  (cb) => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  },
  () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  () => false,
);
```

### 8.2 No Motion-Only Meaning (SC 1.4.2 principle)

No information may be conveyed through animation alone:
- The ring fill animation (`ringFill: 900ms`) is decorative — the final value is always rendered in the `aria-label`. Compliant.
- The streak milestone "bloom" glow: decorative. The milestone label is text. Compliant.
- The `lightSweep` animation on habit checks: decorative. The state change must also be communicated via text and ARIA state. Ensure the checked state updates an `aria-pressed` or `aria-checked` attribute immediately, not after the animation completes.

### 8.3 No Auto-Playing Media (SC 1.4.2)

- No audio or video auto-plays anywhere.
- The breathing circle (`r-breathe`) is a looping CSS animation. It is not audio and does not convey information. Compliant. It does slow to `breatheCalm` under reduced-motion — this is correct.

### 8.4 Pause, Stop, Hide (SC 2.2.2)

Any animation that loops indefinitely must either:
- Be purely decorative and cause no cognitive distraction, OR
- Have a pause mechanism visible within 2 pixels of the animation.

The `fajrBloom` (8s pulse, line 201) and `breathe` (on `r-breathe`) are ambient background effects. They qualify as decorative. No pause control is required as long as they are suppressed under `prefers-reduced-motion`. This is already the case.

---

## 9. The Relapse Flow — Dignity and Accessibility

### 9.1 Tone and Language Principles

This flow is emotionally charged. Accessibility requirements extend beyond technical compliance to usability under distress:

- No alarm/siren-red visual dominance. The relapse log modal uses `⚠` icon and a muted warning style — keep this. Do not add animated danger states.
- No flashing or rapid color changes. Prohibited unconditionally under SC 2.3.1 (three flashes per second).
- Language must be compassionate and present-tense: "Log a relapse" not "RELAPSE DETECTED". "Your counter has been reset" not "Streak LOST".
- The post-relapse screen must open automatically after logging, not leave the user on an empty dashboard with a reset counter.

### 9.2 Flow Sequence and Focus Management

```
[1] Trigger: User clicks "Log a relapse" button in sidebar
    → Focus on trigger button is recorded (triggerRef.current = document.activeElement)
    → Modal "relapseLog" opens
    → Focus moves to the modal's heading ("Log a relapse")

[2] User writes optional note, confirms
    → On confirm: streak resets, sobrietyStart updated
    → Live region (polite): "Relapse logged. Your sobriety counter has been reset.
                              Opening your post-relapse protocol now."
    → Modal transitions to "postRelapse" (not a new modal open — update modal state)
    → Focus moves to the "postRelapse" modal heading: "What to do right now"

[3] Post-relapse checklist
    → Actions rendered as <ul> with <li> per action
    → Each action has a checkbox (<input type="checkbox">) with associated <label>
    → User ticks each item; no live announcement per tick (too verbose)
    → A summary count ("3 of 4 actions completed") updates with aria-live="polite"

[4] User completes protocol and dismisses
    → Click "Return to dashboard" or equivalent
    → Modal closes
    → Focus returns to the dashboard's main heading or the streak counter
    → Do NOT return focus to "Log a relapse" trigger — that would re-surface the trigger
      immediately after a painful event. Return to a neutral anchor.

[5] Panic/crisis button ("SOS" / crisis tools modal)
    → Opens over the relapse modal if triggered from within
    → Focus moves to the crisis modal heading
    → Escape / dismiss returns to the relapse modal, focus to the previously active element
```

### 9.3 Post-Relapse Checklist ARIA Pattern

```jsx
<div role="dialog" aria-modal="true" aria-labelledby="post-relapse-title" ref={trapRef}>
  <h2 id="post-relapse-title">What to do right now</h2>
  <p id="post-relapse-desc">
    Work through each action below at your own pace.
  </p>

  <ul role="list" aria-label="Post-relapse actions">
    {postRelapseActions.map((action, i) => (
      <li key={action.id}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <input
            type="checkbox"
            checked={checkedPost.includes(action.id)}
            onChange={() => togglePostAction(action.id)}
          />
          <span>{action.text}</span>
        </label>
      </li>
    ))}
  </ul>

  <p
    aria-live="polite"
    aria-atomic="true"
  >
    {checkedPost.length} of {postRelapseActions.length} actions completed
  </p>

  <ul role="list" aria-label="Reminders">
    {postRelapseReminders.map(r => (
      <li key={r.id}>{r.text}</li>
    ))}
  </ul>

  <button onClick={closePostRelapse}>
    Return to dashboard
  </button>
</div>
```

### 9.4 Streak Reset Announcement Timing

Do not announce the reset mid-form before the user has confirmed. The sequence:
1. User reads modal, chooses to confirm.
2. Only after `handleRelapseConfirm()` succeeds: fire polite announcement.
3. Never `assertive` — this is not a system error. Assertive tone would be jarring.

### 9.5 No Destructive Shortcuts

The confirm button for logging a relapse must require explicit action — no "press Enter to confirm" auto-submit. The Enter keypress on the note textarea should not trigger relapse confirmation:

```jsx
<textarea
  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) e.stopPropagation(); }}
  // Allow newlines; prevent form accidental submit
/>
```

---

## 10. Testing and Acceptance Checklist

This checklist must pass before any release or PR that touches UI components, styles, or state management.

### 10.1 Keyboard Pass

- [ ] Tab through the entire app from the skip link to the last focusable element in the current view — every interactive element receives focus with a visible indicator
- [ ] Skip link appears on first Tab press, activates correctly, moves focus to `<main>`
- [ ] All view changes navigable via keyboard (nav buttons receive Enter/Space)
- [ ] `aria-current="page"` on active nav item verified in browser DevTools
- [ ] Every modal: opens with focus on heading or first control; Escape closes it; focus returns to trigger (or appropriate neutral anchor for relapse flow)
- [ ] Habit check-off operable with Space/Enter
- [ ] Prayer log operable with Space/Enter
- [ ] No element trapped — Tab always escapes modals when they are closed
- [ ] Sleep and journal forms fully operable without mouse

### 10.2 Screen Reader Pass (NVDA + Chrome; VoiceOver + Safari/iOS)

- [ ] Skip link announced correctly
- [ ] Landmark regions announced: "Main navigation", "main"
- [ ] View title (`<h1>`) announced after each view change
- [ ] `aria-current="page"` on nav: SR announces "Dashboard, current page"
- [ ] CircleRing: SR reads `aria-label` including value and band — does NOT read SVG path data
- [ ] Streak counter: SR reads full label (days + context)
- [ ] Habit check: state change announced via polite live region
- [ ] Prayer log: state change announced via polite live region
- [ ] Modal open: SR announces dialog role + title
- [ ] Modal close: SR focus returns, no orphaned announcements
- [ ] Relapse flow: post-relapse modal title announced; checklist items navigable; progress count updates politely
- [ ] All emoji icons in buttons: SR announces the button label, NOT the emoji (confirmed via `aria-hidden="true"` on emoji span)
- [ ] Form errors: SR reads error text when field is invalid; `aria-invalid` state present
- [ ] PIN screen: inputs correctly labeled; `autoComplete` attributes work with password managers/SR
- [ ] Score colors: no SR announcement of color names — only band label and numeric value

### 10.3 Zoom and Reflow Pass

- [ ] At 200% browser zoom: all text readable, no content overlapping, all interactive elements still tappable
- [ ] At 320px CSS viewport width (or 400% zoom on 1280px): no horizontal scrollbar, content stacks vertically, no text truncated
- [ ] Dashboard triple-ring layout wraps or stacks gracefully below 400px width
- [ ] Text spacing bookmarklet (Section 2.3): apply it — no content clipped, no elements breaking out of containers
- [ ] Sidebar collapse to bottom nav functions correctly at 320px

### 10.4 Contrast Pass

- [ ] Run all text token pairs through contrast checker (Dawn theme as primary)
- [ ] Run all text token pairs for Fajr dark theme
- [ ] Score color pairs (all four bands, light + dark) pass 4.5:1 for text uses, 3:1 for graphic uses
- [ ] Focus ring: `--r-accent` vs `--r-bg` ≥ 3:1 for every enabled theme
- [ ] Input border color in rest state ≥ 3:1 against input background
- [ ] No information conveyed by color alone — verify with color-blindness simulation (Deuteranopia / Protanopia filter in Chrome DevTools)

### 10.5 Reduced-Motion Pass

- [ ] Enable "Reduce Motion" in OS settings (macOS: Accessibility > Display > Reduce Motion; iOS: Accessibility > Motion > Reduce Motion)
- [ ] `fajrBloom` background pulse: does not animate
- [ ] `viewIn` / `fadeRise` entry animations: do not animate
- [ ] `breathe` / `r-breathe` circles: switch to `breatheCalm` (slow opacity pulse only)
- [ ] Ring fill animation: instant
- [ ] `prm` React state updates dynamically without page reload

### 10.6 Automated Scan

Run with [axe-core](https://github.com/dequelabs/axe-core) (via browser extension or `@axe-core/react`):

```jsx
// In main.jsx, development only
if (import.meta.env.DEV) {
  const axe = await import('@axe-core/react');
  axe.default(React, ReactDOM, 1000);
}
```

- [ ] Zero critical violations
- [ ] Zero serious violations
- [ ] All moderate violations reviewed and either fixed or explicitly documented with justification

### 10.7 Mobile Assistive Technology Pass

- [ ] VoiceOver on iOS (Safari): swipe navigation through the current view, all elements announced correctly
- [ ] TalkBack on Android (Chrome): same
- [ ] Voice Control (iOS) or Voice Access (Android): all interactive elements have visible text labels or `aria-label` that match speakable phrases — no element requires guessing its name

---

## Appendix A: Component-Level Quick Reference

| Component | Required attributes | Notes |
|---|---|---|
| `CircleRing` | `role="img"`, `aria-label="{value} out of 100, {band}"`, `focusable="false"` | Never `aria-hidden` unless purely decorative background ring |
| Modal overlay div | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="{heading-id}"` | Plus focus trap and Escape handler |
| Nav button (active) | `aria-current="page"` | Remove when not active |
| Nav (sidebar/bottom) | `<nav aria-label="Main navigation">` | One per page; no duplicate unlabelled navs |
| Habit item | `<li>` inside `<ul>` | Check-off button has descriptive `aria-label` |
| Heatmap cell | `aria-label="{date}: {score}"` or `aria-hidden` if non-interactive | |
| Error message | `role="alert"` or `aria-live="assertive"` via live region | Associated via `aria-describedby` on input |
| Streak display | `aria-label="Sobriety streak: {n} days"` on container | Numeric value inside can be `aria-hidden` |
| Sidebar toggle btn | `aria-expanded`, `aria-controls="sidebar-nav"` | |
| Prayer log cell | `aria-label="{prayer} prayer: {status}"`, `aria-pressed` | |
| Score band label | Visible text ("Good" / "Fair" / "Low" / "Critical") adjacent to ring | Never color alone |

## Appendix B: `srOnly` Utility Style

```js
// Add to S object in App.jsx
srOnly: {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
},
```

## Appendix C: ADR — SPA View Announcement Strategy

### ADR-ACC-001: SPA View Announcement via Polite Live Region

**Status:** Accepted

**Context:**
- Platform: Web PWA, no router, `view` state string controls rendered content
- WCAG 2.2 SC: 2.4.2 (Page Titled), 3.2.3 (Consistent Navigation)
- Problem: When `setView()` changes the rendered content, screen readers receive no navigation event, no URL change, and no page title update. Users navigating by headings may not realize the view has changed.

**Decision:**
A persistent `role="status" aria-live="polite"` element announces the new view name whenever `setView` is called. Focus is simultaneously moved to `<main tabIndex={-1}>`. The `<h1>` inside main provides the permanent heading context. This mirrors the pattern used by React Router's `@reach/router` and Next.js's built-in announcer.

**Why polite, not assertive:**
Navigation is not an emergency. Assertive interrupts any currently reading content. Polite waits for a natural pause — appropriate for intentional navigation.

**Implementation:** See Section 3.4 above.
