import { useState, useRef, useEffect } from "react";

const EXERCISE_DB = {
  chest:     { staples: ["Bench Press", "Incline Bench", "Cable Fly", "Dumbbell Press", "Push-Up"], alternatives: ["Decline Bench", "Pec Deck", "Landmine Press", "Dips", "Cable Crossover", "Chest Pullover", "Floor Press", "Svend Press"] },
  back:      { staples: ["Pull-Up", "Barbell Row", "Lat Pulldown", "Seated Cable Row", "Face Pull"], alternatives: ["T-Bar Row", "Single-Arm DB Row", "Meadows Row", "Chest-Supported Row", "Straight-Arm Pulldown", "Rack Pull", "Good Morning", "Reverse Fly"] },
  legs:      { staples: ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raise"], alternatives: ["Hack Squat", "Bulgarian Split Squat", "Leg Extension", "Walking Lunge", "Box Jump", "Sumo Deadlift", "Hip Thrust", "Goblet Squat"] },
  shoulders: { staples: ["Overhead Press", "Lateral Raise", "Front Raise", "Rear Delt Fly", "Arnold Press"], alternatives: ["Cable Lateral Rise", "Face Pull", "Upright Row", "Shrug", "Landmine Press", "Cuban Press", "Behind-Neck Press", "Plate Raise"] },
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
          <circle cx="29" cy="29" r="26" fill="none" stroke={completed ? "#3a9e4f" : running ? "#ff4d00" : "#2a2a2a"} strokeWidth="3.5" strokeDasharray={ci​​​​​​​​​​​​​​​​
