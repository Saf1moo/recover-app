# Recover — UX Specification (Ground-Up Redesign)

> Private, local-first recovery + life-management PWA for ONE user: a Muslim man
> in addiction recovery who also runs a small business (IhsanEd). Phone-primary,
> desktop-supported. Offline. PIN-lockable. Single-user.
>
> **Rule 0 honored:** This spec is derived from the user's goals, not the old app.
> No reference to prior layout, "Panic Button" patterns, cosmic/dark slop, or
> gamified emoji UI. The product is a *dignified daily companion*, not a game.

**One point of view, stated up front:**
This is a **calm, editorial, light-first daily companion**. The home screen is a
*day*, not a dashboard of widgets. Recovery is the spine; everything else (sleep,
prayer, habits, schedule, health, goals, journal) is in service of getting through
*today* with dignity. The relapse path is never a red alarm button — it is a quiet,
always-present door to help that treats a slip as a recovery action, not a failure.

---

## 1. Primary User Goals & Jobs-To-Be-Done

### 1.1 Who he is, what he needs from this
A man rebuilding a life on two tracks at once: **staying sober** and **running a
business**. He is not looking to be entertained or scored against strangers. He
needs (a) a reason to show up each morning, (b) gentle structure through the day,
(c) a safe place when things go wrong, and (d) honest evidence that he is moving
forward. The app must feel like it respects him.

### 1.2 Ranked daily jobs-to-be-done
1. **"Tell me where I am today and what matters."** Open → see sober streak,
   today's prayers, today's schedule, one intention. (Every open.)
2. **"Help me keep my prayers."** Check in on the 5 salah at their times; feel the
   day's rhythm. (5×/day — the highest-frequency interaction.)
3. **"Hold my routine."** Tick habits, follow the time-blocked schedule, log water.
   (Throughout the day.)
4. **"Catch me when I fall — without shame."** Reach relapse support fast, do calm
   recovery actions, get back up. (Rare but the highest-stakes job.)
5. **"Help me close the day honestly."** Log sleep, write a short reflection, see
   how the day went. (Nightly.)
6. **"Show me I'm building something."** Goals, vision, milestones, earned rewards.
   (Weekly-ish, motivational.)
7. **"Keep business separate from my recovery."** Switch into IhsanEd without
   recovery noise bleeding in. (As work demands.)

### 1.3 The 3–4 moments that matter most
These four moments are the design's load-bearing walls. Every IA and flow decision
below is justified against them.

- **M1 — Morning intention.** First open of the day. He needs grounding: streak
  intact, what's ahead, one line of intent. *Tone: steady, hopeful.*
- **M2 — Prayer check-ins.** Five touchpoints structured by the sun. This is the
  metronome of his day and the most-repeated interaction. *Tone: serene, timely.*
- **M3 — Nightly reflection.** Sleep + a short journal. The day is put to rest
  honestly. *Tone: quiet, unhurried, no judgment.*
- **M4 — The relapse moment.** The hardest moment a recovery app exists for. Must
  be reachable in **one tap from anywhere**, must **not shame**, must convert panic
  into a sequence of small recovery actions. *Tone: calm, warm, present.*

---

## 2. Information Architecture

### 2.1 Decision: a 5-tab bottom bar (Personal mode), with relapse support as a persistent overlay action — NOT a tab.

**Personal mode bottom nav (5 destinations):**

| # | Tab | Icon intent | Owns |
|---|-----|-------------|------|
| 1 | **Today** | sun / day | Home: streak, intention, prayers-at-a-glance, today's schedule, quick metrics |
| 2 | **Routine** | sunrise arc | Prayers (salah) + Sleep — the two time-anchored daily practices and their scores |
| 3 | **Plan** | timeline | Habits + Schedule — the things he builds and time-blocks |
| 4 | **Journey** | path / flag | Goals, Vision, Milestones, Rewards — the long arc |
| 5 | **Journal** | feather | Dated reflective entries + mood |

