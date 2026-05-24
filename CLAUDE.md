# Recover App — Project Rules

## Stack
React + Vite. Single-file: `src/App.jsx` contains all components, state, styles, and logic. No routing library. No CSS files. No external UI libs.

## Storage
localStorage only. Key: `recover_root_v1`. Schema: `{ activeId, accounts: { [id]: Account } }`.

Account shape:
```js
{
  id, name, substance, color, sobrietyStart,
  habits, relapses, rewards, claimedRewards, journal,
  routineTargets, sleepLogs, prayerLogs,
  goals, reminders, postRelapseActions, postRelapseReminders
}
```

## Theme
- Background: `#0d0d0f` (app), `#0a0a0c` (sidebar/cards)
- Font: Georgia, serif
- All styles in the `S` object at bottom of App.jsx — inline styles only
- Accent colour: per-account, defaults `#34d399`
- Score colours: green `#34d399` (80+), blue `#60a5fa` (60–79), amber `#f59e0b` (40–59), red `#f87171` (<40)

## Architecture
- `S` object at end of file holds all styles — add new keys here, never inline ad-hoc objects for reused patterns
- State lives in `root` → `updateAccount(id, patch)` / `upd(patch)` (active account shortcut)
- Modal state: single `modal` string key
- `accountDefaults()` defines new account shape — add new fields here

## Key reusable components
- `CircleRing({ value, size, strokeWidth })` — SVG progress ring, auto-colours by score
- `HeatmapGrid({ getScore })` — 91-day calendar heatmap
- `LineChart({ data, height })` — SVG trend chart, `data: [{ actual, target, label }]`
- `StatCard({ value, label, accent })` — dashboard stat tile

## Key scoring functions
- `calcSleepScore(bedtime, waketime, durationMins, targets)` → 0–100
- `calcPrayerScore(prayers, prayerTargets)` → `{ total, breakdown }`
- `scoreColor(s)` → hex colour for score value

## Conventions
- All times: stored 24hr (`"HH:MM"`), displayed 12hr via `fmtTime(t)`
- Duration in minutes; `fmtDur(m)` formats as `"Xh YYm"`
- `timeToMins(t)` converts `"HH:MM"` → minutes from midnight
- `sleepDur(bedtime, waketime)` handles midnight-crossing correctly
- `getTodayStr()` → `"YYYY-MM-DD"`

## Do NOT
- Add CSS files or Tailwind — inline styles only
- Add routing library — `view` state string handles navigation
- Add external component libraries
- Store sleep milestone or sleep reward logic — sleep is scored only, not rewarded
- Change the `ROOT_KEY` — would break existing user data

## Sections (nav views)
`dashboard` | `routine` | `habits` | `goals` | `relapse` | `rewards` | `journal`

Routine section is being built incrementally: sleep tracker done, prayer tracker next.
