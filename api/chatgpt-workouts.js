// Authenticated bridge into the existing REP workouts table.
import {createHash,timingSafeEqual} from 'node:crypto';
import {supabaseConfig,supabaseHeaders} from './_supabase.js';
import {parseWorkoutText} from '../src/parse.js';
const TYPES=['chest','back','legs','shoulders','biceps','triceps'];
const json=(res,status,data)=>res.status(status).json(data);
function authorized(req){
 const expected=process.env.REP_CHATGPT_TOKEN||'';
 const got=String(req.headers?.authorization||'').match(/^Bearer\s+(\S+)$/i)?.[1];
 return !!(expected&&got)&&timingSafeEqual(createHash('sha256').update(expected).digest(),createHash('sha256').update(got).digest());
}
function validDate(date){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const d=new Date(date+'T12:00:00Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date;
}
const displayDate=date=>{const [y,m,d]=date.split('-');return `${Number(m)}/${Number(d)}/${y}`};
const canonical=exercises=>JSON.stringify(exercises.map(e=>({name:e.name.trim().toLowerCase().replace(/\s+/g,' '),sets:e.sets.map(s=>({reps:Number(s.reps),weight:s.weight===''?'':Number(s.weight)}))})));
async function database(params,method='GET',body){
 const {url,key}=supabaseConfig();if(!url||!key)throw Error('Database not configured');
 const r=await fetch(url+'/rest/v1/workouts?'+params,{method,signal:AbortSignal.timeout(10000),headers:{...supabaseHeaders(key),Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok){const e=Error('Database request failed');e.status=r.status;throw e;}
 const rows=await r.json();if(!Array.isArray(rows))throw Error('Invalid database response');return rows;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!authorized(req))return json(res,401,{error:'Unauthorized'});
 if(!process.env.REP_USER_ID)return json(res,503,{error:'User configuration unavailable'});
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Method not allowed'});
 const uid=process.env.REP_USER_ID;
 try{
  if(req.method==='GET'){
   const q=req.query||{},limit=Number(q.limit??20),offset=Number(q.offset??0);
   if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||
    (q.date!==undefined&&!validDate(q.date))||(q.type!==undefined&&!TYPES.includes(q.type))||
    (q.id!==undefined&&(typeof q.id!=='string'||!q.id.length||q.id.length>128)))return json(res,400,{error:'Invalid workout query'});
   const params=new URLSearchParams({user_id:'eq.'+uid,order:'created_at.desc',limit:String(limit),offset:String(offset)});
   if(q.date)params.set('data->>date','eq.'+displayDate(q.date));
   if(q.type)params.set('data->>type','eq.'+q.type);
   if(q.id)params.set('data->>id','eq.'+q.id);
   return json(res,200,(await database(params)).map(r=>r.data));
  }
  const {date,type,text,idempotencyKey}=req.body||{};
  if(typeof text!=='string'||!text.trim()||text.length>8000||!validDate(date)||!TYPES.includes(type)||
   typeof idempotencyKey!=='string'||idempotencyKey.trim().length<16||idempotencyKey.length>128)
   return json(res,400,{error:'Provide a real calendar date, supported workout type, workout text and idempotencyKey'});
  const parsed=parseWorkoutText(text);
  if(!parsed?.exercises.length||parsed.exercises.some(e=>e.sets.some(s=>!Number.isInteger(Number(s.reps))||Number(s.reps)<1||(s.weight!==''&&(!Number.isFinite(Number(s.weight))||Number(s.weight)<0)))))
   return json(res,422,{error:'Ambiguous format: use one exercise per line, e.g. Bench press 1x8x225; 2x10x205. No records were saved.'});
  const id='gpt-'+createHash('sha256').update(idempotencyKey).digest('hex').slice(0,24);
  const contentHash=createHash('sha256').update(JSON.stringify({date,type,text})).digest('hex');
  const normalized=canonical(parsed.exercises);
  const canonicalHash=createHash('sha256').update(JSON.stringify({date,type,exercises:normalized})).digest('hex');
  const entry={id,date:displayDate(date),type,exercises:parsed.exercises,source:'chatgpt',contentHash,canonicalHash};
  const byId=async()=> (await database(new URLSearchParams({user_id:'eq.'+uid,'data->>id':'eq.'+id,limit:'1'})))[0]?.data;
  const matches=existing=>existing.date===entry.date&&existing.type===type&&Array.isArray(existing.exercises)&&canonical(existing.exercises)===normalized;
  const sameKey=await byId();
  if(sameKey){
   if(sameKey.contentHash!==contentHash&&!matches(sameKey))return json(res,409,{error:'Idempotency key already used for a different workout. No records were changed.'});
   return json(res,200,{saved:true,duplicate:true,workout:sameKey});
  }
  // Also catches a repeated submission using a new key, including a workout
  // already entered manually. Preserve the original record and its ID.
  const sameDay=await database(new URLSearchParams({user_id:'eq.'+uid,'data->>date':'eq.'+entry.date,'data->>type':'eq.'+type}));
  const duplicate=sameDay.find(r=>matches(r.data))?.data;
  if(duplicate)return json(res,200,{saved:true,duplicate:true,workout:duplicate});
  try{
   const rows=await database('','POST',{user_id:uid,data:entry});
   if(!rows[0]?.data)throw Error('Database did not return a saved workout');
   return json(res,201,{saved:true,duplicate:false,workout:rows[0].data});
  }catch(e){
   if(e.status!==409)throw e;
   // Database unique indexes arbitrate concurrent requests across Vercel
   // instances. Never overwrite an existing workout to resolve a collision.
   const collided=await byId();
   if(collided){
    if(!matches(collided))return json(res,409,{error:'Idempotency key already used for a different workout. No records were changed.'});
    return json(res,200,{saved:true,duplicate:true,workout:collided});
   }
   const rows=await database(new URLSearchParams({user_id:'eq.'+uid,'data->>canonicalHash':'eq.'+canonicalHash,limit:'1'}));
   if(rows[0]?.data)return json(res,200,{saved:true,duplicate:true,workout:rows[0].data});
   return json(res,409,{error:'Workout conflict; read existing records before retrying. No records were overwritten.'});
  }
 }catch{return json(res,502,{error:'REP database operation failed. Do not assume the workout was saved; read back or retry with the same idempotencyKey.'});}
}
