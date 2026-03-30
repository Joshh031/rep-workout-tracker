import { useState, useRef, useEffect } from “react”;

const EXERCISE_DB = {
chest:     { staples: [“Bench Press”, “Incline Bench”, “Cable Fly”, “Dumbbell Press”, “Push-Up”], alternatives: [“Decline Bench”, “Pec Deck”, “Landmine Press”, “Dips”, “Cable Crossover”, “Chest Pullover”, “Floor Press”, “Svend Press”] },
back:      { staples: [“Pull-Up”, “Barbell Row”, “Lat Pulldown”, “Seated Cable Row”, “Face Pull”, “Shrugs”], alternatives: [“T-Bar Row”, “Single-Arm DB Row”, “Meadows Row”, “Chest-Supported Row”, “Straight-Arm Pulldown”, “Rack Pull”, “Good Morning”, “Reverse Fly”] },
legs:      { staples: [“Squat”, “Romanian Deadlift”, “Leg Press”, “Leg Curl”, “Calf Raise”], alternatives: [“Hack Squat”, “Bulgarian Split Squat”, “Leg Extension”, “Walking Lunge”, “Box Jump”, “Sumo Deadlift”, “Hip Thrust”, “Goblet Squat”] },
shoulders: { staples: [“Overhead Press”, “Lateral Raise”, “Front Raise”, “Rear Delt Fly”, “Arnold Press”, “Rear Delts”, “Shrugs”], alternatives: [“Cable Lateral Raise”, “Face Pull”, “Upright Row”, “Shrug”, “Landmine Press”, “Cuban Press”, “Behind-Neck Press”, “Plate Raise”] },
biceps:    { staples: [“Barbell Curl”, “Hammer Curl”, “Incline Curl”, “Cable Curl”, “Concentration Curl”], alternatives: [“Preacher Curl”, “Spider Curl”, “Zottman Curl”, “21s”, “Cross-Body Curl”, “Chin-Up”, “Reverse Curl”, “Rope Hammer Curl”] },
triceps:   { staples: [“Skull Crusher”, “Tricep Pushdown”, “Overhead Extension”, “Dips”, “Close-Grip Bench”], alternatives: [“Diamond Push-Up”, “Kickback”, “JM Press”, “Tate Press”, “Cable Overhead Extension”, “Single-Arm Pushdown”, “Board Press”, “Rolling DB Extension”] },
};

const STRETCHES = [
{ key: “calves”,     label: “Calves”,     duration: 180, icon: “◎”, tip: “Lean into wall, heel flat on floor” },
{ key: “quads”,      label: “Quads”,      duration: 180, icon: “◈”, tip: “Standing, pull foot to glute” },
{ key: “hamstrings”, label: “Hamstrings”, duration: 180, icon: “◇”, tip: “Seated forward fold, reach for toes” },
{ key: “hips”,       label: “Hips”,       duration: 180, icon: “◉”, tip: “Pigeon pose or figure-4” },
];

const WORKOUT_TYPES = [“run”, “chest”, “legs”, “shoulders”, “back”, “biceps”, “triceps”];
const ICON = { run: “⚡”, chest: “💪”, legs: “🦵”, shoulders: “🏋️”, back: “🔱”, biceps: “💥”, triceps: “⚙️” };

function scoreColor(s) {
if (!s) return “#444”;
const n = parseInt(s);
if (n >= 85) return “#3a9e4f”;
if (n >= 70) return “#c49a1a”;
return “#c0392b”;
}
function scoreLabel(s) {
const n = parseInt(s);
if (n >= 85) return “OPTIMAL”;
if (n >= 70) return “GOOD”;
if (n >= 55) return “FAIR”;
return “LOW”;
}