**Always-present, NOT a tab: "Support".** A small, calm, persistent affordance
(a steady anchor-style chip, label "Support", never red, never pulsing) sits in a
fixed position — top-right of the app header on every screen, and mirrored as a
soft full-width row at the bottom of the Today screen. One tap opens the Relapse &
Support flow (§4d). It is reachable from *every* screen including mid-scroll,
because M4 can happen at any moment, and a moment of craving is not a moment to go
hunting through tabs.

**Settings / Lock** are not bottom-tab destinations. Settings is reached from the
profile avatar in the header (top-left). Lock is a system-level state (§3.11).

### 2.2 Why 5 tabs, grouped this way (justified from goals + Mobbin)
- **Phone-primary → bottom bar, thumb-reachable, ≤5 items.** More than 5 tabs
  crowds the bar and dilutes hierarchy; the seven capabilities collapse cleanly
  into 5 *intentful* groups rather than 11 literal screens.
- **Today is a *day*, not a widget wall.** This is the editorial stance.
  **Timepage** (editorial weekly timeline) is the reference for treating time as a
  beautiful, legible narrative rather than a grid of cards — Today borrows its calm
  typographic hierarchy and sense of "this is your day, composed." Why: M1 needs to
  feel like grounding, not triage.
- **Routine groups prayer + sleep because both are time-anchored daily practices
  scored 0–100.** **Sunlitt's** sunrise/sunset arc is the spine of the prayer view —
  salah are tied to sun position, so a sun-arc with the five prayers placed along it
  is the single most honest visualization of his day's rhythm (M2). **Apple Health's
  sleep score** is the explicit anti-dark-slop reference for the sleep half: light,
  calm, score + soft bars, never a glowing cosmic gauge.
- **Plan groups habits + schedule because they're both "what I intend to do."**
  **Atoms'** warm habit cards model the habit list (dignified, not childish).
  **Cron Calendar's** clean day time-blocks model the schedule. Same mental bucket:
  intention → structure.
- **Journey isolates the long arc (goals/vision/rewards)** so motivational content
  doesn't clutter the daily surfaces. **Finch / Fabulous / Acorns** warm milestone
  roadmaps are the reference — a path you walk, not a trophy case.
- **Journal stands alone** because reflection deserves a calm, dedicated composer.
  **stoic.** (editorial composer) and **5 Minute Journal** (guided entry) are the
  references (M3).
- **Support is an overlay, not a tab, on purpose.** Making relapse a tab would
  brand the bottom bar with failure and force a category label he sees 50×/day.
  Making it a persistent *header anchor* keeps it one tap away without making the
  app *about* relapse. **Wysa's** calm crisis screen is the model — reached
  deliberately, lands somewhere safe, never alarms (M4).

### 2.3 Personal vs Business (dual workspace)
**Decision: a workspace switch lives behind the profile avatar (top-left header) as
a labeled toggle, and the *entire bottom nav set swaps* when you change workspace.**

- The two workspaces are **separate worlds with separate nav sets**, not a filter on
  one screen. Recovery data never appears in Business; business tasks never appear
  in Personal. This protects M1–M4 from work noise and vice versa.
- The switch is a deliberate two-step (tap avatar → tap the other workspace), not a
  swipe, so he never lands in the wrong world by accident. The current workspace is
  always named in the header ("Personal" / "IhsanEd") with a distinct accent so he
  always knows where he is (no color-only cue — the *word* is shown).
- **Business mode bottom nav** (out of deep scope here, but defined for completeness):
  Today (business), Tasks, Schedule, Goals, Notes. Business reuses the same Plan/
  Schedule and Goals/Journal primitives with business content — consistent grammar,
  different contents. **Support is hidden in Business mode** — recovery support is a
  Personal-world concern; surfacing it during work would be intrusive. (If a craving
  hits during work he switches to Personal, one tap to Support there.)
