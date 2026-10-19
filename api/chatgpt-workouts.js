// Dedicated read/write bridge for a private ChatGPT action. Not active until
// REP_CHATGPT_TOKEN, REP_USER_ID, SUPABASE_URL and SUPABASE_SERVICE_KEY
// are configured in Vercel. Never use the browser APP_SECRET in an action.
import { createHash, timingSafeEqual } from 'node:crypto';
import { supabaseConfig,supabaseHeaders } from './_supabase.js';
import { parseWorkoutText } from '../src/parse.js';

const json=(res,status,data)=>res.status(status).json(data);
function authorized(req){
 const expected=process.env.REP_CHATGPT_TOKEN||'',got=String(req.headers.authorization||'').replace(/^Bearer /,'');
 if(!expected||!got)return false;
 const a=createHash('sha256').update(expected).digest(),b=createHash('sha256').update(got).digest();
 return timingSafeEqual(a,b);
}
async function database(table,params,method,body){
 const {url,key}=supabaseConfig();if(!url||!key)throw Error('Database not configured');
 const r=await fetch(url+'/rest/v1/'+table+'?'+params,{method,headers:{...supabaseHeaders(key),Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok)throw Error('Database failed with status '+r.status);
 return r.json();
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!authorized(req))return json(res,401,{error:'Unauthorized'});
 if(!process.env.REP_USER_ID)return json(res,503,{error:'User configuration unavailable'});
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Method not allowed'});
 const uid=process.env.REP_USER_ID;
 try{
  if(req.method==='GET'){
    const n=Math.min(100,Math.max(1,Number(req.query.limit)||20));
    const rows=await database('workouts',new URLSearchParams({user_id:'eq.'+uid,order:'created_at.desc',limit:String(n)}),'GET');
    return json(res,200,rows.map(r=>r.data));
  }
  const {date,type,text,idempotencyKey}=req.body||{};
  if(typeof text!=='string'||text.length>8000||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||
    !['chest','back','legs','shoulders','biceps','triceps'].includes(type)||typeof idempotencyKey!=='string'||idempotencyKey.length<16||idempotencyKey.length>128)
   return json(res,400,{error:'Provide date, supported workout type, workout text and idempotencyKey'});
  const parsed=parseWorkoutText(text);
  if(!parsed||!parsed.exercises.length)return json(res,422,{error:'Ambiguous format: use one exercise per line, e.g. Bayesian curls 3x10x20. No records were saved.'});
  const id='gpt-'+createHash('sha256').update(idempotencyKey).digest('hex').slice(0,24);
  const contentHash=createHash('sha256').update(JSON.stringify({date,type,text})).digest('hex');
  const existing=await database('workouts',new URLSearchParams({user_id:'eq.'+uid,'data->>id':'eq.'+id,limit:'1'}),'GET');
  if(existing.length){
    if(existing[0].data?.contentHash!==contentHash)return json(res,409,{error:'Idempotency key already used for a different workout'});
    return json(res,200,{saved:true,duplicate:true,workout:existing[0].data});
  }
  const entry={id,date:new Date(date+'T12:00:00').toLocaleDateString('en-US'),type,exercises:parsed.exercises,source:'chatgpt',contentHash};
  const rows=await database('workouts','', 'POST',{user_id:uid,data:entry});
  return json(res,201,{saved:true,workout:rows[0]?.data||entry});
 }catch(e){return json(res,500,{error:'Workout API operation failed'});}
}