// ── Shared styles ──────────────────────────────────────────────────────────
const g = {
page:     { padding: “24px 16px 0” },
label:    { fontSize: 9, letterSpacing: 4, textTransform: “uppercase”, color: “#888”, marginBottom: 12, marginTop: 0, display: “block” },
card:     { background: “#141414”, border: “1px solid #1e1e1e”, borderRadius: 10, marginBottom: 10, overflow: “hidden” },
input:    { background: “#0f0f0f”, border: “1px solid #252525”, color: “#e8e0d5”, padding: “10px 12px”, borderRadius: 6, fontSize: 14, fontFamily: “‘DM Mono’, monospace”, width: “100%”, boxSizing: “border-box”, outline: “none” },
numInput: { background: “#0f0f0f”, border: “1px solid #252525”, color: “#e8e0d5”, padding: “9px 6px”, borderRadius: 5, fontSize: 14, fontFamily: “‘DM Mono’, monospace”, width: “100%”, boxSizing: “border-box”, textAlign: “center”, outline: “none” },
primary:  { background: “#ff4d00”, border: “none”, color: “#fff”, padding: “14px 20px”, borderRadius: 8, cursor: “pointer”, fontFamily: “‘DM Mono’, monospace”, fontSize: 11, letterSpacing: 3, textTransform: “uppercase”, width: “100%”, marginBottom: 10, display: “block” },
ghost:    { background: “none”, border: “1px solid #252525”, color: “#666”, padding: “7px 12px”, borderRadius: 5, cursor: “pointer”, fontFamily: “‘DM Mono’, monospace”, fontSize: 10, letterSpacing: 2, textTransform: “uppercase” },
altBtn:   { background: “#191919”, border: “1px solid #252525”, color: “#bbb”, padding: “9px 12px”, borderRadius: 5, cursor: “pointer”, fontSize: 11, fontFamily: “‘DM Mono’, monospace”, display: “block”, width: “100%”, textAlign: “left”, marginBottom: 6 },
badge:    { background: “#1e1e1e”, color: “#888”, fontSize: 9, letterSpacing: 2, textTransform: “uppercase”, padding: “3px 8px”, borderRadius: 3, border: “1px solid #252525” },
};

const Bar = ({ value, max, color = “#ff4d00” }) => (

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
<div style={{ background: completed ? “#0b180b” : “#141414”, border: `1px solid ${completed ? "#1a4020" : running ? "#ff4d00" : "#1e1e1e"}`, borderRadius: 10, padding: “14px 16px”, display: “flex”, alignItems: “center”, gap: 14, transition: “all 0.3s” }}>
<div style={{ position: “relative”, width: 58, height: 58, flexShrink: 0 }}>
<svg width=“58” height=“58” style={{ transform: “rotate(-90deg)” }}>
<circle cx="29" cy="29" r="26" fill="none" stroke="#1e1e1e" strokeWidth="3.5" />
<circle cx=“29” cy=“29” r=“26” fill=“none” stroke={completed ? “#3a9e4f” : running ? “#ff4d00” : “#2a2a2a”} strokeWidth=“3.5” strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap=“round” style={{ transition: “stroke-dashoffset 1s linear” }} />
</svg>
<div style={{ position: “absolute”, inset: 0, display: “flex”, alignItems: “center”, justifyContent: “center”, fontSize: completed ? 18 : 10, color: completed ? “#3a9e4f” : running ? “#ff4d00” : “#555”, fontFamily: “‘DM Mono’, monospace”, fontWeight: 700 }}>
{completed ? “✓” : `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`}
</div>
</div>
<div style={{ flex: 1 }}>
<div style={{ fontSize: 12, letterSpacing: 2, textTransform: “uppercase”, color: completed ? “#3a9e4f” : “#ccc”, marginBottom: 3, fontWeight: 600 }}>{stretch.label}</div>
<div style={{ fontSize: 10, color: “#777”, marginBottom: 10 }}>{stretch.tip}</div>
<div style={{ display: “flex”, gap: 7 }}>
{!completed && <button onClick={() => setRunning(r => !r)} style={{ …g.ghost, background: running ? “none” : “#ff4d00”, borderColor: running ? “#252525” : “#ff4d00”, color: running ? “#666” : “#fff”, fontSize: 9, padding: “5px 12px” }}>{running ? “PAUSE” : timeLeft < stretch.duration ? “RESUME” : “START”}</button>}
{timeLeft < stretch.duration && !completed && <button onClick={reset} style={{ …g.ghost, fontSize: 9, padding: “5px 10px” }}>↺</button>}
{!completed && <button onClick={onComplete} style={{ …g.ghost, borderColor: “#1a4020”, color: “#3a9e4f”, fontSize: 9, padding: “5px 10px” }}>DONE</button>}
</div>
</div>
</div>
);
}

// ── VOICE DICTATION ────────────────────────────────────────────────────────
function VoiceFill({ tab, onFill }) {
const [listening, setListening] = useState(false);
const [transcript, setTranscript] = useState(””);
const [parsing, setParsing] = useState(false);
const [status, setStatus] = useState(””);
const [mode, setMode] = useState(tab === “sleep” ? “text” : “voice”); // default to text for sleep
const [textInput, setTextInput] = useState(””);
const [imagePreview, setImagePreview] = useState(null);
const fileInputRef = useRef(null);
const recRef = useRef(null);

const startListening = () => {
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) { setStatus(“error”); setTranscript(“Speech recognition not supported in this browser.”); return; }
const rec = new SR();
rec.lang = “en-US”;
rec.continuous = false;
rec.interimResults = false;
recRef.current = rec;
rec.onstart = () => { setListening(true); setStatus(“listening”); setTranscript(””); };
rec.onresult = (e) => {
const text = e.results[0][0].transcript;
setTranscript(text);
parseWithClaude(text);
};
rec.onerror = () => { setListening(false); setStatus(“error”); };
rec.onend = () => setListening(false);
rec.start();
};

const stopListening = () => {
recRef.current?.stop();
setListening(false);
};

const parseWithClaude = async (text) => {
setParsing(true);
setStatus(“parsing”);
const prompts = {
daily: `Extract daily fitness data from this text and return ONLY valid JSON with these optional fields: {"steps": number, "crunches": number, "planks": number, "pushups": number, "stretches": ["calves"|"quads"|"hamstrings"|"hips"]} Accept any natural format like "100 crunches", "did 3 planks", "50 push-ups", "8500 steps", "stretched calves and quads", "did all stretches". If they mention all stretches or full stretch routine, include all four: ["calves","quads","hamstrings","hips"]. Text: "${text}" Return only JSON, no explanation.`,
sleep: `Extract Oura sleep/recovery data from this text and return ONLY valid JSON with these optional fields:
{“sleepScore”: number, “readiness”: number, “hoursSlept”: string, “rem”: string, “heartRate”: number, “hrv”: number, “respiratoryRate”: number}

Rules:

- hoursSlept and rem: convert any format to H:MM (e.g. “6h 3m” → “6:03”, “1h 7m” → “1:07”, “6:12” stays “6:12”)
- sleepScore: look for “sleep score”, “sleep 78”, or just a number near “sleep”
- readiness: look for “readiness”, “ready”, “readiness score”
- heartRate: look for “HR”, “heart rate”, “resting HR”, “resting heart rate”
- hrv: look for “HRV”
- respiratoryRate: look for “resp”, “respiratory”, “breathing”
- Accept any order, any abbreviation, any format

Examples that should all work:
“sleep 78 ready 72 hrv 44 hr 51 6:03 sleep 1:07 rem resp 15.1”
“Sleep score 78, Readiness 72, HRV 44, HR 51, 6h 3m total, 1h 7m REM, resp 15.1”
“78/72 hrv44 hr51 6h3m 1h7m rem”

Text: “${text}”
Return only JSON, no explanation.`, workout: `Parse this workout log into JSON. Return ONLY valid JSON, no explanation, no markdown.
Format: {“exercises”: [{“name”: string, “sets”: [{“reps”: number, “weight”: number}]}]}
For a line like “4x8x315” create 4 sets each with reps=8 weight=315.
For “1x8x225” create 1 set with reps=8 weight=225.
Group sets under the exercise name that appears above them.

Workout log:
${text}

Return only the JSON object.`
};
try {
const res = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: { “Content-Type”: “application/json”, “x-api-key”: ANTHROPIC_KEY, “anthropic-version”: “2023-06-01”, “anthropic-dangerous-direct-browser-access”: “true” },
body: JSON.stringify({
model: “claude-sonnet-4-20250514”,
max_tokens: 1500,
messages: [{ role: “user”, content: prompts[tab] }]
})
});
const data = await res.json();
const raw = data.content?.[0]?.text || “{}”;
const clean = raw.replace(/`json|`/g, “”).trim();
const parsed = JSON.parse(clean);
onFill(parsed);
setStatus(“done”);
} catch(e) {
setStatus(“error”);
}
setParsing(false);
};

const parseWithImage = async (base64Data, mediaType) => {
setParsing(true);
setStatus(“parsing”);
const imagePrompt = tab === “sleep”
? `This is a screenshot from the Oura Ring app showing sleep and recovery data. Extract all visible metrics and return ONLY valid JSON: {"sleepScore": number, "readiness": number, "hoursSlept": string, "rem": string, "heartRate": number, "hrv": number, "respiratoryRate": number} hoursSlept and rem should be in H:MM format (e.g. "6:12", "1:24"). Return only JSON, no explanation.`
: `Extract any fitness or health data visible in this screenshot and return ONLY valid JSON. Return only JSON, no explanation.`;
try {
const res = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: { “Content-Type”: “application/json”, “x-api-key”: ANTHROPIC_KEY, “anthropic-version”: “2023-06-01”, “anthropic-dangerous-direct-browser-access”: “true” },
body: JSON.stringify({
model: “claude-sonnet-4-20250514”,
max_tokens: 500,
messages: [{ role: “user”, content: [
{ type: “image”, source: { type: “base64”, media_type: mediaType, data: base64Data } },
{ type: “text”, text: imagePrompt }
]}]
})
});
const data = await res.json();
const raw = data.content?.[0]?.text || “{}”;
const clean = raw.replace(/`json|`/g, “”).trim();
const parsed = JSON.parse(clean);
onFill(parsed);
setStatus(“done”);
} catch(e) {
setStatus(“error”);
}
setParsing(false);
};

const handleImageSelect = (e) => {
const file = e.target.files?.[0];
if (!file) return;
const mediaType = file.type || “image/jpeg”;
const reader = new FileReader();
reader.onload = (ev) => {
const base64 = ev.target.result.split(”,”)[1];
setImagePreview(ev.target.result);
parseWithImage(base64, mediaType);
};
reader.readAsDataURL(file);
};

const statusColors = { listening: “#ff4d00”, parsing: “#c49a1a”, done: “#3a9e4f”, error: “#c0392b” };
const statusLabels = { listening: “● LISTENING…”, parsing: “⟳ PARSING…”, done: “✓ FIELDS FILLED”, error: “✕ TRY AGAIN” };

const modes = tab === “sleep”
? [“voice”, “text”, “image”]
: [“voice”, “text”];

return (
<div style={{ …g.card, padding: “12px 14px”, marginBottom: 14 }}>
{/* Mode toggle */}
<div style={{ display: “flex”, gap: 6, marginBottom: 10 }}>
{modes.map(m => (
<button key={m} onClick={() => { setMode(m); setStatus(””); setTranscript(””); setTextInput(””); setImagePreview(null); }}
style={{ padding: “4px 10px”, borderRadius: 4, border: `1px solid ${mode === m ? "#ff4d00" : "#252525"}`, background: mode === m ? “#1c1008” : “none”, color: mode === m ? “#ff4d00” : “#555”, fontSize: 8, letterSpacing: 2, textTransform: “uppercase”, cursor: “pointer”, fontFamily: “‘DM Mono’, monospace” }}>
{m === “voice” ? “🎙 VOICE” : m === “text” ? “✏ TYPE” : “📷 IMAGE”}
</button>
))}
</div>

```
  {mode === "voice" && (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        onClick={listening ? stopListening : startListening}
        style={{
          width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
          background: listening ? "#ff4d00" : "#1a1a1a",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          boxShadow: listening ? "0 0 0 6px rgba(255,77,0,0.15)" : "none",
          transition: "all 0.3s"
        }}>
        <span style={{ fontSize: 20 }}>{listening ? "⏹" : "🎙️"}</span>
      </button>
      <div style={{ flex: 1 }}>
        {!status && <span style={{ fontSize: 9, letterSpacing: 3, color: "#555", textTransform: "uppercase" }}>Tap to dictate</span>}
        {status && <span style={{ fontSize: 9, letterSpacing: 2, color: statusColors[status], textTransform: "uppercase" }}>{statusLabels[status]}</span>}
        {transcript && <div style={{ fontSize: 10, color: "#666", marginTop: 4, lineHeight: 1.5 }}>"{transcript}"</div>}
      </div>
      {status && <button onClick={() => { setStatus(""); setTranscript(""); }} style={{ ...g.ghost, fontSize: 9, padding: "4px 8px" }}>✕</button>}
    </div>
  )}

  {mode === "text" && (
    <div>
      <textarea
        placeholder={tab === "workout"
          ? "e.g.\nOverhead Press 4x8 @ 135\nTricep Pulldown 4x8 @ 57.5\nDips 4x8 @ 175"
          : tab === "sleep"
          ? "e.g.\nsleep 78 ready 72 hrv 44 hr 51\n6:03 sleep  1:07 rem  resp 15.1\n\nAny format works — any order"
          : "e.g.\n100 crunches, 3 planks, 50 push-ups\n8500 steps\nstretched calves and quads"}
        value={textInput}
        onChange={e => setTextInput(e.target.value)}
        style={{ ...g.input, width: "100%", minHeight: 90, resize: "vertical", fontSize: 11, lineHeight: 1.6, padding: "10px", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        <button
          onPointerDown={e => e.preventDefault()}
          onClick={() => { if (textInput.trim()) parseWithClaude(textInput.trim()); }}
          disabled={parsing || !textInput.trim()}
          style={{ ...g.primary, padding: "9px 16px", fontSize: 9, letterSpacing: 2, flex: 1, opacity: textInput.trim() ? 1 : 0.4 }}>
          {parsing ? "⟳ PARSING…" : "AUTO-FILL ✦"}
        </button>
        {status && <span style={{ fontSize: 9, color: statusColors[status], letterSpacing: 1 }}>{statusLabels[status]}</span>}
        {status && <button onClick={() => { setStatus(""); setTextInput(""); }} style={{ ...g.ghost, fontSize: 9, padding: "4px 8px" }}>✕</button>}
      </div>
    </div>
  )}

  {mode === "image" && (
    <div>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />
      {!imagePreview && !parsing && (
        <button onClick={() => fileInputRef.current?.click()}
          style={{ ...g.card, width: "100%", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", border: "1px dashed #252525", background: "#0a0a0a" }}>
          <span style={{ fontSize: 28 }}>📷</span>
          <span style={{ fontSize: 9, color: "#555", letterSpacing: 2, textTransform: "uppercase" }}>Tap to select Oura screenshot</span>
          <span style={{ fontSize: 8, color: "#333" }}>Sleep summary, readiness, or full report</span>
        </button>
      )}
      {imagePreview && (
        <div style={{ position: "relative", marginBottom: 8 }}>
          <img src={imagePreview} alt="Oura screenshot" style={{ width: "100%", borderRadius: 6, opacity: parsing ? 0.4 : 1 }} />
          {!parsing && <button onClick={() => { setImagePreview(null); setStatus(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
            style={{ position: "absolute", top: 6, right: 6, background: "#0a0a0a", border: "1px solid #252525", color: "#888", borderRadius: 4, padding: "3px 7px", cursor: "pointer", fontSize: 10 }}>✕</button>}
        </div>
      )}
      {parsing && (
        <div style={{ textAlign: "center", padding: "12px 0", fontSize: 9, color: "#c49a1a", letterSpacing: 2 }}>⟳ READING IMAGE…</div>
      )}
      {status === "done" && (
        <div style={{ fontSize: 9, color: "#3a9e4f", letterSpacing: 1, textAlign: "center", marginTop: 6 }}>✓ FIELDS FILLED</div>
      )}
      {status === "error" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 9, color: "#c0392b" }}>✕ Couldn't read image — try TYPE mode</span>
          <button onClick={() => { setImagePreview(null); setStatus(""); }} style={{ ...g.ghost, fontSize: 9, padding: "3px 7px" }}>↺</button>
        </div>
      )}
    </div>
  )}
</div>
```

);
}

// ── QUICK FILL BAR ─────────────────────────────────────────────────────────
function QuickFillBar({ onApply }) {
const [sets, setSets] = useState(””);
const [reps, setReps] = useState(””);
const [weight, setWeight] = useState(””);
const [applied, setApplied] = useState(false);
const onApplyRef = useRef(onApply);
useEffect(() => { onApplyRef.current = onApply; });

const apply = () => {
const n = Math.max(1, parseInt(sets) || 1);
onApplyRef.current(n, reps, weight);
setApplied(true);
setSets(””); setReps(””); setWeight(””);
setTimeout(() => setApplied(false), 2000);
};

return (
<div style={{ background: “#0e0e0e”, border: “1px solid #1a1a1a”, borderRadius: 6, padding: “10px 10px”, marginBottom: 12 }}>
<div style={{ fontSize: 8, letterSpacing: 3, color: “#555”, textTransform: “uppercase”, marginBottom: 8 }}>Quick Fill</div>
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr 1fr auto”, gap: 6, alignItems: “flex-end” }}>
<div>
<div style={{ fontSize: 7, color: “#555”, letterSpacing: 2, textTransform: “uppercase”, marginBottom: 4 }}>Sets</div>
<input style={{ …g.numInput, fontSize: 13 }} type=“number” placeholder=“4” min=“1” max=“20”
value={sets} onChange={e => { setSets(e.target.value); setApplied(false); }}
onBlur={e => setSets(e.target.value)} />
</div>
<div>
<div style={{ fontSize: 7, color: “#555”, letterSpacing: 2, textTransform: “uppercase”, marginBottom: 4 }}>Reps</div>
<input style={{ …g.numInput, fontSize: 13 }} type=“number” placeholder=“8”
value={reps} onChange={e => { setReps(e.target.value); setApplied(false); }}
onBlur={e => setReps(e.target.value)} />
</div>
<div>
<div style={{ fontSize: 7, color: “#555”, letterSpacing: 2, textTransform: “uppercase”, marginBottom: 4 }}>Lbs</div>
<input style={{ …g.numInput, fontSize: 13 }} type=“number” placeholder=“135”
value={weight} onChange={e => { setWeight(e.target.value); setApplied(false); }}
onBlur={e => setWeight(e.target.value)} />
</div>
<button onPointerDown={e => e.preventDefault()} onClick={apply} style={{
background: applied ? “#0b180b” : “#ff4d00”,
border: applied ? “1px solid #1a4020” : “none”,
color: applied ? “#3a9e4f” : “#fff”,
padding: “0 10px”, borderRadius: 5, cursor: “pointer”,
fontFamily: “‘DM Mono’, monospace”, fontSize: 9,
height: 36, whiteSpace: “nowrap”, transition: “all 0.2s”
}}>
{applied ? “✓” : “FILL”}
</button>
</div>
</div>
);
}

// ── WORKOUT TAB ────────────────────────────────────────────────────────────
function WorkoutTab({ history, setHistory, saveEntry, deleteEntry, dailyLog, setDailyLog, saveDailyEntry, sleepLog, needsReminder, needsDailyLog, needsStretches, onGoToDaily }) {
const [mode, setMode] = useState(“pick”); // pick | preview | log
const [workoutType, setWorkoutType] = useState(null);
const [exercises, setExercises] = useState([]);
const [runData, setRunData] = useState({ distance: “”, duration: “”, firstStop: “”, pace: “”, heartRate: “”, maxSpeed: “” });
const [showAlts, setShowAlts] = useState(null);
const [saved, setSaved] = useState(false);
const [draftId] = useState(() => “draft_” + Date.now());
const [completionModal, setCompletionModal] = useState(null); // { todayVol, lastVol, lastDate, prs }
const [postWorkoutDaily, setPostWorkoutDaily] = useState({ crunches: “”, planks: “”, pushups: “” });
const [postStretch, setPostStretch] = useState({});
const autoSaveTimer = useRef(null);

// Auto-save draft to localStorage whenever exercises change
useEffect(() => {
if (mode !== “log” || !workoutType || workoutType === “run”) return;
clearTimeout(autoSaveTimer.current);
autoSaveTimer.current = setTimeout(() => {
const draft = { workoutType, exercises, savedAt: new Date().toISOString() };
localStorage.setItem(“rep_draft”, JSON.stringify(draft));
}, 800);
}, [exercises, mode, workoutType]);

// Restore draft on mount if one exists
const [showDraftBanner, setShowDraftBanner] = useState(false);
const [pendingDraft, setPendingDraft] = useState(null);
useEffect(() => {
const raw = localStorage.getItem(“rep_draft”);
if (raw) {
try {
const draft = JSON.parse(raw);
if (draft.exercises?.length > 0) {
setPendingDraft(draft);
setShowDraftBanner(true);
}
} catch(e) {}
}
}, []);

const restoreDraft = () => {
if (!pendingDraft) return;
setWorkoutType(pendingDraft.workoutType);
setExercises(pendingDraft.exercises);
setMode(“log”);
setShowDraftBanner(false);
};

const discardDraft = () => {
localStorage.removeItem(“rep_draft”);
setShowDraftBanner(false);
setPendingDraft(null);
};

const getLastSession = (type) => history.find(h => h.type === type) || null;

const startWorkout = (type) => {
setWorkoutType(type);
if (type !== “run”) setExercises(EXERCISE_DB[type].staples.map(n => ({ name: n, sets: [{ reps: “”, weight: “” }] })));
else setRunData({ distance: “”, duration: “”, firstStop: “”, pace: “”, heartRate: “”, maxSpeed: “” });
setMode(“preview”);
setSaved(false);
localStorage.removeItem(“rep_draft”);
};

const launchWorkout = () => setMode(“log”);

const [workoutDate, setWorkoutDate] = useState(() => new Date().toLocaleDateString(“en-CA”));

const addSet = (i) => setExercises(prev => prev.map((ex, idx) => idx === i ? { …ex, sets: […ex.sets, { reps: “”, weight: “” }] } : ex));
const updateSet = (i, j, f, v) => setExercises(prev => prev.map((ex, idx) => idx !== i ? ex : { …ex, sets: ex.sets.map((s, si) => si !== j ? s : { …s, [f]: v }) }));
const updateName = (i, v) => { const u = […exercises]; u[i].name = v; setExercises(u); };
const removeExercise = (i) => setExercises(exercises.filter((_, idx) => idx !== i));
const replaceWithAlt = (i, name) => { const u = […exercises]; u[i].name = name; setExercises(u); setShowAlts(null); };

const saveWorkout = async () => {
const displayDate = new Date(workoutDate + “T12:00:00”).toLocaleDateString();
const entry = { id: Date.now(), date: displayDate, type: workoutType, …(workoutType === “run” ? { runData } : { exercises }) };

```
// Build completion stats for modal
if (workoutType !== "run" && exercises.length) {
  const lastSession = getLastSession(workoutType);
  const calcVol = (exList) => (exList || []).reduce((a, ex) =>
    a + ex.sets.filter(s => s.reps || s.weight).reduce((b, s) =>
      b + (parseFloat(s.weight)||0) * (parseFloat(s.reps)||0), 0), 0);
  const todayVol = calcVol(exercises);
  const lastVol = lastSession ? calcVol(lastSession.exercises) : 0;

  // Find PRs
  const prs = [];
  exercises.forEach(ex => {
    const todayMax = Math.max(0, ...ex.sets.filter(s => s.weight).map(s => parseFloat(s.weight)||0));
    if (!todayMax) return;
    let prevMax = 0;
    history.forEach(session => {
      (session.exercises || []).forEach(pex => {
        if (pex.name?.toLowerCase() === ex.name?.toLowerCase()) {
          const m = Math.max(0, ...pex.sets.filter(s => s.weight).map(s => parseFloat(s.weight)||0));
          if (m > prevMax) prevMax = m;
        }
      });
    });
    if (todayMax > prevMax && prevMax > 0) prs.push({ name: ex.name, weight: todayMax, prev: prevMax });
  });
  setCompletionModal({
    todayVol, lastVol, lastDate: lastSession?.date, prs, type: workoutType,
    saveDaily: async (dailyData, stretches) => {
      const today = new Date().toLocaleDateString();
      const entry = { id: Date.now(), date: today, ...dailyData, stretches: Object.keys(stretches).filter(k => stretches[k]) };
      setDailyLog(prev => [entry, ...prev]);
      await saveDailyEntry(entry);
    }
  });
}

const newH = [entry, ...history];
setHistory(newH);
await saveEntry(entry);
localStorage.removeItem("rep_draft");
setSaved(true);
```

};

const deleteWorkout = async (id) => {
await deleteEntry(id);
};

const totalSets = exercises.reduce((a, e) => a + e.sets.filter(s => s.reps || s.weight).length, 0);

// Find last time each exercise was performed
const getLastPerformance = (exName) => {
if (!exName) return null;
const name = exName.trim().toLowerCase();
for (const session of history) {
if (!session.exercises) continue;
const match = session.exercises.find(e => e.name?.trim().toLowerCase() === name);
if (match && match.sets?.length) {
// Find best set (highest weight with reps)
const filledSets = match.sets.filter(s => s.reps || s.weight);
if (!filledSets.length) continue;
const best = filledSets.reduce((a, b) => {
const wa = parseFloat(a.weight) || 0, wb = parseFloat(b.weight) || 0;
const ra = parseFloat(a.reps) || 0, rb = parseFloat(b.reps) || 0;
return (wb * rb) >= (wa * ra) ? b : a;
});
const totalVol = filledSets.reduce((a, s) => a + ((parseFloat(s.weight)||0) * (parseFloat(s.reps)||0)), 0);
return { weight: best.weight, reps: best.reps, sets: filledSets.length, totalVol, date: session.date };
}
}
return null;
};
const lastRun = history.find(h => h.type === “run”);

if (mode === “pick”) return (
<div style={g.page}>
{showDraftBanner && pendingDraft && (
<div style={{ background: “#0d1f0d”, border: “1px solid #1a4020”, borderRadius: 8, padding: “12px 14px”, marginBottom: 16 }}>
<div style={{ fontSize: 9, letterSpacing: 2, color: “#3a9e4f”, textTransform: “uppercase”, marginBottom: 6 }}>◉ Unsaved Workout Found</div>
<div style={{ fontSize: 11, color: “#888”, marginBottom: 10 }}>
{pendingDraft.workoutType} · {pendingDraft.exercises?.reduce((a, e) => a + e.sets.filter(s => s.reps || s.weight).length, 0)} sets logged · {new Date(pendingDraft.savedAt).toLocaleTimeString([], { hour: “2-digit”, minute: “2-digit” })}
</div>
<div style={{ display: “flex”, gap: 8 }}>
<button onClick={restoreDraft} style={{ …g.primary, flex: 2, padding: “9px 0”, fontSize: 9 }}>↺ RESTORE</button>
<button onClick={discardDraft} style={{ …g.ghost, flex: 1, padding: “9px 0”, fontSize: 9, color: “#555” }}>DISCARD</button>
</div>
</div>
)}
<WhatsNext history={history} onSelect={(type) => startWorkout(type)} />

```
  {needsReminder && (
    <div onClick={onGoToDaily} style={{ background: "#1a0d00", border: "1px solid #3a1a00", borderRadius: 8, padding: "10px 14px", marginBottom: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 8, letterSpacing: 2, color: "#ff4d00", textTransform: "uppercase", marginBottom: 3 }}>● Today's Log Incomplete</div>
        <div style={{ fontSize: 9, color: "#666" }}>
          {[needsDailyLog && "crunches", needsStretches && "stretches"].filter(Boolean).join(" + ")} not logged yet
        </div>
      </div>
      <span style={{ fontSize: 11, color: "#ff4d00" }}>→</span>
    </div>
  )}

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
            {h.exercises && <span style={{ fontSize: 10, color: "#888" }}>{h.exercises.reduce((a, e) => a + e.sets.length, 0)} sets</span>}
            {h.type === "run" && h.runData?.distance && <span style={{ fontSize: 10, color: "#888" }}>{h.runData.distance} mi</span>}
            <button onClick={() => deleteWorkout(h.id)} style={{ background: "none", border: "1px solid #252525", color: "#888", padding: "3px 7px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>✕</button>
          </div>
        </div>
      ))}
    </>
  )}
</div>
```

);

// ── Preview mode ──
if (mode === “preview”) {
const lastSession = getLastSession(workoutType);
const lastExercises = lastSession?.exercises || [];
return (
<div style={g.page}>
{/* Completion modal overlay */}
{completionModal && (
<div style={{ position: “fixed”, inset: 0, background: “rgba(0,0,0,0.85)”, zIndex: 100, display: “flex”, alignItems: “center”, justifyContent: “center”, padding: 20 }}>
<div style={{ background: “#111”, border: “1px solid #1e1e1e”, borderRadius: 12, padding: “24px 20px”, width: “100%”, maxWidth: 380 }}>
<div style={{ fontSize: 10, letterSpacing: 3, color: “#ff4d00”, textTransform: “uppercase”, marginBottom: 16 }}>✓ Session Complete</div>
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr”, gap: 10, marginBottom: 16 }}>
<div style={{ …g.card, padding: “12px”, textAlign: “center” }}>
<div style={{ fontSize: 18, fontWeight: 700, color: “#e8e0d5”, fontFamily: “‘DM Mono’, monospace” }}>{Math.round(completionModal.todayVol).toLocaleString()}</div>
<div style={{ fontSize: 7, color: “#555”, letterSpacing: 2, marginTop: 3 }}>TODAY LBS</div>
</div>
<div style={{ …g.card, padding: “12px”, textAlign: “center” }}>
<div style={{ fontSize: 18, fontWeight: 700, color: completionModal.todayVol >= completionModal.lastVol ? “#3a9e4f” : “#c0392b”, fontFamily: “‘DM Mono’, monospace” }}>
{completionModal.lastVol ? `${completionModal.todayVol >= completionModal.lastVol ? "+" : ""}${Math.round(((completionModal.todayVol - completionModal.lastVol) / completionModal.lastVol) * 100)}%` : “—”}
</div>
<div style={{ fontSize: 7, color: “#555”, letterSpacing: 2, marginTop: 3 }}>VS LAST · {completionModal.lastDate || “N/A”}</div>
</div>
</div>
{completionModal.prs.length > 0 && (
<div style={{ background: “#0a1a0a”, border: “1px solid #1a4020”, borderRadius: 8, padding: “10px 12px”, marginBottom: 16 }}>
<div style={{ fontSize: 8, letterSpacing: 2, color: “#3a9e4f”, textTransform: “uppercase”, marginBottom: 8 }}>🏆 New PRs</div>
{completionModal.prs.map((pr, i) => (
<div key={i} style={{ fontSize: 10, color: “#ccc”, marginBottom: 4 }}>
{pr.name} — <span style={{ color: “#3a9e4f”, fontWeight: 700 }}>{pr.weight} lbs</span> <span style={{ color: “#444” }}>(prev {pr.prev})</span>
</div>
))}
</div>
)}
{/* Post-workout crunches + stretches */}
<div style={{ background: “#0f0f0f”, border: “1px solid #1a1a1a”, borderRadius: 8, padding: “12px 14px”, marginBottom: 14 }}>
<div style={{ fontSize: 8, letterSpacing: 2, color: “#555”, textTransform: “uppercase”, marginBottom: 10 }}>Log Crunches & Stretches</div>
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr 1fr”, gap: 8, marginBottom: 12 }}>
{[[“crunches”,“✦”,“Crunches”],[“planks”,“◆”,“Planks”],[“pushups”,“▲”,“Push-Ups”]].map(([f,icon,lbl]) => (
<div key={f} style={{ textAlign: “center” }}>
<div style={{ fontSize: 12, marginBottom: 3 }}>{icon}</div>
<div style={{ fontSize: 7, color: “#555”, letterSpacing: 1, textTransform: “uppercase”, marginBottom: 5 }}>{lbl}</div>
<input style={{ …g.numInput, fontSize: 14 }} type=“number” placeholder=“0”
value={postWorkoutDaily[f]}
onChange={e => setPostWorkoutDaily(p => ({ …p, [f]: e.target.value }))} />
</div>
))}
</div>
<div style={{ fontSize: 8, color: “#555”, letterSpacing: 1, textTransform: “uppercase”, marginBottom: 8 }}>Stretches</div>
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr”, gap: 6 }}>
{STRETCHES.map(s => (
<button key={s.key} onClick={() => setPostStretch(p => ({ …p, [s.key]: !p[s.key] }))}
style={{ padding: “7px 8px”, borderRadius: 6, border: `1px solid ${postStretch[s.key] ? "#1a4020" : "#1e1e1e"}`, background: postStretch[s.key] ? “#0b180b” : “#141414”, color: postStretch[s.key] ? “#3a9e4f” : “#555”, fontSize: 9, fontFamily: “‘DM Mono’, monospace”, cursor: “pointer”, letterSpacing: 1 }}>
{postStretch[s.key] ? “✓ “ : “”}{s.label}
</button>
))}
</div>
</div>
<button onClick={() => {
const hasActivity = Object.values(postWorkoutDaily).some(v => v) || Object.values(postStretch).some(Boolean);
if (hasActivity && completionModal?.saveDaily) {
completionModal.saveDaily(postWorkoutDaily, postStretch);
}
setPostWorkoutDaily({ crunches: “”, planks: “”, pushups: “” });
setPostStretch({});
setCompletionModal(null);
setMode(“pick”);
}} style={{ …g.primary, marginBottom: 0 }}>DONE</button>
</div>
</div>
)}

```
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <button onClick={() => setMode("pick")} style={{ ...g.ghost, padding: "6px 10px", fontSize: 11 }}>←</button>
      <span style={{ fontSize: 16 }}>{ICON[workoutType]}</span>
      <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#888" }}>{workoutType}</span>
      {lastSession && <span style={g.badge}>{lastSession.date}</span>}
    </div>

    {!lastSession ? (
      <div style={{ ...g.card, padding: "20px", textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#555" }}>No previous {workoutType} session found.</div>
        <div style={{ fontSize: 10, color: "#333", marginTop: 4 }}>This will be your baseline.</div>
      </div>
    ) : (
      <div style={{ ...g.card, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ background: "#0f0f0f", padding: "10px 14px", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ fontSize: 8, letterSpacing: 3, color: "#555", textTransform: "uppercase" }}>Last Session · {lastSession.date}</div>
        </div>
        <div style={{ padding: "12px 14px" }}>
          {lastExercises.map((ex, i) => {
            const filled = ex.sets.filter(s => s.reps || s.weight);
            if (!filled.length) return null;
            const vol = filled.reduce((a, s) => a + (parseFloat(s.weight)||0) * (parseFloat(s.reps)||0), 0);
            const topSet = filled.reduce((a, b) => (parseFloat(b.weight)||0) > (parseFloat(a.weight)||0) ? b : a);
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, marginBottom: 8, borderBottom: i < lastExercises.length - 1 ? "1px solid #141414" : "none" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#ccc", fontWeight: 600 }}>{ex.name}</div>
                  <div style={{ fontSize: 9, color: "#555", marginTop: 2 }}>{filled.length} sets · top {topSet.reps}×{topSet.weight}lbs</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: "#444" }}>{Math.round(vol).toLocaleString()} lbs</div>
                  <div style={{ fontSize: 7, color: "#333" }}>volume</div>
                </div>
              </div>
            );
          })}
          <div style={{ borderTop: "1px solid #1e1e1e", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 9, color: "#555" }}>Total Volume</span>
            <span style={{ fontSize: 10, color: "#888", fontWeight: 700 }}>
              {Math.round(lastExercises.reduce((a, ex) => a + ex.sets.filter(s => s.reps || s.weight).reduce((b, s) => b + (parseFloat(s.weight)||0) * (parseFloat(s.reps)||0), 0), 0)).toLocaleString()} lbs
            </span>
          </div>
        </div>
      </div>
    )}

    <button onClick={launchWorkout} style={{ ...g.primary, fontSize: 11, letterSpacing: 3 }}>
      START {workoutType.toUpperCase()} →
    </button>
  </div>
);
```

}

// ── Weights log ──
if (workoutType !== “run”) {
const db = EXERCISE_DB[workoutType];
return (
<div style={g.page}>
{/* Completion modal */}
{completionModal && (
<div style={{ position: “fixed”, inset: 0, background: “rgba(0,0,0,0.88)”, zIndex: 100, display: “flex”, alignItems: “center”, justifyContent: “center”, padding: 20 }}>
<div style={{ background: “#111”, border: “1px solid #1e1e1e”, borderRadius: 12, padding: “24px 20px”, width: “100%”, maxWidth: 380 }}>
<div style={{ fontSize: 10, letterSpacing: 3, color: “#ff4d00”, textTransform: “uppercase”, marginBottom: 4 }}>✓ {completionModal.type} Complete</div>
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr”, gap: 10, marginBottom: 16, marginTop: 16 }}>
<div style={{ …g.card, padding: “12px”, textAlign: “center” }}>
<div style={{ fontSize: 18, fontWeight: 700, color: “#e8e0d5”, fontFamily: “‘DM Mono’, monospace” }}>{Math.round(completionModal.todayVol).toLocaleString()}</div>
<div style={{ fontSize: 7, color: “#555”, letterSpacing: 2, marginTop: 3 }}>TODAY LBS</div>
</div>
<div style={{ …g.card, padding: “12px”, textAlign: “center” }}>
<div style={{ fontSize: 18, fontWeight: 700, color: completionModal.lastVol ? (completionModal.todayVol >= completionModal.lastVol ? “#3a9e4f” : “#c0392b”) : “#555”, fontFamily: “‘DM Mono’, monospace” }}>
{completionModal.lastVol ? `${completionModal.todayVol >= completionModal.lastVol ? "+" : ""}${Math.round(((completionModal.todayVol - completionModal.lastVol) / completionModal.lastVol) * 100)}%` : “FIRST”}
</div>
<div style={{ fontSize: 7, color: “#555”, letterSpacing: 2, marginTop: 3 }}>VS {completionModal.lastDate || “N/A”}</div>
</div>
</div>
{completionModal.prs?.length > 0 && (
<div style={{ background: “#0a1a0a”, border: “1px solid #1a4020”, borderRadius: 8, padding: “10px 12px”, marginBottom: 16 }}>
<div style={{ fontSize: 8, letterSpacing: 2, color: “#3a9e4f”, textTransform: “uppercase”, marginBottom: 8 }}>🏆 New PRs This Session</div>
{completionModal.prs.map((pr, i) => (
<div key={i} style={{ fontSize: 10, color: “#ccc”, marginBottom: 4 }}>
{pr.name} — <span style={{ color: “#3a9e4f”, fontWeight: 700 }}>{pr.weight} lbs</span> <span style={{ color: “#444” }}>prev {pr.prev}</span>
</div>
))}
</div>
)}
{/* Post-workout crunches + stretches */}
<div style={{ background: “#0f0f0f”, border: “1px solid #1a1a1a”, borderRadius: 8, padding: “12px 14px”, marginBottom: 14 }}>
<div style={{ fontSize: 8, letterSpacing: 2, color: “#555”, textTransform: “uppercase”, marginBottom: 10 }}>Log Crunches & Stretches</div>
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr 1fr”, gap: 8, marginBottom: 12 }}>
{[[“crunches”,“✦”,“Crunches”],[“planks”,“◆”,“Planks”],[“pushups”,“▲”,“Push-Ups”]].map(([f,icon,lbl]) => (
<div key={f} style={{ textAlign: “center” }}>
<div style={{ fontSize: 12, marginBottom: 3 }}>{icon}</div>
<div style={{ fontSize: 7, color: “#555”, letterSpacing: 1, textTransform: “uppercase”, marginBottom: 5 }}>{lbl}</div>
<input style={{ …g.numInput, fontSize: 14 }} type=“number” placeholder=“0”
value={postWorkoutDaily[f]}
onChange={e => setPostWorkoutDaily(p => ({ …p, [f]: e.target.value }))} />
</div>
))}
</div>
<div style={{ fontSize: 8, color: “#555”, letterSpacing: 1, textTransform: “uppercase”, marginBottom: 8 }}>Stretches</div>
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr”, gap: 6 }}>
{STRETCHES.map(s => (
<button key={s.key} onClick={() => setPostStretch(p => ({ …p, [s.key]: !p[s.key] }))}
style={{ padding: “7px 8px”, borderRadius: 6, border: `1px solid ${postStretch[s.key] ? "#1a4020" : "#1e1e1e"}`, background: postStretch[s.key] ? “#0b180b” : “#141414”, color: postStretch[s.key] ? “#3a9e4f” : “#555”, fontSize: 9, fontFamily: “‘DM Mono’, monospace”, cursor: “pointer”, letterSpacing: 1 }}>
{postStretch[s.key] ? “✓ “ : “”}{s.label}
</button>
))}
</div>
</div>
<button onClick={() => {
const hasActivity = Object.values(postWorkoutDaily).some(v => v) || Object.values(postStretch).some(Boolean);
if (hasActivity && completionModal?.saveDaily) {
completionModal.saveDaily(postWorkoutDaily, postStretch);
}
setPostWorkoutDaily({ crunches: “”, planks: “”, pushups: “” });
setPostStretch({});
setCompletionModal(null);
setMode(“pick”);
}} style={{ …g.primary, marginBottom: 0 }}>DONE</button>
</div>
</div>
)}

```
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <button onClick={() => setMode("pick")} style={{ ...g.ghost, padding: "6px 10px", fontSize: 11 }}>←</button>
      <span style={{ fontSize: 16 }}>{ICON[workoutType]}</span>
      <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#888" }}>{workoutType}</span>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        <input type="date" value={workoutDate} onChange={e => setWorkoutDate(e.target.value)}
          style={{ background: workoutDate !== new Date().toLocaleDateString("en-CA") ? "#1a0d00" : "#141414", border: `1px solid ${workoutDate !== new Date().toLocaleDateString("en-CA") ? "#ff4d00" : "#252525"}`, color: workoutDate !== new Date().toLocaleDateString("en-CA") ? "#ff4d00" : "#666", borderRadius: 5, padding: "4px 6px", fontSize: 10, fontFamily: "'DM Mono', monospace", cursor: "pointer" }} />
        <span style={{ fontSize: 11, color: totalSets >= 20 ? "#ff4d00" : "#fff", letterSpacing: 2, fontWeight: 700 }}>{totalSets}/20</span>
        <div style={{ width: 60 }}><Bar value={totalSets} max={20} /></div>
        <span style={{ fontSize: 7, color: "#2a4a2a", letterSpacing: 1 }}>● AUTO</span>
      </div>
    </div>

    <VoiceFill tab="workout" onFill={(parsed) => {
      if (parsed.exercises?.length) {
        setExercises(parsed.exercises.map(e => ({
          name: e.name || "",
          sets: e.sets?.length ? e.sets.map(s => ({ reps: String(s.reps || ""), weight: String(s.weight || "") })) : [{ reps: "", weight: "" }]
        })));
      }
    }} />

    {exercises.map((ex, i) => (
      <div key={i} style={g.card}>
        <div style={{ background: "#191919", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e1e1e" }}>
          <input style={{ ...g.input, padding: "4px 0", background: "none", border: "none", fontSize: 12, fontWeight: 700, letterSpacing: 1, flex: 1, color: "#ddd" }}
            value={ex.name} onChange={e => updateName(i, e.target.value)} placeholder="Exercise…" />
          <div style={{ display: "flex", gap: 6, marginLeft: 10 }}>
            <button style={{ ...g.ghost, padding: "3px 8px", fontSize: 9 }} onClick={() => setShowAlts(showAlts === i ? null : i)}>SWAP</button>
            <button style={{ ...g.ghost, padding: "3px 8px", fontSize: 9, color: "#888" }} onClick={() => removeExercise(i)}>✕</button>
          </div>
        </div>

        {showAlts === i && (
          <div style={{ padding: "12px 14px", background: "#0e0e0e", borderBottom: "1px solid #1e1e1e" }}>
            <span style={{ ...g.label, marginBottom: 8 }}>Alternatives</span>
            {db.alternatives.map(a => <button key={a} style={g.altBtn} onClick={() => replaceWithAlt(i, a)}>+ {a}</button>)}
          </div>
        )}

        <div style={{ padding: "11px 14px" }}>
          <QuickFillBar onApply={(numSets, reps, weight) => {
            const addedSets = Array.from({ length: numSets }, () => ({ reps, weight }));
            setExercises(prev => prev.map((ex2, idx2) => {
              if (idx2 !== i) return ex2;
              const existingFilled = ex2.sets.filter(s => s.reps || s.weight);
              return { ...ex2, sets: [...existingFilled, ...addedSets] };
            }));
          }} />
          {(() => {
            const last = getLastPerformance(ex.name);
            if (!last) return null;
            const currentVol = ex.sets.filter(s => s.reps || s.weight).reduce((a, s) => a + ((parseFloat(s.weight)||0) * (parseFloat(s.reps)||0)), 0);
            const improved = currentVol > 0 && currentVol > last.totalVol;
            return (
              <div style={{ marginBottom: 10, padding: "7px 10px", background: "#07101a", borderRadius: 5, border: "1px solid #0d2a3d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 9, color: "#3a8fc4", letterSpacing: 1 }}>
                  LAST · {last.sets}×{last.reps} @ {last.weight} lbs
                  <span style={{ color: "#1e5a7a", marginLeft: 6 }}>{last.date}</span>
                </span>
                {improved && <span style={{ fontSize: 11, color: "#3a9e4f", fontWeight: 700 }}>↑</span>}
              </div>
            );
          })()}
          <div style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 24px", gap: 8, marginBottom: 7 }}>
            <span />
            <span style={{ fontSize: 8, letterSpacing: 3, color: "#777", textTransform: "uppercase" }}>REPS</span>
            <span style={{ fontSize: 8, letterSpacing: 3, color: "#777", textTransform: "uppercase" }}>LBS</span>
            <span />
          </div>
          {ex.sets.map((set, j) => {
            const counted = !!(set.reps || set.weight);
            return (
              <div key={j} style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 24px", gap: 8, marginBottom: 7, alignItems: "center" }}>
                <span style={{ fontSize: 9, color: counted ? "#3a9e4f" : "#555", textAlign: "center", fontWeight: counted ? 700 : 400 }}>{j + 1}</span>
                <input style={{ ...g.numInput, borderColor: counted ? "#1a3a1a" : "#252525" }} type="number" placeholder="—" value={set.reps} onChange={e => updateSet(i, j, "reps", e.target.value)} />
                <input style={{ ...g.numInput, borderColor: counted ? "#1a3a1a" : "#252525" }} type="number" placeholder="—" value={set.weight} onChange={e => updateSet(i, j, "weight", e.target.value)} />
                <span style={{ fontSize: 14, color: counted ? "#3a9e4f" : "transparent", textAlign: "center", transition: "color 0.2s" }}>✓</span>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button style={{ ...g.ghost, fontSize: 9 }} onClick={() => addSet(i)}>+ SET</button>
            {ex.sets.length > 1 && (
              <button style={{ ...g.ghost, fontSize: 9, color: "#444" }} onClick={() => {
                const u = exercises.map((ex2, idx) => idx === i ? { ...ex2, sets: ex2.sets.slice(0, -1) } : ex2);
                setExercises(u);
              }}>− SET</button>
            )}
          </div>
        </div>
      </div>
    ))}

    <button style={{ ...g.ghost, width: "100%", marginBottom: 10 }} onClick={() => setExercises([...exercises, { name: "", sets: [{ reps: "", weight: "" }] }])}>+ ADD EXERCISE</button>

    {/* Live volume comparison */}
    {(() => {
      const lastSession = getLastSession(workoutType);
      if (!lastSession) return null;
      const todayVol = exercises.reduce((a, ex) => a + ex.sets.filter(s => s.reps || s.weight).reduce((b, s) => b + (parseFloat(s.weight)||0) * (parseFloat(s.reps)||0), 0), 0);
      const lastVol = (lastSession.exercises || []).reduce((a, ex) => a + ex.sets.filter(s => s.reps || s.weight).reduce((b, s) => b + (parseFloat(s.weight)||0) * (parseFloat(s.reps)||0), 0), 0);
      if (!lastVol) return null;
      const pct = Math.min(200, Math.round((todayVol / lastVol) * 100));
      const ahead = todayVol >= lastVol;
      const diff = Math.abs(todayVol - lastVol);
      return (
        <div style={{ ...g.card, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 8, letterSpacing: 2, color: "#555", textTransform: "uppercase" }}>Volume vs Last Session</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: ahead ? "#3a9e4f" : "#c49a1a" }}>
              {todayVol > 0 ? `${ahead ? "+" : "-"}${Math.round(diff).toLocaleString()} lbs (${pct}%)` : "—"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div>
              <div style={{ fontSize: 7, color: "#ff4d00", letterSpacing: 1, marginBottom: 3 }}>TODAY</div>
              <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${Math.min(100, (todayVol / Math.max(todayVol, lastVol)) * 100)}%`, background: "#ff4d00", borderRadius: 2, transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: 9, color: "#888", marginTop: 3 }}>{Math.round(todayVol).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 7, color: "#444", letterSpacing: 1, marginBottom: 3 }}>LAST · {lastSession.date}</div>
              <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${Math.min(100, (lastVol / Math.max(todayVol, lastVol)) * 100)}%`, background: "#333", borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 9, color: "#444", marginTop: 3 }}>{Math.round(lastVol).toLocaleString()}</div>
            </div>
          </div>
        </div>
      );
    })()}

    <button style={g.primary} onClick={saveWorkout}>{saved ? "✓  SESSION SAVED" : "SAVE SESSION"}</button>
  </div>
);
```

}

// ── Run log ──
const dist = parseFloat(runData.distance) || 0;

// Auto-calculate pace from distance + duration
const calcPace = (distance, duration) => {
if (!distance || !duration) return “”;
const d = parseFloat(distance);
if (!d) return “”;
// Parse mm:ss or plain minutes
let totalMins = 0;
if (String(duration).includes(”:”)) {
const [mins, secs] = duration.split(”:”).map(Number);
totalMins = (mins || 0) + (secs || 0) / 60;
} else {
totalMins = parseFloat(duration) || 0;
}
if (!totalMins) return “”;
const paceDecimal = totalMins / d;
const paceMins = Math.floor(paceDecimal);
const paceSecs = Math.round((paceDecimal - paceMins) * 60);
return `${paceMins}:${String(paceSecs).padStart(2, "0")}`;
};

const autoPace = calcPace(runData.distance, runData.duration);

return (
<div style={g.page}>
<div style={{ display: “flex”, alignItems: “center”, gap: 12, marginBottom: 20 }}>
<button onClick={() => setMode(“pick”)} style={{ …g.ghost, padding: “6px 10px”, fontSize: 11 }}>←</button>
<span style={{ fontSize: 16 }}>⚡</span>
<span style={{ fontSize: 11, letterSpacing: 3, textTransform: “uppercase”, color: “#888” }}>RUN</span>
<input type=“date” value={workoutDate} onChange={e => setWorkoutDate(e.target.value)}
style={{ marginLeft: “auto”, background: workoutDate !== new Date().toLocaleDateString(“en-CA”) ? “#1a0d00” : “#141414”, border: `1px solid ${workoutDate !== new Date().toLocaleDateString("en-CA") ? "#ff4d00" : "#252525"}`, color: workoutDate !== new Date().toLocaleDateString(“en-CA”) ? “#ff4d00” : “#666”, borderRadius: 5, padding: “4px 6px”, fontSize: 10, fontFamily: “‘DM Mono’, monospace”, cursor: “pointer” }} />
</div>

```
  {[["distance","Total Distance","mi","0.01"],["duration","Run Time","mm:ss",""],["firstStop","First Stop","mi","0.01"],["pace","Avg Pace","min/mi","0.01"],["heartRate","Heart Rate","bpm","1"],["maxSpeed","Max Speed","mph","0.1"]].map(([f, lbl, unit, step]) => (
    <div key={f} style={g.card}>
      <div style={{ padding: "13px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
          <span style={{ fontSize: 9, letterSpacing: 3, color: "#555", textTransform: "uppercase" }}>{lbl}</span>
          <span style={{ fontSize: 9, color: "#777" }}>{unit}</span>
        </div>
        {f === "pace" ? (
          <div style={{ position: "relative" }}>
            <input style={{ ...g.input, color: !runData.pace && autoPace ? "#555" : "#e8e0d5" }}
              type="text" placeholder={autoPace || "e.g. 9:20"}
              value={runData.pace}
              onChange={e => setRunData({ ...runData, pace: e.target.value })} />
            {!runData.pace && autoPace && (
              <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#555", fontFamily: "'DM Mono', monospace" }}>{autoPace}</span>
                <button onPointerDown={e => e.preventDefault()} onClick={() => setRunData(r => ({ ...r, pace: autoPace }))}
                  style={{ fontSize: 7, color: "#ff4d00", border: "1px solid #ff4d00", borderRadius: 3, padding: "2px 5px", background: "none", cursor: "pointer", fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>USE</button>
              </div>
            )}
          </div>
        ) : f === "duration" ? (
          <input style={g.input} type="text" placeholder="e.g. 42:00" value={runData[f]} onChange={e => setRunData({ ...runData, [f]: e.target.value })} />
        ) : (
          <input style={g.input} type="number" step={step} placeholder="0" value={runData[f]} onChange={e => setRunData({ ...runData, [f]: e.target.value })} />
        )}
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
```

);
}

// ── DAILY TAB ──────────────────────────────────────────────────────────────
function DailyTab({ dailyLog, setDailyLog, saveEntry, history, sleepLog }) {
const todayStr = () => new Date().toLocaleDateString(“en-CA”); // YYYY-MM-DD for input
const [daily, setDaily] = useState({ crunches: “”, planks: “”, pushups: “”, steps: “” });
const [logDate, setLogDate] = useState(todayStr());
const [stretchDone, setStretchDone] = useState({});
const [saved, setSaved] = useState(false);

const stretchCount = Object.values(stretchDone).filter(Boolean).length;

const saveDaily = async () => {
const displayDate = logDate ? new Date(logDate + “T12:00:00”).toLocaleDateString() : new Date().toLocaleDateString();
const newStretches = STRETCHES.filter(s => stretchDone[s.key]).map(s => s.key);

```
// Check if entry already exists for this date — if so, merge
const existing = dailyLog.find(d => d.date === displayDate);
if (existing) {
  const merged = {
    ...existing,
    crunches: daily.crunches || existing.crunches,
    planks: daily.planks || existing.planks,
    pushups: daily.pushups || existing.pushups,
    steps: daily.steps || existing.steps,
    stretches: [...new Set([...(existing.stretches || []), ...newStretches])],
  };
  const newD = dailyLog.map(d => d.date === displayDate ? merged : d);
  setDailyLog(newD);
  // Delete old entry and save merged
  await saveEntry(merged);
} else {
  const entry = { id: Date.now(), date: displayDate, ...daily, stretches: newStretches };
  setDailyLog(prev => [entry, ...prev]);
  await saveEntry(entry);
}
setDaily({ crunches: "", planks: "", pushups: "", steps: "" });
setLogDate(todayStr());
setStretchDone({});
setSaved(true);
setTimeout(() => setSaved(false), 2500);
```

};

const steps = parseInt(daily.steps) || 0;
const stepPct = Math.min((steps / 10000) * 100, 100);

return (
<div style={g.page}>
{/* Date picker */}
<div style={{ …g.card, padding: “12px 14px”, marginBottom: 14, display: “flex”, alignItems: “center”, justifyContent: “space-between” }}>
<span style={{ fontSize: 9, letterSpacing: 3, color: “#888”, textTransform: “uppercase” }}>Log Date</span>
<input
type=“date”
value={logDate}
onChange={e => setLogDate(e.target.value)}
style={{ background: “none”, border: “none”, color: logDate === todayStr() ? “#888” : “#ff4d00”, fontFamily: “‘DM Mono’, monospace”, fontSize: 11, outline: “none”, textAlign: “right”, cursor: “pointer” }}
/>
</div>

```
  {/* Voice */}
  <VoiceFill tab="daily" onFill={(parsed) => {
    setDaily(prev => ({
      crunches: parsed.crunches !== undefined ? String(parsed.crunches) : prev.crunches,
      planks: parsed.planks !== undefined ? String(parsed.planks) : prev.planks,
      pushups: parsed.pushups !== undefined ? String(parsed.pushups) : prev.pushups,
      steps: parsed.steps !== undefined ? String(parsed.steps) : prev.steps,
    }));
    if (parsed.stretches?.length) {
      const newStretches = {};
      parsed.stretches.forEach(s => { newStretches[s] = true; });
      setStretchDone(prev => ({ ...prev, ...newStretches }));
    }
  }} />

  {/* Steps */}
  <span style={g.label}>Steps</span>
  <div style={{ ...g.card, padding: "16px 14px", marginBottom: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <span style={{ fontSize: 9, letterSpacing: 2, color: "#888", textTransform: "uppercase" }}>↳ Daily Steps</span>
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
          <div style={{ fontSize: 8, letterSpacing: 2, color: "#888", textTransform: "uppercase", marginBottom: 7 }}>{lbl}</div>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 11, color: "#aaa", marginBottom: d.stretches?.length ? 7 : 0 }}>
            <span>✦ {d.crunches || 0}</span><span>◆ {d.planks || 0}</span><span>▲ {d.pushups || 0}</span>
          </div>
          {d.steps && <div style={{ fontSize: 11, color: parseInt(d.steps) >= 10000 ? "#3a9e4f" : "#444", marginBottom: d.stretches?.length ? 7 : 0 }}>↳ {parseInt(d.steps).toLocaleString()} steps</div>}
          {d.stretches?.length > 0 && <div style={{ fontSize: 10, color: "#3a9e4f" }}>🧘 {d.stretches.join(", ")}</div>}
        </div>
      ))}
    </>
  )}
</div>
```

);
}

// ── SLEEP TAB ──────────────────────────────────────────────────────────────
function SleepTab({ sleepLog, setSleepLog, saveEntry, history, dailyLog }) {
const [oura, setOura] = useState({ sleepScore: “”, readiness: “”, hoursSlept: “”, rem: “”, heartRate: “”, hrv: “”, respiratoryRate: “” });
const [saved, setSaved] = useState(false);
const [sleepDate, setSleepDate] = useState(() => new Date().toLocaleDateString(“en-CA”));

const sc = scoreColor(oura.sleepScore);
const rc = scoreColor(oura.readiness);

const jhSpread = (oura.hrv && oura.heartRate)
? (parseFloat(oura.hrv) - parseFloat(oura.heartRate)).toFixed(1)
: null;
const jhColor = jhSpread === null ? “#444” : jhSpread > 0 ? “#3a9e4f” : “#c0392b”;

const saveSleep = async () => {
const displayDate = new Date(sleepDate + “T12:00:00”).toLocaleDateString();
const entry = { id: Date.now(), date: displayDate, …oura, jhSpread };
const newS = [entry, …sleepLog];
setSleepLog(newS);
await saveEntry(entry);
setOura({ sleepScore: “”, readiness: “”, hoursSlept: “”, rem: “”, heartRate: “”, hrv: “”, respiratoryRate: “” });
setSleepDate(new Date().toLocaleDateString(“en-CA”));
setSaved(true);
setTimeout(() => setSaved(false), 2500);
};

return (
<div style={g.page}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center”, marginBottom: 4 }}>
<span style={g.label}>Oura Sleep</span>
<input type=“date” value={sleepDate} onChange={e => setSleepDate(e.target.value)}
style={{ background: sleepDate !== new Date().toLocaleDateString(“en-CA”) ? “#1a0d00” : “#141414”, border: `1px solid ${sleepDate !== new Date().toLocaleDateString("en-CA") ? "#ff4d00" : "#252525"}`, color: sleepDate !== new Date().toLocaleDateString(“en-CA”) ? “#ff4d00” : “#666”, borderRadius: 5, padding: “4px 6px”, fontSize: 10, fontFamily: “‘DM Mono’, monospace”, cursor: “pointer” }} />
</div>

```
  {/* Voice */}
  <VoiceFill tab="sleep" onFill={(parsed) => {
    setOura(prev => ({
      sleepScore: parsed.sleepScore !== undefined ? String(parsed.sleepScore) : prev.sleepScore,
      readiness: parsed.readiness !== undefined ? String(parsed.readiness) : prev.readiness,
      hoursSlept: parsed.hoursSlept !== undefined ? String(parsed.hoursSlept) : prev.hoursSlept,
      rem: parsed.rem !== undefined ? String(parsed.rem) : prev.rem,
      heartRate: parsed.heartRate !== undefined ? String(parsed.heartRate) : prev.heartRate,
      hrv: parsed.hrv !== undefined ? String(parsed.hrv) : prev.hrv,
      respiratoryRate: parsed.respiratoryRate !== undefined ? String(parsed.respiratoryRate) : prev.respiratoryRate,
    }));
  }} />

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
              <div style={{ fontSize: 8, letterSpacing: 3, color: "#777", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
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
        ["hoursSlept", "Sleep",    "hrs",  "◑", "time"],
        ["rem",        "REM",      "hrs",  "◎", "time"],
        ["heartRate",  "Resting HR","bpm", "♡", "number"],
        ["hrv",        "HRV",      "ms",   "∿", "number"],
        ["respiratoryRate","Resp.", "brpm", "≋", "number"],
      ].map(([field, label, unit, icon, inputType]) => (
        <div key={field} style={{ background: "#0f0f0f", padding: "12px 10px" }}>
          <div style={{ fontSize: 8, letterSpacing: 2, color: "#777", textTransform: "uppercase", marginBottom: 6, textAlign: "center" }}>{icon} {label}</div>
          {inputType === "time" ? (
            <input style={{ ...g.numInput, fontSize: 16, fontWeight: 700, padding: "8px 4px", textAlign: "center" }}
              type="text" placeholder="6:12" maxLength={5}
              value={oura[field]}
              onChange={e => {
                let v = e.target.value.replace(/[^0-9:]/g, "");
                // Auto-insert colon after first 1-2 digits
                if (v.length === 2 && !v.includes(":") && oura[field].length < 2) v = v + ":";
                setOura(o => ({ ...o, [field]: v }));
              }} />
          ) : (
            <input style={{ ...g.numInput, fontSize: 16, fontWeight: 700, padding: "8px 4px" }}
              type="number" step="1" placeholder="—"
              value={oura[field]} onChange={e => setOura(o => ({ ...o, [field]: e.target.value }))} />
          )}
          <div style={{ fontSize: 7, color: "#555", textAlign: "center", marginTop: 4 }}>{unit}</div>
        </div>
      ))}

      {/* JH Spread — auto-calculated, read only */}
      <div style={{ background: "#0f0f0f", padding: "12px 10px" }}>
        <div style={{ fontSize: 8, letterSpacing: 2, color: "#777", textTransform: "uppercase", marginBottom: 6, textAlign: "center" }}>⚖ JH Spread</div>
        <div style={{ ...g.numInput, fontSize: 16, fontWeight: 700, padding: "8px 4px", color: jhSpread !== null ? jhColor : "#2a2a2a", border: "1px solid #1a1a1a", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {jhSpread !== null ? (jhSpread > 0 ? `+${jhSpread}` : jhSpread) : "—"}
        </div>
        <div style={{ fontSize: 7, color: "#444", textAlign: "center", marginTop: 4 }}>HRV−HR</div>
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
                  <div style={{ fontSize: 9, color: "#666", marginBottom: 3 }}>{icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: idx === 5 ? jhC : val ? "#e8e0d5" : "#444" }}>{val || "—"}</div>
                  <div style={{ fontSize: 7, color: "#666", marginTop: 2 }}>{unit}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  )}
</div>
```

);
}

// ── CONSISTENCY HEATMAP ───────────────────────────────────────────────────
function ConsistencyHeatmap({ history, dailyLog, sleepLog }) {
// Build a map of date -> activity types
const today = new Date();
const activityMap = {};

history.forEach(h => {
if (h.date) {
if (!activityMap[h.date]) activityMap[h.date] = { workout: false, daily: false, sleep: false, workoutType: null };
activityMap[h.date].workout = true;
activityMap[h.date].workoutType = h.type;
}
});
dailyLog.forEach(d => {
if (d.date) {
if (!activityMap[d.date]) activityMap[d.date] = { workout: false, daily: false, sleep: false };
activityMap[d.date].daily = true;
}
});
sleepLog.forEach(s => {
if (s.date) {
if (!activityMap[s.date]) activityMap[s.date] = { workout: false, daily: false, sleep: false };
activityMap[s.date].sleep = true;
}
});

// Build 365 days ending today
const days = [];
for (let i = 364; i >= 0; i–) {
const d = new Date(today);
d.setDate(today.getDate() - i);
const dateStr = d.toLocaleDateString(“en-US”, { month: “numeric”, day: “numeric”, year: “numeric” });
// Also try M/D/YYYY format used by the app
const appDateStr = d.toLocaleDateString();
days.push({ date: appDateStr, dow: d.getDay(), weekNum: Math.floor((364 - i) / 7) });
}

const getCellColor = (dateStr) => {
const a = activityMap[dateStr];
if (!a) return “#111”;
if (a.workout && a.daily && a.sleep) return “#ff4d00”; // full day - orange
if (a.workout) return “#c03a00”; // workout only - dark orange
if (a.daily && a.sleep) return “#1a4a6e”; // daily + sleep - blue
if (a.daily) return “#0d2a3d”; // daily only
if (a.sleep) return “#1a3a5c”; // sleep only
return “#111”;
};

// Group into weeks (columns)
const weeks = [];
for (let w = 0; w < 53; w++) {
weeks.push(days.filter(d => d.weekNum === w));
}

const months = [“Jan”,“Feb”,“Mar”,“Apr”,“May”,“Jun”,“Jul”,“Aug”,“Sep”,“Oct”,“Nov”,“Dec”];
const dowLabels = [“S”,“M”,“T”,“W”,“T”,“F”,“S”];

// Stats
const totalWorkouts = history.length;
const totalDays = Object.keys(activityMap).length;
const streak = (() => {
let s = 0;
for (let i = 0; i < 365; i++) {
const d = new Date(today);
d.setDate(today.getDate() - i);
const ds = d.toLocaleDateString();
if (activityMap[ds]) s++;
else if (i > 0) break;
}
return s;
})();

const workoutTypeCounts = WORKOUT_TYPES.reduce((acc, t) => {
acc[t] = history.filter(h => h.type === t).length;
return acc;
}, {});

return (
<div>
{/* Stats row */}
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr 1fr”, gap: 8, marginBottom: 16 }}>
{[
[“WORKOUTS”, totalWorkouts, “sessions”],
[“ACTIVE DAYS”, totalDays, “logged”],
[“STREAK”, streak, “days”],
].map(([label, val, sub]) => (
<div key={label} style={{ …g.card, padding: “12px 8px”, textAlign: “center” }}>
<div style={{ fontSize: 20, fontWeight: 700, color: “#ff4d00”, fontFamily: “‘DM Mono’, monospace” }}>{val}</div>
<div style={{ fontSize: 7, letterSpacing: 2, color: “#555”, textTransform: “uppercase”, marginTop: 3 }}>{label}</div>
<div style={{ fontSize: 7, color: “#333”, marginTop: 2 }}>{sub}</div>
</div>
))}
</div>

```
  {/* Heatmap grid */}
  <div style={{ ...g.card, padding: "14px 10px", overflowX: "auto" }}>
    <div style={{ fontSize: 8, letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 10 }}>365-Day Consistency</div>
    <div style={{ display: "flex", gap: 2 }}>
      {/* Day labels */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: 4, paddingTop: 14 }}>
        {dowLabels.map((d, i) => (
          <div key={i} style={{ fontSize: 7, color: "#333", height: 10, lineHeight: "10px", textAlign: "right" }}>{i % 2 === 0 ? d : ""}</div>
        ))}
      </div>
      {/* Week columns */}
      <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
        {weeks.filter(w => w.length > 0).map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Month label on first day of month */}
            <div style={{ fontSize: 6, color: "#333", height: 10, lineHeight: "10px", textAlign: "center", minWidth: 10 }}>
              {week[0] && new Date(week[0].date).getDate() <= 7 ? months[new Date(week[0].date).getMonth()] : ""}
            </div>
            {/* Fill empty days at start of week */}
            {Array.from({ length: week[0]?.dow || 0 }).map((_, pi) => (
              <div key={`p${pi}`} style={{ width: 10, height: 10 }} />
            ))}
            {week.map((day, di) => {
              const a = activityMap[day.date];
              const color = getCellColor(day.date);
              const isToday = day.date === today.toLocaleDateString();
              return (
                <div key={di} title={`${day.date}${a ? ` · ${[a.workout && a.workoutType, a.daily && "daily", a.sleep && "sleep"].filter(Boolean).join(", ")}` : ""}`}
                  style={{
                    width: 10, height: 10, borderRadius: 2,
                    background: color,
                    border: isToday ? "1px solid #ff4d00" : "1px solid transparent",
                    transition: "transform 0.1s",
                    cursor: a ? "pointer" : "default"
                  }} />
              );
            })}
          </div>
        ))}
      </div>
    </div>

    {/* Legend */}
    <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
      {[
        ["#111", "None"],
        ["#0d2a3d", "Daily"],
        ["#c03a00", "Workout"],
        ["#ff4d00", "Full Day"],
      ].map(([color, label]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
          <span style={{ fontSize: 7, color: "#444", letterSpacing: 1 }}>{label}</span>
        </div>
      ))}
    </div>
  </div>

  {/* Workout breakdown */}
  <div style={{ ...g.card, padding: "14px", marginTop: 10 }}>
    <div style={{ fontSize: 8, letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 10 }}>By Type</div>
    {WORKOUT_TYPES.map(t => {
      const count = workoutTypeCounts[t] || 0;
      const max = Math.max(...Object.values(workoutTypeCounts), 1);
      return (
        <div key={t} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: "#777", letterSpacing: 1 }}>{ICON[t]} {t}</span>
            <span style={{ fontSize: 9, color: "#555" }}>{count}</span>
          </div>
          <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: "#ff4d00", borderRadius: 2, transition: "width 0.5s" }} />
          </div>
        </div>
      );
    })}
  </div>
</div>
```

);
}

// ── WORKOUT HISTORY CARD ──────────────────────────────────────────────────
function WorkoutHistoryCard({ entry: e, onDelete }) {
const [expanded, setExpanded] = useState(false);
const totalSets = e.exercises?.reduce((a, ex) => a + ex.sets.filter(s => s.reps || s.weight).length, 0) || 0;
return (
<div style={{ …g.card, overflow: “hidden” }}>
<div style={{ padding: “12px 14px”, cursor: “pointer” }} onClick={() => setExpanded(x => !x)}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center”, marginBottom: 6 }}>
<span style={{ fontSize: 13 }}>{ICON[e.type]} <span style={{ fontSize: 10, letterSpacing: 2, textTransform: “uppercase”, color: “#888”, marginLeft: 6 }}>{e.type}</span></span>
<div style={{ display: “flex”, gap: 8, alignItems: “center” }}>
<span style={g.badge}>{e.date}</span>
<span style={{ fontSize: 9, color: “#555” }}>{expanded ? “▲” : “▼”}</span>
<button onClick={ev => { ev.stopPropagation(); onDelete(); }} style={{ background: “none”, border: “1px solid #252525”, color: “#555”, padding: “3px 7px”, borderRadius: 4, cursor: “pointer”, fontSize: 10, fontFamily: “‘DM Mono’, monospace” }}>✕</button>
</div>
</div>
{e.exercises && <div style={{ fontSize: 10, color: “#555” }}>{e.exercises.map(ex => ex.name).join(” · “)}<span style={{ color: “#444”, marginLeft: 8 }}>{totalSets} sets</span></div>}
{e.type === “run” && e.runData && <div style={{ fontSize: 10, color: “#666” }}>{e.runData.distance && `${e.runData.distance} mi`}{e.runData.duration && ` · ${e.runData.duration}`}{e.runData.pace && ` · ${e.runData.pace} /mi`}</div>}
</div>

```
  {expanded && e.exercises && (
    <div style={{ borderTop: "1px solid #1a1a1a", padding: "10px 14px" }}>
      {e.exercises.map((ex, i) => {
        const filledSets = ex.sets.filter(s => s.reps || s.weight);
        if (!filledSets.length) return null;
        return (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#ff4d00", textTransform: "uppercase", marginBottom: 6 }}>{ex.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "20px 1fr 1fr", gap: 4 }}>
              <span style={{ fontSize: 7, color: "#444" }}>#</span>
              <span style={{ fontSize: 7, color: "#444", letterSpacing: 1 }}>REPS</span>
              <span style={{ fontSize: 7, color: "#444", letterSpacing: 1 }}>LBS</span>
              {filledSets.map((s, j) => (
                <>
                  <span key={`n${j}`} style={{ fontSize: 9, color: "#555" }}>{j + 1}</span>
                  <span key={`r${j}`} style={{ fontSize: 11, color: "#ccc", fontWeight: 600 }}>{s.reps || "—"}</span>
                  <span key={`w${j}`} style={{ fontSize: 11, color: "#ccc", fontWeight: 600 }}>{s.weight || "—"}</span>
                </>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
```

);
}

// ── WHAT’S NEXT ───────────────────────────────────────────────────────────
function WhatsNext({ history, onSelect }) {
if (!history.length) return null;

const RECOVERY_HRS = { chest: 72, back: 72, legs: 96, shoulders: 72, biceps: 48, triceps: 48, run: 96 };
const ALL_TYPES = […WORKOUT_TYPES, “run”];
const now = Date.now();

const lastDone = {};
ALL_TYPES.forEach(t => {
const last = history.find(h => h.type === t);
if (last) lastDone[t] = new Date(last.date).getTime();
});

const scores = ALL_TYPES.map(t => {
const last = lastDone[t];
if (!last) return { type: t, daysSince: null, ready: true, score: 9999 };
const hrsSince = (now - last) / (1000 * 60 * 60);
const recovery = RECOVERY_HRS[t] || 72;
const daysSince = Math.floor(hrsSince / 24);
// Score by absolute hours since — more days = higher priority
// Subtract recovery hours so fully recovered types float to top
const score = hrsSince - recovery;
return { type: t, daysSince, ready: hrsSince >= recovery, score };
}).sort((a, b) => b.score - a.score);

// Separate run from strength for display
const strengthScores = scores.filter(s => s.type !== “run”);
const runScore = scores.find(s => s.type === “run”);
const top2 = strengthScores.slice(0, 2);

return (
<div style={{ …g.card, padding: “14px 16px”, marginBottom: 16, background: “#0a1a0a”, border: “1px solid #1a3a1a” }}>
<div style={{ fontSize: 8, letterSpacing: 3, color: “#3a9e4f”, textTransform: “uppercase”, marginBottom: 12 }}>◈ Recommended Today</div>
{top2.map((rec, idx) => (
<div key={rec.type} onClick={() => onSelect(rec.type)}
style={{ display: “flex”, alignItems: “center”, gap: 10, padding: “10px 12px”, borderRadius: 8, cursor: “pointer”, background: idx === 0 ? “#0f2a0f” : “#0a0a0a”, border: `1px solid ${idx === 0 ? "#1a4a1a" : "#1a1a1a"}`, marginBottom: 8 }}>
<span style={{ fontSize: idx === 0 ? 26 : 20 }}>{ICON[rec.type]}</span>
<div style={{ flex: 1 }}>
<div style={{ fontSize: idx === 0 ? 13 : 11, fontWeight: 700, color: idx === 0 ? “#e8e0d5” : “#888”, letterSpacing: 2, textTransform: “uppercase” }}>{rec.type}</div>
<div style={{ fontSize: 8, color: “#555”, marginTop: 2 }}>
{rec.daysSince === null ? “Never trained” : rec.daysSince === 0 ? “Trained today” : `${rec.daysSince}d ago`}
</div>
</div>
<div style={{ display: “flex”, flexDirection: “column”, alignItems: “flex-end”, gap: 3 }}>
<span style={{ fontSize: 7, color: rec.ready ? “#3a9e4f” : “#c49a1a”, border: `1px solid ${rec.ready ? "#1a4020" : "#3a2a00"}`, borderRadius: 3, padding: “2px 5px”, letterSpacing: 1 }}>{rec.ready ? “READY” : “ALMOST”}</span>
<span style={{ fontSize: 9, color: “#444” }}>→</span>
</div>
</div>
))}
{/* Run status line */}
{runScore && (
<div onClick={() => onSelect(“run”)}
style={{ display: “flex”, alignItems: “center”, gap: 10, padding: “8px 12px”, borderRadius: 8, cursor: “pointer”, background: “#0a0a0f”, border: `1px solid ${runScore.ready ? "#1a2a3a" : "#111"}`, marginTop: 0 }}>
<span style={{ fontSize: 16 }}>⚡</span>
<div style={{ flex: 1 }}>
<div style={{ fontSize: 10, fontWeight: 700, color: “#666”, letterSpacing: 2, textTransform: “uppercase” }}>RUN</div>
<div style={{ fontSize: 8, color: “#444”, marginTop: 1 }}>
{runScore.daysSince === null ? “No runs logged” : runScore.daysSince === 0 ? “Ran today” : `Last run ${runScore.daysSince}d ago · target every 4-5d`}
</div>
</div>
<span style={{ fontSize: 7, color: runScore.ready ? “#3a8fc4” : “#333”, border: `1px solid ${runScore.ready ? "#0d2a3d" : "#1a1a1a"}`, borderRadius: 3, padding: “2px 5px”, letterSpacing: 1 }}>
{runScore.daysSince === null ? “—” : runScore.ready ? “RUN TODAY” : `${runScore.daysSince}D`}
</span>
</div>
)}
</div>
);
}

// ── WEEKLY SCORECARD ──────────────────────────────────────────────────────
function WeeklyScorecard({ history, sleepLog, dailyLog }) {
const [analysis, setAnalysis] = useState(null);
const [loading, setLoading] = useState(false);
const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, -1 = last week

// Get Mon-Sun of selected week
const getWeekBounds = (offset) => {
const now = new Date();
const day = now.getDay(); // 0=Sun
const mon = new Date(now);
mon.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
mon.setHours(0, 0, 0, 0);
const sun = new Date(mon);
sun.setDate(mon.getDate() + 6);
sun.setHours(23, 59, 59, 999);
return { mon, sun };
};

const { mon, sun } = getWeekBounds(weekOffset);

const inRange = (dateStr) => {
const d = new Date(dateStr);
return d >= mon && d <= sun;
};

const weekWorkouts = history.filter(h => inRange(h.date));
const weekSleep = sleepLog.filter(s => inRange(s.date));
const weekDaily = dailyLog.filter(d => inRange(d.date));

const workoutDays = new Set(weekWorkouts.map(h => h.date)).size;
const totalSets = weekWorkouts.reduce((a, h) => a + (h.exercises?.reduce((b, e) => b + e.sets.filter(s => s.reps || s.weight).length, 0) || 0), 0);
const avgSleep = weekSleep.length ? (weekSleep.reduce((a, s) => a + (parseFloat(s.sleepScore) || 0), 0) / weekSleep.length).toFixed(0) : null;
const avgHrv = weekSleep.length ? (weekSleep.reduce((a, s) => a + (parseFloat(s.hrv) || 0), 0) / weekSleep.filter(s => s.hrv).length).toFixed(0) : null;

const weekLabel = weekOffset === 0 ? “This Week” : weekOffset === -1 ? “Last Week” : `${mon.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

const runAnalysis = async () => {
setLoading(true);
setAnalysis(null);
const prompt = `You are an elite fitness coach giving a weekly scorecard review. Be direct, specific, and encouraging but honest.

Week: ${mon.toLocaleDateString()} – ${sun.toLocaleDateString()}
Workouts completed: ${weekWorkouts.length} sessions across ${workoutDays} days
Total sets: ${totalSets}
Workout types: ${weekWorkouts.map(h => h.type).join(”, “) || “none”}
${weekWorkouts.map(h => `- ${h.date} ${h.type}: ${h.exercises?.map(e => `${e.name} ${e.sets.filter(s=>s.reps||s.weight).length}sets`).join(", ") || h.runData?.distance + "mi"}`).join(”\n”)}

Sleep data:
${weekSleep.map(s => `- ${s.date}: score=${s.sleepScore}, HRV=${s.hrv}, hrs=${s.hoursSlept}`).join(”\n”) || “No sleep data”}

Daily activity:
${weekDaily.map(d => `- ${d.date}: steps=${d.steps}, crunches=${d.crunches}, pushups=${d.pushups}`).join(”\n”) || “No daily data”}

Give a scorecard with:

1. WEEK GRADE (A/B/C/D/F) with one sentence justification
1. BEST MOMENT — single best performance or habit this week
1. WEAK SPOT — one specific thing to improve
1. NEXT WEEK TARGET — one concrete, measurable goal

Keep it under 200 words. Be a tough but fair coach.`;

```
try {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 400, messages: [{ role: "user", content: prompt }] })
  });
  const data = await res.json();
  setAnalysis(data.content?.[0]?.text || "Unable to generate scorecard.");
} catch(e) {
  setAnalysis("Error generating scorecard. Check your connection.");
}
setLoading(false);
```

};

return (
<div>
{/* Week selector */}
<div style={{ display: “flex”, alignItems: “center”, justifyContent: “space-between”, marginBottom: 12 }}>
<button onClick={() => { setWeekOffset(w => w - 1); setAnalysis(null); }} style={{ …g.ghost, padding: “6px 10px”, fontSize: 11 }}>←</button>
<span style={{ fontSize: 10, color: “#888”, letterSpacing: 2, textTransform: “uppercase” }}>{weekLabel}</span>
<button onClick={() => { setWeekOffset(w => Math.min(0, w + 1)); setAnalysis(null); }} style={{ …g.ghost, padding: “6px 10px”, fontSize: 11, opacity: weekOffset >= 0 ? 0.3 : 1 }}>→</button>
</div>

```
  {/* Stats row */}
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
    {[
      ["DAYS", workoutDays, "active"],
      ["SESSIONS", weekWorkouts.length, "logged"],
      ["SETS", totalSets, "total"],
      ["SLEEP", avgSleep || "—", "avg score"],
    ].map(([label, val, sub]) => (
      <div key={label} style={{ ...g.card, padding: "10px 6px", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#ff4d00", fontFamily: "'DM Mono', monospace" }}>{val}</div>
        <div style={{ fontSize: 7, letterSpacing: 1, color: "#555", textTransform: "uppercase", marginTop: 2 }}>{label}</div>
        <div style={{ fontSize: 7, color: "#333", marginTop: 1 }}>{sub}</div>
      </div>
    ))}
  </div>

  {/* Day grid */}
  <div style={{ ...g.card, padding: "12px 14px", marginBottom: 12 }}>
    <div style={{ fontSize: 8, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 8 }}>Week at a Glance</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
      {["M","T","W","T","F","S","S"].map((d, i) => {
        const day = new Date(mon);
        day.setDate(mon.getDate() + i);
        const ds = day.toLocaleDateString();
        const hasWorkout = weekWorkouts.some(h => h.date === ds);
        const hasSleep = weekSleep.some(s => s.date === ds);
        const isToday = day.toDateString() === new Date().toDateString();
        const isFuture = day > new Date();
        return (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 7, color: isToday ? "#ff4d00" : "#444", marginBottom: 3 }}>{d}</div>
            <div style={{ height: 28, borderRadius: 4, background: isFuture ? "#0a0a0a" : hasWorkout ? "#ff4d00" : hasSleep ? "#0d2a3d" : "#141414", border: `1px solid ${isToday ? "#ff4d00" : "#1a1a1a"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {!isFuture && <span style={{ fontSize: 10 }}>{hasWorkout ? "💪" : hasSleep ? "😴" : ""}</span>}
            </div>
            <div style={{ fontSize: 7, color: "#333", marginTop: 2 }}>{day.getDate()}</div>
          </div>
        );
      })}
    </div>
  </div>

  {/* AI Scorecard */}
  <button onClick={runAnalysis} disabled={loading}
    style={{ ...g.primary, width: "100%", marginBottom: 12, background: loading ? "#1a1a1a" : "#ff4d00", fontSize: 10, letterSpacing: 2 }}>
    {loading ? "⟳ GENERATING SCORECARD…" : "⚡ GENERATE WEEKLY SCORECARD"}
  </button>

  {analysis && (
    <div style={{ ...g.card, padding: "16px" }}>
      <div style={{ fontSize: 8, letterSpacing: 3, color: "#ff4d00", textTransform: "uppercase", marginBottom: 10 }}>⚡ Weekly Scorecard · {weekLabel}</div>
      <div style={{ fontSize: 12, color: "#ccc", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{analysis}</div>
    </div>
  )}
</div>
```

);
}

// ── HISTORY TAB ───────────────────────────────────────────────────────────
function HistoryTab({ history, setHistory, deleteWorkout, dailyLog, setDailyLog, deleteDaily, sleepLog, setSleepLog, deleteSleep }) {
const [search, setSearch] = useState(””);
const [view, setView] = useState(“log”); // “log” | “progress”
const [progressType, setProgressType] = useState(null);
const [analysis, setAnalysis] = useState(null);
const [loading, setLoading] = useState(false);

const all = [
…history.map(h => ({ …h, _kind: “workout” })),
…dailyLog.map(d => ({ …d, _kind: “daily” })),
…sleepLog.map(s => ({ …s, _kind: “sleep” })),
].sort((a, b) => b.id - a.id);

const q = search.toLowerCase();
const filtered = all.filter(e => {
if (!q) return true;
if (e._kind === “workout”) return e.type?.includes(q) || e.date?.includes(q);
if (e._kind === “sleep”) return e.date?.includes(q) || (e.sleepScore && String(e.sleepScore).includes(q));
if (e._kind === “daily”) return e.date?.includes(q);
return true;
});

// Workout types with enough data for analysis (5+ sessions)
const workoutTypes = WORKOUT_TYPES.filter(t => history.filter(h => h.type === t).length >= 3);

const runAnalysis = async (type) => {
setProgressType(type);
setAnalysis(null);
setLoading(true);

```
const sessions = history.filter(h => h.type === type).slice(0, 20);
const sleep = sleepLog.slice(0, 20);

const prompt = type === "run"
  ? `You are an expert running coach analyzing performance data. Here are the user's recent runs:
```

${JSON.stringify(sessions.map(s => ({ date: s.date, …s.runData })), null, 2)}

Recent sleep/recovery data:
${JSON.stringify(sleep.map(s => ({ date: s.date, sleepScore: s.sleepScore, readiness: s.readiness, hrv: s.hrv, hoursSlept: s.hoursSlept })), null, 2)}

Provide a sharp, specific analysis covering:

1. PERFORMANCE TREND — pace, distance, heart rate trajectory
1. RECOVERY CORRELATION — how sleep/HRV correlates with run performance
1. RECOMMENDATIONS — 2-3 specific, actionable improvements
1. BASELINE vs NOW — where they started vs current form

Be direct, data-driven, and specific. Use the actual numbers. Keep it under 300 words.`:`You are an expert strength coach analyzing training data. Here are the user’s recent ${type} sessions:
${JSON.stringify(sessions.map(s => ({ date: s.date, exercises: s.exercises?.map(e => ({ name: e.name, sets: e.sets.filter(st => st.reps || st.weight) })) })), null, 2)}

Recent sleep/recovery data:
${JSON.stringify(sleep.map(s => ({ date: s.date, sleepScore: s.sleepScore, readiness: s.readiness, hrv: s.hrv, hoursSlept: s.hoursSlept })), null, 2)}

Provide a sharp, specific analysis covering:

1. STRENGTH TREND — which lifts are progressing, stalling, or regressing (use actual weights)
1. VOLUME TREND — total sets/reps progression over time
1. RECOVERY CORRELATION — how sleep quality/HRV correlates with performance
1. RECOMMENDATIONS — 2-3 specific, actionable next steps with target numbers
1. BASELINE vs NOW — estimated strength gains since first session

Be direct, data-driven, specific. Use actual numbers from the data. Keep it under 350 words.`;

```
try {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  setAnalysis(data.content?.[0]?.text || "Unable to generate analysis.");
} catch (e) {
  setAnalysis("Error connecting to analysis service. Please try again.");
}
setLoading(false);
```

};

return (
<div style={g.page}>
{/* View toggle */}
<div style={{ display: “flex”, gap: 8, marginBottom: 16 }}>
{[“log”, “progress”, “heatmap”, “scorecard”].map(v => (
<button key={v} onClick={() => setView(v)} style={{
flex: 1, padding: “9px 0”, borderRadius: 8, cursor: “pointer”,
fontFamily: “‘DM Mono’, monospace”, fontSize: 8, letterSpacing: 1, textTransform: “uppercase”,
border: `1px solid ${view === v ? "#ff4d00" : "#2a2a2a"}`,
background: view === v ? “#ff4d00” : “#141414”,
color: view === v ? “#fff” : “#777”, fontWeight: view === v ? 700 : 400
}}>{v === “progress” ? “AI ✦” : v === “heatmap” ? “MAP ◈” : v === “scorecard” ? “WEEK ⚡” : “LOG”}</button>
))}
</div>

```
  {/* PROGRESS VIEW */}
  {view === "progress" && (
    <div>
      <span style={g.label}>AI Coach — Select Workout</span>
      {workoutTypes.length === 0 && (
        <div style={{ ...g.card, padding: "20px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#555", lineHeight: 1.8 }}>Log at least 3 sessions of any workout type to unlock AI progress analysis.</div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {workoutTypes.map(t => (
          <button key={t} onClick={() => runAnalysis(t)} style={{
            background: progressType === t ? "#1c1008" : "#141414",
            border: `1px solid ${progressType === t ? "#ff4d00" : "#1e1e1e"}`,
            color: "#e8e0d5", padding: "14px 10px", borderRadius: 10, cursor: "pointer",
            fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2,
            textTransform: "uppercase", display: "flex", flexDirection: "column", alignItems: "center", gap: 6
          }}>
            <span style={{ fontSize: 22 }}>{ICON[t]}</span>
            {t}
            <span style={{ fontSize: 8, color: "#555" }}>{history.filter(h => h.type === t).length} sessions</span>
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ ...g.card, padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#ff4d00", letterSpacing: 3, textTransform: "uppercase" }}>Analyzing…</div>
          <div style={{ fontSize: 10, color: "#444", marginTop: 8 }}>Processing your training data</div>
        </div>
      )}

      {analysis && !loading && (
        <div style={{ ...g.card, padding: "18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, borderBottom: "1px solid #1e1e1e", paddingBottom: 12 }}>
            <span style={{ fontSize: 16 }}>{ICON[progressType]}</span>
            <span style={{ fontSize: 9, letterSpacing: 3, color: "#ff4d00", textTransform: "uppercase" }}>{progressType} · AI Analysis</span>
          </div>
          <div style={{ fontSize: 12, color: "#ccc", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{analysis}</div>
          <button onClick={() => runAnalysis(progressType)} style={{ ...g.ghost, width: "100%", marginTop: 14, fontSize: 9 }}>↺ REFRESH ANALYSIS</button>
        </div>
      )}
    </div>
  )}

  {/* SCORECARD VIEW */}
  {view === "scorecard" && (
    <WeeklyScorecard history={history} sleepLog={sleepLog} dailyLog={dailyLog} />
  )}

  {/* HEATMAP VIEW */}
  {view === "heatmap" && (
    <ConsistencyHeatmap history={history} dailyLog={dailyLog} sleepLog={sleepLog} />
  )}

  {/* LOG VIEW */}
  {view === "log" && (
    <>
      <div style={{ marginBottom: 16 }}>
        <input style={{ ...g.input, fontSize: 13 }} placeholder="Search by date, type, score…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "#444", fontSize: 11, marginTop: 40 }}>No entries found</div>
      )}
      {filtered.map(e => {
        if (e._kind === "workout") return (
          <WorkoutHistoryCard key={e.id} entry={e} onDelete={() => deleteWorkout(e.id)} />
        );
        if (e._kind === "daily") return (
          <div key={e.id} style={{ ...g.card, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#888" }}>DAILY</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={g.badge}>{e.date}</span>
                <button onClick={() => deleteDaily(e.id)} style={{ background: "none", border: "1px solid #252525", color: "#555", padding: "3px 7px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>✕</button>
              </div>
            </div>
            <div style={{ fontSize: 10, color: "#666" }}>
              {e.steps && <span>↳ {parseInt(e.steps).toLocaleString()} steps · </span>}
              ✦ {e.crunches || 0} · ◆ {e.planks || 0} · ▲ {e.pushups || 0}
              {e.stretches?.length > 0 && <span style={{ color: "#3a9e4f" }}> · 🧘 {e.stretches.join(", ")}</span>}
            </div>
          </div>
        );
        if (e._kind === "sleep") {
          const sc = scoreColor(e.sleepScore);
          const rc = scoreColor(e.readiness);
          return (
            <div key={e.id} style={{ ...g.card, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  {e.sleepScore && <span style={{ fontSize: 16, fontWeight: 700, color: sc, fontFamily: "'DM Mono', monospace" }}>{e.sleepScore} <span style={{ fontSize: 7, color: sc, letterSpacing: 2 }}>SLEEP</span></span>}
                  {e.readiness && <span style={{ fontSize: 16, fontWeight: 700, color: rc, fontFamily: "'DM Mono', monospace" }}>{e.readiness} <span style={{ fontSize: 7, color: rc, letterSpacing: 2 }}>READY</span></span>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={g.badge}>{e.date}</span>
                  <button onClick={() => deleteSleep(e.id)} style={{ background: "none", border: "1px solid #252525", color: "#555", padding: "3px 7px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>✕</button>
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#666" }}>
                {e.hoursSlept && `◑ ${e.hoursSlept}h`}{e.rem && ` · ◎ ${e.rem}rem`}{e.heartRate && ` · ♡ ${e.heartRate}`}{e.hrv && ` · ∿ ${e.hrv}`}{e.jhSpread && ` · ⚖ ${parseFloat(e.jhSpread) > 0 ? "+" : ""}${e.jhSpread}`}
              </div>
            </div>
          );
        }
        return null;
      })}
    </>
  )}
</div>
```

);
}

// ── SUPABASE CLIENT ────────────────────────────────────────────────────────
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

async function sbFetch(table, method, body = null, match = null) {
let url = `${SUPABASE_URL}/rest/v1/${table}`;
if (match) url += `?${new URLSearchParams(match)}`;
const res = await fetch(url, {
method,
headers: {
“Content-Type”: “application/json”,
“apikey”: SUPABASE_KEY,
“Authorization”: `Bearer ${SUPABASE_KEY}`,
“Prefer”: method === “POST” ? “return=representation” : “return=minimal”,
},
body: body ? JSON.stringify(body) : null,
});
if (method === “GET”) return res.json();
return res;
}

// Generate or retrieve a stable user ID stored in localStorage
function getUserId() {
let uid = localStorage.getItem(“rep_uid”);
if (!uid) {
uid = “user_” + Math.random().toString(36).slice(2, 11);
localStorage.setItem(“rep_uid”, uid);
}
return uid;
}

// ── ROOT ───────────────────────────────────────────────────────────────────
export default function App() {
const [tab, setTab] = useState(“workout”);
const [loading, setLoading] = useState(true);
const userId = getUserId();

const [history, setHistory] = useState([]);
const [dailyLog, setDailyLog] = useState([]);
const [sleepLog, setSleepLog] = useState([]);

// Load all data from Supabase on mount
useEffect(() => {
async function loadData() {
try {
let uid = userId;
// Try loading with current ID first
const [w, d, s] = await Promise.all([
sbFetch(“workouts”, “GET”, null, { user_id: `eq.${uid}`, order: “created_at.desc” }),
sbFetch(“daily_logs”, “GET”, null, { user_id: `eq.${uid}`, order: “created_at.desc” }),
sbFetch(“sleep_logs”, “GET”, null, { user_id: `eq.${uid}`, order: “created_at.desc” }),
]);
const workouts = Array.isArray(w) ? w : [];
const daily = Array.isArray(d) ? d : [];
const sleep = Array.isArray(s) ? s : [];

```
    // If no data found, try to find any existing user data in Supabase
    if (workouts.length === 0 && daily.length === 0 && sleep.length === 0) {
      // Fetch recent sleep logs without user filter to find the real user ID
      const allSleep = await sbFetch("sleep_logs", "GET", null, { order: "created_at.desc", limit: "1" });
      if (Array.isArray(allSleep) && allSleep.length > 0) {
        const realUid = allSleep[0].user_id;
        if (realUid && realUid !== uid) {
          // Found a different user ID — use it and save it
          localStorage.setItem("rep_uid", realUid);
          const [w2, d2, s2] = await Promise.all([
            sbFetch("workouts", "GET", null, { user_id: `eq.${realUid}`, order: "created_at.desc" }),
            sbFetch("daily_logs", "GET", null, { user_id: `eq.${realUid}`, order: "created_at.desc" }),
            sbFetch("sleep_logs", "GET", null, { user_id: `eq.${realUid}`, order: "created_at.desc" }),
          ]);
          setHistory(Array.isArray(w2) ? w2.map(r => r.data) : []);
          setDailyLog(Array.isArray(d2) ? d2.map(r => r.data) : []);
          setSleepLog(Array.isArray(s2) ? s2.map(r => r.data) : []);
          setLoading(false);
          return;
        }
      }
    }

    setHistory(workouts.map(r => r.data));
    setDailyLog(daily.map(r => r.data));
    setSleepLog(sleep.map(r => r.data));
  } catch(e) {
    console.error("Load error", e);
  }
  setLoading(false);
}
loadData();
```

}, []);

const persist = async (h, d, s) => {
// We persist individual entries — this is called after each save
// Individual saves handled in each tab’s save function
};

const saveWorkoutEntry = async (entry) => {
await sbFetch(“workouts”, “POST”, { user_id: userId, data: entry });
};

const saveDailyEntry = async (entry) => {
await sbFetch(“daily_logs”, “POST”, { user_id: userId, data: entry });
};

const saveSleepEntry = async (entry) => {
await sbFetch(“sleep_logs”, “POST”, { user_id: userId, data: entry });
};

const deleteWorkoutEntry = async (id) => {
const newH = history.filter(h => h.id !== id);
setHistory(newH);
// Delete by matching the id inside the data jsonb
await sbFetch(“workouts”, “DELETE”, null, { user_id: `eq.${userId}`, “data->>id”: `eq.${id}` });
};

const deleteDailyEntry = async (id) => {
const newD = dailyLog.filter(d => d.id !== id);
setDailyLog(newD);
await sbFetch(“daily_logs”, “DELETE”, null, { user_id: `eq.${userId}`, “data->>id”: `eq.${id}` });
};

const deleteSleepEntry = async (id) => {
const newS = sleepLog.filter(s => s.id !== id);
setSleepLog(newS);
await sbFetch(“sleep_logs”, “DELETE”, null, { user_id: `eq.${userId}`, “data->>id”: `eq.${id}` });
};

const todayDateStr = new Date().toLocaleDateString();
const todayDaily = dailyLog.find(d => {
// Match against today in any locale format
const entryDate = new Date(d.date);
const today = new Date();
return entryDate.toDateString() === today.toDateString();
});
const needsDailyLog = !todayDaily || !(todayDaily.crunches || todayDaily.planks || todayDaily.pushups);
const needsStretches = !todayDaily || !todayDaily.stretches?.length;
const needsReminder = needsDailyLog || needsStretches;

const TABS = [
{ key: “workout”, label: “WORKOUT”, flex: 2 },
{ key: “daily”,   label: “DAILY”,   flex: 1 },
{ key: “sleep”,   label: “SLEEP”,   flex: 1 },
{ key: “history”, label: “HISTORY”, flex: 1 },
];

return (
<>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
<div style={{ minHeight: “100vh”, background: “#0a0a0a”, color: “#e8e0d5”, fontFamily: “‘DM Mono’, monospace”, paddingBottom: 72 }}>

```
    {/* Header */}
    <div style={{ background: "#0a0a0a", borderBottom: "1px solid #141414", padding: "16px 20px 0", position: "sticky", top: 0, zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 15, letterSpacing: 6, color: "#ff4d00", fontWeight: 700 }}>REP</span>
        <span style={{ fontSize: 9, letterSpacing: 2, color: "#777" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}
        </span>
      </div>

      {/* Tab pills */}
      <div style={{ display: "flex", gap: 0, marginBottom: -1 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: t.flex || 1,
            background: "none", border: "none",
            borderBottom: `2px solid ${tab === t.key ? "#ff4d00" : "transparent"}`,
            color: tab === t.key ? "#e8e0d5" : "#333",
            padding: "10px 0 12px",
            fontFamily: "'DM Mono', monospace",
            fontSize: t.key === "workout" ? 11 : 8,
            letterSpacing: 3,
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.2s",
            fontWeight: tab === t.key ? 700 : 400,
            position: "relative",
          }}>
            {t.label}
            {t.key === "daily" && needsReminder && (
              <span style={{ position: "absolute", top: 8, right: "calc(50% - 14px)", width: 5, height: 5, borderRadius: "50%", background: "#ff4d00", display: "inline-block" }} />
            )}
          </button>
        ))}
      </div>
    </div>

    {/* Content */}
    {loading ? (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#ff4d00", textTransform: "uppercase" }}>Loading…</div>
        <div style={{ fontSize: 10, color: "#444", letterSpacing: 2 }}>Syncing your data</div>
      </div>
    ) : (
      <>
        {tab === "workout" && <WorkoutTab history={history} setHistory={setHistory} saveEntry={saveWorkoutEntry} deleteEntry={deleteWorkoutEntry} dailyLog={dailyLog} setDailyLog={setDailyLog} saveDailyEntry={saveDailyEntry} sleepLog={sleepLog} needsReminder={needsReminder} needsDailyLog={needsDailyLog} needsStretches={needsStretches} onGoToDaily={() => setTab("daily")} />}
        {tab === "daily"   && <DailyTab   dailyLog={dailyLog} setDailyLog={setDailyLog} saveEntry={saveDailyEntry} history={history} sleepLog={sleepLog} />}
        {tab === "sleep"   && <SleepTab   sleepLog={sleepLog} setSleepLog={setSleepLog} saveEntry={saveSleepEntry} history={history} dailyLog={dailyLog} />}
        {tab === "history" && <HistoryTab history={history} setHistory={setHistory} deleteWorkout={deleteWorkoutEntry} dailyLog={dailyLog} setDailyLog={setDailyLog} deleteDaily={deleteDailyEntry} sleepLog={sleepLog} setSleepLog={setSleepLog} deleteSleep={deleteSleepEntry} />}
      </>
    )}
  </div>
</>
```

);
}