- Why behind the avatar and not a top tab: workspace identity is an *account-level*
  concept ("which me am I right now"), naturally grouped with profile, and keeps the
  5-tab bar clean.

### 2.4 IA map
```
App
├─ Lock screen (PIN gate) ───────────── precedes everything when locked
├─ Workspace: PERSONAL
│  ├─ Header: [avatar/workspace ▸] ............... [Support ⚓]
│  ├─ Tab 1 Today      → streak · intention · prayers glance · schedule · metrics
│  ├─ Tab 2 Routine    → Prayers (sun-arc) | Sleep (score)
│  ├─ Tab 3 Plan       → Habits | Schedule (day timeline)
│  ├─ Tab 4 Journey    → Vision · Goals · Milestones · Rewards
│  ├─ Tab 5 Journal    → entries list → composer
│  └─ Support overlay  → calm checklist · resources · "log a relapse"
│        └─ Settings (via avatar) → profile · accent · PIN · substance · sobriety date
└─ Workspace: BUSINESS (IhsanEd)
   └─ Today · Tasks · Schedule · Goals · Notes   (no Support; no recovery data)
```

---

## 3. Screen Inventory

For each screen: **Purpose**, **Key content**, and notes. Visual language throughout:
light-first, warm off-white surfaces, generous type scale, one calm accent (user-set),
soft depth via layering not heavy shadows. Dark mode is a respectful, warm dark — not
cosmic black. Theme defaults to **system**, switchable Light/Dark/System in Settings.

### 3.1 Today (Home) — Tab 1
- **Purpose:** Serve M1. Answer "where am I, what matters today" in one calm screen.
- **Key content (top to bottom):**
  1. **Greeting + date** (editorial, Timepage-style): "Good morning, Ihsan ·
     Sunday, 22 June".
  2. **Sober streak**, stated with dignity: "**412 days** sober" + the substance
     and start date in quiet secondary text. Not a giant glowing number — a
     confident, calm headline. A thin progress hint toward the next milestone.
  3. **Today's intention** — one editable line ("Today I will be patient"). Tapping
     opens an inline composer. This is the morning-intention anchor of M1.
  4. **Prayers at a glance** — a compact horizontal sun-arc strip showing the 5
     salah, which have passed/are done/are upcoming, and the next one with its time
     ("Asr in 1h 20m"). Tapping any prayer deep-links into Routine→Prayers. (Sunlitt.)
  5. **Today's schedule peek** — the next 2–3 time blocks (Cron-style rows). Tap →
     Plan→Schedule.
  6. **Quick metrics row** — water intake (tap to +1 glass), sleep score from last
     night, habits done X/Y. Small, glanceable, each deep-links to its full screen.
  7. **Support row** — a soft, reassuring full-width row: "Having a hard moment?
     Support is here." → opens Support overlay. (Mirror of the header anchor, for
     thumb reach on the home surface.)
- **Note:** Today is read-mostly + light quick-actions. Heavy editing happens in the
  owning tabs. This keeps the morning moment calm.

### 3.2 Routine — Tab 2 (Prayers | Sleep)
Two segmented sub-views; **Prayers is default during the day, Sleep is default after
~9pm** (time-aware default landing).

**3.2a Prayers (salah)**
- **Purpose:** Serve M2. Track the 5 daily prayers against their sun-anchored times;
  produce a 0–100 prayer score.
- **Key content:**
  - A **vertical sun-arc / day-rail** with Fajr, Dhuhr, Asr, Maghrib, Isha placed at
    their times. Current time marker moves down the rail. (Sunlitt sun-position model.)
  - Each prayer is a row/node: name, time, state (upcoming / now / prayed / missed),
    a single large tap target to mark prayed. Optionally mark "on time / late /
    jama'ah" via a secondary tap — never required.
  - **Prayer score** for the day (e.g., 4/5 → 80) shown as a calm summary, with a
    7-day soft bar trend (Apple Health sleep-score visual grammar applied to prayer).
