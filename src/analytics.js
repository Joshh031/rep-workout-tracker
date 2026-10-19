import { normalizeName } from './compare.js';

// An exercise is compared only with the same normalized exercise name.
// Machine-specific names should remain distinct; never merge unlike equipment.
function validSets(ex){return (ex.sets||[]).map(s=>({weight:Number(s.weight),reps:Number(s.reps)})).filter(s=>Number.isFinite(s.reps)&&s.reps>0&&Number.isFinite(s.weight)&&s.weight>=0);}
function dateKey(entry){const t=Date.parse(entry.date);return Number.isFinite(t)?t:0;}
export function strengthTrends(history, name, limit=12){
 const key=normalizeName(name);
 return [...history].sort((a,b)=>dateKey(a)-dateKey(b)).flatMap(session=>(session.exercises||[])
   .filter(ex=>normalizeName(ex.name)===key)
   .map(ex=>{
     const sets=validSets(ex);const loaded=sets.filter(s=>s.weight>0);
     if(!loaded.length)return null;
     const best=loaded.reduce((a,b)=>b.weight*(1+b.reps/30)>a.weight*(1+a.reps/30)?b:a);
     return {date:session.date,name:ex.name,topWeight:Math.max(...loaded.map(s=>s.weight)),bestReps:best.reps,
       estimated1RM:Math.round(best.weight*(1+best.reps/30)*10)/10,volume:loaded.reduce((n,s)=>n+s.weight*s.reps,0),
       sets:sets.length};
   })).filter(Boolean).slice(-limit);
}
export function trainingSummary(history,days=28,now=new Date()){
 const end=new Date(now).getTime(), start=end-days*86400000;
 const sessions=history.filter(h=>{const t=dateKey(h);return t>=start&&t<=end&&(h.exercises||[]).length;});
 const groups={};
 for(const s of sessions){
  const type=String(s.type||'other').toLowerCase();
  groups[type]=(groups[type]||0)+(s.exercises||[]).reduce((n,e)=>n+validSets(e).length,0);
 }
 return {days,sessions:sessions.length,recordedSets:Object.values(groups).reduce((a,b)=>a+b,0),setsByWorkoutType:groups};
}
export function nextTarget(history,name){
 const series=strengthTrends(history,name,3);
 if(!series.length)return null;
 const last=series.at(-1);
 return {exercise:name,lastDate:last.date,previous:{weight:last.topWeight,reps:last.bestReps}, suggested:{weight:last.topWeight,reps:last.bestReps+1},
   recommendation:`Previous top load: ${last.topWeight} lb. If recovered, target ${last.topWeight} lb × ${last.bestReps+1} clean reps; otherwise repeat the last quality set.`,
   caveat:'Compare only equivalent exercise equipment and technique.'};
}
