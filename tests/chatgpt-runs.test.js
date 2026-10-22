import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/chatgpt-runs.js';

function res(){return {code:200,setHeader(){return this},status(n){this.code=n;return this},json(v){this.body=v;return this}}}
test('run saving requires authorization and confirmed valid input',async()=>{
 const denied=res();
 await handler({method:'POST',headers:{},body:{}},denied);
 assert.equal(denied.code,401);
 const keys=['REP_CHATGPT_TOKEN','REP_USER_ID'];
 const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  process.env.REP_CHATGPT_TOKEN='test-token';
  process.env.REP_USER_ID='test-user';
  const r=res();
  await handler({method:'POST',headers:{authorization:'Bearer test-token'},body:{date:'2026-10-22',distanceMiles:3.32,durationSeconds:1800,maxSpeedMph:7.5,confirmed:false,idempotencyKey:'rep-run-test-key-001'}},r);
  assert.equal(r.code,400);
 }finally{for(const k of keys)old[k]===undefined?delete process.env[k]:process.env[k]=old[k]}
});
test('confirmed running workout uses existing REP runData schema and rejects duplicates',async()=>{
 const keys=['REP_CHATGPT_TOKEN','REP_USER_ID','SUPABASE_URL','SUPABASE_SERVICE_KEY'];
 const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 const oldFetch=globalThis.fetch;const rows=[];
 Object.assign(process.env,{REP_CHATGPT_TOKEN:'test-token',REP_USER_ID:'test-user',SUPABASE_URL:'https://db.example',SUPABASE_SERVICE_KEY:'fake'});
 globalThis.fetch=async(url,init={})=>{
  if(init.method==='POST'){const row=JSON.parse(init.body);rows.push(row);return {ok:true,json:async()=>[row]};}
  const p=new URL(url).searchParams;
  return {ok:true,json:async()=>rows.filter(r=>(!p.get('data->>id')||r.data.id===p.get('data->>id').slice(3))&&(!p.get('data->>date')||r.data.date===p.get('data->>date').slice(3))&&(!p.get('data->>type')||r.data.type===p.get('data->>type').slice(3)))};
 };
 const body={date:'2026-10-22',distanceMiles:3.32,durationSeconds:1800,maxSpeedMph:7.5,stops:[{elapsedSeconds:1163,distanceMiles:2.18,maxSpeedMph:7.1},{elapsedSeconds:1800,distanceMiles:3.32,maxSpeedMph:7.5}],notes:'Return to running',confirmed:true,idempotencyKey:'rep-run-test-key-001'};
 const invoke=async(b)=>{const r=res();await handler({method:'POST',headers:{authorization:'Bearer test-token'},body:b},r);return r};
 try{
  const first=await invoke(body);assert.equal(first.code,201);
  assert.equal(first.body.run.type,'run');
  assert.equal(first.body.run.runData.distance,'3.32');
  assert.equal(first.body.run.runData.duration,'30:00');
  assert.equal(first.body.run.runData.pace,'9:02');
  assert.equal(first.body.run.runData.stops.length,2);
  assert.equal((await invoke(body)).body.duplicate,true);
  assert.equal((await invoke({...body,idempotencyKey:'rep-run-test-key-002'})).body.duplicate,true);
  assert.equal(rows.length,1);
 }finally{globalThis.fetch=oldFetch;for(const k of keys)old[k]===undefined?delete process.env[k]:process.env[k]=old[k]}
});
