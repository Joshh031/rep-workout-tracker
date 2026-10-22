// Dedicated, authenticated running records in REP's existing workouts table.
import {createHash,timingSafeEqual} from 'node:crypto';
import {supabaseConfig,supabaseHeaders} from './_supabase.js';
const json=(res,status,data)=>res.status(status).json(data);
const dateOK=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const displayDate=s=>{const [y,m,d]=s.split('-');return `${+m}/${+d}/${y}`};
const number=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
async function db(params,method='GET',body){
 const {url,key}=supabaseConfig();if(!url||!key)throw Error('Missing database settings');
 const r=await fetch(url+'/rest/v1/workouts?'+params,{method,headers:{...supabaseHeaders(key),Prefer:'return=representation'},signal:AbortSignal.timeout(10000),...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok){const e=Error('Database unavailable');e.status=r.status;throw e;}
 return r.json();
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const expected=process.env.REP_CHATGPT_TOKEN||'';
 const got=String(req.headers?.authorization||'').match(/^Bearer\s+(\S+)$/i)?.[1]||'';
 if(!expected||!got||!timingSafeEqual(createHash('sha256').update(expected).digest(),createHash('sha256').update(got).digest()))return json(res,401,{error:'Unauthorized'});
 const uid=process.env.REP_USER_ID;
 if(!uid)return json(res,503,{error:'User configuration unavailable'});
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 const {date,distanceMiles,durationSeconds,stops=[],maxSpeedMph,notes='',idempotencyKey,confirmed}=req.body||{};
 if(confirmed!==true||!dateOK(date)||!number(distanceMiles,0.01,1000)||!Number.isInteger(durationSeconds)||durationSeconds<1||durationSeconds>864000||!Array.isArray(stops)||stops.length>30||!number(maxSpeedMph,0,40)||typeof notes!=='string'||notes.length>1000||typeof idempotencyKey!=='string'||idempotencyKey.length<16||idempotencyKey.length>128)return json(res,400,{error:'Invalid or unconfirmed run; nothing saved'});
 let previousTime=0,previousDistance=0;
 for(const s of stops){
  if(!s||!Number.isInteger(s.elapsedSeconds)||s.elapsedSeconds<=previousTime||s.elapsedSeconds>durationSeconds||!number(s.distanceMiles,0.01,distanceMiles)||s.distanceMiles<previousDistance||(s.maxSpeedMph!==undefined&&!number(s.maxSpeedMph,0,40)))return json(res,400,{error:'Invalid ordered cumulative run stops; nothing saved'});
  previousTime=s.elapsedSeconds;previousDistance=s.distanceMiles;
 }
 const running={distanceMiles,durationSeconds,stops,maxSpeedMph,notes};
 const canonicalHash=createHash('sha256').update(JSON.stringify({date,type:'run',running:{distanceMiles,durationSeconds,stops,maxSpeedMph}})).digest('hex');
 const id='gpt-run-'+createHash('sha256').update(idempotencyKey).digest('hex').slice(0,24);
 const mmss=seconds=>Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
 const paceSeconds=Math.round(durationSeconds/distanceMiles);
 const runData={distance:String(distanceMiles),duration:mmss(durationSeconds),pace:mmss(paceSeconds),maxSpeed:String(maxSpeedMph),firstStop:stops.length?mmss(stops[0].elapsedSeconds)+' / '+stops[0].distanceMiles+' mi':'',notes,stops};
 const entry={id,date:displayDate(date),type:'run',runData,running,source:'chatgpt',canonicalHash};
 try{
  const sameId=(await db(new URLSearchParams({user_id:'eq.'+uid,'data->>id':'eq.'+id,limit:'1'})))[0]?.data;
  if(sameId){if(sameId.canonicalHash!==canonicalHash)return json(res,409,{error:'Idempotency key conflict; no changes made'});return json(res,200,{saved:true,duplicate:true,run:sameId});}
  const existing=await db(new URLSearchParams({user_id:'eq.'+uid,'data->>date':'eq.'+entry.date,'data->>type':'eq.run'}));
  const duplicate=existing.find(r=>r.data?.canonicalHash===canonicalHash||(
   r.data?.running?.distanceMiles===distanceMiles&&r.data?.running?.durationSeconds===durationSeconds))?.data;
  if(duplicate)return json(res,200,{saved:true,duplicate:true,run:duplicate});
  const rows=await db('','POST',{user_id:uid,data:entry});
  if(!rows[0]?.data)throw Error('No saved record');
  return json(res,201,{saved:true,duplicate:false,run:rows[0].data});
 }catch(e){
  if(e.status===409)return json(res,409,{error:'Possible duplicate run: read records before retrying; no overwrite'});
  return json(res,502,{error:'REP database request failed; do not assume run was saved'});
 }
}
