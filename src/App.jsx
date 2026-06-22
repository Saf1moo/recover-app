import { useState, useEffect, useCallback, useRef, useMemo, useSyncExternalStore } from "react";
import { supabase } from "./supabase.js";

// ─── Storage ─────────────────────────────────────────────────────────────────
const ROOT_KEY = "recover_root_v1";

const DEFAULT_ROUTINE_TARGETS = () => ({
  bedtime: "22:30",
  waketime: "06:30",
  prayerTargets: {
    fajr:    { earliest: "05:15", latest: "06:00" },
    dhuhr:   { earliest: "13:00", latest: "14:30" },
    asr:     { earliest: "16:30", latest: "17:45" },
    maghrib: { earliest: "18:30", latest: "19:15" },
    isha:    { earliest: "20:00", latest: "22:00" },
  },
});

const accountDefaults = () => ({
  id: null, name: "", substance: "", color: "var(--r-success)",
  sobrietyStart: null,
  habits: [], relapses: [], rewards: [], claimedRewards: [], journal: [],
  routineTargets: DEFAULT_ROUTINE_TARGETS(),
  sleepLogs: [],
  prayerLogs: [],
  goals: [], reminders: [],
  postRelapseActions: [],
  postRelapseReminders: [],
  scheduleActivities: [],
  scheduleCompletions: {},
  vision: DEFAULT_VISION(),
  accountability: DEFAULT_ACCOUNTABILITY(),
  waterLogs: {},
  waterConfig: DEFAULT_WATER_CONFIG(),
  medications: [],
  medicationLogs: {},
  exerciseLogs: [],
  bodyMetrics: [],
  badHabits: [],
});

function loadRoot() {
  try {
    const r = localStorage.getItem(ROOT_KEY);
    if (!r) return { account: null, theme: DEFAULT_THEME() };
    const data = JSON.parse(r);
    if (data.accounts !== undefined) {
      const accs = Object.values(data.accounts);
      const account = accs.find(a => a.id === data.activeId) || accs[0] || null;
      return { account, theme: DEFAULT_THEME() };
    }
    return { account: data.account ?? null, theme: data.theme ?? DEFAULT_THEME() };
  } catch { return { account: null, theme: DEFAULT_THEME() }; }
}
function saveRoot(root) {
  try { localStorage.setItem(ROOT_KEY, JSON.stringify(root)); } catch {}
}

// ─── Constants ───────────────────────────────────────────────────────────────
const MILESTONES = [
  { days: 1, label: "24 hours" }, { days: 3, label: "3 days" },
  { days: 7, label: "1 week" }, { days: 14, label: "2 weeks" },
  { days: 30, label: "1 month" }, { days: 60, label: "2 months" },
  { days: 90, label: "3 months" }, { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
];
const BUILTIN_RELAPSE_TOOLS = [
  { id: "breathe", icon: "ph ph-wind", title: "Box breathing", desc: "4 in, hold 4, out 4, hold 4. Repeat 4×. Activates your parasympathetic nervous system." },
  { id: "call", icon: "ph ph-phone-call", title: "Call your person", desc: "Contact your sponsor, therapist, or trusted friend right now. Connection counters craving." },
  { id: "delay", icon: "ph ph-timer", title: "Urge surf — 20 min", desc: "Cravings peak then fall. Set a timer. Just delay acting on it." },
  { id: "move", icon: "ph ph-person-simple-run", title: "Move your body", desc: "Walk, run, push-ups. Exercise releases dopamine and reduces cortisol within minutes." },
  { id: "ground", icon: "ph ph-globe-hemisphere-west", title: "5-4-3-2-1 grounding", desc: "5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste." },
  { id: "cold", icon: "ph ph-snowflake", title: "Cold water on face", desc: "Triggers the dive reflex — slows heart rate, lowers anxiety fast." },
  { id: "write", icon: "ph ph-note-pencil", title: "Write it out", desc: "Write what you're feeling and what triggered this. Externalising reduces its power." },
  { id: "tipp", icon: "ph ph-cube", title: "TIPP skill (DBT)", desc: "Temperature, Intense exercise, Paced breathing, Progressive relaxation." },
];
const DEFAULT_HABITS = () => [
  { id: "h1", name: "Morning mindfulness", category: "mental", days: [], scheduledTimes: ["07:00"], levelsEnabled: false, currentLevel: 1, levels: [], completions: [] },
  { id: "h2", name: "Exercise (30 min)", category: "physical", days: [], scheduledTimes: ["08:00"], levelsEnabled: false, currentLevel: 1, levels: [], completions: [] },
  { id: "h3", name: "Peer support contact", category: "social", days: [], scheduledTimes: ["12:00"], levelsEnabled: false, currentLevel: 1, levels: [], completions: [] },
  { id: "h4", name: "Journal entry", category: "mental", days: [], scheduledTimes: ["21:00"], levelsEnabled: false, currentLevel: 1, levels: [], completions: [] },
];
const DEFAULT_REWARDS = () => [
  { id: "r1", days: 7, name: "Buy yourself a coffee" }, { id: "r2", days: 14, name: "New book or album" },
  { id: "r3", days: 30, name: "Nice meal out" }, { id: "r4", days: 60, name: "New clothing item" },
  { id: "r5", days: 90, name: "Weekend getaway" },
];
const DEFAULT_POST_ACTIONS = () => [
  { id: "pa1", text: "Call or text someone I trust right now" },
  { id: "pa2", text: "Remove myself from the environment that triggered this" },
  { id: "pa3", text: "Drink a glass of water and take 10 deep breaths" },
  { id: "pa4", text: "Write down exactly what happened without judgement" },
];
const DEFAULT_POST_REMINDERS = () => [
  { id: "pr1", text: "One relapse does not erase all my progress. My days sober still happened." },
  { id: "pr2", text: "I am not a failure. Relapse is part of the recovery process for many people." },
  { id: "pr3", text: "I can start again right now, in this moment." },
];
const CAT_HEX = { mental: "#5B4A6A", physical: "var(--r-success)", sleep: "var(--r-info)", social: "#A4503C", custom: "#8C5A6E" };
const GOAL_PERIODS = ["daily", "weekly", "monthly", "yearly"];
const GOAL_COLORS = { daily: "var(--r-success)", weekly: "var(--r-info)", monthly: "#5B4A6A", yearly: "var(--r-caution)" };
const LIFE_AREAS = [
  { key: "health", label: "Health", color: "var(--r-success)" },
  { key: "faith", label: "Faith", color: "#5B4A6A" },
  { key: "relationships", label: "Relationships", color: "#A4503C" },
  { key: "career", label: "Career", color: "var(--r-info)" },
  { key: "finances", label: "Finances", color: "var(--r-caution)" },
  { key: "personalGrowth", label: "Growth", color: "#8C5A6E" },
  { key: "fun", label: "Fun", color: "#3A6B63" },
];
const PERIOD_ORDER = ["yearly", "monthly", "weekly", "daily"];
const DEFAULT_VISION = () => ({ myWhy: "", lifeVision: "", lifeAreas: { health: 5, faith: 5, relationships: 5, career: 5, finances: 5, personalGrowth: 5, fun: 5 } });
const DEFAULT_ACCOUNTABILITY = () => ({ contract: null, futureLetters: [], weeklyReviews: [], wins: [], gratitude: [] });
const DEFAULT_WATER_CONFIG = () => ({ glassSize: 250, dailyTarget: 8 });
const EXERCISE_CATS = ["cardio", "strength", "flexibility", "sports", "other"];
const EXERCISE_CAT_HEX = { cardio: "#A4503C", strength: "var(--r-success)", flexibility: "#5B4A6A", sports: "var(--r-info)", other: "var(--r-caution)" };
const ACCOUNT_COLORS = ["var(--r-success)", "var(--r-info)", "#5B4A6A", "#A4503C", "#8C5A6E", "var(--r-caution)", "var(--r-danger)", "#3A6B63"];
const PRAYER_NAMES = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
// ─── "Sakīnah / Fajr" design system — tokens, themes, helpers ──────────────────
// "Almanac" — warm, light-first design system. Dark ("Lamplight") is opt-in only.
const DEFAULT_THEME = () => ({ preset: "almanac", bg: "#F7F1E6", surf: "#FDFAF2", surf2: "#EFE7D7", surf3: "#FDFAF2", bord: "#E3D9C6", fg: "#221E18", fg2: "#5C544A", fg3: "#6F6657", glow: "transparent", font: "hanken" });
const INTERNAL_EMAIL = "user@recover-app.internal";
const THEME_PRESETS = [
  // ── Light (default identity) ──
  { id: "almanac", name: "Almanac", desc: "Warm paper, fountain-pen ink. Daylight, dignity.", category: "base", lightRamp: true, accent: "#234C5E", textAccent: "#234C5E", glow: "transparent",
    bg: "#F7F1E6", surf: "#FDFAF2", surf2: "#EFE7D7", surf3: "#FDFAF2", bord: "#E3D9C6", fg: "#221E18", fg2: "#5C544A", fg3: "#6F6657" },
  // ── Dark (opt-in only — never the first render) ──
  { id: "lamplight", name: "Lamplight", desc: "The same page by lamplight. Opt-in dark.", category: "base", accent: "#6E97A8", textAccent: "#8FB6C6", glow: "transparent",
    bg: "#1C1A16", surf: "#25221C", surf2: "#2E2A22", surf3: "#322D24", bord: "#3A352B", fg: "#ECE4D5", fg2: "#B7AD9A", fg3: "#8E8470" },
];
const FONT_PACKAGES = [
  { id: "hanken", name: "Hanken Grotesk", label: "Humanist sans (default)", stack: "'Hanken Grotesk',system-ui,sans-serif", url: "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap" },
  { id: "fraunces", name: "Fraunces", label: "Literary serif", stack: "'Fraunces',Georgia,serif", url: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..600&display=swap" },
  { id: "system", name: "System", label: "Native OS font", stack: "system-ui,-apple-system,sans-serif", url: null },
];

// display/hero typeface (Fraunces, loaded in index.html) + design tokens
const HERO_FONT = "'Fraunces',Georgia,serif";
const FRAUNCES_URL = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..600&display=swap";
const hexA = (h, a) => `${h}${a}`;
const normalizeHex = (h) => { if (!h || h[0] !== "#") return "var(--r-success)"; let c = h.slice(1); if (c.length === 3) c = c.split("").map(x => x + x).join(""); return "#" + (c + "000000").slice(0, 6).toLowerCase(); };
const relLum = (h) => { const c = normalizeHex(h).slice(1); const f = i => { const v = parseInt(c.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4); };
const onAccent = (h) => relLum(h) > 0.42 ? "#fff" : "#ffffff";
const SP = { x0: 2, x1: 4, x2: 6, x3: 8, x4: 10, x5: 12, x6: 14, x7: 16, x8: 20, x9: 24, x10: 32, x11: 40, x12: 48, x13: 64, x14: 80 };
const RAD = { xs: 10, sm: 8, md: 12, lg: 16, xl: 20, hero: 24, x2l: 28, pill: 999 };
const ELEV = { sm: "var(--r-shadow-sm)", md: "var(--r-shadow-md)", lg: "var(--r-shadow-lg)", glowHero: "var(--r-glow-hero)", glowActive: "var(--r-glow-active)", inset: "var(--r-inset)" };
const DUR = { instant: 80, fast: 150, normal: 240, slow: 360, ringFill: 900, countUp: 1000, bloom: 8000 };
const EASE = { dawn: "cubic-bezier(.22,1,.36,1)", soft: "cubic-bezier(.4,0,.2,1)", expo: "cubic-bezier(.16,1,.3,1)" };
// Almanac semantic bands — moss / indigo / ochre / clay. Verified ≥4.5:1 on paper.
const SCORE_LIGHT = { high: "#4C6A3A", mid: "#234C5E", low: "#8A5A12", crit: "#8C3F30" };
const SCORE_DARK  = { high: "#8FAE6E", mid: "#8FB6C6", low: "#C79A4E", crit: "#C97A63" };
const SEM = { success: "#4C6A3A", info: "#234C5E", warn: "#8A5A12", chromeRose: "#8C3F30", danger: "#8C3F30", bizBlue: "#234C5E" };
let CURRENT_LIGHT = true;

// Migrate legacy/stored themes to the current palette + depth keys (surf3/fg3/glow)
function migrateTheme(t) {
  if (!t) return DEFAULT_THEME();
  const p = THEME_PRESETS.find(x => x.id === t.preset);
  if (!p) return { ...DEFAULT_THEME(), font: FONT_PACKAGES.find(f => f.id === t.font) ? t.font : "hanken" };
  return { ...t, bg: p.bg, surf: p.surf, surf2: p.surf2, surf3: p.surf3, bord: p.bord, fg: p.fg, fg2: p.fg2, fg3: p.fg3, glow: p.glow, lightRamp: p.lightRamp || false, textAccent: p.textAccent || null, font: FONT_PACKAGES.find(f => f.id === t.font) ? t.font : "hanken" };
}

function buildThemeCSS({ T, A, G, ACT, surf3, fg3, light, fontStack }) {
  // Warm, low, short shadows — paper resting on a desk, not floating glass. No glow.
  const sh = light
    ? { sm: "0 1px 2px rgba(58,46,30,.05)", md: "0 1px 2px rgba(58,46,30,.05),0 4px 12px rgba(58,46,30,.06)", lg: "0 2px 6px rgba(58,46,30,.06),0 14px 36px -10px rgba(58,46,30,.12)", inset: "none" }
    : { sm: "0 1px 2px rgba(0,0,0,.30)", md: "0 1px 2px rgba(0,0,0,.30),0 6px 18px rgba(0,0,0,.34)", lg: "0 2px 8px rgba(0,0,0,.34),0 18px 44px -12px rgba(0,0,0,.50)", inset: "none" };
  return `:root{
--r-bg:${T.bg};--r-surf:${T.surf};--r-surf2:${T.surf2};--r-surf3:${surf3};
--r-bord:${T.bord};--r-fg:${T.fg};--r-fg2:${T.fg2};--r-fg3:${fg3};
--r-accent:${A};--r-accent-text:${ACT};--r-on-accent:${onAccent(A)};--r-glow:${G};
--r-success:${(light ? SCORE_LIGHT : SCORE_DARK).high};--r-info:${(light ? SCORE_LIGHT : SCORE_DARK).mid};--r-caution:${(light ? SCORE_LIGHT : SCORE_DARK).low};--r-danger:${(light ? SCORE_LIGHT : SCORE_DARK).crit};
--r-font:${fontStack};--r-hero:${HERO_FONT};
--r-shadow-sm:${sh.sm};--r-shadow-md:${sh.md};--r-shadow-lg:${sh.lg};--r-inset:${sh.inset};
--r-glow-hero:none;
--r-glow-active:0 0 0 2px ${hexA(A, "55")};
--r-ease-dawn:cubic-bezier(.22,1,.36,1);--r-ease-soft:cubic-bezier(.4,0,.2,1);--r-ease-expo:cubic-bezier(.16,1,.3,1);
}
body{background:var(--r-bg);color:var(--r-fg)}
.r-tnum{font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1}
::placeholder{color:var(--r-fg2);opacity:1}
input:focus,textarea:focus{outline:none!important;border-color:var(--r-accent)!important;box-shadow:0 0 0 3px ${hexA(A, "22")}!important;background:var(--r-surf3)!important}
:focus-visible:not(input):not(textarea){outline:none;box-shadow:0 0 0 2px var(--r-bg),0 0 0 4px var(--r-accent)}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-thumb{background:var(--r-surf2);border-radius:8px}
::-webkit-scrollbar-track{background:transparent}
.r-press{transition:transform 120ms var(--r-ease-soft),filter 120ms var(--r-ease-soft);-webkit-tap-highlight-color:transparent}
.r-press:active{transform:scale(.97)}
.r-press:hover{filter:brightness(1.06)}
@keyframes fajrBloom{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.04);opacity:1}}
@keyframes fajrBloomSurge{0%{transform:scale(1);opacity:.85}45%{transform:scale(1.28);opacity:1}100%{transform:scale(1);opacity:.85}}
@keyframes checkPop{0%{transform:scale(.8);box-shadow:0 0 0 0 ${hexA(A, "8c")}}55%{transform:scale(1.12);box-shadow:0 0 0 6px ${hexA(A, "00")}}100%{transform:scale(1);box-shadow:0 0 0 0 transparent}}
@keyframes viewIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes breathe{0%{transform:scale(1);opacity:.55}36%{transform:scale(1.35);opacity:1}100%{transform:scale(1);opacity:.55}}
@keyframes breatheCalm{0%,100%{opacity:.6}50%{opacity:.92}}
@keyframes lightSweep{from{transform:translateX(-120%) skewX(-12deg);opacity:0}30%{opacity:1}to{transform:translateX(120%) skewX(-12deg);opacity:0}}
@keyframes milestoneGlow{0%{text-shadow:0 0 28px ${hexA(G, "4d")}}50%{text-shadow:0 0 60px ${hexA(G, "99")}}100%{text-shadow:0 0 28px ${hexA(G, "4d")}}}
@media (prefers-reduced-motion:reduce){*:not(.r-breathe),*:not(.r-breathe)::before,*:not(.r-breathe)::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}.r-breathe{animation:breatheCalm 11s ease-in-out infinite!important}}`;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
const getDaysSince = d => d ? Math.floor((new Date() - new Date(d)) / 864e5) : 0;
const getTodayStr = () => new Date().toISOString().split("T")[0];
const getWeekStr = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split("T")[0]; };
const getMonthStr = () => new Date().toISOString().slice(0, 7);
const getYearStr = () => String(new Date().getFullYear());
const timeToMins = t => { if (!t) return 0; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const sleepDur = (b, w) => { let bm = timeToMins(b), wm = timeToMins(w); if (wm <= bm) wm += 1440; return wm - bm; };
const fmtDur = m => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
const fmtTime = t => { if (!t) return "—"; const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`; };
function scoreColor(s, light) { const R = (light === undefined ? CURRENT_LIGHT : light) ? SCORE_LIGHT : SCORE_DARK; return s >= 80 ? R.high : s >= 60 ? R.mid : s >= 40 ? R.low : R.crit; }
const getTodayDay = () => DAY_NAMES[new Date().getDay()];
const greetingFor = h => h < 5 ? "Still awake" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Winding down";
const hijriStr = d => { try { return new Intl.DateTimeFormat("en-TN-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" }).format(d).replace(" AH", ""); } catch { return null; } };
const PRAYER_LABEL = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };
const getWeekCompletions = (completions, weekStart) => {
  const end = new Date(weekStart + "T12:00"); end.setDate(end.getDate() + 6);
  const endStr = end.toISOString().split("T")[0];
  return (completions || []).filter(c => c >= weekStart && c <= endStr).length;
};
const normalizeHabit = h => ({
  id: h.id, name: h.name, category: h.category || "custom",
  days: h.days || [],
  scheduledTimes: h.scheduledTimes || (h.scheduledTime ? [h.scheduledTime] : []),
  levelsEnabled: h.levelsEnabled || false,
  currentLevel: h.currentLevel || 1,
  levels: h.levels || [],
  completions: h.completions || [],
});
const normalizeGoal = g => ({
  ...g,
  title: g.title || g.text || "",
  parentId: g.parentId || null,
  dueDate: g.dueDate || "",
  priority: g.priority || "med",
  notes: g.notes || "",
  progress: g.progress !== undefined ? g.progress : 0,
  lifeArea: g.lifeArea || "",
  archived: g.archived || false,
});
function calcStreak(completions) {
  if (!completions || !completions.length) return 0;
  const set = new Set(completions);
  let streak = 0;
  const d = new Date(); d.setHours(12, 0, 0, 0);
  while (set.has(d.toISOString().split("T")[0])) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
function calcLongestStreak(completions) {
  if (!completions || !completions.length) return 0;
  const sorted = [...new Set(completions)].sort();
  let longest = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i] + "T12:00") - new Date(sorted[i - 1] + "T12:00")) / 86400000;
    if (diff === 1) { current++; if (current > longest) longest = current; }
    else current = 1;
  }
  return longest;
}
function calcAvoidStreak(bh) {
  const baseTs = bh.slips?.length ? Math.max(...bh.slips.map(s => s.ts)) : bh.startTs;
  const elapsed = Date.now() - baseTs;
  if (bh.unit === "hours") return { value: Math.floor(elapsed / 3_600_000), label: "h clean" };
  const days = Math.floor(elapsed / 86_400_000);
  return days < 1 ? { value: Math.floor(elapsed / 3_600_000), label: "h clean" } : { value: days, label: "d clean" };
}
function avoidStreakColor(bh) {
  const { value, label } = calcAvoidStreak(bh);
  if (bh.unit === "hours") return value >= 72 ? "var(--r-success)" : value >= 24 ? "var(--r-caution)" : "var(--r-danger)";
  if (label === "h clean") return "var(--r-danger)";
  return value >= 7 ? "var(--r-success)" : value >= 3 ? "var(--r-caution)" : "var(--r-danger)";
}
function calcHabitRate(habit, days) {
  const norm = normalizeHabit(habit);
  let sched = 0, done = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    const dn = DAY_NAMES[d.getDay()];
    if (norm.days.length === 0 || norm.days.includes(dn)) {
      sched++;
      if (norm.completions.includes(ds)) done++;
    }
  }
  return sched ? Math.round(done / sched * 100) : 0;
}
function recalcHabitLevel(habit) {
  if (!habit.levelsEnabled || !habit.levels || !habit.levels.length) return habit;
  const weekStart = getWeekStr();
  const count = getWeekCompletions(habit.completions, weekStart);
  let lvl = habit.currentLevel || 1;
  const maxLvl = Math.max(...habit.levels.map(l => l.level));
  const cfg = habit.levels.find(l => l.level === lvl);
  if (!cfg) return habit;
  if (lvl > 1 && cfg.downPerWeek != null && count < cfg.downPerWeek) lvl--;
  else if (lvl < maxLvl && cfg.upPerWeek != null && count >= cfg.upPerWeek) lvl++;
  return lvl !== habit.currentLevel ? { ...habit, currentLevel: lvl } : habit;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────
function calcSleepScore(bedtime, waketime, durationMins, targets) {
  let score = 0;
  const hrs = durationMins / 60;
  if (hrs >= 7 && hrs <= 9) score += 30;
  else if ((hrs >= 6 && hrs < 7) || (hrs > 9 && hrs <= 10)) score += 20;
  else if ((hrs >= 5 && hrs < 6) || (hrs > 10 && hrs <= 11)) score += 10;

  const bm = timeToMins(bedtime);
  const tbm = timeToMins(targets.bedtime);
  const nb = bm < 300 ? bm + 1440 : bm;
  const ntb = tbm < 300 ? tbm + 1440 : tbm;
  const bdiff = Math.abs(nb - ntb);
  if (bdiff <= 30) score += 35;
  else if (bdiff <= 60) score += 25;
  else if (bdiff <= 90) score += 15;
  else score += 5;
  if (bm >= 60 && bm < 420) score = Math.max(0, score - 20);

  const wm = timeToMins(waketime);
  const twm = timeToMins(targets.waketime);
  const nw = wm < 300 ? wm + 1440 : wm;
  const ntw = twm < 300 ? twm + 1440 : twm;
  const wdiff = Math.abs(nw - ntw);
  if (wdiff <= 30) score += 35;
  else if (wdiff <= 60) score += 25;
  else if (wdiff <= 90) score += 15;
  else score += 5;
  if (wm >= 540) score = Math.max(0, score - 20);

  return Math.max(0, Math.min(100, score));
}

function calcPrayerScore(prayers, prayerTargets) {
  let total = 0;
  const breakdown = {};
  for (const p of PRAYER_NAMES) {
    const entry = prayers?.[p];
    if (!entry || entry.missed || !entry.time) { breakdown[p] = 0; continue; }
    const t = timeToMins(entry.time);
    const pts = (t >= timeToMins(prayerTargets[p].earliest) && t <= timeToMins(prayerTargets[p].latest)) ? 20 : 10;
    breakdown[p] = pts;
    total += pts;
  }
  return { total, breakdown };
}

function isGoalDone(goal) {
  const done = goal.done || [];
  const keys = { daily: getTodayStr(), weekly: getWeekStr(), monthly: getMonthStr(), yearly: getYearStr() };
  return done.includes(keys[goal.period]);
}
function getPeriodKey(p) {
  return { daily: getTodayStr(), weekly: getWeekStr(), monthly: getMonthStr(), yearly: getYearStr() }[p];
}
const reqNotif = () => { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); };
const sendNotif = (t, b) => { if ("Notification" in window && Notification.permission === "granted") new Notification(t, { body: b }); };

// ─── Interaction infra ────────────────────────────────────────────────────────
function useHover() {
  const [h, setH] = useState(false);
  return [h, { onMouseEnter: () => setH(true), onMouseLeave: () => setH(false), onTouchStart: () => setH(true), onTouchEnd: () => setH(false) }];
}
const usePRM = () => useSyncExternalStore(
  cb => { const m = matchMedia("(prefers-reduced-motion: reduce)"); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
  () => matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);

// ─── Visual components ────────────────────────────────────────────────────────

function CircleRing({ value = 0, size = 100, strokeWidth = 8, delay = 0, glow = false, role = "diagnostic", label }) {
  const prm = usePRM();
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const [drawn, setDrawn] = useState(prm ? pct : 0);
  useEffect(() => {
    if (prm) { setDrawn(pct); return; }
    const id = requestAnimationFrame(() => setDrawn(pct));
    return () => cancelAnimationFrame(id);
  }, [pct, prm]);
  const offset = circ * (1 - drawn / 100);
  const identity = role === "identity";
  const col = identity ? "var(--r-accent)" : scoreColor(pct);
  const cx = size / 2, cy = size / 2;
  const heroType = identity || role === "momentum" || size >= 60;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={label}
      style={{ display: "block", filter: glow ? `drop-shadow(0 0 6px ${identity ? "var(--r-accent)" : hexA(scoreColor(pct), "66")})` : undefined }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--r-bord)" strokeWidth={strokeWidth} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: prm ? "none" : `stroke-dashoffset ${DUR.ringFill}ms ${EASE.dawn}`, transitionDelay: `${delay}ms` }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill={identity ? "var(--r-fg)" : col} fontSize={size * 0.30} fontWeight="400"
        fontFamily={heroType ? "Fraunces,Georgia,serif" : "'DM Sans',system-ui,sans-serif"}
        style={{ fontVariantNumeric: "tabular-nums" }}>
        {Math.round(drawn)}
      </text>
    </svg>
  );
}

function HeatmapGrid({ getScore }) {
  const prm = usePRM();
  const today = getTodayStr();
  const DAYS = 91;
  const CELL = 13, GAP = 3, STEP = CELL + GAP;
  const cols = Math.ceil(DAYS / 7);
  const [drawn, setDrawn] = useState(prm);
  useEffect(() => { if (prm) { setDrawn(true); return; } const id = requestAnimationFrame(() => setDrawn(true)); return () => cancelAnimationFrame(id); }, [prm]);
  const cells = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today + "T12:00");
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    cells.push({ dateStr, s: getScore(dateStr) });
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={cols * STEP} height={7 * STEP} style={{ display: "block" }}>
        {cells.map(({ dateStr, s }, i) => {
          const col = Math.floor(i / 7);
          const row = i % 7;
          const isToday = dateStr === today;
          const fill = s == null ? "var(--r-surf2)" : scoreColor(s);
          const fo = s == null ? 0.4 : 0.45 + s / 100 * 0.5;
          return (
            <rect key={dateStr} x={col * STEP} y={row * STEP} width={CELL} height={CELL} rx={3}
              fill={fill} fillOpacity={fo}
              stroke={isToday ? "var(--r-accent)" : undefined} strokeWidth={isToday ? 1.5 : undefined}
              opacity={drawn ? 1 : 0} aria-label={`${dateStr}${s != null ? `: ${Math.round(s)}` : " no data"}`}
              style={{ transition: prm ? "none" : `opacity 400ms ${EASE.dawn}`, transitionDelay: `${col * 16}ms` }}>
              <title>{dateStr}{s != null ? `: ${Math.round(s)}` : " — no data"}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

function LineChart({ data, height = 90 }) {
  const prm = usePRM();
  const [drawn, setDrawn] = useState(prm);
  useEffect(() => { if (prm) { setDrawn(true); return; } const id = requestAnimationFrame(() => setDrawn(true)); return () => cancelAnimationFrame(id); }, [prm]);
  if (!data || data.length < 2) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--r-fg3)", fontSize: 14 }}>
      Not enough data
    </div>
  );
  const W = 280, H = height - 22;
  const allVals = data.flatMap(d => [d.actual, d.target].filter(v => v != null));
  if (!allVals.length) return null;
  const rawMin = Math.min(...allVals), rawMax = Math.max(...allVals);
  const rawRange = rawMax - rawMin || 1;
  const pad = rawRange * 0.25;
  const minV = rawMin - pad, maxV = rawMax + pad;
  const range = maxV - minV;
  const xS = i => (i / (data.length - 1)) * W;
  const yS = v => H - 4 - ((v - minV) / range) * (H - 12);

  const pts = data.map((p, i) => p.actual != null ? `${xS(i).toFixed(1)},${yS(p.actual).toFixed(1)}` : null).filter(Boolean);
  const actualPath = pts.length ? "M" + pts.join("L") : "";
  const areaPath = pts.length ? `M${pts.join("L")}L${W.toFixed(1)},${H} L0,${H} Z` : "";
  let targetPath = "";
  data.forEach((p, i) => { if (p.target == null) return; targetPath += (targetPath ? "L" : "M") + `${xS(i).toFixed(1)},${yS(p.target).toFixed(1)}`; });
  let latestIdx = -1;
  for (let i = data.length - 1; i >= 0; i--) { if (data[i].actual != null) { latestIdx = i; break; } }
  const labelIdxs = [0, Math.floor((data.length - 1) / 2), data.length - 1];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 22}`} style={{ width: "100%", display: "block", overflow: "visible" }}>
        {areaPath && <path d={areaPath} fill="var(--r-accent)" fillOpacity={0.08} stroke="none" />}
        {targetPath && <path d={targetPath} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={1.5} strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" />}
        {actualPath && <path d={actualPath} fill="none" stroke="var(--r-accent)" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={drawn ? 0 : 1}
          style={{ transition: prm ? "none" : `stroke-dashoffset 800ms ${EASE.dawn}` }} />}
        {data.map((p, i) => p.actual != null && (
          <circle key={i} cx={xS(i)} cy={yS(p.actual)} r={i === latestIdx ? 3.5 : 2.5} fill={i === latestIdx ? scoreColor(p.actual) : "var(--r-accent)"} />
        ))}
        {labelIdxs.map(i => (
          <text key={i} x={xS(i)} y={H + 16} textAnchor="middle" fill="var(--r-fg2)" fontSize={11} fontFamily="'DM Sans',system-ui,sans-serif">
            {data[i]?.label || ""}
          </text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, marginTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 14, height: 2, background: "var(--r-accent)" }} />
          <span style={{ fontSize: 11, color: "var(--r-fg2)" }}>Actual</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 14, height: 2, background: "rgba(255,255,255,.18)" }} />
          <span style={{ fontSize: 11, color: "var(--r-fg2)" }}>Target</span>
        </div>
      </div>
    </div>
  );
}

// Prayer "sun-arc" — daytime arc with five salah nodes + a live sun marker (Sunlitt-informed).
// SVG is decorative (aria-hidden); the labelled buttons below are the accessible control.
function SunArc({ prayers, prayerTargets, onLog }) {
  const W = 330, H = 116;
  const P0 = [14, 104], P1 = [W / 2, 2], P2 = [W - 14, 104];
  const bez = t => { const u = 1 - t; return [u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0], u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1]]; };
  const mid = n => (timeToMins(prayerTargets[n].earliest) + timeToMins(prayerTargets[n].latest)) / 2;
  const dayStart = timeToMins(prayerTargets.fajr.earliest), dayEnd = timeToMins(prayerTargets.isha.latest);
  const span = Math.max(1, dayEnd - dayStart);
  const tOf = m => Math.max(0, Math.min(1, (m - dayStart) / span));
  const now = new Date(), nowMins = now.getHours() * 60 + now.getMinutes();
  const prayed = n => (prayers?.[n]?.score || 0) > 0;
  const missed = n => prayers?.[n]?.missed;
  const nextName = PRAYER_NAMES.find(n => !prayed(n) && !missed(n) && mid(n) >= nowMins) || PRAYER_NAMES.find(n => !prayed(n) && !missed(n));
  const [sx, sy] = bez(tOf(nowMins));
  const arcPath = `M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`;
  const prayedCount = PRAYER_NAMES.filter(prayed).length;
  let countdown = null;
  if (nextName) { const diff = mid(nextName) - nowMins; if (diff > 0) { const h = Math.floor(diff / 60), m = diff % 60; countdown = `in ${h ? h + "h " : ""}${m}m`; } else countdown = "now"; }
  const nodeColor = n => prayed(n) ? "var(--r-success)" : missed(n) ? "var(--r-danger)" : n === nextName ? "var(--r-accent)" : "var(--r-bord)";
  return (
    <div style={{ ...S.card, borderRadius: 20, padding: "18px 20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
        <span style={{ fontFamily: HERO_FONT, fontWeight: 500, fontSize: 16, color: "var(--r-fg2)" }}>Today's prayers</span>
        <span className="r-tnum" style={{ fontSize: 12, color: "var(--r-fg2)", letterSpacing: "0.02em" }}>{prayedCount} of 5 prayed</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="112" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block" }}>
        <path d={`${arcPath} L${P2[0]} ${H} L${P0[0]} ${H} Z`} fill="var(--r-caution)" opacity="0.06" clipPath="url(#sunclip)" />
        <clipPath id="sunclip"><rect x="0" y="0" width={sx} height={H} /></clipPath>
        <path d={arcPath} fill="none" stroke="var(--r-bord)" strokeWidth="2" />
        {PRAYER_NAMES.map(n => { const [x, y] = bez(tOf(mid(n))); const fill = prayed(n); return (
          <circle key={n} cx={x} cy={y} r={n === nextName ? 7 : 6} fill={fill ? "var(--r-success)" : "var(--r-surf)"} stroke={nodeColor(n)} strokeWidth={fill ? 0 : 2.5} />
        ); })}
        <circle cx={sx} cy={sy} r="5" fill="var(--r-caution)" />
      </svg>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        {PRAYER_NAMES.map(n => (
          <button key={n} onClick={() => onLog(n)} aria-pressed={prayed(n)}
            aria-label={`${PRAYER_LABEL[n]} — ${prayed(n) ? "prayed, tap to undo" : missed(n) ? "missed" : "not yet, tap to mark prayed"}`}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 2px", background: "transparent", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "var(--r-font)" }}>
            <i className={prayed(n) ? "ph-fill ph-check-circle" : missed(n) ? "ph ph-x-circle" : n === nextName ? "ph ph-circle-dashed" : "ph ph-circle"} style={{ fontSize: 14, color: nodeColor(n) }} aria-hidden="true" />
            <span style={{ fontSize: 11, fontWeight: n === nextName ? 700 : 500, color: prayed(n) ? "var(--r-success)" : n === nextName ? "var(--r-accent)" : "var(--r-fg2)" }}>{PRAYER_LABEL[n]}</span>
          </button>
        ))}
      </div>
      {nextName && (
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 10, paddingTop: 12, borderTop: "1px solid var(--r-bord)" }}>
          <span style={{ fontFamily: HERO_FONT, fontWeight: 500, fontSize: 19 }}>{PRAYER_LABEL[nextName]}</span>
          <span className="r-tnum" style={{ fontSize: 13, color: "var(--r-fg2)", fontWeight: 500 }}>{countdown}</span>
        </div>
      )}
    </div>
  );
}

