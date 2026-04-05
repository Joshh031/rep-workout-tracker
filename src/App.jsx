<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Daily Tracker" />
  <meta name="theme-color" content="#0f0f13" />
  <title>Daily Tracker</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
  <script>
    const firebaseConfig = {
      apiKey: "AIzaSyCcEKJOMx5nLuD_ftGLu0NBPJ8yr5FnekI",
      authDomain: "familyhub-d72f8.firebaseapp.com",
      projectId: "familyhub-d72f8",
      storageBucket: "familyhub-d72f8.firebasestorage.app",
      messagingSenderId: "242948947064",
      appId: "1:242948947064:web:fa31a7165c6f2d4f1f818d"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const TRACKER_DOC = db.collection("dailyTracker").doc("joshh031");
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f0f13; font-family: 'DM Mono', monospace; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #1a1a22; }
    ::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 2px; }
    .cat-row { display:flex; align-items:center; gap:10px; padding:8px 12px 8px 16px; border-radius:10px; transition:background 0.15s; user-select:none; -webkit-tap-highlight-color:transparent; }
    .cat-row:active { background:#1e1e2a; }
    .cat-row.checked { background:#1a2a1e; }
    .cat-row.penalty-row:active { background:#2a1a1a; }
    .cat-row.penalty-row.checked { background:#2a1a1a; }
    .check-box { width:22px; height:22px; border-radius:6px; border:2px solid #3b3b50; flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:all 0.15s; background:transparent; cursor:pointer; }
    .checked .check-box { background:#22c55e; border-color:#22c55e; }
    .penalty-row.checked .check-box { background:#ef4444; border-color:#ef4444; }
    .seg-btn { padding:5px 10px; border-radius:6px; border:none; cursor:pointer; font-size:12px; font-family:'DM Mono',monospace; font-weight:500; transition:all 0.12s; -webkit-tap-highlight-color:transparent; }
    .multi-row { display:flex; align-items:center; gap:10px; padding:8px 12px 8px 16px; border-radius:10px; }
    input[type="date"] { background:transparent; border:none; color:#666; font-family:'DM Mono',monospace; font-size:11px; outline:none; padding:0; cursor:pointer; letter-spacing:0.05em; }
    input[type="text"] { background:#1a1a22; border:1px solid #2a2a3a; color:#e2e8f0; border-radius:8px; padding:10px 12px; font-family:'DM Mono',monospace; font-size:14px; outline:none; }
    input[type="text"]:focus { border-color:#3b82f6; }
    textarea { background:#1a1a22; border:1px solid #2a2a3a; color:#e2e8f0; border-radius:12px; padding:12px 14px; font-family:'DM Mono',monospace; font-size:13px; outline:none; width:100%; resize:none; line-height:1.6; }
    textarea:focus { border-color:#3b82f6; }
    textarea::placeholder { color:#333; }
    .hist-row { padding:12px 16px; border-radius:10px; background:#1a1a22; margin-bottom:8px; display:flex; align-items:center; gap:12px; cursor:pointer; -webkit-tap-highlight-color:transparent; }
    .hist-row:active { background:#1e1e2a; }
    .section-label { font-size:10px; color:#555; letter-spacing:0.15em; padding:0 8px; margin-bottom:8px; }
    .tab-btn { flex:1; padding:10px 0; border:none; background:transparent; font-family:'DM Mono',monospace; font-size:11px; font-weight:500; letter-spacing:0.12em; cursor:pointer; transition:all 0.15s; margin-bottom:-1px; }
    .stat-card { background:#13131c; border:1px solid #1e1e2e; border-radius:14px; padding:16px; }
    .hist-sub-btn { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; border:none; cursor:pointer; font-family:'DM Mono',monospace; font-size:11px; font-weight:500; letter-spacing:0.08em; transition:all 0.15s; -webkit-tap-highlight-color:transparent; }
    .cat-drill-row { display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:10px; cursor:pointer; -webkit-tap-highlight-color:transparent; }
    .cat-drill-row:active { background:#1e1e2a; }
    .back-btn { display:flex; align-items:center; gap:6px; background:none; border:none; color:#555; font-family:'DM Mono',monospace; font-size:11px; cursor:pointer; padding:0; letter-spacing:0.08em; -webkit-tap-highlight-color:transparent; }
    .reorder-btn { background:none; border:none; color:#333; cursor:pointer; padding:3px 4px; border-radius:4px; font-size:14px; line-height:1; -webkit-tap-highlight-color:transparent; display:flex; align-items:center; justify-content:center; transition:color 0.1s; }
    .reorder-btn:active { color:#888; }
    .reorder-col { display:flex; flex-direction:column; gap:0px; flex-shrink:0; }
    .edit-mode-btn { background:none; border:1px solid #2a2a3a; color:#555; font-family:'DM Mono',monospace; font-size:10px; letter-spacing:0.1em; padding:4px 10px; border-radius:6px; cursor:pointer; -webkit-tap-highlight-color:transparent; }
    .edit-mode-btn.active { border-color:#3b82f6; color:#3b82f6; }
    .coach-btn { width:100%; padding:14px; border-radius:12px; border:none; cursor:pointer; font-family:'DM Mono',monospace; font-size:12px; font-weight:500; letter-spacing:0.1em; transition:all 0.2s; -webkit-tap-highlight-color:transparent; }
    .coach-btn:disabled { opacity:0.5; cursor:not-allowed; }
    .coach-section { background:linear-gradient(145deg,#0d0d1a,#13131f); border:1px solid #23233a; border-radius:16px; padding:20px; margin-bottom:12px; }
    .coach-period-btn { padding:6px 14px; border-radius:8px; border:none; cursor:pointer; font-family:'DM Mono',monospace; font-size:11px; font-weight:500; letter-spacing:0.08em; transition:all 0.15s; -webkit-tap-highlight-color:transparent; }
    .insight-block { background:#0f0f13; border-radius:12px; padding:14px 16px; margin-bottom:10px; border-left:3px solid #3b82f6; }
    .insight-block.warning { border-left-color:#f59e0b; }
    .insight-block.success { border-left-color:#22c55e; }
    .insight-block.tip { border-left-color:#a855f7; }
    input[type="password"] { background:#1a1a22; border:1px solid #2a2a3a; color:#e2e8f0; border-radius:8px; padding:10px 12px; font-family:'DM Mono',monospace; font-size:13px; outline:none; width:100%; }
    input[type="password"]:focus { border-color:#3b82f6; }
    .block-header { display:flex; align-items:center; justify-content:space-between; padding:10px 16px 6px; cursor:pointer; -webkit-tap-highlight-color:transparent; }
    .block-header:active { opacity:0.7; }
    .block-pill { font-size:9px; letter-spacing:0.15em; padding:3px 8px; border-radius:20px; font-weight:500; }
    .midday-banner { margin:12px 16px 0; border-radius:14px; padding:14px 16px; display:flex; align-items:center; gap:12px; }
    .commit-item { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:10px; cursor:pointer; -webkit-tap-highlight-color:transparent; }
    .commit-item:active { background:#1e1e2a; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useCallback, useMemo, useEffect } = React;

    const MULTI_CATEGORIES = {
      gym:          { label:"Gym",           emoji:"🏋️", options:[{label:"Skip",value:0},{label:"Lift",value:10},{label:"Run",value:15}] },
      njow:         { label:"NJOW",          emoji:"🏃", options:[{label:"0",value:0},{label:"2",value:2},{label:"3",value:3},{label:"4",value:4},{label:"5",value:5}] },
      stretch:      { label:"Stretch",       emoji:"🤸", options:[{label:"0",value:0},{label:"1",value:3},{label:"2",value:6},{label:"3",value:9},{label:"4",value:12}] },
      minimizespend:{ label:"Minimize Spend",emoji:"💰", options:[{label:"—",value:0},{label:"Good",value:5},{label:"Great",value:10}] },
    };

    // block: "am" | "mid" | "pm"
    const DEFAULT_CATEGORIES = [
      { key:"gym",          label:"Gym",               points:10, emoji:"🏋️", multi:true, block:"am" },
      { key:"njow",         label:"NJOW",               points:0,  emoji:"🏃", multi:true, block:"am" },
      { key:"crunches",     label:"Crunches",           points:4,  emoji:"💪", block:"am" },
      { key:"planks",       label:"Planks",             points:4,  emoji:"🧘", block:"am" },
      { key:"pushups",      label:"40+ Pushups",        points:3,  emoji:"🔥", block:"am" },
      { key:"breathing",    label:"4x4 Breathing",      points:5,  emoji:"🌬️", block:"am" },
      { key:"eyecare",      label:"Eye Care",           points:3,  emoji:"👁️", block:"am" },
      { key:"mirroring",    label:"Mirroring",          points:10, emoji:"🪞", block:"am" },
      { key:"shave",        label:"Shave",              points:5,  emoji:"✂️", block:"am" },
      { key:"forearms",     label:"Forearms",           points:2,  emoji:"💪", block:"am" },
      { key:"sleep7",       label:"Sleep 7 Hours",      points:8,  emoji:"😴", block:"am" },
      { key:"irestore",     label:"IRestore",           points:5,  emoji:"🪴", block:"mid" },
      { key:"omnilux",      label:"Omnilux",            points:3,  emoji:"💡", block:"mid" },
      { key:"hair",         label:"Hair",               points:3,  emoji:"💇", block:"mid" },
      { key:"stretch",      label:"Stretch",            points:12, emoji:"🤸", multi:true, block:"mid" },
      { key:"whitening",    label:"Whitening",          points:9,  emoji:"😁", block:"mid" },
      { key:"arabic",       label:"Arabic",             points:6,  emoji:"🌍", block:"mid" },
      { key:"roomclean",    label:"Room Clean",         points:1,  emoji:"🧹", block:"mid" },
      { key:"officeclean",  label:"Clean Office",       points:1,  emoji:"🗂️", block:"mid" },
      { key:"recordfood",   label:"Record Food",        points:3,  emoji:"🥗", block:"mid" },
      { key:"hydrate",      label:"Sufficient Hydrate", points:5,  emoji:"💧", block:"mid" },
      { key:"steps10k",     label:"10k Steps",          points:3,  emoji:"👟", block:"pm" },
      { key:"geopol",       label:"Geopol Futures",     points:3,  emoji:"🗺️", block:"mid" },
      { key:"podcast",      label:"Podcast",            points:5,  emoji:"🎙️", block:"mid" },
      { key:"kidssports",   label:"Kids Sports",        points:5,  emoji:"⚽", block:"mid" },
      { key:"readmacro",    label:"Read All Macro",     points:6,  emoji:"📊", block:"mid" },
      { key:"kidsstudy",    label:"Kids Study/Read",    points:7,  emoji:"📖", block:"pm" },
      { key:"minimizespend",label:"Minimize Spend",     points:10, emoji:"💰", multi:true, block:"pm" },
      { key:"hip",          label:"Hip",                points:5,  emoji:"🦴", block:"am" },
      { key:"cerave",       label:"Nighttime CeraVe",   points:3,  emoji:"🧴", block:"pm" },
      { key:"psoriasis",    label:"Psoriasis",          points:3,  emoji:"🧴", block:"am" },
      { key:"feet",         label:"Feet",               points:3,  emoji:"🦶", block:"am" },
      { key:"journaling",   label:"Journaling",         points:4,  emoji:"✍️", block:"pm" },
      { key:"social",       label:"Social Effort",      points:5,  emoji:"🤝", block:"pm" },
      { key:"read45",       label:"Read 45 mins",       points:5,  emoji:"📚", block:"pm" },
      { key:"readbook",     label:"Read Book",          points:5,  emoji:"📕", block:"pm" },
      { key:"limitbooze",   label:"Limit Booze",        points:2,  emoji:"🍷", block:"pm" },
      { key:"callparents",  label:"Call Parents",       points:5,  emoji:"📞", block:"pm" },
      { key:"sauna",        label:"Sauna",              points:4,  emoji:"🔆", block:"pm" },
      { key:"smell",        label:"Smell",              points:3,  emoji:"🌸", block:"pm" },
      { key:"completebook", label:"Complete Book",      points:5,  emoji:"📗", block:"pm" },
      { key:"wordle",       label:"Wordle",             points:2,  emoji:"🟩", block:"pm" },
      { key:"starchart",    label:"Kids Star Chart",    points:2,  emoji:"⭐", block:"pm" },
      { key:"psoriasispm",  label:"Psoriasis PM",       points:1,  emoji:"🧴", block:"pm" },
      { key:"tongue",       label:"Tongue",              points:1,  emoji:"👅", block:"pm" },
      { key:"sweets",       label:"Ate Sweets",         points:-5, emoji:"🍬", penalty:true },
    ];

    const BLOCKS = [
      { id:"am",  label:"MORNING",   emoji:"🌅", color:"#f59e0b" },
      { id:"mid", label:"MIDDAY",    emoji:"☀️",  color:"#3b82f6" },
      { id:"pm",  label:"EVENING",   emoji:"🌙", color:"#a855f7" },
    ];

    const WEEKDAY_GOAL = 100;
    const WEEKEND_GOAL = 75;
    const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    function isWeekend(d) { const day=new Date(d+"T12:00:00").getDay(); return day===0||day===6; }
    function getTodayStr() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
    function formatDate(d) { const dt=new Date(d+"T12:00:00"); return `${DAYS[dt.getDay()]} ${dt.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`; }
    function formatShort(d) { const dt=new Date(d+"T12:00:00"); return dt.toLocaleDateString("en-US",{month:"short",day:"numeric"}); }
    function getCatPoints(cat,e) { if(cat.multi) return typeof e[cat.key]==="number"?e[cat.key]:0; return e[cat.key]?cat.points:0; }
    function getDayTotal(cats,e) { return cats.reduce((s,c)=>s+getCatPoints(c,e),0); }
    function lsGet(k,fb) { try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch{return fb;} }
    function lsSet(k,v) { try{localStorage.setItem(k,JSON.stringify(v));}catch{} }
    function getCurrentBlock() {
      const h=new Date().getHours();
      if(h<11) return "am";
      if(h<18) return "mid";
      return "pm";
    }
    function isMidday() { const h=new Date().getHours(); return h>=11&&h<14; }
    function isSaturday() { return new Date().getDay()===6; }

    function buildOrderedCats(savedOrder, savedBlocks) {
      const map = Object.fromEntries(DEFAULT_CATEGORIES.map(c=>[c.key,c]));
      // Apply any custom block overrides
      if (savedBlocks) {
        Object.entries(savedBlocks).forEach(([key,block]) => { if(map[key]) map[key]={...map[key],block}; });
      }
      if (!savedOrder || !savedOrder.length) return Object.values(map);
      const ordered = savedOrder.map(k=>map[k]).filter(Boolean);
      const missing = DEFAULT_CATEGORIES.filter(c=>!savedOrder.includes(c.key)).map(c=>map[c.key]);
      return [...ordered, ...missing];
    }

    // ── Bar Chart ─────────────────────────────────────────────────────────────
    function BarChart({ data, height=120 }) {
      if (!data.length) return null;
      const W=Math.min(window.innerWidth-64,420);
      const barW=Math.max(4,Math.floor((W-data.length*2)/data.length));
      const maxVal=Math.max(...data.map(d=>d.val),1);
      const chartH=height-20;
      return (
        <svg width={W} height={height} style={{overflow:"visible"}}>
          {data.map((d,i)=>{ const x=i*(barW+2); const barH=Math.max(2,Math.round((d.val/maxVal)*chartH)); const color=d.hit?"#22c55e":d.val>=d.goal*0.8?"#f59e0b":"#3b3b50"; return <rect key={d.date} x={x} y={chartH-barH} width={barW} height={barH} rx="2" fill={color} opacity="0.85"/>; })}
          {(()=>{ const avg=data.reduce((s,d)=>s+d.val,0)/data.length; const avgY=chartH-Math.round((avg/maxVal)*chartH); return <line x1={0} y1={avgY} x2={data.length*(barW+2)-2} y2={avgY} stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" opacity="0.6"/>; })()}
        </svg>
      );
    }

    // ── Category Drill ────────────────────────────────────────────────────────
    function CategoryDrillChart({ cat, entries, onBack }) {
      const sorted=Object.keys(entries).sort();
      const data=sorted.map(date=>{ const e=entries[date]||{}; const earned=getCatPoints(cat,e); return {date,earned,did:cat.multi?earned>0:!!e[cat.key]}; });
      const daysDid=data.filter(d=>d.did).length;
      const pct=data.length?Math.round((daysDid/data.length)*100):0;
      const streak=(()=>{ let s=0; for(let i=data.length-1;i>=0;i--){ if(data[i].did)s++; else break; } return s; })();
      const last30=data.slice(-30);
      const W=Math.min(window.innerWidth-64,420);
      const barW=Math.max(4,Math.floor((W-last30.length*2)/last30.length));
      const maxVal=cat.multi?Math.max(...(MULTI_CATEGORIES[cat.key]?.options||[]).map(o=>o.value),1):1;
      return (
        <div>
          <div style={{padding:"16px 20px 0"}}><button className="back-btn" onClick={onBack}>← BACK</button></div>
          <div style={{margin:"12px 16px 0",background:"linear-gradient(145deg,#13131c,#1a1a28)",border:"1px solid #23233a",borderRadius:16,padding:"20px"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <span style={{fontSize:28}}>{cat.emoji}</span>
              <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,color:"#fff"}}>{cat.label}</div><div style={{fontSize:10,color:"#555",letterSpacing:"0.1em",marginTop:2}}>{cat.points>0?`+${cat.points}`:`${cat.points}`} PTS PER DAY</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              {[{label:"COMPLETION",val:`${pct}%`},{label:"DAYS DONE",val:daysDid},{label:"STREAK",val:`${streak}d`}].map(s=>(
                <div key={s.label} style={{background:"#0f0f13",borderRadius:10,padding:"10px 12px"}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:"#fff"}}>{s.val}</div><div style={{fontSize:9,color:"#444",letterSpacing:"0.12em",marginTop:2}}>{s.label}</div></div>
              ))}
            </div>
          </div>
          {last30.length>0&&(
            <div style={{margin:"12px 16px 0",background:"#13131c",border:"1px solid #1e1e2e",borderRadius:14,padding:"16px"}}>
              <div className="section-label" style={{marginBottom:12}}>LAST {last30.length} DAYS</div>
              {cat.multi?(
                <svg width={Math.min(window.innerWidth-64,420)} height={80} style={{overflow:"visible"}}>
                  {last30.map((d,i)=>{ const x=i*(barW+2); const barH=Math.max(2,Math.round((d.earned/Math.max(maxVal,1))*60)); return <rect key={d.date} x={x} y={60-barH} width={barW} height={barH} rx="2" fill={d.did?"#22c55e":"#1e1e2e"} opacity="0.9"/>; })}
                </svg>
              ):(
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {last30.map(d=><div key={d.date} style={{width:16,height:16,borderRadius:4,background:d.did?"#22c55e":"#1e1e2e",border:"1px solid",borderColor:d.did?"#22c55e33":"#2a2a3a"}}/>)}
                </div>
              )}
            </div>
          )}
          <div style={{padding:"12px 16px 32px"}}>
            <div className="section-label" style={{marginBottom:8}}>ALL ENTRIES</div>
            {[...data].reverse().map(d=>(
              <div key={d.date} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 4px",borderBottom:"1px solid #13131c"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:d.did?"#22c55e":"#2a2a3a",flexShrink:0}}/>
                <div style={{flex:1,fontSize:12,color:"#888"}}>{formatDate(d.date)}</div>
                <div style={{fontSize:13,fontWeight:500,color:d.did?"#22c55e":"#333"}}>{cat.multi?(d.earned>0?`+${d.earned}`:"—"):(d.did?`+${cat.points}`:"—")}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── AI Coach ──────────────────────────────────────────────────────────────
    function AICoach({ entries, CATEGORIES, allTotals, catStats, sortedDates }) {
      const [apiKey,setApiKey]=useState(()=>lsGet("tracker_apikey",""));
      const [showKey,setShowKey]=useState(false);
      const [period,setPeriod]=useState("week");
      const [loading,setLoading]=useState(false);
      const [advice,setAdvice]=useState(()=>lsGet("tracker_advice",null));
      const [advicePeriod,setAdvicePeriod]=useState(()=>lsGet("tracker_advice_period",null));
      const [error,setError]=useState("");
      function saveKey(k){setApiKey(k);lsSet("tracker_apikey",k);}
      function buildPayload(){
        const now=new Date(); const cutoff=new Date(now);
        if(period==="week")cutoff.setDate(cutoff.getDate()-7); else cutoff.setDate(cutoff.getDate()-30);
        const cutoffStr=cutoff.toISOString().slice(0,10);
        const periodDates=sortedDates.filter(d=>d>=cutoffStr);
        const periodEntries=periodDates.map(d=>({date:d,total:getDayTotal(CATEGORIES,entries[d]||{}),goal:isWeekend(d)?WEEKEND_GOAL:WEEKDAY_GOAL}));
        const periodCatStats=CATEGORIES.filter(c=>!c.penalty).map(cat=>{
          const done=periodDates.filter(d=>getCatPoints(cat,entries[d]||{})>0).length;
          return {label:cat.label,points:cat.points,block:cat.block,done,total:periodDates.length,pct:periodDates.length?Math.round((done/periodDates.length)*100):0};
        }).sort((a,b)=>a.pct-b.pct);
        const weekdays=periodEntries.filter(d=>!isWeekend(d.date));
        const weekends=periodEntries.filter(d=>isWeekend(d.date));
        const wdAvg=weekdays.length?Math.round(weekdays.reduce((s,d)=>s+d.total,0)/weekdays.length):null;
        const weAvg=weekends.length?Math.round(weekends.reduce((s,d)=>s+d.total,0)/weekends.length):null;
        const avgScore=periodEntries.length?Math.round(periodEntries.reduce((s,d)=>s+d.total,0)/periodEntries.length):0;
        const goalRate=periodEntries.length?Math.round((periodEntries.filter(d=>d.total>=d.goal).length/periodEntries.length)*100):0;
        const streaks=CATEGORIES.filter(c=>!c.penalty).map(cat=>{let s=0;for(let i=sortedDates.length-1;i>=0;i--){if(getCatPoints(cat,entries[sortedDates[i]]||{})>0)s++;else break;}return{label:cat.label,streak:s};}).filter(s=>s.streak>0).sort((a,b)=>b.streak-a.streak).slice(0,8);
        return {period,daysTracked:periodDates.length,avgScore,goalRate,wdAvg,weAvg,periodCatStats,streaks};
      }
      async function generate(){
        if(!apiKey.trim()){setError("Please enter your Anthropic API key below.");return;}
        if(sortedDates.length===0){setError("No tracking data yet — log some days first!");return;}
        setLoading(true);setError("");
        try{
          const data=buildPayload();
          const prompt=`You are a personal productivity and wellness coach analyzing someone's daily habit tracking data. Their day is split into Morning, Midday, and Evening blocks.

OVERVIEW (last ${data.period==="week"?"7":"30"} days):
- Days tracked: ${data.daysTracked}
- Average daily score: ${data.avgScore} pts (weekday goal: 100, weekend goal: 75)
- Goal hit rate: ${data.goalRate}%
- Weekday avg: ${data.wdAvg!==null?data.wdAvg+" pts":"no data"}
- Weekend avg: ${data.weAvg!==null?data.weAvg+" pts":"no data"}

CATEGORY PERFORMANCE by block (sorted worst to best):
${data.periodCatStats.map(c=>`- [${c.block?.toUpperCase()||"?"}] ${c.label} (${c.points}pts): ${c.pct}% (${c.done}/${c.total} days)`).join("\n")}

CURRENT STREAKS:
${data.streaks.length?data.streaks.map(s=>`- ${s.label}: ${s.streak} days`).join("\n"):"No active streaks"}

Return ONLY valid JSON, no markdown:
{"headline":"One punchy sentence","score_trend":"2-3 sentences on trend and momentum","winning":[{"category":"name","insight":"1 sentence"}],"needs_work":[{"category":"name","insight":"specific reason","fix":"concrete time-block tip referencing their AM/Mid/PM structure"}],"weekday_weekend":"observation or null","streak_momentum":"observation","priority_this_week":"single most impactful specific action"}

2-3 winning items, 3-5 needs_work items. Be direct, reference actual categories and their time blocks.`;
          const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey.trim(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,messages:[{role:"user",content:prompt}]})});
          if(!res.ok){const e=await res.json();throw new Error(e.error?.message||`API error ${res.status}`);}
          const json=await res.json();
          const clean=json.content[0].text.replace(/```json|```/g,"").trim();
          const parsed=JSON.parse(clean);
          setAdvice(parsed);setAdvicePeriod(period);lsSet("tracker_advice",parsed);lsSet("tracker_advice_period",period);
        }catch(e){setError(e.message||"Something went wrong. Check your API key.");}
        setLoading(false);
      }
      return (
        <div style={{padding:"0 16px 40px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:800,color:"#fff",letterSpacing:"0.05em"}}>🤖 AI COACH</div>
            <div style={{display:"flex",gap:6}}>
              {["week","month"].map(p=><button key={p} className="coach-period-btn" onClick={()=>setPeriod(p)} style={{background:period===p?"#1e1e2e":"transparent",color:period===p?"#e2e8f0":"#444",border:`1px solid ${period===p?"#2a2a3a":"transparent"}`}}>{p.toUpperCase()}</button>)}
            </div>
          </div>
          <button className="coach-btn" onClick={generate} disabled={loading} style={{background:loading?"#1e1e2e":"linear-gradient(135deg,#1a237e,#1565c0)",color:loading?"#555":"#fff",marginBottom:16}}>
            {loading?"⏳  ANALYZING YOUR DATA...":"✦  GENERATE COACHING ANALYSIS"}
          </button>
          {error&&<div style={{background:"#2a1a1a",border:"1px solid #ef444433",borderRadius:10,padding:"12px 14px",marginBottom:12,fontSize:12,color:"#f87171",lineHeight:1.6}}>{error}</div>}
          {advice&&<div>
            <div className="coach-section" style={{marginBottom:12}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:"#fff",lineHeight:1.4,marginBottom:8}}>{advice.headline}</div>
              <div style={{fontSize:12,color:"#888",lineHeight:1.7}}>{advice.score_trend}</div>
            </div>
            <div className="insight-block tip" style={{marginBottom:12}}>
              <div style={{fontSize:9,color:"#a855f7",letterSpacing:"0.15em",marginBottom:6}}>★ PRIORITY THIS WEEK</div>
              <div style={{fontSize:13,color:"#e2e8f0",lineHeight:1.6}}>{advice.priority_this_week}</div>
            </div>
            {advice.needs_work?.length>0&&<div style={{marginBottom:12}}>
              <div className="section-label" style={{marginBottom:8}}>NEEDS WORK</div>
              {advice.needs_work.map((item,i)=><div key={i} className="insight-block warning" style={{marginBottom:8}}>
                <div style={{fontSize:11,color:"#f59e0b",fontWeight:500,marginBottom:4}}>{item.category}</div>
                <div style={{fontSize:12,color:"#aaa",lineHeight:1.6,marginBottom:6}}>{item.insight}</div>
                <div style={{fontSize:12,color:"#e2e8f0",lineHeight:1.6,borderTop:"1px solid #2a2a3a",paddingTop:6}}>→ {item.fix}</div>
              </div>)}
            </div>}
            {advice.winning?.length>0&&<div style={{marginBottom:12}}>
              <div className="section-label" style={{marginBottom:8}}>GOING WELL</div>
              {advice.winning.map((item,i)=><div key={i} className="insight-block success" style={{marginBottom:8}}>
                <div style={{fontSize:11,color:"#22c55e",fontWeight:500,marginBottom:4}}>{item.category}</div>
                <div style={{fontSize:12,color:"#aaa",lineHeight:1.6}}>{item.insight}</div>
              </div>)}
            </div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {advice.weekday_weekend&&advice.weekday_weekend!=="null"&&<div className="insight-block" style={{marginBottom:0}}><div style={{fontSize:9,color:"#3b82f6",letterSpacing:"0.12em",marginBottom:6}}>WD VS WE</div><div style={{fontSize:11,color:"#aaa",lineHeight:1.6}}>{advice.weekday_weekend}</div></div>}
              {advice.streak_momentum&&<div className="insight-block" style={{marginBottom:0}}><div style={{fontSize:9,color:"#3b82f6",letterSpacing:"0.12em",marginBottom:6}}>MOMENTUM</div><div style={{fontSize:11,color:"#aaa",lineHeight:1.6}}>{advice.streak_momentum}</div></div>}
            </div>
            <div style={{fontSize:9,color:"#2a2a3a",textAlign:"center",letterSpacing:"0.1em",marginTop:4}}>LAST GENERATED FOR {advicePeriod?.toUpperCase()} — TAP TO REFRESH</div>
          </div>}
          <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid #1a1a22"}}>
            <div style={{fontSize:9,color:"#333",letterSpacing:"0.15em",marginBottom:8}}>ANTHROPIC API KEY</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type={showKey?"text":"password"} placeholder="sk-ant-..." value={apiKey} onChange={e=>saveKey(e.target.value)}/>
              <button onClick={()=>setShowKey(v=>!v)} style={{background:"none",border:"1px solid #2a2a3a",color:"#555",padding:"10px 12px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",flexShrink:0,whiteSpace:"nowrap"}}>{showKey?"HIDE":"SHOW"}</button>
            </div>
            <div style={{fontSize:9,color:"#2a2a3a",marginTop:6,letterSpacing:"0.08em"}}>KEY STORED LOCALLY ON YOUR DEVICE ONLY</div>
          </div>
        </div>
      );
    }

    // ── Category Block Section ────────────────────────────────────────────────
    function BlockSection({ block, cats, cur, editMode, onToggle, onSetMulti, onMove, totalCats, blockIdx }) {
      const [collapsed, setCollapsed] = useState(false);
      const blockCats = cats.filter(c=>c.block===block.id&&!c.penalty);
      if (!blockCats.length) return null;
      const earned = blockCats.reduce((s,c)=>s+getCatPoints(c,cur),0);
      const possible = blockCats.reduce((s,c)=>{ if(c.multi){ const def=MULTI_CATEGORIES[c.key]; return s+Math.max(...(def?.options||[]).map(o=>o.value),0); } return s+c.points; },0);
      const doneCount = blockCats.filter(c=>getCatPoints(c,cur)>0).length;

      return (
        <div style={{marginBottom:4}}>
          <div className="block-header" onClick={()=>!editMode&&setCollapsed(v=>!v)}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14}}>{block.emoji}</span>
              <span style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:800,color:block.color,letterSpacing:"0.15em"}}>{block.label}</span>
              <span className="block-pill" style={{background:block.color+"18",color:block.color}}>{doneCount}/{blockCats.length}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:"#555",fontWeight:500}}>{earned>0?`+${earned}`:""}</span>
              {!editMode&&<span style={{fontSize:12,color:"#333"}}>{collapsed?"▶":"▼"}</span>}
            </div>
          </div>
          {(!collapsed||editMode)&&blockCats.map((cat,idx)=>{
            const allIdx = cats.findIndex(c=>c.key===cat.key);
            const isFirst = allIdx===0;
            const isLast = allIdx===cats.length-1;
            if(cat.multi){
              const def=MULTI_CATEGORIES[cat.key];
              const val=typeof cur[cat.key]==="number"?cur[cat.key]:0;
              const active=val>0;
              return (
                <div key={cat.key} style={{display:"flex",alignItems:"center",gap:4}}>
                  {editMode&&<div className="reorder-col"><button className="reorder-btn" onClick={()=>onMove(cat.key,-1)} style={{opacity:isFirst?0.15:1}}>▲</button><button className="reorder-btn" onClick={()=>onMove(cat.key,1)} style={{opacity:isLast?0.15:1}}>▼</button></div>}
                  <div className="multi-row" style={{flex:1,background:active?"#1a2a1e":"transparent"}}>
                    <span style={{fontSize:16}}>{cat.emoji}</span>
                    <span style={{flex:1,fontSize:13,color:active?"#86efac":"#c0c0d0"}}>{cat.label}</span>
                    <div style={{display:"flex",gap:4}}>{def.options.map(o=><button key={o.value} className="seg-btn" onClick={()=>onSetMulti(cat.key,o.value)} style={{background:val===o.value?"#3b82f6":"#1e1e2a",color:val===o.value?"#fff":"#666"}}>{o.label}</button>)}</div>
                    <span style={{fontSize:12,color:active?"#22c55e":"#444",fontWeight:500,minWidth:28,textAlign:"right"}}>+{val}</span>
                  </div>
                </div>
              );
            }
            const checked=!!cur[cat.key];
            return (
              <div key={cat.key} style={{display:"flex",alignItems:"center",gap:4}}>
                {editMode&&<div className="reorder-col"><button className="reorder-btn" onClick={()=>onMove(cat.key,-1)} style={{opacity:isFirst?0.15:1}}>▲</button><button className="reorder-btn" onClick={()=>onMove(cat.key,1)} style={{opacity:isLast?0.15:1}}>▼</button></div>}
                <div className={`cat-row ${checked?"checked":""}`} style={{flex:1}} onClick={()=>!editMode&&onToggle(cat.key)}>
                  <div className="check-box" onClick={e=>{e.stopPropagation();onToggle(cat.key);}}>
                    {checked&&<svg width="13" height="10" viewBox="0 0 13 10"><polyline points="1,5 5,9 12,1" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{fontSize:16}}>{cat.emoji}</span>
                  <span style={{flex:1,fontSize:13,color:checked?"#86efac":"#c0c0d0"}}>{cat.label}</span>
                  <span style={{fontSize:12,color:checked?"#22c55e":"#444",fontWeight:500}}>+{cat.points}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // ── Weekend Commit List ───────────────────────────────────────────────────
    function WeekendCommitList({ CATEGORIES, cur, onToggle, onSetMulti, commitKeys, setCommitKeys }) {
      const [picking, setPicking] = useState(false);
      const regular = CATEGORIES.filter(c=>!c.penalty);
      const committed = regular.filter(c=>commitKeys.includes(c.key));

      function toggleCommit(key) {
        setCommitKeys(prev => prev.includes(key) ? prev.filter(k=>k!==key) : prev.length<8 ? [...prev,key] : prev);
      }

      return (
        <div style={{margin:"12px 16px 0",background:"linear-gradient(145deg,#0d1a0d,#131f13)",border:"1px solid #1e3a1e",borderRadius:16,overflow:"hidden"}}>
          <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:800,color:"#22c55e",letterSpacing:"0.1em"}}>🎯 WEEKEND COMMIT LIST</div>
              <div style={{fontSize:10,color:"#3b5a3b",marginTop:2}}>Pick up to 8 priorities for today</div>
            </div>
            <button onClick={()=>setPicking(v=>!v)} className="edit-mode-btn" style={{borderColor:picking?"#22c55e":"#2a2a3a",color:picking?"#22c55e":"#555"}}>
              {picking?"DONE":"EDIT"}
            </button>
          </div>

          {picking?(
            <div style={{padding:"0 12px 12px",maxHeight:300,overflowY:"auto"}}>
              <div style={{fontSize:9,color:"#3b5a3b",letterSpacing:"0.12em",padding:"0 4px",marginBottom:6}}>{commitKeys.length}/8 SELECTED</div>
              {regular.map(cat=>{
                const sel=commitKeys.includes(cat.key);
                return <div key={cat.key} className="commit-item" onClick={()=>toggleCommit(cat.key)} style={{background:sel?"#1a2a1a":"transparent"}}>
                  <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${sel?"#22c55e":"#2a2a3a"}`,background:sel?"#22c55e":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {sel&&<svg width="10" height="8" viewBox="0 0 10 8"><polyline points="1,4 4,7 9,1" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{fontSize:14}}>{cat.emoji}</span>
                  <span style={{flex:1,fontSize:13,color:sel?"#86efac":"#888"}}>{cat.label}</span>
                  <span style={{fontSize:11,color:sel?"#22c55e":"#333"}}>+{cat.points}</span>
                </div>;
              })}
            </div>
          ):(
            <div style={{padding:"0 12px 12px"}}>
              {committed.length===0?(
                <div style={{textAlign:"center",color:"#2a4a2a",fontSize:12,padding:"16px 0"}}>Tap EDIT to pick your priorities</div>
              ):committed.map(cat=>{
                const checked=cat.multi?(typeof cur[cat.key]==="number"&&cur[cat.key]>0):!!cur[cat.key];
                const def=cat.multi?MULTI_CATEGORIES[cat.key]:null;
                return (
                  <div key={cat.key} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 4px",borderBottom:"1px solid #1a2a1a"}}>
                    <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${checked?"#22c55e":"#2a3a2a"}`,background:checked?"#22c55e":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer"}}
                      onClick={()=>!cat.multi&&onToggle(cat.key)}>
                      {checked&&<svg width="10" height="8" viewBox="0 0 10 8"><polyline points="1,4 4,7 9,1" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{fontSize:15}}>{cat.emoji}</span>
                    <span style={{flex:1,fontSize:13,color:checked?"#86efac":"#c0c0d0",textDecoration:checked?"line-through":"none"}}>{cat.label}</span>
                    {cat.multi&&def?(
                      <div style={{display:"flex",gap:3}}>{def.options.map(o=><button key={o.value} className="seg-btn" onClick={()=>onSetMulti(cat.key,o.value)} style={{background:(cur[cat.key]||0)===o.value?"#22c55e":"#1e2a1e",color:(cur[cat.key]||0)===o.value?"#fff":"#555",padding:"3px 7px",fontSize:10}}>{o.label}</button>)}</div>
                    ):<span style={{fontSize:11,color:checked?"#22c55e":"#333"}}>+{cat.points}</span>}
                  </div>
                );
              })}
              {committed.length>0&&(
                <div style={{display:"flex",justifyContent:"space-between",padding:"8px 4px 0"}}>
                  <span style={{fontSize:10,color:"#3b5a3b"}}>{committed.filter(c=>c.multi?(cur[c.key]||0)>0:!!cur[c.key]).length}/{committed.length} done</span>
                  <span style={{fontSize:10,color:"#22c55e",fontWeight:500}}>+{committed.reduce((s,c)=>s+getCatPoints(c,cur),0)} pts</span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // ── Broker Edit Panel ────────────────────────────────────────────────────────
    function BrokerEditPanel({ broker, updateBroker, deleteBroker }) {
      return (
        <div style={{padding:"0 14px 14px",borderTop:"1px solid #1a1a22"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12,marginBottom:10}}>
            <div>
              <div style={{fontSize:9,color:"#555",letterSpacing:"0.12em",marginBottom:6}}>LAST CATCHUP</div>
              <input type="date" value={broker.lastDate||""} onChange={e=>updateBroker(broker.name,"lastDate",e.target.value)}
                style={{background:"#1a1a22",border:"1px solid #2a2a3a",color:"#e2e8f0",borderRadius:8,padding:"8px 10px",fontFamily:"'DM Mono',monospace",fontSize:12,outline:"none",width:"100%"}}/>
            </div>
            <div>
              <div style={{fontSize:9,color:"#3b82f6",letterSpacing:"0.12em",marginBottom:6}}>NEXT MEETING</div>
              <input type="date" value={broker.nextDate||""} onChange={e=>updateBroker(broker.name,"nextDate",e.target.value)}
                style={{background:"#1a1a22",border:"1px solid #1e2a3a",color:"#e2e8f0",borderRadius:8,padding:"8px 10px",fontFamily:"'DM Mono',monospace",fontSize:12,outline:"none",width:"100%"}}/>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,color:"#555",letterSpacing:"0.12em",marginBottom:6}}>NOTES</div>
            <textarea rows={2} value={broker.notes||""} onChange={e=>updateBroker(broker.name,"notes",e.target.value)}
              placeholder="What did you discuss..." style={{fontSize:12}}/>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <button onClick={()=>deleteBroker(broker.name)} style={{background:"none",border:"1px solid #2a2a3a",color:"#555",fontSize:10,fontFamily:"'DM Mono',monospace",padding:"4px 10px",borderRadius:6,cursor:"pointer",letterSpacing:"0.08em"}}>REMOVE</button>
          </div>
        </div>
      );
    }

    // ── Outfit Picker ────────────────────────────────────────────────────────────
    function OutfitPicker({ value, onChange, allClothes }) {
      const [showDropdown, setShowDropdown] = useState(false);
      const [inputVal, setInputVal] = useState(value);

      // Sync input when date changes
      useEffect(() => { setInputVal(value); }, [value]);

      // Build unique outfit list sorted by frequency
      const outfitHistory = useMemo(() => {
        const freq = {};
        Object.values(allClothes).forEach(outfit => {
          if (!outfit || !outfit.trim()) return;
          const key = outfit.trim().toLowerCase();
          freq[key] = { label: outfit.trim(), count: (freq[key]?.count || 0) + 1 };
        });
        return Object.values(freq).sort((a,b) => a.label.localeCompare(b.label)).map(o => o.label);
      }, [allClothes]);

      const filtered = inputVal
        ? outfitHistory.filter(o => o.toLowerCase().includes(inputVal.toLowerCase()) && o.toLowerCase() !== inputVal.toLowerCase())
        : outfitHistory;

      function select(outfit) {
        setInputVal(outfit);
        onChange(outfit);
        setShowDropdown(false);
      }

      function handleChange(e) {
        setInputVal(e.target.value);
        onChange(e.target.value);
        setShowDropdown(true);
      }

      return (
        <div style={{position:"relative"}}>
          <div style={{display:"flex",gap:8}}>
            <input type="text" placeholder="What are you wearing today?"
              value={inputVal} onChange={handleChange}
              onFocus={()=>setShowDropdown(true)}
              style={{flex:1}}/>
            <button onClick={()=>setShowDropdown(v=>!v)}
              style={{background:"#1a1a22",border:"1px solid #2a2a3a",color:"#666",padding:"0 12px",borderRadius:8,cursor:"pointer",fontSize:14,flexShrink:0}}>
              ▾
            </button>
          </div>
          {showDropdown && filtered.length > 0 && (
            <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#13131c",border:"1px solid #2a2a3a",borderRadius:10,marginTop:4,zIndex:100,maxHeight:220,overflowY:"auto",boxShadow:"0 8px 24px #00000088"}}>
              {filtered.map((outfit, i) => (
                <div key={i} onClick={()=>select(outfit)}
                  style={{padding:"10px 14px",fontSize:13,color:"#c0c0d0",borderBottom:"1px solid #1a1a22",cursor:"pointer"}}
                  onMouseEnter={e=>e.target.style.background="#1e1e2a"}
                  onMouseLeave={e=>e.target.style.background="transparent"}>
                  {outfit}
                </div>
              ))}
            </div>
          )}
          {showDropdown && <div style={{position:"fixed",inset:0,zIndex:99}} onClick={()=>setShowDropdown(false)}/>}
        </div>
      );
    }

    // ── Main App ──────────────────────────────────────────────────────────────
    function App() {
      const today = getTodayStr();
      const [selectedDate, setSelectedDate] = useState(today);
      const [entries, setEntries] = useState(() => lsGet("tracker_entries", {}));
      const [clothes, setClothes] = useState(() => lsGet("tracker_clothes", {}));
      const [socialNotes, setSocialNotes] = useState(() => lsGet("tracker_social", {}));
      const [catOrder, setCatOrder] = useState(() => lsGet("tracker_cat_order", null));
      const [catBlocks, setCatBlocks] = useState(() => lsGet("tracker_cat_blocks", {}));
      const [commitKeys, setCommitKeysState] = useState(() => lsGet("tracker_commit_keys", []));
      const [view, setView] = useState("today");
      const [histTab, setHistTab] = useState("overview");
      const [drillCat, setDrillCat] = useState(null);
      const [editMode, setEditMode] = useState(false);
      const [saveFlash, setSaveFlash] = useState(false);
      const [showMidday, setShowMidday] = useState(true);
      const [logsTab, setLogsTab] = useState("outfit");
      const [brokers, setBrokersState] = useState(() => lsGet("tracker_brokers", {
        "GS": {name:"GS",lastDate:"",nextDate:"",notes:""}, "MS": {name:"MS",lastDate:"",nextDate:"",notes:""},
        "JPM": {name:"JPM",lastDate:"",nextDate:"",notes:""}, "BAML": {name:"BAML",lastDate:"",nextDate:"",notes:""},
        "Citi": {name:"Citi",lastDate:"",nextDate:"",notes:""}, "RBC": {name:"RBC",lastDate:"",nextDate:"",notes:""},
        "Wells": {name:"Wells",lastDate:"",nextDate:"",notes:""}, "UBS": {name:"UBS",lastDate:"",nextDate:"",notes:""},
        "Jefferies": {name:"Jefferies",lastDate:"",nextDate:"",notes:""}, "Baird": {name:"Baird",lastDate:"",nextDate:"",notes:""},
        "William Blair": {name:"William Blair",lastDate:"",nextDate:"",notes:""}, "Truist": {name:"Truist",lastDate:"",nextDate:"",notes:""},
        "Stifel": {name:"Stifel",lastDate:"",nextDate:"",notes:""}, "Piper Sandler": {name:"Piper Sandler",lastDate:"",nextDate:"",notes:""},
        "Nomura": {name:"Nomura",lastDate:"",nextDate:"",notes:""}, "Evercore": {name:"Evercore",lastDate:"",nextDate:"",notes:""},
        "FBN": {name:"FBN",lastDate:"",nextDate:"",notes:""}, "Cowen": {name:"Cowen",lastDate:"",nextDate:"",notes:""},
        "BTIG": {name:"BTIG",lastDate:"",nextDate:"",notes:""}, "Canaccord": {name:"Canaccord",lastDate:"",nextDate:"",notes:""}
      }));
      const [brokerExpanded, setBrokerExpanded] = useState(null);
      const [newBrokerName, setNewBrokerName] = useState("");

      useEffect(() => {
        function onVisible() { if(document.visibilityState==="visible") setSelectedDate(getTodayStr()); }
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", onVisible);
        return () => { document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onVisible); };
      }, []);

      const [syncStatus, setSyncStatus] = useState("idle"); // idle | saving | saved | error

      // Load from Firebase on mount
      useEffect(() => {
        setSyncStatus("saving");
        TRACKER_DOC.get().then(doc => {
          if (doc.exists) {
            const d = doc.data();
            if (d.entries) { setEntries(d.entries); lsSet("tracker_entries", d.entries); }
            if (d.clothes) { setClothes(d.clothes); lsSet("tracker_clothes", d.clothes); }
            if (d.socialNotes) { setSocialNotes(d.socialNotes); lsSet("tracker_social", d.socialNotes); }
            if (d.catOrder) { setCatOrder(d.catOrder); lsSet("tracker_cat_order", d.catOrder); }
            if (d.commitKeys) { setCommitKeysState(d.commitKeys); lsSet("tracker_commit_keys", d.commitKeys); }
            if (d.brokers) { setBrokersState(d.brokers); lsSet("tracker_brokers", d.brokers); }
          }
          setSyncStatus("idle");
        }).catch(err => {
          console.warn("Firebase load failed, using localStorage:", err);
          setSyncStatus("idle");
        });
      }, []);

      const persist = useCallback((e,c,s) => {
        lsSet("tracker_entries",e); lsSet("tracker_clothes",c); lsSet("tracker_social",s);
        setSaveFlash(true); setTimeout(()=>setSaveFlash(false),1200);
        setSyncStatus("saving");
        TRACKER_DOC.set({ entries:e, clothes:c, socialNotes:s }, { merge:true })
          .then(() => { setSyncStatus("saved"); setTimeout(()=>setSyncStatus("idle"),2000); })
          .catch(() => setSyncStatus("error"));
      },[]);

      function setCommitKeys(val) { const v=typeof val==="function"?val(commitKeys):val; setCommitKeysState(v); lsSet("tracker_commit_keys",v); }

      function saveBrokers(updated) {
        setBrokersState(updated);
        lsSet("tracker_brokers", updated);
        // Also sync to Firebase
        TRACKER_DOC.set({ brokers: updated }, { merge: true }).catch(()=>{});
      }
      function updateBroker(key, field, val) {
        const updated = { ...brokers, [key]: { ...brokers[key], [field]: val } };
        saveBrokers(updated);
      }
      function addBroker() {
        const name = newBrokerName.trim();
        if (!name || brokers[name]) return;
        const updated = { ...brokers, [name]: { name, lastDate: "", nextDate: "", notes: "" } };
        saveBrokers(updated);
        setNewBrokerName("");
      }
      function deleteBroker(key) {
        const updated = { ...brokers };
        delete updated[key];
        saveBrokers(updated);
        if (brokerExpanded === key) setBrokerExpanded(null);
      }

      const CATEGORIES = useMemo(() => buildOrderedCats(catOrder, catBlocks), [catOrder, catBlocks]);
      const regular = CATEGORIES.filter(c=>!c.penalty);
      const penalties = CATEGORIES.filter(c=>c.penalty);

      function toggle(key) { const c=entries[selectedDate]||{}; const ne={...entries,[selectedDate]:{...c,[key]:!c[key]}}; setEntries(ne); persist(ne,clothes,socialNotes); }
      function setMulti(key,val) { const c=entries[selectedDate]||{}; const ne={...entries,[selectedDate]:{...c,[key]:val}}; setEntries(ne); persist(ne,clothes,socialNotes); }
      function setCloth(val) { const nc={...clothes,[selectedDate]:val}; setClothes(nc); persist(entries,nc,socialNotes); }
      function setSocial(val) { const ns={...socialNotes,[selectedDate]:val}; setSocialNotes(ns); persist(entries,clothes,ns); }

      function moveItem(key, direction) {
        const current=[...CATEGORIES]; const idx=current.findIndex(c=>c.key===key); const newIdx=idx+direction;
        if(newIdx<0||newIdx>=current.length) return;
        if(current[idx].penalty!==current[newIdx].penalty) return;
        [current[idx],current[newIdx]]=[current[newIdx],current[idx]];
        const newOrder=current.map(c=>c.key); setCatOrder(newOrder); lsSet("tracker_cat_order",newOrder);
      }

      const cur = entries[selectedDate]||{};
      const total = CATEGORIES.reduce((s,c)=>s+getCatPoints(c,cur),0);
      const goal = isWeekend(selectedDate)?WEEKEND_GOAL:WEEKDAY_GOAL;
      const pct = Math.min(Math.round((total/goal)*100),100);
      const prog = Math.min((total/goal)*100,100);
      const circ = 2*Math.PI*38;
      const dash = (prog/100)*circ;
      const ring = total>=goal?"#22c55e":total>=goal*0.8?"#f59e0b":"#3b82f6";

      // Midday check-in data
      const isToday = selectedDate===today;
      const showMiddayBanner = isToday && isMidday() && showMidday && view==="today";
      const currentBlock = getCurrentBlock();
      const blockCatsLeft = regular.filter(c=>c.block===currentBlock&&getCatPoints(c,cur)===0);
      const blockPtsLeft = blockCatsLeft.reduce((s,c)=>s+(c.multi?0:c.points),0);

      const sortedDates = useMemo(()=>Object.keys(entries).sort((a,b)=>a.localeCompare(b)),[entries]);
      const allTotals = useMemo(()=>sortedDates.map(d=>({date:d,val:getDayTotal(CATEGORIES,entries[d]||{}),goal:isWeekend(d)?WEEKEND_GOAL:WEEKDAY_GOAL,hit:getDayTotal(CATEGORIES,entries[d]||{})>=(isWeekend(d)?WEEKEND_GOAL:WEEKDAY_GOAL)})),[sortedDates,entries,CATEGORIES]);
      const runningAvg=allTotals.length?Math.round(allTotals.reduce((s,d)=>s+d.val,0)/allTotals.length):0;
      const goalHitRate=allTotals.length?Math.round((allTotals.filter(d=>d.hit).length/allTotals.length)*100):0;
      const best=allTotals.length?Math.max(...allTotals.map(d=>d.val)):0;
      const last30=allTotals.slice(-30);
      const catStats=useMemo(()=>CATEGORIES.filter(c=>!c.penalty).map(cat=>{ const days=sortedDates.filter(d=>entries[d]); const done=days.filter(d=>getCatPoints(cat,entries[d]||{})>0).length; return{cat,done,total:days.length,pct:days.length?Math.round((done/days.length)*100):0}; }).sort((a,b)=>b.pct-a.pct),[sortedDates,entries,CATEGORIES]);

      if(view==="history"&&drillCat) return (
        <div style={{minHeight:"100vh",background:"#0f0f13",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",maxWidth:480,margin:"0 auto",paddingBottom:80}}>
          <div style={{margin:"16px 16px 0",background:"linear-gradient(145deg,#13131c,#1a1a28)",border:"1px solid #23233a",borderRadius:20,overflow:"hidden"}}>
            <div style={{padding:"14px 20px",display:"flex",alignItems:"center"}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:"#fff"}}>{total} <span style={{fontSize:14,color:"#444",fontWeight:400}}>/ {goal}</span></div></div>
            <div style={{display:"flex",borderTop:"1px solid #1c1c2e"}}>
              {["today","history","logs"].map(t=><button key={t} className="tab-btn" onClick={()=>{setView(t);setDrillCat(null);}} style={{color:view===t?"#fff":"#444",borderBottom:view===t?`2px solid ${ring}`:"2px solid transparent"}}>{t.toUpperCase()}</button>)}
            </div>
          </div>
          <CategoryDrillChart cat={drillCat} entries={entries} onBack={()=>setDrillCat(null)}/>
        </div>
      );

      return (
        <div style={{minHeight:"100vh",background:"#0f0f13",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",maxWidth:480,margin:"0 auto",paddingBottom:80}}>

          {/* HERO */}
          <div style={{margin:"16px 16px 0",background:"linear-gradient(145deg,#13131c,#1a1a28)",border:"1px solid #23233a",borderRadius:20,overflow:"hidden",position:"relative"}}>
            <div style={{position:"absolute",right:24,top:"50%",transform:"translateY(-50%)",width:140,height:140,borderRadius:"50%",background:`radial-gradient(circle,${ring}22,transparent 70%)`,transition:"background 0.6s",pointerEvents:"none"}}/>
            <div style={{padding:"20px 20px 16px",display:"flex",alignItems:"center",gap:20,position:"relative"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.22em",color:"#444"}}>DAILY TRACKER</div>
                  {syncStatus==="saving"&&<div style={{fontSize:9,color:"#f59e0b",letterSpacing:"0.12em",background:"#f59e0b18",padding:"2px 6px",borderRadius:4}}>SYNCING</div>}
                  {syncStatus==="saved"&&<div style={{fontSize:9,color:"#22c55e",letterSpacing:"0.12em",background:"#22c55e18",padding:"2px 6px",borderRadius:4}}>SYNCED ☁️</div>}
                  {syncStatus==="error"&&<div style={{fontSize:9,color:"#ef4444",letterSpacing:"0.12em",background:"#ef444418",padding:"2px 6px",borderRadius:4}}>OFFLINE</div>}
                  {saveFlash&&syncStatus==="idle"&&<div style={{fontSize:9,color:"#22c55e",letterSpacing:"0.12em",background:"#22c55e18",padding:"2px 6px",borderRadius:4}}>SAVED</div>}
                </div>
                <div style={{display:"flex",alignItems:"baseline",gap:6,margin:"6px 0 10px"}}>
                  <span style={{fontFamily:"'Syne',sans-serif",fontSize:52,fontWeight:800,color:"#fff",lineHeight:1,letterSpacing:"-0.03em"}}>{total}</span>
                  <span style={{fontSize:18,color:"#333",fontWeight:300}}>/</span>
                  <span style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:700,color:"#444"}}>{goal}</span>
                </div>
                <div style={{height:3,background:"#1e1e2e",borderRadius:2,marginBottom:10,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:2,width:`${prog}%`,background:`linear-gradient(90deg,${ring}99,${ring})`,transition:"width 0.4s ease,background 0.4s"}}/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/>
                  <div style={{width:1,height:10,background:"#2a2a3a"}}/>
                  <div style={{fontSize:11,color:isWeekend(selectedDate)?"#f59e0b":"#3b82f6",letterSpacing:"0.08em"}}>{isWeekend(selectedDate)?"WEEKEND":"WEEKDAY"}</div>
                  {selectedDate!==today&&<><div style={{width:1,height:10,background:"#2a2a3a"}}/><button onClick={()=>setSelectedDate(today)} style={{background:"none",border:"none",color:"#555",fontSize:11,fontFamily:"'DM Mono',monospace",cursor:"pointer",padding:0}}>→ TODAY</button></>}
                  {total>=goal&&<><div style={{width:1,height:10,background:"#2a2a3a"}}/><div style={{fontSize:11,color:"#22c55e",letterSpacing:"0.08em"}}>✓ DONE</div></>}
                </div>
              </div>
              <div style={{position:"relative",width:90,height:90,flexShrink:0}}>
                <svg width="90" height="90" viewBox="0 0 90 90">
                  <circle cx="45" cy="45" r="38" fill="none" stroke="#1e1e2e" strokeWidth="7"/>
                  <circle cx="45" cy="45" r="38" fill="none" stroke={ring} strokeWidth="7" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 45 45)" style={{transition:"stroke-dasharray 0.4s ease,stroke 0.4s",filter:`drop-shadow(0 0 6px ${ring}88)`}}/>
                </svg>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:"#fff"}}>{pct}%</div>
                </div>
              </div>
            </div>
            <div style={{display:"flex",borderTop:"1px solid #1c1c2e"}}>
              {["today","history","logs"].map(t=><button key={t} className="tab-btn" onClick={()=>{setView(t);setDrillCat(null);}} style={{color:view===t?"#fff":"#444",borderBottom:view===t?`2px solid ${ring}`:"2px solid transparent"}}>{t.toUpperCase()}</button>)}
            </div>
          </div>

          {/* MIDDAY BANNER */}
          {showMiddayBanner&&(
            <div className="midday-banner" style={{background:"linear-gradient(135deg,#1a1a0d,#1e1e13)",border:"1px solid #2a2a1a"}}>
              <span style={{fontSize:20}}>☀️</span>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:"#f59e0b",fontWeight:500,letterSpacing:"0.1em",marginBottom:2}}>MIDDAY CHECK-IN</div>
                <div style={{fontSize:12,color:"#888",lineHeight:1.5}}>
                  {total>=goal ? "Goal hit! Keep it up." : `${goal-total} pts to go. ${blockCatsLeft.length} midday items left (+${blockPtsLeft} pts available).`}
                </div>
              </div>
              <button onClick={()=>setShowMidday(false)} style={{background:"none",border:"none",color:"#333",fontSize:18,cursor:"pointer",padding:"0 4px"}}>×</button>
            </div>
          )}

          {/* WEEKEND COMMIT LIST */}
          {view==="today"&&isToday&&isWeekend(today)&&(
            <WeekendCommitList CATEGORIES={CATEGORIES} cur={cur} onToggle={toggle} onSetMulti={setMulti} commitKeys={commitKeys} setCommitKeys={setCommitKeys}/>
          )}

          {/* TODAY */}
          {view==="today"&&<>
            <div style={{padding:"16px 20px 0"}}>
              <div className="section-label">OUTFIT</div>
              <OutfitPicker value={clothes[selectedDate]||""} onChange={setCloth} allClothes={clothes}/>
            </div>

            <div style={{padding:"16px 12px 0"}}>
              <div style={{display:"flex",alignItems:"center",padding:"0 8px",marginBottom:4}}>
                <div className="section-label" style={{padding:0,marginBottom:0,flex:1}}>ACTIVITIES</div>
                <button className={`edit-mode-btn ${editMode?"active":""}`} onClick={()=>setEditMode(v=>!v)}>{editMode?"DONE":"REORDER"}</button>
              </div>
              {BLOCKS.map((block,bi)=>(
                <BlockSection key={block.id} block={block} cats={regular} cur={cur} editMode={editMode}
                  onToggle={toggle} onSetMulti={setMulti} onMove={moveItem} totalCats={regular.length} blockIdx={bi}/>
              ))}
            </div>

            <div style={{padding:"8px 12px 0"}}>
              <div className="section-label">PENALTIES</div>
              {penalties.map((cat,idx)=>{
                const checked=!!cur[cat.key];
                return <div key={cat.key} style={{display:"flex",alignItems:"center",gap:4}}>
                  {editMode&&<div className="reorder-col"><button className="reorder-btn" onClick={()=>moveItem(cat.key,-1)} style={{opacity:idx===0?0.15:1}}>▲</button><button className="reorder-btn" onClick={()=>moveItem(cat.key,1)} style={{opacity:idx===penalties.length-1?0.15:1}}>▼</button></div>}
                  <div className={`cat-row penalty-row ${checked?"checked":""}`} style={{flex:1}} onClick={()=>!editMode&&toggle(cat.key)}>
                    <div className="check-box" onClick={e=>{e.stopPropagation();toggle(cat.key);}}>
                      {checked&&<svg width="13" height="10" viewBox="0 0 13 10"><polyline points="1,5 5,9 12,1" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{fontSize:16}}>{cat.emoji}</span>
                    <span style={{flex:1,fontSize:13,color:checked?"#fca5a5":"#c0c0d0"}}>{cat.label}</span>
                    <span style={{fontSize:12,color:checked?"#ef4444":"#444",fontWeight:500}}>{cat.points}</span>
                  </div>
                </div>;
              })}
            </div>

            <div style={{padding:"16px 20px 32px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:16}}>🤝</span>
                <div className="section-label" style={{marginBottom:0}}>WHAT SOCIAL EFFORT DID YOU MAKE TODAY?</div>
              </div>
              <textarea rows={3} placeholder="Who did you connect with, reach out to, or spend time with..." value={socialNotes[selectedDate]||""} onChange={e=>setSocial(e.target.value)}/>
            </div>
          </>}

          {/* HISTORY */}
          {view==="history"&&<>
            <div style={{display:"flex",gap:6,padding:"12px 16px 0"}}>
              {[["overview","OVERVIEW"],["categories","CATEGORIES"],["log","LOG"]].map(([id,label])=>(
                <button key={id} className="hist-sub-btn" onClick={()=>setHistTab(id)} style={{background:histTab===id?"#1e1e2e":"transparent",color:histTab===id?"#e2e8f0":"#444",border:`1px solid ${histTab===id?"#2a2a3a":"transparent"}`}}>{label}</button>
              ))}
            </div>

            {histTab==="overview"&&<div style={{padding:"12px 16px 32px"}}>
              {sortedDates.length===0?<div style={{textAlign:"center",color:"#444",fontSize:13,padding:"40px 0"}}>No entries yet.</div>:<>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                  {[{label:"AVG SCORE",val:runningAvg,color:"#3b82f6"},{label:"GOAL RATE",val:`${goalHitRate}%`,color:"#22c55e"},{label:"BEST DAY",val:best,color:"#f59e0b"}].map(s=>(
                    <div key={s.label} className="stat-card"><div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,color:s.color,lineHeight:1}}>{s.val}</div><div style={{fontSize:9,color:"#444",letterSpacing:"0.1em",marginTop:4}}>{s.label}</div></div>
                  ))}
                </div>
                <div className="stat-card" style={{marginBottom:12}}>
                  <div className="section-label" style={{marginBottom:12}}>LAST {last30.length} DAYS</div>
                  <BarChart data={last30} height={120}/>
                  <div style={{display:"flex",gap:16,marginTop:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:"#22c55e"}}/><span style={{fontSize:10,color:"#555"}}>Goal hit</span></div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:"#f59e0b"}}/><span style={{fontSize:10,color:"#555"}}>80%+</span></div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:"#3b82f6",opacity:0.5}}/><span style={{fontSize:10,color:"#555"}}>Avg</span></div>
                  </div>
                </div>
                {allTotals.length>=7&&<div className="stat-card" style={{marginBottom:12}}>
                  <div className="section-label" style={{marginBottom:12}}>7-DAY ROLLING AVERAGE</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {allTotals.slice(-14).map((d,i,arr)=>{ const w=arr.slice(Math.max(0,i-6),i+1); const avg7=Math.round(w.reduce((s,x)=>s+x.val,0)/w.length); return <div key={d.date} style={{flex:"1 0 auto",minWidth:60,background:"#0f0f13",borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:9,color:"#444",letterSpacing:"0.08em",marginBottom:2}}>{formatShort(d.date)}</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:avg7>=(isWeekend(d.date)?WEEKEND_GOAL:WEEKDAY_GOAL)?"#22c55e":"#e2e8f0"}}>{avg7}</div></div>; })}
                  </div>
                </div>}
              </>}
            </div>}

            {histTab==="categories"&&<div style={{padding:"12px 16px 32px"}}>
              <div className="section-label" style={{marginBottom:12}}>TAP ANY CATEGORY TO DRILL DOWN</div>
              {catStats.map(({cat,done,total:tot,pct:p})=>(
                <div key={cat.key} className="cat-drill-row" onClick={()=>setDrillCat(cat)}>
                  <span style={{fontSize:16,flexShrink:0}}>{cat.emoji}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,color:"#c0c0d0"}}>{cat.label}</span>
                      <span style={{fontSize:11,color:p>=80?"#22c55e":p>=50?"#f59e0b":"#555",fontWeight:500,marginLeft:8}}>{p}%</span>
                    </div>
                    <div style={{height:3,background:"#1e1e2e",borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:2,width:`${p}%`,background:p>=80?"#22c55e":p>=50?"#f59e0b":"#3b3b50"}}/>
                    </div>
                  </div>
                  <span style={{fontSize:10,color:"#333",flexShrink:0,marginLeft:8}}>{done}/{tot}</span>
                  <span style={{fontSize:12,color:"#333",flexShrink:0}}>›</span>
                </div>
              ))}
            </div>}

            {histTab==="log"&&<div style={{padding:"12px 16px 32px"}}>
              {[...sortedDates].reverse().length===0?<div style={{textAlign:"center",color:"#444",fontSize:13,padding:"40px 0"}}>No entries yet.</div>
                :[...sortedDates].reverse().map(date=>{
                  const de=entries[date]||{}; const pts=getDayTotal(CATEGORIES,de); const g=isWeekend(date)?WEEKEND_GOAL:WEEKDAY_GOAL; const hit=pts>=g; const p=Math.min(Math.round((pts/g)*100),100); const note=socialNotes[date];
                  return <div key={date} className="hist-row" onClick={()=>{setSelectedDate(date);setView("today");}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,color:"#e2e8f0",fontWeight:500}}>{formatDate(date)}</div>
                      {clothes[date]&&<div style={{fontSize:10,color:"#555",marginTop:2}}>{clothes[date]}</div>}
                      {note&&<div style={{fontSize:10,color:"#3b5a3b",marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>🤝 {note}</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:18,fontFamily:"'Syne',sans-serif",fontWeight:800,color:hit?"#22c55e":"#e2e8f0"}}>{pts}</div>
                      <div style={{fontSize:10,color:"#555"}}>{p}% of {g}</div>
                    </div>
                    <div style={{width:4,height:40,borderRadius:2,background:hit?"#22c55e":pts>=g*0.8?"#f59e0b":"#3b3b50",flexShrink:0}}/>
                  </div>;
                })
              }
            </div>}

            <div style={{marginTop:8,paddingTop:16,borderTop:"1px solid #1a1a22"}}>
              <AICoach entries={entries} CATEGORIES={CATEGORIES} allTotals={allTotals} catStats={catStats} sortedDates={sortedDates}/>
            </div>
          </>}
          {/* LOGS */}
          {view==="logs"&&<>
            {/* Sub tabs */}
            <div style={{display:"flex",gap:6,padding:"12px 16px 0"}}>
              {[["outfit","👔 OUTFITS"],["social","🤝 SOCIAL"],["brokers","📊 BROKERS"]].map(([id,label])=>(
                <button key={id} className="hist-sub-btn" onClick={()=>setLogsTab(id)}
                  style={{background:logsTab===id?"#1e1e2e":"transparent",color:logsTab===id?"#e2e8f0":"#444",border:`1px solid ${logsTab===id?"#2a2a3a":"transparent"}`}}>
                  {label}
                </button>
              ))}
            </div>

            {/* OUTFIT LOG */}
            {logsTab==="outfit"&&<div style={{padding:"12px 16px 32px"}}>
              {(() => {
                // Build frequency map
                const freq = {};
                Object.entries(clothes).forEach(([date, outfit]) => {
                  if (!outfit || !outfit.trim()) return;
                  const key = outfit.trim().toLowerCase();
                  if (!freq[key]) freq[key] = { label: outfit.trim(), dates: [] };
                  freq[key].dates.push(date);
                });
                const sorted = Object.values(freq).sort((a,b) => b.dates.length - a.dates.length);
                if (sorted.length === 0) return <div style={{textAlign:"center",color:"#444",fontSize:13,padding:"40px 0"}}>No outfits logged yet.</div>;
                return <>
                  <div className="section-label" style={{marginBottom:12}}>{sorted.length} UNIQUE OUTFITS LOGGED</div>
                  {sorted.map((item, i) => {
                    const count = item.dates.length;
                    const color = count >= 3 ? "#ef4444" : count === 2 ? "#f59e0b" : "#22c55e";
                    const lastWorn = item.dates.sort().reverse()[0];
                    return (
                      <div key={i} style={{padding:"12px 14px",borderRadius:10,background:"#13131c",border:"1px solid #1e1e2e",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,color:"#e2e8f0",marginBottom:3}}>{item.label}</div>
                          <div style={{fontSize:10,color:"#555"}}>Last worn: {formatDate(lastWorn)}</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,color,lineHeight:1}}>×{count}</div>
                          {count >= 2 && <div style={{fontSize:9,color,letterSpacing:"0.1em",marginTop:2}}>{count>=3?"REWORN":"2X WEAR"}</div>}
                        </div>
                      </div>
                    );
                  })}
                </>;
              })()}
            </div>}

            {/* SOCIAL LOG */}
            {logsTab==="social"&&<div style={{padding:"12px 16px 32px"}}>
              {(() => {
                const entries_with_notes = Object.entries(socialNotes)
                  .filter(([,note]) => note && note.trim())
                  .sort((a,b) => b[0].localeCompare(a[0]));
                if (entries_with_notes.length === 0) return <div style={{textAlign:"center",color:"#444",fontSize:13,padding:"40px 0"}}>No social entries yet.</div>;
                return <>
                  <div className="section-label" style={{marginBottom:12}}>{entries_with_notes.length} ENTRIES</div>
                  {entries_with_notes.map(([date, note]) => (
                    <div key={date} style={{padding:"14px 16px",borderRadius:12,background:"#13131c",border:"1px solid #1e1e2e",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",flexShrink:0}}/>
                        <div style={{fontSize:10,color:"#555",letterSpacing:"0.1em"}}>{formatDate(date)}</div>
                      </div>
                      <div style={{fontSize:13,color:"#c0c0d0",lineHeight:1.6}}>{note}</div>
                    </div>
                  ))}
                </>;
              })()}
            </div>}
            {/* BROKER LOG */}
            {logsTab==="brokers"&&<div style={{padding:"12px 16px 32px"}}>
              {(() => {
                const today = getTodayStr();
                const daysSince = (dateStr) => {
                  if (!dateStr) return 9999;
                  const diff = new Date(today) - new Date(dateStr);
                  return Math.floor(diff / (1000*60*60*24));
                };
                const statusColor = (days) => days >= 90 ? "#ef4444" : days >= 60 ? "#f59e0b" : days === 9999 ? "#555" : "#22c55e";
                const statusLabel = (days) => days === 9999 ? "NEVER" : days === 0 ? "TODAY" : days === 1 ? "1 DAY AGO" : `${days}d AGO`;
                const sorted = Object.values(brokers).sort((a,b) => daysSince(a.lastDate) - daysSince(b.lastDate) > 0 ? -1 : 1).sort((a,b) => daysSince(b.lastDate) - daysSince(a.lastDate));

                return <>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <div className="section-label" style={{marginBottom:0}}>{sorted.length} BROKERS</div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <input type="text" placeholder="Add broker..." value={newBrokerName} onChange={e=>setNewBrokerName(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&addBroker()}
                        style={{padding:"5px 10px",fontSize:12,width:130,borderRadius:6}}/>
                      <button onClick={addBroker} style={{background:"#3b82f6",border:"none",color:"#fff",padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:"'DM Mono',monospace"}}>+ADD</button>
                    </div>
                  </div>

                  {/* UPCOMING section */}
                  {(() => {
                    const upcoming = Object.values(brokers)
                      .filter(b => b.nextDate && b.nextDate >= today)
                      .sort((a,b) => a.nextDate.localeCompare(b.nextDate));
                    if (!upcoming.length) return null;
                    return <>
                      <div className="section-label" style={{marginBottom:8,marginTop:4}}>📅 UPCOMING</div>
                      {upcoming.map(broker => {
                        const isOpen = brokerExpanded === broker.name;
                        const daysUntil = Math.ceil((new Date(broker.nextDate) - new Date(today)) / (1000*60*60*24));
                        const upColor = daysUntil <= 3 ? "#22c55e" : daysUntil <= 7 ? "#3b82f6" : "#888";
                        const upLabel = daysUntil === 0 ? "TODAY" : daysUntil === 1 ? "TOMORROW" : `IN ${daysUntil}d`;
                        return (
                          <div key={broker.name} style={{borderRadius:12,background:"#0d1a13",border:`1px solid ${isOpen?"#1e3a2a":"#1a2a1e"}`,marginBottom:8,overflow:"hidden"}}>
                            <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer"}} onClick={()=>setBrokerExpanded(isOpen?null:broker.name)}>
                              <div style={{width:8,height:8,borderRadius:"50%",background:upColor,flexShrink:0,boxShadow:`0 0 6px ${upColor}88`}}/>
                              <div style={{flex:1}}>
                                <div style={{fontSize:14,color:"#e2e8f0",fontWeight:500}}>{broker.name}</div>
                                <div style={{fontSize:10,color:"#3b5a3b",marginTop:2}}>{formatDate(broker.nextDate)}</div>
                              </div>
                              <div style={{textAlign:"right",flexShrink:0}}>
                                <div style={{fontSize:11,color:upColor,fontWeight:600,letterSpacing:"0.08em"}}>{upLabel}</div>
                              </div>
                              <div style={{fontSize:11,color:"#333"}}>{isOpen?"▲":"▼"}</div>
                            </div>
                            {isOpen&&<BrokerEditPanel broker={broker} updateBroker={updateBroker} deleteBroker={deleteBroker}/>}
                          </div>
                        );
                      })}
                      <div style={{height:1,background:"#1a1a22",margin:"8px 0 16px"}}/>
                    </>;
                  })()}

                  {/* ALL BROKERS section */}
                  <div className="section-label" style={{marginBottom:8}}>ALL BROKERS</div>
                  {sorted.map(broker => {
                    const days = daysSince(broker.lastDate);
                    const color = statusColor(days);
                    const isOpen = brokerExpanded === broker.name;
                    return (
                      <div key={broker.name} style={{borderRadius:12,background:"#13131c",border:`1px solid ${isOpen?"#2a2a3a":"#1e1e2e"}`,marginBottom:8,overflow:"hidden"}}>
                        <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer"}} onClick={()=>setBrokerExpanded(isOpen?null:broker.name)}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0,boxShadow:`0 0 6px ${color}88`}}/>
                          <div style={{flex:1}}>
                            <div style={{fontSize:14,color:"#e2e8f0",fontWeight:500}}>{broker.name}</div>
                            {broker.notes&&<div style={{fontSize:10,color:"#555",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{broker.notes}</div>}
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <div style={{fontSize:11,color,fontWeight:500,letterSpacing:"0.06em"}}>{statusLabel(days)}</div>
                            {broker.lastDate&&<div style={{fontSize:9,color:"#444",marginTop:1}}>{formatDate(broker.lastDate)}</div>}
                            {broker.nextDate&&broker.nextDate>=today&&<div style={{fontSize:9,color:"#3b82f6",marginTop:1}}>📅 {formatDate(broker.nextDate)}</div>}
                          </div>
                          <div style={{fontSize:11,color:"#333"}}>{isOpen?"▲":"▼"}</div>
                        </div>
                        {isOpen&&<BrokerEditPanel broker={broker} updateBroker={updateBroker} deleteBroker={deleteBroker}/>}
                      </div>
                    );
                  })}
                </>;
              })()}
            </div>}
          </>}
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
  </script>
</body>
</html>