- **Note:** No guilt styling for missed prayers — a missed prayer is shown in neutral
  "not marked" state, never red, never scolding. Color is paired with a label/icon.

**3.2b Sleep**
- **Purpose:** Serve M3 (the data half). Nightly bedtime/wake/duration → 0–100 score.
- **Key content:** last night's score (light, with soft bars — Apple Health ref),
  bedtime / wake / duration, a 7-night trend, and a simple "log last night" editor
  (bedtime, wake → duration + score auto-computed).

### 3.3 Plan — Tab 3 (Habits | Schedule)
Two segmented sub-views; **Habits default.**

**3.3a Habits**
- **Purpose:** JTBD #3. User-defined checkable daily habits + completion tracking.
- **Key content:** warm habit cards (Atoms ref) — each with name, a streak/last-7
  dots row, and a large check target. A "today X/Y done" header. FAB / "+ New habit"
  to add. Long-press / row-menu to edit or archive.
- **Note:** Completion is celebratory but adult — a soft fill + checkmark, optional
  gentle haptic, no confetti, no points.

**3.3b Schedule**
- **Purpose:** JTBD #3. Per-day time-blocked schedule of habits/tasks.
- **Key content:** a single-day vertical timeline with time-blocks (Cron Calendar
  ref) — clean hour rows, blocks for habits/tasks, current-time line. Day switcher
  (←/→ + "Today"). Tap a slot to add a block; drag to move (pointer + keyboard
  alternative). Habits can be pulled onto the schedule.

