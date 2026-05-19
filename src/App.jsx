import { useState, useEffect, useCallback, useRef } from "react";

// ─── Storage ────────────────────────────────────────────────────────────────
const ROOT_KEY = "recover_root_v1"; // { activeId, accounts: {id: accountData} }

const accountDefaults = () => ({
  id: null, name: "", substance: "", color: "#34d399",
  sobrietyStart: null,
  habits: [], relapses: [], rewards: [], claimedRewards: [], journal: [],
  routine: { bedtimeTarget: "22:30", wakeTarget: "06:30", reminderEnabled: true, reminderMinsBefore: 30 },
  sleepLogs: [], claimedSleepRewards: [],
  goals: [], reminders: [],
  // Post-relapse protocol
  postRelapseActions: [],   // { id, text } — custom immediate actions
  postRelapseReminders: [], // { id, text } — custom post-relapse affirmations
});

function loadRoot() {
  try {
    const r = localStorage.getItem(ROOT_KEY);
    return r ? JSON.parse(r) : { activeId: null, accounts: {} };
  } catch { return { activeId: null, accounts: {} }; }
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
const SLEEP_MS = [
  { nights: 7, emoji: "🌙", reward: "7-night sleep streak" },
  { nights: 14, emoji: "💤", reward: "14-night deep sleeper" },
  { nights: 30, emoji: "🌟", reward: "30-night sleep master" },
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
  { id: "h1", name: "Morning mindfulness", category: "mental", scheduledTime: "07:00", freq: "daily", completions: [] },
  { id: "h2", name: "Exercise (30 min)", category: "physical", scheduledTime: "08:00", freq: "daily", completions: [] },
  { id: "h3", name: "Peer support contact", category: "social", scheduledTime: "12:00", freq: "daily", completions: [] },
  { id: "h4", name: "Journal entry", category: "mental", scheduledTime: "21:00", freq: "daily", completions: [] },
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
const ACCOUNT_COLORS = ["#34d399", "#60a5fa", "#a78bfa", "#f97316", "#f472b6", "#f59e0b", "#f87171", "#2dd4bf"];

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

function sleepQuality(log, routine) {
  const { bedtime, waketime, durationMins: dur } = log;
  const bm = timeToMins(bedtime), wm = timeToMins(waketime);
  const tb = timeToMins(routine.bedtimeTarget), tw = timeToMins(routine.wakeTarget);
  const nb = bm < 300 ? bm + 1440 : bm, nw = wm < 300 ? wm + 1440 : wm;
  const ntb = tb < 300 ? tb + 1440 : tb, ntw = tw < 300 ? tw + 1440 : tw;
  let score = 0;
  if (dur >= 420 && dur <= 540) score += 3;
  else if ((dur >= 360 && dur < 420) || (dur > 540 && dur <= 600)) score += 2;
  else if (dur >= 300) score += 1;
  const bd = Math.abs(nb - ntb);
  if (bd <= 30) score += 2; else if (bd <= 90) score += 1;
  const wd = Math.abs(nw - ntw);
  if (wd <= 30) score += 2; else if (wd <= 90) score += 1;
  if (bm >= 480 && bm <= 1320) score = Math.max(0, score - 4);
  const pct = score / 7;
  if (pct >= 0.85) return { label: "Excellent", color: "#34d399", score, max: 7, pct };
  if (pct >= 0.65) return { label: "Good", color: "#60a5fa", score, max: 7, pct };
  if (pct >= 0.40) return { label: "Fair", color: "#f59e0b", score, max: 7, pct };
  return { label: "Poor", color: "#f87171", score, max: 7, pct };
}
function goodNightStreak(logs, routine) {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0, cursor = new Date(getTodayStr());
  for (const log of sorted) {
    const diff = Math.round((cursor - new Date(log.date)) / 864e5);
    if (diff > 1) break;
    if (sleepQuality(log, routine).pct >= 0.65) { streak++; cursor = new Date(log.date); } else break;
  }
  return streak;
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function App() {
  const [root, setRoot] = useState(loadRoot);
  const [view, setView] = useState("dashboard");
  const [modal, setModal] = useState(null);
  // modal values: null | "addAccount" | "switchAccount" | "sleepLog" | "panic" | "relapseLog" | "postRelapse"
  const [panicStep, setPanicStep] = useState(0);
  // post-relapse state
  const [postRelapseId, setPostRelapseId] = useState(null); // relapse entry id
  const [checkedPost, setCheckedPost] = useState([]); // ticked action ids
  // Add account form
  const [newAccName, setNewAccName] = useState("");
  const [newAccSub, setNewAccSub] = useState("");
  const [newAccDate, setNewAccDate] = useState(getTodayStr());
  const [newAccColor, setNewAccColor] = useState(ACCOUNT_COLORS[0]);
  const [accSetupStep, setAccSetupStep] = useState(0);
  // Sleep log
  const [logBed, setLogBed] = useState("");
  const [logWake, setLogWake] = useState("");
  // Routine
  const [editRt, setEditRt] = useState(false);
  const [rtDraft, setRtDraft] = useState(null);
  // Habits
  const [newHabitName, setNHN] = useState("");
  const [newHabitCat, setNHC] = useState("custom");
  const [newHabitTime, setNHT] = useState("");
  // Goals
  const [newGoalText, setNGT] = useState("");
  const [newGoalPeriod, setNGP] = useState(null);
  // Reminders
  const [newRem, setNewRem] = useState("");
  // Post-relapse config
  const [newPostAction, setNewPostAction] = useState("");
  const [newPostReminder, setNewPostReminder] = useState("");
  // Relapse log
  const [relapseNote, setRN] = useState("");
  const [checkedTools, setCheckedTools] = useState([]);
  // Journal
  const [journalText, setJT] = useState("");
  // Rewards
  const [newRewName, setNRN] = useState("");
  const [newRewDays, setNRD] = useState(30);

  const notifRef = useRef([]);

  // ── Root updater ──────────────────────────────────────────────────────────
  const updateRoot = useCallback(patch => {
    setRoot(prev => { const next = { ...prev, ...patch }; saveRoot(next); return next; });
  }, []);

  const updateAccount = useCallback((id, patch) => {
    setRoot(prev => {
      const acc = { ...prev.accounts[id], ...patch };
      const next = { ...prev, accounts: { ...prev.accounts, [id]: acc } };
      saveRoot(next);
      return next;
    });
  }, []);

  // Active account
  const activeId = root.activeId;
  const account = activeId ? (root.accounts[activeId] || null) : null;
  const accounts = Object.values(root.accounts);

  const upd = useCallback(patch => { if (activeId) updateAccount(activeId, patch); }, [activeId, updateAccount]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const routine = account?.routine || accountDefaults().routine;
  const sleepLogs = account?.sleepLogs || [];
  const habits = account?.habits || [];
  const goals = account?.goals || [];
  const reminders = account?.reminders || [];
  const postRelapseActions = account?.postRelapseActions || [];
  const postRelapseReminders = account?.postRelapseReminders || [];
  const daysSober = getDaysSince(account?.sobrietyStart);
  const goodStreak = account ? goodNightStreak(sleepLogs, routine) : 0;
  const todayLog = sleepLogs.find(l => l.date === getTodayStr());
  const last7 = [...sleepLogs].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const avgSleep = last7.length ? Math.round(last7.reduce((s, l) => s + l.durationMins, 0) / last7.length) : null;
  const todayDone = habits.filter(h => (h.completions || []).includes(getTodayStr())).length;
  const habitPct = habits.length ? Math.round(todayDone / habits.length * 100) : 0;
  const claimed = account?.claimedRewards || [];
  const claimedSl = account?.claimedSleepRewards || [];
  const availRew = (account?.rewards || []).filter(r => daysSober >= r.days && !claimed.includes(r.id));
  const availSlRew = SLEEP_MS.filter(m => goodStreak >= m.nights && !claimedSl.includes(m.nights));

  // ── Notification scheduler ────────────────────────────────────────────────
  useEffect(() => {
    notifRef.current.forEach(clearTimeout);
    notifRef.current = [];
    if (!account) return;
    habits.forEach(h => {
      if (!h.scheduledTime) return;
      const [hh, mm] = h.scheduledTime.split(":").map(Number);
      const t = new Date(); t.setHours(hh, mm, 0, 0);
      if (t < new Date()) t.setDate(t.getDate() + 1);
      notifRef.current.push(setTimeout(() => sendNotif(`⏰ ${h.name}`, "Your scheduled habit is due."), t - new Date()));
    });
    if (routine.reminderEnabled) {
      const [bh, bm] = routine.bedtimeTarget.split(":").map(Number);
      const bt = new Date(); bt.setHours(bh, bm - (routine.reminderMinsBefore || 30), 0, 0);
      if (bt < new Date()) bt.setDate(bt.getDate() + 1);
      notifRef.current.push(setTimeout(() => sendNotif("🌙 Bedtime", `Wind down — target: ${fmtTime(routine.bedtimeTarget)}`), bt - new Date()));
    }
    return () => notifRef.current.forEach(clearTimeout);
  }, [habits, routine, account?.id]);

  // ── Actions ───────────────────────────────────────────────────────────────
  function createAccount() {
    const id = "acc_" + Date.now();
    const acc = {
      ...accountDefaults(), id,
      name: newAccName.trim() || "My Recovery",
      substance: newAccSub.trim(),
      color: newAccColor,
      sobrietyStart: newAccDate,
      habits: DEFAULT_HABITS(),
      rewards: DEFAULT_REWARDS(),
      postRelapseActions: DEFAULT_POST_ACTIONS(),
      postRelapseReminders: DEFAULT_POST_REMINDERS(),
    };
    const next = { activeId: id, accounts: { ...root.accounts, [id]: acc } };
    saveRoot(next); setRoot(next);
    setModal(null); setNewAccName(""); setNewAccSub(""); setNewAccDate(getTodayStr()); setAccSetupStep(0);
  }
  function deleteAccount(id) {
    if (!window.confirm("Delete this recovery journey? This cannot be undone.")) return;
    const accs = { ...root.accounts }; delete accs[id];
    const ids = Object.keys(accs);
    const next = { activeId: ids[0] || null, accounts: accs };
    saveRoot(next); setRoot(next); setModal(null);
  }
  function switchAccount(id) { updateRoot({ activeId: id }); setModal(null); setView("dashboard"); }

  const completedToday = id => (habits.find(h => h.id === id)?.completions || []).includes(getTodayStr());
  const toggleHabit = id => {
    const today = getTodayStr();
    upd({ habits: habits.map(h => { if (h.id !== id) return h; const c = h.completions || []; return { ...h, completions: c.includes(today) ? c.filter(d => d !== today) : [...c, today] }; }) });
  };
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
    upd({ sleepLogs: [...sleepLogs.filter(l => l.date !== getTodayStr()), { date: getTodayStr(), bedtime: logBed, waketime: logWake, durationMins: dur }] });
    setModal(null); setLogBed(""); setLogWake("");
  }

  function addHabit() {
    if (!newHabitName.trim()) return;
    upd({ habits: [...habits, { id: "h" + Date.now(), name: newHabitName.trim(), category: newHabitCat, scheduledTime: newHabitTime || null, freq: "daily", completions: [] }] });
    setNHN(""); setNHT("");
  }
  function addGoal() { if (!newGoalText.trim()) return; upd({ goals: [...goals, { id: "g" + Date.now(), text: newGoalText.trim(), period: newGoalPeriod, done: [], createdAt: new Date().toISOString() }] }); setNGT(""); setNGP(null); }
  function addReminder() { if (!newRem.trim()) return; upd({ reminders: [...reminders, { id: "rem" + Date.now(), text: newRem.trim() }] }); setNewRem(""); }
  function addPostAction() { if (!newPostAction.trim()) return; upd({ postRelapseActions: [...postRelapseActions, { id: "pa" + Date.now(), text: newPostAction.trim() }] }); setNewPostAction(""); }
  function addPostReminder() { if (!newPostReminder.trim()) return; upd({ postRelapseReminders: [...postRelapseReminders, { id: "pr" + Date.now(), text: newPostReminder.trim() }] }); setNewPostReminder(""); }
  function addJournal() { if (!journalText.trim()) return; upd({ journal: [{ id: Date.now(), date: new Date().toISOString(), text: journalText.trim() }, ...(account?.journal || [])] }); setJT(""); }
  function addReward() { if (!newRewName.trim()) return; upd({ rewards: [...(account?.rewards || []), { id: "rw" + Date.now(), days: Number(newRewDays), name: newRewName.trim() }] }); setNRN(""); setNRD(30); }
  const claimReward = id => upd({ claimedRewards: [...claimed, id] });
  const claimSlRew = n => upd({ claimedSleepRewards: [...claimedSl, n] });
  function saveRoutine() { upd({ routine: { ...routine, ...rtDraft } }); setEditRt(false); }

  // ── No accounts yet → show onboarding ─────────────────────────────────────
  if (!accounts.length || !activeId) {
    return (
      <div style={S.setupWrap}>
        <div style={S.setupCard}>
          <div style={S.setupEmoji}>🌿</div>
          <h1 style={S.setupTitle}>Recovery starts here</h1>
          <p style={S.setupSub}>Your private, all-in-one recovery companion. Every journey tracked separately.</p>
          <button style={S.primaryBtn} onClick={() => setModal("addAccount")}>Create my first journey →</button>
        </div>
        {modal === "addAccount" && <AddAccountModal step={accSetupStep} setStep={setAccSetupStep} name={newAccName} setName={setNewAccName} sub={newAccSub} setSub={setNewAccSub} date={newAccDate} setDate={setNewAccDate} color={newAccColor} setColor={setNewAccColor} onDone={createAccount} onClose={() => { setModal(null); setAccSetupStep(0); }} />}
      </div>
    );
  }

  if (!account) return null;
  const accentColor = account.color || "#34d399";

  const sortedHabits = [...habits].sort((a, b) => {
    if (!a.scheduledTime && !b.scheduledTime) return 0;
    if (!a.scheduledTime) return 1; if (!b.scheduledTime) return -1;
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });

  const navItems = [
    { id: "dashboard", icon: "◉", label: "Dashboard" },
    { id: "routine", icon: "🌙", label: "Routine" },
    { id: "habits", icon: "☑", label: "Habits" },
    { id: "goals", icon: "◎", label: "Goals" },
    { id: "relapse", icon: "⚡", label: "Relapse" },
    { id: "rewards", icon: "★", label: "Rewards" },
    { id: "journal", icon: "✎", label: "Journal" },
  ];

  return (
    <div style={S.app}>
      {/* ── Sidebar ── */}
      <aside style={S.sidebar}>
        <div style={S.sidebarTop}>
          <div style={S.logo}>🌿 Recover</div>
          {/* Account switcher */}
          <button style={{ ...S.accSwitcher, borderColor: accentColor + "55" }} onClick={() => setModal("switchAccount")}>
            <div style={{ ...S.accDot, background: accentColor }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account.name}</div>
              <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{account.substance}</div>
            </div>
            <span style={{ fontSize: 10, color: "#444" }}>▾</span>
          </button>
          {/* Sobriety counter */}
          <div style={{ ...S.sobrietyBadge, borderColor: accentColor + "33" }}>
            <div style={{ ...S.sobrietyDays, color: accentColor }}>{daysSober}</div>
            <div style={S.sobrietyLabel}>days sober</div>
          </div>
        </div>
        <nav style={S.nav}>
          {navItems.map(n => (
            <button key={n.id} style={{ ...S.navBtn, ...(view === n.id ? { ...S.navBtnActive, borderLeft: `3px solid ${accentColor}` } : {}) }} onClick={() => setView(n.id)}>
              <span style={S.navIcon}>{n.icon}</span><span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div style={S.sidebarBottom}>
          <button style={S.relapseBtn} onClick={() => setModal("relapseLog")}>⚠ Log a relapse</button>
          <button style={S.resetLink} onClick={() => { if (window.confirm("Delete ALL data for all accounts?")) { localStorage.removeItem(ROOT_KEY); window.location.reload(); } }}>reset all data</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={S.main}>

        {/* ════ DASHBOARD ════ */}
        {view === "dashboard" && (
          <div style={S.content}>
            <h2 style={S.pageTitle}>Your journey</h2>
            {/* Panic button */}
            <div style={S.panicBtn} onClick={() => { setPanicStep(0); setModal("panic"); }}>
              <span style={{ fontSize: 20 }}>🆘</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171" }}>Panic button</div>
                <div style={{ fontSize: 11, color: "#7a2020", marginTop: 1 }}>Feeling like you might relapse? Tap here now.</div>
              </div>
              <span style={{ marginLeft: "auto", color: "#f87171" }}>→</span>
            </div>
            <div style={S.statGrid}>
              <StatCard value={daysSober} label="Days sober" accent={accentColor} />
              <StatCard value={goodStreak} label="Sleep streak" accent="#60a5fa" />
              <StatCard value={`${habitPct}%`} label="Today's habits" accent="#a78bfa" />
              <StatCard value={avgSleep ? fmtDur(avgSleep) : "—"} label="Avg sleep (7d)" accent="#f97316" />
            </div>
            {/* Next milestone */}
            {(() => { const nm = MILESTONES.find(m => m.days > daysSober); return nm && (<div style={S.card}><div style={S.cardLabel}>Next milestone — {nm.emoji} {nm.label}</div><div style={S.progressWrap}><div style={S.progressBg}><div style={{ ...S.progressBar, width: `${Math.min(100, daysSober / nm.days * 100)}%`, background: `linear-gradient(90deg,${accentColor},#60a5fa)` }} /></div><div style={S.progressText}>{nm.days - daysSober}d to go</div></div></div>); })()}
            {/* Sleep */}
            {todayLog ? (<div style={{ ...S.card, borderColor: "rgba(96,165,250,0.2)" }}><div style={S.cardLabel}>🌙 Last night</div><div style={{ display: "flex", alignItems: "center", gap: 16 }}><div><div style={{ fontSize: 24, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>{fmtDur(todayLog.durationMins)}</div><div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{fmtTime(todayLog.bedtime)} → {fmtTime(todayLog.waketime)}</div></div>{(() => { const q = sleepQuality(todayLog, routine); return <span style={{ ...S.qualBadge, background: q.color + "22", color: q.color, border: `1px solid ${q.color}44`, marginLeft: "auto" }}>{q.label}</span>; })()}</div></div>) : (<div style={{ ...S.card, cursor: "pointer", borderStyle: "dashed" }} onClick={() => setModal("sleepLog")}><div style={S.cardLabel}>🌙 Sleep</div><div style={{ fontSize: 13, color: "#444" }}>Log last night's sleep →</div></div>)}
            {/* Available rewards */}
            {(availRew.length > 0 || availSlRew.length > 0) && (<div style={{ ...S.card, borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.04)" }}><div style={S.cardLabel}>🎁 Rewards unlocked!</div>{availRew.map(r => (<div key={r.id} style={S.rewardRow}><span style={{ fontSize: 13 }}>{r.name} <span style={{ color: "#555", fontSize: 11 }}>({r.days}d)</span></span><button style={S.claimBtn} onClick={() => claimReward(r.id)}>Claim ✓</button></div>))}{availSlRew.map(r => (<div key={r.nights} style={S.rewardRow}><span style={{ fontSize: 13 }}>{r.emoji} {r.reward}</span><button style={S.claimBtn} onClick={() => claimSlRew(r.nights)}>Claim ✓</button></div>))}</div>)}
            {/* Today's daily goals snapshot */}
            {goals.filter(g => g.period === "daily").length > 0 && (<div style={S.card}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><div style={S.cardLabel}>Today's goals</div><button style={S.linkBtn} onClick={() => setView("goals")}>All →</button></div>{goals.filter(g => g.period === "daily").slice(0, 4).map(g => { const done = isGoalDone(g); return (<div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><div style={{ ...S.habitDot, background: done ? accentColor : "transparent", borderColor: accentColor, cursor: "pointer" }} onClick={() => toggleGoal(g.id)} /><span style={{ fontSize: 13, textDecoration: done ? "line-through" : "none", opacity: done ? 0.4 : 1 }}>{g.text}</span></div>); })}</div>)}
            {/* Milestones */}
            <div style={S.card}><div style={S.cardLabel}>Milestones reached</div><div style={S.milestonesGrid}>{MILESTONES.map(m => { const ok = daysSober >= m.days; return (<div key={m.days} style={{ ...S.milestoneChip, opacity: ok ? 1 : 0.2, background: ok ? accentColor + "18" : "transparent", borderColor: ok ? accentColor : "#222" }}><span style={{ fontSize: 16 }}>{m.emoji}</span><span style={S.mLabel}>{m.label}</span></div>); })}</div></div>
          </div>
        )}

        {/* ════ ROUTINE ════ */}
        {view === "routine" && (
          <div style={S.content}>
            <h2 style={S.pageTitle}>Sleep &amp; routine</h2>
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={S.cardLabel}>Sleep targets</div>
                <button style={S.linkBtn} onClick={() => { setRtDraft({ ...routine }); setEditRt(!editRt); }}>{editRt ? "Cancel" : "Edit"}</button>
              </div>
              {!editRt ? (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>Bedtime</div><div style={{ ...S.sleepTargetVal, color: accentColor }}>{fmtTime(routine.bedtimeTarget)}</div></div>
                <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>Wake</div><div style={{ ...S.sleepTargetVal, color: accentColor }}>{fmtTime(routine.wakeTarget)}</div></div>
                <div style={S.sleepTarget}><div style={S.sleepTargetLabel}>Target</div><div style={{ ...S.sleepTargetVal, color: accentColor }}>{fmtDur(sleepDur(routine.bedtimeTarget, routine.wakeTarget))}</div></div>
              </div>) : (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={S.formRow}><label style={S.formLabel}>Bedtime</label><input type="time" style={{ ...S.input, width: 160 }} value={rtDraft.bedtimeTarget} onChange={e => setRtDraft({ ...rtDraft, bedtimeTarget: e.target.value })} /></div>
                <div style={S.formRow}><label style={S.formLabel}>Wake time</label><input type="time" style={{ ...S.input, width: 160 }} value={rtDraft.wakeTarget} onChange={e => setRtDraft({ ...rtDraft, wakeTarget: e.target.value })} /></div>
                <div style={S.formRow}><label style={S.formLabel}>Reminder before bedtime</label><select style={{ ...S.input, width: 180 }} value={rtDraft.reminderMinsBefore} onChange={e => setRtDraft({ ...rtDraft, reminderMinsBefore: Number(e.target.value) })}><option value={15}>15 min before</option><option value={30}>30 min before</option><option value={45}>45 min before</option><option value={60}>1 hour before</option></select></div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><input type="checkbox" id="ren" checked={rtDraft.reminderEnabled} onChange={e => setRtDraft({ ...rtDraft, reminderEnabled: e.target.checked })} /><label htmlFor="ren" style={{ fontSize: 12, color: "#888", cursor: "pointer" }}>Enable notifications</label>{rtDraft.reminderEnabled && <button style={{ ...S.linkBtn, fontSize: 11 }} onClick={reqNotif}>Allow</button>}</div>
                <button style={S.primaryBtn} onClick={saveRoutine}>Save</button>
              </div>)}
            </div>
            <div style={S.statGrid}>
              <StatCard value={goodStreak} label="Good night streak" accent="#60a5fa" />
              <StatCard value={avgSleep ? fmtDur(avgSleep) : "—"} label="Avg sleep (7d)" accent="#a78bfa" />
            </div>
            <div style={{ ...S.card, borderColor: "rgba(96,165,250,0.15)" }}>
              <div style={S.cardLabel}>Log sleep</div>
              {todayLog ? (<div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                  <div><div style={{ fontSize: 26, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>{fmtDur(todayLog.durationMins)}</div><div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{fmtTime(todayLog.bedtime)} → {fmtTime(todayLog.waketime)}</div></div>
                  {(() => { const q = sleepQuality(todayLog, routine); return (<div style={{ marginLeft: "auto", textAlign: "right" }}><span style={{ ...S.qualBadge, background: q.color + "22", color: q.color, border: `1px solid ${q.color}44` }}>{q.label}</span><div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>{q.score}/{q.max} pts</div></div>); })()}
                </div>
                <button style={{ ...S.primaryBtn, background: "#1a1a1e", color: "#666" }} onClick={() => { setLogBed(todayLog.bedtime); setLogWake(todayLog.waketime); setModal("sleepLog"); }}>Edit</button>
              </div>) : (<button style={S.primaryBtn} onClick={() => { setLogBed(routine.bedtimeTarget); setLogWake(routine.wakeTarget); setModal("sleepLog"); }}>Log last night's sleep</button>)}
            </div>
            {/* Scoring key */}
            <div style={S.card}><div style={S.cardLabel}>Scoring (out of 7)</div>{[{ pts: "3", rule: "Duration: 7–9h ideal, 6–7h or 8–10h = 2, 5h = 1" }, { pts: "2", rule: "Bedtime: within 30min = 2, within 90min = 1" }, { pts: "2", rule: "Wake time: within 30min = 2, within 90min = 1" }, { pts: "−4", rule: "Penalty: sleeping during daytime hours (inverted schedule)" }].map(r => (<div key={r.rule} style={{ display: "flex", gap: 10, fontSize: 12, marginBottom: 6 }}><span style={{ color: accentColor, fontWeight: 700, minWidth: 32, fontFamily: "monospace" }}>{r.pts}</span><span style={{ color: "#666" }}>{r.rule}</span></div>))}</div>
            {/* Sleep milestone progress */}
            <div style={S.card}><div style={S.cardLabel}>Sleep reward milestones</div>{SLEEP_MS.map(m => { const isCl = claimedSl.includes(m.nights); const isAv = goodStreak >= m.nights && !isCl; return (<div key={m.nights} style={{ marginBottom: 14 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><div style={{ fontSize: 13 }}>{m.emoji} {m.reward}</div>{isCl && <span style={{ fontSize: 11, color: "#34d399" }}>✓ Claimed</span>}{isAv && <button style={S.claimBtn} onClick={() => claimSlRew(m.nights)}>Claim ✓</button>}{!isCl && !isAv && <span style={{ fontSize: 11, color: "#444" }}>{m.nights - goodStreak} nights to go</span>}</div><div style={S.progressBg}><div style={{ ...S.progressBar, width: `${isCl ? 100 : Math.min(100, goodStreak / m.nights * 100)}%`, background: isCl ? "#34d399" : "linear-gradient(90deg,#60a5fa,#a78bfa)" }} /></div></div>); })}</div>
            {/* Bar chart */}
            {last7.length > 0 && (<div style={S.card}><div style={S.cardLabel}>Last 7 nights</div><div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, marginBottom: 8 }}>{last7.map(log => { const mxM = Math.max(...last7.map(l => l.durationMins), 480); const q = sleepQuality(log, routine); const day = new Date(log.date + "T12:00").toLocaleDateString("en-AU", { weekday: "short" }); return (<div key={log.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, height: "100%", justifyContent: "flex-end" }}><div style={{ fontSize: 8, color: "#444" }}>{fmtDur(log.durationMins)}</div><div style={{ width: "100%", height: `${Math.min(100, log.durationMins / mxM * 100)}%`, background: q.color + "bb", borderRadius: "3px 3px 0 0", minHeight: 4 }} /><div style={{ fontSize: 9, color: "#555" }}>{day}</div></div>); })}</div></div>)}
            {/* History */}
            <div style={S.card}><div style={S.cardLabel}>Sleep history</div>{sleepLogs.length === 0 ? <div style={S.empty}>No sleep logs yet.</div> : [...sleepLogs].reverse().slice(0, 14).map(log => { const q = sleepQuality(log, routine); const t = sleepDur(routine.bedtimeTarget, routine.wakeTarget); const vs = log.durationMins - t; return (<div key={log.date} style={S.sleepLogRow}><div style={{ fontSize: 11, color: "#444", width: 64, flexShrink: 0 }}>{new Date(log.date + "T12:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</div><div style={{ flex: 1 }}><span style={{ fontSize: 12, color: "#777" }}>{fmtTime(log.bedtime)} → {fmtTime(log.waketime)}</span><span style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace", marginLeft: 6 }}>{fmtDur(log.durationMins)}</span><span style={{ fontSize: 10, color: vs >= 0 ? "#34d399" : "#f87171", marginLeft: 5 }}>{vs >= 0 ? "+" : "-"}{fmtDur(Math.abs(vs))}</span></div><span style={{ ...S.qualBadge, background: q.color + "22", color: q.color, border: `1px solid ${q.color}44`, flexShrink: 0 }}>{q.label}</span></div>); })}</div>
          </div>
        )}

        {/* ════ HABITS ════ */}
        {view === "habits" && (
          <div style={S.content}>
            <h2 style={S.pageTitle}>Habits &amp; schedule</h2>
            <div style={S.card}><div style={S.cardLabel}>Today — {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</div><div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{todayDone} / {habits.length} done</div><div style={S.bigProgressBg}><div style={{ ...S.bigProgressBar, width: `${habitPct}%`, background: `linear-gradient(90deg,${accentColor},#60a5fa)` }} /></div></div>
            <div style={S.card}><div style={S.cardLabel}>Today's schedule</div>{sortedHabits.length === 0 ? <div style={S.empty}>Add habits below.</div> : sortedHabits.map(h => { const done = completedToday(h.id); const col = CAT_HEX[h.category] || "#a78bfa"; return (<div key={h.id} style={{ ...S.scheduleRow, borderLeftColor: col, opacity: done ? 0.5 : 1 }}><div style={{ width: 54, flexShrink: 0, textAlign: "right", paddingRight: 10 }}>{h.scheduledTime ? <span style={{ fontSize: 11, color: done ? "#444" : col, fontFamily: "monospace", fontWeight: 600 }}>{fmtTime(h.scheduledTime)}</span> : <span style={{ fontSize: 10, color: "#333" }}>—</span>}</div><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500, textDecoration: done ? "line-through" : "none" }}>{h.name}</div><div style={{ fontSize: 10, color: col, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 1 }}>{h.category}</div></div><div style={{ display: "flex", gap: 6 }}><button style={{ ...S.checkBtn, background: done ? "#34d399" : "transparent", borderColor: done ? "#34d399" : "#333" }} onClick={() => toggleHabit(h.id)}>{done ? "✓" : ""}</button><button style={S.deleteBtn} onClick={() => upd({ habits: habits.filter(x => x.id !== h.id) })}>×</button></div></div>); })}</div>
            <div style={S.card}><div style={S.cardLabel}>Add a habit</div><input style={S.input} placeholder="Habit name…" value={newHabitName} onChange={e => setNHN(e.target.value)} /><div style={{ marginTop: 10 }}><div style={{ fontSize: 10, color: "#444", marginBottom: 4 }}>Scheduled time (optional)</div><input type="time" style={{ ...S.input }} value={newHabitTime} onChange={e => setNHT(e.target.value)} /></div><div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>{Object.keys(CAT_HEX).map(cat => (<button key={cat} style={{ ...S.catBtn, background: newHabitCat === cat ? CAT_HEX[cat] + "33" : "transparent", borderColor: CAT_HEX[cat], color: CAT_HEX[cat] }} onClick={() => setNHC(cat)}>{cat}</button>))}</div><button style={{ ...S.primaryBtn, marginTop: 12 }} onClick={addHabit}>Add to schedule</button></div>
          </div>
        )}

        {/* ════ GOALS ════ */}
        {view === "goals" && (
          <div style={S.content}>
            <h2 style={S.pageTitle}>Goals &amp; reminders</h2>
            {/* Reminders */}
            <div style={{ ...S.card, borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.03)" }}>
              <div style={S.cardLabel}>💛 My reminders &amp; motivation</div>
              {reminders.length === 0 && <div style={{ ...S.empty, marginBottom: 10 }}>Add things that keep you going — quotes, reasons, names of people you're doing this for.</div>}
              {reminders.map(r => (<div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderBottom: "0.5px solid #1a1a1a" }}><span style={{ fontSize: 13, color: "#f59e0b", fontStyle: "italic", lineHeight: 1.6, flex: 1 }}>"{r.text}"</span><button style={S.deleteBtn} onClick={() => upd({ reminders: reminders.filter(x => x.id !== r.id) })}>×</button></div>))}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}><input style={{ ...S.input, flex: 1 }} placeholder="Add a reminder or quote…" value={newRem} onChange={e => setNewRem(e.target.value)} onKeyDown={e => e.key === "Enter" && addReminder()} /><button style={{ ...S.primaryBtn, width: "auto", padding: "9px 14px" }} onClick={addReminder}>Add</button></div>
            </div>
            {/* Goal periods */}
            {GOAL_PERIODS.map(period => {
              const pg = goals.filter(g => g.period === period);
              const dc = pg.filter(isGoalDone).length;
              return (<div key={period} style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ ...S.goalBadge, background: GOAL_COLORS[period] + "22", color: GOAL_COLORS[period], border: `1px solid ${GOAL_COLORS[period]}44` }}>{period}</span>
                  {pg.length > 0 && <span style={{ fontSize: 11, color: "#444" }}>{dc}/{pg.length} done</span>}
                </div>
                {pg.length === 0 && <div style={S.empty}>No {period} goals yet.</div>}
                {pg.map(g => { const done = isGoalDone(g); return (<div key={g.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: "0.5px solid #161616" }}><div style={{ ...S.goalCheck, background: done ? GOAL_COLORS[period] : "transparent", borderColor: GOAL_COLORS[period], cursor: "pointer", flexShrink: 0 }} onClick={() => toggleGoal(g.id)}>{done && <span style={{ color: "#0d0d0f", fontSize: 11 }}>✓</span>}</div><span style={{ fontSize: 13, flex: 1, lineHeight: 1.5, textDecoration: done ? "line-through" : "none", opacity: done ? 0.4 : 1 }}>{g.text}</span><button style={S.deleteBtn} onClick={() => upd({ goals: goals.filter(x => x.id !== g.id) })}>×</button></div>); })}
                {newGoalPeriod === period ? (<div style={{ display: "flex", gap: 8 }}><input style={{ ...S.input, flex: 1, fontSize: 13 }} placeholder={`Add ${period} goal…`} value={newGoalText} onChange={e => setNGT(e.target.value)} onKeyDown={e => e.key === "Enter" && addGoal()} autoFocus /><button style={{ ...S.primaryBtn, width: "auto", padding: "8px 12px", background: GOAL_COLORS[period], color: "#0d0d0f" }} onClick={addGoal}>Add</button><button style={{ ...S.primaryBtn, width: "auto", padding: "8px 10px", background: "#1a1a1e", color: "#666" }} onClick={() => setNGP(null)}>✕</button></div>) : (<button style={{ ...S.linkBtn, fontSize: 12 }} onClick={() => { setNGP(period); setNGT(""); }}>+ Add {period} goal</button>)}
              </div>);
            })}
          </div>
        )}

        {/* ════ RELAPSE TOOLKIT ════ */}
        {view === "relapse" && (
          <div style={S.content}>
            <h2 style={S.pageTitle}>Relapse toolkit</h2>
            <div style={{ ...S.card, borderColor: "rgba(249,115,22,0.35)", background: "rgba(249,115,22,0.04)", marginBottom: 12 }}>
              <div style={S.cardLabel}>⚡ Crisis tools</div>
              <p style={{ color: "#f97316", fontSize: 13, lineHeight: 1.65, margin: 0 }}>Cravings peak within 20 min then fall. Use these right now.</p>
            </div>
            {BUILTIN_RELAPSE_TOOLS.map(a => (<div key={a.id} style={S.actionCard}><div style={{ fontSize: 20, flexShrink: 0 }}>{a.icon}</div><div><div style={S.actionTitle}>{a.title}</div><div style={S.actionDesc}>{a.desc}</div></div></div>))}
            {/* Post-relapse protocol config */}
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
            {/* History */}
            <div style={S.card}><div style={S.cardLabel}>Relapse history</div>{!(account?.relapses?.length) ? <div style={S.empty}>No relapses recorded. Keep going 💪</div> : [...(account.relapses || [])].reverse().map((r, i) => (<div key={i} style={{ padding: "10px 0", borderBottom: "0.5px solid #161616" }}><div style={{ fontSize: 11, color: "#f97316", marginBottom: 3 }}>{new Date(r.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</div>{r.note && <div style={{ fontSize: 12, color: "#888", lineHeight: 1.55 }}>{r.note}</div>}{r.tools?.length > 0 && <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Tools used: {r.tools.join(", ")}</div>}</div>))}</div>
          </div>
        )}

        {/* ════ REWARDS ════ */}
        {view === "rewards" && (
          <div style={S.content}>
            <h2 style={S.pageTitle}>Rewards</h2>
            <div style={S.card}><div style={S.cardLabel}>🌙 Sleep rewards — {goodStreak} night streak</div>{SLEEP_MS.map(m => { const isCl = claimedSl.includes(m.nights); const isAv = goodStreak >= m.nights && !isCl; return (<div key={m.nights} style={{ ...S.rewardCard, opacity: isCl ? 0.5 : 1 }}><div><div style={S.rewardCardName}>{m.emoji} {m.reward}</div><div style={{ fontSize: 11, color: "#444" }}>{m.nights} consecutive good nights</div></div>{isCl && <div style={{ color: "#34d399", fontSize: 12 }}>✓ Claimed</div>}{isAv && <button style={S.claimBtn} onClick={() => claimSlRew(m.nights)}>Claim ✓</button>}{!isCl && !isAv && <div style={{ fontSize: 14, opacity: .4 }}>🔒</div>}</div>); })}</div>
            <div style={S.card}><div style={S.cardLabel}>Sobriety rewards</div>{availRew.length === 0 ? <div style={S.empty}>No new rewards yet.</div> : availRew.map(r => (<div key={r.id} style={S.rewardCard}><div><div style={S.rewardCardName}>{r.name}</div><div style={{ fontSize: 11, color: "#444" }}>{r.days} day milestone</div></div><button style={S.claimBtn} onClick={() => claimReward(r.id)}>Claim ✓</button></div>))}</div>
            <div style={S.card}><div style={S.cardLabel}>Upcoming</div>{(account?.rewards || []).filter(r => daysSober < r.days && !claimed.includes(r.id)).sort((a, b) => a.days - b.days).map(r => (<div key={r.id} style={{ ...S.rewardCard, opacity: 0.35 }}><div><div style={S.rewardCardName}>{r.name}</div><div style={{ fontSize: 11, color: "#444" }}>Unlocks at {r.days}d — {r.days - daysSober}d to go</div></div><div style={{ fontSize: 14, opacity: .5 }}>🔒</div></div>))}</div>
            <div style={S.card}><div style={S.cardLabel}>Add a custom reward</div><input style={S.input} placeholder="Reward name…" value={newRewName} onChange={e => setNRN(e.target.value)} /><div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}><label style={{ color: "#666", fontSize: 12 }}>Unlock at</label><input type="number" style={{ ...S.input, width: 70 }} value={newRewDays} onChange={e => setNRD(e.target.value)} /><label style={{ color: "#666", fontSize: 12 }}>days sober</label></div><button style={{ ...S.primaryBtn, marginTop: 12 }} onClick={addReward}>Add reward</button></div>
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
      </main>

      {/* ══════════════════ MODALS ══════════════════ */}

      {/* Switch / manage accounts */}
      {modal === "switchAccount" && (
        <div style={S.overlay} onClick={() => setModal(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Your journeys</div>
            <p style={S.modalSub}>Switch between recovery tracks or add a new one.</p>
            {accounts.map(acc => (<div key={acc.id} style={{ ...S.accRow, borderColor: acc.id === activeId ? acc.color + "66" : "#1a1a1e", background: acc.id === activeId ? acc.color + "11" : "transparent" }}>
              <div style={{ ...S.accDot, background: acc.color, width: 12, height: 12 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{acc.name}</div>
                <div style={{ fontSize: 11, color: "#555" }}>{acc.substance} · {getDaysSince(acc.sobrietyStart)}d sober</div>
              </div>
              {acc.id === activeId ? <span style={{ fontSize: 11, color: acc.color }}>Active</span> : <button style={{ ...S.claimBtn, borderColor: acc.color, color: acc.color, background: acc.color + "11" }} onClick={() => switchAccount(acc.id)}>Switch</button>}
              {acc.id !== activeId && <button style={{ ...S.deleteBtn, color: "#f87171", fontSize: 14 }} onClick={() => deleteAccount(acc.id)}>×</button>}
            </div>))}
            <button style={{ ...S.primaryBtn, marginTop: 16 }} onClick={() => { setModal("addAccount"); setAccSetupStep(0); }}>+ Add a new journey</button>
            <button style={{ ...S.primaryBtn, background: "#1a1a1e", color: "#666", marginTop: 8 }} onClick={() => setModal(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Add account */}
      {modal === "addAccount" && (
        <AddAccountModal step={accSetupStep} setStep={setAccSetupStep} name={newAccName} setName={setNewAccName} sub={newAccSub} setSub={setNewAccSub} date={newAccDate} setDate={setNewAccDate} color={newAccColor} setColor={setNewAccColor} onDone={createAccount} onClose={() => { setModal(accounts.length ? "switchAccount" : null); setAccSetupStep(0); }} />
      )}

      {/* Sleep log */}
      {modal === "sleepLog" && (<div style={S.overlay} onClick={() => setModal(null)}><div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>🌙 Log your sleep</div>
        <p style={S.modalSub}>Scored on duration AND alignment with your {fmtTime(routine.bedtimeTarget)} → {fmtTime(routine.wakeTarget)} target.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={S.formRow}><label style={S.formLabel}>Bedtime</label><input type="time" style={S.input} value={logBed} onChange={e => setLogBed(e.target.value)} /></div>
          <div style={S.formRow}><label style={S.formLabel}>Wake time</label><input type="time" style={S.input} value={logWake} onChange={e => setLogWake(e.target.value)} /></div>
          {logBed && logWake && (() => { const dur = sleepDur(logBed, logWake); const q = sleepQuality({ bedtime: logBed, waketime: logWake, durationMins: dur }, routine); const vs = dur - sleepDur(routine.bedtimeTarget, routine.wakeTarget); return (<div style={{ background: "#0a0a0c", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: 22, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>{fmtDur(dur)}</div><div style={{ fontSize: 11, color: vs >= 0 ? "#34d399" : "#f87171", marginTop: 3 }}>{vs >= 0 ? "+" : "-"}{fmtDur(Math.abs(vs))} vs target</div></div><div style={{ textAlign: "right" }}><span style={{ ...S.qualBadge, background: q.color + "22", color: q.color, border: `1px solid ${q.color}55`, fontSize: 13, padding: "4px 12px" }}>{q.label}</span><div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>{q.score}/{q.max} pts</div></div></div>); })()}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button style={{ ...S.primaryBtn, flex: 1 }} onClick={submitSleepLog} disabled={!logBed || !logWake}>Save</button>
          <button style={{ ...S.primaryBtn, background: "#1a1a1e", color: "#666", flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
        </div>
      </div></div>)}

      {/* Panic modal */}
      {modal === "panic" && (<div style={S.overlay} onClick={() => setModal(null)}><div style={{ ...S.modalBox, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {["Crisis tools", "My reminders"].map((label, i) => (<div key={i} style={{ flex: 1, padding: "5px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500, textAlign: "center", background: panicStep === i ? (i === 0 ? "#f87171" : "#f59e0b") : "#1a1a1e", color: panicStep === i ? (i === 0 ? "#fff" : "#0d0d0f") : "#444" }}>{i + 1} — {label}</div>))}
        </div>
        {panicStep === 0 && (<>
          <div style={S.modalTitle}>🆘 You are stronger than this craving</div>
          <p style={S.modalSub}>Cravings peak within 20 minutes then drop. Try one of these right now:</p>
          {BUILTIN_RELAPSE_TOOLS.slice(0, 4).map(a => (<div key={a.id} style={{ ...S.actionCard, marginBottom: 8 }}><div style={{ fontSize: 20 }}>{a.icon}</div><div><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{a.title}</div><div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{a.desc}</div></div></div>))}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button style={{ ...S.primaryBtn, background: "#f59e0b", color: "#0d0d0f", flex: 1 }} onClick={() => setPanicStep(1)}>Read my reminders →</button>
            <button style={{ ...S.primaryBtn, background: "#1a1a1e", color: "#666", flex: 1 }} onClick={() => setModal(null)}>I'm okay now</button>
          </div>
        </>)}
        {panicStep === 1 && (<>
          <div style={S.modalTitle}>💛 Remember why you started</div>
          {reminders.length === 0 ? (<div style={{ ...S.card, textAlign: "center" }}><p style={{ color: "#444", fontSize: 13 }}>No reminders saved yet.</p><button style={{ ...S.linkBtn, marginTop: 8 }} onClick={() => { setModal(null); setView("goals"); }}>Add reminders in Goals →</button></div>) : reminders.map(r => (<div key={r.id} style={{ background: "rgba(245,158,11,0.07)", border: "0.5px solid rgba(245,158,11,0.2)", borderRadius: 9, padding: "12px 14px", marginBottom: 8 }}><p style={{ fontSize: 14, color: "#f59e0b", fontStyle: "italic", margin: 0, lineHeight: 1.65 }}>"{r.text}"</p></div>))}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button style={{ ...S.primaryBtn, background: "#1a1a1e", color: "#666", flex: 1 }} onClick={() => setPanicStep(0)}>← Back</button>
            <button style={{ ...S.primaryBtn, background: "#dc2626", flex: 1 }} onClick={() => { setModal("relapseLog"); }}>Log relapse</button>
            <button style={{ ...S.primaryBtn, background: "#34d399", color: "#0d1f17", flex: 1 }} onClick={() => setModal(null)}>I made it ✓</button>
          </div>
        </>)}
      </div></div>)}

      {/* Relapse log modal */}
      {modal === "relapseLog" && (<div style={S.overlay} onClick={() => setModal(null)}><div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>⚠ Log a relapse</div>
        <p style={S.modalSub}>This resets your counter. Every relapse teaches something — you'll be taken through your post-relapse protocol next.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {BUILTIN_RELAPSE_TOOLS.map(a => (<label key={a.id} style={{ display: "flex", alignItems: "center", cursor: "pointer", color: "#bbb", fontSize: 13 }}><input type="checkbox" checked={checkedTools.includes(a.title)} onChange={e => setCheckedTools(e.target.checked ? [...checkedTools, a.title] : checkedTools.filter(x => x !== a.title))} style={{ marginRight: 8 }} />{a.icon} {a.title}</label>))}
        </div>
        <textarea style={S.textarea} placeholder="What happened? (optional)" value={relapseNote} onChange={e => setRN(e.target.value)} rows={3} />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button style={{ ...S.primaryBtn, background: "#dc2626", flex: 1 }} onClick={logRelapse}>Record &amp; start protocol</button>
          <button style={{ ...S.primaryBtn, background: "#1a1a1e", color: "#666", flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
        </div>
      </div></div>)}

      {/* Post-relapse protocol modal */}
      {modal === "postRelapse" && (<div style={S.overlay}><div style={{ ...S.modalBox, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 11, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Post-relapse protocol</div>
        <div style={S.modalTitle}>What to do right now</div>
        <p style={S.modalSub}>Work through each action below. Take your time — there's no rush. Tick each one off as you complete it.</p>
        {/* Immediate actions checklist */}
        <div style={{ fontSize: 11, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Immediate actions</div>
        {postRelapseActions.length === 0 && (<div style={{ ...S.empty, marginBottom: 12 }}>No custom actions set. <button style={S.linkBtn} onClick={() => { setModal(null); setView("relapse"); }}>Add them in the Relapse tab →</button></div>)}
        {postRelapseActions.map(a => {
          const done = checkedPost.includes(a.id);
          return (<div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12, padding: "12px 14px", borderRadius: 10, background: done ? "rgba(52,211,153,0.07)" : "#0f0f11", border: `0.5px solid ${done ? "#34d39944" : "#1a1a1e"}`, cursor: "pointer", transition: "all .2s" }} onClick={() => setCheckedPost(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])}>
            <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${done ? "#34d399" : "#333"}`, background: done ? "#34d399" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{done && <span style={{ color: "#0d0d0f", fontSize: 13, fontWeight: 700 }}>✓</span>}</div>
            <span style={{ fontSize: 14, lineHeight: 1.55, textDecoration: done ? "line-through" : "none", opacity: done ? 0.5 : 1, color: done ? "#666" : "#ddd" }}>{a.text}</span>
          </div>);
        })}
        {/* Post-relapse reminders */}
        {postRelapseReminders.length > 0 && (<>
          <div style={{ fontSize: 11, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.07em", margin: "16px 0 10px" }}>Remember this</div>
          {postRelapseReminders.map(r => (<div key={r.id} style={{ background: "rgba(245,158,11,0.06)", border: "0.5px solid rgba(245,158,11,0.18)", borderRadius: 9, padding: "12px 14px", marginBottom: 8 }}><p style={{ fontSize: 14, color: "#f59e0b", fontStyle: "italic", margin: 0, lineHeight: 1.65 }}>"{r.text}"</p></div>))}
        </>)}
        {/* Progress indicator */}
        <div style={{ marginTop: 16, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555", marginBottom: 4 }}><span>Actions completed</span><span>{checkedPost.length}/{postRelapseActions.length}</span></div>
          <div style={S.progressBg}><div style={{ ...S.progressBar, width: `${postRelapseActions.length ? Math.round(checkedPost.length / postRelapseActions.length * 100) : 0}%`, background: "linear-gradient(90deg,#a78bfa,#34d399)" }} /></div>
        </div>
        <button style={{ ...S.primaryBtn, background: "#34d399", color: "#0d1f17", marginTop: 8 }} onClick={() => { setModal(null); setCheckedPost([]); setView("dashboard"); }}>
          {checkedPost.length >= postRelapseActions.length ? "Protocol complete — back to dashboard ✓" : "I'm done for now"}
        </button>
      </div></div>)}
    </div>
  );
}

// ── AddAccount sub-component ───────────────────────────────────────────────
function AddAccountModal({ step, setStep, name, setName, sub, setSub, date, setDate, color, setColor, onDone, onClose }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        {step === 0 && (<>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
          <div style={S.modalTitle}>Name this journey</div>
          <p style={S.modalSub}>Give it a personal name — it will show in the account switcher.</p>
          <input style={S.input} placeholder='e.g. "My alcohol journey", "Quit smoking"' value={name} onChange={e => setName(e.target.value)} />
          <div style={{ fontSize: 10, color: "#444", margin: "12px 0 6px" }}>Pick a colour</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {ACCOUNT_COLORS.map(c => (<div key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: color === c ? "3px solid #fff" : "3px solid transparent", transition: "border .15s" }} />))}
          </div>
          <button style={{ ...S.primaryBtn, background: color, color: "#0d0d0f" }} onClick={() => setStep(1)} disabled={!name.trim()}>Next →</button>
        </>)}
        {step === 1 && (<>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
          <div style={S.modalTitle}>What are you working on?</div>
          <p style={S.modalSub}>e.g. alcohol, cigarettes, gambling, social media</p>
          <input style={S.input} placeholder="e.g. alcohol" value={sub} onChange={e => setSub(e.target.value)} />
          <button style={{ ...S.primaryBtn, marginTop: 12, background: color, color: "#0d0d0f" }} onClick={() => setStep(2)} disabled={!sub.trim()}>Next →</button>
          <button style={{ ...S.primaryBtn, marginTop: 8, background: "#1a1a1e", color: "#666" }} onClick={() => setStep(0)}>← Back</button>
        </>)}
        {step === 2 && (<>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <div style={S.modalTitle}>When did this sobriety begin?</div>
          <p style={S.modalSub}>It's okay if it's today. Every moment is a valid start.</p>
          <input type="date" style={S.input} value={date} max={getTodayStr()} onChange={e => setDate(e.target.value)} />
          <button style={{ ...S.primaryBtn, marginTop: 12, background: color, color: "#0d0d0f" }} onClick={onDone}>Create this journey →</button>
          <button style={{ ...S.primaryBtn, marginTop: 8, background: "#1a1a1e", color: "#666" }} onClick={() => setStep(1)}>← Back</button>
        </>)}
      </div>
    </div>
  );
}

function StatCard({ value, label, accent }) {
  return (<div style={{ ...S.statCard, borderTopColor: accent }}><div style={{ ...S.statValue, color: accent }}>{value}</div><div style={S.statLabel}>{label}</div></div>);
}

const S = {
  app: { display: "flex", minHeight: "100vh", background: "#0d0d0f", color: "#e8e8e8", fontFamily: "'Georgia',serif" },
  sidebar: { width: 210, background: "#0a0a0c", borderRight: "1px solid #161618", display: "flex", flexDirection: "column", padding: "20px 0", position: "sticky", top: 0, height: "100vh", flexShrink: 0 },
  sidebarTop: { padding: "0 14px 18px", borderBottom: "1px solid #161618" },
  logo: { fontSize: 16, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.02em" },
  accSwitcher: { display: "flex", alignItems: "center", gap: 8, width: "100%", background: "#111113", border: "0.5px solid", borderRadius: 8, padding: "8px 10px", cursor: "pointer", marginBottom: 10, color: "#e8e8e8", textAlign: "left" },
  accDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  sobrietyBadge: { background: "#111113", borderRadius: 9, padding: "10px 12px", border: "0.5px solid" },
  sobrietyDays: { fontSize: 36, fontWeight: 700, lineHeight: 1, fontFamily: "monospace" },
  sobrietyLabel: { fontSize: 10, color: "#555", marginTop: 3 },
  nav: { padding: "12px 8px", flex: 1 },
  navBtn: { display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px", borderRadius: 7, border: "none", borderLeft: "3px solid transparent", background: "transparent", color: "#555", fontSize: 13, cursor: "pointer", marginBottom: 2, textAlign: "left" },
  navBtnActive: { background: "#141416", color: "#e8e8e8" },
  navIcon: { fontSize: 13, width: 16, textAlign: "center" },
  sidebarBottom: { padding: "12px 8px", borderTop: "1px solid #161618" },
  relapseBtn: { width: "100%", padding: "8px", borderRadius: 7, border: "1px solid #3a1212", background: "#160c0c", color: "#f87171", fontSize: 12, cursor: "pointer", marginBottom: 6 },
  resetLink: { background: "none", border: "none", color: "#252525", fontSize: 10, cursor: "pointer", width: "100%", textAlign: "center" },
  main: { flex: 1, overflow: "auto" },
  content: { maxWidth: 640, margin: "0 auto", padding: "24px 20px" },
  pageTitle: { fontSize: 22, fontWeight: 700, marginBottom: 20, letterSpacing: "-0.02em" },
  panicBtn: { display: "flex", alignItems: "center", gap: 12, background: "rgba(239,68,68,0.07)", border: "1.5px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, cursor: "pointer" },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
  statCard: { background: "#0a0a0c", border: "0.5px solid #161618", borderTop: "3px solid", borderRadius: 10, padding: "13px 14px" },
  statValue: { fontSize: 22, fontWeight: 700, fontFamily: "monospace", marginBottom: 3 },
  statLabel: { fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" },
  card: { background: "#0a0a0c", border: "0.5px solid #161618", borderRadius: 10, padding: "14px 16px", marginBottom: 11 },
  cardLabel: { fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 },
  progressWrap: { display: "flex", alignItems: "center", gap: 10 },
  progressBg: { flex: 1, height: 5, background: "#161618", borderRadius: 3, overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 3, transition: "width .4s" },
  progressText: { fontSize: 11, color: "#444", whiteSpace: "nowrap" },
  bigProgressBg: { height: 6, background: "#161618", borderRadius: 3, overflow: "hidden", marginTop: 8 },
  bigProgressBar: { height: "100%", borderRadius: 3, transition: "width .4s" },
  milestonesGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 },
  milestoneChip: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 4px", borderRadius: 8, border: "1px solid", transition: "all .3s" },
  mLabel: { fontSize: 9, color: "#666" },
  scheduleRow: { display: "flex", alignItems: "center", padding: "9px 0 9px 10px", borderBottom: "0.5px solid #111", borderLeft: "2px solid", marginBottom: 1 },
  habitDot: { width: 16, height: 16, borderRadius: "50%", border: "2px solid", cursor: "pointer", transition: "all .2s", flexShrink: 0 },
  checkBtn: { width: 28, height: 28, borderRadius: "50%", border: "2px solid", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", transition: "all .2s", background: "transparent" },
  deleteBtn: { background: "none", border: "none", color: "#2a2a2a", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: "0 2px" },
  catBtn: { padding: "3px 10px", borderRadius: 16, border: "1px solid", fontSize: 11, cursor: "pointer", background: "transparent" },
  goalBadge: { display: "inline-block", padding: "2px 10px", borderRadius: 18, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" },
  goalCheck: { width: 18, height: 18, borderRadius: 4, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1, transition: "all .2s" },
  actionCard: { display: "flex", gap: 12, background: "#0a0a0c", border: "0.5px solid #161618", borderRadius: 9, padding: "12px 14px", marginBottom: 7, alignItems: "flex-start" },
  actionTitle: { fontSize: 13, fontWeight: 600, marginBottom: 3 },
  actionDesc: { fontSize: 12, color: "#666", lineHeight: 1.55 },
  rewardRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  rewardCard: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid #161618" },
  rewardCardName: { fontSize: 13, marginBottom: 2 },
  claimBtn: { background: "#0d1f18", border: "1px solid #34d399", color: "#34d399", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", flexShrink: 0 },
  sleepTarget: { background: "#060608", borderRadius: 8, padding: "10px 12px", textAlign: "center" },
  sleepTargetLabel: { fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 },
  sleepTargetVal: { fontSize: 17, fontWeight: 700, fontFamily: "monospace" },
  qualBadge: { display: "inline-block", fontSize: 11, padding: "2px 8px", borderRadius: 16, fontWeight: 500 },
  sleepLogRow: { display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "0.5px solid #111" },
  journalEntry: { background: "#0a0a0c", border: "0.5px solid #161618", borderRadius: 9, padding: "12px 16px", marginBottom: 9 },
  journalDate: { fontSize: 10, color: "#444", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" },
  journalText: { fontSize: 13, color: "#bbb", lineHeight: 1.75 },
  empty: { fontSize: 12, color: "#333", padding: "4px 0" },
  linkBtn: { background: "none", border: "none", color: "#60a5fa", fontSize: 12, cursor: "pointer", padding: 0 },
  textarea: { width: "100%", background: "#060608", border: "1px solid #161618", borderRadius: 7, padding: "10px 12px", color: "#e8e8e8", fontSize: 13, fontFamily: "Georgia,serif", resize: "vertical", lineHeight: 1.65 },
  input: { width: "100%", background: "#060608", border: "1px solid #161618", borderRadius: 7, padding: "9px 12px", color: "#e8e8e8", fontSize: 13, fontFamily: "Georgia,serif" },
  primaryBtn: { background: "#34d399", color: "#0d1f17", border: "none", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%" },
  setupWrap: { minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" },
  setupCard: { background: "#0a0a0c", border: "1px solid #161618", borderRadius: 16, padding: "40px 34px", maxWidth: 400, width: "100%", textAlign: "center" },
  setupEmoji: { fontSize: 40, marginBottom: 14 },
  setupTitle: { fontSize: 22, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.02em" },
  setupSub: { fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: 20 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modalBox: { background: "#0a0a0c", border: "1px solid #1a1a1e", borderRadius: 13, padding: "24px", maxWidth: 460, width: "92%", maxHeight: "88vh", overflowY: "auto" },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
  modalSub: { fontSize: 12, color: "#555", lineHeight: 1.6, marginBottom: 14 },
  formRow: { display: "flex", flexDirection: "column", gap: 5 },
  formLabel: { fontSize: 11, color: "#555" },
  accRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "0.5px solid", marginBottom: 8 },
};
