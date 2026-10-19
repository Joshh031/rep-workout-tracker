import { normalizeName } from './compare.js';
export function exerciseRecords(history) {
 const map = new Map();
 for (const session of history) for (const ex of session.exercises || []) {
  const key=normalizeName(ex.name);
  if(!key || ['back','chest','legs','shoulders','biceps','triceps','run'].includes(key))continue;
  for(const set of ex.sets||[]){
   const weight=Number(set.weight),reps=Number(set.reps);
   if(!Number.isFinite(weight)||!Number.isFinite(reps)||weight<=0||reps<=0)continue;
   if(!map.has(key))map.set(key,{displayName:key==='isolateralrow'?'ISO-lateral Row':key==='backextension'?'Back Extension':ex.name.replace(/^\s*\(\d{1,2}\)\s*/, "").trim(),maxWeight:0,maxReps:0,maxVol:0,bestEstimated1RM:0,bestEstimatedSet:null,lastImprovementDate:'',date:'',type:session.type});
   const record=map.get(key);
   // Heaviest actual set wins; same-weight ties use higher reps.
   if(weight>record.maxWeight||(weight===record.maxWeight&&reps>record.maxReps)){
    record.maxWeight=weight;record.maxReps=reps;record.date=session.date;record.type=session.type;
   }
   const estimate=weight*(1+reps/30);
   if(estimate>record.bestEstimated1RM){record.bestEstimated1RM=Math.round(estimate*10)/10;record.bestEstimatedSet={weight,reps};record.lastImprovementDate=session.date;}
   record.maxVol=Math.max(record.maxVol,weight*reps);
  }
 }
 return Object.fromEntries(map);
}