### 3.4 Journey — Tab 4
- **Purpose:** JTBD #6. The long arc: vision, goals, milestones, rewards.
- **Key content:**
  - **Vision statement** at top — a personal "why," editorial and prominent (the
    north star). Editable.
  - **Goals** as a warm milestone roadmap / path (Finch/Fabulous/Acorns ref) — each
    goal expands to its milestones with progress.
  - **Rewards** — gentle, earned, claimable. Presented as meaningful tokens ("Claim:
    a quiet afternoon at the bookshop"), self-defined, adult in tone. A reward
    becomes claimable when its condition (streak/goal/habit) is met; claim = a calm
    acknowledgment, logged to history. No coins, no cartoon mascots.

### 3.5 Journal — Tab 5
- **Purpose:** Serve M3 (the reflection half). Dated reflective entries + optional mood.
- **Key content:** a reverse-chronological list of entries (date, mood glyph, first
  line) → tap opens a calm full-screen **composer** (stoic. ref) with optional
  **guided prompts** (5 Minute Journal ref: "What went well? What was hard? One thing
  I'm grateful for"). Mood is optional, chosen from a small set with *labels* (not
  color-only). Free-write is always available without a prompt.

### 3.6 Support (Relapse & Support) — overlay, reachable everywhere
- **Purpose:** Serve M4. The calm door to help. See full flow in §4d.
- **Key content (landing):** a warm, low-stimulation screen (Wysa ref): a steadying
  message ("You reached out. That's strength."), then three calm choices:
  **"I'm having a craving"** (grounding), **"I need a resource"** (contacts/helplines),
  **"I need to log a relapse"** (the honest path). No countdowns, no red, no alarm.

### 3.7 Relapse Log + Post-Relapse Checklist — within Support
- **Purpose:** Record a relapse honestly (resets streak) and immediately convert it
  into recovery actions. See §4d.
- **Key content:** a gentle confirm of what happened (substance, time, optional
  trigger note — all optional except the fact of it), then a **calm checklist of
  recovery actions** (drink water, reach a support contact, pray/sit quietly, remove
  access, write one line, plan the next 2 hours). Closes with reassurance and a fresh
  Day 1 framed as a recovery action, never a punishment.

### 3.8 Health (within Today + quick-access)
- **Purpose:** Water intake + other daily metrics.
- **Note on IA:** Health does not need its own tab for a single user — water lives as
  a quick-tap on Today and a small detail sheet; additional metrics (mood, energy)
  surface on Today's metrics row and in Journal. Keeping the bar at 5 tabs beats a
  near-empty Health tab. (If metrics grow, Health graduates into a Routine sub-view.)

### 3.9 Settings (via avatar)
- **Purpose:** Profile, accent, PIN lock, substance, sobriety start date, theme.
- **Key content:** profile (name, avatar), **accent color** picker, **theme**
  (Light/Dark/System), **PIN lock** (set/change/enable, auto-lock timing), **substance**
  + **sobriety start date** (editing start date recomputes streak), milestones config,
  data export/clear (local-first), workspace management.

### 3.10 Business workspace screens (defined, out of deep scope)
Today (business summary), Tasks, Schedule, Goals, Notes — same primitives as Personal
Plan/Schedule/Journey/Journal, populated with IhsanEd content. No recovery surfaces,
no Support.

### 3.11 Lock screen
- **Purpose:** PIN gate before any data is shown. Offline, local.
- **Key content:** minimal, calm: app mark, PIN entry (or biometric if available via
  device), no preview of data behind it. Wrong PIN → gentle retry with backoff; no
  scary messaging.

---

## 4. Core Flows (step-by-step)

### 4a. Morning open → Today  (serves M1)
1. App resumes → if auto-lock elapsed, **Lock screen** (§4 PIN) → unlock.
2. Lands on **Today**, scrolled to top. Greeting + date set the tone.
3. He sees **streak intact** ("412 days") — the single most reassuring fact, first.
4. **Intention** field shows yesterday's or empty prompt "Set today's intention."
   He taps, types one line, done (inline, no new screen).
5. He glances the **prayer strip** — "Fajr ✓, Dhuhr next at 12:40." Reassured of the
   day's shape.
6. He optionally taps **+1 water** or checks the **schedule peek**. Leaves grounded.
- **Design intent:** zero required actions to feel oriented; one optional action
  (intention) to feel agency. Calm > complete.

### 4b. Logging a prayer  (serves M2)
1. From Today's prayer strip *or* Routine→Prayers, he sees the next prayer highlighted
   "now" on the sun-rail.
2. He taps the prayer's **large mark target** → it fills, state → "prayed", a soft
   haptic, and the **prayer score updates** (announced to screen readers, §6).
3. (Optional) he taps the small secondary control to note "on time / late / jama'ah."
4. The rail advances; next prayer becomes "upcoming." No modal, no confirmation friction.
- **Design intent:** the single most frequent action is a one-tap, in-place toggle.
  Missed prayers never nag; he can mark a missed one later with no penalty styling.

### 4c. Nightly sleep + reflection  (serves M3)
1. After ~9pm, opening **Routine** defaults to the **Sleep** sub-view (time-aware).
2. He taps **"Log last night"** → enters bedtime + wake (wheel/time pickers) →
   duration + **0–100 score** compute live (Apple Health calm visual).
3. A soft prompt offers **"Reflect on today?"** → opens **Journal composer**.
4. Composer offers guided prompts (5 Minute Journal) or free-write (stoic.). He writes
   a line or three, optionally taps a **mood** (labeled). Saves → entry dated.
5. Day is closed. Tone stays unhurried; nothing is mandatory.
- **Design intent:** stitch sleep → reflection into one gentle nightly ritual without
  forcing either half.

### 4d. THE RELAPSE MOMENT → calm checklist → recovery  (serves M4 — most important)
**Principle:** fast, dignified, non-shaming. A relapse is treated as a *recovery
action in progress*, not a verdict. No red, no "Panic Button," no countdown, no emoji,
no score-shaming. Every word is chosen to keep him present and safe.

1. **Reach (≤1 tap, from anywhere).** He taps the persistent **Support ⚓** anchor in
   the header (present on every screen, every scroll position), or the Support row on
   Today.
2. **Land somewhere safe (Support landing, Wysa ref).** Low-stimulation screen, warm
   surface, a steadying line: *"You reached out. That takes strength. Let's take the
   next small step together."* No data, no streak number shoved in his face here.
3. **Branch — his choice, no default pressure:**
   - **"I'm having a craving" (grounding first).** Opens a brief grounding sequence:
     a slow breathing pacer (respects reduced-motion → becomes a static "in / hold /
     out" guide), one grounding prompt, and the option to **reach a support contact**.
     Goal: ride the wave *without* logging anything. Many sessions end here — a craving
     handled is a win, and the app should let him simply close, reassured.
   - **"I need a resource."** Calm list of his support contacts + helplines (tap to
     call/message) and any saved recovery resources. Local, immediate.
   - **"I need to log a relapse."** The honest path (step 4).
4. **Log honestly, gently (only if he chooses).** A quiet form:
   - Single reassuring header: *"Thank you for being honest. This is part of recovery."*
   - Optional fields: substance (prefilled from Settings), when, one-line trigger note.
     **The only required thing is confirming it happened.**
   - A clearly separated, **non-destructive-feeling confirm**: *"Log this and reset to
     Day 1."* Not styled as a scary/red destructive button — styled as a deliberate,
     calm action with the accent.
5. **Immediately pivot to recovery — the post-relapse checklist.** On confirm, do NOT
   dump him on a "Day 0" wall. Go straight to a **calm checklist of recovery actions**
   (each checkable, none mandatory):
   - Drink a glass of water.
   - Reach one person who supports you. *(deep-link to contacts)*
   - Pray two rakahs / sit quietly for two minutes.
   - Remove access to the substance right now.
   - Write one honest line about what led here. *(deep-link to Journal)*
   - Plan the next two hours. *(deep-link to Schedule)*
   The framing line: *"A slip isn't the end of the road — it's a step on it. Here's how
   to take the next one."*
6. **Close with dignity.** Streak resets to **Day 1**, but it's presented as a
   *restart of the journey*, not a loss: *"Day 1. You're still on the path."* Past
   streak history is preserved (longest streak retained in Journey, never erased — he
   doesn't lose his record of how far he got). Screen-reader announces the reset
   factually and kindly (§6).
- **Why this shape:** Wysa proves a crisis surface can be calm and still useful. The
  branch-first design means the most common real need (a craving, not a completed
  relapse) is served *without* forcing a demoralizing log. The checklist converts the
  worst moment into forward motion — recovery psychology, not gamification.

### 4e. Adding a habit
1. Plan→Habits → **"+ New habit"** (FAB on mobile, button on desktop).
2. Sheet: name, optional schedule (days of week / daily), optional time-block to add
   it to the schedule, optional reminder.
3. Save → habit appears as a warm card (Atoms) with an empty last-7 row, ready to check.
- **Design intent:** create in one sheet, no multi-step wizard.

### 4f. Switching Personal ↔ Business
1. Tap the **avatar / workspace name** (top-left header).
2. A small panel shows current workspace + the other ("Switch to IhsanEd").
3. Tap the other workspace → **bottom nav set swaps**, header accent + name change,
   content is now business-only. A brief, non-blocking toast confirms: "IhsanEd
   workspace." Support anchor is hidden in Business.
4. Switching back is the same two-step. State of each workspace is preserved
   (he returns to the tab he left).
- **Design intent:** deliberate, two-step, clearly labeled (word + accent, never
  color alone) so the two worlds never blur.

---

## 5. Empty States, Error States, First-Run

### 5.1 First-run (onboarding — minimal, dignified)
A short, warm setup (no account, local-first):
1. Welcome + privacy promise: *"Everything stays on this device."*
2. Name + (optional) avatar + accent color.
3. Sobriety: substance + start date → seeds the streak immediately.
4. Prayers: confirm location/method for prayer times (or manual times) so the sun-arc
   is accurate.
5. Optional: set a PIN now or later.
6. Lands on **Today**, already showing a real streak — never an empty hero.
- Skippable past step 3; everything else has sane defaults and can be set later.

### 5.2 Per-screen empty / error / first states
| Screen | Empty state | Error state | First-run state |
|--------|-------------|-------------|-----------------|
| **Today** | Never truly empty (streak exists from setup). If no intention: gentle prompt "Set today's intention." | If prayer times fail to compute: show times as "—" with "Set prayer times" link, rest of screen works. | After setup, shows streak + prompts for intention, first prayer, first habit. |
| **Routine·Prayers** | Day not yet started: all prayers "upcoming." | No location/times: inline "Add your prayer times" CTA; never blank rail. | Brief one-line hint: "Tap a prayer to mark it when you've prayed." |
| **Routine·Sleep** | No nights logged: calm "Log your first night" card with the editor. | Invalid times (wake before bed): inline validation "Wake time looks earlier than bedtime — overnight?" with a fix, no data loss. | Same as empty + one-line "We'll build your sleep trend from here." |
| **Plan·Habits** | "No habits yet. Start with one small thing." + "+ New habit." | Save failure (storage full): non-blocking toast "Couldn't save — storage full. Free space and retry," keeps draft. | Suggest 1–2 example habits as *tappable templates* (not auto-added). |
| **Plan·Schedule** | Empty day: faint hour rails + "Tap a time to add a block." | — | Hint: "Drag habits here to time-block your day." |
| **Journey** | No goals: "What are you building toward?" + add-goal + vision prompt. | — | Vision prompt featured first; goals optional. |
| **Journal** | "Nothing written yet. Start with one honest line." + guided-prompt chips. | Save failure: keep draft in composer, toast to retry; never lose text. | Offer a guided prompt by default; free-write available. |
| **Support** | N/A (always actionable). If no contacts saved: "Add a support contact" inline + helpline still shown. | Call/SMS unavailable offline: show the number as copyable text + "You're offline — here's the number." | Prompt (gently, once) to add one support contact during setup or first visit. |
| **Rewards (in Journey)** | "No rewards yet — define one worth working toward." | — | Suggest defining one reward tied to an existing goal. |
| **Lock** | N/A | Wrong PIN: "That didn't match. Try again." + escalating backoff after repeated attempts; no lockout-shaming, no data hint. | First PIN set in Settings, confirmed twice. |

### 5.3 Cross-cutting principles for these states
- **No blank screens, ever** — every empty state teaches the next action in one warm line.
- **Never lose user text/data** on error — drafts persist, validations are inline and
  recoverable.
- **Offline is the default, not an error** — only network-dependent affordances (calling
  a contact) acknowledge offline, and even then degrade to copyable info.

---

## 6. Accessibility-of-Flow Notes

Target: **WCAG 2.2 AA**, phone-and-desktop. The user relies on this app in vulnerable
moments — accessibility here is dignity, not compliance theater.

### 6.1 Reachability & focus order
- **Support anchor is reachable in ≤1 action from every screen** and is **early in the
  DOM/focus order** (immediately after the workspace control in the header), so keyboard
  and screen-reader users hit it fast — M4 must not require traversing a whole screen.
- **Logical focus order top-to-bottom** matching visual order: header (workspace,
  Support) → main content → bottom nav last. On opening any overlay (Support, composer,
  add-habit sheet), **focus moves into the overlay**; on close, focus returns to the
  triggering control.
- Bottom-nav tabs are reachable and operable by keyboard; current tab exposed via
  `aria-current="page"`.

### 6.2 Touch target sizing
- **Minimum 44×44px** (prefer 48×48) for all interactive targets — prayer mark buttons,
  habit checks, water +1, nav tabs, Support anchor. WCAG 2.2 target-size.
- High-frequency targets (prayer mark, habit check) are **oversized and thumb-zone
  placed** (lower 2/3 of screen on mobile). The Support anchor, though small visually,
  has a ≥44px hit area.

### 6.3 No color-only meaning
- Prayer state, habit completion, workspace identity, mood, reward-claimable, and streak
  status are **never conveyed by color alone**. Each pairs color with **text and/or an
  icon/shape**: prayed = checkmark + "Prayed" label, not just a green fill; workspace =
  the *word* "Personal"/"IhsanEd" + accent; missed prayer = neutral outline + "Not
  marked," never a bare red dot.
- Contrast: body text and essential UI meet **AA (4.5:1 / 3:1)** in both light and warm-dark
  themes. The single accent is validated for contrast on both surfaces.

### 6.4 Reduced motion
- Respect `prefers-reduced-motion`. The **breathing pacer** in grounding becomes a
  **static, stepped "Breathe in · hold · out" guide** with text cues instead of an
  animated expanding circle. Sun-arc current-time motion, tab transitions, and habit-fill
  animations degrade to instant/opacity-only. No parallax, no auto-playing motion anywhere.

### 6.5 Screen-reader announcements for state changes
Use polite live regions for routine changes, assertive only where the user needs
immediate confirmation:
- **Habit checked:** announce *"Push-ups marked done. 3 of 5 habits complete today."* (polite).
- **Prayer marked:** *"Asr marked as prayed. Prayer score 80, 4 of 5."* (polite).
- **Water +1:** *"Water: 5 of 8 glasses."* (polite).
- **Sleep logged:** *"Sleep logged. Score 86."* (polite).
- **Workspace switched:** *"Switched to IhsanEd workspace."* (polite).
- **Streak reset (relapse logged):** announced **kindly and factually**, assertive so
  it's not missed: *"Relapse logged. Streak reset to Day 1. Your longest streak, 412
  days, is saved. Recovery checklist is open."* — never celebratory-failure language,
  never silence (silence after such an action is disorienting).
- **Milestone reached:** *"Milestone reached: 30 days. Saved to your journey."* (polite).

### 6.6 Forms & inputs
- Every input has a visible, programmatic **label**; errors are tied via
  `aria-describedby` and announced. Time pickers (sleep, schedule, prayer) are operable
  by keyboard and screen reader, not drag-only.
- The relapse log's confirm action is **clearly labeled by its consequence**
  ("Log this and reset to Day 1") so it's never triggered ambiguously — important for
  cognitive accessibility in a high-stress moment.

### 6.7 Cognitive load in the relapse flow (M4 specifically)
- **One decision per screen**, large targets, short sentences, no time pressure, no
  countdowns. The flow is fully operable while distressed: minimal reading, clear
  branches, every step skippable, and an always-available "I'm okay now, close" exit
  that returns him gently to Today.

---

## Appendix — Mobbin references mapped to decisions
| Reference | Drives | Why |
|-----------|--------|-----|
| **Sunlitt** (sun arc) | Today prayer strip + Routine·Prayers sun-rail | Salah are tied to sun position; arc is the most honest day-rhythm model |
| **Timepage** (editorial timeline) | Today's "your day, composed" hierarchy | M1 grounding via calm editorial type, not a widget wall |
| **Cron Calendar** (day time-blocks) | Plan·Schedule | Clean, legible time-blocking without clutter |
| **Apple Health sleep score** | Routine·Sleep + prayer-score trend bars | Explicit anti-dark-slop: light, calm score + soft bars |
| **Atoms** (warm habit cards) | Plan·Habits | Dignified, adult habit tracking — not childish |
| **stoic.** (editorial composer) | Journal composer | Calm, focused reflective writing |
| **5 Minute Journal** (guided entry) | Journal guided prompts + nightly reflection | Lowers the barrier to reflect (M3) |
| **Wysa** (calm crisis) | Support landing + relapse flow | Proves crisis UI can be calm, non-shaming, useful (M4) |
| **Finch / Fabulous / Acorns** (milestone roadmaps) | Journey goals/rewards | Warm "path you walk," not a trophy case |

**Explicitly rejected:** QUITTR-style dark cosmic theme, red "Panic Button," emoji-driven
UI, points/coins/streak-shaming gamification. The relapse path in particular is the
deliberate inverse of that pattern.
