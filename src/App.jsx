import { useState, useEffect, useCallback, useRef } from "react";
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
  id: null, name: "", substance: "", color: "#34d399",
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
  { days: 1, label: "24 hours", emoji: "🌱" }, { days: 3, label: "3 days", emoji: "✨" },
  { days: 7, label: "1 week", emoji: "🔥" }, { days: 14, label: "2 weeks", emoji: "💪" },
  { days: 30, label: "1 month", emoji: "🏆" }, { days: 60, label: "2 months", emoji: "🌟" },
  { days: 90, label: "3 months", emoji: "💎" }, { days: 180, label: "6 months", emoji: "🦋" },
  { days: 365, label: "1 year", emoji: "👑" },
];
const BUILTIN_RELAPSE_TOOLS = [
  { id: "breathe", icon: "🫁", title: "Box breathing", desc: "4 in, hold 4, out 4, hold 4. Repeat 4×. Activates your parasympathetic nervous system." },
  { id: "call", icon: "📞", title: "Call your person", desc: "Contact your sponsor, therapist, or trusted friend right now. Connection counters craving." },
  { id: "delay", icon: "⏱", title: "Urge surf — 20 min", desc: "Cravings peak then fall. Set a timer. Just delay acting on it." },
  { id: "move", icon: "🏃", title: "Move your body", desc: "Walk, run, push-ups. Exercise releases dopamine and reduces cortisol within minutes." },
  { id: "ground", icon: "🌍", title: "5-4-3-2-1 grounding", desc: "5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste." },
  { id: "cold", icon: "❄️", title: "Cold water on face", desc: "Triggers the dive reflex — slows heart rate, lowers anxiety fast." },
  { id: "write", icon: "📝", title: "Write it out", desc: "Write what you're feeling and what triggered this. Externalising reduces its power." },
  { id: "tipp", icon: "🧊", title: "TIPP skill (DBT)", desc: "Temperature, Intense exercise, Paced breathing, Progressive relaxation." },
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
const CAT_HEX = { mental: "#a78bfa", physical: "#34d399", sleep: "#60a5fa", social: "#f97316", custom: "#f472b6" };
const GOAL_PERIODS = ["daily", "weekly", "monthly", "yearly"];
const GOAL_COLORS = { daily: "#34d399", weekly: "#60a5fa", monthly: "#a78bfa", yearly: "#f59e0b" };
const LIFE_AREAS = [
  { key: "health", label: "Health", color: "#34d399" },
  { key: "faith", label: "Faith", color: "#a78bfa" },
  { key: "relationships", label: "Relationships", color: "#f97316" },
  { key: "career", label: "Career", color: "#60a5fa" },
  { key: "finances", label: "Finances", color: "#f59e0b" },
  { key: "personalGrowth", label: "Growth", color: "#f472b6" },
  { key: "fun", label: "Fun", color: "#2dd4bf" },
];
const PERIOD_ORDER = ["yearly", "monthly", "weekly", "daily"];
const DEFAULT_VISION = () => ({ myWhy: "", lifeVision: "", lifeAreas: { health: 5, faith: 5, relationships: 5, career: 5, finances: 5, personalGrowth: 5, fun: 5 } });
const DEFAULT_ACCOUNTABILITY = () => ({ contract: null, futureLetters: [], weeklyReviews: [], wins: [], gratitude: [] });
const DEFAULT_WATER_CONFIG = () => ({ glassSize: 250, dailyTarget: 8 });
const EXERCISE_CATS = ["cardio", "strength", "flexibility", "sports", "other"];
const EXERCISE_CAT_HEX = { cardio: "#f97316", strength: "#34d399", flexibility: "#a78bfa", sports: "#60a5fa", other: "#f59e0b" };
const ACCOUNT_COLORS = ["#34d399", "#60a5fa", "#a78bfa", "#f97316", "#f472b6", "#f59e0b", "#f87171", "#2dd4bf"];
const PRAYER_NAMES = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DEFAULT_THEME = () => ({ preset: "midnight", bg: "#0d0d0f", surf: "#0a0a0c", surf2: "#111113", bord: "#161618", fg: "#e8e8e8", fg2: "#555", font: "inter" });
const INTERNAL_EMAIL = "user@recover-app.internal";
const THEME_PRESETS = [
  { id: "midnight", name: "Midnight", bg: "#0d0d0f", surf: "#0a0a0c", surf2: "#111113", bord: "#161618", fg: "#e8e8e8", fg2: "#555" },
  { id: "obsidian", name: "Obsidian", bg: "#0a0d12", surf: "#080b0f", surf2: "#0d1117", bord: "#161b22", fg: "#e6edf3", fg2: "#7d8590" },
  { id: "slate", name: "Slate", bg: "#0e1117", surf: "#0b0e15", surf2: "#111521", bord: "#1a1f2b", fg: "#e2e8f0", fg2: "#94a3b8" },
  { id: "charcoal", name: "Charcoal", bg: "#111111", surf: "#0e0e0e", surf2: "#141414", bord: "#1c1c1c", fg: "#ededed", fg2: "#777" },
  { id: "forest", name: "Forest", bg: "#0a0f0a", surf: "#080d08", surf2: "#0d130d", bord: "#141e14", fg: "#e4ede4", fg2: "#7a9a7a" },
  { id: "warm", name: "Warm", bg: "#110e09", surf: "#0e0b07", surf2: "#13100b", bord: "#1e1812", fg: "#ede8e0", fg2: "#8a806e" },
];
const FONT_PACKAGES = [
  { id: "inter", name: "Inter", label: "Modern sans-serif", stack: "'Inter',system-ui,sans-serif", url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
  { id: "georgia", name: "Georgia", label: "Classic serif", stack: "Georgia,serif", url: null },
  { id: "dm-sans", name: "DM Sans", label: "Clean sans-serif", stack: "'DM Sans',system-ui,sans-serif", url: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" },
  { id: "system", name: "System", label: "Native OS font", stack: "system-ui,-apple-system,sans-serif", url: null },
];

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
const scoreColor = s => s >= 80 ? "#34d399" : s >= 60 ? "#60a5fa" : s >= 40 ? "#f59e0b" : "#f87171";
const getTodayDay = () => DAY_NAMES[new Date().getDay()];
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

// ─── Visual components ────────────────────────────────────────────────────────

function CircleRing({ value = 0, size = 100, strokeWidth = 8 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = circ * (1 - pct / 100);
  const col = scoreColor(pct);
  const cx = size / 2, cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a1e" strokeWidth={strokeWidth} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.5s ease" }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill={col} fontSize={size * 0.24} fontWeight="700" fontFamily="monospace">
        {Math.round(pct)}
      </text>
    </svg>
  );
}

function HeatmapGrid({ getScore }) {
  const today = getTodayStr();
  const DAYS = 91;
  const CELL = 11, GAP = 2, STEP = CELL + GAP;
  const cols = Math.ceil(DAYS / 7);
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
          const fill = s == null ? "#161618" : scoreColor(s);
          return (
            <rect key={dateStr} x={col * STEP} y={row * STEP}
              width={CELL} height={CELL} rx={2} fill={fill} opacity={s == null ? 0.35 : 0.85}>
              <title>{dateStr}{s != null ? `: ${Math.round(s)}` : " — no data"}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

function LineChart({ data, height = 90 }) {
  if (!data || data.length < 2) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 12 }}>
      Not enough data
    </div>
  );
  const W = 280, H = height - 22;
  const allVals = data.flatMap(d => [d.actual, d.target].filter(v => v != null));
  if (!allVals.length) return null;
  const minV = Math.min(...allVals), maxV = Math.max(...allVals);
  const range = maxV - minV || 1;
  const xS = i => (i / (data.length - 1)) * W;
  const yS = v => H - 4 - ((v - minV) / range) * (H - 12);

  const linePath = (key, col, dashed) => {
    let path = "";
    data.forEach((p, i) => {
      if (p[key] == null) return;
      path += (path ? "L" : "M") + `${xS(i).toFixed(1)},${yS(p[key]).toFixed(1)}`;
    });
    return path ? (
      <path d={path} fill="none" stroke={col} strokeWidth={1.5}
        strokeDasharray={dashed ? "4 3" : undefined}
        strokeLinecap="round" strokeLinejoin="round" />
    ) : null;
  };

  const labelIdxs = [0, Math.floor((data.length - 1) / 2), data.length - 1];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 22}`} style={{ width: "100%", display: "block", overflow: "visible" }}>
        {linePath("target", "#333", true)}
        {linePath("actual", "#60a5fa", false)}
        {data.map((p, i) => p.actual != null && (
          <circle key={i} cx={xS(i)} cy={yS(p.actual)} r={2.5} fill="#60a5fa" />
        ))}
        {labelIdxs.map(i => (
          <text key={i} x={xS(i)} y={H + 16} textAnchor="middle"
            fill="#444" fontSize={9} fontFamily="monospace">
            {data[i]?.label || ""}
          </text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, marginTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 14, height: 2, background: "#60a5fa" }} />
          <span style={{ fontSize: 10, color: "#555" }}>Actual</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 14, height: 2, background: "#333" }} />
          <span style={{ fontSize: 10, color: "#555" }}>Target</span>
        </div>
      </div>
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

  const account = root.account;
  const theme = root.theme || DEFAULT_THEME();

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
        notifRef.current.push(setTimeout(() => sendNotif(`⏰ ${h.name}`, "Your scheduled habit is due."), t - new Date()));
      });
    });
    const [bh, bm] = routineTargets.bedtime.split(":").map(Number);
    const bt = new Date(); bt.setHours(bh, bm - 30, 0, 0);
    if (bt < new Date()) bt.setDate(bt.getDate() + 1);
    notifRef.current.push(setTimeout(() => sendNotif("🌙 Bedtime", `Wind down — target: ${fmtTime(routineTargets.bedtime)}`), bt - new Date()));
    return () => notifRef.current.forEach(clearTimeout);
  }, [habits, routineTargets]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = (isMobile && sidebarOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    const pkg = FONT_PACKAGES.find(f => f.id === theme.font) || FONT_PACKAGES[0];
    if (pkg.url) {
      let link = document.getElementById("r-font-link");
      if (!link) { link = document.createElement("link"); link.id = "r-font-link"; link.rel = "stylesheet"; document.head.appendChild(link); }
      link.href = pkg.url;
    }
    let style = document.getElementById("r-theme-vars");
    if (!style) { style = document.createElement("style"); style.id = "r-theme-vars"; document.head.appendChild(style); }
    style.textContent = `:root{--r-bg:${theme.bg};--r-surf:${theme.surf};--r-surf2:${theme.surf2};--r-bord:${theme.bord};--r-fg:${theme.fg};--r-fg2:${theme.fg2};--r-font:${pkg.stack};}`;
  }, [theme]);

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
          <div style={S.setupEmoji}>🔒</div>
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
          {authError && <div style={{ fontSize: 12, color: "#f87171", marginBottom: 10 }}>{authError}</div>}
          <button style={{ ...S.primaryBtn, background: "#34d399", color: "#0d1f17" }} onClick={handlePinLogin}>
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
            <div style={S.setupEmoji}>🌿</div>
            <h1 style={S.setupTitle}>Recovery starts here</h1>
            <p style={S.setupSub}>Your private, all-in-one recovery companion.</p>
            <input style={S.input} placeholder="Name this journey…" value={sd.name} onChange={e => setSetupDraft(d => ({ ...d, name: e.target.value }))} autoFocus />
            <div style={{ fontSize: 10, color: "#444", margin: "12px 0 6px" }}>Pick a colour</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {ACCOUNT_COLORS.map(c => (<div key={c} onClick={() => setSetupDraft(d => ({ ...d, color: c }))} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: sd.color === c ? "3px solid #fff" : "3px solid transparent" }} />))}
            </div>
            <button style={{ ...S.primaryBtn, background: sd.color, color: "#0d0d0f" }} onClick={() => setSetupDraft(d => ({ ...d, step: 1 }))} disabled={!sd.name.trim()}>Next →</button>
          </>)}
          {sd.step === 1 && (<>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
            <div style={S.setupTitle}>What are you working on?</div>
            <p style={S.setupSub}>e.g. alcohol, cigarettes, gambling, social media</p>
            <input style={S.input} placeholder="e.g. alcohol" value={sd.substance} onChange={e => setSetupDraft(d => ({ ...d, substance: e.target.value }))} autoFocus />
            <button style={{ ...S.primaryBtn, marginTop: 12, background: sd.color, color: "#0d0d0f" }} onClick={() => setSetupDraft(d => ({ ...d, step: 2 }))} disabled={!sd.substance.trim()}>Next →</button>
            <button style={{ ...S.primaryBtn, marginTop: 8, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => setSetupDraft(d => ({ ...d, step: 0 }))}>← Back</button>
          </>)}
          {sd.step === 2 && (<>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
            <div style={S.setupTitle}>When did this sobriety begin?</div>
            <p style={S.setupSub}>It's okay if it's today. Every moment is a valid start.</p>
            <input type="date" style={S.input} value={sd.date} max={getTodayStr()} onChange={e => setSetupDraft(d => ({ ...d, date: e.target.value }))} />
            <button style={{ ...S.primaryBtn, marginTop: 12, background: sd.color, color: "#0d0d0f" }} onClick={createJourney}>Start my journey →</button>
            <button style={{ ...S.primaryBtn, marginTop: 8, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => setSetupDraft(d => ({ ...d, step: 1 }))}>← Back</button>
          </>)}
        </div>
      </div>
    );
  }

  const accentColor = account.color || "#34d399";

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
    { label: null, items: [{ id: "dashboard", icon: "◉", label: "Dashboard" }] },
    { label: "DAILY", items: [
      { id: "routine", icon: "🌙", label: "Routine" },
      { id: "habits", icon: "☑", label: "Habits" },
      { id: "schedule", icon: "📅", label: "Schedule" },
      { id: "health", icon: "💧", label: "Health" },
    ]},
    { label: "PROGRESS", items: [
      { id: "goals", icon: "◎", label: "Goals" },
      { id: "rewards", icon: "★", label: "Rewards" },
      { id: "journal", icon: "✎", label: "Journal" },
    ]},
    { label: "SUPPORT", items: [
      { id: "relapse", icon: "⚡", label: "Relapse" },
    ]},
  ];

  return (
    <div style={S.app}>
      {/* ── Mobile top bar ── */}
      {isMobile && (
        <div style={S.mobileHeader}>
          <button style={S.hamburger} onClick={() => setSidebarOpen(o => !o)}>☰</button>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>🌿 Recover</span>
          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "monospace", color: accentColor }}>{daysSober}d</div>
        </div>
      )}

      {/* ── Sidebar backdrop ── */}
      {isMobile && sidebarOpen && <div style={S.sidebarBackdrop} onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside style={{ ...S.sidebar, ...(isMobile ? { position: "fixed", top: 0, bottom: 0, left: 0, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease", zIndex: 200, boxShadow: "4px 0 32px rgba(0,0,0,0.8)", width: 240 } : {}) }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={S.logo}>🌿 Recover</div>
          {isMobile && <button style={{ background: "none", border: "none", color: "var(--r-fg2)", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 0 }} onClick={() => setSidebarOpen(false)}>×</button>}
        </div>

        {/* Account profile */}
        <div style={{ padding: "0 12px 14px", borderBottom: "1px solid var(--r-bord)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 9, background: "var(--r-surf2)" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#0d1f17", flexShrink: 0 }}>
              {(account.name || "R").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>{account.name}</div>
              <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 1 }}>{daysSober}d sober · {account.substance}</div>
            </div>
          </div>
        </div>

        {/* Nav groups */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "10px 10px 0", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
          {navGroups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 4 }}>
              {group.label && <div style={{ fontSize: 10, fontWeight: 600, color: "var(--r-fg2)", letterSpacing: "0.1em", padding: "10px 8px 4px", opacity: 0.6 }}>{group.label}</div>}
              {group.items.map(n => {
                const active = view === n.id;
                return (
                  <button key={n.id} style={{ ...S.navBtn, ...(active ? { background: accentColor + "18", color: "var(--r-fg)", fontWeight: 600 } : {}) }} onClick={() => { setView(n.id); if (isMobile) setSidebarOpen(false); }}>
                    <span style={{ ...S.navIcon, color: active ? accentColor : "var(--r-fg2)" }}>{n.icon}</span>
                    <span style={{ color: active ? "var(--r-fg)" : "var(--r-fg2)" }}>{n.label}</span>
                    {active && <div style={{ width: 3, height: 16, background: accentColor, borderRadius: 2, marginLeft: "auto" }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid var(--r-bord)", marginTop: "auto" }}>
          <button style={{ ...S.navBtn, color: "#f87171", marginBottom: 2 }} onClick={() => { setModal("relapseLog"); if (isMobile) setSidebarOpen(false); }}>
            <span style={{ ...S.navIcon, color: "#f87171" }}>⚠</span>
            <span>Log a relapse</span>
          </button>
          <button style={{ ...S.navBtn, ...(view === "settings" ? { background: accentColor + "18", color: "var(--r-fg)", fontWeight: 600 } : {}) }} onClick={() => { setView("settings"); if (isMobile) setSidebarOpen(false); }}>
            <span style={{ ...S.navIcon, color: view === "settings" ? accentColor : "var(--r-fg2)" }}>⚙</span>
            <span style={{ color: view === "settings" ? "var(--r-fg)" : "var(--r-fg2)" }}>Settings</span>
            {view === "settings" && <div style={{ width: 3, height: 16, background: accentColor, borderRadius: 2, marginLeft: "auto" }} />}
          </button>
          <button style={{ ...S.navBtn, marginTop: 2 }} onClick={handleLock}>
            <span style={{ ...S.navIcon, color: "var(--r-fg2)" }}>🔒</span>
            <span style={{ color: "var(--r-fg2)", fontSize: 12 }}>
              Lock
              {syncStatus === "syncing" && <span style={{ marginLeft: 6, fontSize: 10, color: "#60a5fa" }}>↑ syncing</span>}
              {syncStatus === "synced" && <span style={{ marginLeft: 6, fontSize: 10, color: "#34d399" }}>✓ synced</span>}
              {syncStatus === "error" && <span style={{ marginLeft: 6, fontSize: 10, color: "#f87171" }}>⚠ sync failed</span>}
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ ...S.main, ...(isMobile ? { marginTop: 52 } : {}) }}>

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
          return (
            <div style={S.content}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
                <div>
                  <h2 style={{ ...S.pageTitle, marginBottom: 2 }}>Overview</h2>
                  <div style={{ fontSize: 12, color: "var(--r-fg2)" }}>{new Date().toLocaleDateString("en-AU", { month: "long" })} snapshot</div>
                </div>
                <button style={{ ...S.panicBtn, margin: 0, padding: "9px 14px", borderRadius: 8 }} onClick={() => { setPanicStep(0); setModal("panic"); }}>
                  <span style={{ fontSize: 16 }}>🆘</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#f87171" }}>Panic</span>
                </button>
              </div>

              {/* KPI row */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
                <StatCard value={daysSober} label="Days sober" accent={accentColor} />
                <StatCard value={todayCombinedScore !== null ? todayCombinedScore : "—"} label="Routine score" accent="#60a5fa" />
                <StatCard value={schedTotal ? `${schedDone}/${schedTotal}` : "—"} label="Today's schedule" accent="#a78bfa" />
                <StatCard value={activeGoals.length || "—"} label="Active goals" accent="#f59e0b" />
              </div>

              {/* 2-column body */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, alignItems: "start" }}>
                {/* Left column */}
                <div>
                  {nm && (
                    <div style={S.card}>
                      <div style={S.cardLabel}>Next milestone — {nm.emoji} {nm.label}</div>
                      <div style={S.progressWrap}>
                        <div style={S.progressBg}><div style={{ ...S.progressBar, width: `${Math.min(100, daysSober / nm.days * 100)}%`, background: `linear-gradient(90deg,${accentColor},#60a5fa)` }} /></div>
                        <div style={S.progressText}>{nm.days - daysSober}d to go</div>
                      </div>
                    </div>
                  )}
                  {todayLog ? (
                    <div style={{ ...S.card, borderLeft: "3px solid #60a5fa" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={S.cardLabel}>Last night's sleep</div>
                        <button style={S.linkBtn} onClick={() => setView("routine")}>View →</button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 28, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace", letterSpacing: "-0.02em" }}>{fmtDur(todayLog.durationMins)}</div>
                          <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 3 }}>{fmtTime(todayLog.bedtime)} → {fmtTime(todayLog.waketime)}</div>
                        </div>
                        <div style={{ marginLeft: "auto" }}><CircleRing value={todaySleepScore} size={56} strokeWidth={5} /></div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ ...S.card, cursor: "pointer", borderStyle: "dashed", borderLeft: "3px dashed #60a5fa44" }} onClick={() => setModal("sleepLog")}>
                      <div style={S.cardLabel}>Sleep</div>
                      <div style={{ fontSize: 13, color: "var(--r-fg2)" }}>Log last night's sleep →</div>
                    </div>
                  )}
                  {schedTotal > 0 && (
                    <div style={{ ...S.card, borderLeft: "3px solid #a78bfa" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={S.cardLabel}>Today's schedule</div>
                        <button style={S.linkBtn} onClick={() => setView("schedule")}>View all →</button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <div style={S.progressBg}><div style={{ ...S.progressBar, width: `${schedPct}%`, background: `linear-gradient(90deg,#a78bfa,#60a5fa)` }} /></div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", fontFamily: "monospace", whiteSpace: "nowrap" }}>{schedDone}/{schedTotal}</span>
                      </div>
                      {sortedTodayHabits.slice(0, 4).map(h => {
                        const done = h.completions.includes(today);
                        return (
                          <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0", borderBottom: "0.5px solid var(--r-bord)" }}>
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: done ? "#a78bfa" : "transparent", border: `1.5px solid ${done ? "#a78bfa" : "#444"}`, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: done ? "var(--r-fg2)" : "var(--r-fg)", textDecoration: done ? "line-through" : "none", flex: 1 }}>{h.name}</span>
                            {h.scheduledTimes[0] && <span style={{ fontSize: 10, color: "var(--r-fg2)", fontFamily: "monospace" }}>{fmtTime(h.scheduledTimes[0])}</span>}
                          </div>
                        );
                      })}
                      {schedTotal > 4 && <div style={{ fontSize: 11, color: "var(--r-fg2)", marginTop: 8 }}>+{schedTotal - 4} more items</div>}
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div>
                  {topGoals.length > 0 && (
                    <div style={{ ...S.card, borderLeft: "3px solid #f59e0b" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={S.cardLabel}>Active goals</div>
                        <button style={S.linkBtn} onClick={() => setView("goals")}>All →</button>
                      </div>
                      {topGoals.map(g => {
                        const priColor = g.priority === "high" ? "#f87171" : g.priority === "low" ? "#555" : "#f59e0b";
                        return (
                          <div key={g.id} style={{ padding: "8px 0", borderBottom: "0.5px solid var(--r-bord)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                              <div style={{ width: 5, height: 5, borderRadius: 1, background: priColor, flexShrink: 0 }} />
                              <span style={{ fontSize: 13, flex: 1, fontWeight: 500 }}>{g.title}</span>
                              <span style={{ fontSize: 10, color: GOAL_COLORS[g.period] || "var(--r-fg2)", background: (GOAL_COLORS[g.period] || accentColor) + "18", padding: "1px 7px", borderRadius: 10 }}>{g.period}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 3, background: "var(--r-bord)", borderRadius: 2 }}>
                                <div style={{ height: "100%", width: `${g.progress || 0}%`, background: GOAL_COLORS[g.period] || accentColor, borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 10, color: "var(--r-fg2)", fontFamily: "monospace" }}>{g.progress || 0}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={S.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <div style={S.cardLabel}>Life areas</div>
                      <button style={S.linkBtn} onClick={() => { setView("goals"); setGoalsTab("vision"); }}>Edit →</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                      {lifeAreasArr.map(la => (
                        <div key={la.key} style={{ textAlign: "center" }}>
                          <CircleRing value={la.value} size={44} strokeWidth={4} />
                          <div style={{ fontSize: 9, color: "var(--r-fg2)", marginTop: 4, letterSpacing: "0.02em" }}>{la.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={S.card}>
                    <div style={S.cardLabel}>Milestones</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
                      {MILESTONES.map(m => { const ok = daysSober >= m.days; return (<div key={m.days} style={{ ...S.milestoneChip, opacity: ok ? 1 : 0.18, background: ok ? accentColor + "14" : "transparent", borderColor: ok ? accentColor + "55" : "var(--r-bord)" }}><span style={{ fontSize: 14 }}>{m.emoji}</span><span style={S.mLabel}>{m.label}</span></div>); })}
                    </div>
                  </div>
                </div>
              </div>

              {availRew.length > 0 && (
                <div style={{ ...S.card, borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.04)" }}>
                  <div style={S.cardLabel}>🎁 Rewards unlocked!</div>
                  {availRew.map(r => (
                    <div key={r.id} style={S.rewardRow}>
                      <span style={{ fontSize: 13 }}>{r.name} <span style={{ color: "#555", fontSize: 11 }}>({r.days}d)</span></span>
                      <button style={S.claimBtn} onClick={() => claimReward(r.id)}>Claim ✓</button>
                    </div>
                  ))}
                </div>
              )}
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
                  <div style={{ fontSize: 11, color: "#555", marginTop: 5 }}>Sleep</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <CircleRing value={todayCombinedScore ?? 0} size={96} strokeWidth={8} />
                  <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, marginTop: 5 }}>Routine</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <CircleRing value={todayPrayerScore ?? 0} size={80} strokeWidth={7} />
                  <div style={{ fontSize: 11, color: "#555", marginTop: 5 }}>Prayer</div>
                </div>
              </div>
              <div style={{ height: "0.5px", background: "#161618", margin: "2px 0 14px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={S.cardLabel}>7-day avg</div>
                  <div style={{ display: "flex", gap: 20, marginTop: 6 }}>
                    <div style={{ textAlign: "center" }}>
                      <CircleRing value={avg7Score ?? 0} size={56} strokeWidth={5} />
                      <div style={{ fontSize: 10, color: "#444", marginTop: 3 }}>Sleep</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <CircleRing value={avg7PrayerScore ?? 0} size={56} strokeWidth={5} />
                      <div style={{ fontSize: 10, color: "#444", marginTop: 3 }}>Prayer</div>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Streak</div>
                  <div style={{ fontSize: 34, fontWeight: 700, fontFamily: "monospace", lineHeight: 1, color: routineStreak >= 7 ? "#34d399" : routineStreak >= 3 ? "#f59e0b" : "#60a5fa" }}>
                    {routineStreak}
                  </div>
                  <div style={{ fontSize: 10, color: "#333", marginTop: 3 }}>day{routineStreak !== 1 ? "s" : ""} · score &gt; 70</div>
                </div>
              </div>
            </div>

            {/* ── Sub-navigation ── */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {[["sleep", "🌙 Sleep"], ["prayer", "🕌 Prayer"]].map(([tab, label]) => (
                <button key={tab} onClick={() => setRoutineTab(tab)} style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "none", borderBottom: `2px solid ${routineTab === tab ? (tab === "sleep" ? "#60a5fa" : "#a78bfa") : "transparent"}`, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--r-font)", background: routineTab === tab ?(tab === "sleep" ? "rgba(96,165,250,0.1)" : "rgba(167,139,250,0.1)") : "#0a0a0c", color: routineTab === tab ? (tab === "sleep" ? "#60a5fa" : "#a78bfa") : "#444" }}>
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
                    <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>Today</div>
                    {todaySleepScore === null && <div style={{ fontSize: 10, color: "#2a2a2a", marginTop: 2 }}>not logged</div>}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <CircleRing value={avg7Score ?? 0} size={88} strokeWidth={8} />
                    <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>7-day avg</div>
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
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>{fmtDur(todayLog.durationMins)}</div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>{fmtTime(todayLog.bedtime)} → {fmtTime(todayLog.waketime)}</div>
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
                        <div style={{ background: "#060608", borderRadius: 9, padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "0.5px solid #161618" }}>
                          <div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>{fmtDur(dur)}</div>
                            <div style={{ fontSize: 11, color: vs >= 0 ? "#34d399" : "#f87171", marginTop: 3 }}>{vs >= 0 ? "+" : "−"}{fmtDur(Math.abs(vs))} vs target</div>
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
                      <div style={{ fontSize: 11, color: "#444", width: 64, flexShrink: 0 }}>{new Date(log.date + "T12:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "#777" }}>{fmtTime(log.bedtime)} → {fmtTime(log.waketime)}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>{fmtDur(log.durationMins)}<span style={{ fontSize: 10, fontWeight: 400, color: vs >= 0 ? "#34d399" : "#f87171", marginLeft: 5 }}>{vs >= 0 ? "+" : "−"}{fmtDur(Math.abs(vs))}</span></div>
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
                    <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>Today</div>
                    {todayPrayerScore === null && <div style={{ fontSize: 10, color: "#2a2a2a", marginTop: 2 }}>not logged</div>}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <CircleRing value={avg7PrayerScore ?? 0} size={88} strokeWidth={8} />
                    <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>7-day avg</div>
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
                    ? <span style={{ color: "#f87171", fontSize: 15 }}>✗</span>
                    : prayer?.score === 20 ? <span style={{ color: "#34d399", fontSize: 15 }}>✓</span>
                    : prayer?.score === 10 ? <span style={{ color: "#f59e0b", fontSize: 15 }}>~</span>
                    : <span style={{ color: "#2a2a2a", fontSize: 15 }}>—</span>;
                  return (
                    <div key={p} style={{ padding: "10px 0", borderBottom: idx < PRAYER_NAMES.length - 1 ? "0.5px solid #111" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                          <span style={{ fontSize: 10, color: "#444", marginLeft: 8 }}>{fmtTime(target.earliest)} – {fmtTime(target.latest)}</span>
                        </div>
                        {statusIcon}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input type="time" style={{ ...S.input, flex: 1, opacity: prayer?.missed ? 0.3 : 1, pointerEvents: prayer?.missed ? "none" : "auto" }} value={prayer?.time || ""} onChange={e => updatePrayer(p, { time: e.target.value, missed: false })} />
                        <button style={{ ...S.catBtn, borderColor: prayer?.missed ? "#f87171" : "#2a2a2a", color: prayer?.missed ? "#f87171" : "#555", background: prayer?.missed ? "rgba(248,113,113,0.08)" : "transparent", padding: "7px 10px", fontSize: 11, whiteSpace: "nowrap" }} onClick={() => updatePrayer(p, { time: null, missed: !prayer?.missed })}>
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
                        <span style={{ fontSize: 12, color: "#888" }}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                        <span style={{ fontSize: 12, fontFamily: "monospace", color: accentColor }}>{fmtTime(t.earliest)} – {fmtTime(t.latest)}</span>
                      </div>;
                    })}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {PRAYER_NAMES.map(p => (
                      <div key={p}>
                        <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 7 }}>{p.charAt(0).toUpperCase() + p.slice(1)}</div>
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
                            <span style={{ fontSize: 10, color: "#555" }}>{onTime}/{total} on time</span>
                          </div>
                          <div style={{ display: "flex", height: 7, borderRadius: 4, overflow: "hidden", background: "#161618" }}>
                            {onTime > 0 && <div style={{ width: `${(onTime / total) * 100}%`, background: "#34d399" }} />}
                            {late > 0 && <div style={{ width: `${(late / total) * 100}%`, background: "#f59e0b" }} />}
                            {missed > 0 && <div style={{ width: `${(missed / total) * 100}%`, background: "#f87171", opacity: 0.6 }} />}
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ display: "flex", gap: 16, marginTop: 2 }}>
                      {[["#34d399", "On time"], ["#f59e0b", "Late"], ["#f87171", "Missed"]].map(([col, label]) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: col }} />
                          <span style={{ fontSize: 10, color: "#555" }}>{label}</span>
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
                        <div style={{ fontSize: 11, color: "#444", width: 70, flexShrink: 0 }}>{new Date(log.date + "T12:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</div>
                        <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
                          {PRAYER_NAMES.map(p => {
                            const prayer = log.prayers?.[p];
                            const col = !prayer ? "#1e1e20" : prayer.missed ? "#f87171" : prayer.score === 20 ? "#34d399" : "#f59e0b";
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
            <div style={S.card}>
              <div style={S.cardLabel}>Today — {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{todayDone} / {todayHabits.length} done today</div>
              <div style={S.bigProgressBg}><div style={{ ...S.bigProgressBar, width: `${habitPct}%`, background: `linear-gradient(90deg,${accentColor},#60a5fa)` }} /></div>
            </div>
            {normalizedHabits.length === 0 ? (
              <div style={S.card}><div style={S.empty}>No habits yet. Add one below.</div></div>
            ) : normalizedHabits.map(h => {
              const col = CAT_HEX[h.category] || "#a78bfa";
              const weekCount = getWeekCompletions(h.completions, weekStartStr);
              const lvlCfg = h.levelsEnabled ? h.levels.find(l => l.level === h.currentLevel) : null;
              return (
                <div key={h.id} style={{ ...S.card, borderLeft: `3px solid ${col}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{h.name}</span>
                        {h.levelsEnabled && <span style={{ fontSize: 10, color: "#a78bfa", background: "rgba(167,139,250,0.12)", border: "0.5px solid rgba(167,139,250,0.3)", padding: "1px 7px", borderRadius: 10 }}>Lv.{h.currentLevel}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: col, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h.category}</span>
                        {h.days.length > 0 && <span style={{ fontSize: 10, color: "#555" }}>{h.days.join(" · ")}</span>}
                        {h.days.length === 0 && <span style={{ fontSize: 10, color: "#3a3a3a" }}>every day</span>}
                        {h.scheduledTimes.length > 0 && <span style={{ fontSize: 10, color: "#555", fontFamily: "monospace" }}>{h.scheduledTimes.map(fmtTime).join(", ")}</span>}
                      </div>
                      {h.levelsEnabled && lvlCfg && (
                        <div style={{ fontSize: 11, color: "#555", marginTop: 5 }}>
                          {lvlCfg.description && <span style={{ marginRight: 8 }}>{lvlCfg.description}</span>}
                          {lvlCfg.upPerWeek != null && (
                            <span style={{ color: weekCount >= lvlCfg.upPerWeek ? "#34d399" : lvlCfg.downPerWeek != null && weekCount < lvlCfg.downPerWeek ? "#f87171" : "#60a5fa" }}>
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
            ...viewHabits.map(h => ({ _type: "habit", id: h.id, name: h.name, time: h.scheduledTimes[0] || null, col: CAT_HEX[h.category] || "#a78bfa", data: h })),
            ...viewActivities.map(a => ({ _type: "activity", id: a.id, name: a.name, time: a.times?.[0] || a.time || null, col: "#60a5fa", data: a })),
            ...viewMeds.map(m => ({ _type: "med", id: m.id, name: m.name + (m.notes ? ` — ${m.notes}` : ""), time: m.time, col: "#2dd4bf", data: m })),
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
                    <button key={date} onClick={() => setScheduleViewDate(date)} style={{ flex: 1, minWidth: 36, padding: "6px 2px", borderRadius: 7, border: `1px solid ${isActive ? accentColor : "#161618"}`, fontSize: 11, fontWeight: isT ? 700 : 400, cursor: "pointer", fontFamily: "var(--r-font)", background: isActive ? accentColor + "18" : "transparent", color: isActive ? accentColor : isT ? "#aaa" : "#444", textAlign: "center" }}>
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
                          {item.time ? <span style={{ fontSize: 11, color: done ? "#444" : item.col, fontFamily: "monospace", fontWeight: 600 }}>{fmtTime(item.time)}</span> : <span style={{ fontSize: 10, color: "#333" }}>—</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 500, textDecoration: done ? "line-through" : "none" }}>{item.name}</span>
                            {h?.levelsEnabled && <span style={{ fontSize: 9, color: "#a78bfa", background: "rgba(167,139,250,0.12)", padding: "1px 5px", borderRadius: 8 }}>Lv.{h.currentLevel}</span>}
                            {item._type === "med" && <span style={{ fontSize: 9, color: "#2dd4bf", background: "rgba(45,212,191,0.1)", padding: "1px 5px", borderRadius: 8 }}>med</span>}
                          </div>
                          {h?.levelsEnabled && lvlCfg && (
                            <div style={{ fontSize: 10, marginTop: 2, color: upReady ? "#34d399" : downRisk ? "#f87171" : "#555" }}>
                              {weekCount}/{lvlCfg.upPerWeek ?? "?"} this week{upReady && " · ready to level up!"}{downRisk && " · at risk of drop"}
                            </div>
                          )}
                          {item._type === "activity" && <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>{item.data.type === "oneTime" ? "one-time" : !item.data.days?.length ? "daily" : item.data.days.join(" · ")}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button style={{ ...S.checkBtn, background: done ? "#34d399" : "transparent", borderColor: done ? "#34d399" : isToday ? "#333" : "#1a1a1e", cursor: isToday ? "pointer" : "default", opacity: isToday ? 1 : 0.35 }} onClick={() => isToday && toggleItem(item)}>{done ? "✓" : ""}</button>
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
                        <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>{act.type === "oneTime" ? `one-time · ${act.date}` : !act.days?.length ? "daily" : act.days.join(" · ")}{(act.times?.[0] || act.time) && ` · ${fmtTime(act.times?.[0] || act.time)}`}</div>
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
                {[["water","💧 Water"],["meds","💊 Meds"],["exercise","🏃 Exercise"],["body","⚖ Body"]].map(([t, label]) => (
                  <button key={t} onClick={() => setHealthTab(t)} style={{ flex: 1, padding: "8px 4px", borderRadius: 7, border: "none", borderBottom: `2px solid ${healthTab === t ? "#2dd4bf" : "transparent"}`, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--r-font)", background: healthTab === t ? "rgba(45,212,191,0.08)" : "var(--r-surf)", color: healthTab === t ? "#2dd4bf" : "#444" }}>{label}</button>
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
                        <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "monospace", color: "#2dd4bf", lineHeight: 1 }}>{todayWater}<span style={{ fontSize: 14, color: "#444", marginLeft: 4 }}>/ {waterConfig.dailyTarget}</span></div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{waterConfig.glassSize}ml · {Math.round(todayWater * waterConfig.glassSize)}ml today</div>
                        <div style={{ fontSize: 11, color: waterStreak > 0 ? "#2dd4bf" : "#333", marginTop: 3 }}>{waterStreak > 0 ? `🔥 ${waterStreak} day streak` : "Start your streak"}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ flex: 3, padding: "12px", borderRadius: 8, border: "1.5px solid #2dd4bf", background: "rgba(45,212,191,0.08)", color: "#2dd4bf", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "var(--r-font)" }} onClick={() => logWater(1)}>+ glass</button>
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
                          <div style={{ width: "100%", height: Math.max(3, Math.round(pct2 * 44)), background: pct2 >= 1 ? "#2dd4bf" : pct2 > 0 ? "#2dd4bf55" : "#161618", borderRadius: 3, marginTop: "auto" }} />
                          <div style={{ fontSize: 9, color: ds === today ? "#2dd4bf" : "#333" }}>{DAY_NAMES[d.getDay()].slice(0,1)}</div>
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
                        <button style={{ ...S.checkBtn, background: done ? "#2dd4bf" : "transparent", borderColor: done ? "#2dd4bf" : "#333", flexShrink: 0 }} onClick={() => toggleMedication(med.id, today)}>{done ? "✓" : ""}</button>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, textDecoration: done ? "line-through" : "none", opacity: done ? 0.5 : 1 }}>{med.name}</div>
                          <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>{med.time && <span style={{ marginRight: 8, fontFamily: "monospace" }}>{fmtTime(med.time)}</span>}{med.notes}</div>
                        </div>
                        <button style={{ ...S.linkBtn, fontSize: 11 }} onClick={() => { setMedDraft({ name: med.name, time: med.time || "", days: med.days || [], notes: med.notes || "" }); setEditMedId(med.id); }}>Edit</button>
                        <button style={S.deleteBtn} onClick={() => upd({ medications: medications.filter(m => m.id !== med.id) })}>×</button>
                      </div>
                    );
                  })}
                </div>
                {medDraft && (
                  <div style={{ ...S.card, borderColor: "rgba(45,212,191,0.3)" }}>
                    <div style={{ fontSize: 12, color: "#2dd4bf", fontWeight: 600, marginBottom: 12 }}>{editMedId ? "Edit" : "Add"} medication</div>
                    <input style={S.input} placeholder="Name (e.g. Vitamin D, 500mg Metformin…)" value={medDraft.name} onChange={e => setMedDraft(d => ({ ...d, name: e.target.value }))} autoFocus />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                      <div style={S.formRow}><label style={S.formLabel}>Time (optional)</label><input type="time" style={S.input} value={medDraft.time || ""} onChange={e => setMedDraft(d => ({ ...d, time: e.target.value }))} /></div>
                      <div style={S.formRow}><label style={S.formLabel}>Notes (dosage etc.)</label><input style={S.input} placeholder="e.g. 500mg with food" value={medDraft.notes || ""} onChange={e => setMedDraft(d => ({ ...d, notes: e.target.value }))} /></div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ ...S.formLabel, marginBottom: 6 }}>Days (blank = every day)</div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {DAY_NAMES.map(day => <button key={day} style={{ ...S.catBtn, borderColor: medDraft.days.includes(day) ? "#2dd4bf" : "#222", color: medDraft.days.includes(day) ? "#2dd4bf" : "#444", background: medDraft.days.includes(day) ? "rgba(45,212,191,0.1)" : "transparent" }} onClick={() => setMedDraft(d => ({ ...d, days: d.days.includes(day) ? d.days.filter(x => x !== day) : [...d.days, day] }))}>{day}</button>)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button style={{ ...S.primaryBtn, flex: 1, background: "#2dd4bf", color: "#0d1f17" }} onClick={saveMedication}>Save</button>
                      <button style={{ ...S.primaryBtn, flex: 1, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)" }} onClick={() => { setMedDraft(null); setEditMedId(null); }}>Cancel</button>
                    </div>
                  </div>
                )}
                {medications.length > 0 && (
                  <div style={S.card}>
                    <div style={S.cardLabel}>7-day adherence</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr><td style={{ fontSize: 10, color: "#333", padding: "3px 6px 6px 0", width: 90 }} />{Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return <td key={i} style={{ fontSize: 9, color: "#444", textAlign: "center", padding: "3px 4px" }}>{DAY_NAMES[d.getDay()].slice(0,1)}</td>; })}</tr></thead>
                        <tbody>{medications.map(med => <tr key={med.id}><td style={{ fontSize: 11, color: "#666", padding: "4px 6px 4px 0", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{med.name}</td>{Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(12,0,0,0); const ds = d.toISOString().split("T")[0]; const taken = (medicationLogs[ds] || []).includes(med.id); const isT = ds === today; return <td key={i} style={{ textAlign: "center", padding: "4px" }}><div style={{ width: 14, height: 14, borderRadius: "50%", background: taken ? "#2dd4bf" : "#161618", border: `1px solid ${isT ? "#2dd4bf44" : "transparent"}`, margin: "0 auto", cursor: isT ? "pointer" : "default" }} onClick={() => isT && toggleMedication(med.id, today)} /></td>; })}</tr>)}</tbody>
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
                    <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>Volume</div><div style={{ ...S.sleepTargetVal, color: "#34d399" }}>{fmtDur(thisWeekExerciseMins)}</div></div>
                    <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>Sessions</div><div style={{ ...S.sleepTargetVal, color: "#34d399" }}>{weekExSessions}</div></div>
                  </div>
                </div>
                {exerciseDraft ? (
                  <div style={{ ...S.card, borderColor: "rgba(52,211,153,0.3)" }}>
                    <div style={{ fontSize: 12, color: "#34d399", fontWeight: 600, marginBottom: 12 }}>Log exercise</div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ ...S.formLabel, marginBottom: 6 }}>Category</div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {EXERCISE_CATS.map(cat => <button key={cat} style={{ ...S.catBtn, borderColor: exerciseDraft.category === cat ? EXERCISE_CAT_HEX[cat] : "#222", color: exerciseDraft.category === cat ? EXERCISE_CAT_HEX[cat] : "#444", background: exerciseDraft.category === cat ? EXERCISE_CAT_HEX[cat] + "18" : "transparent" }} onClick={() => setExerciseDraft(d => ({ ...d, category: cat }))}>{cat}</button>)}
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
                  <button style={{ ...S.primaryBtn, background: "transparent", border: "1px dashed #34d39955", color: "#34d399", marginBottom: 10 }} onClick={() => setExerciseDraft({ type: "", category: "cardio", durationMins: "", date: today, notes: "" })}>+ Log exercise</button>
                )}
                <div style={S.card}>
                  <div style={S.cardLabel}>History</div>
                  {exerciseLogs.length === 0 ? <div style={S.empty}>No exercise logged yet.</div> : [...exerciseLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50).map(entry => {
                    const col = EXERCISE_CAT_HEX[entry.category] || "#34d399";
                    return (
                      <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "0.5px solid #111" }}>
                        <div style={{ width: 4, alignSelf: "stretch", background: col, borderRadius: 2, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13 }}>{entry.type}</div>
                          <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>{entry.category} · {fmtDur(entry.durationMins)}{entry.notes && ` · ${entry.notes}`}</div>
                        </div>
                        <div style={{ fontSize: 11, color: "#444" }}>{new Date(entry.date + "T12:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</div>
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
                    <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "monospace", color: accentColor, lineHeight: 1 }}>{latestMetric.weight}<span style={{ fontSize: 14, color: "#444", marginLeft: 5 }}>{latestMetric.unit}</span></div>
                    <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Logged {new Date(latestMetric.date + "T12:00").toLocaleDateString("en-AU", { day: "numeric", month: "long" })}</div>
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
                      <div style={S.formRow}><label style={S.formLabel}>Unit</label><div style={{ display: "flex", gap: 5, marginTop: 2 }}>{["kg","lbs"].map(u => <button key={u} style={{ ...S.catBtn, flex: 1, borderColor: metricDraft.unit === u ? accentColor : "#222", color: metricDraft.unit === u ? accentColor : "#444", background: metricDraft.unit === u ? accentColor + "18" : "transparent" }} onClick={() => setMetricDraft(d => ({ ...d, unit: u }))}>{u}</button>)}</div></div>
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
                            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace" }}>{entry.weight} {entry.unit}</div>
                            {entry.notes && <div style={{ fontSize: 11, color: "#444", marginTop: 1 }}>{entry.notes}</div>}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: "#444" }}>{new Date(entry.date + "T12:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</div>
                            {delta !== null && <div style={{ fontSize: 10, color: delta < 0 ? "#34d399" : delta > 0 ? "#f87171" : "#555", marginTop: 1 }}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}</div>}
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
          const priColors = { high: "#f87171", med: "#f59e0b", low: "#34d399" };
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
                  <button key={t} onClick={() => setGoalsTab(t)} style={{ flex: 1, padding: "8px 4px", borderRadius: 7, border: "none", borderBottom: `2px solid ${goalsTab === t ? accentColor : "transparent"}`, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--r-font)", background: goalsTab === t ? accentColor + "18" : "var(--r-surf)", color: goalsTab === t ? accentColor : "#444", whiteSpace: "nowrap" }}>{label}</button>
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
                    <p style={{ fontSize: 13, color: "#aaa", lineHeight: 1.8, margin: 0 }}>{vision.lifeVision}</p>
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
                          <div style={{ fontSize: 9, color: "#555", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{area.label}</div>
                          <div style={{ fontSize: 11, fontFamily: "monospace", color: area.color, marginTop: 1 }}>{vision.lifeAreas[area.key] || 0}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {LIFE_AREAS.map(area => (
                        <div key={area.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 76, fontSize: 12, color: area.color }}>{area.label}</div>
                          <input type="range" min="1" max="10" value={lifeAreasDraft?.[area.key] || 5} onChange={e => setLifeAreasDraft(d => ({ ...d, [area.key]: Number(e.target.value) }))} style={{ flex: 1, accentColor: area.color }} />
                          <div style={{ width: 18, fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: area.color, textAlign: "right" }}>{lifeAreasDraft?.[area.key] || 5}</div>
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
                  {reminders.map(r => (<div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderBottom: "0.5px solid #1a1a1a" }}><span style={{ fontSize: 13, color: "#f59e0b", fontStyle: "italic", lineHeight: 1.6, flex: 1 }}>"{r.text}"</span><button style={S.deleteBtn} onClick={() => upd({ reminders: reminders.filter(x => x.id !== r.id) })}>×</button></div>))}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}><input style={{ ...S.input, flex: 1 }} placeholder="Add a reminder or quote…" value={newRem} onChange={e => setNewRem(e.target.value)} onKeyDown={e => e.key === "Enter" && addReminder()} /><button style={{ ...S.primaryBtn, width: "auto", padding: "9px 14px" }} onClick={addReminder}>Add</button></div>
                </div>
              </>)}

              {/* ── Goals tab ── */}
              {goalsTab === "goals" && (<>
                {/* Period filter */}
                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  {PERIOD_ORDER.map(p => (
                    <button key={p} onClick={() => { setGoalsPeriod(p); setGoalDraft(null); setEditGoalId(null); }} style={{ flex: 1, padding: "7px 4px", borderRadius: 6, border: `1px solid ${goalsPeriod === p ? GOAL_COLORS[p] + "66" : "#161618"}`, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--r-font)", background: goalsPeriod === p ? GOAL_COLORS[p] + "18" : "transparent", color: goalsPeriod === p ? GOAL_COLORS[p] : "#444" }}>{p}</button>
                  ))}
                </div>
                {/* Area filter */}
                <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", paddingBottom: 2 }}>
                  <button style={{ ...S.catBtn, borderColor: !goalsAreaFilter ? accentColor : "#222", color: !goalsAreaFilter ? accentColor : "#444", background: !goalsAreaFilter ? accentColor + "18" : "transparent", whiteSpace: "nowrap" }} onClick={() => setGoalsAreaFilter("")}>All</button>
                  {LIFE_AREAS.map(a => (<button key={a.key} style={{ ...S.catBtn, borderColor: goalsAreaFilter === a.key ? a.color : "#222", color: goalsAreaFilter === a.key ? a.color : "#444", background: goalsAreaFilter === a.key ? a.color + "18" : "transparent", whiteSpace: "nowrap" }} onClick={() => setGoalsAreaFilter(goalsAreaFilter === a.key ? "" : a.key)}>{a.label}</button>))}
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
                        <div style={{ ...S.goalCheck, background: done ? pc : "transparent", borderColor: pc, flexShrink: 0, marginTop: 2 }} onClick={() => toggleGoal(g.id)}>{done && <span style={{ color: "#0d0d0f", fontSize: 11 }}>✓</span>}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, textDecoration: done ? "line-through" : "none", lineHeight: 1.4 }}>{g.title}</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: priColors[g.priority], background: priColors[g.priority] + "18", padding: "1px 7px", borderRadius: 10, border: `0.5px solid ${priColors[g.priority]}44` }}>{g.priority}</span>
                            {areaInfo && <span style={{ fontSize: 10, color: areaInfo.color }}>{areaInfo.label}</span>}
                            {g.dueDate && <span style={{ fontSize: 10, color: "#444" }}>due {g.dueDate}</span>}
                            {parentGoal && <span style={{ fontSize: 10, color: "#333" }}>↑ {parentGoal.title}</span>}
                          </div>
                          {g.notes && <div style={{ fontSize: 11, color: "#444", marginTop: 5, lineHeight: 1.5 }}>{g.notes}</div>}
                          <div style={{ marginTop: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#444", marginBottom: 3 }}><span>Progress</span><span style={{ color: g.progress >= 100 ? "#34d399" : "#aaa" }}>{g.progress}%</span></div>
                            <input type="range" min="0" max="100" value={g.progress} onChange={e => upd({ goals: goals.map(x => x.id === g.id ? { ...x, progress: Number(e.target.value) } : x) })} style={{ width: "100%", accentColor: pc, cursor: "pointer" }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                          <button style={{ ...S.linkBtn, fontSize: 11 }} onClick={() => { setGoalDraft({ title: g.title, priority: g.priority, dueDate: g.dueDate, notes: g.notes, lifeArea: g.lifeArea, parentId: g.parentId }); setEditGoalId(g.id); }}>Edit</button>
                          <button style={{ ...S.linkBtn, fontSize: 11, color: "#444" }} onClick={() => upd({ goals: goals.map(x => x.id === g.id ? { ...x, archived: true } : x) })}>Archive</button>
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
                          {["high","med","low"].map(p => <button key={p} style={{ ...S.catBtn, flex: 1, borderColor: goalDraft.priority === p ? priColors[p] : "#222", color: goalDraft.priority === p ? priColors[p] : "#444", background: goalDraft.priority === p ? priColors[p] + "18" : "transparent" }} onClick={() => setGoalDraft(d => ({ ...d, priority: p }))}>{p}</button>)}
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
                        <button style={{ ...S.catBtn, borderColor: !goalDraft.lifeArea ? accentColor : "#222", color: !goalDraft.lifeArea ? accentColor : "#444" }} onClick={() => setGoalDraft(d => ({ ...d, lifeArea: "" }))}>None</button>
                        {LIFE_AREAS.map(a => <button key={a.key} style={{ ...S.catBtn, borderColor: goalDraft.lifeArea === a.key ? a.color : "#222", color: goalDraft.lifeArea === a.key ? a.color : "#444", background: goalDraft.lifeArea === a.key ? a.color + "18" : "transparent" }} onClick={() => setGoalDraft(d => ({ ...d, lifeArea: a.key }))}>{a.label}</button>)}
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
                      <button style={{ ...S.primaryBtn, flex: 1, background: GOAL_COLORS[goalsPeriod], color: "#0d0d0f" }} onClick={() => {
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
                      <div style={{ fontSize: 10, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Needs most attention</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{weakest.name}</div>
                      <div style={{ fontSize: 11, color: "#f87171" }}>{calcHabitRate(weakest, 30)}% completion last 30 days</div>
                    </div>
                  )}
                  {normalizedHabits.length === 0 ? (
                    <div style={S.card}><div style={S.empty}>No habits yet. <button style={S.linkBtn} onClick={() => setView("habits")}>Add habits →</button></div></div>
                  ) : normalizedHabits.map(h => {
                    const streak = calcStreak(h.completions);
                    const longest = calcLongestStreak(h.completions);
                    const weekRate = calcHabitRate(h, 7);
                    const monthRate = calcHabitRate(h, 30);
                    const col = CAT_HEX[h.category] || "#a78bfa";
                    return (
                      <div key={h.id} style={{ ...S.card, borderLeft: `3px solid ${col}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{h.name}</div>
                            <div style={{ fontSize: 10, color: col, textTransform: "uppercase", marginTop: 2 }}>{h.category}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "monospace", color: streak >= 7 ? "#34d399" : streak >= 3 ? "#f59e0b" : "#aaa", lineHeight: 1 }}>{streak}</div>
                            <div style={{ fontSize: 9, color: "#444" }}>day streak</div>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                          <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>Longest</div><div style={{ ...S.sleepTargetVal, color: "#a78bfa" }}>{longest}d</div></div>
                          <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>This week</div><div style={{ ...S.sleepTargetVal, color: weekRate >= 80 ? "#34d399" : weekRate >= 50 ? "#f59e0b" : "#f87171" }}>{weekRate}%</div></div>
                          <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>This month</div><div style={{ ...S.sleepTargetVal, color: monthRate >= 80 ? "#34d399" : monthRate >= 50 ? "#f59e0b" : "#f87171" }}>{monthRate}%</div></div>
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
                    <div style={{ background: "#060608", border: "0.5px solid rgba(52,211,153,0.3)", borderRadius: 10, padding: "16px" }}>
                      <div style={{ fontSize: 13, lineHeight: 1.75, color: "#ddd", marginBottom: 14 }}>{contract.text}</div>
                      <div style={{ height: "0.5px", background: "#1a1a1e", marginBottom: 12 }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div>
                          <div style={{ fontSize: 13, color: "#34d399", fontStyle: "italic" }}>— {contract.signature}</div>
                          <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{contract.signedDate}</div>
                        </div>
                        <div style={{ fontSize: 22 }}>✍</div>
                      </div>
                    </div>
                  ) : contractDraft ? (
                    <>
                      <textarea style={{ ...S.textarea, marginBottom: 8 }} placeholder="Write your commitment. What are you promising yourself?" rows={4} value={contractDraft.text || ""} onChange={e => setContractDraft(d => ({ ...d, text: e.target.value }))} />
                      <input style={{ ...S.input, marginBottom: 8 }} placeholder="Sign with your name" value={contractDraft.signature || ""} onChange={e => setContractDraft(d => ({ ...d, signature: e.target.value }))} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ ...S.primaryBtn, flex: 1, background: "#34d399", color: "#0d1f17" }} onClick={() => { if (!contractDraft.text?.trim() || !contractDraft.signature?.trim()) return; upd({ accountability: { ...accountability, contract: { ...contractDraft, locked: true, signedDate: getTodayStr() } } }); setContractDraft(null); }}>Sign &amp; lock permanently</button>
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
                          <span style={{ fontSize: 11, color: unlocked ? "#34d399" : "#555" }}>{unlocked ? "Unlocked" : `Sealed until ${letter.unlockDate}`}</span>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: "#333" }}>Written {letter.writtenDate}</span>
                            <button style={S.deleteBtn} onClick={() => upd({ accountability: { ...accountability, futureLetters: (accountability.futureLetters || []).filter(l => l.id !== letter.id) } })}>×</button>
                          </div>
                        </div>
                        {unlocked ? <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.75 }}>{letter.text}</div> : <div style={{ fontSize: 12, color: "#2a2a2a", fontStyle: "italic" }}>This letter is sealed.</div>}
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
                        <span style={{ fontSize: 11, color: "#34d399" }}>This week completed ✓</span>
                        <button style={S.linkBtn} onClick={() => setWRD({ wentWell: thisWeekReview.wentWell, didntGo: thisWeekReview.didntGo, focus: thisWeekReview.focus })}>Edit</button>
                      </div>
                      {[["Went well", thisWeekReview.wentWell], ["Didn't go well", thisWeekReview.didntGo], ["Focus next week", thisWeekReview.focus]].map(([label, val]) => (
                        <div key={label} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{label}</div>
                          <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>{val || "—"}</div>
                        </div>
                      ))}
                    </div>
                  ) : weeklyReviewDraft ? (
                    <div>
                      {[["What went well this week?", "wentWell", "#34d399"], ["What didn't go well?", "didntGo", "#f87171"], ["Focus for next week?", "focus", "#60a5fa"]].map(([q, key, col]) => (
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
                      <div style={{ fontSize: 10, color: "#333", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Past reviews</div>
                      {[...(accountability.weeklyReviews || [])].filter(r => r.weekStr !== thisWeekStr).sort((a, b) => b.weekStr.localeCompare(a.weekStr)).slice(0, 5).map(r => (
                        <div key={r.id} style={{ padding: "7px 0", borderBottom: "0.5px solid #111", fontSize: 11, color: "#444" }}>
                          Week of {r.weekStr} — <span style={{ color: "#aaa" }}>{r.focus || r.wentWell || "—"}</span>
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
                      <span style={{ color: "#f59e0b", fontSize: 14, flexShrink: 0 }}>★</span>
                      <span style={{ fontSize: 13, flex: 1, lineHeight: 1.5 }}>{w.text}</span>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#333" }}>{w.date}</span>
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
                      <div style={{ fontSize: 11, color: "#34d399", marginBottom: 8 }}>Today logged ✓</div>
                      {todayGratitude.items.map((item, i) => <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0" }}><span style={{ color: "#a78bfa", fontSize: 12, flexShrink: 0 }}>{i + 1}.</span><span style={{ fontSize: 13, color: "#aaa" }}>{item}</span></div>)}
                      <button style={{ ...S.linkBtn, marginTop: 8, fontSize: 12 }} onClick={() => setGratitudeDraft(todayGratitude.items.length >= 3 ? todayGratitude.items : [...todayGratitude.items, ...["","",""].slice(0, 3 - todayGratitude.items.length)])}>Update today</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, color: "#555", marginBottom: 10 }}>3 things you're grateful for today</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ color: "#a78bfa", fontSize: 12, width: 16, flexShrink: 0 }}>{i + 1}.</span>
                            <input style={{ ...S.input, flex: 1 }} placeholder="Grateful for…" value={gratitudeDraft[i] || ""} onChange={e => setGratitudeDraft(d => d.map((x, j) => j === i ? e.target.value : x))} />
                          </div>
                        ))}
                      </div>
                      <button style={S.primaryBtn} onClick={() => { const items = gratitudeDraft.filter(x => x.trim()); if (!items.length) return; const today = getTodayStr(); upd({ accountability: { ...accountability, gratitude: [{ id: "gr" + Date.now(), date: today, items }, ...(accountability.gratitude || []).filter(g => g.date !== today)] } }); setGratitudeDraft(["","",""]); }}>Save gratitude</button>
                    </div>
                  )}
                  {(accountability.gratitude || []).filter(g => g.date !== getTodayStr()).slice(0, 7).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 10, color: "#333", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Recent</div>
                      {[...(accountability.gratitude || [])].filter(g => g.date !== getTodayStr()).slice(0, 7).map(g => (
                        <div key={g.id} style={{ padding: "8px 0", borderBottom: "0.5px solid #111" }}>
                          <div style={{ fontSize: 10, color: "#444", marginBottom: 4 }}>{g.date}</div>
                          {g.items.map((item, i) => <div key={i} style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{i + 1}. {item}</div>)}
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
              <div style={S.cardLabel}>⚡ Crisis tools</div>
              <p style={{ color: "#f97316", fontSize: 13, lineHeight: 1.65, margin: 0 }}>Cravings peak within 20 min then fall. Use these right now.</p>
            </div>
            {BUILTIN_RELAPSE_TOOLS.map(a => (<div key={a.id} style={S.actionCard}><div style={{ fontSize: 20, flexShrink: 0 }}>{a.icon}</div><div><div style={S.actionTitle}>{a.title}</div><div style={S.actionDesc}>{a.desc}</div></div></div>))}
            <div style={{ ...S.card, borderColor: "rgba(167,139,250,0.25)", marginTop: 8 }}>
              <div style={S.cardLabel}>⚙ My post-relapse protocol</div>
              <p style={{ fontSize: 12, color: "#555", marginBottom: 12, lineHeight: 1.6 }}>These actions and reminders will be shown immediately after you log a relapse.</p>
              <div style={{ fontSize: 11, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Immediate actions to do</div>
              {postRelapseActions.map(a => (<div key={a.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, fontSize: 13, color: "#aaa" }}><span style={{ color: "#a78bfa" }}>→</span><span style={{ flex: 1 }}>{a.text}</span><button style={S.deleteBtn} onClick={() => upd({ postRelapseActions: postRelapseActions.filter(x => x.id !== a.id) })}>×</button></div>))}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}><input style={{ ...S.input, flex: 1, fontSize: 12 }} placeholder="Add an immediate action…" value={newPostAction} onChange={e => setNewPostAction(e.target.value)} onKeyDown={e => e.key === "Enter" && addPostAction()} /><button style={{ ...S.primaryBtn, width: "auto", padding: "8px 12px" }} onClick={addPostAction}>Add</button></div>
              <div style={{ fontSize: 11, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Post-relapse reminders</div>
              {postRelapseReminders.map(r => (<div key={r.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8, fontSize: 13, color: "#aaa", fontStyle: "italic" }}><span style={{ color: "#f59e0b" }}>"</span><span style={{ flex: 1, lineHeight: 1.55 }}>{r.text}"</span><button style={S.deleteBtn} onClick={() => upd({ postRelapseReminders: postRelapseReminders.filter(x => x.id !== r.id) })}>×</button></div>))}
              <div style={{ display: "flex", gap: 8 }}><input style={{ ...S.input, flex: 1, fontSize: 12 }} placeholder="Add an affirmation or reminder…" value={newPostReminder} onChange={e => setNewPostReminder(e.target.value)} onKeyDown={e => e.key === "Enter" && addPostReminder()} /><button style={{ ...S.primaryBtn, width: "auto", padding: "8px 12px" }} onClick={addPostReminder}>Add</button></div>
            </div>
            <div style={S.card}><div style={S.cardLabel}>Relapse history</div>{!(account?.relapses?.length) ? <div style={S.empty}>No relapses recorded. Keep going 💪</div> : [...(account.relapses || [])].reverse().map((r, i) => (<div key={i} style={{ padding: "10px 0", borderBottom: "0.5px solid #161616" }}><div style={{ fontSize: 11, color: "#f97316", marginBottom: 3 }}>{new Date(r.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</div>{r.note && <div style={{ fontSize: 12, color: "#888", lineHeight: 1.55 }}>{r.note}</div>}{r.tools?.length > 0 && <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Tools used: {r.tools.join(", ")}</div>}</div>))}</div>
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
                            {isLocked && <span style={{ marginLeft: 6, color: "#60a5fa" }}>· {r.days - daysSober}d to go</span>}
                            {isClaimed && <span style={{ marginLeft: 6, color: "#34d399" }}>· claimed</span>}
                          </div>
                        </div>
                        {isUnlocked && <button style={S.claimBtn} onClick={() => claimReward(r.id)}>Claim ✓</button>}
                        {isLocked && <div style={{ fontSize: 13, opacity: 0.3 }}>🔒</div>}
                        {isClaimed && <div style={{ fontSize: 13 }}>✅</div>}
                        <button style={{ ...S.deleteBtn, color: "var(--r-fg2)", fontSize: 13, padding: "2px 6px" }} onClick={() => { setEditRewId(r.id); setEditRewDraft({ name: r.name, days: r.days }); }}>✎</button>
                        <button style={{ ...S.deleteBtn, color: "#f87171", fontSize: 13, padding: "2px 6px" }} onClick={() => { if (window.confirm(`Delete "${r.name}"?`)) deleteReward(r.id); }}>✕</button>
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
            if (p) updTheme({ preset: p.id, bg: p.bg, surf: p.surf, surf2: p.surf2, bord: p.bord, fg: p.fg, fg2: p.fg2 });
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
              {settingsTab === "appearance" && (<>
                <div style={S.card}>
                  <div style={S.cardLabel}>Theme preset</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 8 }}>
                    {THEME_PRESETS.map(p => {
                      const active = theme.preset === p.id;
                      return (
                        <button key={p.id} onClick={() => applyPreset(p.id)} style={{ padding: "12px 8px", borderRadius: 9, border: `2px solid ${active ? accentColor : p.bord}`, background: p.bg, cursor: "pointer", textAlign: "center", transition: "border-color 0.2s" }}>
                          <div style={{ display: "flex", gap: 3, justifyContent: "center", marginBottom: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.surf }} />
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.fg }} />
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.fg2 }} />
                          </div>
                          <div style={{ fontSize: 11, color: p.fg, fontWeight: active ? 700 : 400 }}>{p.name}</div>
                          {active && <div style={{ fontSize: 9, color: accentColor, marginTop: 2 }}>Active</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={S.card}>
                  <div style={S.cardLabel}>Custom colours</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                    {[["bg","Background"],["surf","Surface"],["bord","Border"],["fg","Text"],["fg2","Muted text"]].map(([key, label]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 12, color: "var(--r-fg2)", width: 90 }}>{label}</span>
                        <input type="color" value={theme[key] || "#000000"} onChange={e => updTheme({ [key]: e.target.value, preset: "custom" })} style={{ width: 36, height: 28, padding: 2, borderRadius: 5, border: "1px solid var(--r-bord)", background: "transparent", cursor: "pointer" }} />
                        <span style={{ fontSize: 11, color: "var(--r-fg2)", fontFamily: "monospace" }}>{theme[key]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={S.card}>
                  <div style={S.cardLabel}>Font</div>
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
                  <div style={S.cardLabel}>Accent colour</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {ACCOUNT_COLORS.map(c => (
                      <div key={c} onClick={() => upd({ color: c })} style={{ width: 32, height: 32, borderRadius: "50%", background: c, cursor: "pointer", border: accentColor === c ? "3px solid #fff" : "3px solid transparent", transition: "border-color 0.2s" }} />
                    ))}
                  </div>
                </div>
              </>)}

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
                  <button style={{ ...S.primaryBtn, background: "transparent", border: "1px solid rgba(248,113,113,0.4)", color: "#f87171" }} onClick={() => { if (window.confirm("Delete ALL data? This cannot be undone.")) { localStorage.removeItem(ROOT_KEY); window.location.reload(); } }}>Delete all data</button>
                </div>
              </>)}
            </div>
          );
        })()}
      </main>

      {/* ══════════════════ MODALS ══════════════════ */}

      {modal === "sleepLog" && (
        <div style={S.overlay} onClick={() => setModal(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>🌙 Log your sleep</div>
            <p style={S.modalSub}>Scored on duration and alignment with your {fmtTime(routineTargets.bedtime)} → {fmtTime(routineTargets.waketime)} target.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={S.formRow}><label style={S.formLabel}>Bedtime</label><input type="time" style={S.input} value={logBed} onChange={e => setLogBed(e.target.value)} /></div>
              <div style={S.formRow}><label style={S.formLabel}>Wake time</label><input type="time" style={S.input} value={logWake} onChange={e => setLogWake(e.target.value)} /></div>
              {logBed && logWake && (() => {
                const dur = sleepDur(logBed, logWake);
                const score = calcSleepScore(logBed, logWake, dur, routineTargets);
                const vs = dur - sleepDur(routineTargets.bedtime, routineTargets.waketime);
                return (
                  <div style={{ background: "#0a0a0c", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>{fmtDur(dur)}</div>
                      <div style={{ fontSize: 11, color: vs >= 0 ? "#34d399" : "#f87171", marginTop: 3 }}>{vs >= 0 ? "+" : "-"}{fmtDur(Math.abs(vs))} vs target</div>
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
              {["Crisis tools", "My reminders"].map((label, i) => (<div key={i} style={{ flex: 1, padding: "5px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500, textAlign: "center", background: panicStep === i ? (i === 0 ? "#f87171" : "#f59e0b") : "#1a1a1e", color: panicStep === i ? (i === 0 ? "#fff" : "#0d0d0f") : "#444" }}>{i + 1} — {label}</div>))}
            </div>
            {panicStep === 0 && (<>
              <div style={S.modalTitle}>🆘 You are stronger than this craving</div>
              <p style={S.modalSub}>Cravings peak within 20 minutes then drop. Try one of these right now:</p>
              {BUILTIN_RELAPSE_TOOLS.slice(0, 4).map(a => (<div key={a.id} style={{ ...S.actionCard, marginBottom: 8 }}><div style={{ fontSize: 20 }}>{a.icon}</div><div><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{a.title}</div><div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{a.desc}</div></div></div>))}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button style={{ ...S.primaryBtn, background: "#f59e0b", color: "#0d0d0f", flex: 1 }} onClick={() => setPanicStep(1)}>Read my reminders →</button>
                <button style={{ ...S.primaryBtn, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)", flex: 1 }} onClick={() => setModal(null)}>I'm okay now</button>
              </div>
            </>)}
            {panicStep === 1 && (<>
              <div style={S.modalTitle}>💛 Remember why you started</div>
              {reminders.length === 0 ? (<div style={{ ...S.card, textAlign: "center" }}><p style={{ color: "#444", fontSize: 13 }}>No reminders saved yet.</p><button style={{ ...S.linkBtn, marginTop: 8 }} onClick={() => { setModal(null); setView("goals"); }}>Add reminders in Goals →</button></div>) : reminders.map(r => (<div key={r.id} style={{ background: "rgba(245,158,11,0.07)", border: "0.5px solid rgba(245,158,11,0.2)", borderRadius: 9, padding: "12px 14px", marginBottom: 8 }}><p style={{ fontSize: 14, color: "#f59e0b", fontStyle: "italic", margin: 0, lineHeight: 1.65 }}>"{r.text}"</p></div>))}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button style={{ ...S.primaryBtn, background: "var(--r-surf2,#1a1a1e)", color: "var(--r-fg2,#666)", flex: 1 }} onClick={() => setPanicStep(0)}>← Back</button>
                <button style={{ ...S.primaryBtn, background: "#dc2626", flex: 1 }} onClick={() => setModal("relapseLog")}>Log relapse</button>
                <button style={{ ...S.primaryBtn, background: "#34d399", color: "#0d1f17", flex: 1 }} onClick={() => setModal(null)}>I made it ✓</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {modal === "relapseLog" && (
        <div style={S.overlay} onClick={() => setModal(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>⚠ Log a relapse</div>
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
            <div style={{ fontSize: 11, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Post-relapse protocol</div>
            <div style={S.modalTitle}>What to do right now</div>
            <p style={S.modalSub}>Work through each action below. Take your time — there's no rush. Tick each one off as you complete it.</p>
            <div style={{ fontSize: 11, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Immediate actions</div>
            {postRelapseActions.length === 0 && (<div style={{ ...S.empty, marginBottom: 12 }}>No custom actions set. <button style={S.linkBtn} onClick={() => { setModal(null); setView("relapse"); }}>Add them in the Relapse tab →</button></div>)}
            {postRelapseActions.map(a => {
              const done = checkedPost.includes(a.id);
              return (<div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12, padding: "12px 14px", borderRadius: 10, background: done ? "rgba(52,211,153,0.07)" : "#0f0f11", border: `0.5px solid ${done ? "#34d39944" : "#1a1a1e"}`, cursor: "pointer" }} onClick={() => setCheckedPost(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])}>
                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${done ? "#34d399" : "#333"}`, background: done ? "#34d399" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{done && <span style={{ color: "#0d0d0f", fontSize: 13, fontWeight: 700 }}>✓</span>}</div>
                <span style={{ fontSize: 14, lineHeight: 1.55, textDecoration: done ? "line-through" : "none", opacity: done ? 0.5 : 1, color: done ? "#666" : "#ddd" }}>{a.text}</span>
              </div>);
            })}
            {postRelapseReminders.length > 0 && (<>
              <div style={{ fontSize: 11, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.07em", margin: "16px 0 10px" }}>Remember this</div>
              {postRelapseReminders.map(r => (<div key={r.id} style={{ background: "rgba(245,158,11,0.06)", border: "0.5px solid rgba(245,158,11,0.18)", borderRadius: 9, padding: "12px 14px", marginBottom: 8 }}><p style={{ fontSize: 14, color: "#f59e0b", fontStyle: "italic", margin: 0, lineHeight: 1.65 }}>"{r.text}"</p></div>))}
            </>)}
            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555", marginBottom: 4 }}><span>Actions completed</span><span>{checkedPost.length}/{postRelapseActions.length}</span></div>
              <div style={S.progressBg}><div style={{ ...S.progressBar, width: `${postRelapseActions.length ? Math.round(checkedPost.length / postRelapseActions.length * 100) : 0}%`, background: "linear-gradient(90deg,#a78bfa,#34d399)" }} /></div>
            </div>
            <button style={{ ...S.primaryBtn, background: "#34d399", color: "#0d1f17", marginTop: 8 }} onClick={() => { setModal(null); setCheckedPost([]); setView("dashboard"); }}>
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
                  <button key={day} style={{ ...S.catBtn, borderColor: habitDraft.days.includes(day) ? accentColor : "#222", color: habitDraft.days.includes(day) ? accentColor : "#444", background: habitDraft.days.includes(day) ? accentColor + "22" : "transparent" }}
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
              <button style={{ ...S.catBtn, borderColor: habitDraft.levelsEnabled ? "#a78bfa" : "#222", color: habitDraft.levelsEnabled ? "#a78bfa" : "#444", background: habitDraft.levelsEnabled ? "rgba(167,139,250,0.12)" : "transparent", padding: "6px 14px" }}
                onClick={() => toggleLevelsEnabled(!habitDraft.levelsEnabled)}>
                {habitDraft.levelsEnabled ? "✓ Levels on" : "Enable levels"}
              </button>
              <span style={{ fontSize: 11, color: "#333" }}>build intensity progressively</span>
            </div>

            {habitDraft.levelsEnabled && (
              <div style={{ marginTop: 12 }}>
                <div style={{ ...S.formLabel, marginBottom: 8 }}>Levels</div>
                {habitDraft.levels.map((lvl, idx) => {
                  const isLast = idx === habitDraft.levels.length - 1;
                  return (
                    <div key={lvl.level} style={{ background: "#060608", border: "0.5px solid #1a1a1e", borderRadius: 9, padding: "12px", marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Level {lvl.level}</span>
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
                <button style={{ ...S.primaryBtn, background: "#161618", color: "#a78bfa", border: "0.5px solid rgba(167,139,250,0.25)", marginTop: 2 }} onClick={addHabitLevel}>+ Add level</button>
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

      {/* ── Schedule activity modal ── */}
      {schedActModal && schedActDraft && (
        <div style={S.overlay} onClick={() => setSchedActModal(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Add activity</div>

            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[["recurring", "Recurring"], ["oneTime", "One-time (this week)"]].map(([t, label]) => (
                <button key={t} style={{ flex: 1, padding: "8px 10px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--r-font)", background: schedActDraft.type === t ? "#60a5fa" : "var(--r-surf2)", color: schedActDraft.type === t ? "#0d0d0f" : "var(--r-fg2)" }}
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
                    <button key={day} style={{ ...S.catBtn, borderColor: schedActDraft.days.includes(day) ? "#60a5fa" : "#222", color: schedActDraft.days.includes(day) ? "#60a5fa" : "#444", background: schedActDraft.days.includes(day) ? "rgba(96,165,250,0.12)" : "transparent" }}
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
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({ value, label, accent }) {
  return (
    <div style={{ ...S.statCard, borderTopColor: accent }}>
      <div style={{ fontSize: 10, color: "var(--r-fg2,#555)", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent, fontFamily: "monospace", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
    </div>
  );
}

const S = {
  app: { display: "flex", minHeight: "100vh", background: "var(--r-bg,#0d0d0f)", color: "var(--r-fg,#e8e8e8)", fontFamily: "var(--r-font,'Inter',system-ui,sans-serif)" },
  mobileHeader: { position: "fixed", top: 0, left: 0, right: 0, height: 52, background: "var(--r-surf,#0a0a0c)", borderBottom: "1px solid var(--r-bord,#161618)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", zIndex: 100 },
  hamburger: { background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer", padding: "4px 6px", lineHeight: 1 },
  sidebarBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 150 },
  sidebar: { width: 240, background: "var(--r-surf,#0a0a0c)", borderRight: "1px solid var(--r-bord,#161618)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 },
  logo: { fontSize: 15, fontWeight: 700, letterSpacing: "-0.03em" },
  accDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  navBtn: { display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "7px 10px", borderRadius: 7, border: "none", background: "transparent", color: "var(--r-fg2,#555)", fontSize: 13, cursor: "pointer", marginBottom: 1, textAlign: "left", fontFamily: "var(--r-font,'Inter',system-ui,sans-serif)", transition: "background 0.15s" },
  navIcon: { fontSize: 13, width: 18, textAlign: "center", flexShrink: 0 },
  main: { flex: 1, overflow: "auto", minWidth: 0 },
  content: { padding: "28px 32px" },
  pageTitle: { fontSize: 22, fontWeight: 700, marginBottom: 0, letterSpacing: "-0.03em" },
  panicBtn: { display: "flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "8px 14px", cursor: "pointer" },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
  statCard: { background: "var(--r-surf,#0a0a0c)", border: "0.5px solid var(--r-bord,#161618)", borderTop: "2px solid", borderRadius: 10, padding: "16px 18px" },
  card: { background: "var(--r-surf,#0a0a0c)", border: "0.5px solid var(--r-bord,#161618)", borderRadius: 10, padding: "16px 18px", marginBottom: 12 },
  cardLabel: { fontSize: 10, color: "var(--r-fg2,#555)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10, fontWeight: 600 },
  progressWrap: { display: "flex", alignItems: "center", gap: 10 },
  progressBg: { flex: 1, height: 4, background: "var(--r-bord,#161618)", borderRadius: 3, overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 3, transition: "width .4s" },
  progressText: { fontSize: 11, color: "var(--r-fg2,#555)", whiteSpace: "nowrap" },
  bigProgressBg: { height: 5, background: "var(--r-bord,#161618)", borderRadius: 3, overflow: "hidden", marginTop: 8 },
  bigProgressBar: { height: "100%", borderRadius: 3, transition: "width .4s" },
  milestonesGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 },
  milestoneChip: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 4px", borderRadius: 8, border: "1px solid", transition: "all .3s" },
  mLabel: { fontSize: 9, color: "var(--r-fg2,#666)" },
  scheduleRow: { display: "flex", alignItems: "center", padding: "9px 0 9px 10px", borderBottom: "0.5px solid var(--r-bord,#111)", borderLeft: "2px solid", marginBottom: 1 },
  habitDot: { width: 16, height: 16, borderRadius: "50%", border: "2px solid", cursor: "pointer", transition: "all .2s", flexShrink: 0 },
  checkBtn: { width: 28, height: 28, borderRadius: "50%", border: "2px solid", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", transition: "all .2s", background: "transparent" },
  deleteBtn: { background: "none", border: "none", color: "#2a2a2a", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: "0 2px" },
  catBtn: { padding: "4px 11px", borderRadius: 16, border: "1px solid", fontSize: 11, cursor: "pointer", background: "transparent", fontFamily: "var(--r-font,'Inter',system-ui,sans-serif)" },
  goalBadge: { display: "inline-block", padding: "2px 10px", borderRadius: 18, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" },
  goalCheck: { width: 18, height: 18, borderRadius: 4, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1, transition: "all .2s" },
  actionCard: { display: "flex", gap: 12, background: "var(--r-surf,#0a0a0c)", border: "0.5px solid var(--r-bord,#161618)", borderRadius: 9, padding: "12px 14px", marginBottom: 7, alignItems: "flex-start" },
  actionTitle: { fontSize: 13, fontWeight: 600, marginBottom: 3 },
  actionDesc: { fontSize: 12, color: "var(--r-fg2,#666)", lineHeight: 1.55 },
  rewardRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  rewardCard: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid var(--r-bord,#161618)" },
  rewardCardName: { fontSize: 13, marginBottom: 2 },
  claimBtn: { background: "#0d1f18", border: "1px solid #34d399", color: "#34d399", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", flexShrink: 0 },
  sleepTarget: { background: "var(--r-surf2,#060608)", borderRadius: 8, padding: "10px 12px", textAlign: "center", flex: 1 },
  sleepTargetLabel: { fontSize: 10, color: "var(--r-fg2,#555)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 },
  sleepTargetVal: { fontSize: 17, fontWeight: 700, fontFamily: "monospace" },
  sleepLogRow: { display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "0.5px solid var(--r-bord,#111)" },
  habitCard: { background: "var(--r-surf,#0a0a0c)", border: "0.5px solid var(--r-bord,#161618)", borderRadius: 10, padding: "12px 14px", marginBottom: 8, borderLeft: "3px solid transparent" },
  lvlBadge: { fontSize: 10, color: "#a78bfa", background: "rgba(167,139,250,0.12)", border: "0.5px solid rgba(167,139,250,0.3)", padding: "1px 7px", borderRadius: 10 },
  journalEntry: { background: "var(--r-surf,#0a0a0c)", border: "0.5px solid var(--r-bord,#161618)", borderRadius: 9, padding: "14px 18px", marginBottom: 10 },
  journalDate: { fontSize: 10, color: "var(--r-fg2,#555)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" },
  journalText: { fontSize: 13, color: "var(--r-fg,#bbb)", lineHeight: 1.8 },
  empty: { fontSize: 12, color: "var(--r-fg2,#444)", padding: "4px 0" },
  linkBtn: { background: "none", border: "none", color: "#60a5fa", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "var(--r-font,'Inter',system-ui,sans-serif)" },
  textarea: { width: "100%", background: "var(--r-surf2,#060608)", border: "1px solid var(--r-bord,#161618)", borderRadius: 7, padding: "10px 12px", color: "var(--r-fg,#e8e8e8)", fontSize: 13, fontFamily: "var(--r-font,'Inter',system-ui,sans-serif)", resize: "vertical", lineHeight: 1.65 },
  input: { width: "100%", background: "var(--r-surf2,#060608)", border: "1px solid var(--r-bord,#161618)", borderRadius: 7, padding: "9px 12px", color: "var(--r-fg,#e8e8e8)", fontSize: 13, fontFamily: "var(--r-font,'Inter',system-ui,sans-serif)" },
  primaryBtn: { background: "#34d399", color: "#0d1f17", border: "none", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%", fontFamily: "var(--r-font,'Inter',system-ui,sans-serif)", letterSpacing: "-0.01em" },
  setupWrap: { minHeight: "100vh", background: "var(--r-bg,#0d0d0f)", display: "flex", alignItems: "center", justifyContent: "center" },
  setupCard: { background: "var(--r-surf,#0a0a0c)", border: "1px solid var(--r-bord,#161618)", borderRadius: 16, padding: "40px 34px", maxWidth: 400, width: "100%", textAlign: "center" },
  setupEmoji: { fontSize: 40, marginBottom: 14 },
  setupTitle: { fontSize: 21, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.03em" },
  setupSub: { fontSize: 13, color: "var(--r-fg2,#555)", lineHeight: 1.7, marginBottom: 20 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modalBox: { background: "var(--r-surf,#0a0a0c)", border: "1px solid var(--r-bord,#1a1a1e)", borderRadius: 13, padding: "24px", maxWidth: 460, width: "92%", maxHeight: "88vh", overflowY: "auto" },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" },
  modalSub: { fontSize: 12, color: "var(--r-fg2,#555)", lineHeight: 1.6, marginBottom: 14 },
  formRow: { display: "flex", flexDirection: "column", gap: 5 },
  formLabel: { fontSize: 11, color: "var(--r-fg2,#555)", fontWeight: 500 },
  accRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "0.5px solid", marginBottom: 8 },
};