// ─── Business helpers ─────────────────────────────────────────────────────────
const BIZ_BLUE = "#3B82F6";
const BIZ_GREEN = "#22C55E";
const BIZ_ORANGE = "#F97316";
const BIZ_RED = "#EF4444";
const BIZ_PURPLE = "#A855F7";
const BIZ_WEEK = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const BIZ_ALL_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const bizFmt$ = n => "$" + (+n||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
function bizGetSchedules(e) {
  if (e.schedules && Array.isArray(e.schedules)) return e.schedules;
  if (e.schedule_day) return [{ day: e.schedule_day, time: e.schedule_time || "" }];
  return [];
}
function bizFmtSchedules(e) {
  const s = bizGetSchedules(e);
  if (!s.length) return "—";
  return s.map(x => [x.day, x.time ? fmtTime(x.time) : ""].filter(Boolean).join(" @ ")).join(" · ");
}
function bizMatchesToday(e, todayName, todayStr) {
  if (e.status === "inactive") return false;
  const rt = e.rescheduled_to;
  if (rt?.date) {
    if (rt.date === todayStr) return true;
    if (rt.date > todayStr) return false;
  }
  return bizGetSchedules(e).some(s => s.day?.toLowerCase() === todayName.toLowerCase());
}
function BizAvatar({ name, idx, sz = 32 }) {
  const pal = [BIZ_BLUE, BIZ_PURPLE, BIZ_GREEN, BIZ_ORANGE, "#EC4899", "#EAB308", "#14B8A6", BIZ_RED];
  const c = pal[idx % pal.length];
  const lbl = (name||"?").trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const fs = sz <= 26 ? 10 : sz <= 32 ? 11 : 13;
  return <div style={{ width: sz, height: sz, borderRadius: Math.round(sz * 0.28), background: c + "20", color: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs, fontWeight: 700, flexShrink: 0, border: `1px solid ${c}30` }}>{lbl}</div>;
}
function BizEmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 24px" }}>
      <div style={{ fontSize: 30, marginBottom: 12, color: "var(--r-fg3)" }} aria-hidden="true"><i className={icon} /></div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--r-fg)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--r-fg2)", lineHeight: 1.6 }}>{sub}</div>
    </div>
  );
}
function BizStatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: "var(--r-surf)", border: "1px solid var(--r-bord)", borderRadius: 12, padding: "16px 20px", boxShadow: ELEV.sm }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        {color && <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />}
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--r-fg2)" }}>{label}</div>
      </div>
      <div className="r-tnum" style={{ fontFamily: HERO_FONT, fontSize: 28, fontWeight: 400, color: color || "var(--r-fg)", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: "var(--r-fg2)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function App() {
  const [root, setRoot] = useState(loadRoot);
  const [view, setView] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [panicStep, setPanicStep] = useState(0);
  const [postRelapseId, setPostRelapseId] = useState(null);
  const [checkedPost, setCheckedPost] = useState([]);
  const [setupDraft, setSetupDraft] = useState({ name: "", substance: "", date: getTodayStr(), color: ACCOUNT_COLORS[0], step: 0 });
  const [settingsTab, setSettingsTab] = useState("appearance");
  const [settingsAccDraft, setSettingsAccDraft] = useState(null);
  const [logBed, setLogBed] = useState("");
  const [logWake, setLogWake] = useState("");
  const [editRt, setEditRt] = useState(false);
  const [rtDraft, setRtDraft] = useState(null);
  const [habitModal, setHabitModal] = useState(null);
  const [editHabitId, setEditHabitId] = useState(null);
  const [habitDraft, setHabitDraft] = useState(null);
  const [habitsTab, setHabitsTab] = useState("good");
  const [badHabitModal, setBadHabitModal] = useState(null);
  const [badHabitDraft, setBadHabitDraft] = useState(null);
  const [badHabitEditId, setBadHabitEditId] = useState(null);
  const [slipModal, setSlipModal] = useState(null);
  const [slipNote, setSlipNote] = useState("");
  const [schedActModal, setSchedActModal] = useState(false);
  const [schedActDraft, setSchedActDraft] = useState(null);
  const [goalsTab, setGoalsTab] = useState("goals");
  const [goalsPeriod, setGoalsPeriod] = useState("yearly");
  const [goalsAreaFilter, setGoalsAreaFilter] = useState("");
  const [goalsShowArchived, setGoalsShowArchived] = useState(false);
  const [goalDraft, setGoalDraft] = useState(null);
  const [editGoalId, setEditGoalId] = useState(null);
  const [editingVision, setEditingVision] = useState(null); // null | "why" | "vision" | "areas"
  const [visionDraft, setVisionDraft] = useState(null);
  const [lifeAreasDraft, setLifeAreasDraft] = useState(null);
  const [contractDraft, setContractDraft] = useState(null);
  const [letterDraft, setLetterDraft] = useState(null);
  const [weeklyReviewDraft, setWRD] = useState(null);
  const [winText, setWinText] = useState("");
  const [gratitudeDraft, setGratitudeDraft] = useState(["", "", ""]);
  const [newRem, setNewRem] = useState("");
  const [newPostAction, setNewPostAction] = useState("");
  const [newPostReminder, setNewPostReminder] = useState("");
  const [relapseNote, setRN] = useState("");
  const [checkedTools, setCheckedTools] = useState([]);
  const [journalText, setJT] = useState("");
  const [newRewName, setNRN] = useState("");
  const [newRewDays, setNRD] = useState(30);
  const [editRewId, setEditRewId] = useState(null);
  const [editRewDraft, setEditRewDraft] = useState(null);
  const [routineTab, setRoutineTab] = useState("sleep");
  const [editPrayerTargets, setEditPrayerTargets] = useState(false);
  const [prayerTargetsDraft, setPrayerTargetsDraft] = useState(null);
  const [healthTab, setHealthTab] = useState("water");
  const [editWaterConfig, setEditWaterConfig] = useState(false);
  const [waterConfigDraft, setWaterConfigDraft] = useState(null);
  const [medDraft, setMedDraft] = useState(null);
  const [editMedId, setEditMedId] = useState(null);
  const [exerciseDraft, setExerciseDraft] = useState(null);
  const [metricDraft, setMetricDraft] = useState(null);
  const [scheduleViewDate, setScheduleViewDate] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // "syncing" | "synced" | "error"

  // ── Business section state ────────────────────────────────────────────────
  const [section, setSection] = useState("personal"); // "personal" | "business"
  const [bizView, setBizView] = useState("biz-dashboard");
  const [bizGroupId, setBizGroupId] = useState(null);
  const [bizOneOneId, setBizOneOneId] = useState(null);
  const [bizStudents, setBizStudents] = useState([]);
  const [bizGroups, setBizGroups] = useState([]);
  const [bizMembers, setBizMembers] = useState([]);
  const [bizOneOnes, setBizOneOnes] = useState([]);
  const [bizPayments, setBizPayments] = useState([]);
  const [bizLoading, setBizLoading] = useState(false);
  const [bizModal, setBizModal] = useState(null);
  const [bizDraft, setBizDraft] = useState(null);
  const [bizEditId, setBizEditId] = useState(null);
  const [bizMemberGroupId, setBizMemberGroupId] = useState(null);
  const [bizPayTarget, setBizPayTarget] = useState(null);
  const [bizReschedTarget, setBizReschedTarget] = useState(null);
  const [bizConfirm, setBizConfirm] = useState(null);
  const [bizError, setBizError] = useState("");
  const [bizSessions, setBizSessions] = useState([]);
  const [bizClassTarget, setBizClassTarget] = useState(null);

  const notifRef = useRef([]);
  const syncRef = useRef(null);

  const syncToSupabase = useCallback((rootData) => {
    if (syncRef.current) clearTimeout(syncRef.current);
    setSyncStatus("syncing");
    syncRef.current = setTimeout(async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { setSyncStatus(null); return; }
      const { error } = await supabase.from("profiles").upsert({
        id: s.user.id,
        account: rootData.account,
        theme: rootData.theme,
        updated_at: new Date().toISOString(),
      });
      setSyncStatus(error ? "error" : "synced");
      setTimeout(() => setSyncStatus(null), 2000);
    }, 1500);
  }, []);

  const upd = useCallback(patch => {
    setRoot(prev => {
      const next = { ...prev, account: { ...prev.account, ...patch } };
      saveRoot(next);
      syncToSupabase(next);
      return next;
    });
  }, [syncToSupabase]);

  const updTheme = useCallback(patch => {
    setRoot(prev => {
      const next = { ...prev, theme: { ...prev.theme, ...patch } };
      saveRoot(next);
      syncToSupabase(next);
      return next;
    });
  }, [syncToSupabase]);

  const loadBizData = useCallback(async () => {
    if (!session) return;
    setBizLoading(true);
    try {
      const uid = session.user.id;
      const [{ data: s }, { data: g }, { data: m }, { data: o }, { data: p }, { data: ss }] = await Promise.all([
        supabase.from("business_students").select("*").eq("user_id", uid).order("name"),
        supabase.from("business_groups").select("*").eq("user_id", uid).order("name"),
        supabase.from("business_group_members").select("*").eq("user_id", uid),
        supabase.from("business_oneone").select("*").eq("user_id", uid).order("student_name"),
        supabase.from("business_payments").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("business_sessions").select("*").eq("user_id", uid).order("date", { ascending: false }),
      ]);
      setBizStudents(s || []);
      setBizGroups(g || []);
      setBizMembers(m || []);
      setBizOneOnes(o || []);
      setBizPayments(p || []);
      setBizSessions(ss || []);
    } finally {
      setBizLoading(false);
    }
  }, [session]);

  function bizGoTo(v, opts = {}) {
    if (opts.groupId) setBizGroupId(opts.groupId);
    if (opts.oneOneId) setBizOneOneId(opts.oneOneId);
    setBizView(v);
  }

  const account = root.account;
  const theme = useMemo(() => migrateTheme(root.theme), [root.theme]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const routineTargets = account?.routineTargets || DEFAULT_ROUTINE_TARGETS();
  const sleepLogs = account?.sleepLogs || [];
  const prayerLogs = account?.prayerLogs || [];
  const habits = account?.habits || [];
  const normalizedHabits = habits.map(normalizeHabit);
  const todayDay = getTodayDay();
  const weekStartStr = getWeekStr();
  const scheduleActivities = account?.scheduleActivities || [];
  const scheduleCompletions = account?.scheduleCompletions || {};
  const todayHabits = normalizedHabits.filter(h => h.days.length === 0 || h.days.includes(todayDay));
  const todayActivities = scheduleActivities.filter(a =>
    a.type === "oneTime" ? a.date === getTodayStr() : (a.days.length === 0 || a.days.includes(todayDay))
  );
  const goals = account?.goals || [];
  const normalizedGoals = goals.map(normalizeGoal);
  const vision = account?.vision || DEFAULT_VISION();
  const accountability = account?.accountability || DEFAULT_ACCOUNTABILITY();
  const reminders = account?.reminders || [];
  const postRelapseActions = account?.postRelapseActions || [];
  const postRelapseReminders = account?.postRelapseReminders || [];
  const daysSober = getDaysSince(account?.sobrietyStart);
  const todayLog = sleepLogs.find(l => l.date === getTodayStr());
  const todaySleepScore = todayLog
    ? (todayLog.score ?? calcSleepScore(todayLog.bedtime, todayLog.waketime, todayLog.durationMins, routineTargets))
    : null;
  const last7 = [...sleepLogs].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const avgSleep = last7.length ? Math.round(last7.reduce((s, l) => s + l.durationMins, 0) / last7.length) : null;
  const avg7Score = last7.length ? Math.round(last7.reduce((s, l) => s + (l.score ?? calcSleepScore(l.bedtime, l.waketime, l.durationMins, routineTargets)), 0) / last7.length) : null;
  const todayDone = todayHabits.filter(h => h.completions.includes(getTodayStr())).length;
  const habitPct = todayHabits.length ? Math.round(todayDone / todayHabits.length * 100) : 0;
  const badHabits = account?.badHabits || [];
  const claimed = account?.claimedRewards || [];
  const availRew = (account?.rewards || []).filter(r => daysSober >= r.days && !claimed.includes(r.id));
  const waterLogs = account?.waterLogs || {};
  const waterConfig = account?.waterConfig || DEFAULT_WATER_CONFIG();
  const medications = account?.medications || [];
  const medicationLogs = account?.medicationLogs || {};
  const exerciseLogs = account?.exerciseLogs || [];
  const bodyMetrics = account?.bodyMetrics || [];
  const todayWater = waterLogs[getTodayStr()] || 0;
  const waterStreak = (() => {
    let s = 0; const d = new Date(); d.setHours(12, 0, 0, 0);
    while ((waterLogs[d.toISOString().split("T")[0]] || 0) >= waterConfig.dailyTarget) { s++; d.setDate(d.getDate() - 1); }
    return s;
  })();
  const thisWeekExerciseMins = (() => {
    const end = new Date(weekStartStr + "T12:00"); end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().split("T")[0];
    return exerciseLogs.filter(e => e.date >= weekStartStr && e.date <= endStr).reduce((s, e) => s + (e.durationMins || 0), 0);
  })();
  const latestMetric = bodyMetrics.length ? [...bodyMetrics].sort((a, b) => b.date.localeCompare(a.date))[0] : null;

  const sleepScoreMap = {};
  sleepLogs.forEach(l => {
    sleepScoreMap[l.date] = l.score ?? calcSleepScore(l.bedtime, l.waketime, l.durationMins, routineTargets);
  });
  const prayerScoreMap = {};
  prayerLogs.forEach(l => {
    prayerScoreMap[l.date] = calcPrayerScore(l.prayers, routineTargets.prayerTargets).total;
  });

  const tbm = timeToMins(routineTargets.bedtime);
  const ntbm = tbm < 300 ? tbm + 1440 : tbm;
  const ntwm = timeToMins(routineTargets.waketime);
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i)); return d.toISOString().split("T")[0];
  });
  const bedtimeChartData = last14Days.map(date => {
    const log = sleepLogs.find(l => l.date === date);
    const bm = log ? timeToMins(log.bedtime) : null;
    return { actual: bm != null ? (bm < 300 ? bm + 1440 : bm) : null, target: ntbm, label: new Date(date + "T12:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" }) };
  });
  const wakeChartData = last14Days.map(date => {
    const log = sleepLogs.find(l => l.date === date);
    return { actual: log ? timeToMins(log.waketime) : null, target: ntwm, label: new Date(date + "T12:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" }) };
  });

  const todayPrayerLog = prayerLogs.find(l => l.date === getTodayStr());
  const todayPrayers = todayPrayerLog?.prayers || {};
  const todayPrayerScore = todayPrayerLog ? calcPrayerScore(todayPrayers, routineTargets.prayerTargets).total : null;
  const avg7PrayerScore = (() => {
    const recent = [...prayerLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
    return recent.length ? Math.round(recent.reduce((s, l) => s + calcPrayerScore(l.prayers, routineTargets.prayerTargets).total, 0) / recent.length) : null;
  })();
  const todayCombinedScore = (() => {
    if (todaySleepScore != null && todayPrayerScore != null) return Math.round((todaySleepScore + todayPrayerScore) / 2);
    return todaySleepScore ?? todayPrayerScore ?? null;
  })();
  const routineStreak = (() => {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const date = d.toISOString().split("T")[0];
      const ss = sleepScoreMap[date] ?? null;
      const ps = prayerScoreMap[date] ?? null;
      if (ss == null && ps == null) break;
      const combined = ss != null && ps != null ? (ss + ps) / 2 : (ss ?? ps);
      if (combined > 70) streak++;
      else break;
    }
    return streak;
  })();

  // ── Notification scheduler ────────────────────────────────────────────────
  useEffect(() => {
    notifRef.current.forEach(clearTimeout);
    notifRef.current = [];
    if (!account) return;
    normalizedHabits.forEach(h => {
      (h.scheduledTimes || []).forEach(st => {
        if (!st) return;
        const [hh, mm] = st.split(":").map(Number);
        const t = new Date(); t.setHours(hh, mm, 0, 0);
        if (t < new Date()) t.setDate(t.getDate() + 1);
        notifRef.current.push(setTimeout(() => sendNotif(`${h.name}`, "Your scheduled habit is due."), t - new Date()));
      });
    });
    const [bh, bm] = routineTargets.bedtime.split(":").map(Number);
    const bt = new Date(); bt.setHours(bh, bm - 30, 0, 0);
    if (bt < new Date()) bt.setDate(bt.getDate() + 1);
    notifRef.current.push(setTimeout(() => sendNotif("Bedtime", `Wind down — target: ${fmtTime(routineTargets.bedtime)}`), bt - new Date()));
    return () => notifRef.current.forEach(clearTimeout);
  }, [habits, routineTargets]);

  useEffect(() => {
    if (section === "business" && session) loadBizData();
  }, [section, session, loadBizData]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Escape closes the topmost open modal/sheet (WCAG 2.1.2 — no keyboard trap)
  useEffect(() => {
    const onKey = e => {
      if (e.key !== "Escape") return;
      if (modal) { setModal(null); setPostRelapseId(null); }
      else if (habitModal) setHabitModal(null);
      else if (badHabitModal) setBadHabitModal(null);
      else if (slipModal) setSlipModal(null);
      else if (schedActModal) setSchedActModal(false);
      else if (bizModal) bizCloseModal();
      else if (isMobile && sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, habitModal, badHabitModal, slipModal, schedActModal, bizModal, isMobile, sidebarOpen]);

  useEffect(() => {
    document.body.style.overflow = (isMobile && sidebarOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    const pkg = FONT_PACKAGES.find(f => f.id === theme.font) || FONT_PACKAGES[0];
    let heroLink = document.getElementById("r-hero-font");
    if (!heroLink) { heroLink = document.createElement("link"); heroLink.id = "r-hero-font"; heroLink.rel = "stylesheet"; heroLink.href = FRAUNCES_URL; document.head.appendChild(heroLink); }
    if (pkg.url) {
      let link = document.getElementById("r-font-link");
      if (!link) { link = document.createElement("link"); link.id = "r-font-link"; link.rel = "stylesheet"; document.head.appendChild(link); }
      link.href = pkg.url;
    }
    const preset = THEME_PRESETS.find(p => p.id === theme.preset) || THEME_PRESETS[0];
    // Almanac uses ONE deliberate, contrast-safe accent (fountain-pen indigo / lamplight teal),
    // decoupled from the legacy per-account colour so text/buttons always pass WCAG on paper.
    const A = normalizeHex(preset.accent);
    const surf3 = theme.surf3 || preset?.surf3 || theme.surf2;
    const fg3 = theme.fg3 || preset?.fg3 || theme.fg2;
    const G = "transparent";
    const light = theme.lightRamp ?? preset?.lightRamp ?? false;
    const ACT = preset.textAccent || A;
    CURRENT_LIGHT = light;
    let style = document.getElementById("r-theme-vars");
    if (!style) { style = document.createElement("style"); style.id = "r-theme-vars"; document.head.appendChild(style); }
    style.textContent = buildThemeCSS({ T: theme, A, G, ACT, surf3, fg3, light, fontStack: pkg.stack });
  }, [theme, account?.color]);

  // ── Supabase auth ─────────────────────────────────────────────────────────
  const loadFromSupabase = useCallback(async (sess) => {
    const { data } = await supabase.from("profiles").select("account,theme").eq("id", sess.user.id).single();
    if (data?.account) {
      const merged = { account: data.account, theme: data.theme ?? DEFAULT_THEME() };
      setRoot(merged);
      saveRoot(merged);
    }
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    let initialDone = false;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      initialDone = true;
      setSession(s);
      if (s) loadFromSupabase(s);
      else setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        // On initial load getSession already handles it; only act on subsequent sign-ins
        if (initialDone) { setAuthLoading(true); loadFromSupabase(s); }
      } else {
        setAuthLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadFromSupabase]);

  const handlePinLogin = async () => {
    const pin = pinInput.trim();
    if (pin.length < 4) { setAuthError("PIN must be at least 4 digits"); return; }
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: INTERNAL_EMAIL, password: pin });
    if (!error) return;
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      if (!isNewUser) {
        setIsNewUser(true);
        setPinConfirm("");
        return;
      }
      if (pinConfirm !== pin) { setAuthError("PINs don't match — try again"); setPinConfirm(""); return; }
      const { error: signUpErr } = await supabase.auth.signUp({ email: INTERNAL_EMAIL, password: pin });
      if (signUpErr) { setAuthError(signUpErr.message); return; }
      await supabase.auth.signInWithPassword({ email: INTERNAL_EMAIL, password: pin });
    } else {
      setAuthError("Incorrect PIN");
    }
  };

  const handleLock = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setPinInput("");
    setPinConfirm("");
    setAuthError("");
    setIsNewUser(false);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  function createJourney() {
    const acc = {
      ...accountDefaults(), id: "acc_" + Date.now(),
      name: setupDraft.name.trim() || "My Recovery",
      substance: setupDraft.substance.trim(),
      color: setupDraft.color,
      sobrietyStart: setupDraft.date,
      habits: DEFAULT_HABITS(),
      rewards: DEFAULT_REWARDS(),
      postRelapseActions: DEFAULT_POST_ACTIONS(),
      postRelapseReminders: DEFAULT_POST_REMINDERS(),
    };
    const next = { account: acc, theme: DEFAULT_THEME() };
    saveRoot(next); setRoot(next); syncToSupabase(next);
  }

  const completedToday = id => (habits.find(h => h.id === id)?.completions || []).includes(getTodayStr());
  const toggleHabit = id => {
    const today = getTodayStr();
    upd({ habits: habits.map(h => {
      if (h.id !== id) return h;
      const norm = normalizeHabit(h);
      const c = norm.completions;
      const updated = { ...norm, completions: c.includes(today) ? c.filter(d => d !== today) : [...c, today] };
      return recalcHabitLevel(updated);
    }) });
  };
  function openAddHabit() {
    setHabitDraft({ name: "", category: "custom", days: [], scheduledTimes: [], levelsEnabled: false, currentLevel: 1, levels: [] });
    setEditHabitId(null);
    setHabitModal("add");
  }
  function openEditHabit(h) {
    setHabitDraft({ ...normalizeHabit(h) });
    setEditHabitId(h.id);
    setHabitModal("edit");
  }
  function saveHabit() {
    if (!habitDraft?.name?.trim()) return;
    if (habitModal === "add") {
      const h = { ...habitDraft, id: "h" + Date.now(), name: habitDraft.name.trim(), completions: [] };
      upd({ habits: [...habits, h] });
    } else {
      upd({ habits: habits.map(x => x.id === editHabitId ? { ...habitDraft, name: habitDraft.name.trim() } : x) });
    }
    setHabitModal(null); setHabitDraft(null); setEditHabitId(null);
  }
  function addHabitLevel() {
    const next = (habitDraft.levels.length ? Math.max(...habitDraft.levels.map(l => l.level)) : 0) + 1;
    setHabitDraft(d => ({ ...d, levels: [...d.levels, { level: next, name: "", description: "", upPerWeek: 3, downPerWeek: 1 }] }));
  }
  function removeHabitLevel(lvl) {
    setHabitDraft(d => ({
      ...d,
      levels: d.levels.filter(l => l.level !== lvl).map((l, i) => ({ ...l, level: i + 1 })),
    }));
  }
  function updateHabitLevel(idx, key, val) {
    setHabitDraft(d => ({ ...d, levels: d.levels.map((l, i) => i === idx ? { ...l, [key]: val } : l) }));
  }
  function toggleLevelsEnabled(on) {
    setHabitDraft(d => ({
      ...d, levelsEnabled: on,
      levels: on && !d.levels.length ? [{ level: 1, name: "", description: "", upPerWeek: 3, downPerWeek: null }] : d.levels,
    }));
  }
  function addSchedActivity() {
    if (!schedActDraft?.name?.trim()) return;
    const act = { ...schedActDraft, id: "sa" + Date.now(), name: schedActDraft.name.trim() };
    upd({ scheduleActivities: [...scheduleActivities, act] });
    setSchedActModal(false); setSchedActDraft(null);
  }
  function deleteSchedActivity(id) {
    upd({ scheduleActivities: scheduleActivities.filter(a => a.id !== id) });
  }
  function toggleSchedActivity(id) {
    const today = getTodayStr();
    const dayComps = { ...(scheduleCompletions[today] || {}) };
    dayComps[id] = !dayComps[id];
    upd({ scheduleCompletions: { ...scheduleCompletions, [today]: dayComps } });
  }
  const toggleGoal = id => {
    const g = goals.find(g => g.id === id); if (!g) return;
    const key = getPeriodKey(g.period); const done = g.done || [];
    upd({ goals: goals.map(g => g.id !== id ? g : { ...g, done: done.includes(key) ? done.filter(k => k !== key) : [...done, key] }) });
  };

  function logRelapse() {
    const id = "rl_" + Date.now();
    const entry = { id, date: new Date().toISOString(), note: relapseNote, tools: checkedTools, postDone: false };
    upd({ relapses: [...(account?.relapses || []), entry], sobrietyStart: getTodayStr() });
    setModal(null); setRN(""); setCheckedTools([]);
    setPostRelapseId(id); setCheckedPost([]);
    setModal("postRelapse");
  }

  function submitSleepLog() {
    if (!logBed || !logWake) return;
    const dur = sleepDur(logBed, logWake);
    const score = calcSleepScore(logBed, logWake, dur, routineTargets);
    upd({ sleepLogs: [...sleepLogs.filter(l => l.date !== getTodayStr()), { date: getTodayStr(), bedtime: logBed, waketime: logWake, durationMins: dur, score }] });
    setModal(null); setLogBed(""); setLogWake("");
  }

  function addReminder() { if (!newRem.trim()) return; upd({ reminders: [...reminders, { id: "rem" + Date.now(), text: newRem.trim() }] }); setNewRem(""); }
  function addPostAction() { if (!newPostAction.trim()) return; upd({ postRelapseActions: [...postRelapseActions, { id: "pa" + Date.now(), text: newPostAction.trim() }] }); setNewPostAction(""); }
  function addPostReminder() { if (!newPostReminder.trim()) return; upd({ postRelapseReminders: [...postRelapseReminders, { id: "pr" + Date.now(), text: newPostReminder.trim() }] }); setNewPostReminder(""); }
  function addJournal() { if (!journalText.trim()) return; upd({ journal: [{ id: Date.now(), date: new Date().toISOString(), text: journalText.trim() }, ...(account?.journal || [])] }); setJT(""); }
  function addReward() { if (!newRewName.trim()) return; upd({ rewards: [...(account?.rewards || []), { id: "rw" + Date.now(), days: Number(newRewDays), name: newRewName.trim() }] }); setNRN(""); setNRD(30); }
  const claimReward = id => upd({ claimedRewards: [...claimed, id] });
  const deleteReward = id => upd({ rewards: (account?.rewards || []).filter(r => r.id !== id), claimedRewards: claimed.filter(c => c !== id) });
  function saveEditReward() { if (!editRewDraft?.name?.trim()) return; upd({ rewards: (account?.rewards || []).map(r => r.id === editRewId ? { ...r, name: editRewDraft.name.trim(), days: Number(editRewDraft.days) } : r) }); setEditRewId(null); setEditRewDraft(null); }
  function logWater(delta) {
    const today = getTodayStr();
    upd({ waterLogs: { ...waterLogs, [today]: Math.max(0, (waterLogs[today] || 0) + delta) } });
  }
  function saveWaterConfig() { upd({ waterConfig: waterConfigDraft }); setEditWaterConfig(false); }
  function toggleMedication(medId, date) {
    const d = date || getTodayStr();
    const dayMeds = medicationLogs[d] || [];
    upd({ medicationLogs: { ...medicationLogs, [d]: dayMeds.includes(medId) ? dayMeds.filter(x => x !== medId) : [...dayMeds, medId] } });
  }
  function saveMedication() {
    if (!medDraft?.name?.trim()) return;
    const med = { ...medDraft, id: editMedId || "med" + Date.now(), name: medDraft.name.trim() };
    upd({ medications: editMedId ? medications.map(m => m.id === editMedId ? med : m) : [...medications, med] });
    setMedDraft(null); setEditMedId(null);
  }
  function addExerciseLog() {
    if (!exerciseDraft?.type?.trim() || !exerciseDraft?.durationMins) return;
    const entry = { ...exerciseDraft, id: "ex" + Date.now(), date: exerciseDraft.date || getTodayStr(), durationMins: Number(exerciseDraft.durationMins) };
    upd({ exerciseLogs: [entry, ...exerciseLogs] });
    setExerciseDraft(null);
  }
  function addBodyMetric() {
    if (!metricDraft?.weight) return;
    const entry = { ...metricDraft, id: "bm" + Date.now(), date: metricDraft.date || getTodayStr(), weight: Number(metricDraft.weight) };
    upd({ bodyMetrics: [entry, ...bodyMetrics] });
    setMetricDraft(null);
  }
  function saveRoutine() { upd({ routineTargets: { ...routineTargets, ...rtDraft } }); setEditRt(false); }
  function updatePrayer(prayerName, patch) {
    const today = getTodayStr();
    const existing = prayerLogs.find(l => l.date === today);
    const prayers = { ...(existing?.prayers || {}) };
    prayers[prayerName] = { time: null, missed: false, score: 0, ...(prayers[prayerName] || {}), ...patch };
    const entry = prayers[prayerName];
    if (!entry.missed && entry.time) {
      const t = timeToMins(entry.time);
      const range = routineTargets.prayerTargets[prayerName];
      entry.score = t >= timeToMins(range.earliest) && t <= timeToMins(range.latest) ? 20 : 10;
    } else {
      entry.score = 0;
    }
    upd({ prayerLogs: [...prayerLogs.filter(l => l.date !== today), { date: today, prayers }] });
  }
  function savePrayerTargets() {
    upd({ routineTargets: { ...routineTargets, prayerTargets: prayerTargetsDraft } });
    setEditPrayerTargets(false);
  }

  // ── Business CRUD ─────────────────────────────────────────────────────────
  const bizUid = () => session?.user?.id;

  function bizOpenModal(type, draft = {}, editId = null) {
    setBizError("");
    setBizDraft(draft);
    setBizEditId(editId);
    setBizModal(type);
  }
  function bizCloseModal() { setBizModal(null); setBizDraft(null); setBizEditId(null); setBizError(""); }

  async function bizSaveStudent() {
    if (!bizDraft?.name?.trim()) { setBizError("Name is required"); return; }
    if (!bizDraft?.school?.trim()) { setBizError("School is required"); return; }
    const data = { name: bizDraft.name.trim(), school: bizDraft.school.trim(), enrolled_classes: bizDraft.enrolled_classes || "" };
    if (bizEditId) await supabase.from("business_students").update(data).eq("id", bizEditId);
    else await supabase.from("business_students").insert({ ...data, user_id: bizUid() });
    bizCloseModal(); loadBizData();
  }
  async function bizDeleteStudent(id) {
    await supabase.from("business_students").delete().eq("id", id);
    loadBizData();
  }

  async function bizSaveGroup() {
    if (!bizDraft?.name?.trim()) { setBizError("Group name is required"); return; }
    const data = { name: bizDraft.name.trim(), schedules: bizDraft.schedules || [], status: bizDraft.status || "active" };
    if (bizEditId) await supabase.from("business_groups").update(data).eq("id", bizEditId);
    else await supabase.from("business_groups").insert({ ...data, user_id: bizUid() });
    bizCloseModal(); loadBizData();
  }
  async function bizDeleteGroup(id) {
    await supabase.from("business_group_members").delete().eq("group_id", id);
    await supabase.from("business_groups").delete().eq("id", id);
    if (bizView === "biz-group-detail") bizGoTo("biz-groups");
    loadBizData();
  }

  async function bizSaveMember() {
    if (!bizDraft?.student_name?.trim()) { setBizError("Student name is required"); return; }
    const data = { group_id: bizMemberGroupId, student_name: bizDraft.student_name.trim(), rate: +bizDraft.rate || 0, classes_attended: +bizDraft.classes_attended || 0, total_paid: +bizDraft.total_paid || 0 };
    if (bizEditId) await supabase.from("business_group_members").update(data).eq("id", bizEditId);
    else await supabase.from("business_group_members").insert({ ...data, user_id: bizUid() });
    bizCloseModal(); loadBizData();
  }
  async function bizDeleteMember(id) {
    await supabase.from("business_group_members").delete().eq("id", id);
    loadBizData();
  }

  async function bizSaveOneOne() {
    if (!bizDraft?.student_name?.trim()) { setBizError("Student name is required"); return; }
    if (!bizDraft?.subject?.trim()) { setBizError("Subject is required"); return; }
    const data = { student_name: bizDraft.student_name.trim(), subject: bizDraft.subject.trim(), rate: +bizDraft.rate || 0, schedules: bizDraft.schedules || [], status: bizDraft.status || "active", classes_attended: +bizDraft.classes_attended || 0, total_paid: +bizDraft.total_paid || 0 };
    if (bizEditId) await supabase.from("business_oneone").update(data).eq("id", bizEditId);
    else await supabase.from("business_oneone").insert({ ...data, user_id: bizUid() });
    bizCloseModal(); loadBizData();
  }
  async function bizDeleteOneOne(id) {
    await supabase.from("business_payments").delete().eq("target_id", id);
    await supabase.from("business_oneone").delete().eq("id", id);
    if (bizView === "biz-oneone-detail") bizGoTo("biz-oneone");
    loadBizData();
  }

  function bizAddClass(type, id, name) {
    setBizClassTarget({ type, id, name });
    bizOpenModal("addclass", { date: getTodayStr(), note: "" });
  }

  async function bizSaveClass() {
    const t = bizClassTarget;
    if (!t || !bizDraft?.date) { setBizError("Date is required"); return; }
    setBizError("");
    await supabase.from("business_sessions").insert({ user_id: bizUid(), target_type: t.type, target_id: t.id, date: bizDraft.date, note: bizDraft.note || "" });
    if (t.type === "group") {
      const groupMems = bizMembers.filter(m => m.group_id === t.id);
      if (groupMems.length) await Promise.all(groupMems.map(m => supabase.from("business_group_members").update({ classes_attended: m.classes_attended + 1 }).eq("id", m.id)));
    } else {
      const oo = bizOneOnes.find(o => o.id === t.id);
      if (oo) await supabase.from("business_oneone").update({ classes_attended: oo.classes_attended + 1 }).eq("id", t.id);
    }
    setBizModal(null); setBizDraft(null); setBizClassTarget(null); setBizError("");
    loadBizData();
  }

  async function bizSavePayment() {
    const t = bizPayTarget;
    if (!t) return;
    const amount = t.isCustom ? (+bizDraft?.custom_amount || 0) : t.rate;
    if (!amount || amount <= 0) { setBizError("Amount must be greater than 0"); return; }
    if (!bizDraft?.date) { setBizError("Date is required"); return; }
    setBizError("");
    await supabase.from("business_payments").insert({ user_id: bizUid(), target_id: t.targetId, target_type: t.targetType, group_id: t.groupId || null, student_name: t.studentName, amount, date: bizDraft.date, is_custom: t.isCustom, note: bizDraft.note || "" });
    if (t.targetType === "groupMember") {
      const m = bizMembers.find(x => x.id === t.targetId);
      if (m) await supabase.from("business_group_members").update({ total_paid: m.total_paid + amount }).eq("id", t.targetId);
    } else {
      const oo = bizOneOnes.find(x => x.id === t.targetId);
      if (oo) await supabase.from("business_oneone").update({ total_paid: oo.total_paid + amount }).eq("id", t.targetId);
    }
    setBizModal(null); setBizDraft(null); setBizPayTarget(null); setBizError("");
    loadBizData();
  }

  async function bizSaveReschedule() {
    const t = bizReschedTarget;
    if (!t || !bizDraft?.date) { setBizError("Date is required"); return; }
    if (bizDraft.date < getTodayStr()) { setBizError("Date must be today or future"); return; }
    const table = t.targetType === "group" ? "business_groups" : "business_oneone";
    await supabase.from(table).update({ rescheduled_to: { date: bizDraft.date, time: bizDraft.time || "" } }).eq("id", t.targetId);
    setBizModal(null); setBizDraft(null); setBizReschedTarget(null); setBizError("");
    loadBizData();
  }
  async function bizClearReschedule() {
    const t = bizReschedTarget;
    if (!t) return;
    const table = t.targetType === "group" ? "business_groups" : "business_oneone";
    await supabase.from(table).update({ rescheduled_to: null }).eq("id", t.targetId);
    setBizModal(null); setBizDraft(null); setBizReschedTarget(null);
    loadBizData();
  }

  function bizExportCSV() {
    const rows = [["Date","Type","Class/Group","Student","Amount","Note"]];
    [...bizPayments].sort((a, b) => (a.date||"").localeCompare(b.date||"")).forEach(p => {
      const className = p.target_type === "groupMember" && p.group_id
        ? (bizGroups.find(g => g.id === p.group_id)?.name || "")
        : (bizOneOnes.find(o => o.id === p.target_id)?.subject || "");
      rows.push([p.date||"", p.target_type==="groupMember"?"Group":"1-on-1", className, p.student_name||"", (+p.amount).toFixed(2), p.note||""]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `ihsaned-payments-${getTodayStr()}.csv`;
    a.click();
  }

  // ── Auth loading ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={S.setupWrap}>
        <div style={{ color: "var(--r-fg2,#555)", fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={S.setupWrap}>
        <div style={S.setupCard}>
          <div style={S.setupEmoji} aria-hidden="true"><i className="ph ph-lock-key" /></div>
          <h1 style={S.setupTitle}>{isNewUser ? "Set your PIN" : "Welcome back"}</h1>
          <p style={S.setupSub}>
            {isNewUser ? "No account found. Choose a 4–8 digit PIN to create one." : "Enter your PIN to access your recovery data."}
          </p>
          <input
            style={{ ...S.input, textAlign: "center", fontSize: 22, letterSpacing: "0.3em", marginBottom: 10 }}
            type="password"
            inputMode="numeric"
            maxLength={8}
            placeholder="• • • •"
            value={pinInput}
            onChange={e => { setPinInput(e.target.value.replace(/\D/g, "")); setAuthError(""); }}
            onKeyDown={e => { if (e.key === "Enter" && !isNewUser) handlePinLogin(); }}
            autoFocus
          />
          {isNewUser && (
            <input
              style={{ ...S.input, textAlign: "center", fontSize: 22, letterSpacing: "0.3em", marginBottom: 10 }}
              type="password"
              inputMode="numeric"
              maxLength={8}
              placeholder="Confirm PIN"
              value={pinConfirm}
              onChange={e => { setPinConfirm(e.target.value.replace(/\D/g, "")); setAuthError(""); }}
              onKeyDown={e => { if (e.key === "Enter") handlePinLogin(); }}
            />
          )}
          {authError && <div style={{ fontSize: 12, color: "var(--r-danger)", marginBottom: 10 }}>{authError}</div>}
          <button style={{ ...S.primaryBtn, background: "var(--r-accent)", color: "#fff" }} onClick={handlePinLogin}>
            {isNewUser ? "Create account" : "Unlock"}
          </button>
          {isNewUser && (
            <button style={{ ...S.primaryBtn, marginTop: 8, background: "transparent", color: "var(--r-fg2)", border: "none" }} onClick={() => { setIsNewUser(false); setAuthError(""); setPinConfirm(""); }}>
              ← Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── No account yet ────────────────────────────────────────────────────────
  if (!account) {
    const sd = setupDraft;
    return (
      <div style={S.setupWrap}>
        <div style={S.setupCard}>
          {sd.step === 0 && (<>
            <div style={S.setupEmoji} aria-hidden="true"><i className="ph ph-leaf" /></div>
            <h1 style={S.setupTitle}>Recovery starts here</h1>
            <p style={S.setupSub}>Your private, all-in-one recovery companion.</p>
            <input style={S.input} placeholder="Name this journey…" value={sd.name} onChange={e => setSetupDraft(d => ({ ...d, name: e.target.value }))} autoFocus />
            <div style={{ fontSize: 10, color: "var(--r-fg2)", margin: "12px 0 6px" }}>Pick a colour</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {ACCOUNT_COLORS.map(c => (<div key={c} onClick={() => setSetupDraft(d => ({ ...d, color: c }))} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: sd.color === c ? "3px solid #fff" : "3px solid transparent" }} />))}
            </div>
            <button style={{ ...S.primaryBtn, background: sd.color, color: "#fff" }} onClick={() => setSetupDraft(d => ({ ...d, step: 1 }))} disabled={!sd.name.trim()}>Next →</button>
          </>)}
          {sd.step === 1 && (<>
            <div style={S.setupEmoji} aria-hidden="true"><i className="ph ph-chat-circle" /></div>
            <div style={S.setupTitle}>What are you working on?</div>
            <p style={S.setupSub}>e.g. alcohol, cigarettes, gambling, social media</p>
            <input style={S.input} placeholder="e.g. alcohol" value={sd.substance} onChange={e => setSetupDraft(d => ({ ...d, substance: e.target.value }))} autoFocus />
            <button style={{ ...S.primaryBtn, marginTop: 12, background: sd.color, color: "#fff" }} onClick={() => setSetupDraft(d => ({ ...d, step: 2 }))} disabled={!sd.substance.trim()}>Next →</button>
            <button style={{ ...S.primaryBtn, marginTop: 8, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => setSetupDraft(d => ({ ...d, step: 0 }))}>← Back</button>
          </>)}
          {sd.step === 2 && (<>
            <div style={S.setupEmoji} aria-hidden="true"><i className="ph ph-calendar-blank" /></div>
            <div style={S.setupTitle}>When did this sobriety begin?</div>
            <p style={S.setupSub}>It's okay if it's today. Every moment is a valid start.</p>
            <input type="date" style={S.input} value={sd.date} max={getTodayStr()} onChange={e => setSetupDraft(d => ({ ...d, date: e.target.value }))} />
            <button style={{ ...S.primaryBtn, marginTop: 12, background: sd.color, color: "#fff" }} onClick={createJourney}>Start my journey →</button>
            <button style={{ ...S.primaryBtn, marginTop: 8, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => setSetupDraft(d => ({ ...d, step: 1 }))}>← Back</button>
          </>)}
        </div>
      </div>
    );
  }

  const accentColor = "#234C5E"; // Almanac indigo ink — matches --r-accent; safe for `+ "18"` alpha concat

  const sortedTodayHabits = [...todayHabits].sort((a, b) => {
    const ta = a.scheduledTimes[0] || null;
    const tb = b.scheduledTimes[0] || null;
    if (!ta && !tb) return 0;
    if (!ta) return 1; if (!tb) return -1;
    return ta.localeCompare(tb);
  });
  const sortedTodayActivities = [...todayActivities].sort((a, b) => {
    const ta = a.times?.[0] || a.time || null;
    const tb = b.times?.[0] || b.time || null;
    if (!ta && !tb) return 0;
    if (!ta) return 1; if (!tb) return -1;
    return ta.localeCompare(tb);
  });

  const navGroups = [
    { label: null, items: [{ id: "dashboard", icon: "ph ph-house", label: "Today" }] },
    { label: "DAILY", items: [
      { id: "routine", icon: "ph ph-moon-stars", label: "Routine" },
      { id: "habits", icon: "ph ph-check-square", label: "Habits" },
      { id: "schedule", icon: "ph ph-calendar-blank", label: "Schedule" },
      { id: "health", icon: "ph ph-drop", label: "Health" },
    ]},
    { label: "PROGRESS", items: [
      { id: "goals", icon: "ph ph-target", label: "Goals" },
      { id: "rewards", icon: "ph ph-seal-check", label: "Rewards" },
      { id: "journal", icon: "ph ph-pen-nib", label: "Journal" },
    ]},
    { label: "SUPPORT", items: [
      { id: "relapse", icon: "ph ph-lifebuoy", label: "Support" },
    ]},
  ];

  return (
    <div style={S.app}>
      {/* Screen-reader announcer for view changes (no-router SPA — WCAG 4.1.3) */}
      <div role="status" aria-live="polite" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>
        {section === "business" ? `Business · ${bizView}` : view} view
      </div>
      {/* ── Mobile top bar ── */}
      {isMobile && (
        <div style={S.mobileHeader}>
          <button style={S.hamburger} onClick={() => setSidebarOpen(o => !o)} aria-label="Open menu"><i className="ph ph-list" /></button>
          <span style={{ fontFamily: "var(--r-hero)", fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em" }}>Recover</span>
          <div className="r-tnum" style={{ fontSize: 17, fontWeight: 500, fontFamily: "var(--r-hero)", color: accentColor }}>{daysSober}d</div>
        </div>
      )}

      {/* ── Sidebar backdrop ── */}
      {isMobile && sidebarOpen && <div style={S.sidebarBackdrop} onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside style={{ ...S.sidebar, ...(isMobile ? { position: "fixed", top: 0, bottom: 0, left: 0, height: "auto", transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease", zIndex: 200, boxShadow: "4px 0 32px rgba(0,0,0,0.8)", width: 240 } : {}) }}>
        {/* Logo */}
        <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ ...S.logo, display: "flex", alignItems: "center", gap: 8 }}><i className={section === "business" ? "ph ph-briefcase" : "ph ph-leaf"} style={{ fontSize: 19, color: accentColor }} aria-hidden="true" />{section === "business" ? "IhsanEd" : "Recover"}</div>
          {isMobile && <button style={{ background: "none", border: "none", color: "var(--r-fg2)", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 0 }} onClick={() => setSidebarOpen(false)}>×</button>}
        </div>

        {/* Personal / Business tabs */}
        <div style={{ padding: "0 12px 12px", borderBottom: "1px solid var(--r-bord)" }}>
          <div style={{ display: "flex", background: "var(--r-surf2)", borderRadius: 8, padding: 3, gap: 3 }}>
            {["personal","business"].map(s => (
              <button key={s} style={{ flex: 1, padding: "6px 4px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: section === s ? (s === "business" ? BIZ_BLUE : accentColor) : "transparent", color: section === s ? (s === "business" ? "#fff" : "#fff") : "var(--r-fg2)", transition: "all 0.15s", fontFamily: "var(--r-font,'Inter',system-ui,sans-serif)", letterSpacing: "-0.01em" }}
                onClick={() => { setSection(s); if (isMobile) setSidebarOpen(false); }}>
                {s === "personal" ? "Personal" : "Business"}
              </button>
            ))}
          </div>
        </div>

        {section === "personal" && (<>
          {/* Account profile */}
          <div style={{ padding: "10px 12px 10px", borderBottom: "1px solid var(--r-bord)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderRadius: 9, background: "var(--r-surf2)" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {(account.name || "R").charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>{account.name}</div>
                <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 1 }}>{daysSober}d sober · {account.substance}</div>
              </div>
            </div>
          </div>

          {/* Personal nav */}
          <nav style={{ flex: 1, overflowY: "auto", padding: "10px 10px 0", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
            {navGroups.map((group, gi) => (
              <div key={gi} style={{ marginBottom: 4 }}>
                {group.label && <div style={{ fontSize: 10, fontWeight: 600, color: "var(--r-fg2)", letterSpacing: "0.1em", padding: "10px 8px 4px", opacity: 0.6 }}>{group.label}</div>}
                {group.items.map(n => {
                  const active = view === n.id;
                  return (
                    <button key={n.id} aria-current={active ? "page" : undefined} style={{ ...S.navBtn, ...(active ? { background: accentColor + "18", color: "var(--r-fg)", fontWeight: 600 } : {}) }} onClick={() => { setView(n.id); if (isMobile) setSidebarOpen(false); }}>
                      <span style={{ ...S.navIcon, color: active ? accentColor : "var(--r-fg2)" }} aria-hidden="true"><i className={active ? n.icon.replace("ph ph-", "ph-fill ph-") : n.icon} style={{ fontSize: 18 }} /></span>
                      <span style={{ color: active ? "var(--r-fg)" : "var(--r-fg2)" }}>{n.label}</span>
                      <div style={{ position: "absolute", left: 0, top: "50%", width: 3, height: active ? 20 : 0, transform: "translateY(-50%)", background: accentColor, borderRadius: 2, boxShadow: active ? "var(--r-glow-active)" : "none", transition: "height 260ms var(--r-ease-dawn)" }} />
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Personal bottom actions */}
          <div style={{ padding: "12px 10px", paddingBottom: "max(12px, env(safe-area-inset-bottom))", borderTop: "1px solid var(--r-bord)", flexShrink: 0 }}>
            <button style={{ ...S.navBtn, color: "var(--r-danger)", marginBottom: 2 }} onClick={() => { setModal("relapseLog"); if (isMobile) setSidebarOpen(false); }}>
              <span style={{ ...S.navIcon, color: "var(--r-danger)" }} aria-hidden="true"><i className="ph ph-warning-circle" style={{ fontSize: 18 }} /></span>
              <span>Log a relapse</span>
            </button>
            <button style={{ ...S.navBtn, ...(view === "settings" ? { background: accentColor + "18", color: "var(--r-fg)", fontWeight: 600 } : {}) }} onClick={() => { setView("settings"); if (isMobile) setSidebarOpen(false); }}>
              <span style={{ ...S.navIcon, color: view === "settings" ? accentColor : "var(--r-fg2)" }} aria-hidden="true"><i className={view==="settings"?"ph-fill ph-gear":"ph ph-gear"} style={{fontSize:18}} /></span>
              <span style={{ color: view === "settings" ? "var(--r-fg)" : "var(--r-fg2)" }}>Settings</span>
              <div style={{ position: "absolute", left: 0, top: "50%", width: 3, height: view === "settings" ? 20 : 0, transform: "translateY(-50%)", background: accentColor, borderRadius: 2, boxShadow: view === "settings" ? "var(--r-glow-active)" : "none", transition: "height 260ms var(--r-ease-dawn)" }} />
            </button>
            <button style={{ ...S.navBtn, marginTop: 2 }} onClick={handleLock}>
              <span style={{ ...S.navIcon, color: "var(--r-fg2)" }} aria-hidden="true"><i className="ph ph-lock-simple" style={{ fontSize: 18 }} /></span>
              <span style={{ color: "var(--r-fg2)", fontSize: 12 }}>
                Lock
                {syncStatus === "syncing" && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--r-info)" }}>↑ syncing</span>}
                {syncStatus === "synced" && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--r-success)" }}>✓ synced</span>}
                {syncStatus === "error" && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--r-danger)" }}>⚠ sync failed</span>}
              </span>
            </button>
          </div>
        </>)}

        {section === "business" && (() => {
          const bizNavItems = [
            { id: "biz-dashboard", icon: "ph ph-squares-four", label: "Dashboard" },
            { id: "biz-groups", icon: "ph ph-users-three", label: "Group Classes" },
            { id: "biz-oneone", icon: "ph ph-user", label: "One-on-One" },
            { id: "biz-schedule", icon: "ph ph-calendar-blank", label: "Schedule" },
            { id: "biz-students", icon: "ph ph-student", label: "Students" },
            { id: "biz-records", icon: "ph ph-receipt", label: "Records" },
          ];
          return (<>
            <nav style={{ flex: 1, overflowY: "auto", padding: "10px 10px 0", overscrollBehavior: "contain" }}>
              {bizNavItems.map(n => {
                const active = bizView === n.id || (n.id === "biz-groups" && bizView === "biz-group-detail") || (n.id === "biz-oneone" && bizView === "biz-oneone-detail");
                return (
                  <button key={n.id} style={{ ...S.navBtn, ...(active ? { background: BIZ_BLUE + "18", color: "var(--r-fg)", fontWeight: 600 } : {}) }}
                    onClick={() => { bizGoTo(n.id); if (isMobile) setSidebarOpen(false); }}>
                    <span style={{ ...S.navIcon, color: active ? BIZ_BLUE : "var(--r-fg2)" }} aria-hidden="true"><i className={n.icon} style={{ fontSize: 18 }} /></span>
                    <span style={{ color: active ? "var(--r-fg)" : "var(--r-fg2)" }}>{n.label}</span>
                    <div style={{ position: "absolute", left: 0, top: "50%", width: 3, height: active ? 20 : 0, transform: "translateY(-50%)", background: BIZ_BLUE, borderRadius: 2, transition: "height 260ms var(--r-ease-dawn)" }} />
                  </button>
                );
              })}
            </nav>
            <div style={{ padding: "12px 10px", paddingBottom: "max(12px, env(safe-area-inset-bottom))", borderTop: "1px solid var(--r-bord)", flexShrink: 0 }}>
              <button style={{ ...S.navBtn, marginTop: 2 }} onClick={handleLock}>
                <span style={{ ...S.navIcon, color: "var(--r-fg2)" }} aria-hidden="true"><i className="ph ph-lock-simple" style={{ fontSize: 18 }} /></span>
                <span style={{ color: "var(--r-fg2)", fontSize: 12 }}>Lock</span>
              </button>
            </div>
          </>);
        })()}
      </aside>

      {/* ── Main ── */}
      <main id="main-content" tabIndex={-1} aria-label={view} style={{ ...S.main, ...(isMobile ? { marginTop: 52 } : {}), outline: "none" }}>

        {section === "personal" && (<>

        {/* ════ DASHBOARD ════ */}
        {view === "dashboard" && (() => {
          const today = getTodayStr();
          const todaySchedComps = scheduleCompletions[today] || {};
          const todayActDone = todayActivities.filter(a => todaySchedComps[a.id]).length;
          const schedTotal = todayHabits.length + todayActivities.length;
          const schedDone = todayDone + todayActDone;
          const schedPct = schedTotal ? Math.round(schedDone / schedTotal * 100) : 0;
          const PRIORITY_ORD = { high: 0, med: 1, low: 2 };
          const activeGoals = normalizedGoals
            .filter(g => !g.archived)
            .sort((a, b) => {
              const pd = PRIORITY_ORD[a.priority || "med"] - PRIORITY_ORD[b.priority || "med"];
              if (pd !== 0) return pd;
              return PERIOD_ORDER.indexOf(a.period || "daily") - PERIOD_ORDER.indexOf(b.period || "daily");
            });
          const topGoals = activeGoals.slice(0, 3);
          const lifeAreasArr = LIFE_AREAS.map(la => ({ ...la, value: (vision.lifeAreas?.[la.key] ?? 5) * 10 }));
          const nm = MILESTONES.find(m => m.days > daysSober);
          const milPct = nm ? Math.min(100, daysSober / nm.days * 100) : 0;
          const longest = calcLongestStreak([...(account?.relapses || []).map(r => r.date?.split("T")[0]), today].filter(Boolean));
          const now = new Date();
          const sinceStr = account?.sobrietyStart ? new Date(account.sobrietyStart).toLocaleDateString("en-AU", { day: "numeric", month: "long" }) : null;
          const hijri = hijriStr(now);
          const greet = greetingFor(now.getHours());
          const firstName = (account?.name || "").trim().split(" ")[0] || "";
          const grounding = [
            "“And whoever relies upon Allah — then He is sufficient for him.”",
            "One day, one prayer, one breath at a time.",
            "The streak resets. You don't.",
            "Showing up today is the whole work.",
          ][daysSober % 4];
          return (
            <div style={{ ...S.content, maxWidth: 640 }}>
              {/* Header band */}
              <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontFamily: HERO_FONT, fontWeight: 460, fontSize: "clamp(2rem,1.6rem + 1.8vw,2.75rem)", lineHeight: 1.05, letterSpacing: "-0.01em" }}>
                  {greet}{firstName ? <>,<br />{firstName}</> : ""}
                </h1>
                <div style={{ fontSize: 14, color: "var(--r-fg3)", marginTop: 8, letterSpacing: "0.01em" }}>
                  {hijri && <span style={{ color: "var(--r-fg2)", fontWeight: 600 }}>{hijri}</span>}
                  {hijri ? " · " : ""}{now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
                </div>
              </div>

              {/* Streak hero */}
              <div style={{ ...S.card, borderRadius: 20, padding: "22px 24px" }}>
                <div style={{ fontSize: 14, color: "var(--r-fg3)", fontWeight: 600 }}>Days clear</div>
                <div className="r-tnum" style={{ fontFamily: HERO_FONT, fontWeight: 480, fontSize: "clamp(3.25rem,2.4rem + 3.6vw,5rem)", lineHeight: 0.95, letterSpacing: "-0.02em", color: "var(--r-success)", margin: "2px 0 4px" }}>{daysSober}</div>
                <div style={{ height: 6, background: "var(--r-surf2)", borderRadius: 999, overflow: "hidden", marginTop: 12 }}>
                  <div style={{ height: "100%", width: `${milPct}%`, background: "var(--r-success)", borderRadius: 999 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: "var(--r-fg3)", letterSpacing: "0.02em" }}>
                  <span>{sinceStr ? `Since ${sinceStr}` : "Begin today"}{daysSober >= longest && daysSober > 0 ? <span style={{ color: "var(--r-success)", fontWeight: 600 }}> · longest yet</span> : ""}</span>
                  {nm && <span className="r-tnum">{nm.days - daysSober} to {nm.label}</span>}
                </div>
                <button style={{ ...S.panicBtn, width: "100%", justifyContent: "center", marginTop: 16 }} onClick={() => { setPanicStep(0); setModal("panic"); }}>
                  <i className="ph ph-lifebuoy" style={{ fontSize: 17 }} aria-hidden="true" />I need a moment
                </button>
              </div>

              {/* Prayer sun-arc */}
              <div style={{ marginTop: 16 }}>
                <SunArc prayers={todayPrayers} prayerTargets={routineTargets.prayerTargets} onLog={n => {
                  const already = (todayPrayers?.[n]?.score || 0) > 0;
                  updatePrayer(n, already ? { time: null, missed: false } : { time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`, missed: false });
                }} />
              </div>

              {/* Today's intentions */}
              <div style={{ marginTop: 28 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h2 style={{ fontFamily: HERO_FONT, fontWeight: 500, fontSize: "clamp(1.25rem,1.1rem + 0.6vw,1.5rem)" }}>Today's intentions</h2>
                  <span className="r-tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--r-fg2)" }}>{todayDone}/{todayHabits.length || 0}</span>
                </div>
                {sortedTodayHabits.length === 0 ? (
                  <div style={{ ...S.card }}><div style={S.empty}>No habits scheduled today. <button style={S.linkBtn} onClick={() => setView("habits")}>Add some →</button></div></div>
                ) : (
                  <div style={{ ...S.card, padding: "4px 20px" }}>
                    {sortedTodayHabits.map((h, i) => {
                      const done = h.completions.includes(today);
                      return (
                        <button key={h.id} onClick={() => toggleHabit(h.id)} aria-pressed={done}
                          style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", minHeight: 56, padding: "14px 0", border: "none", borderTop: i ? "1px solid var(--r-bord)" : "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "var(--r-font)" }}>
                          <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, border: done ? "none" : "1.5px solid var(--r-bord)", background: done ? "var(--r-success)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                            {done && <i className="ph-bold ph-check" style={{ fontSize: 13 }} />}
                          </span>
                          <span style={{ flex: 1, fontSize: 16, fontWeight: 500, color: done ? "var(--r-fg3)" : "var(--r-fg)", textDecoration: done ? "line-through" : "none", textDecorationColor: "var(--r-bord)" }}>{h.name}</span>
                          {h.scheduledTimes[0] && <span className="r-tnum" style={{ fontSize: 12, color: "var(--r-fg3)" }}>{fmtTime(h.scheduledTimes[0])}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sleep glance */}
              {todayLog ? (
                <button onClick={() => setView("routine")} style={{ ...S.card, display: "flex", alignItems: "center", gap: 16, width: "100%", marginTop: 16, cursor: "pointer", textAlign: "left", fontFamily: "var(--r-font)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "var(--r-fg3)", fontWeight: 600, marginBottom: 4 }}>Last night's sleep</div>
                    <div style={{ fontFamily: HERO_FONT, fontSize: 26, fontWeight: 480, color: "var(--r-fg)", letterSpacing: "-0.01em" }}>{fmtDur(todayLog.durationMins)}</div>
                    <div className="r-tnum" style={{ fontSize: 12, color: "var(--r-fg3)", marginTop: 3 }}>{fmtTime(todayLog.bedtime)} → {fmtTime(todayLog.waketime)}</div>
                  </div>
                  <CircleRing value={todaySleepScore} size={56} strokeWidth={5} />
                </button>
              ) : (
                <button onClick={() => setModal("sleepLog")} style={{ ...S.card, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginTop: 16, cursor: "pointer", textAlign: "left", fontFamily: "var(--r-font)" }}>
                  <span style={{ fontSize: 15, color: "var(--r-fg2)", fontWeight: 500 }}>Log last night's sleep</span>
                  <i className="ph ph-moon-stars" style={{ fontSize: 22, color: "var(--r-accent)" }} aria-hidden="true" />
                </button>
              )}

              {/* Reflective prompt */}
              <div style={{ ...S.card, marginTop: 16 }}>
                <p style={{ fontFamily: HERO_FONT, fontWeight: 460, fontSize: "clamp(1.0625rem,1rem + 0.3vw,1.1875rem)", lineHeight: 1.4, color: "var(--r-fg)" }}>“What is one thing steadying you today?”</p>
                <button style={{ ...S.secondaryBtn, width: "auto", marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999 }} onClick={() => setView("journal")}>
                  <i className="ph ph-pen-nib" style={{ fontSize: 16 }} aria-hidden="true" />Write a line
                </button>
              </div>

              {availRew.length > 0 && (
                <div style={{ ...S.card, marginTop: 16, borderColor: "#D8C9A6" }}>
                  <div style={{ ...S.cardLabel, display: "flex", alignItems: "center", gap: 8 }}><i className="ph-fill ph-gift" style={{ color: "var(--r-caution)" }} aria-hidden="true" />Rewards unlocked</div>
                  {availRew.map(r => (
                    <div key={r.id} style={S.rewardRow}>
                      <span style={{ fontSize: 14 }}>{r.name} <span style={{ color: "var(--r-fg2)", fontSize: 12 }}>({r.days}d)</span></span>
                      <button style={S.claimBtn} onClick={() => claimReward(r.id)}>Claim</button>
                    </div>
                  ))}
                </div>
              )}

              <p style={{ textAlign: "center", fontSize: 13, color: "var(--r-fg3)", marginTop: 26, fontStyle: "italic", lineHeight: 1.5 }}>{grounding}</p>
            </div>
          );
        })()}

        {/* ════ ROUTINE ════ */}
        {view === "routine" && (
          <div style={S.content}>
            <h2 style={S.pageTitle}>Routine</h2>

            {/* ── Combined Dashboard ── */}
            <div style={S.card}>
              <div style={S.cardLabel}>Today</div>
              <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 12, padding: "6px 0 12px" }}>
                <div style={{ textAlign: "center" }}>
                  <CircleRing value={todaySleepScore ?? 0} size={80} strokeWidth={7} />
                  <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 5 }}>Sleep</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <CircleRing value={todayCombinedScore ?? 0} size={96} strokeWidth={8} />
                  <div style={{ fontSize: 11, color: "var(--r-fg3)", fontWeight: 600, marginTop: 5 }}>Routine</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <CircleRing value={todayPrayerScore ?? 0} size={80} strokeWidth={7} />
                  <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 5 }}>Prayer</div>
                </div>
              </div>
              <div style={{ height: "0.5px", background: "var(--r-bord)", margin: "2px 0 14px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={S.cardLabel}>7-day avg</div>
                  <div style={{ display: "flex", gap: 20, marginTop: 6 }}>
                    <div style={{ textAlign: "center" }}>
                      <CircleRing value={avg7Score ?? 0} size={56} strokeWidth={5} />
                      <div style={{ fontSize: 10, color: "var(--r-fg2)", marginTop: 3 }}>Sleep</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <CircleRing value={avg7PrayerScore ?? 0} size={56} strokeWidth={5} />
                      <div style={{ fontSize: 10, color: "var(--r-fg2)", marginTop: 3 }}>Prayer</div>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Streak</div>
                  <div style={{ fontSize: 34, fontWeight: 700, fontFamily: "var(--r-hero)", lineHeight: 1, color: routineStreak >= 7 ? "var(--r-success)" : routineStreak >= 3 ? "var(--r-caution)" : "var(--r-info)" }}>
                    {routineStreak}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--r-bord)", marginTop: 3 }}>day{routineStreak !== 1 ? "s" : ""} · score &gt; 70</div>
                </div>
              </div>
            </div>

            {/* ── Sub-navigation ── */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {[["sleep", "Sleep"], ["prayer", "Prayer"]].map(([tab, label]) => (
                <button key={tab} onClick={() => setRoutineTab(tab)} aria-pressed={routineTab === tab} style={{ flex: 1, padding: "10px 12px", borderRadius: 999, border: `1px solid ${routineTab === tab ? "var(--r-accent)" : "var(--r-bord)"}`, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--r-font)", background: routineTab === tab ? "var(--r-accent)" : "var(--r-surf)", color: routineTab === tab ? "var(--r-on-accent)" : "var(--r-fg2)" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ══ Sleep tab ══ */}
            {routineTab === "sleep" && (<>
              <div style={S.card}>
                <div style={S.cardLabel}>Sleep score</div>
                <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 16, padding: "8px 0" }}>
                  <div style={{ textAlign: "center" }}>
                    <CircleRing value={todaySleepScore ?? 0} size={88} strokeWidth={8} />
                    <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 6 }}>Today</div>
                    {todaySleepScore === null && <div style={{ fontSize: 10, color: "#2a2a2a", marginTop: 2 }}>not logged</div>}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <CircleRing value={avg7Score ?? 0} size={88} strokeWidth={8} />
                    <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 6 }}>7-day avg</div>
                    {avg7Score === null && <div style={{ fontSize: 10, color: "#2a2a2a", marginTop: 2 }}>no data</div>}
                  </div>
                </div>
              </div>
              <div style={{ ...S.card, borderColor: "rgba(96,165,250,0.18)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={S.cardLabel}>Log sleep</div>
                  {todayLog && !logBed && !logWake && <button style={S.linkBtn} onClick={() => { setLogBed(todayLog.bedtime); setLogWake(todayLog.waketime); }}>Edit</button>}
                </div>
                {todayLog && !logBed && !logWake ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--r-info)", fontFamily: "var(--r-hero)" }}>{fmtDur(todayLog.durationMins)}</div>
                      <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 3 }}>{fmtTime(todayLog.bedtime)} → {fmtTime(todayLog.waketime)}</div>
                    </div>
                    <div style={{ marginLeft: "auto" }}><CircleRing value={todaySleepScore ?? 0} size={52} strokeWidth={5} /></div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={S.formRow}><label style={S.formLabel}>Bedtime</label><input type="time" style={S.input} value={logBed} onChange={e => setLogBed(e.target.value)} /></div>
                      <div style={S.formRow}><label style={S.formLabel}>Wake time</label><input type="time" style={S.input} value={logWake} onChange={e => setLogWake(e.target.value)} /></div>
                    </div>
                    {logBed && logWake && (() => {
                      const dur = sleepDur(logBed, logWake);
                      const score = calcSleepScore(logBed, logWake, dur, routineTargets);
                      const vs = dur - sleepDur(routineTargets.bedtime, routineTargets.waketime);
                      return (
                        <div style={{ background: "var(--r-bord)", borderRadius: 9, padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "0.5px solid #161618" }}>
                          <div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--r-info)", fontFamily: "var(--r-hero)" }}>{fmtDur(dur)}</div>
                            <div style={{ fontSize: 11, color: vs >= 0 ? "var(--r-success)" : "var(--r-danger)", marginTop: 3 }}>{vs >= 0 ? "+" : "−"}{fmtDur(Math.abs(vs))} vs target</div>
                          </div>
                          <CircleRing value={score} size={54} strokeWidth={5} />
                        </div>
                      );
                    })()}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ ...S.primaryBtn, flex: 1 }} onClick={submitSleepLog} disabled={!logBed || !logWake}>Save</button>
                      {todayLog && <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => { setLogBed(""); setLogWake(""); }}>Cancel</button>}
                    </div>
                  </div>
                )}
              </div>
              <div style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={S.cardLabel}>Targets</div>
                  <button style={S.linkBtn} onClick={() => { setRtDraft({ bedtime: routineTargets.bedtime, waketime: routineTargets.waketime }); setEditRt(!editRt); }}>{editRt ? "Cancel" : "Edit"}</button>
                </div>
                {!editRt ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>Bedtime</div><div style={{ ...S.sleepTargetVal, color: accentColor }}>{fmtTime(routineTargets.bedtime)}</div></div>
                    <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>Wake</div><div style={{ ...S.sleepTargetVal, color: accentColor }}>{fmtTime(routineTargets.waketime)}</div></div>
                    <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>Duration</div><div style={{ ...S.sleepTargetVal, color: accentColor }}>{fmtDur(sleepDur(routineTargets.bedtime, routineTargets.waketime))}</div></div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={S.formRow}><label style={S.formLabel}>Target bedtime</label><input type="time" style={S.input} value={rtDraft?.bedtime ?? routineTargets.bedtime} onChange={e => setRtDraft(d => ({ ...d, bedtime: e.target.value }))} /></div>
                    <div style={S.formRow}><label style={S.formLabel}>Target wake time</label><input type="time" style={S.input} value={rtDraft?.waketime ?? routineTargets.waketime} onChange={e => setRtDraft(d => ({ ...d, waketime: e.target.value }))} /></div>
                    <button style={S.primaryBtn} onClick={saveRoutine}>Save targets</button>
                  </div>
                )}
              </div>
              <div style={S.card}><div style={S.cardLabel}>Bedtime — last 14 days</div><LineChart data={bedtimeChartData} height={110} /></div>
              <div style={S.card}><div style={S.cardLabel}>Wake time — last 14 days</div><LineChart data={wakeChartData} height={110} /></div>
              <div style={S.card}><div style={S.cardLabel}>Consistency — last 3 months</div><HeatmapGrid getScore={d => sleepScoreMap[d] ?? null} /></div>
              <div style={S.card}>
                <div style={S.cardLabel}>History</div>
                {sleepLogs.length === 0 ? <div style={S.empty}>No sleep logs yet.</div> : [...sleepLogs].sort((a, b) => b.date.localeCompare(a.date)).map(log => {
                  const s = log.score ?? calcSleepScore(log.bedtime, log.waketime, log.durationMins, routineTargets);
                  const vs = log.durationMins - sleepDur(routineTargets.bedtime, routineTargets.waketime);
                  return (
                    <div key={log.date} style={S.sleepLogRow}>
                      <div style={{ fontSize: 11, color: "var(--r-fg2)", width: 64, flexShrink: 0 }}>{new Date(log.date + "T12:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "#777" }}>{fmtTime(log.bedtime)} → {fmtTime(log.waketime)}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--r-info)", fontFamily: "var(--r-hero)" }}>{fmtDur(log.durationMins)}<span style={{ fontSize: 10, fontWeight: 400, color: vs >= 0 ? "var(--r-success)" : "var(--r-danger)", marginLeft: 5 }}>{vs >= 0 ? "+" : "−"}{fmtDur(Math.abs(vs))}</span></div>
                      </div>
                      <div style={{ flexShrink: 0 }}><CircleRing value={s} size={36} strokeWidth={4} /></div>
                    </div>
                  );
                })}
              </div>
            </>)}

            {/* ══ Prayer tab ══ */}
            {routineTab === "prayer" && (<>
              <div style={S.card}>
                <div style={S.cardLabel}>Prayer score</div>
                <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 16, padding: "8px 0" }}>
                  <div style={{ textAlign: "center" }}>
                    <CircleRing value={todayPrayerScore ?? 0} size={88} strokeWidth={8} />
                    <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 6 }}>Today</div>
                    {todayPrayerScore === null && <div style={{ fontSize: 10, color: "#2a2a2a", marginTop: 2 }}>not logged</div>}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <CircleRing value={avg7PrayerScore ?? 0} size={88} strokeWidth={8} />
                    <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 6 }}>7-day avg</div>
                    {avg7PrayerScore === null && <div style={{ fontSize: 10, color: "#2a2a2a", marginTop: 2 }}>no data</div>}
                  </div>
                </div>
              </div>

              <div style={{ ...S.card, borderColor: "rgba(167,139,250,0.18)" }}>
                <div style={S.cardLabel}>Today's prayers</div>
                {PRAYER_NAMES.map((p, idx) => {
                  const prayer = todayPrayers[p];
                  const target = routineTargets.prayerTargets[p];
                  const statusIcon = prayer?.missed
                    ? <span style={{ color: "var(--r-danger)", fontSize: 15 }}>✗</span>
                    : prayer?.score === 20 ? <span style={{ color: "var(--r-success)", fontSize: 15 }}>✓</span>
                    : prayer?.score === 10 ? <span style={{ color: "var(--r-caution)", fontSize: 15 }}>~</span>
                    : <span style={{ color: "#2a2a2a", fontSize: 15 }}>—</span>;
                  return (
                    <div key={p} style={{ padding: "10px 0", borderBottom: idx < PRAYER_NAMES.length - 1 ? "0.5px solid #111" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                          <span style={{ fontSize: 10, color: "var(--r-fg2)", marginLeft: 8 }}>{fmtTime(target.earliest)} – {fmtTime(target.latest)}</span>
                        </div>
                        {statusIcon}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input type="time" style={{ ...S.input, flex: 1, opacity: prayer?.missed ? 0.3 : 1, pointerEvents: prayer?.missed ? "none" : "auto" }} value={prayer?.time || ""} onChange={e => updatePrayer(p, { time: e.target.value, missed: false })} />
                        <button style={{ ...S.catBtn, borderColor: prayer?.missed ? "var(--r-danger)" : "#2a2a2a", color: prayer?.missed ? "var(--r-danger)" : "var(--r-fg2)", background: prayer?.missed ? "rgba(248,113,113,0.08)" : "transparent", padding: "7px 10px", fontSize: 11, whiteSpace: "nowrap" }} onClick={() => updatePrayer(p, { time: null, missed: !prayer?.missed })}>
                          {prayer?.missed ? "Unmark" : "Missed"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={S.cardLabel}>Prayer targets</div>
                  <button style={S.linkBtn} onClick={() => { setPrayerTargetsDraft({ ...routineTargets.prayerTargets }); setEditPrayerTargets(!editPrayerTargets); }}>{editPrayerTargets ? "Cancel" : "Edit"}</button>
                </div>
                {!editPrayerTargets ? (
                  <div>
                    {PRAYER_NAMES.map((p, idx) => {
                      const t = routineTargets.prayerTargets[p];
                      return <div key={p} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: idx < PRAYER_NAMES.length - 1 ? "0.5px solid #111" : "none" }}>
                        <span style={{ fontSize: 12, color: "var(--r-fg3)" }}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                        <span style={{ fontSize: 12, fontFamily: "var(--r-hero)", color: accentColor }}>{fmtTime(t.earliest)} – {fmtTime(t.latest)}</span>
                      </div>;
                    })}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {PRAYER_NAMES.map(p => (
                      <div key={p}>
                        <div style={{ fontSize: 12, color: "var(--r-fg3)", fontWeight: 600, marginBottom: 7 }}>{p.charAt(0).toUpperCase() + p.slice(1)}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div style={S.formRow}><label style={S.formLabel}>Earliest</label><input type="time" style={S.input} value={prayerTargetsDraft?.[p]?.earliest || ""} onChange={e => setPrayerTargetsDraft(d => ({ ...d, [p]: { ...d[p], earliest: e.target.value } }))} /></div>
                          <div style={S.formRow}><label style={S.formLabel}>Latest</label><input type="time" style={S.input} value={prayerTargetsDraft?.[p]?.latest || ""} onChange={e => setPrayerTargetsDraft(d => ({ ...d, [p]: { ...d[p], latest: e.target.value } }))} /></div>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ ...S.primaryBtn, flex: 1 }} onClick={savePrayerTargets}>Save</button>
                      <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => setEditPrayerTargets(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              <div style={S.card}><div style={S.cardLabel}>Consistency — last 3 months</div><HeatmapGrid getScore={d => prayerScoreMap[d] ?? null} /></div>

              <div style={S.card}>
                <div style={S.cardLabel}>Prayer breakdown — all time</div>
                {prayerLogs.length === 0 ? <div style={S.empty}>No prayer logs yet.</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {PRAYER_NAMES.map(p => {
                      const total = prayerLogs.length;
                      const onTime = prayerLogs.filter(l => l.prayers?.[p]?.score === 20).length;
                      const late = prayerLogs.filter(l => !l.prayers?.[p]?.missed && l.prayers?.[p]?.score === 10).length;
                      const missed = total - onTime - late;
                      return (
                        <div key={p}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontSize: 12 }}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                            <span style={{ fontSize: 10, color: "var(--r-fg2)" }}>{onTime}/{total} on time</span>
                          </div>
                          <div style={{ display: "flex", height: 7, borderRadius: 4, overflow: "hidden", background: "var(--r-bord)" }}>
                            {onTime > 0 && <div style={{ width: `${(onTime / total) * 100}%`, background: "var(--r-accent)" }} />}
                            {late > 0 && <div style={{ width: `${(late / total) * 100}%`, background: "var(--r-caution)" }} />}
                            {missed > 0 && <div style={{ width: `${(missed / total) * 100}%`, background: "var(--r-danger)", opacity: 0.6 }} />}
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ display: "flex", gap: 16, marginTop: 2 }}>
                      {[["var(--r-success)", "On time"], ["var(--r-caution)", "Late"], ["var(--r-danger)", "Missed"]].map(([col, label]) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: col }} />
                          <span style={{ fontSize: 10, color: "var(--r-fg2)" }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={S.card}>
                <div style={S.cardLabel}>History</div>
                {prayerLogs.length === 0 ? <div style={S.empty}>No prayer logs yet.</div> : (
                  [...prayerLogs].sort((a, b) => b.date.localeCompare(a.date)).map(log => {
                    const { total } = calcPrayerScore(log.prayers, routineTargets.prayerTargets);
                    return (
                      <div key={log.date} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid #111" }}>
                        <div style={{ fontSize: 11, color: "var(--r-fg2)", width: 70, flexShrink: 0 }}>{new Date(log.date + "T12:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</div>
                        <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
                          {PRAYER_NAMES.map(p => {
                            const prayer = log.prayers?.[p];
                            const col = !prayer ? "var(--r-bord)" : prayer.missed ? "var(--r-danger)" : prayer.score === 20 ? "var(--r-success)" : "var(--r-caution)";
                            return <div key={p} title={p.charAt(0).toUpperCase() + p.slice(1)} style={{ width: 9, height: 9, borderRadius: "50%", background: col }} />;
                          })}
                        </div>
                        <div style={{ flexShrink: 0 }}><CircleRing value={total} size={32} strokeWidth={3} /></div>
                      </div>
                    );
                  })
                )}
              </div>
            </>)}
          </div>
        )}

        {/* ════ HABITS ════ */}
        {view === "habits" && (
          <div style={S.content}>
            <h2 style={S.pageTitle}>Habits</h2>
            {/* Tab toggle */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {[["good", `Good Habits (${todayDone}/${todayHabits.length})`], ["break", `Breaking (${badHabits.length})`]].map(([t, label]) => (
                <button key={t} onClick={() => setHabitsTab(t)} style={{ flex: 1, padding: "8px 4px", borderRadius: 7, border: "none", borderBottom: `2px solid ${habitsTab === t ? accentColor : "transparent"}`, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--r-font)", background: habitsTab === t ? accentColor + "18" : "var(--r-surf)", color: habitsTab === t ? accentColor : "var(--r-fg2)" }}>{label}</button>
              ))}
            </div>

            {habitsTab === "good" && (<>
              <div style={S.card}>
                <div style={S.cardLabel}>Today — {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{todayDone} / {todayHabits.length} done today</div>
                <div style={S.bigProgressBg}><div style={{ ...S.bigProgressBar, width: `${habitPct}%`, background: `linear-gradient(90deg,${accentColor},#60a5fa)` }} /></div>
              </div>
              {normalizedHabits.length === 0 ? (
                <div style={S.card}><div style={S.empty}>No habits yet. Add one below.</div></div>
              ) : normalizedHabits.map(h => {
                const col = CAT_HEX[h.category] || "#5B4A6A";
                const weekCount = getWeekCompletions(h.completions, weekStartStr);
                const lvlCfg = h.levelsEnabled ? h.levels.find(l => l.level === h.currentLevel) : null;
                return (
                  <div key={h.id} style={{ ...S.card, borderLeft: `3px solid ${col}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{h.name}</span>
                          {h.levelsEnabled && <span style={{ fontSize: 10, color: "#5B4A6A", background: "rgba(167,139,250,0.12)", border: "0.5px solid rgba(167,139,250,0.3)", padding: "1px 7px", borderRadius: 10 }}>Lv.{h.currentLevel}</span>}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: col, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h.category}</span>
                          {h.days.length > 0 && <span style={{ fontSize: 10, color: "var(--r-fg2)" }}>{h.days.join(" · ")}</span>}
                          {h.days.length === 0 && <span style={{ fontSize: 10, color: "#3a3a3a" }}>every day</span>}
                          {h.scheduledTimes.length > 0 && <span style={{ fontSize: 10, color: "var(--r-fg2)", fontFamily: "var(--r-hero)" }}>{h.scheduledTimes.map(fmtTime).join(", ")}</span>}
                        </div>
                        {h.levelsEnabled && lvlCfg && (
                          <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 5 }}>
                            {lvlCfg.description && <span style={{ marginRight: 8 }}>{lvlCfg.description}</span>}
                            {lvlCfg.upPerWeek != null && (
                              <span style={{ color: weekCount >= lvlCfg.upPerWeek ? "var(--r-success)" : lvlCfg.downPerWeek != null && weekCount < lvlCfg.downPerWeek ? "var(--r-danger)" : "var(--r-info)" }}>
                                {weekCount}/{lvlCfg.upPerWeek} this week
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 10 }}>
                        <button style={S.linkBtn} onClick={() => openEditHabit(h)}>Edit</button>
                        <button style={S.deleteBtn} onClick={() => upd({ habits: habits.filter(x => x.id !== h.id) })}>×</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button style={{ ...S.primaryBtn, marginTop: 4 }} onClick={openAddHabit}>+ Add habit</button>
            </>)}

            {habitsTab === "break" && (<>
              {badHabits.length === 0 ? (
                <div style={S.card}><div style={S.empty}>No bad habits tracked yet. Add one below.</div></div>
              ) : badHabits.map(bh => {
                const streak = calcAvoidStreak(bh);
                const col = avoidStreakColor(bh);
                const todayStr = getTodayStr();
                const resistedToday = (bh.resisted || []).filter(r => new Date(r.ts).toISOString().split("T")[0] === todayStr).length;
                return (
                  <div key={bh.id} style={{ ...S.card, borderLeft: `3px solid ${col}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{bh.name}</span>
                          <span style={{ fontSize: 12, color: col, fontWeight: 700 }}>{streak.value}{streak.label}</span>
                        </div>
                        {(bh.trigger || bh.replacement) && (
                          <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 5 }}>
                            {bh.trigger && <span>Trigger: <span style={{ color: "var(--r-fg3)" }}>{bh.trigger}</span></span>}
                            {bh.trigger && bh.replacement && <span style={{ color: "var(--r-bord)", margin: "0 6px" }}>→</span>}
                            {bh.replacement && <span>Replace: <span style={{ color: "var(--r-fg3)" }}>{bh.replacement}</span></span>}
                          </div>
                        )}
                        {bh.ifThen && (
                          <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 3, fontStyle: "italic" }}>"{bh.ifThen}"</div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <button style={{ ...S.primaryBtn, width: "auto", padding: "6px 12px", fontSize: 11, background: "#234C5E22", color: "var(--r-success)", border: "1px solid #234C5E44" }}
                            onClick={() => upd({ badHabits: badHabits.map(x => x.id !== bh.id ? x : { ...x, resisted: [...(x.resisted || []), { id: "r" + Date.now(), ts: Date.now() }] }) })}>
                            Resisted{resistedToday > 0 ? ` (${resistedToday})` : ""}
                          </button>
                          <button style={{ ...S.primaryBtn, width: "auto", padding: "6px 12px", fontSize: 11, background: "#8C3F3018", color: "var(--r-danger)", border: "1px solid #8C3F3033" }}
                            onClick={() => { setSlipModal(bh.id); setSlipNote(""); }}>
                            I slipped
                          </button>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 10 }}>
                        <button style={S.linkBtn} onClick={() => { setBadHabitEditId(bh.id); setBadHabitDraft({ ...bh }); setBadHabitModal("edit"); }}>Edit</button>
                        <button style={S.deleteBtn} onClick={() => upd({ badHabits: badHabits.filter(x => x.id !== bh.id) })}>×</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button style={{ ...S.primaryBtn, marginTop: 4 }} onClick={() => { setBadHabitDraft({ name: "", unit: "days", trigger: "", replacement: "", ifThen: "" }); setBadHabitEditId(null); setBadHabitModal("add"); }}>+ Add bad habit</button>
            </>)}
          </div>
        )}

        {/* ════ SCHEDULE ════ */}
        {view === "schedule" && (() => {
          const today = getTodayStr();
          const schedDate = scheduleViewDate || today;
          const schedDayName = DAY_NAMES[new Date(schedDate + "T12:00").getDay()];
          const isToday = schedDate === today;
          const weekDates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStartStr + "T12:00"); d.setDate(d.getDate() + i);
            return d.toISOString().split("T")[0];
          });
          const viewHabits = normalizedHabits
            .filter(h => h.days.length === 0 || h.days.includes(schedDayName))
            .sort((a, b) => { const ta = a.scheduledTimes[0] || null, tb = b.scheduledTimes[0] || null; if (!ta && !tb) return 0; if (!ta) return 1; if (!tb) return -1; return ta.localeCompare(tb); });
          const viewActivities = scheduleActivities
            .filter(a => a.type === "oneTime" ? a.date === schedDate : (a.days.length === 0 || a.days.includes(schedDayName)))
            .sort((a, b) => { const ta = a.times?.[0] || a.time || null, tb = b.times?.[0] || b.time || null; if (!ta && !tb) return 0; if (!ta) return 1; if (!tb) return -1; return ta.localeCompare(tb); });
          const viewMeds = medications.filter(m => m.time && (!m.days?.length || m.days.includes(schedDayName)));
          const allItems = [
            ...viewHabits.map(h => ({ _type: "habit", id: h.id, name: h.name, time: h.scheduledTimes[0] || null, col: CAT_HEX[h.category] || "#5B4A6A", data: h })),
            ...viewActivities.map(a => ({ _type: "activity", id: a.id, name: a.name, time: a.times?.[0] || a.time || null, col: "var(--r-info)", data: a })),
            ...viewMeds.map(m => ({ _type: "med", id: m.id, name: m.name + (m.notes ? ` — ${m.notes}` : ""), time: m.time, col: "#3A6B63", data: m })),
          ].sort((a, b) => { if (!a.time && !b.time) return 0; if (!a.time) return 1; if (!b.time) return -1; return a.time.localeCompare(b.time); });
          const schedComps = scheduleCompletions[schedDate] || {};
          const medComps = medicationLogs[schedDate] || [];
          function isDone(item) {
            if (item._type === "habit") return item.data.completions.includes(schedDate);
            if (item._type === "activity") return schedComps[item.id] || false;
            if (item._type === "med") return medComps.includes(item.id);
            return false;
          }
          function toggleItem(item) {
            if (item._type === "habit") toggleHabit(item.id);
            else if (item._type === "activity") toggleSchedActivity(item.id);
            else if (item._type === "med") toggleMedication(item.id, schedDate);
          }
          const doneItems = allItems.filter(item => isDone(item)).length;
          const pct = allItems.length ? Math.round(doneItems / allItems.length * 100) : 0;
          return (
            <div style={S.content}>
              <h2 style={S.pageTitle}>Schedule</h2>
              {/* Day picker */}
              <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
                {weekDates.map(date => {
                  const d = new Date(date + "T12:00");
                  const isActive = date === schedDate;
                  const isT = date === today;
                  return (
                    <button key={date} onClick={() => setScheduleViewDate(date)} style={{ flex: 1, minWidth: 36, padding: "6px 2px", borderRadius: 7, border: `1px solid ${isActive ? accentColor : "var(--r-bord)"}`, fontSize: 11, fontWeight: isT ? 700 : 400, cursor: "pointer", fontFamily: "var(--r-font)", background: isActive ? accentColor + "18" : "transparent", color: isActive ? accentColor : isT ? "var(--r-fg3)" : "var(--r-fg2)", textAlign: "center" }}>
                      <div style={{ fontSize: 9, marginBottom: 1 }}>{DAY_NAMES[d.getDay()].slice(0, 1)}</div>
                      <div>{d.getDate()}</div>
                    </button>
                  );
                })}
              </div>
              {/* Summary */}
              <div style={S.card}>
                <div style={S.cardLabel}>{new Date(schedDate + "T12:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{doneItems} / {allItems.length} done</div>
                <div style={S.bigProgressBg}><div style={{ ...S.bigProgressBar, width: `${pct}%`, background: `linear-gradient(90deg,${accentColor},#60a5fa)` }} /></div>
              </div>
              {/* Unified item list */}
              {allItems.length === 0 ? (
                <div style={S.card}><div style={S.empty}>Nothing scheduled for {schedDayName}. <button style={S.linkBtn} onClick={() => setView("habits")}>Add habits →</button></div></div>
              ) : (
                <div style={S.card}>
                  {allItems.map(item => {
                    const done = isDone(item);
                    const h = item._type === "habit" ? item.data : null;
                    const weekCount = h ? getWeekCompletions(h.completions, weekStartStr) : 0;
                    const lvlCfg = h?.levelsEnabled ? h.levels.find(l => l.level === h.currentLevel) : null;
                    const upReady = lvlCfg?.upPerWeek != null && weekCount >= lvlCfg.upPerWeek;
                    const downRisk = lvlCfg?.downPerWeek != null && weekCount < lvlCfg.downPerWeek;
                    return (
                      <div key={item._type + item.id} style={{ ...S.scheduleRow, borderLeftColor: item.col, opacity: done ? 0.45 : 1 }}>
                        <div style={{ width: 54, flexShrink: 0, textAlign: "right", paddingRight: 10 }}>
                          {item.time ? <span style={{ fontSize: 11, color: done ? "var(--r-fg2)" : item.col, fontFamily: "var(--r-hero)", fontWeight: 600 }}>{fmtTime(item.time)}</span> : <span style={{ fontSize: 10, color: "var(--r-bord)" }}>—</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 500, textDecoration: done ? "line-through" : "none" }}>{item.name}</span>
                            {h?.levelsEnabled && <span style={{ fontSize: 9, color: "#5B4A6A", background: "rgba(167,139,250,0.12)", padding: "1px 5px", borderRadius: 8 }}>Lv.{h.currentLevel}</span>}
                            {item._type === "med" && <span style={{ fontSize: 9, color: "#3A6B63", background: "rgba(45,212,191,0.1)", padding: "1px 5px", borderRadius: 8 }}>med</span>}
                          </div>
                          {h?.levelsEnabled && lvlCfg && (
                            <div style={{ fontSize: 10, marginTop: 2, color: upReady ? "var(--r-success)" : downRisk ? "var(--r-danger)" : "var(--r-fg2)" }}>
                              {weekCount}/{lvlCfg.upPerWeek ?? "?"} this week{upReady && " · ready to level up!"}{downRisk && " · at risk of drop"}
                            </div>
                          )}
                          {item._type === "activity" && <div style={{ fontSize: 10, color: "var(--r-fg2)", marginTop: 1 }}>{item.data.type === "oneTime" ? "one-time" : !item.data.days?.length ? "daily" : item.data.days.join(" · ")}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button style={{ ...S.checkBtn, background: done ? "var(--r-success)" : "transparent", borderColor: done ? "var(--r-success)" : isToday ? "var(--r-bord)" : "var(--r-surf2)", cursor: isToday ? "pointer" : "default", opacity: isToday ? 1 : 0.35 }} onClick={() => isToday && toggleItem(item)}>{done ? "✓" : ""}</button>
                          {item._type === "activity" && <button style={S.deleteBtn} onClick={() => deleteSchedActivity(item.id)}>×</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button style={{ ...S.linkBtn, marginBottom: 10 }} onClick={() => { setSchedActDraft({ name: "", type: "recurring", days: [], times: [], date: getTodayStr(), time: "" }); setSchedActModal(true); }}>+ Add custom activity</button>
              {scheduleActivities.length > 0 && (
                <div style={S.card}>
                  <div style={S.cardLabel}>All activities</div>
                  {scheduleActivities.map(act => (
                    <div key={act.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "0.5px solid #111" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>{act.name}</div>
                        <div style={{ fontSize: 10, color: "var(--r-fg2)", marginTop: 1 }}>{act.type === "oneTime" ? `one-time · ${act.date}` : !act.days?.length ? "daily" : act.days.join(" · ")}{(act.times?.[0] || act.time) && ` · ${fmtTime(act.times?.[0] || act.time)}`}</div>
                      </div>
                      <button style={S.deleteBtn} onClick={() => deleteSchedActivity(act.id)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ════ HEALTH & BODY ════ */}
        {view === "health" && (() => {
          const today = getTodayStr();
          const todayMedLogs = medicationLogs[today] || [];
          const waterPct = waterConfig.dailyTarget ? Math.min(100, Math.round(todayWater / waterConfig.dailyTarget * 100)) : 0;
          const last30Weight = (() => {
            const d = [];
            for (let i = 29; i >= 0; i--) {
              const date = new Date(); date.setDate(date.getDate() - i);
              const ds = date.toISOString().split("T")[0];
              const m = bodyMetrics.find(x => x.date === ds);
              d.push({ actual: m ? m.weight : null, label: i % 7 === 0 ? new Date(ds + "T12:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "" });
            }
            return d;
          })();
          const weekExSessions = (() => {
            const end = new Date(weekStartStr + "T12:00"); end.setDate(end.getDate() + 6);
            const endStr = end.toISOString().split("T")[0];
            return exerciseLogs.filter(e => e.date >= weekStartStr && e.date <= endStr).length;
          })();
          return (
            <div style={S.content}>
              <h2 style={S.pageTitle}>Health &amp; Body</h2>
              <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                {[["water","Water"],["meds","Meds"],["exercise","Exercise"],["body","Body"]].map(([t, label]) => (
                  <button key={t} onClick={() => setHealthTab(t)} style={{ flex: 1, padding: "8px 4px", borderRadius: 7, border: "none", borderBottom: `2px solid ${healthTab === t ? "#3A6B63" : "transparent"}`, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--r-font)", background: healthTab === t ? "rgba(45,212,191,0.08)" : "var(--r-surf)", color: healthTab === t ? "#3A6B63" : "var(--r-fg2)" }}>{label}</button>
                ))}
              </div>

              {/* ── Water tab ── */}
              {healthTab === "water" && (<>
                <div style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={S.cardLabel}>Today's intake</div>
                    <button style={S.linkBtn} onClick={() => { if (editWaterConfig) { setEditWaterConfig(false); } else { setWaterConfigDraft({ ...waterConfig }); setEditWaterConfig(true); } }}>{editWaterConfig ? "Done" : "Settings"}</button>
                  </div>
                  {editWaterConfig ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={S.formRow}><label style={S.formLabel}>Glass size (ml)</label><input type="number" min="50" max="2000" style={S.input} value={waterConfigDraft?.glassSize || 250} onChange={e => setWaterConfigDraft(d => ({ ...d, glassSize: Number(e.target.value) }))} /></div>
                      <div style={S.formRow}><label style={S.formLabel}>Daily target (glasses)</label><input type="number" min="1" max="30" style={S.input} value={waterConfigDraft?.dailyTarget || 8} onChange={e => setWaterConfigDraft(d => ({ ...d, dailyTarget: Number(e.target.value) }))} /></div>
                      <button style={S.primaryBtn} onClick={saveWaterConfig}>Save settings</button>
                    </div>
                  ) : (<>
                    <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
                      <CircleRing value={waterPct} size={88} strokeWidth={8} />
                      <div>
                        <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--r-hero)", color: "#3A6B63", lineHeight: 1 }}>{todayWater}<span style={{ fontSize: 14, color: "var(--r-fg2)", marginLeft: 4 }}>/ {waterConfig.dailyTarget}</span></div>
                        <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 4 }}>{waterConfig.glassSize}ml · {Math.round(todayWater * waterConfig.glassSize)}ml today</div>
                        <div style={{ fontSize: 11, color: waterStreak > 0 ? "var(--r-success)" : "var(--r-fg3)", marginTop: 3 }}>{waterStreak > 0 ? `${waterStreak} day streak` : "Start your streak"}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ flex: 3, padding: "12px", borderRadius: 8, border: "1.5px solid #2dd4bf", background: "rgba(45,212,191,0.08)", color: "#3A6B63", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "var(--r-font)" }} onClick={() => logWater(1)}>+ glass</button>
                      <button style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1px solid #222", background: "transparent", color: "var(--r-fg2)", fontSize: 14, cursor: "pointer", fontFamily: "var(--r-font)" }} onClick={() => logWater(-1)}>−</button>
                    </div>
                  </>)}
                </div>
                <div style={S.card}>
                  <div style={S.cardLabel}>Last 7 days</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 68, paddingTop: 4 }}>
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(12,0,0,0);
                      const ds = d.toISOString().split("T")[0];
                      const count = waterLogs[ds] || 0;
                      const pct2 = waterConfig.dailyTarget ? Math.min(1, count / waterConfig.dailyTarget) : 0;
                      return (
                        <div key={ds} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ width: "100%", height: Math.max(3, Math.round(pct2 * 44)), background: pct2 >= 1 ? "#3A6B63" : pct2 > 0 ? "#2dd4bf55" : "var(--r-bord)", borderRadius: 3, marginTop: "auto" }} />
                          <div style={{ fontSize: 9, color: ds === today ? "#3A6B63" : "var(--r-bord)" }}>{DAY_NAMES[d.getDay()].slice(0,1)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>)}

              {/* ── Meds tab ── */}
              {healthTab === "meds" && (<>
                <div style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={S.cardLabel}>Today — {new Date().toLocaleDateString("en-AU", { weekday: "long" })}</div>
                    <button style={S.linkBtn} onClick={() => { setMedDraft({ name: "", time: "", days: [], notes: "" }); setEditMedId(null); }}>+ Add</button>
                  </div>
                  {medications.length === 0 ? <div style={S.empty}>No medications added yet.</div> : medications.filter(m => !m.days?.length || m.days.includes(todayDay)).map(med => {
                    const done = todayMedLogs.includes(med.id);
                    return (
                      <div key={med.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "0.5px solid #111" }}>
                        <button style={{ ...S.checkBtn, background: done ? "var(--r-success)" : "transparent", borderColor: done ? "#3A6B63" : "var(--r-bord)", flexShrink: 0 }} onClick={() => toggleMedication(med.id, today)}>{done ? "✓" : ""}</button>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, textDecoration: done ? "line-through" : "none", opacity: done ? 0.5 : 1 }}>{med.name}</div>
                          <div style={{ fontSize: 10, color: "var(--r-fg2)", marginTop: 1 }}>{med.time && <span style={{ marginRight: 8, fontFamily: "var(--r-hero)" }}>{fmtTime(med.time)}</span>}{med.notes}</div>
                        </div>
                        <button style={{ ...S.linkBtn, fontSize: 11 }} onClick={() => { setMedDraft({ name: med.name, time: med.time || "", days: med.days || [], notes: med.notes || "" }); setEditMedId(med.id); }}>Edit</button>
                        <button style={S.deleteBtn} onClick={() => upd({ medications: medications.filter(m => m.id !== med.id) })}>×</button>
                      </div>
                    );
                  })}
                </div>
                {medDraft && (
                  <div style={{ ...S.card, borderColor: "rgba(45,212,191,0.3)" }}>
                    <div style={{ fontSize: 12, color: "#3A6B63", fontWeight: 600, marginBottom: 12 }}>{editMedId ? "Edit" : "Add"} medication</div>
                    <input style={S.input} placeholder="Name (e.g. Vitamin D, 500mg Metformin…)" value={medDraft.name} onChange={e => setMedDraft(d => ({ ...d, name: e.target.value }))} autoFocus />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                      <div style={S.formRow}><label style={S.formLabel}>Time (optional)</label><input type="time" style={S.input} value={medDraft.time || ""} onChange={e => setMedDraft(d => ({ ...d, time: e.target.value }))} /></div>
                      <div style={S.formRow}><label style={S.formLabel}>Notes (dosage etc.)</label><input style={S.input} placeholder="e.g. 500mg with food" value={medDraft.notes || ""} onChange={e => setMedDraft(d => ({ ...d, notes: e.target.value }))} /></div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ ...S.formLabel, marginBottom: 6 }}>Days (blank = every day)</div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {DAY_NAMES.map(day => <button key={day} style={{ ...S.catBtn, borderColor: medDraft.days.includes(day) ? "#3A6B63" : "var(--r-bord)", color: medDraft.days.includes(day) ? "#3A6B63" : "var(--r-fg2)", background: medDraft.days.includes(day) ? "rgba(45,212,191,0.1)" : "transparent" }} onClick={() => setMedDraft(d => ({ ...d, days: d.days.includes(day) ? d.days.filter(x => x !== day) : [...d.days, day] }))}>{day}</button>)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button style={{ ...S.primaryBtn, flex: 1, background: "#3A6B63", color: "#fff" }} onClick={saveMedication}>Save</button>
                      <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => { setMedDraft(null); setEditMedId(null); }}>Cancel</button>
                    </div>
                  </div>
                )}
                {medications.length > 0 && (
                  <div style={S.card}>
                    <div style={S.cardLabel}>7-day adherence</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr><td style={{ fontSize: 10, color: "var(--r-bord)", padding: "3px 6px 6px 0", width: 90 }} />{Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return <td key={i} style={{ fontSize: 9, color: "var(--r-fg2)", textAlign: "center", padding: "3px 4px" }}>{DAY_NAMES[d.getDay()].slice(0,1)}</td>; })}</tr></thead>
                        <tbody>{medications.map(med => <tr key={med.id}><td style={{ fontSize: 11, color: "var(--r-fg2)", padding: "4px 6px 4px 0", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{med.name}</td>{Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(12,0,0,0); const ds = d.toISOString().split("T")[0]; const taken = (medicationLogs[ds] || []).includes(med.id); const isT = ds === today; return <td key={i} style={{ textAlign: "center", padding: "4px" }}><div style={{ width: 14, height: 14, borderRadius: "50%", background: taken ? "#3A6B63" : "var(--r-bord)", border: `1px solid ${isT ? "#2dd4bf44" : "transparent"}`, margin: "0 auto", cursor: isT ? "pointer" : "default" }} onClick={() => isT && toggleMedication(med.id, today)} /></td>; })}</tr>)}</tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>)}

              {/* ── Exercise tab ── */}
              {healthTab === "exercise" && (<>
                <div style={S.card}>
                  <div style={S.cardLabel}>This week</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>Volume</div><div style={{ ...S.sleepTargetVal, color: "var(--r-success)" }}>{fmtDur(thisWeekExerciseMins)}</div></div>
                    <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>Sessions</div><div style={{ ...S.sleepTargetVal, color: "var(--r-success)" }}>{weekExSessions}</div></div>
                  </div>
                </div>
                {exerciseDraft ? (
                  <div style={{ ...S.card, borderColor: "rgba(52,211,153,0.3)" }}>
                    <div style={{ fontSize: 12, color: "var(--r-success)", fontWeight: 600, marginBottom: 12 }}>Log exercise</div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ ...S.formLabel, marginBottom: 6 }}>Category</div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {EXERCISE_CATS.map(cat => <button key={cat} style={{ ...S.catBtn, borderColor: exerciseDraft.category === cat ? EXERCISE_CAT_HEX[cat] : "var(--r-bord)", color: exerciseDraft.category === cat ? EXERCISE_CAT_HEX[cat] : "var(--r-fg2)", background: exerciseDraft.category === cat ? EXERCISE_CAT_HEX[cat] + "18" : "transparent" }} onClick={() => setExerciseDraft(d => ({ ...d, category: cat }))}>{cat}</button>)}
                      </div>
                    </div>
                    <input style={S.input} placeholder="Type (e.g. running, bench press, yoga…)" value={exerciseDraft.type || ""} onChange={e => setExerciseDraft(d => ({ ...d, type: e.target.value }))} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                      <div style={S.formRow}><label style={S.formLabel}>Duration (min)</label><input type="number" min="1" style={S.input} value={exerciseDraft.durationMins || ""} onChange={e => setExerciseDraft(d => ({ ...d, durationMins: e.target.value }))} /></div>
                      <div style={S.formRow}><label style={S.formLabel}>Date</label><input type="date" style={S.input} max={today} value={exerciseDraft.date || today} onChange={e => setExerciseDraft(d => ({ ...d, date: e.target.value }))} /></div>
                    </div>
                    <div style={{ marginTop: 10, ...S.formRow }}><label style={S.formLabel}>Notes (optional)</label><input style={S.input} placeholder="e.g. 3×10 at 80kg, felt strong…" value={exerciseDraft.notes || ""} onChange={e => setExerciseDraft(d => ({ ...d, notes: e.target.value }))} /></div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button style={{ ...S.primaryBtn, flex: 1 }} onClick={addExerciseLog}>Log</button>
                      <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => setExerciseDraft(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button style={{ ...S.primaryBtn, background: "transparent", border: "1px dashed #234C5E55", color: "var(--r-success)", marginBottom: 10 }} onClick={() => setExerciseDraft({ type: "", category: "cardio", durationMins: "", date: today, notes: "" })}>+ Log exercise</button>
                )}
                <div style={S.card}>
                  <div style={S.cardLabel}>History</div>
                  {exerciseLogs.length === 0 ? <div style={S.empty}>No exercise logged yet.</div> : [...exerciseLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50).map(entry => {
                    const col = EXERCISE_CAT_HEX[entry.category] || "var(--r-success)";
                    return (
                      <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "0.5px solid #111" }}>
                        <div style={{ width: 4, alignSelf: "stretch", background: col, borderRadius: 2, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13 }}>{entry.type}</div>
                          <div style={{ fontSize: 10, color: "var(--r-fg2)", marginTop: 1 }}>{entry.category} · {fmtDur(entry.durationMins)}{entry.notes && ` · ${entry.notes}`}</div>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--r-fg2)" }}>{new Date(entry.date + "T12:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</div>
                        <button style={S.deleteBtn} onClick={() => upd({ exerciseLogs: exerciseLogs.filter(x => x.id !== entry.id) })}>×</button>
                      </div>
                    );
                  })}
                </div>
              </>)}

              {/* ── Body tab ── */}
              {healthTab === "body" && (<>
                {latestMetric && (
                  <div style={S.card}>
                    <div style={S.cardLabel}>Current weight</div>
                    <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "var(--r-hero)", color: accentColor, lineHeight: 1 }}>{latestMetric.weight}<span style={{ fontSize: 14, color: "var(--r-fg2)", marginLeft: 5 }}>{latestMetric.unit}</span></div>
                    <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 4 }}>Logged {new Date(latestMetric.date + "T12:00").toLocaleDateString("en-AU", { day: "numeric", month: "long" })}</div>
                  </div>
                )}
                {bodyMetrics.length >= 2 && (
                  <div style={S.card}><div style={S.cardLabel}>Trend — last 30 days</div><LineChart data={last30Weight} height={110} /></div>
                )}
                {metricDraft ? (
                  <div style={{ ...S.card, borderColor: accentColor + "44" }}>
                    <div style={{ fontSize: 12, color: accentColor, fontWeight: 600, marginBottom: 12 }}>Log weight</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={S.formRow}><label style={S.formLabel}>Weight</label><input type="number" step="0.1" min="0" style={S.input} placeholder="e.g. 75.5" value={metricDraft.weight || ""} onChange={e => setMetricDraft(d => ({ ...d, weight: e.target.value }))} autoFocus /></div>
                      <div style={S.formRow}><label style={S.formLabel}>Unit</label><div style={{ display: "flex", gap: 5, marginTop: 2 }}>{["kg","lbs"].map(u => <button key={u} style={{ ...S.catBtn, flex: 1, borderColor: metricDraft.unit === u ? accentColor : "var(--r-bord)", color: metricDraft.unit === u ? accentColor : "var(--r-fg2)", background: metricDraft.unit === u ? accentColor + "18" : "transparent" }} onClick={() => setMetricDraft(d => ({ ...d, unit: u }))}>{u}</button>)}</div></div>
                    </div>
                    <div style={{ marginTop: 10, ...S.formRow }}><label style={S.formLabel}>Date</label><input type="date" style={S.input} max={today} value={metricDraft.date || today} onChange={e => setMetricDraft(d => ({ ...d, date: e.target.value }))} /></div>
                    <div style={{ marginTop: 10, ...S.formRow }}><label style={S.formLabel}>Notes (optional)</label><input style={S.input} placeholder="e.g. morning, after gym…" value={metricDraft.notes || ""} onChange={e => setMetricDraft(d => ({ ...d, notes: e.target.value }))} /></div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button style={{ ...S.primaryBtn, flex: 1 }} onClick={addBodyMetric}>Save</button>
                      <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => setMetricDraft(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button style={{ ...S.primaryBtn, background: "transparent", border: `1px dashed ${accentColor}55`, color: accentColor, marginBottom: 10 }} onClick={() => setMetricDraft({ weight: "", unit: "kg", date: today, notes: "" })}>+ Log weight</button>
                )}
                {bodyMetrics.length > 0 && (
                  <div style={S.card}>
                    <div style={S.cardLabel}>History</div>
                    {[...bodyMetrics].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50).map((entry, i, arr) => {
                      const prev = arr[i + 1];
                      const delta = prev && prev.unit === entry.unit ? entry.weight - prev.weight : null;
                      return (
                        <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid #111" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--r-hero)" }}>{entry.weight} {entry.unit}</div>
                            {entry.notes && <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 1 }}>{entry.notes}</div>}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: "var(--r-fg2)" }}>{new Date(entry.date + "T12:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</div>
                            {delta !== null && <div style={{ fontSize: 10, color: delta < 0 ? "var(--r-success)" : delta > 0 ? "var(--r-danger)" : "var(--r-fg2)", marginTop: 1 }}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}</div>}
                          </div>
                          <button style={S.deleteBtn} onClick={() => upd({ bodyMetrics: bodyMetrics.filter(x => x.id !== entry.id) })}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>)}
            </div>
          );
        })()}

        {/* ════ GOALS & ACCOUNTABILITY ════ */}
        {view === "goals" && (() => {
          const priColors = { high: "var(--r-danger)", med: "var(--r-caution)", low: "var(--r-success)" };
          const thisWeekStr = getWeekStr();
          const contract = accountability.contract;
          const thisWeekReview = (accountability.weeklyReviews || []).find(r => r.weekStr === thisWeekStr);
          const todayGratitude = (accountability.gratitude || []).find(g => g.date === getTodayStr());
          const normGoals = normalizedGoals;
          const parentPeriodIdx = PERIOD_ORDER.indexOf(goalsPeriod) - 1;
          const parentCandidates = parentPeriodIdx >= 0 ? normGoals.filter(g => g.period === PERIOD_ORDER[parentPeriodIdx] && !g.archived) : [];
          const filteredGoals = normGoals.filter(g => !g.archived && g.period === goalsPeriod && (goalsAreaFilter === "" || g.lifeArea === goalsAreaFilter));
          return (
            <div style={S.content}>
              <h2 style={S.pageTitle}>Goals &amp; Accountability</h2>

              {/* My Why — always visible when set */}
              {vision.myWhy && (
                <div style={{ ...S.card, borderColor: accentColor + "33", background: accentColor + "08", marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: accentColor, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>My Why</div>
                  <div style={{ fontSize: 13, fontStyle: "italic", color: "#ddd", lineHeight: 1.65 }}>"{vision.myWhy}"</div>
                </div>
              )}

              {/* Sub-tab nav */}
              <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                {[["vision","Vision"],["goals","Goals"],["streaks","Streaks"],["accountability","Accountability"]].map(([t, label]) => (
                  <button key={t} onClick={() => setGoalsTab(t)} style={{ flex: 1, padding: "8px 4px", borderRadius: 7, border: "none", borderBottom: `2px solid ${goalsTab === t ? accentColor : "transparent"}`, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--r-font)", background: goalsTab === t ? accentColor + "18" : "var(--r-surf)", color: goalsTab === t ? accentColor : "var(--r-fg2)", whiteSpace: "nowrap" }}>{label}</button>
                ))}
              </div>

              {/* ── Vision tab ── */}
              {goalsTab === "vision" && (<>
                {/* My Why */}
                <div style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={S.cardLabel}>My Why</div>
                    <button style={S.linkBtn} onClick={() => { if (editingVision === "why") { setEditingVision(null); } else { setVisionDraft({ myWhy: vision.myWhy }); setEditingVision("why"); } }}>{editingVision === "why" ? "Cancel" : "Edit"}</button>
                  </div>
                  {editingVision === "why" ? (
                    <>
                      <textarea style={S.textarea} placeholder="Why are you doing all this? Your core reason." rows={3} value={visionDraft?.myWhy || ""} onChange={e => setVisionDraft(d => ({ ...d, myWhy: e.target.value }))} autoFocus />
                      <button style={{ ...S.primaryBtn, marginTop: 8 }} onClick={() => { upd({ vision: { ...vision, myWhy: visionDraft.myWhy } }); setEditingVision(null); }}>Save</button>
                    </>
                  ) : vision.myWhy ? (
                    <p style={{ fontSize: 14, fontStyle: "italic", color: "#ddd", lineHeight: 1.65, margin: 0 }}>"{vision.myWhy}"</p>
                  ) : (
                    <div style={S.empty}>Set your core reason. What is driving all of this?</div>
                  )}
                </div>

                {/* Life Vision */}
                <div style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={S.cardLabel}>Life vision — 1–3 years</div>
                    <button style={S.linkBtn} onClick={() => { if (editingVision === "vision") { setEditingVision(null); } else { setVisionDraft({ lifeVision: vision.lifeVision }); setEditingVision("vision"); } }}>{editingVision === "vision" ? "Cancel" : "Edit"}</button>
                  </div>
                  {editingVision === "vision" ? (
                    <>
                      <textarea style={S.textarea} placeholder="Describe your ideal life in 1–3 years. Be specific and vivid." rows={6} value={visionDraft?.lifeVision || ""} onChange={e => setVisionDraft(d => ({ ...d, lifeVision: e.target.value }))} autoFocus />
                      <button style={{ ...S.primaryBtn, marginTop: 8 }} onClick={() => { upd({ vision: { ...vision, lifeVision: visionDraft.lifeVision } }); setEditingVision(null); }}>Save</button>
                    </>
                  ) : vision.lifeVision ? (
                    <p style={{ fontSize: 13, color: "var(--r-fg3)", lineHeight: 1.8, margin: 0 }}>{vision.lifeVision}</p>
                  ) : (
                    <div style={S.empty}>Paint your ideal life in words. What does it look like in 1–3 years?</div>
                  )}
                </div>

                {/* Life Areas */}
                <div style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={S.cardLabel}>Life areas — satisfaction (1–10)</div>
                    <button style={S.linkBtn} onClick={() => { if (editingVision === "areas") { setEditingVision(null); } else { setLifeAreasDraft({ ...vision.lifeAreas }); setEditingVision("areas"); } }}>{editingVision === "areas" ? "Done" : "Rate"}</button>
                  </div>
                  {editingVision !== "areas" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                      {LIFE_AREAS.map(area => (
                        <div key={area.key} style={{ textAlign: "center" }}>
                          <CircleRing value={(vision.lifeAreas[area.key] || 0) * 10} size={56} strokeWidth={5} />
                          <div style={{ fontSize: 9, color: "var(--r-fg2)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{area.label}</div>
                          <div style={{ fontSize: 11, fontFamily: "var(--r-hero)", color: area.color, marginTop: 1 }}>{vision.lifeAreas[area.key] || 0}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {LIFE_AREAS.map(area => (
                        <div key={area.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 76, fontSize: 12, color: area.color }}>{area.label}</div>
                          <input type="range" min="1" max="10" value={lifeAreasDraft?.[area.key] || 5} onChange={e => setLifeAreasDraft(d => ({ ...d, [area.key]: Number(e.target.value) }))} style={{ flex: 1, accentColor: area.color }} />
                          <div style={{ width: 18, fontSize: 14, fontWeight: 700, fontFamily: "var(--r-hero)", color: area.color, textAlign: "right" }}>{lifeAreasDraft?.[area.key] || 5}</div>
                        </div>
                      ))}
                      <button style={S.primaryBtn} onClick={() => { upd({ vision: { ...vision, lifeAreas: lifeAreasDraft } }); setEditingVision(null); }}>Save ratings</button>
                    </div>
                  )}
                </div>

                {/* Motivation & reminders */}
                <div style={{ ...S.card, borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.03)" }}>
                  <div style={S.cardLabel}>Motivation &amp; reminders</div>
                  {reminders.length === 0 && <div style={{ ...S.empty, marginBottom: 10 }}>Add quotes, reasons, names of people you're doing this for.</div>}
                  {reminders.map(r => (<div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderBottom: "0.5px solid #1a1a1a" }}><span style={{ fontSize: 13, color: "var(--r-caution)", fontStyle: "italic", lineHeight: 1.6, flex: 1 }}>"{r.text}"</span><button style={S.deleteBtn} onClick={() => upd({ reminders: reminders.filter(x => x.id !== r.id) })}>×</button></div>))}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}><input style={{ ...S.input, flex: 1 }} placeholder="Add a reminder or quote…" value={newRem} onChange={e => setNewRem(e.target.value)} onKeyDown={e => e.key === "Enter" && addReminder()} /><button style={{ ...S.primaryBtn, width: "auto", padding: "9px 14px" }} onClick={addReminder}>Add</button></div>
                </div>
              </>)}

              {/* ── Goals tab ── */}
              {goalsTab === "goals" && (<>
                {/* Period filter */}
                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  {PERIOD_ORDER.map(p => (
                    <button key={p} onClick={() => { setGoalsPeriod(p); setGoalDraft(null); setEditGoalId(null); }} style={{ flex: 1, padding: "7px 4px", borderRadius: 6, border: `1px solid ${goalsPeriod === p ? GOAL_COLORS[p] + "66" : "var(--r-bord)"}`, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--r-font)", background: goalsPeriod === p ? GOAL_COLORS[p] + "18" : "transparent", color: goalsPeriod === p ? GOAL_COLORS[p] : "var(--r-fg2)" }}>{p}</button>
                  ))}
                </div>
                {/* Area filter */}
                <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", paddingBottom: 2 }}>
                  <button style={{ ...S.catBtn, borderColor: !goalsAreaFilter ? accentColor : "var(--r-bord)", color: !goalsAreaFilter ? accentColor : "var(--r-fg2)", background: !goalsAreaFilter ? accentColor + "18" : "transparent", whiteSpace: "nowrap" }} onClick={() => setGoalsAreaFilter("")}>All</button>
                  {LIFE_AREAS.map(a => (<button key={a.key} style={{ ...S.catBtn, borderColor: goalsAreaFilter === a.key ? a.color : "var(--r-bord)", color: goalsAreaFilter === a.key ? a.color : "var(--r-fg2)", background: goalsAreaFilter === a.key ? a.color + "18" : "transparent", whiteSpace: "nowrap" }} onClick={() => setGoalsAreaFilter(goalsAreaFilter === a.key ? "" : a.key)}>{a.label}</button>))}
                </div>
                {/* Goals list */}
                {filteredGoals.length === 0 && <div style={S.card}><div style={S.empty}>No {goalsPeriod} goals{goalsAreaFilter ? ` in ${LIFE_AREAS.find(a => a.key === goalsAreaFilter)?.label}` : ""}.</div></div>}
                {filteredGoals.map(g => {
                  const done = isGoalDone(g);
                  const pc = GOAL_COLORS[g.period];
                  const areaInfo = LIFE_AREAS.find(a => a.key === g.lifeArea);
                  const parentGoal = g.parentId ? normGoals.find(x => x.id === g.parentId) : null;
                  return (
                    <div key={g.id} style={{ ...S.card, borderLeft: `3px solid ${pc}`, opacity: done ? 0.7 : 1 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ ...S.goalCheck, background: done ? pc : "transparent", borderColor: pc, flexShrink: 0, marginTop: 2 }} onClick={() => toggleGoal(g.id)}>{done && <span style={{ color: "#fff", fontSize: 11 }}>✓</span>}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, textDecoration: done ? "line-through" : "none", lineHeight: 1.4 }}>{g.title}</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: priColors[g.priority], background: priColors[g.priority] + "18", padding: "1px 7px", borderRadius: 10, border: `0.5px solid ${priColors[g.priority]}44` }}>{g.priority}</span>
                            {areaInfo && <span style={{ fontSize: 10, color: areaInfo.color }}>{areaInfo.label}</span>}
                            {g.dueDate && <span style={{ fontSize: 10, color: "var(--r-fg2)" }}>due {g.dueDate}</span>}
                            {parentGoal && <span style={{ fontSize: 10, color: "var(--r-bord)" }}>↑ {parentGoal.title}</span>}
                          </div>
                          {g.notes && <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 5, lineHeight: 1.5 }}>{g.notes}</div>}
                          <div style={{ marginTop: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--r-fg2)", marginBottom: 3 }}><span>Progress</span><span style={{ color: g.progress >= 100 ? "var(--r-success)" : "var(--r-fg3)" }}>{g.progress}%</span></div>
                            <input type="range" min="0" max="100" value={g.progress} onChange={e => upd({ goals: goals.map(x => x.id === g.id ? { ...x, progress: Number(e.target.value) } : x) })} style={{ width: "100%", accentColor: pc, cursor: "pointer" }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                          <button style={{ ...S.linkBtn, fontSize: 11 }} onClick={() => { setGoalDraft({ title: g.title, priority: g.priority, dueDate: g.dueDate, notes: g.notes, lifeArea: g.lifeArea, parentId: g.parentId }); setEditGoalId(g.id); }}>Edit</button>
                          <button style={{ ...S.linkBtn, fontSize: 11, color: "var(--r-fg2)" }} onClick={() => upd({ goals: goals.map(x => x.id === g.id ? { ...x, archived: true } : x) })}>Archive</button>
                          <button style={S.deleteBtn} onClick={() => upd({ goals: goals.filter(x => x.id !== g.id) })}>×</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Add / Edit form */}
                {goalDraft ? (
                  <div style={{ ...S.card, borderColor: GOAL_COLORS[goalsPeriod] + "44" }}>
                    <div style={{ fontSize: 12, color: GOAL_COLORS[goalsPeriod], fontWeight: 600, marginBottom: 12 }}>{editGoalId ? "Edit goal" : `New ${goalsPeriod} goal`}</div>
                    <input style={S.input} placeholder="Goal title…" value={goalDraft.title || ""} onChange={e => setGoalDraft(d => ({ ...d, title: e.target.value }))} autoFocus />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                      <div style={S.formRow}>
                        <label style={S.formLabel}>Priority</label>
                        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                          {["high","med","low"].map(p => <button key={p} style={{ ...S.catBtn, flex: 1, borderColor: goalDraft.priority === p ? priColors[p] : "var(--r-bord)", color: goalDraft.priority === p ? priColors[p] : "var(--r-fg2)", background: goalDraft.priority === p ? priColors[p] + "18" : "transparent" }} onClick={() => setGoalDraft(d => ({ ...d, priority: p }))}>{p}</button>)}
                        </div>
                      </div>
                      <div style={S.formRow}>
                        <label style={S.formLabel}>Due date</label>
                        <input type="date" style={{ ...S.input, marginTop: 4 }} value={goalDraft.dueDate || ""} onChange={e => setGoalDraft(d => ({ ...d, dueDate: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ marginTop: 10, ...S.formRow }}>
                      <label style={S.formLabel}>Life area</label>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                        <button style={{ ...S.catBtn, borderColor: !goalDraft.lifeArea ? accentColor : "var(--r-bord)", color: !goalDraft.lifeArea ? accentColor : "var(--r-fg2)" }} onClick={() => setGoalDraft(d => ({ ...d, lifeArea: "" }))}>None</button>
                        {LIFE_AREAS.map(a => <button key={a.key} style={{ ...S.catBtn, borderColor: goalDraft.lifeArea === a.key ? a.color : "var(--r-bord)", color: goalDraft.lifeArea === a.key ? a.color : "var(--r-fg2)", background: goalDraft.lifeArea === a.key ? a.color + "18" : "transparent" }} onClick={() => setGoalDraft(d => ({ ...d, lifeArea: a.key }))}>{a.label}</button>)}
                      </div>
                    </div>
                    {parentCandidates.length > 0 && (
                      <div style={{ marginTop: 10, ...S.formRow }}>
                        <label style={S.formLabel}>Part of ({PERIOD_ORDER[parentPeriodIdx]} goal)</label>
                        <select style={{ ...S.input, marginTop: 4 }} value={goalDraft.parentId || ""} onChange={e => setGoalDraft(d => ({ ...d, parentId: e.target.value || null }))}>
                          <option value="">— none —</option>
                          {parentCandidates.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                      </div>
                    )}
                    <div style={{ marginTop: 10, ...S.formRow }}>
                      <label style={S.formLabel}>Notes (optional)</label>
                      <textarea style={{ ...S.textarea, marginTop: 4, minHeight: 56 }} value={goalDraft.notes || ""} onChange={e => setGoalDraft(d => ({ ...d, notes: e.target.value }))} />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button style={{ ...S.primaryBtn, flex: 1, background: GOAL_COLORS[goalsPeriod], color: "#fff" }} onClick={() => {
                        if (!goalDraft.title?.trim()) return;
                        const existing = editGoalId ? goals.find(x => x.id === editGoalId) : null;
                        const g = { id: editGoalId || "g" + Date.now(), title: goalDraft.title.trim(), text: goalDraft.title.trim(), period: goalsPeriod, parentId: goalDraft.parentId || null, dueDate: goalDraft.dueDate || "", priority: goalDraft.priority || "med", notes: goalDraft.notes || "", progress: existing?.progress || 0, lifeArea: goalDraft.lifeArea || "", done: existing?.done || [], archived: false, createdAt: existing?.createdAt || new Date().toISOString() };
                        upd({ goals: editGoalId ? goals.map(x => x.id === editGoalId ? g : x) : [...goals, g] });
                        setGoalDraft(null); setEditGoalId(null);
                      }}>{editGoalId ? "Save changes" : `Add ${goalsPeriod} goal`}</button>
                      <button style={{ ...S.primaryBtn, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)", flex: 1 }} onClick={() => { setGoalDraft(null); setEditGoalId(null); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button style={{ ...S.primaryBtn, background: "transparent", border: `1px dashed ${GOAL_COLORS[goalsPeriod]}55`, color: GOAL_COLORS[goalsPeriod], marginTop: 4 }} onClick={() => setGoalDraft({ title: "", priority: "med", dueDate: "", notes: "", lifeArea: "", parentId: null })}>+ Add {goalsPeriod} goal</button>
                )}
                {/* Archived */}
                {normGoals.filter(g => g.archived && g.period === goalsPeriod).length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <button style={S.linkBtn} onClick={() => setGoalsShowArchived(a => !a)}>{goalsShowArchived ? "Hide" : "Show"} archived ({normGoals.filter(g => g.archived && g.period === goalsPeriod).length})</button>
                    {goalsShowArchived && normGoals.filter(g => g.archived && g.period === goalsPeriod).map(g => (
                      <div key={g.id} style={{ ...S.card, opacity: 0.4, marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13 }}>{g.title}</span>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button style={{ ...S.linkBtn, fontSize: 11 }} onClick={() => upd({ goals: goals.map(x => x.id === g.id ? { ...x, archived: false } : x) })}>Restore</button>
                          <button style={S.deleteBtn} onClick={() => upd({ goals: goals.filter(x => x.id !== g.id) })}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>)}

              {/* ── Streaks tab ── */}
              {goalsTab === "streaks" && (() => {
                const withRates = normalizedHabits.map(h => ({ h, rate: calcHabitRate(h, 30) }));
                const sorted = [...withRates].sort((a, b) => a.rate - b.rate);
                const weakest = sorted[0]?.h;
                return (<>
                  {weakest && normalizedHabits.length > 0 && (
                    <div style={{ ...S.card, borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.04)" }}>
                      <div style={{ fontSize: 10, color: "var(--r-danger)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Needs most attention</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{weakest.name}</div>
                      <div style={{ fontSize: 11, color: "var(--r-danger)" }}>{calcHabitRate(weakest, 30)}% completion last 30 days</div>
                    </div>
                  )}
                  {normalizedHabits.length === 0 ? (
                    <div style={S.card}><div style={S.empty}>No habits yet. <button style={S.linkBtn} onClick={() => setView("habits")}>Add habits →</button></div></div>
                  ) : normalizedHabits.map(h => {
                    const streak = calcStreak(h.completions);
                    const longest = calcLongestStreak(h.completions);
                    const weekRate = calcHabitRate(h, 7);
                    const monthRate = calcHabitRate(h, 30);
                    const col = CAT_HEX[h.category] || "#5B4A6A";
                    return (
                      <div key={h.id} style={{ ...S.card, borderLeft: `3px solid ${col}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{h.name}</div>
                            <div style={{ fontSize: 10, color: col, textTransform: "uppercase", marginTop: 2 }}>{h.category}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--r-hero)", color: streak >= 7 ? "var(--r-success)" : streak >= 3 ? "var(--r-caution)" : "var(--r-fg3)", lineHeight: 1 }}>{streak}</div>
                            <div style={{ fontSize: 9, color: "var(--r-fg2)" }}>day streak</div>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                          <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>Longest</div><div style={{ ...S.sleepTargetVal, color: "#5B4A6A" }}>{longest}d</div></div>
                          <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>This week</div><div style={{ ...S.sleepTargetVal, color: weekRate >= 80 ? "var(--r-success)" : weekRate >= 50 ? "var(--r-caution)" : "var(--r-danger)" }}>{weekRate}%</div></div>
                          <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>This month</div><div style={{ ...S.sleepTargetVal, color: monthRate >= 80 ? "var(--r-success)" : monthRate >= 50 ? "var(--r-caution)" : "var(--r-danger)" }}>{monthRate}%</div></div>
                        </div>
                        <HeatmapGrid getScore={d => h.completions.includes(d) ? 100 : (h.completions.length ? 0 : null)} />
                      </div>
                    );
                  })}
                </>);
              })()}

              {/* ── Accountability tab ── */}
              {goalsTab === "accountability" && (<>
                {/* Commitment contract */}
                <div style={S.card}>
                  <div style={S.cardLabel}>Commitment contract</div>
                  {contract?.locked ? (
                    <div style={{ background: "var(--r-bord)", border: "0.5px solid rgba(52,211,153,0.3)", borderRadius: 10, padding: "16px" }}>
                      <div style={{ fontSize: 13, lineHeight: 1.75, color: "#ddd", marginBottom: 14 }}>{contract.text}</div>
                      <div style={{ height: "0.5px", background: "var(--r-surf2)", marginBottom: 12 }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div>
                          <div style={{ fontSize: 13, color: "var(--r-success)", fontStyle: "italic" }}>— {contract.signature}</div>
                          <div style={{ fontSize: 10, color: "var(--r-fg2)", marginTop: 2 }}>{contract.signedDate}</div>
                        </div>
                        <div style={{ fontSize: 22, color:"var(--r-accent)" }} aria-hidden="true"><i className="ph ph-pen-nib" /></div>
                      </div>
                    </div>
                  ) : contractDraft ? (
                    <>
                      <textarea style={{ ...S.textarea, marginBottom: 8 }} placeholder="Write your commitment. What are you promising yourself?" rows={4} value={contractDraft.text || ""} onChange={e => setContractDraft(d => ({ ...d, text: e.target.value }))} />
                      <input style={{ ...S.input, marginBottom: 8 }} placeholder="Sign with your name" value={contractDraft.signature || ""} onChange={e => setContractDraft(d => ({ ...d, signature: e.target.value }))} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-accent)", color: "#fff" }} onClick={() => { if (!contractDraft.text?.trim() || !contractDraft.signature?.trim()) return; upd({ accountability: { ...accountability, contract: { ...contractDraft, locked: true, signedDate: getTodayStr() } } }); setContractDraft(null); }}>Sign &amp; lock permanently</button>
                        <button style={{ ...S.primaryBtn, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => setContractDraft(null)}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <><div style={S.empty}>Write a contract with yourself. Once signed it cannot be changed.</div>
                    <button style={{ ...S.primaryBtn, marginTop: 10 }} onClick={() => setContractDraft({ text: "", signature: "" })}>Write contract</button></>
                  )}
                </div>

                {/* Letter to future self */}
                <div style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={S.cardLabel}>Letter to future self</div>
                    <button style={S.linkBtn} onClick={() => setLetterDraft(letterDraft ? null : { text: "", unlockDate: "" })}>{letterDraft ? "Cancel" : "+ Write"}</button>
                  </div>
                  {letterDraft && (
                    <div style={{ marginBottom: 14 }}>
                      <textarea style={{ ...S.textarea, marginBottom: 8 }} placeholder="Dear future me…" rows={5} value={letterDraft.text} onChange={e => setLetterDraft(d => ({ ...d, text: e.target.value }))} autoFocus />
                      <div style={{ ...S.formRow, marginBottom: 8 }}>
                        <label style={S.formLabel}>Unlock date (when you can read this)</label>
                        <input type="date" style={{ ...S.input, marginTop: 4 }} value={letterDraft.unlockDate} min={getTodayStr()} onChange={e => setLetterDraft(d => ({ ...d, unlockDate: e.target.value }))} />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ ...S.primaryBtn, flex: 1 }} onClick={() => { if (!letterDraft.text.trim() || !letterDraft.unlockDate) return; upd({ accountability: { ...accountability, futureLetters: [...(accountability.futureLetters || []), { id: "fl" + Date.now(), text: letterDraft.text, writtenDate: getTodayStr(), unlockDate: letterDraft.unlockDate }] } }); setLetterDraft(null); }}>Seal letter</button>
                        <button style={{ ...S.primaryBtn, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => setLetterDraft(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                  {(accountability.futureLetters || []).length === 0 && !letterDraft ? (
                    <div style={S.empty}>No letters yet. Write one to your future self.</div>
                  ) : [...(accountability.futureLetters || [])].reverse().map(letter => {
                    const unlocked = letter.unlockDate <= getTodayStr();
                    return (
                      <div key={letter.id} style={{ padding: "10px 0", borderBottom: "0.5px solid #111" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                          <span style={{ fontSize: 11, color: unlocked ? "var(--r-success)" : "var(--r-fg2)" }}>{unlocked ? "Unlocked" : `Sealed until ${letter.unlockDate}`}</span>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: "var(--r-bord)" }}>Written {letter.writtenDate}</span>
                            <button style={S.deleteBtn} onClick={() => upd({ accountability: { ...accountability, futureLetters: (accountability.futureLetters || []).filter(l => l.id !== letter.id) } })}>×</button>
                          </div>
                        </div>
                        {unlocked ? <div style={{ fontSize: 13, color: "var(--r-fg3)", lineHeight: 1.75 }}>{letter.text}</div> : <div style={{ fontSize: 12, color: "#2a2a2a", fontStyle: "italic" }}>This letter is sealed.</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Weekly review */}
                <div style={S.card}>
                  <div style={S.cardLabel}>Weekly review</div>
                  {thisWeekReview && !weeklyReviewDraft ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 11, color: "var(--r-success)" }}>This week completed ✓</span>
                        <button style={S.linkBtn} onClick={() => setWRD({ wentWell: thisWeekReview.wentWell, didntGo: thisWeekReview.didntGo, focus: thisWeekReview.focus })}>Edit</button>
                      </div>
                      {[["Went well", thisWeekReview.wentWell], ["Didn't go well", thisWeekReview.didntGo], ["Focus next week", thisWeekReview.focus]].map(([label, val]) => (
                        <div key={label} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{label}</div>
                          <div style={{ fontSize: 13, color: "var(--r-fg3)", lineHeight: 1.6 }}>{val || "—"}</div>
                        </div>
                      ))}
                    </div>
                  ) : weeklyReviewDraft ? (
                    <div>
                      {[["What went well this week?", "wentWell", "var(--r-success)"], ["What didn't go well?", "didntGo", "var(--r-danger)"], ["Focus for next week?", "focus", "var(--r-info)"]].map(([q, key, col]) => (
                        <div key={key} style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 12, color: col, marginBottom: 5 }}>{q}</div>
                          <textarea style={{ ...S.textarea, minHeight: 60 }} value={weeklyReviewDraft[key] || ""} onChange={e => setWRD(d => ({ ...d, [key]: e.target.value }))} />
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ ...S.primaryBtn, flex: 1 }} onClick={() => { const rev = { id: (thisWeekReview?.id || "wr" + Date.now()), weekStr: thisWeekStr, ...weeklyReviewDraft, completedAt: new Date().toISOString() }; upd({ accountability: { ...accountability, weeklyReviews: [...(accountability.weeklyReviews || []).filter(r => r.weekStr !== thisWeekStr), rev] } }); setWRD(null); }}>Save review</button>
                        <button style={{ ...S.primaryBtn, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => setWRD(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <><div style={S.empty}>Reflect on this week — what worked, what didn't, what's next.</div>
                    <button style={{ ...S.primaryBtn, marginTop: 10 }} onClick={() => setWRD({ wentWell: "", didntGo: "", focus: "" })}>Start this week's review</button></>
                  )}
                  {(accountability.weeklyReviews || []).filter(r => r.weekStr !== thisWeekStr).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 10, color: "var(--r-bord)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Past reviews</div>
                      {[...(accountability.weeklyReviews || [])].filter(r => r.weekStr !== thisWeekStr).sort((a, b) => b.weekStr.localeCompare(a.weekStr)).slice(0, 5).map(r => (
                        <div key={r.id} style={{ padding: "7px 0", borderBottom: "0.5px solid #111", fontSize: 11, color: "var(--r-fg2)" }}>
                          Week of {r.weekStr} — <span style={{ color: "var(--r-fg3)" }}>{r.focus || r.wentWell || "—"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Wins board */}
                <div style={S.card}>
                  <div style={S.cardLabel}>Wins board</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <input style={{ ...S.input, flex: 1 }} placeholder="Log a win — any size…" value={winText} onChange={e => setWinText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && winText.trim()) { upd({ accountability: { ...accountability, wins: [{ id: "w" + Date.now(), text: winText.trim(), date: getTodayStr() }, ...(accountability.wins || [])] } }); setWinText(""); } }} />
                    <button style={{ ...S.primaryBtn, width: "auto", padding: "9px 14px" }} onClick={() => { if (!winText.trim()) return; upd({ accountability: { ...accountability, wins: [{ id: "w" + Date.now(), text: winText.trim(), date: getTodayStr() }, ...(accountability.wins || [])] } }); setWinText(""); }}>Add</button>
                  </div>
                  {(accountability.wins || []).length === 0 ? <div style={S.empty}>No wins yet. Every step counts.</div> : (accountability.wins || []).slice(0, 30).map(w => (
                    <div key={w.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderBottom: "0.5px solid #111" }}>
                      <span style={{ color: "var(--r-caution)", fontSize: 14, flexShrink: 0 }}>★</span>
                      <span style={{ fontSize: 13, flex: 1, lineHeight: 1.5 }}>{w.text}</span>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "var(--r-bord)" }}>{w.date}</span>
                        <button style={S.deleteBtn} onClick={() => upd({ accountability: { ...accountability, wins: (accountability.wins || []).filter(x => x.id !== w.id) } })}>×</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gratitude log */}
                <div style={S.card}>
                  <div style={S.cardLabel}>Gratitude log</div>
                  {todayGratitude ? (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--r-success)", marginBottom: 8 }}>Today logged ✓</div>
                      {todayGratitude.items.map((item, i) => <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0" }}><span style={{ color: "#5B4A6A", fontSize: 12, flexShrink: 0 }}>{i + 1}.</span><span style={{ fontSize: 13, color: "var(--r-fg3)" }}>{item}</span></div>)}
                      <button style={{ ...S.linkBtn, marginTop: 8, fontSize: 12 }} onClick={() => setGratitudeDraft(todayGratitude.items.length >= 3 ? todayGratitude.items : [...todayGratitude.items, ...["","",""].slice(0, 3 - todayGratitude.items.length)])}>Update today</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, color: "var(--r-fg2)", marginBottom: 10 }}>3 things you're grateful for today</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ color: "#5B4A6A", fontSize: 12, width: 16, flexShrink: 0 }}>{i + 1}.</span>
                            <input style={{ ...S.input, flex: 1 }} placeholder="Grateful for…" value={gratitudeDraft[i] || ""} onChange={e => setGratitudeDraft(d => d.map((x, j) => j === i ? e.target.value : x))} />
                          </div>
                        ))}
                      </div>
                      <button style={S.primaryBtn} onClick={() => { const items = gratitudeDraft.filter(x => x.trim()); if (!items.length) return; const today = getTodayStr(); upd({ accountability: { ...accountability, gratitude: [{ id: "gr" + Date.now(), date: today, items }, ...(accountability.gratitude || []).filter(g => g.date !== today)] } }); setGratitudeDraft(["","",""]); }}>Save gratitude</button>
                    </div>
                  )}
                  {(accountability.gratitude || []).filter(g => g.date !== getTodayStr()).slice(0, 7).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 10, color: "var(--r-bord)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Recent</div>
                      {[...(accountability.gratitude || [])].filter(g => g.date !== getTodayStr()).slice(0, 7).map(g => (
                        <div key={g.id} style={{ padding: "8px 0", borderBottom: "0.5px solid #111" }}>
                          <div style={{ fontSize: 10, color: "var(--r-fg2)", marginBottom: 4 }}>{g.date}</div>
                          {g.items.map((item, i) => <div key={i} style={{ fontSize: 12, color: "var(--r-fg2)", lineHeight: 1.5 }}>{i + 1}. {item}</div>)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>)}
            </div>
          );
        })()}

        {/* ════ RELAPSE TOOLKIT ════ */}
        {view === "relapse" && (
          <div style={S.content}>
            <h2 style={S.pageTitle}>Relapse toolkit</h2>
            <div style={{ ...S.card, borderColor: "rgba(249,115,22,0.35)", background: "rgba(249,115,22,0.04)", marginBottom: 12 }}>
              <div style={S.cardLabel}>Crisis tools</div>
              <p style={{ color: "#A4503C", fontSize: 13, lineHeight: 1.65, margin: 0 }}>Cravings peak within 20 min then fall. Use these right now.</p>
            </div>
            {BUILTIN_RELAPSE_TOOLS.map(a => (<div key={a.id} style={S.actionCard}><div style={{ flexShrink: 0, color: "var(--r-accent)" }} aria-hidden="true"><i className={a.icon} style={{ fontSize: 22 }} /></div><div><div style={S.actionTitle}>{a.title}</div><div style={S.actionDesc}>{a.desc}</div></div></div>))}
            <div style={{ ...S.card, borderColor: "rgba(167,139,250,0.25)", marginTop: 8 }}>
              <div style={S.cardLabel}>My post-relapse protocol</div>
              <p style={{ fontSize: 12, color: "var(--r-fg2)", marginBottom: 12, lineHeight: 1.6 }}>These actions and reminders will be shown immediately after you log a relapse.</p>
              <div style={{ fontSize: 11, color: "#5B4A6A", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Immediate actions to do</div>
              {postRelapseActions.map(a => (<div key={a.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, fontSize: 13, color: "var(--r-fg3)" }}><span style={{ color: "#5B4A6A" }}>→</span><span style={{ flex: 1 }}>{a.text}</span><button style={S.deleteBtn} onClick={() => upd({ postRelapseActions: postRelapseActions.filter(x => x.id !== a.id) })}>×</button></div>))}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}><input style={{ ...S.input, flex: 1, fontSize: 12 }} placeholder="Add an immediate action…" value={newPostAction} onChange={e => setNewPostAction(e.target.value)} onKeyDown={e => e.key === "Enter" && addPostAction()} /><button style={{ ...S.primaryBtn, width: "auto", padding: "8px 12px" }} onClick={addPostAction}>Add</button></div>
              <div style={{ fontSize: 11, color: "var(--r-caution)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Post-relapse reminders</div>
              {postRelapseReminders.map(r => (<div key={r.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8, fontSize: 13, color: "var(--r-fg3)", fontStyle: "italic" }}><span style={{ color: "var(--r-caution)" }}>"</span><span style={{ flex: 1, lineHeight: 1.55 }}>{r.text}"</span><button style={S.deleteBtn} onClick={() => upd({ postRelapseReminders: postRelapseReminders.filter(x => x.id !== r.id) })}>×</button></div>))}
              <div style={{ display: "flex", gap: 8 }}><input style={{ ...S.input, flex: 1, fontSize: 12 }} placeholder="Add an affirmation or reminder…" value={newPostReminder} onChange={e => setNewPostReminder(e.target.value)} onKeyDown={e => e.key === "Enter" && addPostReminder()} /><button style={{ ...S.primaryBtn, width: "auto", padding: "8px 12px" }} onClick={addPostReminder}>Add</button></div>
            </div>
            <div style={S.card}><div style={S.cardLabel}>Relapse history</div>{!(account?.relapses?.length) ? <div style={S.empty}>No relapses recorded. Keep going.</div> : [...(account.relapses || [])].reverse().map((r, i) => (<div key={i} style={{ padding: "10px 0", borderBottom: "0.5px solid #161616" }}><div style={{ fontSize: 11, color: "#A4503C", marginBottom: 3 }}>{new Date(r.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</div>{r.note && <div style={{ fontSize: 12, color: "var(--r-fg3)", lineHeight: 1.55 }}>{r.note}</div>}{r.tools?.length > 0 && <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 2 }}>Tools used: {r.tools.join(", ")}</div>}</div>))}</div>
          </div>
        )}

        {/* ════ REWARDS ════ */}
        {view === "rewards" && (
          <div style={S.content}>
            <h2 style={S.pageTitle}>Rewards</h2>

            {/* ── All rewards list ── */}
            <div style={S.card}>
              <div style={S.cardLabel}>All rewards</div>
              {(account?.rewards || []).length === 0 && <div style={S.empty}>No rewards yet. Add one below.</div>}
              {[...(account?.rewards || [])].sort((a, b) => a.days - b.days).map(r => {
                const isClaimed = claimed.includes(r.id);
                const isUnlocked = daysSober >= r.days && !isClaimed;
                const isLocked = daysSober < r.days && !isClaimed;
                const isEditing = editRewId === r.id;
                return (
                  <div key={r.id}>
                    {isEditing ? (
                      <div style={{ padding: "10px 0", borderBottom: "0.5px solid var(--r-bord)" }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          <input style={{ ...S.input, flex: 1 }} value={editRewDraft.name} onChange={e => setEditRewDraft(d => ({ ...d, name: e.target.value }))} autoFocus />
                          <input type="number" min="1" style={{ ...S.input, width: 70 }} value={editRewDraft.days} onChange={e => setEditRewDraft(d => ({ ...d, days: e.target.value }))} />
                          <span style={{ display: "flex", alignItems: "center", fontSize: 12, color: "var(--r-fg2)", whiteSpace: "nowrap" }}>days</span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button style={{ ...S.primaryBtn, flex: 1, padding: "7px 12px" }} onClick={saveEditReward}>Save</button>
                          <button style={{ ...S.primaryBtn, flex: 1, padding: "7px 12px", background: "var(--r-surf2)", color: "var(--r-fg2)" }} onClick={() => { setEditRewId(null); setEditRewDraft(null); }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "0.5px solid var(--r-bord)" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: isClaimed ? "var(--r-fg2)" : "var(--r-fg)", textDecoration: isClaimed ? "line-through" : "none" }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 2 }}>
                            {r.days}d milestone
                            {isLocked && <span style={{ marginLeft: 6, color: "var(--r-info)" }}>· {r.days - daysSober}d to go</span>}
                            {isClaimed && <span style={{ marginLeft: 6, color: "var(--r-success)" }}>· claimed</span>}
                          </div>
                        </div>
                        {isUnlocked && <button style={S.claimBtn} onClick={() => claimReward(r.id)}>Claim ✓</button>}
                        {isLocked && <div style={{ fontSize: 14, opacity: 0.4, color: "var(--r-fg3)" }} aria-hidden="true"><i className="ph ph-lock-simple" /></div>}
                        {isClaimed && <div style={{ fontSize: 14, color: "var(--r-success)" }} aria-hidden="true"><i className="ph-fill ph-check-circle" /></div>}
                        <button style={{ ...S.deleteBtn, color: "var(--r-fg2)", fontSize: 13, padding: "2px 6px" }} onClick={() => { setEditRewId(r.id); setEditRewDraft({ name: r.name, days: r.days }); }}>✎</button>
                        <button style={{ ...S.deleteBtn, color: "var(--r-danger)", fontSize: 13, padding: "2px 6px" }} onClick={() => { if (window.confirm(`Delete "${r.name}"?`)) deleteReward(r.id); }}>✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Add reward ── */}
            <div style={S.card}>
              <div style={S.cardLabel}>Add reward</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <input style={{ ...S.input, flex: 1, minWidth: 140 }} placeholder="Reward name…" value={newRewName} onChange={e => setNRN(e.target.value)} onKeyDown={e => e.key === "Enter" && addReward()} />
                <input type="number" min="1" style={{ ...S.input, width: 70 }} value={newRewDays} onChange={e => setNRD(e.target.value)} />
                <span style={{ display: "flex", alignItems: "center", fontSize: 12, color: "var(--r-fg2)" }}>days</span>
              </div>
              <button style={{ ...S.primaryBtn, marginTop: 10 }} onClick={addReward} disabled={!newRewName.trim()}>Add reward</button>
            </div>
          </div>
        )}

        {/* ════ JOURNAL ════ */}
        {view === "journal" && (
          <div style={S.content}>
            <h2 style={S.pageTitle}>Journal</h2>
            <div style={S.card}><div style={S.cardLabel}>Today's entry</div><textarea style={S.textarea} placeholder="Write freely. No-one else sees this." value={journalText} onChange={e => setJT(e.target.value)} rows={5} /><button style={{ ...S.primaryBtn, marginTop: 10 }} onClick={addJournal}>Save entry</button></div>
            {(account?.journal || []).map(entry => (<div key={entry.id} style={S.journalEntry}><div style={S.journalDate}>{new Date(entry.date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div><div style={S.journalText}>{entry.text}</div></div>))}
          </div>
        )}

        {/* ════ SETTINGS ════ */}
        {view === "settings" && (() => {
          const applyPreset = preset => {
            const p = THEME_PRESETS.find(x => x.id === preset);
            if (!p) return;
            const patch = { preset: p.id, bg: p.bg, surf: p.surf, surf2: p.surf2, surf3: p.surf3, bord: p.bord, fg: p.fg, fg2: p.fg2, fg3: p.fg3, glow: p.glow, lightRamp: p.lightRamp || false, textAccent: p.textAccent || null };
            if (p.font) patch.font = p.font;
            updTheme(patch);
          };
          return (
            <div style={S.content}>
              <h2 style={S.pageTitle}>Settings</h2>

              {/* ── Sub-tabs ── */}
              <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                {[["appearance","Appearance"],["account","Account"]].map(([t, label]) => (
                  <button key={t} onClick={() => setSettingsTab(t)} style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "none", borderBottom: `2px solid ${settingsTab === t ? accentColor : "transparent"}`, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--r-font)", background: settingsTab === t ? accentColor + "18" : "var(--r-surf)", color: settingsTab === t ? accentColor : "var(--r-fg2)" }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Appearance tab ── */}
              {settingsTab === "appearance" && (() => {
                const ThemeCard = ({ p }) => {
                  const active = theme.preset === p.id;
                  return (
                    <button onClick={() => applyPreset(p.id)} style={{ padding: 0, border: `2px solid ${active ? accentColor : "var(--r-bord)"}`, borderRadius: 12, cursor: "pointer", background: "transparent", transition: "border-color 0.15s", overflow: "hidden", textAlign: "left", display: "block", width: "100%" }}>
                      <div style={{ background: p.bg, padding: "12px 14px", borderBottom: `1px solid ${p.bord}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                          <div style={{ width: 22, height: 4, background: p.fg2, borderRadius: 2, opacity: 0.7 }} />
                          <div style={{ width: 13, height: 4, background: p.fg2, borderRadius: 2, opacity: 0.4 }} />
                          <div style={{ marginLeft: "auto", width: 9, height: 9, borderRadius: "50%", background: p.accent }} />
                        </div>
                        <div style={{ height: 3, background: p.fg2, opacity: 0.22, borderRadius: 2, marginBottom: 4 }} />
                        <div style={{ height: 3, background: p.fg2, opacity: 0.12, borderRadius: 2, marginBottom: 8, width: "72%" }} />
                        <div style={{ height: 5, background: p.accent, opacity: 0.55, borderRadius: 3, width: "50%" }} />
                      </div>
                      <div style={{ padding: "10px 12px", background: "var(--r-surf)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--r-fg)", letterSpacing: "-0.01em" }}>{p.name}</div>
                          {active && <div style={{ width: 16, height: 16, borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 800, flexShrink: 0 }}>✓</div>}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--r-fg2)", lineHeight: 1.4 }}>{p.desc}</div>
                        {p.fontTags && (
                          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                            {p.fontTags.map(tag => (
                              <span key={tag} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "var(--r-surf2)", border: "0.5px solid var(--r-bord)", color: "var(--r-fg2)", fontWeight: 500 }}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                };
                return (<>
                  <p style={{ fontSize: 13, color: "var(--r-fg2)", lineHeight: 1.6, marginBottom: 20 }}>Choose a theme that matches your vibe. Exclusive themes include custom typography.</p>

                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", letterSpacing: "0.1em", marginBottom: 10 }}>BASE THEMES</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 28 }}>
                    {THEME_PRESETS.filter(p => p.category === "base").map(p => <ThemeCard key={p.id} p={p} />)}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", letterSpacing: "0.1em" }}>EXCLUSIVE THEMES</div>
                    <div style={{ fontSize: 9, fontWeight: 700, background: accentColor + "20", color: accentColor, border: `1px solid ${accentColor}40`, borderRadius: 20, padding: "2px 8px", letterSpacing: "0.08em" }}>CUSTOM FONTS</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 28 }}>
                    {THEME_PRESETS.filter(p => p.category === "exclusive").map(p => <ThemeCard key={p.id} p={p} />)}
                  </div>

                  <div style={S.card}>
                    <div style={S.cardLabel}>Accent colour</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {ACCOUNT_COLORS.map(c => (
                        <div key={c} onClick={() => upd({ color: c })} style={{ width: 32, height: 32, borderRadius: "50%", background: c, cursor: "pointer", border: accentColor === c ? "3px solid #fff" : "3px solid transparent", transition: "border-color 0.2s" }} />
                      ))}
                    </div>
                  </div>

                  <div style={S.card}>
                    <div style={S.cardLabel}>Font override</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                      {FONT_PACKAGES.map(pkg => (
                        <button key={pkg.id} onClick={() => updTheme({ font: pkg.id })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 8, border: `1.5px solid ${theme.font === pkg.id ? accentColor : "var(--r-bord)"}`, background: theme.font === pkg.id ? accentColor + "12" : "transparent", cursor: "pointer", textAlign: "left" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontFamily: pkg.stack, color: "var(--r-fg)", fontWeight: 500 }}>{pkg.name}</div>
                            <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 1 }}>{pkg.label}</div>
                          </div>
                          {theme.font === pkg.id && <span style={{ color: accentColor, fontSize: 14 }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={S.card}>
                    <div style={S.cardLabel}>Custom colours</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                      {[["bg","Background"],["surf","Surface"],["bord","Border"],["fg","Text"],["fg2","Muted text"]].map(([key, label]) => (
                        <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 12, color: "var(--r-fg2)", width: 90 }}>{label}</span>
                          <input type="color" value={theme[key] || "var(--r-bord)"} onChange={e => updTheme({ [key]: e.target.value, preset: "custom" })} style={{ width: 36, height: 28, padding: 2, borderRadius: 5, border: "1px solid var(--r-bord)", background: "transparent", cursor: "pointer" }} />
                          <span style={{ fontSize: 11, color: "var(--r-fg2)", fontFamily: "var(--r-hero)" }}>{theme[key]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>);
              })()}

              {/* ── Account tab ── */}
              {settingsTab === "account" && (<>
                {settingsAccDraft ? (
                  <div style={S.card}>
                    <div style={S.cardLabel}>Edit journey</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                      <div style={S.formRow}><label style={S.formLabel}>Journey name</label><input style={S.input} value={settingsAccDraft.name || ""} onChange={e => setSettingsAccDraft(d => ({ ...d, name: e.target.value }))} /></div>
                      <div style={S.formRow}><label style={S.formLabel}>Substance / focus</label><input style={S.input} value={settingsAccDraft.substance || ""} onChange={e => setSettingsAccDraft(d => ({ ...d, substance: e.target.value }))} /></div>
                      <div style={S.formRow}><label style={S.formLabel}>Sobriety start date</label><input type="date" style={S.input} value={settingsAccDraft.sobrietyStart || ""} max={getTodayStr()} onChange={e => setSettingsAccDraft(d => ({ ...d, sobrietyStart: e.target.value }))} /></div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button style={{ ...S.primaryBtn, flex: 1 }} onClick={() => { upd(settingsAccDraft); setSettingsAccDraft(null); }}>Save</button>
                        <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2)", color: "var(--r-fg2)" }} onClick={() => setSettingsAccDraft(null)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={S.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={S.cardLabel}>Journey details</div>
                      <button style={S.linkBtn} onClick={() => setSettingsAccDraft({ name: account.name, substance: account.substance, sobrietyStart: account.sobrietyStart })}>Edit</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[["Name", account.name], ["Substance", account.substance], ["Sober since", account.sobrietyStart], ["Days sober", daysSober + " days"]].map(([label, val]) => (
                        <div key={label} style={{ display: "flex", gap: 10 }}>
                          <span style={{ fontSize: 11, color: "var(--r-fg2)", width: 90 }}>{label}</span>
                          <span style={{ fontSize: 13 }}>{val || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ ...S.card, borderColor: "rgba(248,113,113,0.2)", marginTop: 4 }}>
                  <div style={S.cardLabel}>Danger zone</div>
                  <p style={{ fontSize: 12, color: "var(--r-fg2)", margin: "6px 0 12px", lineHeight: 1.6 }}>Permanently delete all your data. This cannot be undone.</p>
                  <button style={{ ...S.primaryBtn, background: "transparent", border: "1px solid rgba(248,113,113,0.4)", color: "var(--r-danger)" }} onClick={() => { if (window.confirm("Delete ALL data? This cannot be undone.")) { localStorage.removeItem(ROOT_KEY); window.location.reload(); } }}>Delete all data</button>
                </div>
              </>)}
            </div>
          );
        })()}

      </>)}

      {/* ══════════════════ MODALS ══════════════════ */}

      {modal === "sleepLog" && (
        <div style={S.overlay} onClick={() => setModal(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Log your sleep</div>
            <p style={S.modalSub}>Scored on duration and alignment with your {fmtTime(routineTargets.bedtime)} → {fmtTime(routineTargets.waketime)} target.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={S.formRow}><label style={S.formLabel}>Bedtime</label><input type="time" style={S.input} value={logBed} onChange={e => setLogBed(e.target.value)} /></div>
              <div style={S.formRow}><label style={S.formLabel}>Wake time</label><input type="time" style={S.input} value={logWake} onChange={e => setLogWake(e.target.value)} /></div>
              {logBed && logWake && (() => {
                const dur = sleepDur(logBed, logWake);
                const score = calcSleepScore(logBed, logWake, dur, routineTargets);
                const vs = dur - sleepDur(routineTargets.bedtime, routineTargets.waketime);
                return (
                  <div style={{ background: "var(--r-surf2)", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--r-info)", fontFamily: "var(--r-hero)" }}>{fmtDur(dur)}</div>
                      <div style={{ fontSize: 11, color: vs >= 0 ? "var(--r-success)" : "var(--r-danger)", marginTop: 3 }}>{vs >= 0 ? "+" : "-"}{fmtDur(Math.abs(vs))} vs target</div>
                    </div>
                    <CircleRing value={score} size={60} strokeWidth={6} />
                  </div>
                );
              })()}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button style={{ ...S.primaryBtn, flex: 1 }} onClick={submitSleepLog} disabled={!logBed || !logWake}>Save</button>
              <button style={{ ...S.primaryBtn, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)", flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {modal === "panic" && (
        <div style={S.overlay} onClick={() => setModal(null)}>
          <div style={{ ...S.modalBox, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
              {["Crisis tools", "My reminders"].map((label, i) => (<div key={i} style={{ flex: 1, padding: "5px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500, textAlign: "center", background: panicStep === i ? (i === 0 ? "var(--r-danger)" : "var(--r-caution)") : "var(--r-surf2)", color: panicStep === i ? (i === 0 ? "#fff" : "#fff") : "var(--r-fg2)" }}>{i + 1} — {label}</div>))}
            </div>
            {panicStep === 0 && (<>
              <div style={S.modalTitle}>You are stronger than this craving</div>
              <p style={S.modalSub}>Cravings peak within 20 minutes then drop. Try one of these right now:</p>
              {BUILTIN_RELAPSE_TOOLS.slice(0, 4).map(a => (<div key={a.id} style={{ ...S.actionCard, marginBottom: 8 }}><div style={{ color: "var(--r-accent)" }} aria-hidden="true"><i className={a.icon} style={{ fontSize: 20 }} /></div><div><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{a.title}</div><div style={{ fontSize: 13, color: "var(--r-fg2)", lineHeight: 1.5 }}>{a.desc}</div></div></div>))}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button style={{ ...S.primaryBtn, background: "var(--r-caution)", color: "#fff", flex: 1 }} onClick={() => setPanicStep(1)}>Read my reminders →</button>
                <button style={{ ...S.primaryBtn, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)", flex: 1 }} onClick={() => setModal(null)}>I'm okay now</button>
              </div>
            </>)}
            {panicStep === 1 && (<>
              <div style={S.modalTitle}>Remember why you started</div>
              {reminders.length === 0 ? (<div style={{ ...S.card, textAlign: "center" }}><p style={{ color: "var(--r-fg2)", fontSize: 13 }}>No reminders saved yet.</p><button style={{ ...S.linkBtn, marginTop: 8 }} onClick={() => { setModal(null); setView("goals"); }}>Add reminders in Goals →</button></div>) : reminders.map(r => (<div key={r.id} style={{ background: "rgba(245,158,11,0.07)", border: "0.5px solid rgba(245,158,11,0.2)", borderRadius: 9, padding: "12px 14px", marginBottom: 8 }}><p style={{ fontSize: 14, color: "var(--r-caution)", fontStyle: "italic", margin: 0, lineHeight: 1.65 }}>"{r.text}"</p></div>))}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button style={{ ...S.primaryBtn, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)", flex: 1 }} onClick={() => setPanicStep(0)}>← Back</button>
                <button style={{ ...S.primaryBtn, background: "#dc2626", flex: 1 }} onClick={() => setModal("relapseLog")}>Log relapse</button>
                <button style={{ ...S.primaryBtn, background: "var(--r-accent)", color: "#fff", flex: 1 }} onClick={() => setModal(null)}>I made it ✓</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {modal === "relapseLog" && (
        <div style={S.overlay} onClick={() => setModal(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Log a relapse</div>
            <p style={S.modalSub}>This resets your counter. Every relapse teaches something — you'll be taken through your post-relapse protocol next.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {BUILTIN_RELAPSE_TOOLS.map(a => (<label key={a.id} style={{ display: "flex", alignItems: "center", cursor: "pointer", color: "#bbb", fontSize: 13 }}><input type="checkbox" checked={checkedTools.includes(a.title)} onChange={e => setCheckedTools(e.target.checked ? [...checkedTools, a.title] : checkedTools.filter(x => x !== a.title))} style={{ marginRight: 8 }} />{a.icon} {a.title}</label>))}
            </div>
            <textarea style={S.textarea} placeholder="What happened? (optional)" value={relapseNote} onChange={e => setRN(e.target.value)} rows={3} />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button style={{ ...S.primaryBtn, background: "#dc2626", flex: 1 }} onClick={logRelapse}>Record &amp; start protocol</button>
              <button style={{ ...S.primaryBtn, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)", flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {modal === "postRelapse" && (
        <div style={S.overlay}>
          <div style={{ ...S.modalBox, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, color: "var(--r-danger)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Post-relapse protocol</div>
            <div style={S.modalTitle}>What to do right now</div>
            <p style={S.modalSub}>Work through each action below. Take your time — there's no rush. Tick each one off as you complete it.</p>
            <div style={{ fontSize: 11, color: "#5B4A6A", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Immediate actions</div>
            {postRelapseActions.length === 0 && (<div style={{ ...S.empty, marginBottom: 12 }}>No custom actions set. <button style={S.linkBtn} onClick={() => { setModal(null); setView("relapse"); }}>Add them in the Relapse tab →</button></div>)}
            {postRelapseActions.map(a => {
              const done = checkedPost.includes(a.id);
              return (<div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12, padding: "12px 14px", borderRadius: 10, background: done ? "rgba(52,211,153,0.07)" : "var(--r-surf2)", border: `0.5px solid ${done ? "#234C5E44" : "var(--r-surf2)"}`, cursor: "pointer" }} onClick={() => setCheckedPost(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])}>
                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${done ? "var(--r-success)" : "var(--r-bord)"}`, background: done ? "var(--r-success)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{done && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}</div>
                <span style={{ fontSize: 14, lineHeight: 1.55, textDecoration: done ? "line-through" : "none", opacity: done ? 0.5 : 1, color: done ? "var(--r-fg2)" : "#ddd" }}>{a.text}</span>
              </div>);
            })}
            {postRelapseReminders.length > 0 && (<>
              <div style={{ fontSize: 11, color: "var(--r-caution)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "16px 0 10px" }}>Remember this</div>
              {postRelapseReminders.map(r => (<div key={r.id} style={{ background: "rgba(245,158,11,0.06)", border: "0.5px solid rgba(245,158,11,0.18)", borderRadius: 9, padding: "12px 14px", marginBottom: 8 }}><p style={{ fontSize: 14, color: "var(--r-caution)", fontStyle: "italic", margin: 0, lineHeight: 1.65 }}>"{r.text}"</p></div>))}
            </>)}
            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--r-fg2)", marginBottom: 4 }}><span>Actions completed</span><span>{checkedPost.length}/{postRelapseActions.length}</span></div>
              <div style={S.progressBg}><div style={{ ...S.progressBar, width: `${postRelapseActions.length ? Math.round(checkedPost.length / postRelapseActions.length * 100) : 0}%`, background: "var(--r-success)" }} /></div>
            </div>
            <button style={{ ...S.primaryBtn, background: "var(--r-accent)", color: "#fff", marginTop: 8 }} onClick={() => { setModal(null); setCheckedPost([]); setView("dashboard"); }}>
              {checkedPost.length >= postRelapseActions.length ? "Protocol complete — back to dashboard ✓" : "I'm done for now"}
            </button>
          </div>
        </div>
      )}
      {/* ── Habit add/edit modal ── */}
      {habitModal && habitDraft && (
        <div style={S.overlay} onClick={() => setHabitModal(null)}>
          <div style={{ ...S.modalBox, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>{habitModal === "add" ? "Add habit" : "Edit habit"}</div>

            <div style={S.formRow}>
              <label style={S.formLabel}>Name</label>
              <input style={S.input} placeholder="Habit name…" value={habitDraft.name} onChange={e => setHabitDraft(d => ({ ...d, name: e.target.value }))} autoFocus />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ ...S.formLabel, marginBottom: 6 }}>Category</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.keys(CAT_HEX).map(cat => (
                  <button key={cat} style={{ ...S.catBtn, background: habitDraft.category === cat ? CAT_HEX[cat] + "33" : "transparent", borderColor: CAT_HEX[cat], color: CAT_HEX[cat] }} onClick={() => setHabitDraft(d => ({ ...d, category: cat }))}>{cat}</button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ ...S.formLabel, marginBottom: 6 }}>Days (leave blank = every day)</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DAY_NAMES.map(day => (
                  <button key={day} style={{ ...S.catBtn, borderColor: habitDraft.days.includes(day) ? accentColor : "var(--r-bord)", color: habitDraft.days.includes(day) ? accentColor : "var(--r-fg2)", background: habitDraft.days.includes(day) ? accentColor + "22" : "transparent" }}
                    onClick={() => setHabitDraft(d => ({ ...d, days: d.days.includes(day) ? d.days.filter(x => x !== day) : [...d.days, day] }))}>
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ ...S.formLabel, marginBottom: 6 }}>Scheduled times (optional)</div>
              {habitDraft.scheduledTimes.map((t, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <input type="time" style={{ ...S.input, flex: 1 }} value={t} onChange={e => setHabitDraft(d => ({ ...d, scheduledTimes: d.scheduledTimes.map((x, i) => i === idx ? e.target.value : x) }))} />
                  <button style={S.deleteBtn} onClick={() => setHabitDraft(d => ({ ...d, scheduledTimes: d.scheduledTimes.filter((_, i) => i !== idx) }))}>×</button>
                </div>
              ))}
              <button style={{ ...S.linkBtn, fontSize: 12 }} onClick={() => setHabitDraft(d => ({ ...d, scheduledTimes: [...d.scheduledTimes, ""] }))}>+ Add time</button>
            </div>

            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <button style={{ ...S.catBtn, borderColor: habitDraft.levelsEnabled ? "#5B4A6A" : "var(--r-bord)", color: habitDraft.levelsEnabled ? "#5B4A6A" : "var(--r-fg2)", background: habitDraft.levelsEnabled ? "rgba(167,139,250,0.12)" : "transparent", padding: "6px 14px" }}
                onClick={() => toggleLevelsEnabled(!habitDraft.levelsEnabled)}>
                {habitDraft.levelsEnabled ? "✓ Levels on" : "Enable levels"}
              </button>
              <span style={{ fontSize: 11, color: "var(--r-bord)" }}>build intensity progressively</span>
            </div>

            {habitDraft.levelsEnabled && (
              <div style={{ marginTop: 12 }}>
                <div style={{ ...S.formLabel, marginBottom: 8 }}>Levels</div>
                {habitDraft.levels.map((lvl, idx) => {
                  const isLast = idx === habitDraft.levels.length - 1;
                  return (
                    <div key={lvl.level} style={{ background: "var(--r-bord)", border: "0.5px solid #1a1a1e", borderRadius: 9, padding: "12px", marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: "#5B4A6A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Level {lvl.level}</span>
                        {habitDraft.levels.length > 1 && <button style={S.deleteBtn} onClick={() => removeHabitLevel(lvl.level)}>×</button>}
                      </div>
                      <input style={{ ...S.input, marginBottom: 6 }} placeholder="Level name (optional, e.g. Starter)" value={lvl.name} onChange={e => updateHabitLevel(idx, "name", e.target.value)} />
                      <input style={{ ...S.input, marginBottom: 8 }} placeholder="What to do at this level…" value={lvl.description} onChange={e => updateHabitLevel(idx, "description", e.target.value)} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {!isLast && (
                          <div style={S.formRow}>
                            <label style={S.formLabel}>Level up: min/week</label>
                            <input type="number" min="1" style={S.input} value={lvl.upPerWeek ?? ""} onChange={e => updateHabitLevel(idx, "upPerWeek", e.target.value !== "" ? Number(e.target.value) : null)} />
                          </div>
                        )}
                        {idx > 0 && (
                          <div style={S.formRow}>
                            <label style={S.formLabel}>Level down: drop below/week</label>
                            <input type="number" min="0" style={S.input} value={lvl.downPerWeek ?? ""} onChange={e => updateHabitLevel(idx, "downPerWeek", e.target.value !== "" ? Number(e.target.value) : null)} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button style={{ ...S.primaryBtn, background: "var(--r-bord)", color: "#5B4A6A", border: "0.5px solid rgba(167,139,250,0.25)", marginTop: 2 }} onClick={addHabitLevel}>+ Add level</button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button style={{ ...S.primaryBtn, flex: 1 }} onClick={saveHabit} disabled={!habitDraft.name.trim()}>
                {habitModal === "add" ? "Add habit" : "Save changes"}
              </button>
              <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => setHabitModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bad habit add/edit modal ── */}
      {badHabitModal && badHabitDraft && (
        <div style={S.overlay} onClick={() => setBadHabitModal(null)}>
          <div style={{ ...S.modalBox, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>{badHabitModal === "add" ? "Add bad habit" : "Edit bad habit"}</div>

            <div style={S.formRow}>
              <label style={S.formLabel}>Name</label>
              <input style={S.input} placeholder="e.g. Scrolling in bed" value={badHabitDraft.name} onChange={e => setBadHabitDraft(d => ({ ...d, name: e.target.value }))} autoFocus />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ ...S.formLabel, marginBottom: 6 }}>Track by</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["days", "Days — daily streaks"], ["hours", "Hours — for frequent urges"]].map(([val, label]) => (
                  <button key={val} onClick={() => setBadHabitDraft(d => ({ ...d, unit: val }))}
                    style={{ flex: 1, padding: "8px 10px", borderRadius: 7, border: `1px solid ${badHabitDraft.unit === val ? accentColor : "var(--r-bord)"}`, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--r-font)", background: badHabitDraft.unit === val ? accentColor + "18" : "transparent", color: badHabitDraft.unit === val ? accentColor : "var(--r-fg2)" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12, ...S.formRow }}>
              <label style={S.formLabel}>Trigger / cue (optional)</label>
              <input style={S.input} placeholder="What sets this off?" value={badHabitDraft.trigger} onChange={e => setBadHabitDraft(d => ({ ...d, trigger: e.target.value }))} />
            </div>

            <div style={{ marginTop: 12, ...S.formRow }}>
              <label style={S.formLabel}>Replacement behaviour (optional)</label>
              <input style={S.input} placeholder="What will you do instead?" value={badHabitDraft.replacement} onChange={e => setBadHabitDraft(d => ({ ...d, replacement: e.target.value }))} />
            </div>

            <div style={{ marginTop: 12, ...S.formRow }}>
              <label style={S.formLabel}>If-then plan (optional)</label>
              <input style={S.input} placeholder="If [trigger], I will…" value={badHabitDraft.ifThen} onChange={e => setBadHabitDraft(d => ({ ...d, ifThen: e.target.value }))} />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button style={{ ...S.primaryBtn, flex: 1 }} onClick={() => {
                if (!badHabitDraft.name.trim()) return;
                if (badHabitModal === "add") {
                  upd({ badHabits: [...badHabits, { ...badHabitDraft, id: "bh" + Date.now(), name: badHabitDraft.name.trim(), startTs: Date.now(), slips: [], resisted: [] }] });
                } else {
                  upd({ badHabits: badHabits.map(x => x.id !== badHabitEditId ? x : { ...x, ...badHabitDraft, name: badHabitDraft.name.trim() }) });
                }
                setBadHabitModal(null); setBadHabitDraft(null); setBadHabitEditId(null);
              }}>Save</button>
              <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => { setBadHabitModal(null); setBadHabitDraft(null); setBadHabitEditId(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Slip modal ── */}
      {slipModal && (
        <div style={S.overlay} onClick={() => setSlipModal(null)}>
          <div style={{ ...S.modalBox, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Log a slip</div>
            <div style={{ ...S.modalSub, marginBottom: 14 }}>Your streak resets. That's okay — awareness is progress.</div>
            <div style={S.formRow}>
              <label style={S.formLabel}>Note (optional)</label>
              <textarea style={S.textarea} rows={3} placeholder="What happened? What triggered it?" value={slipNote} onChange={e => setSlipNote(e.target.value)} autoFocus />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button style={{ ...S.primaryBtn, flex: 1, background: "#8C3F3018", color: "var(--r-danger)", border: "1px solid #8C3F3033" }} onClick={() => {
                upd({ badHabits: badHabits.map(x => x.id !== slipModal ? x : { ...x, slips: [...(x.slips || []), { id: "s" + Date.now(), ts: Date.now(), note: slipNote.trim() }] }) });
                setSlipModal(null); setSlipNote("");
              }}>Confirm slip</button>
              <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => setSlipModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule activity modal ── */}
      {schedActModal && schedActDraft && (
        <div style={S.overlay} onClick={() => setSchedActModal(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Add activity</div>

            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[["recurring", "Recurring"], ["oneTime", "One-time (this week)"]].map(([t, label]) => (
                <button key={t} style={{ flex: 1, padding: "8px 10px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--r-font)", background: schedActDraft.type === t ? "var(--r-info)" : "var(--r-surf2)", color: schedActDraft.type === t ? "#fff" : "var(--r-fg2)" }}
                  onClick={() => setSchedActDraft(d => ({ ...d, type: t }))}>
                  {label}
                </button>
              ))}
            </div>

            <div style={S.formRow}>
              <label style={S.formLabel}>Name</label>
              <input style={S.input} placeholder="Activity name…" value={schedActDraft.name} onChange={e => setSchedActDraft(d => ({ ...d, name: e.target.value }))} autoFocus />
            </div>

            {schedActDraft.type === "recurring" && (<>
              <div style={{ marginTop: 12 }}>
                <div style={{ ...S.formLabel, marginBottom: 6 }}>Days (leave blank = daily)</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {DAY_NAMES.map(day => (
                    <button key={day} style={{ ...S.catBtn, borderColor: schedActDraft.days.includes(day) ? "var(--r-info)" : "var(--r-bord)", color: schedActDraft.days.includes(day) ? "var(--r-info)" : "var(--r-fg2)", background: schedActDraft.days.includes(day) ? "rgba(96,165,250,0.12)" : "transparent" }}
                      onClick={() => setSchedActDraft(d => ({ ...d, days: d.days.includes(day) ? d.days.filter(x => x !== day) : [...d.days, day] }))}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 12, ...S.formRow }}>
                <label style={S.formLabel}>Time (optional)</label>
                <input type="time" style={S.input} value={schedActDraft.times[0] || ""} onChange={e => setSchedActDraft(d => ({ ...d, times: e.target.value ? [e.target.value] : [] }))} />
              </div>
            </>)}

            {schedActDraft.type === "oneTime" && (<>
              <div style={{ marginTop: 12, ...S.formRow }}>
                <label style={S.formLabel}>Date</label>
                <input type="date" style={S.input} value={schedActDraft.date} onChange={e => setSchedActDraft(d => ({ ...d, date: e.target.value }))} />
              </div>
              <div style={{ marginTop: 10, ...S.formRow }}>
                <label style={S.formLabel}>Time (optional)</label>
                <input type="time" style={S.input} value={schedActDraft.time} onChange={e => setSchedActDraft(d => ({ ...d, time: e.target.value }))} />
              </div>
            </>)}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button style={{ ...S.primaryBtn, flex: 1 }} onClick={addSchedActivity} disabled={!schedActDraft.name.trim()}>Add</button>
              <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => setSchedActModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════ BUSINESS SECTION ════════════════════════ */}
      {section === "business" && (() => {
        const today = getTodayStr();
        const todayName = BIZ_ALL_DAYS[new Date().getDay()];
        const todayLow = todayName.toLowerCase();
        const todayGroups = bizGroups.filter(g => bizMatchesToday(g, todayName, today));
        const todayOneOnes = bizOneOnes.filter(o => bizMatchesToday(o, todayName, today));
        const totalOwed = bizMembers.reduce((t,m) => t + Math.max(0, m.classes_attended*m.rate - m.total_paid), 0)
          + bizOneOnes.reduce((t,o) => t + Math.max(0, o.classes_attended*o.rate - o.total_paid), 0);
        const totalEarned = bizMembers.reduce((t,m) => t + m.total_paid, 0) + bizOneOnes.reduce((t,o) => t + o.total_paid, 0);

        const BizBtn = ({ children, style, ...p }) => (
          <button style={{ border: "0.5px solid var(--r-bord)", background: "var(--r-surf2)", color: "var(--r-fg)", borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--r-font,'Inter',system-ui,sans-serif)", transition: "background 0.15s", ...style }} {...p}>{children}</button>
        );
        const BizPrimBtn = ({ children, style, ...p }) => (
          <button style={{ background: BIZ_BLUE, color: "#fff", border: "none", borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--r-font,'Inter',system-ui,sans-serif)", ...style }} {...p}>{children}</button>
        );

        return (
          <div style={S.content}>
            {bizLoading && <div style={{ color: "var(--r-fg2)", fontSize: 13, marginBottom: 16 }}>Loading…</div>}

            {/* ── DASHBOARD ── */}
            {bizView === "biz-dashboard" && (<>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h2 style={{ ...S.pageTitle, marginBottom: 2 }}>Dashboard</h2>
                  <div style={{ fontSize: 12, color: "var(--r-fg2)" }}>Today is {todayName}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <BizBtn onClick={() => bizOpenModal("student", { name:"", school:"", enrolled_classes:"" })}>+ Student</BizBtn>
                  <BizBtn onClick={() => bizOpenModal("group", { name:"", schedules:[{day:"",time:""}], status:"active" })}>+ Group</BizBtn>
                  <BizPrimBtn onClick={() => bizOpenModal("oneone", { student_name:"", subject:"", rate:"", schedules:[{day:"",time:""}], status:"active", classes_attended:0, total_paid:0 })}>+ 1-on-1</BizPrimBtn>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
                <BizStatCard label="Today's Classes" value={todayGroups.length + todayOneOnes.length} sub={todayName} />
                <BizStatCard label="Outstanding" value={bizFmt$(totalOwed)} color={totalOwed > 0 ? BIZ_ORANGE : BIZ_GREEN} sub="Unpaid balance" />
                <BizStatCard label="Collected" value={bizFmt$(totalEarned)} color={BIZ_GREEN} sub="All time" />
                <BizStatCard label="Students" value={bizStudents.length} color={BIZ_BLUE} sub="Total roster" />
              </div>

              {todayGroups.length === 0 && todayOneOnes.length === 0 ? (
                <div style={{ ...S.card, textAlign: "center", padding: "48px 24px" }}>
                  <div style={{ fontSize: 30, marginBottom: 12, color: "var(--r-fg3)" }} aria-hidden="true"><i className="ph ph-calendar-blank" /></div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--r-fg2)" }}>No classes scheduled for {todayName}</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Today — {todayName} · {todayGroups.length + todayOneOnes.length} class{todayGroups.length+todayOneOnes.length !== 1 ? "es" : ""}</div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 12, marginBottom: 20 }}>
                    {todayGroups.map(g => {
                      const gm = bizMembers.filter(m => m.group_id === g.id);
                      const overdue = gm.reduce((t,m) => t + Math.max(0, m.classes_attended*m.rate - m.total_paid), 0);
                      return (
                        <div key={g.id} style={{ ...S.card, cursor: "pointer", borderLeft: `3px solid ${BIZ_BLUE}` }} onClick={() => bizGoTo("biz-group-detail", { groupId: g.id })}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>{g.name}</div>
                              <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 2 }}>{g.rescheduled_to?.date===today ? `Rescheduled · ${fmtTime(g.rescheduled_to.time)}` : bizFmtSchedules(g)}</div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: overdue > 0 ? BIZ_ORANGE : BIZ_GREEN, background: (overdue > 0 ? BIZ_ORANGE : BIZ_GREEN) + "18", padding: "2px 8px", borderRadius: 5, flexShrink: 0 }}>{overdue > 0 ? `${bizFmt$(overdue)} due` : "Paid"}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--r-fg2)", marginBottom: 10 }}>{gm.length} student{gm.length!==1?"s":""}</div>
                          <div style={{ display: "flex", gap: 6, borderTop: "0.5px solid var(--r-bord)", paddingTop: 10 }}>
                            <BizBtn style={{ flex: 1, justifyContent: "center" }} onClick={e => { e.stopPropagation(); bizAddClass("group", g.id, g.name); }}>+ Class</BizBtn>
                            <BizBtn style={{ flex: 1, justifyContent: "center" }} onClick={e => { e.stopPropagation(); setBizReschedTarget({ targetType: "group", targetId: g.id, name: g.name }); bizOpenModal("reschedule", { date: g.rescheduled_to?.date||"", time: g.rescheduled_to?.time||"" }); }}>Reschedule</BizBtn>
                            <BizPrimBtn style={{ flex: 1, justifyContent: "center" }} onClick={e => { e.stopPropagation(); bizGoTo("biz-group-detail", { groupId: g.id }); }}>View →</BizPrimBtn>
                          </div>
                        </div>
                      );
                    })}
                    {todayOneOnes.map(o => {
                      const overdue = Math.max(0, o.classes_attended * o.rate - o.total_paid);
                      return (
                        <div key={o.id} style={{ ...S.card, cursor: "pointer", borderLeft: `3px solid ${BIZ_PURPLE}` }} onClick={() => bizGoTo("biz-oneone-detail", { oneOneId: o.id })}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>{o.student_name}</div>
                              <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 2 }}>{o.subject} · {o.rescheduled_to?.date===today ? `Rescheduled · ${fmtTime(o.rescheduled_to.time)}` : bizFmtSchedules(o)}</div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: overdue > 0 ? BIZ_ORANGE : BIZ_GREEN, background: (overdue > 0 ? BIZ_ORANGE : BIZ_GREEN) + "18", padding: "2px 8px", borderRadius: 5, flexShrink: 0 }}>{overdue > 0 ? `${bizFmt$(overdue)} due` : "Paid"}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--r-fg2)", marginBottom: 10 }}>{bizFmt$(o.rate)}/class</div>
                          <div style={{ display: "flex", gap: 6, borderTop: "0.5px solid var(--r-bord)", paddingTop: 10 }}>
                            <BizBtn style={{ flex: 1, justifyContent: "center" }} onClick={e => { e.stopPropagation(); bizAddClass("oneone", o.id, o.student_name); }}>+ Class</BizBtn>
                            <BizBtn style={{ flex: 1, justifyContent: "center" }} onClick={e => { e.stopPropagation(); setBizReschedTarget({ targetType: "oneone", targetId: o.id, name: o.student_name }); bizOpenModal("reschedule", { date: o.rescheduled_to?.date||"", time: o.rescheduled_to?.time||"" }); }}>Reschedule</BizBtn>
                            <BizPrimBtn style={{ flex: 1, justifyContent: "center" }} onClick={e => { e.stopPropagation(); bizGoTo("biz-oneone-detail", { oneOneId: o.id }); }}>View →</BizPrimBtn>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Students</div>
                <button style={S.linkBtn} onClick={() => bizGoTo("biz-students")}>All students →</button>
              </div>
              {bizStudents.length === 0 ? (
                <div style={S.card}><BizEmptyState icon="ph ph-user" title="No students yet" sub="Add your first student above." /></div>
              ) : (
                <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr style={{ borderBottom: "0.5px solid var(--r-bord)" }}>
                      {["Name","School","Classes","Total Due",""].map(h => <th key={h} style={{ textAlign: "left", padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {bizStudents.slice(0,5).map((s, i) => {
                        const sMembers = bizMembers.filter(m => m.student_name === s.name);
                        const sOO = bizOneOnes.filter(o => o.student_name === s.name);
                        const due = sMembers.reduce((t,m) => t + Math.max(0, m.classes_attended*m.rate - m.total_paid), 0)
                          + sOO.reduce((t,o) => t + Math.max(0, o.classes_attended*o.rate - o.total_paid), 0);
                        return <tr key={s.id} style={{ borderBottom: "0.5px solid var(--r-bord)" }}>
                          <td style={{ padding: "10px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><BizAvatar name={s.name} idx={i} sz={26} /><span style={{ fontWeight: 500 }}>{s.name}</span></div></td>
                          <td style={{ padding: "10px 14px", color: "var(--r-fg2)", fontSize: 12 }}>{s.school||"—"}</td>
                          <td style={{ padding: "10px 14px", color: "var(--r-fg2)", fontSize: 12 }}>{s.enrolled_classes||"—"}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: due > 0 ? BIZ_RED : BIZ_GREEN, fontVariantNumeric: "tabular-nums" }}>{bizFmt$(due)}</td>
                          <td style={{ padding: "10px 14px", textAlign: "right" }}><button style={S.linkBtn} onClick={() => bizOpenModal("student", { name:s.name, school:s.school||"", enrolled_classes:s.enrolled_classes||"" }, s.id)}>Edit</button></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>)}

            {/* ── STUDENTS ── */}
            {bizView === "biz-students" && (<>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={S.pageTitle}>Students</h2>
                <BizPrimBtn onClick={() => bizOpenModal("student", { name:"", school:"", enrolled_classes:"" })}>+ Add Student</BizPrimBtn>
              </div>
              {bizStudents.length === 0 ? <div style={S.card}><BizEmptyState icon="ph ph-user" title="No students yet" sub="Add your first student to get started." /></div> : (
                <div style={{ ...S.card, padding: 0, overflow: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
                    <thead><tr style={{ borderBottom: "0.5px solid var(--r-bord)", background: "var(--r-surf2)" }}>
                      {["Name","School","Enrolled In","Group Due","1-on-1 Due","Total Due",""].map(h => <th key={h} style={{ textAlign: "left", padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {bizStudents.map((s, i) => {
                        const sm = bizMembers.filter(m => m.student_name === s.name);
                        const so = bizOneOnes.filter(o => o.student_name === s.name);
                        const gDue = sm.reduce((t,m) => t + Math.max(0, m.classes_attended*m.rate - m.total_paid), 0);
                        const oDue = so.reduce((t,o) => t + Math.max(0, o.classes_attended*o.rate - o.total_paid), 0);
                        const total = gDue + oDue;
                        return <tr key={s.id} style={{ borderBottom: "0.5px solid var(--r-bord)" }}>
                          <td style={{ padding: "10px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><BizAvatar name={s.name} idx={i} sz={28} /><span style={{ fontWeight: 500 }}>{s.name}</span></div></td>
                          <td style={{ padding: "10px 14px", color: "var(--r-fg2)" }}>{s.school||"—"}</td>
                          <td style={{ padding: "10px 14px", color: "var(--r-fg2)" }}>{s.enrolled_classes||"—"}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: gDue > 0 ? BIZ_RED : "var(--r-fg2)", fontVariantNumeric: "tabular-nums" }}>{gDue > 0 ? bizFmt$(gDue) : "—"}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: oDue > 0 ? BIZ_RED : "var(--r-fg2)", fontVariantNumeric: "tabular-nums" }}>{oDue > 0 ? bizFmt$(oDue) : "—"}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: total > 0 ? BIZ_RED : BIZ_GREEN, fontVariantNumeric: "tabular-nums" }}>{bizFmt$(total)}</td>
                          <td style={{ padding: "10px 14px", textAlign: "right" }}>
                            <button style={S.linkBtn} onClick={() => bizOpenModal("student", { name:s.name, school:s.school||"", enrolled_classes:s.enrolled_classes||"" }, s.id)}>Edit</button>
                            <button style={{ ...S.linkBtn, color: "var(--r-danger)", marginLeft: 8 }} onClick={() => { setBizConfirm({ title: `Delete ${s.name}?`, msg: "Removes student profile. Class records remain.", onConfirm: () => bizDeleteStudent(s.id) }); setBizModal("confirm"); }}>Del</button>
                          </td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>)}

            {/* ── GROUPS ── */}
            {bizView === "biz-groups" && (<>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={S.pageTitle}>Group Classes</h2>
                <BizPrimBtn onClick={() => bizOpenModal("group", { name:"", schedules:[{day:"",time:""}], status:"active" })}>+ Create Group</BizPrimBtn>
              </div>
              {bizGroups.length === 0 ? <div style={S.card}><BizEmptyState icon="ph ph-users-three" title="No group classes yet" sub="Create your first group class." /></div> : (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
                  {bizGroups.map(g => {
                    const gm = bizMembers.filter(m => m.group_id === g.id);
                    const overdue = gm.reduce((t,m) => t + Math.max(0, m.classes_attended*m.rate - m.total_paid), 0);
                    const collected = gm.reduce((t,m) => t + m.total_paid, 0);
                    return (
                      <div key={g.id} style={{ ...S.card, cursor: "pointer", opacity: g.status==="inactive" ? 0.65 : 1 }} onClick={() => bizGoTo("biz-group-detail", { groupId: g.id })}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                              <span style={{ fontSize: 14, fontWeight: 600 }}>{g.name}</span>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: g.status==="inactive" ? "rgba(255,255,255,0.06)" : BIZ_GREEN+"18", color: g.status==="inactive" ? "var(--r-fg2)" : BIZ_GREEN }}>{g.status==="inactive"?"Inactive":"Active"}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--r-fg2)" }}>{bizFmtSchedules(g)}</div>
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button style={S.linkBtn} onClick={e => { e.stopPropagation(); bizOpenModal("group", { name:g.name, schedules: bizGetSchedules(g), status:g.status }, g.id); }}>Edit</button>
                            <button style={{ ...S.linkBtn, color: "var(--r-danger)" }} onClick={e => { e.stopPropagation(); setBizConfirm({ title: `Delete "${g.name}"?`, msg: "Deletes group and all member records.", onConfirm: () => bizDeleteGroup(g.id) }); setBizModal("confirm"); }}>Del</button>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderTop: "0.5px solid var(--r-bord)", paddingTop: 12 }}>
                          <div><div style={{ fontSize: 16, fontWeight: 700 }}>{gm.length}</div><div style={{ fontSize: 10, color: "var(--r-fg2)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>Students</div></div>
                          <div><div style={{ fontSize: 16, fontWeight: 700, color: overdue>0?BIZ_ORANGE:BIZ_GREEN, fontVariantNumeric: "tabular-nums" }}>{bizFmt$(overdue)}</div><div style={{ fontSize: 10, color: "var(--r-fg2)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>Overdue</div></div>
                          <div><div style={{ fontSize: 16, fontWeight: 700, color: BIZ_GREEN, fontVariantNumeric: "tabular-nums" }}>{bizFmt$(collected)}</div><div style={{ fontSize: 10, color: "var(--r-fg2)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>Paid</div></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>)}

            {/* ── GROUP DETAIL ── */}
            {bizView === "biz-group-detail" && (() => {
              const g = bizGroups.find(x => x.id === bizGroupId);
              if (!g) return <div style={{ color: "var(--r-fg2)", fontSize: 13 }}>Group not found.</div>;
              const gm = bizMembers.filter(m => m.group_id === g.id);
              const totalOwedG = gm.reduce((t,m) => t + m.classes_attended*m.rate, 0);
              const totalPaidG = gm.reduce((t,m) => t + m.total_paid, 0);
              const totalOverdueG = gm.reduce((t,m) => t + Math.max(0, m.classes_attended*m.rate - m.total_paid), 0);
              return (<>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <button style={S.linkBtn} onClick={() => bizGoTo("biz-groups")}>← Groups</button>
                    <h2 style={{ ...S.pageTitle, marginTop: 4 }}>{g.name}</h2>
                    <div style={{ fontSize: 12, color: "var(--r-fg2)" }}>{bizFmtSchedules(g)}{g.status==="inactive"?" · Inactive":""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <BizBtn onClick={() => bizOpenModal("group", { name:g.name, schedules: bizGetSchedules(g), status:g.status }, g.id)}>Edit</BizBtn>
                    <BizBtn onClick={() => { setBizReschedTarget({ targetType: "group", targetId: g.id, name: g.name }); bizOpenModal("reschedule", { date: g.rescheduled_to?.date||"", time: g.rescheduled_to?.time||"" }); }}>Reschedule</BizBtn>
                    <BizBtn onClick={() => { setBizMemberGroupId(g.id); bizOpenModal("member", { student_name:"", rate:"", classes_attended:0, total_paid:0 }); }}>+ Member</BizBtn>
                    <BizPrimBtn onClick={() => bizAddClass("group", g.id, g.name)}>+ Class</BizPrimBtn>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
                  <BizStatCard label="Members" value={gm.length} />
                  <BizStatCard label="Total Owed" value={bizFmt$(totalOwedG)} />
                  <BizStatCard label="Collected" value={bizFmt$(totalPaidG)} color={BIZ_GREEN} />
                  <BizStatCard label="Overdue" value={bizFmt$(totalOverdueG)} color={totalOverdueG>0?BIZ_RED:BIZ_GREEN} />
                </div>
                {gm.length === 0 ? <div style={S.card}><BizEmptyState icon="ph ph-user" title="No members yet" sub='Click "+ Member" to add students to this group.' /></div> : (
                  <div style={{ ...S.card, padding: 0, overflow: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
                      <thead><tr style={{ borderBottom: "0.5px solid var(--r-bord)", background: "var(--r-surf2)" }}>
                        {["Student","Rate","Classes","Owed","Paid","Overdue",""].map(h => <th key={h} style={{ textAlign: "left", padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {gm.map((m, i) => {
                          const owed = m.classes_attended * m.rate;
                          const overdue = Math.max(0, owed - m.total_paid);
                          return <tr key={m.id} style={{ borderBottom: "0.5px solid var(--r-bord)" }}>
                            <td style={{ padding: "10px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><BizAvatar name={m.student_name} idx={i} sz={26} /><span style={{ fontWeight: 500 }}>{m.student_name}</span></div></td>
                            <td style={{ padding: "10px 14px", fontVariantNumeric: "tabular-nums" }}>{bizFmt$(m.rate)}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{m.classes_attended}</td>
                            <td style={{ padding: "10px 14px", fontVariantNumeric: "tabular-nums" }}>{bizFmt$(owed)}</td>
                            <td style={{ padding: "10px 14px", color: BIZ_GREEN, fontVariantNumeric: "tabular-nums" }}>{bizFmt$(m.total_paid)}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: overdue>0?BIZ_RED:BIZ_GREEN, fontVariantNumeric: "tabular-nums" }}>{bizFmt$(overdue)}</td>
                            <td style={{ padding: "10px 14px", textAlign: "right" }}>
                              <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                <BizPrimBtn style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => { setBizPayTarget({ targetId:m.id, targetType:"groupMember", groupId:g.id, studentName:m.student_name, rate:m.rate, isCustom:false }); bizOpenModal("payment", { date: today, note: "" }); }}>Pay</BizPrimBtn>
                                <BizBtn style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => { setBizPayTarget({ targetId:m.id, targetType:"groupMember", groupId:g.id, studentName:m.student_name, rate:m.rate, isCustom:true }); bizOpenModal("payment", { date: today, note: "", custom_amount: "" }); }}>Custom</BizBtn>
                                <button style={S.linkBtn} onClick={() => { setBizMemberGroupId(g.id); bizOpenModal("member", { student_name:m.student_name, rate:m.rate, classes_attended:m.classes_attended, total_paid:m.total_paid }, m.id); }}>Edit</button>
                                <button style={{ ...S.linkBtn, color: "var(--r-danger)" }} onClick={() => { setBizConfirm({ title: `Remove ${m.student_name}?`, msg: "Removes member. Payment records remain.", onConfirm: () => bizDeleteMember(m.id) }); setBizModal("confirm"); }}>Del</button>
                              </div>
                            </td>
                          </tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {(() => {
                  const groupSessions = bizSessions.filter(s => s.target_type === "group" && s.target_id === g.id);
                  if (!groupSessions.length) return null;
                  return (
                    <div style={{ ...S.card, padding: 0, overflow: "auto", marginTop: 16 }}>
                      <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--r-bord)", fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Session History ({groupSessions.length})</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead><tr style={{ borderBottom: "0.5px solid var(--r-bord)" }}>
                          {["Date","Note"].map(h => <th key={h} style={{ textAlign:"left", padding:"8px 14px", fontSize:10, fontWeight:700, color:"var(--r-fg2)", textTransform:"uppercase" }}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {groupSessions.map(s => <tr key={s.id} style={{ borderBottom: "0.5px solid var(--r-bord)" }}>
                            <td style={{ padding:"9px 14px", color:"var(--r-fg2)", whiteSpace:"nowrap" }}>{s.date}</td>
                            <td style={{ padding:"9px 14px" }}>{s.note||"—"}</td>
                          </tr>)}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </>);
            })()}

            {/* ── ONE-ON-ONE LIST ── */}
            {bizView === "biz-oneone" && (<>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={S.pageTitle}>One-on-One</h2>
                <BizPrimBtn onClick={() => bizOpenModal("oneone", { student_name:"", subject:"", rate:"", schedules:[{day:"",time:""}], status:"active", classes_attended:0, total_paid:0 })}>+ Create 1-on-1</BizPrimBtn>
              </div>
              {bizOneOnes.length === 0 ? <div style={S.card}><BizEmptyState icon="ph ph-user" title="No one-on-one classes yet" sub="Create your first individual class." /></div> : (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
                  {bizOneOnes.map((o, i) => {
                    const owed = o.classes_attended * o.rate;
                    const overdue = Math.max(0, owed - o.total_paid);
                    return (
                      <div key={o.id} style={{ ...S.card, cursor: "pointer", opacity: o.status==="inactive" ? 0.65 : 1 }} onClick={() => bizGoTo("biz-oneone-detail", { oneOneId: o.id })}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <BizAvatar name={o.student_name} idx={i} sz={34} />
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: 14, fontWeight: 600 }}>{o.student_name}</span>
                                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: o.status==="inactive" ? "rgba(255,255,255,0.06)" : BIZ_BLUE+"18", color: o.status==="inactive" ? "var(--r-fg2)" : BIZ_BLUE }}>{o.status==="inactive"?"Inactive":"Active"}</span>
                              </div>
                              <div style={{ fontSize: 11, color: "var(--r-fg2)" }}>{o.subject}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button style={S.linkBtn} onClick={e => { e.stopPropagation(); bizOpenModal("oneone", { student_name:o.student_name, subject:o.subject, rate:o.rate, schedules: bizGetSchedules(o), status:o.status, classes_attended:o.classes_attended, total_paid:o.total_paid }, o.id); }}>Edit</button>
                            <button style={{ ...S.linkBtn, color: "var(--r-danger)" }} onClick={e => { e.stopPropagation(); setBizConfirm({ title: `Delete 1-on-1 with ${o.student_name}?`, msg: "Deletes class and all payment records.", onConfirm: () => bizDeleteOneOne(o.id) }); setBizModal("confirm"); }}>Del</button>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--r-fg2)", marginBottom: 12 }}>{bizFmtSchedules(o)} · {bizFmt$(o.rate)}/class</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderTop: "0.5px solid var(--r-bord)", paddingTop: 12 }}>
                          <div><div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{o.classes_attended}</div><div style={{ fontSize: 10, color: "var(--r-fg2)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>Classes</div></div>
                          <div><div style={{ fontSize: 16, fontWeight: 700, color: BIZ_GREEN, fontVariantNumeric: "tabular-nums" }}>{bizFmt$(o.total_paid)}</div><div style={{ fontSize: 10, color: "var(--r-fg2)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>Paid</div></div>
                          <div><div style={{ fontSize: 16, fontWeight: 700, color: overdue>0?BIZ_ORANGE:BIZ_GREEN, fontVariantNumeric: "tabular-nums" }}>{bizFmt$(overdue)}</div><div style={{ fontSize: 10, color: "var(--r-fg2)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>Overdue</div></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>)}

            {/* ── ONE-ON-ONE DETAIL ── */}
            {bizView === "biz-oneone-detail" && (() => {
              const o = bizOneOnes.find(x => x.id === bizOneOneId);
              if (!o) return <div style={{ color: "var(--r-fg2)", fontSize: 13 }}>Class not found.</div>;
              const owed = o.classes_attended * o.rate;
              const overdue = Math.max(0, owed - o.total_paid);
              const payments = bizPayments.filter(p => p.target_id === o.id).sort((a, b) => (b.date||"").localeCompare(a.date||""));
              return (<>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <button style={S.linkBtn} onClick={() => bizGoTo("biz-oneone")}>← One-on-One</button>
                    <h2 style={{ ...S.pageTitle, marginTop: 4 }}>{o.student_name}</h2>
                    <div style={{ fontSize: 12, color: "var(--r-fg2)" }}>{o.subject} · {bizFmtSchedules(o)}{o.status==="inactive"?" · Inactive":""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <BizBtn onClick={() => bizOpenModal("oneone", { student_name:o.student_name, subject:o.subject, rate:o.rate, schedules: bizGetSchedules(o), status:o.status, classes_attended:o.classes_attended, total_paid:o.total_paid }, o.id)}>Edit</BizBtn>
                    <BizBtn onClick={() => { setBizReschedTarget({ targetType: "oneone", targetId: o.id, name: o.student_name }); bizOpenModal("reschedule", { date: o.rescheduled_to?.date||"", time: o.rescheduled_to?.time||"" }); }}>Reschedule</BizBtn>
                    <BizBtn onClick={() => { setBizPayTarget({ targetId:o.id, targetType:"oneOnOne", groupId:null, studentName:o.student_name, rate:o.rate, isCustom:false }); bizOpenModal("payment", { date: today, note: "" }); }}>Add Payment</BizBtn>
                    <BizBtn onClick={() => { setBizPayTarget({ targetId:o.id, targetType:"oneOnOne", groupId:null, studentName:o.student_name, rate:o.rate, isCustom:true }); bizOpenModal("payment", { date: today, note: "", custom_amount: "" }); }}>Custom</BizBtn>
                    <BizPrimBtn onClick={() => bizAddClass("oneone", o.id, o.student_name)}>+ Class</BizPrimBtn>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
                  <BizStatCard label="Rate" value={bizFmt$(o.rate) + "/class"} />
                  <BizStatCard label="Classes Attended" value={o.classes_attended} />
                  <BizStatCard label="Paid" value={`${bizFmt$(o.total_paid)} / ${bizFmt$(owed)}`} color={BIZ_GREEN} />
                  <BizStatCard label="Overdue" value={bizFmt$(overdue)} color={overdue>0?BIZ_RED:BIZ_GREEN} />
                </div>
                {payments.length === 0 ? (
                  <div style={S.card}><BizEmptyState icon="ph ph-receipt" title="No payments recorded" sub="Use the buttons above to log a payment." /></div>
                ) : (
                  <div style={{ ...S.card, padding: 0, overflow: "auto" }}>
                    <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--r-bord)", fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Payment History</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead><tr style={{ borderBottom: "0.5px solid var(--r-bord)" }}>
                        {["Date","Amount","Type","Note"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", textTransform: "uppercase" }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {payments.map(p => <tr key={p.id} style={{ borderBottom: "0.5px solid var(--r-bord)" }}>
                          <td style={{ padding: "9px 14px", color: "var(--r-fg2)" }}>{p.date||"—"}</td>
                          <td style={{ padding: "9px 14px", fontWeight: 600, color: BIZ_GREEN, fontVariantNumeric: "tabular-nums" }}>{bizFmt$(p.amount)}</td>
                          <td style={{ padding: "9px 14px" }}><span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: p.is_custom ? BIZ_BLUE+"18" : BIZ_GREEN+"18", color: p.is_custom ? BIZ_BLUE : BIZ_GREEN }}>{p.is_custom?"Custom":"Standard"}</span></td>
                          <td style={{ padding: "9px 14px", color: "var(--r-fg2)" }}>{p.note||"—"}</td>
                        </tr>)}
                      </tbody>
                    </table>
                  </div>
                )}
                {(() => {
                  const ooSessions = bizSessions.filter(s => s.target_type === "oneone" && s.target_id === o.id);
                  if (!ooSessions.length) return null;
                  return (
                    <div style={{ ...S.card, padding: 0, overflow: "auto", marginTop: 16 }}>
                      <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--r-bord)", fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Session History ({ooSessions.length})</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead><tr style={{ borderBottom: "0.5px solid var(--r-bord)" }}>
                          {["Date","Note"].map(h => <th key={h} style={{ textAlign:"left", padding:"8px 14px", fontSize:10, fontWeight:700, color:"var(--r-fg2)", textTransform:"uppercase" }}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {ooSessions.map(s => <tr key={s.id} style={{ borderBottom: "0.5px solid var(--r-bord)" }}>
                            <td style={{ padding:"9px 14px", color:"var(--r-fg2)", whiteSpace:"nowrap" }}>{s.date}</td>
                            <td style={{ padding:"9px 14px" }}>{s.note||"—"}</td>
                          </tr>)}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </>);
            })()}

            {/* ── SCHEDULE ── */}
            {bizView === "biz-schedule" && (<>
              <h2 style={{ ...S.pageTitle, marginBottom: 20 }}>Schedule</h2>
              {BIZ_WEEK.map(day => {
                const dayLow = day.toLowerCase();
                const isToday = day.toLowerCase() === todayLow;
                const dayGroups = bizGroups.filter(g => bizGetSchedules(g).some(s => s.day?.toLowerCase() === dayLow) && !(g.rescheduled_to?.date >= today));
                const dayOOs = bizOneOnes.filter(o => bizGetSchedules(o).some(s => s.day?.toLowerCase() === dayLow) && !(o.rescheduled_to?.date >= today));
                const reschedGroups = bizGroups.filter(g => g.rescheduled_to?.date >= today && new Date(g.rescheduled_to.date+"T12:00").toLocaleDateString("en-US",{weekday:"long"}) === day);
                const reschedOOs = bizOneOnes.filter(o => o.rescheduled_to?.date >= today && new Date(o.rescheduled_to.date+"T12:00").toLocaleDateString("en-US",{weekday:"long"}) === day);
                const items = [
                  ...dayGroups.map(g => ({ ...g, _type:"group", _time: (bizGetSchedules(g).find(s=>s.day?.toLowerCase()===dayLow)||{}).time||"" })),
                  ...dayOOs.map(o => ({ ...o, _type:"oneone", _time: (bizGetSchedules(o).find(s=>s.day?.toLowerCase()===dayLow)||{}).time||"" })),
                  ...reschedGroups.map(g => ({ ...g, _type:"group", _time: g.rescheduled_to.time||"", _rescheduled: true })),
                  ...reschedOOs.map(o => ({ ...o, _type:"oneone", _time: o.rescheduled_to.time||"", _rescheduled: true })),
                ].sort((a,b) => (a._time||"99:99").localeCompare(b._time||"99:99"));
                return (
                  <div key={day} style={{ ...S.card, padding: 0, marginBottom: 12, border: isToday ? `1px solid ${BIZ_BLUE}` : "0.5px solid var(--r-bord)" }}>
                    <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--r-bord)", display: "flex", alignItems: "center", gap: 8, background: isToday ? BIZ_BLUE + "10" : "transparent" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isToday ? "#93C5FD" : "var(--r-fg)" }}>{day}</span>
                      {isToday && <span style={{ fontSize: 10, fontWeight: 700, color: BIZ_BLUE, background: BIZ_BLUE+"18", padding: "1px 7px", borderRadius: 4 }}>Today</span>}
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--r-fg2)" }}>{items.length} class{items.length!==1?"es":""}</span>
                    </div>
                    {items.length === 0 ? <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--r-fg2)" }}>No classes scheduled</div> : items.map((item, idx) => (
                      <div key={item.id + idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderTop: idx > 0 ? "0.5px solid var(--r-bord)" : "none", cursor: "pointer" }}
                        onClick={() => item._type==="group" ? bizGoTo("biz-group-detail",{groupId:item.id}) : bizGoTo("biz-oneone-detail",{oneOneId:item.id})}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: item._type==="group" ? BIZ_BLUE+"18" : BIZ_PURPLE+"18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: item._type==="group" ? BIZ_BLUE : BIZ_PURPLE }} aria-hidden="true"><i className={item._type==="group"?"ph ph-users-three":"ph ph-user"} style={{ fontSize: 16 }} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item._type==="group" ? item.name : item.student_name}</div>
                          <div style={{ fontSize: 11, color: "var(--r-fg2)" }}>{item._type==="group" ? `Group · ${bizMembers.filter(m=>m.group_id===item.id).length} students` : item.subject}</div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          {item._time && <div style={{ fontSize: 12, fontWeight: 600, color: item._rescheduled ? BIZ_ORANGE : "var(--r-fg2)" }}>{fmtTime(item._time)}</div>}
                          {item._rescheduled && <div style={{ fontSize: 10, color: BIZ_ORANGE }}>Rescheduled</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>)}

            {/* ── RECORDS ── */}
            {bizView === "biz-records" && (<>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={S.pageTitle}>All Records</h2>
                <BizBtn onClick={bizExportCSV}><i className="ph ph-download-simple" style={{ marginRight: 6 }} aria-hidden="true" />Export CSV</BizBtn>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
                <BizStatCard label="Students" value={bizStudents.length} />
                <BizStatCard label="Group Classes" value={bizGroups.length} />
                <BizStatCard label="Total Collected" value={bizFmt$(totalEarned)} color={BIZ_GREEN} />
                <BizStatCard label="Total Overdue" value={bizFmt$(totalOwed)} color={totalOwed>0?BIZ_RED:BIZ_GREEN} />
              </div>

              {(() => {
                const now = new Date();
                const months = Array.from({ length: 6 }, (_, i) => {
                  const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
                  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
                  return { key, label: d.toLocaleDateString("en-US", { month: "short" }), isThis: i === 5,
                    total: bizPayments.filter(p => (p.date||"").startsWith(key)).reduce((s,p) => s + p.amount, 0) };
                });
                const maxVal = Math.max(...months.map(m => m.total), 1);
                const chartH = 90, barW = 38, gap = 14;
                return (
                  <div style={{ ...S.card, marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Monthly Earnings</div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
                      {months.map(m => {
                        const pct = Math.max(2, (m.total / maxVal) * 100);
                        return (
                          <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 4 }}>
                            {m.total > 0 && <div style={{ fontSize: 10, color: "var(--r-fg2)", whiteSpace: "nowrap" }}>{bizFmt$(m.total)}</div>}
                            <div style={{ width: "100%", height: `${pct}%`, background: m.isThis ? BIZ_BLUE : BIZ_BLUE + "55", borderRadius: "4px 4px 0 0", minHeight: 3 }} />
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      {months.map(m => (
                        <div key={m.key} style={{ flex: 1, textAlign: "center", fontSize: 11, color: m.isThis ? "var(--r-fg)" : "var(--r-fg2)", fontWeight: m.isThis ? 600 : 400 }}>{m.label}</div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Group Classes</div>
              <div style={{ ...S.card, padding: 0, overflow: "auto", marginBottom: 20 }}>
                {bizGroups.length === 0 ? <BizEmptyState icon="ph ph-users-three" title="No group classes" sub="" /> : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
                    <thead><tr style={{ borderBottom: "0.5px solid var(--r-bord)", background: "var(--r-surf2)" }}>
                      {["Name","Status","Schedule","Members","Collected","Overdue",""].map(h => <th key={h} style={{ textAlign:"left", padding:"9px 14px", fontSize:10, fontWeight:700, color:"var(--r-fg2)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {bizGroups.map(g => {
                        const gm = bizMembers.filter(m => m.group_id === g.id);
                        const collected = gm.reduce((t,m) => t + m.total_paid, 0);
                        const overdue = gm.reduce((t,m) => t + Math.max(0, m.classes_attended*m.rate - m.total_paid), 0);
                        return <tr key={g.id} style={{ borderBottom: "0.5px solid var(--r-bord)" }}>
                          <td style={{ padding:"10px 14px", fontWeight:500 }}>{g.name}</td>
                          <td style={{ padding:"10px 14px" }}><span style={{ fontSize:10, fontWeight:600, padding:"1px 6px", borderRadius:4, background:g.status==="inactive"?"rgba(255,255,255,0.06)":BIZ_GREEN+"18", color:g.status==="inactive"?"var(--r-fg2)":BIZ_GREEN }}>{g.status==="inactive"?"Inactive":"Active"}</span></td>
                          <td style={{ padding:"10px 14px", color:"var(--r-fg2)", fontSize:12 }}>{bizFmtSchedules(g)}</td>
                          <td style={{ padding:"10px 14px", fontVariantNumeric:"tabular-nums" }}>{gm.length}</td>
                          <td style={{ padding:"10px 14px", color:BIZ_GREEN, fontVariantNumeric:"tabular-nums" }}>{bizFmt$(collected)}</td>
                          <td style={{ padding:"10px 14px", fontWeight:600, color:overdue>0?BIZ_RED:BIZ_GREEN, fontVariantNumeric:"tabular-nums" }}>{bizFmt$(overdue)}</td>
                          <td style={{ padding:"10px 14px", textAlign:"right" }}><button style={S.linkBtn} onClick={() => bizGoTo("biz-group-detail",{groupId:g.id})}>View →</button></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>One-on-One Classes</div>
              <div style={{ ...S.card, padding: 0, overflow: "auto" }}>
                {bizOneOnes.length === 0 ? <BizEmptyState icon="ph ph-user" title="No one-on-one classes" sub="" /> : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}>
                    <thead><tr style={{ borderBottom: "0.5px solid var(--r-bord)", background: "var(--r-surf2)" }}>
                      {["Student","Status","Subject","Schedule","Rate","Classes","Paid","Overdue",""].map(h => <th key={h} style={{ textAlign:"left", padding:"9px 14px", fontSize:10, fontWeight:700, color:"var(--r-fg2)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {bizOneOnes.map(o => {
                        const owed = o.classes_attended * o.rate;
                        const overdue = Math.max(0, owed - o.total_paid);
                        return <tr key={o.id} style={{ borderBottom: "0.5px solid var(--r-bord)" }}>
                          <td style={{ padding:"10px 14px", fontWeight:500 }}>{o.student_name}</td>
                          <td style={{ padding:"10px 14px" }}><span style={{ fontSize:10, fontWeight:600, padding:"1px 6px", borderRadius:4, background:o.status==="inactive"?"rgba(255,255,255,0.06)":BIZ_BLUE+"18", color:o.status==="inactive"?"var(--r-fg2)":BIZ_BLUE }}>{o.status==="inactive"?"Inactive":"Active"}</span></td>
                          <td style={{ padding:"10px 14px", color:"var(--r-fg2)" }}>{o.subject}</td>
                          <td style={{ padding:"10px 14px", color:"var(--r-fg2)", fontSize:12 }}>{bizFmtSchedules(o)}</td>
                          <td style={{ padding:"10px 14px", fontVariantNumeric:"tabular-nums" }}>{bizFmt$(o.rate)}</td>
                          <td style={{ padding:"10px 14px", fontVariantNumeric:"tabular-nums" }}>{o.classes_attended}</td>
                          <td style={{ padding:"10px 14px", color:BIZ_GREEN, fontVariantNumeric:"tabular-nums" }}>{bizFmt$(o.total_paid)}</td>
                          <td style={{ padding:"10px 14px", fontWeight:600, color:overdue>0?BIZ_RED:BIZ_GREEN, fontVariantNumeric:"tabular-nums" }}>{bizFmt$(overdue)}</td>
                          <td style={{ padding:"10px 14px", textAlign:"right" }}><button style={S.linkBtn} onClick={() => bizGoTo("biz-oneone-detail",{oneOneId:o.id})}>View →</button></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>)}

            {/* ══ BUSINESS MODALS ══ */}

            {/* Student modal */}
            {bizModal === "student" && (
              <div style={S.overlay} onClick={() => bizCloseModal()}>
                <div style={{ ...S.modalBox, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                  <div style={S.modalTitle}>{bizEditId ? "Edit Student" : "Add Student"}</div>
                  {["name","school","enrolled_classes"].map(f => (
                    <div key={f} style={{ ...S.formRow, marginBottom: 12 }}>
                      <label style={S.formLabel}>{f==="name"?"Full Name *":f==="school"?"School *":"Classes Enrolled In"}</label>
                      <input style={S.input} value={bizDraft?.[f]||""} placeholder={f==="name"?"e.g. Ahmad Ali":f==="school"?"e.g. King Fahad School":"e.g. Math, Physics"} onChange={e => setBizDraft(d => ({ ...d, [f]: e.target.value }))} autoFocus={f==="name"} />
                    </div>
                  ))}
                  {bizError && <div style={{ fontSize: 12, color: "var(--r-danger)", marginBottom: 10 }}>{bizError}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2)", color: "var(--r-fg2)" }} onClick={bizCloseModal}>Cancel</button>
                    <button style={{ ...S.primaryBtn, flex: 1, background: BIZ_BLUE }} onClick={bizSaveStudent}>Save</button>
                  </div>
                </div>
              </div>
            )}

            {/* Group modal */}
            {bizModal === "group" && (
              <div style={S.overlay} onClick={() => bizCloseModal()}>
                <div style={{ ...S.modalBox, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                  <div style={S.modalTitle}>{bizEditId ? "Edit Group" : "Create Group Class"}</div>
                  <div style={{ ...S.formRow, marginBottom: 12 }}>
                    <label style={S.formLabel}>Group Name *</label>
                    <input style={S.input} value={bizDraft?.name||""} placeholder="e.g. Group Class 1" onChange={e => setBizDraft(d => ({ ...d, name: e.target.value }))} autoFocus />
                  </div>
                  <div style={{ ...S.formRow, marginBottom: 12 }}>
                    <label style={S.formLabel}>Status</label>
                    <select style={S.input} value={bizDraft?.status||"active"} onChange={e => setBizDraft(d => ({ ...d, status: e.target.value }))}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.formLabel}>Schedule Slots</label>
                    {(bizDraft?.schedules||[]).map((slot, si) => (
                      <div key={si} style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <select style={{ ...S.input, flex: 1 }} value={slot.day||""} onChange={e => setBizDraft(d => ({ ...d, schedules: d.schedules.map((s,i) => i===si ? { ...s, day: e.target.value } : s) }))}>
                          <option value="">— Day —</option>
                          {BIZ_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <input type="time" style={{ ...S.input, flex: 1 }} value={slot.time||""} onChange={e => setBizDraft(d => ({ ...d, schedules: d.schedules.map((s,i) => i===si ? { ...s, time: e.target.value } : s) }))} />
                        <button style={{ ...S.deleteBtn, color: "var(--r-danger)", fontSize: 18 }} onClick={() => setBizDraft(d => ({ ...d, schedules: d.schedules.filter((_,i) => i!==si) }))}>×</button>
                      </div>
                    ))}
                    <button style={{ ...S.linkBtn, marginTop: 8 }} onClick={() => setBizDraft(d => ({ ...d, schedules: [...(d.schedules||[]), { day:"", time:"" }] }))}>+ Add slot</button>
                  </div>
                  {bizError && <div style={{ fontSize: 12, color: "var(--r-danger)", marginBottom: 10 }}>{bizError}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2)", color: "var(--r-fg2)" }} onClick={bizCloseModal}>Cancel</button>
                    <button style={{ ...S.primaryBtn, flex: 1, background: BIZ_BLUE }} onClick={bizSaveGroup}>Save</button>
                  </div>
                </div>
              </div>
            )}

            {/* Member modal */}
            {bizModal === "member" && (
              <div style={S.overlay} onClick={() => bizCloseModal()}>
                <div style={{ ...S.modalBox, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                  <div style={S.modalTitle}>{bizEditId ? "Edit Member" : "Add Member"}</div>
                  <div style={{ ...S.formRow, marginBottom: 12 }}>
                    <label style={S.formLabel}>Student Name *</label>
                    <select style={S.input} value={bizDraft?.student_name ? (bizStudents.find(s=>s.name===bizDraft.student_name) ? bizDraft.student_name : "__custom__") : ""} onChange={e => { const v = e.target.value; setBizDraft(d => ({ ...d, student_name: v === "__custom__" ? "" : v, _customName: v === "__custom__" })); }}>
                      <option value="">— Select student —</option>
                      {bizStudents.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      <option value="__custom__">Enter manually…</option>
                    </select>
                    {(bizDraft?._customName || (!bizStudents.find(s=>s.name===bizDraft?.student_name) && bizDraft?.student_name)) && (
                      <input style={{ ...S.input, marginTop: 6 }} value={bizDraft?.student_name||""} placeholder="Student name" onChange={e => setBizDraft(d => ({ ...d, student_name: e.target.value }))} />
                    )}
                  </div>
                  <div style={{ ...S.formRow, marginBottom: 12 }}>
                    <label style={S.formLabel}>Rate per Class ($) *</label>
                    <input type="number" style={S.input} value={bizDraft?.rate||""} placeholder="50" min="0" step="0.01" onChange={e => setBizDraft(d => ({ ...d, rate: e.target.value }))} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div style={S.formRow}>
                      <label style={S.formLabel}>Classes Attended</label>
                      <input type="number" style={S.input} value={bizDraft?.classes_attended||0} min="0" onChange={e => setBizDraft(d => ({ ...d, classes_attended: e.target.value }))} />
                    </div>
                    <div style={S.formRow}>
                      <label style={S.formLabel}>Total Paid ($)</label>
                      <input type="number" style={S.input} value={bizDraft?.total_paid||0} min="0" step="0.01" onChange={e => setBizDraft(d => ({ ...d, total_paid: e.target.value }))} />
                    </div>
                  </div>
                  {bizError && <div style={{ fontSize: 12, color: "var(--r-danger)", marginBottom: 10 }}>{bizError}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2)", color: "var(--r-fg2)" }} onClick={bizCloseModal}>Cancel</button>
                    <button style={{ ...S.primaryBtn, flex: 1, background: BIZ_BLUE }} onClick={bizSaveMember}>Save</button>
                  </div>
                </div>
              </div>
            )}

            {/* One-on-One modal */}
            {bizModal === "oneone" && (
              <div style={S.overlay} onClick={() => bizCloseModal()}>
                <div style={{ ...S.modalBox, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                  <div style={S.modalTitle}>{bizEditId ? "Edit 1-on-1" : "Create 1-on-1 Class"}</div>
                  <div style={{ ...S.formRow, marginBottom: 12 }}>
                    <label style={S.formLabel}>Student *</label>
                    <select style={S.input} value={bizDraft?.student_name ? (bizStudents.find(s=>s.name===bizDraft.student_name) ? bizDraft.student_name : "__custom__") : ""} onChange={e => { const v = e.target.value; setBizDraft(d => ({ ...d, student_name: v === "__custom__" ? "" : v, _customName: v === "__custom__" })); }}>
                      <option value="">— Select student —</option>
                      {bizStudents.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      <option value="__custom__">Enter manually…</option>
                    </select>
                    {(bizDraft?._customName || (!bizStudents.find(s=>s.name===bizDraft?.student_name) && bizDraft?.student_name)) && (
                      <input style={{ ...S.input, marginTop: 6 }} value={bizDraft?.student_name||""} placeholder="Student name" onChange={e => setBizDraft(d => ({ ...d, student_name: e.target.value }))} />
                    )}
                  </div>
                  <div style={{ ...S.formRow, marginBottom: 12 }}>
                    <label style={S.formLabel}>Subject *</label>
                    <input style={S.input} value={bizDraft?.subject||""} placeholder="e.g. Mathematics" onChange={e => setBizDraft(d => ({ ...d, subject: e.target.value }))} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div style={S.formRow}>
                      <label style={S.formLabel}>Rate/Class ($)</label>
                      <input type="number" style={S.input} value={bizDraft?.rate||""} placeholder="60" min="0" step="0.01" onChange={e => setBizDraft(d => ({ ...d, rate: e.target.value }))} />
                    </div>
                    <div style={S.formRow}>
                      <label style={S.formLabel}>Status</label>
                      <select style={S.input} value={bizDraft?.status||"active"} onChange={e => setBizDraft(d => ({ ...d, status: e.target.value }))}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.formLabel}>Schedule Slots</label>
                    {(bizDraft?.schedules||[]).map((slot, si) => (
                      <div key={si} style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <select style={{ ...S.input, flex: 1 }} value={slot.day||""} onChange={e => setBizDraft(d => ({ ...d, schedules: d.schedules.map((s,i) => i===si ? { ...s, day: e.target.value } : s) }))}>
                          <option value="">— Day —</option>
                          {BIZ_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <input type="time" style={{ ...S.input, flex: 1 }} value={slot.time||""} onChange={e => setBizDraft(d => ({ ...d, schedules: d.schedules.map((s,i) => i===si ? { ...s, time: e.target.value } : s) }))} />
                        <button style={{ ...S.deleteBtn, color: "var(--r-danger)", fontSize: 18 }} onClick={() => setBizDraft(d => ({ ...d, schedules: d.schedules.filter((_,i) => i!==si) }))}>×</button>
                      </div>
                    ))}
                    <button style={{ ...S.linkBtn, marginTop: 8 }} onClick={() => setBizDraft(d => ({ ...d, schedules: [...(d.schedules||[]), { day:"", time:"" }] }))}>+ Add slot</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div style={S.formRow}>
                      <label style={S.formLabel}>Classes Attended</label>
                      <input type="number" style={S.input} value={bizDraft?.classes_attended||0} min="0" onChange={e => setBizDraft(d => ({ ...d, classes_attended: e.target.value }))} />
                    </div>
                    <div style={S.formRow}>
                      <label style={S.formLabel}>Total Paid ($)</label>
                      <input type="number" style={S.input} value={bizDraft?.total_paid||0} min="0" step="0.01" onChange={e => setBizDraft(d => ({ ...d, total_paid: e.target.value }))} />
                    </div>
                  </div>
                  {bizError && <div style={{ fontSize: 12, color: "var(--r-danger)", marginBottom: 10 }}>{bizError}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2)", color: "var(--r-fg2)" }} onClick={bizCloseModal}>Cancel</button>
                    <button style={{ ...S.primaryBtn, flex: 1, background: BIZ_BLUE }} onClick={bizSaveOneOne}>Save</button>
                  </div>
                </div>
              </div>
            )}

            {/* Payment modal */}
            {bizModal === "payment" && bizPayTarget && (
              <div style={S.overlay} onClick={() => { setBizModal(null); setBizDraft(null); setBizPayTarget(null); setBizError(""); }}>
                <div style={{ ...S.modalBox, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                  <div style={S.modalTitle}>{bizPayTarget.isCustom ? `Custom Payment — ${bizPayTarget.studentName}` : `Add Payment — ${bizPayTarget.studentName}`}</div>
                  {!bizPayTarget.isCustom && (
                    <div style={{ background: BIZ_BLUE + "10", border: `1px solid ${BIZ_BLUE}30`, borderRadius: 8, padding: "14px 16px", marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Amount</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: BIZ_BLUE, fontVariantNumeric: "tabular-nums" }}>{bizFmt$(bizPayTarget.rate)}</div>
                    </div>
                  )}
                  {bizPayTarget.isCustom && (
                    <div style={{ ...S.formRow, marginBottom: 12 }}>
                      <label style={S.formLabel}>Custom Amount ($) *</label>
                      <input type="number" style={S.input} min="0" step="0.01" placeholder="0.00" value={bizDraft?.custom_amount||""} onChange={e => setBizDraft(d => ({ ...d, custom_amount: e.target.value }))} autoFocus />
                    </div>
                  )}
                  <div style={{ ...S.formRow, marginBottom: 12 }}>
                    <label style={S.formLabel}>Date</label>
                    <input type="date" style={S.input} value={bizDraft?.date||today} onChange={e => setBizDraft(d => ({ ...d, date: e.target.value }))} />
                  </div>
                  <div style={{ ...S.formRow, marginBottom: 14 }}>
                    <label style={S.formLabel}>Note (optional)</label>
                    <input style={S.input} placeholder="e.g. Cash payment" value={bizDraft?.note||""} onChange={e => setBizDraft(d => ({ ...d, note: e.target.value }))} />
                  </div>
                  {bizError && <div style={{ fontSize: 12, color: "var(--r-danger)", marginBottom: 10 }}>{bizError}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2)", color: "var(--r-fg2)" }} onClick={() => { setBizModal(null); setBizDraft(null); setBizPayTarget(null); setBizError(""); }}>Cancel</button>
                    <button style={{ ...S.primaryBtn, flex: 1, background: BIZ_GREEN, color: "#fff" }} onClick={bizSavePayment}>Record Payment</button>
                  </div>
                </div>
              </div>
            )}

            {/* Reschedule modal */}
            {bizModal === "reschedule" && bizReschedTarget && (
              <div style={S.overlay} onClick={() => { setBizModal(null); setBizDraft(null); setBizReschedTarget(null); setBizError(""); }}>
                <div style={{ ...S.modalBox, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                  <div style={S.modalTitle}>Reschedule — {bizReschedTarget.name}</div>
                  <div style={{ fontSize: 12, color: "var(--r-fg2)", lineHeight: 1.6, marginBottom: 14, padding: "10px 12px", background: BIZ_BLUE+"08", borderRadius: 7 }}>One-off only — after this date the class returns to its regular schedule.</div>
                  <div style={{ ...S.formRow, marginBottom: 12 }}>
                    <label style={S.formLabel}>New Date *</label>
                    <input type="date" style={S.input} value={bizDraft?.date||""} min={today} onChange={e => setBizDraft(d => ({ ...d, date: e.target.value }))} autoFocus />
                  </div>
                  <div style={{ ...S.formRow, marginBottom: 14 }}>
                    <label style={S.formLabel}>New Time (optional)</label>
                    <input type="time" style={S.input} value={bizDraft?.time||""} onChange={e => setBizDraft(d => ({ ...d, time: e.target.value }))} />
                  </div>
                  {bizError && <div style={{ fontSize: 12, color: "var(--r-danger)", marginBottom: 10 }}>{bizError}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    {bizDraft?.date && <button style={{ ...S.primaryBtn, flex: 1, background: "rgba(239,68,68,0.1)", color: "var(--r-danger)" }} onClick={bizClearReschedule}>Clear</button>}
                    <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2)", color: "var(--r-fg2)" }} onClick={() => { setBizModal(null); setBizDraft(null); setBizReschedTarget(null); setBizError(""); }}>Cancel</button>
                    <button style={{ ...S.primaryBtn, flex: 1, background: BIZ_BLUE }} onClick={bizSaveReschedule}>Save</button>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm modal */}
            {bizModal === "confirm" && bizConfirm && (
              <div style={S.overlay} onClick={() => { setBizModal(null); setBizConfirm(null); }}>
                <div style={{ ...S.modalBox, maxWidth: 340, textAlign: "center" }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize: 30, marginBottom: 12, color: "var(--r-caution)" }} aria-hidden="true"><i className="ph ph-warning" /></div>
                  <div style={{ ...S.modalTitle, fontSize: 16, marginBottom: 6 }}>{bizConfirm.title}</div>
                  <div style={{ fontSize: 13, color: "var(--r-fg2)", lineHeight: 1.6, marginBottom: 20 }}>{bizConfirm.msg}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2)", color: "var(--r-fg2)" }} onClick={() => { setBizModal(null); setBizConfirm(null); }}>Cancel</button>
                    <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-danger)", color: "#fff" }} onClick={() => { bizConfirm.onConfirm(); setBizModal(null); setBizConfirm(null); }}>Confirm</button>
                  </div>
                </div>
              </div>
            )}

            {bizModal === "addclass" && bizClassTarget && (
              <div style={S.overlay} onClick={bizCloseModal}>
                <div style={{ ...S.modalBox, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                  <div style={S.modalTitle}>Add Class — {bizClassTarget.name}</div>
                  {bizClassTarget.type === "group" && (
                    <div style={{ fontSize: 12, color: "var(--r-fg2)", marginBottom: 14 }}>
                      Increments attendance for all {bizMembers.filter(m => m.group_id === bizClassTarget.id).length} members.
                    </div>
                  )}
                  <div style={{ ...S.formRow, marginBottom: 12 }}>
                    <label style={S.formLabel}>Date *</label>
                    <input type="date" style={S.input} value={bizDraft?.date || ""} onChange={e => setBizDraft(d => ({ ...d, date: e.target.value }))} />
                  </div>
                  <div style={{ ...S.formRow, marginBottom: 16 }}>
                    <label style={S.formLabel}>Note (optional)</label>
                    <input style={S.input} placeholder="e.g. Covered algebra chapter 3…" value={bizDraft?.note || ""} onChange={e => setBizDraft(d => ({ ...d, note: e.target.value }))} />
                  </div>
                  {bizError && <div style={{ color: "var(--r-danger)", fontSize: 12, marginBottom: 10 }}>{bizError}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <BizPrimBtn style={{ flex: 1, justifyContent: "center" }} onClick={bizSaveClass}>Save Class</BizPrimBtn>
                    <BizBtn style={{ flex: 1, justifyContent: "center" }} onClick={bizCloseModal}>Cancel</BizBtn>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({ value, label, accent }) {
  return (
    <div style={S.statCard}>
      <div style={{ fontSize: 13, color: "var(--r-fg2)", fontWeight: 600, marginBottom: 10 }}>{label}</div>
      <div className="r-tnum" style={{ fontFamily: HERO_FONT, fontSize: 34, fontWeight: 400, color: accent || "var(--r-fg)", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// Reusable hope-first empty state (glow disc, no illustration)
function EmptyState({ title, body, cta, onCta, showGlyph = true }) {
  const prm = usePRM();
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);
  const rise = { opacity: shown ? 1 : 0, transform: shown ? "translateY(0)" : "translateY(10px)", transition: prm ? "none" : "opacity 500ms var(--r-ease-dawn),transform 500ms var(--r-ease-dawn)" };
  return (
    <div style={{ ...S.emptyState, ...rise }}>
      {showGlyph && <div style={{ ...S.emptyGlyph, animation: prm ? "none" : "fajrBloom 8s ease-in-out infinite" }} />}
      <div style={S.emptyTitle}>{title}</div>
      <div style={S.emptyBody}>{body}</div>
      {cta && <button className="r-press" style={{ ...S.primaryBtn, width: "auto", padding: "11px 22px" }} onClick={onCta}>{cta}</button>}
    </div>
  );
}


const S = {
  app: { display: "flex", minHeight: "100vh", background: "var(--r-bg,#0d0e13)", color: "var(--r-fg,#ece9e4)", fontFamily: "var(--r-font,'DM Sans',system-ui,sans-serif)" },
  mobileHeader: { position: "fixed", top: 0, left: 0, right: 0, height: 52, background: "var(--r-surf,#14151c)", borderBottom: "1px solid var(--r-bord,#1f2029)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", zIndex: 100 },
  hamburger: { background: "none", border: "none", color: "var(--r-fg2)", fontSize: 22, cursor: "pointer", padding: "4px 6px", lineHeight: 1 },
  sidebarBackdrop: { position: "fixed", inset: 0, background: "rgba(34,30,24,0.32)", zIndex: 150 },
  sidebar: { width: 240, background: "var(--r-surf,#14151c)", borderRight: "1px solid var(--r-bord,#1f2029)", boxShadow: "6px 0 24px rgba(7,8,14,.35)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 },
  logo: { fontSize: 17, fontWeight: 460, fontFamily: HERO_FONT, letterSpacing: "-0.02em" },
  accDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  navBtn: { position: "relative", display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 40, padding: "10px 12px", borderRadius: 10, border: "none", background: "transparent", color: "var(--r-fg2)", fontSize: 15, fontWeight: 500, cursor: "pointer", marginBottom: 2, textAlign: "left", fontFamily: "var(--r-font,'DM Sans',system-ui,sans-serif)", transition: "color 200ms var(--r-ease-soft),background 200ms var(--r-ease-soft)" },
  navIcon: { fontSize: 15, width: 20, textAlign: "center", flexShrink: 0, transition: "transform 200ms var(--r-ease-soft)" },
  main: { flex: 1, overflow: "auto", minWidth: 0 },
  content: { padding: "28px 32px", maxWidth: 1120, margin: "0 auto" },
  pageTitle: { fontFamily: HERO_FONT, fontSize: "clamp(1.6rem,1.3rem+1vw,2rem)", fontWeight: 480, marginBottom: 0, letterSpacing: "-0.01em" },
  panicBtn: { display: "flex", alignItems: "center", gap: 8, background: "var(--r-surf)", border: "1px solid #C9A99E", borderRadius: 999, padding: "11px 16px", color: "#8C3F30", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "var(--r-shadow-sm)" },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 },
  statCard: { background: "var(--r-surf,#14151c)", border: "1px solid var(--r-bord,#1f2029)", borderRadius: 12, padding: "16px 20px", boxShadow: "var(--r-shadow-sm)" },
  card: { background: "var(--r-surf,#14151c)", border: "1px solid var(--r-bord,#1f2029)", borderRadius: 16, padding: "20px 24px", marginBottom: 16, boxShadow: "var(--r-shadow-sm)" },
  cardHover: { boxShadow: "var(--r-shadow-md)", transform: "translateY(-1px)" },
  cardLabel: { fontSize: 13, color: "var(--r-fg2,#8b8a94)", marginBottom: 14, fontWeight: 600 },
  eyebrow: { fontSize: 13, color: "var(--r-fg2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 14 },
  progressWrap: { display: "flex", alignItems: "center", gap: 10 },
  progressBg: { flex: 1, height: 5, background: "var(--r-surf2,#1b1c25)", borderRadius: 999, overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 999, transition: "width .6s var(--r-ease-dawn)" },
  progressText: { fontSize: 13, color: "var(--r-fg2,#8b8a94)", whiteSpace: "nowrap" },
  bigProgressBg: { height: 6, background: "var(--r-surf2,#1b1c25)", borderRadius: 999, overflow: "hidden", marginTop: 8 },
  bigProgressBar: { height: "100%", borderRadius: 999, transition: "width .6s var(--r-ease-dawn)" },
  milestonesGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 },
  milestoneChip: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 6px", borderRadius: 10, border: "1px solid var(--r-bord)", background: "var(--r-surf)", transition: "all .3s" },
  mLabel: { fontSize: 11, color: "var(--r-fg2,#8b8a94)" },
  scheduleRow: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, marginBottom: 4, transition: "background 150ms var(--r-ease-soft)" },
  habitDot: { width: 18, height: 18, borderRadius: "50%", border: "2px solid", cursor: "pointer", transition: "all .2s", flexShrink: 0 },
  checkBtn: { width: 30, height: 30, borderRadius: "50%", border: "2px solid", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s", background: "transparent" },
  deleteBtn: { background: "none", border: "none", color: "var(--r-fg3)", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: "0 2px" },
  catBtn: { padding: "6px 13px", borderRadius: 999, border: "1px solid", fontSize: 13, cursor: "pointer", background: "transparent", fontFamily: "var(--r-font,'DM Sans',system-ui,sans-serif)" },
  goalBadge: { display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" },
  goalCheck: { width: 18, height: 18, borderRadius: 5, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1, transition: "all .2s" },
  actionCard: { display: "flex", gap: 12, background: "var(--r-surf,#14151c)", border: "1px solid var(--r-bord,#1f2029)", borderRadius: 10, padding: "14px 16px", marginBottom: 8, alignItems: "flex-start", boxShadow: "var(--r-shadow-sm)" },
  actionTitle: { fontSize: 15, fontWeight: 600, marginBottom: 3 },
  actionDesc: { fontSize: 15, color: "var(--r-fg2,#8b8a94)", lineHeight: 1.55 },
  rewardRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  rewardCard: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--r-bord,#1f2029)" },
  rewardCardName: { fontSize: 15, marginBottom: 2 },
  claimBtn: { background: "var(--r-surf2)", border: "1px solid var(--r-accent)", color: "var(--r-accent-text)", padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  sleepTarget: { background: "var(--r-surf2,#1b1c25)", borderRadius: 10, padding: "12px 14px", textAlign: "center", flex: 1 },
  sleepTargetLabel: { fontSize: 13, color: "var(--r-fg2,#8b8a94)", marginBottom: 5, fontWeight: 600 },
  sleepTargetVal: { fontSize: 19, fontWeight: 400, fontFamily: HERO_FONT, letterSpacing: "-0.01em" },
  sleepLogRow: { display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid var(--r-bord,#1f2029)" },
  habitCard: { background: "var(--r-surf,#14151c)", border: "1px solid var(--r-bord,#1f2029)", borderRadius: 12, padding: "12px 16px", marginBottom: 10, boxShadow: "var(--r-shadow-sm)" },
  lvlBadge: { fontSize: 11, color: "var(--r-accent-text)", background: "var(--r-surf2)", border: "1px solid var(--r-bord)", padding: "2px 9px", borderRadius: 999 },
  journalEntry: { background: "var(--r-surf,#14151c)", border: "1px solid var(--r-bord,#1f2029)", borderRadius: 12, padding: "18px 20px", marginBottom: 12, boxShadow: "var(--r-shadow-sm)" },
  journalDate: { fontSize: 13, color: "var(--r-fg2,#8b8a94)", marginBottom: 8, fontWeight: 500 },
  journalText: { fontSize: 15, color: "var(--r-fg,#ece9e4)", lineHeight: 1.8 },
  empty: { fontSize: 15, color: "var(--r-fg3,#5d5c66)", padding: "4px 0" },
  linkBtn: { background: "none", border: "none", color: "var(--r-accent-text)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "var(--r-font,'DM Sans',system-ui,sans-serif)" },
  textarea: { width: "100%", background: "var(--r-surf2,#1b1c25)", border: "1px solid var(--r-bord,#1f2029)", borderRadius: 8, padding: "12px 14px", color: "var(--r-fg,#ece9e4)", fontSize: 15, fontFamily: "var(--r-font,'DM Sans',system-ui,sans-serif)", resize: "vertical", lineHeight: 1.6, transition: "border-color .15s,box-shadow .15s,background .15s" },
  input: { width: "100%", background: "var(--r-surf2,#1b1c25)", border: "1px solid var(--r-bord,#1f2029)", borderRadius: 8, padding: "11px 13px", color: "var(--r-fg,#ece9e4)", fontSize: 15, fontFamily: "var(--r-font,'DM Sans',system-ui,sans-serif)", transition: "border-color .15s,box-shadow .15s,background .15s" },
  primaryBtn: { background: "var(--r-accent)", color: "var(--r-on-accent)", border: "none", padding: "12px 18px", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", fontFamily: "var(--r-font,'DM Sans',system-ui,sans-serif)", letterSpacing: "-0.01em", boxShadow: "var(--r-shadow-sm)", transition: "filter 150ms var(--r-ease-soft),box-shadow 150ms var(--r-ease-soft),transform 80ms var(--r-ease-soft)" },
  secondaryBtn: { background: "var(--r-surf2)", color: "var(--r-fg)", border: "1px solid var(--r-bord)", padding: "12px 18px", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", fontFamily: "var(--r-font,'DM Sans',system-ui,sans-serif)" },
  ghostBtn: { background: "transparent", color: "var(--r-fg2)", border: "none", padding: "10px 14px", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "var(--r-font,'DM Sans',system-ui,sans-serif)" },
  setupWrap: { minHeight: "100vh", background: "var(--r-bg,#0d0e13)", display: "flex", alignItems: "center", justifyContent: "center" },
  setupCard: { background: "var(--r-surf3,#23242f)", border: "1px solid var(--r-bord)", borderRadius: 20, padding: "40px 34px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "var(--r-shadow-lg)" },
  setupEmoji: { fontSize: 40, marginBottom: 14, color: "var(--r-accent)", lineHeight: 1 },
  setupTitle: { fontSize: 26, fontWeight: 420, fontFamily: HERO_FONT, marginBottom: 10, letterSpacing: "-0.02em" },
  setupSub: { fontSize: 15, color: "var(--r-fg2,#8b8a94)", lineHeight: 1.7, marginBottom: 20 },
  overlay: { position: "fixed", inset: 0, background: "rgba(34,30,24,0.32)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modalBox: { background: "var(--r-surf3,#23242f)", border: "1px solid var(--r-bord)", borderRadius: 20, padding: "28px", maxWidth: 460, width: "92%", maxHeight: "88vh", overflowY: "auto", boxShadow: "var(--r-shadow-lg)" },
  modalTitle: { fontFamily: HERO_FONT, fontSize: 22, fontWeight: 480, marginBottom: 8, letterSpacing: "-0.01em" },
  modalSub: { fontSize: 15, color: "var(--r-fg2,#8b8a94)", lineHeight: 1.6, marginBottom: 18 },
  heroBlock: { position: "relative", overflow: "hidden", textAlign: "left", background: "var(--r-surf)", border: "1px solid var(--r-bord)", borderRadius: 20, padding: "clamp(22px,5vw,32px) clamp(20px,5vw,28px)", marginBottom: 16, boxShadow: "var(--r-shadow-md)" },
  heroNumeral: { fontFamily: HERO_FONT, fontSize: "clamp(3.25rem,9vw,5rem)", fontWeight: 480, lineHeight: 0.95, letterSpacing: "-0.02em", color: "var(--r-accent-text)", fontVariantNumeric: "tabular-nums" },
  heroMeta: { fontSize: 15, color: "var(--r-fg2)", marginTop: 4 },
  heroMilestone: { fontSize: 13, color: "var(--r-accent-text)", marginTop: 12, fontWeight: 500 },
  momentumRow: { display: "flex", gap: "clamp(16px,4vw,40px)", justifyContent: "center", alignItems: "flex-start", padding: "8px 0 4px" },
  emptyState: { textAlign: "center", padding: "clamp(2.5rem,8vh,5rem) 1.5rem", maxWidth: 420, margin: "0 auto" },
  emptyGlyph: { width: 88, height: 88, borderRadius: "50%", margin: "0 auto 18px", background: "radial-gradient(circle at 50% 40%, var(--r-glow), transparent 70%)" },
  emptyTitle: { fontFamily: HERO_FONT, fontSize: 22, fontWeight: 420, color: "var(--r-fg)", marginBottom: 8, letterSpacing: "-0.01em" },
  emptyBody: { fontSize: 15, color: "var(--r-fg2)", lineHeight: 1.6, marginBottom: 18 },
  sosBlock: { background: "var(--r-surf)", border: "1px solid #C9A99E", borderRadius: 20, padding: 28, boxShadow: "var(--r-shadow-lg)" },
  formRow: { display: "flex", flexDirection: "column", gap: 8 },
  formLabel: { fontSize: 13, color: "var(--r-fg2,#8b8a94)", fontWeight: 500 },
  accRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--r-bord)", marginBottom: 8 },
};
