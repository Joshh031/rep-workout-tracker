import { useState, useRef, useEffect } from "react";

const EXERCISE_DB = {
  chest:     { staples: ["Bench Press", "Incline Bench", "Cable Fly", "Dumbbell Press", "Push-Up"], alternatives: ["Decline Bench", "Pec Deck", "Landmine Press", "Dips", "Cable Crossover", "Chest Pullover", "Floor Press", "Svend Press"] },
  back:      { staples: ["Pull-Up", "Barbell Row", "Lat Pulldown", "Seated Cable Row", "Face Pull", "Shrugs"], alternatives: ["T-Bar Row", "Single-Arm DB Row", "Meadows Row", "Chest-Supported Row", "Straight-Arm Pulldown", "Rack Pull", "Good Morning", "Reverse Fly"] },
  legs:      { staples: ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raise"], alternatives: ["Hack Squat", "Bulgarian Split Squat", "Leg Extension", "Walking Lunge", "Box Jump", "Sumo Deadlift", "Hip Thrust", "Goblet Squat"] },
  shoulders: { staples: ["Overhead Press", "Lateral Raise", "Front Raise", "Rear Delt Fly", "Arnold Press", "Rear Delts", "Shrugs"], alternatives: ["Cable Lateral Raise", "Face Pull", "Upright Row", "Shrug", "Landmine Press", "Cuban Press", "Behind-Neck Press", "Plate Raise"] },
  biceps:    { staples: ["Barbell Curl", "Hammer Curl", "Incline Curl", "Cable Curl", "Concentration Curl"], alternatives: ["Preacher Curl", "Spider Curl", "Zottman Curl", "21s", "Cross-Body Curl", "Chin-Up", "Reverse Curl", "Rope Hammer Curl"] },
  triceps:   { staples: ["Skull Crusher", "Tricep Pushdown", "Overhead Extension", "Dips", "Close-Grip Bench"], alternatives: ["Diamond Push-Up", "Kickback", "JM Press", "Tate Press", "Cable Overhead Extension", "Single-Arm Pushdown", "Board Press", "Rolling DB Extension"] },
};

const STRETCHES = [
  { key: "calves",     label: "Calves",     duration: 180, icon: "◎", tip: "Lean into wall, heel flat on floor" },
  { key: "quads",      label: "Quads",      duration: 180, icon: "◈", tip: "Standing, pull foot to glute" },
  { key: "hamstrings", label: "Hamstrings", duration: 180, icon: "◇", tip: "Seated forward fold, reach for toes" },
  { key: "hips",       label: "Hips",       duration: 180, icon: "◉", tip: "Pigeon pose or figure-4" },
];

const WORKOUT_TYPES = ["run", "chest", "legs", "shoulders", "back", "biceps", "triceps"];
const ICON = { run: "⚡", chest: "💪", legs: "🦵", shoulders: "🏋️", back: "🔱", biceps: "💥", triceps: "⚙️" };

function scoreColor(s) {
  if (!s) return "#444";
  const n = parseInt(s);
  if (n >= 85) return "#3a9e4f";
  if (n >= 70) return "#c49a1a";
  return "#c0392b";
}
function scoreLabel(s) {
  const n = parseInt(s);
  if (n >= 85) return "OPTIMAL";
  if (n >= 70) return "GOOD";
  if (n >= 55) return "FAIR";
  return "LOW";
}

// ── Shared styles ──────────────────────────────────────────────────────────
const g = {
  page:     { padding: "24px 16px 0" },
  label:    { fontSize: 9, letterSpacing: 4, textTransform: "uppercase", color: "#3a3a3a", marginBottom: 12, marginTop: 0, display: "block" },
  card:     { background: "#141414", border: "1px solid #1e1e1e", borderRadius: 10, marginBottom: 10, overflow: "hidden" },
  input:    { background: "#0f0f0f", border: "1px solid #252525", color: "#e8e0d5", padding: "10px 12px", borderRadius: 6, fontSize: 14, fontFamily: "'DM Mono', monospace", width: "100%", boxSizing: "border-box", outline: "none" },
  numInput: { background: "#0f0f0f", border: "1px solid #252525", color: "#e8e0d5", padding: "9px 6px", borderRadius: 5, fontSize: 14, fontFamily: "'DM Mono', monospace", width: "100%", boxSizing: "border-box", textAlign: "center", outline: "none" },
  primary:  { background: "#ff4d00", border: "none", color: "#fff", padding: "14px 20px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", width: "100%", marginBottom: 10, display: "block" },
  ghost:    { background: "none", border: "1px solid #252525", color: "#666", padding: "7px 12px", borderRadius: 5, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" },
  altBtn:   { background: "#191919", border: "1px solid #252525", color: "#bbb", padding: "9px 12px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono', monospace", display: "block", width: "100%", textAlign: "left", marginBottom: 6 },
  badge:    { background: "#1e1e1e", color: "#555", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", padding: "3px 8px", borderRadius: 3, border: "1px solid #252525" },
};

const Bar = ({ value, max, color = "#ff4d00" }) => (
  <div style={{ height: 2, background: "#1e1e1e", borderRadius: 2, overflow: "hidden" }}>
    <div style={{ height: "100%", width: `${Math.min((value / max) * 100, 100)}%`, background: color, transition: "width 0.4s ease" }} />
  </div>
);

// ── Stretch Timer ──────────────────────────────────────────────────────────
function StretchTimer({ stretch, completed, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(stretch.duration);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (running && timeLeft > 0) {
      ref.current = setInterval(() => {
        setTimeLeft(t => { if (t <= 1) { clearInterval(ref.current); setRunning(false); onComplete(); return 0; } return t - 1; });
      }, 1000);
    }
    return () => clearInterval(ref.current);
  }, [running]);

  const reset = () => { clearInterval(ref.current); setRunning(false); setTimeLeft(stretch.duration); };
  const pct = ((stretch.duration - timeLeft) / stretch.duration) * 100;
  const circ = 2 * Math.PI * 26;

  return (
    <div style={{ background: completed ? "#0b180b" : "#141414", border: `1px solid ${completed ? "#1a4020" : running ? "#ff4d00" : "#1e1e1e"}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, transition: "all 0.3s" }}>
      <div style={{ position: "relative", width: 58, height: 58, flexShrink: 0 }}>
        <svg width="58" height="58" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="29" cy="29" r="26" fill="none" stroke="#1e1e1e" strokeWidth="3.5" />
          <circle cx="29" cy="29" r="26" fill="none" stroke={completed ? "#3a9e4f" : running ? "#ff4d00" : "#2a2a2a"} strokeWidth="3.5" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: completed ? 18 : 10, color: completed ? "#3a9e4f" : running ? "#ff4d00" : "#555", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
          {completed ? "✓" : `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: completed ? "#3a9e4f" : "#ccc", marginBottom: 3, fontWeight: 600 }}>{stretch.label}</div>
        <div style={{ fontSize: 10, color: "#383838", marginBottom: 10 }}>{stretch.tip}</div>
        <div style={{ display: "flex", gap: 7 }}>
          {!completed && <button onClick={() => setRunning(r => !r)} style={{ ...g.ghost, background: running ? "none" : "#ff4d00", borderColor: running ? "#252525" : "#ff4d00", color: running ? "#666" : "#fff", fontSize: 9, padding: "5px 12px" }}>{running ? "PAUSE" : timeLeft < stretch.duration ? "RESUME" : "START"}</button>}
          {timeLeft < stretch.duration && !completed && <button onClick={reset} style={{ ...g.ghost, fontSize: 9, padding: "5px 10px" }}>↺</button>}
          {!completed && <button onClick={onComplete} style={{ ...g.ghost, borderColor: "#1a4020", color: "#3a9e4f", fontSize: 9, padding: "5px 10px" }}>DONE</button>}
        </div>
      </div>
    </div>
  );
}

// ── WORKOUT TAB ────────────────────────────────────────────────────────────
function WorkoutTab({ history, setHistory, persist, dailyLog, sleepLog }) {
  const [mode, setMode] = useState("pick"); // pick | log
  const [workoutType, setWorkoutType] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [runData, setRunData] = useState({ distance: "", firstStop: "", pace: "", heartRate: "", maxSpeed: "" });
  const [showAlts, setShowAlts] = useState(null);
  const [saved, setSaved] = useState(false);

  const startWorkout = (type) => {
    setWorkoutType(type);
    if (type !== "run") setExercises(EXERCISE_DB[type].staples.map(n => ({ name: n, sets: [{ reps: "", weight: "" }] })));
    else setRunData({ distance: "", firstStop: "", pace: "", heartRate: "", maxSpeed: "" });
    setMode("log"); setSaved(false);
  };

  const addSet = (i) => { const u = [...exercises]; u[i].sets.push({ reps: "", weight: "" }); setExercises(u); };
  const updateSet = (i, j, f, v) => { const u = [...exercises]; u[i].sets[j][f] = v; setExercises(u); };
  const updateName = (i, v) => { const u = [...exercises]; u[i].name = v; setExercises(u); };
  const removeExercise = (i) => setExercises(exercises.filter((_, idx) => idx !== i));
  const replaceWithAlt = (i, name) => { const u = [...exercises]; u[i].name = name; setExercises(u); setShowAlts(null); };

  const saveWorkout = () => {
    const entry = { id: Date.now(), date: new Date().toLocaleDateString(), type: workoutType, ...(workoutType === "run" ? { runData } : { exercises }) };
    const newH = [entry, ...history];
    setHistory(newH); persist(newH, dailyLog, sleepLog); setSaved(true);
  };

  const deleteWorkout = (id) => {
    const newH = history.filter(h => h.id !== id);
    setHistory(newH); persist(newH, dailyLog, sleepLog);
  };

  const totalSets = exercises.reduce((a, e) => a + e.sets.length, 0);
  const lastRun = history.find(h => h.type === "run");

  if (mode === "pick") return (
    <div style={g.page}>
      <span style={g.label}>Choose Workout</span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
        {WORKOUT_TYPES.map(t => (
          <button key={t} onClick={() => startWorkout(t)} style={{
            background: "#141414", border: "1px solid #1e1e1e", color: "#e8e0d5", padding: "20px 10px",
            borderRadius: 10, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10,
            letterSpacing: 3, textTransform: "uppercase", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 9, transition: "all 0.15s"
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#ff4d00"; e.currentTarget.style.background = "#1c1008"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1e1e"; e.currentTarget.style.background = "#141414"; }}
          >
            <span style={{ fontSize: 26 }}>{ICON[t]}</span>
            {t}
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <>
          <span style={g.label}>Recent</span>
          {history.slice(0, 4).map(h => (
            <div key={h.id} style={{ ...g.card, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13 }}>{ICON[h.type]} <span style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#888", marginLeft: 6 }}>{h.type}</span></span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={g.badge}>{h.date}</span>
                {h.exercises && <span style={{ fontSize: 10, color: "#333" }}>{h.exercises.reduce((a, e) => a + e.sets.length, 0)} sets</span>}
                {h.type === "run" && h.runData?.distance && <span style={{ fontSize: 10, color: "#333" }}>{h.runData.distance} mi</span>}
                <button onClick={() => deleteWorkout(h.id)} style={{ background: "none", border: "1px solid #252525", color: "#333", padding: "3px 7px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>✕</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  // ── Weights log ──
  if (workoutType !== "run") {
    const db = EXERCISE_DB[workoutType];
    return (
      <div style={g.page}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => setMode("pick")} style={{ ...g.ghost, padding: "6px 10px", fontSize: 11 }}>←</button>
          <span style={{ fontSize: 16 }}>{ICON[workoutType]}</span>
          <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#888" }}>{workoutType}</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: totalSets >= 20 ? "#ff4d00" : "#333", letterSpacing: 2 }}>{totalSets}/20</span>
            <div style={{ width: 60 }}><Bar value={totalSets} max={20} /></div>
          </div>
        </div>

        {exercises.map((ex, i) => (
          <div key={i} style={g.card}>
            <div style={{ background: "#191919", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e1e1e" }}>
              <input style={{ ...g.input, padding: "4px 0", background: "none", border: "none", fontSize: 12, fontWeight: 700, letterSpacing: 1, flex: 1, color: "#ddd" }}
                value={ex.name} onChange={e => updateName(i, e.target.value)} placeholder="Exercise…" />
              <div style={{ display: "flex", gap: 6, marginLeft: 10 }}>
                <button style={{ ...g.ghost, padding: "3px 8px", fontSize: 9 }} onClick={() => setShowAlts(showAlts === i ? null : i)}>SWAP</button>
                <button style={{ ...g.ghost, padding: "3px 8px", fontSize: 9, color: "#333" }} onClick={() => removeExercise(i)}>✕</button>
              </div>
            </div>

            {showAlts === i && (
              <div style={{ padding: "12px 14px", background: "#0e0e0e", borderBottom: "1px solid #1e1e1e" }}>
                <span style={{ ...g.label, marginBottom: 8 }}>Alternatives</span>
                {db.alternatives.map(a => <button key={a} style={g.altBtn} onClick={() => replaceWithAlt(i, a)}>+ {a}</button>)}
              </div>
            )}

            <div style={{ padding: "11px 14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr", gap: 8, marginBottom: 7 }}>
                <span />
                <span style={{ fontSize: 8, letterSpacing: 3, color: "#2a2a2a", textTransform: "uppercase" }}>REPS</span>
                <span style={{ fontSize: 8, letterSpacing: 3, color: "#2a2a2a", textTransform: "uppercase" }}>LBS</span>
              </div>
              {ex.sets.map((set, j) => (
                <div key={j} style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr", gap: 8, marginBottom: 7 }}>
                  <span style={{ fontSize: 9, color: "#2a2a2a", textAlign: "center", paddingTop: 10 }}>{j + 1}</span>
                  <input style={g.numInput} type="number" placeholder="—" value={set.reps} onChange={e => updateSet(i, j, "reps", e.target.value)} />
                  <input style={g.numInput} type="number" placeholder="—" value={set.weight} onChange={e => updateSet(i, j, "weight", e.target.value)} />
                </div>
              ))}
              <button style={{ ...g.ghost, fontSize: 9, marginTop: 2 }} onClick={() => addSet(i)}>+ SET</button>
            </div>
          </div>
        ))}

        <button style={{ ...g.ghost, width: "100%", marginBottom: 10 }} onClick={() => setExercises([...exercises, { name: "", sets: [{ reps: "", weight: "" }] }])}>+ ADD EXERCISE</button>
        <button style={g.primary} onClick={saveWorkout}>{saved ? "✓  SESSION SAVED" : "SAVE SESSION"}</button>
      </div>
    );
  }

  // ── Run log ──
  const dist = parseFloat(runData.distance) || 0;
  return (
    <div style={g.page}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setMode("pick")} style={{ ...g.ghost, padding: "6px 10px", fontSize: 11 }}>←</button>
        <span style={{ fontSize: 16 }}>⚡</span>
        <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#888" }}>RUN</span>
      </div>

      {[["distance","Total Distance","mi","0.01"],["firstStop","First Stop","mi","0.01"],["pace","Avg Pace","min/mi","0.01"],["heartRate","Heart Rate","bpm","1"],["maxSpeed","Max Speed","mph","0.1"]].map(([f, lbl, unit, step]) => (
        <div key={f} style={g.card}>
          <div style={{ padding: "13px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 9, letterSpacing: 3, color: "#555", textTransform: "uppercase" }}>{lbl}</span>
              <span style={{ fontSize: 9, color: "#2a2a2a" }}>{unit}</span>
            </div>
            <input style={g.input} type="number" step={step} placeholder="0" value={runData[f]} onChange={e => setRunData({ ...runData, [f]: e.target.value })} />
          </div>
        </div>
      ))}

      {dist > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, letterSpacing: 2, color: dist >= 4 ? "#ff4d00" : "#333", textTransform: "uppercase", marginBottom: 5 }}>
            <span>4 MI GOAL</span>
            <span>{dist >= 4 ? "✓ REACHED" : `${(4 - dist).toFixed(2)} to go`}</span>
          </div>
          <Bar value={dist} max={4} />
        </div>
      )}

      {lastRun && (
        <div style={{ ...g.card, padding: "12px 14px", marginBottom: 14 }}>
          <span style={{ ...g.label, marginBottom: 6 }}>vs Last Run · {lastRun.date}</span>
          <div style={{ fontSize: 11, color: "#444", lineHeight: 1.9 }}>
            {lastRun.runData.distance && `${lastRun.runData.distance} mi`}{lastRun.runData.pace && ` · ${lastRun.runData.pace} /mi`}{lastRun.runData.heartRate && ` · ${lastRun.runData.heartRate} bpm`}
          </div>
        </div>
      )}

      <button style={g.primary} onClick={saveWorkout}>{saved ? "✓  RUN SAVED" : "SAVE RUN"}</button>
    </div>
  );
}

// ── DAILY TAB ──────────────────────────────────────────────────────────────
function DailyTab({ dailyLog, setDailyLog, persist, history, sleepLog }) {
  const [daily, setDaily] = useState({ crunches: "", planks: "", pushups: "", steps: "" });
  const [stretchDone, setStretchDone] = useState({});
  const [saved, setSaved] = useState(false);

  const stretchCount = Object.values(stretchDone).filter(Boolean).length;

  const saveDaily = () => {
    const entry = { id: Date.now(), date: new Date().toLocaleDateString(), ...daily, stretches: STRETCHES.filter(s => stretchDone[s.key]).map(s => s.key) };
    const newD = [entry, ...dailyLog];
    setDailyLog(newD); persist(history, newD, sleepLog);
    setDaily({ crunches: "", planks: "", pushups: "", steps: "" });
    setStretchDone({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const steps = parseInt(daily.steps) || 0;
  const stepPct = Math.min((steps / 10000) * 100, 100);

  return (
    <div style={g.page}>
      {/* Steps */}
      <span style={g.label}>Steps</span>
      <div style={{ ...g.card, padding: "16px 14px", marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 9, letterSpacing: 2, color: "#333", textTransform: "uppercase" }}>↳ Daily Steps</span>
          <span style={{ fontSize: 9, letterSpacing: 2, color: steps >= 10000 ? "#3a9e4f" : "#333", textTransform: "uppercase" }}>
            {steps >= 10000 ? "✓ 10K REACHED" : `${(10000 - steps).toLocaleString()} to go`}
          </span>
        </div>
        <input style={{ ...g.numInput, fontSize: 20, fontWeight: 700, marginBottom: 10 }} type="number" placeholder="0" value={daily.steps} onChange={e => setDaily({ ...daily, steps: e.target.value })} />
        <div style={{ height: 3, background: "#1e1e1e", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${stepPct}%`, background: steps >= 10000 ? "#3a9e4f" : "#ff4d00", borderRadius: 3, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Calisthenics */}
      <span style={{ ...g.label, marginTop: 18 }}>Calisthenics</span>
      <div style={{ ...g.card, padding: "16px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[["crunches", "✦", "Crunches"], ["planks", "◆", "Planks"], ["pushups", "▲", "Push-Ups"]].map(([f, icon, lbl]) => (
            <div key={f} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, marginBottom: 5 }}>{icon}</div>
              <div style={{ fontSize: 8, letterSpacing: 2, color: "#333", textTransform: "uppercase", marginBottom: 7 }}>{lbl}</div>
              <input style={g.numInput} type="number" placeholder="0" value={daily[f]} onChange={e => setDaily({ ...daily, [f]: e.target.value })} />
            </div>
          ))}
        </div>
      </div>

      {/* Stretching */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 22, marginBottom: 12 }}>
        <span style={g.label}>Stretching</span>
        <span style={{ fontSize: 9, letterSpacing: 2, color: stretchCount === 4 ? "#3a9e4f" : "#2a2a2a", textTransform: "uppercase", marginBottom: 12 }}>{stretchCount}/4</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {STRETCHES.map(s => (
          <StretchTimer key={s.key} stretch={s} completed={!!stretchDone[s.key]}
            onComplete={() => setStretchDone(p => ({ ...p, [s.key]: true }))} />
        ))}
      </div>

      <button style={g.primary} onClick={saveDaily}>{saved ? "✓  LOGGED" : "LOG DAILY ROUTINE"}</button>

      {/* Recent daily logs */}
      {dailyLog.length > 0 && (
        <>
          <span style={{ ...g.label, marginTop: 8 }}>Recent</span>
          {dailyLog.slice(0, 3).map(d => (
            <div key={d.id} style={{ ...g.card, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#555" }}>DAILY</span>
                <span style={g.badge}>{d.date}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 11, color: "#444", marginBottom: d.stretches?.length ? 7 : 0 }}>
                <span>✦ {d.crunches || 0}</span><span>◆ {d.planks || 0}</span><span>▲ {d.pushups || 0}</span>
              </div>
              {d.steps && <div style={{ fontSize: 11, color: parseInt(d.steps) >= 10000 ? "#3a9e4f" : "#444", marginBottom: d.stretches?.length ? 7 : 0 }}>↳ {parseInt(d.steps).toLocaleString()} steps</div>}
              {d.stretches?.length > 0 && <div style={{ fontSize: 10, color: "#1e4a26" }}>🧘 {d.stretches.join(", ")}</div>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── SLEEP TAB ──────────────────────────────────────────────────────────────
function SleepTab({ sleepLog, setSleepLog, persist, history, dailyLog }) {
  const [oura, setOura] = useState({ sleepScore: "", readiness: "", hoursSlept: "", rem: "", heartRate: "", hrv: "", respiratoryRate: "" });
  const [saved, setSaved] = useState(false);

  const sc = scoreColor(oura.sleepScore);
  const rc = scoreColor(oura.readiness);

  // JH Spread = HRV - Resting HR (higher is better)
  const jhSpread = (oura.hrv && oura.heartRate)
    ? (parseFloat(oura.hrv) - parseFloat(oura.heartRate)).toFixed(1)
    : null;
  const jhColor = jhSpread === null ? "#444" : jhSpread > 0 ? "#3a9e4f" : "#c0392b";

  const saveSleep = () => {
    const entry = { id: Date.now(), date: new Date().toLocaleDateString(), ...oura, jhSpread };
    const newS = [entry, ...sleepLog];
    setSleepLog(newS); persist(history, dailyLog, newS);
    setOura({ sleepScore: "", readiness: "", hoursSlept: "", rem: "", heartRate: "", hrv: "", respiratoryRate: "" });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={g.page}>
      <span style={g.label}>Oura Sleep</span>

      {/* Dual score hero — Sleep + Readiness */}
      <div style={{ ...g.card, background: "#0f0f0f" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#1a1a1a", borderBottom: "1px solid #1a1a1a" }}>
          {[["sleepScore", "Sleep Score", sc], ["readiness", "Readiness", rc]].map(([field, label, color]) => (
            <div key={field} style={{ background: "#0f0f0f", padding: "18px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
                  <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="26" cy="26" r="22" fill="none" stroke="#1a1a1a" strokeWidth="4" />
                    <circle cx="26" cy="26" r="22" fill="none" stroke={color} strokeWidth="4"
                      strokeDasharray={2 * Math.PI * 22}
                      strokeDashoffset={2 * Math.PI * 22 * (1 - (parseInt(oura[field]) || 0) / 100)}
                      strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease" }} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: oura[field] ? color : "#2a2a2a", fontFamily: "'DM Mono', monospace" }}>{oura[field] || "—"}</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, letterSpacing: 3, color: "#2a2a2a", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
                  <input
                    style={{ background: "none", border: "none", borderBottom: "1px solid #1e1e1e", color: oura[field] ? color : "#555", fontSize: 26, fontFamily: "'DM Mono', monospace", fontWeight: 700, width: "100%", outline: "none", padding: "2px 0" }}
                    type="number" min="0" max="100" placeholder="—"
                    value={oura[field]} onChange={e => setOura(o => ({ ...o, [field]: e.target.value }))} />
                  {oura[field] && <div style={{ fontSize: 7, letterSpacing: 3, color, marginTop: 4, textTransform: "uppercase" }}>{scoreLabel(oura[field])}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Metrics grid — 3 columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "#1a1a1a" }}>
          {[
            ["hoursSlept", "Sleep",    "hrs",  "◑", "0.1"],
            ["rem",        "REM",      "hrs",  "◎", "0.1"],
            ["heartRate",  "Resting HR","bpm", "♡", "1"],
            ["hrv",        "HRV",      "ms",   "∿", "1"],
            ["respiratoryRate","Resp.", "brpm", "≋", "0.1"],
          ].map(([field, label, unit, icon, step]) => (
            <div key={field} style={{ background: "#0f0f0f", padding: "12px 10px" }}>
              <div style={{ fontSize: 8, letterSpacing: 2, color: "#2a2a2a", textTransform: "uppercase", marginBottom: 6, textAlign: "center" }}>{icon} {label}</div>
              <input style={{ ...g.numInput, fontSize: 16, fontWeight: 700, padding: "8px 4px" }}
                type="number" step={step} placeholder="—"
                value={oura[field]} onChange={e => setOura(o => ({ ...o, [field]: e.target.value }))} />
              <div style={{ fontSize: 7, color: "#1e1e1e", textAlign: "center", marginTop: 4 }}>{unit}</div>
            </div>
          ))}

          {/* JH Spread — auto-calculated, read only */}
          <div style={{ background: "#0f0f0f", padding: "12px 10px" }}>
            <div style={{ fontSize: 8, letterSpacing: 2, color: "#2a2a2a", textTransform: "uppercase", marginBottom: 6, textAlign: "center" }}>⚖ JH Spread</div>
            <div style={{ ...g.numInput, fontSize: 16, fontWeight: 700, padding: "8px 4px", color: jhSpread !== null ? jhColor : "#2a2a2a", border: "1px solid #1a1a1a", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {jhSpread !== null ? (jhSpread > 0 ? `+${jhSpread}` : jhSpread) : "—"}
            </div>
            <div style={{ fontSize: 7, color: "#1e1e1e", textAlign: "center", marginTop: 4 }}>HRV−HR</div>
          </div>
        </div>

        <div style={{ padding: "14px 16px" }}>
          <button onClick={saveSleep} style={{ ...g.primary, marginBottom: 0, background: saved ? "#0b180b" : "#ff4d00", border: saved ? "1px solid #1a4020" : "none", color: saved ? "#3a9e4f" : "#fff", transition: "all 0.3s" }}>
            {saved ? "✓  SLEEP LOGGED" : "LOG SLEEP"}
          </button>
        </div>
      </div>

      {/* Sleep history */}
      {sleepLog.length > 0 && (
        <>
          <span style={{ ...g.label, marginTop: 20 }}>History</span>
          {sleepLog.map(s => {
            const sc2 = scoreColor(s.sleepScore);
            const rc2 = scoreColor(s.readiness);
            const jh = s.jhSpread;
            const jhC = jh === null || jh === undefined ? "#333" : parseFloat(jh) > 0 ? "#3a9e4f" : "#c0392b";
            return (
              <div key={s.id} style={{ ...g.card, overflow: "hidden" }}>
                <div style={{ background: "#0f0f0f", padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1a1a1a" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 18, fontWeight: 700, color: sc2, fontFamily: "'DM Mono', monospace" }}>{s.sleepScore || "—"}</span>
                      {s.sleepScore && <span style={{ fontSize: 7, letterSpacing: 2, color: sc2, textTransform: "uppercase", marginLeft: 4 }}>sleep</span>}
                    </div>
                    {s.readiness && (
                      <div>
                        <span style={{ fontSize: 18, fontWeight: 700, color: rc2, fontFamily: "'DM Mono', monospace" }}>{s.readiness}</span>
                        <span style={{ fontSize: 7, letterSpacing: 2, color: rc2, textTransform: "uppercase", marginLeft: 4 }}>ready</span>
                      </div>
                    )}
                  </div>
                  <span style={g.badge}>{s.date}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", padding: "10px 14px", gap: 4 }}>
                  {[
                    ["◑", s.hoursSlept, "hrs"],
                    ["◎", s.rem, "rem"],
                    ["♡", s.heartRate, "bpm"],
                    ["∿", s.hrv, "ms"],
                    ["≋", s.respiratoryRate, "br"],
                    ["⚖", jh != null ? (parseFloat(jh) > 0 ? `+${jh}` : jh) : null, "jh"],
                  ].map(([icon, val, unit], idx) => (
                    <div key={idx} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#252525", marginBottom: 3 }}>{icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: idx === 5 ? jhC : val ? "#ccc" : "#252525" }}>{val || "—"}</div>
                      <div style={{ fontSize: 7, color: "#252525", marginTop: 2 }}>{unit}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── ROOT ───────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("workout");

  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem("rep_workoutHistory") || "[]"); } catch { return []; } });
  const [dailyLog, setDailyLog] = useState(() => { try { return JSON.parse(localStorage.getItem("rep_dailyLog") || "[]"); } catch { return []; } });
  const [sleepLog, setSleepLog] = useState(() => { try { return JSON.parse(localStorage.getItem("rep_sleepLog") || "[]"); } catch { return []; } });

  const persist = (h, d, s) => {
    localStorage.setItem("rep_workoutHistory", JSON.stringify(h));
    localStorage.setItem("rep_dailyLog", JSON.stringify(d));
    localStorage.setItem("rep_sleepLog", JSON.stringify(s));
  };

  const TABS = [
    { key: "workout", label: "WORKOUT", dot: null },
    { key: "daily",   label: "DAILY",   dot: null },
    { key: "sleep",   label: "SLEEP",   dot: null },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e0d5", fontFamily: "'DM Mono', monospace", paddingBottom: 72 }}>

        {/* Header */}
        <div style={{ background: "#0a0a0a", borderBottom: "1px solid #141414", padding: "16px 20px 0", position: "sticky", top: 0, zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 15, letterSpacing: 6, color: "#ff4d00", fontWeight: 700 }}>REP</span>
            <span style={{ fontSize: 9, letterSpacing: 2, color: "#2a2a2a" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}
            </span>
          </div>

          {/* Tab pills */}
          <div style={{ display: "flex", gap: 0, marginBottom: -1 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flex: t.key === "workout" ? 2 : 1,
                background: "none", border: "none",
                borderBottom: `2px solid ${tab === t.key ? "#ff4d00" : "transparent"}`,
                color: tab === t.key ? "#e8e0d5" : "#333",
                padding: "10px 0 12px",
                fontFamily: "'DM Mono', monospace",
                fontSize: t.key === "workout" ? 11 : 9,
                letterSpacing: 3,
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.2s",
                fontWeight: tab === t.key ? 700 : 400,
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {tab === "workout" && <WorkoutTab history={history} setHistory={setHistory} persist={persist} dailyLog={dailyLog} sleepLog={sleepLog} />}
        {tab === "daily"   && <DailyTab   dailyLog={dailyLog} setDailyLog={setDailyLog} persist={persist} history={history} sleepLog={sleepLog} />}
        {tab === "sleep"   && <SleepTab   sleepLog={sleepLog} setSleepLog={setSleepLog} persist={persist} history={history} dailyLog={dailyLog} />}
      </div>
    </>
  );
}
