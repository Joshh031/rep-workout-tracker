import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/chatgpt-workouts.js';
function makeRes(){
 const res={statusCode:200,headers:{}};
 res.setHeader=(k,v)=>{res.headers[k]=v;return res;};
 res.status=(n)=>{res.statusCode=n;return res;};
 res.json=(x)=>{res.body=x;return res;};
 return res;
}
test('missing API token is rejected without database access',async()=>{
 const res=makeRes();await handler({method:'GET',headers:{},query:{}},res);
 assert.equal(res.statusCode,401);
});
test('invalid workout text is rejected without database access',async()=>{
 const old={token:process.env.REP_CHATGPT_TOKEN,uid:process.env.REP_USER_ID};
 try{
  process.env.REP_CHATGPT_TOKEN='test-secret';
  process.env.REP_USER_ID='test-user';
  const res=makeRes();
  await handler({method:'POST',headers:{authorization:'Bearer test-secret'},query:{},body:{date:'2026-10-19',type:'chest',text:'Nothing parseable',idempotencyKey:'abcdefghijklmnop'}},res);
  assert.equal(res.statusCode,422);
 }finally{
  if(old.token===undefined)delete process.env.REP_CHATGPT_TOKEN;else process.env.REP_CHATGPT_TOKEN=old.token;
  if(old.uid===undefined)delete process.env.REP_USER_ID;else process.env.REP_USER_ID=old.uid;
 }
});

async function withDatabase(fn){
 const keys=['REP_CHATGPT_TOKEN','REP_USER_ID','SUPABASE_URL','SUPABASE_SERVICE_KEY'];
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const original=globalThis.fetch;
 Object.assign(process.env,{REP_CHATGPT_TOKEN:'test-secret',REP_USER_ID:'test-user',SUPABASE_URL:'https://database.example',SUPABASE_SERVICE_KEY:'sb_secret_test'});
 const rows=[],calls=[];
 globalThis.fetch=async(url,init={})=>{
  const u=new URL(url);calls.push({url:u,method:init.method});
  assert.equal(init.headers.apikey,'sb_secret_test');
  if(init.method==='POST'){
   const row=JSON.parse(init.body);
   // Model the actual unique indexes, including two requests racing after
   // both preflight reads returned no rows.
   if(rows.some(r=>r.user_id===row.user_id&&(r.data.id===row.data.id||r.data.canonicalHash===row.data.canonicalHash)))return {ok:false,status:409};
   rows.push(row);return {ok:true,status:201,json:async()=>[row]};
  }
  const matches=rows.filter(r=>Array.from(u.searchParams).every(([key,value])=>{
   if(key==='user_id')return value==='eq.'+r.user_id;
   if(key.startsWith('data->>'))return value==='eq.'+r.data[key.slice(7)];return true;
  }));
  const offset=Number(u.searchParams.get('offset')||0),limit=Number(u.searchParams.get('limit')||1000);
  return {ok:true,status:200,json:async()=>matches.slice(offset,offset+limit)};
 };
 const run=async(method,body,query={})=>{const res=makeRes();await handler({method,headers:{authorization:'Bearer test-secret'},body,query},res);return res;};
 try{await fn({run,rows,calls})}finally{globalThis.fetch=original;for(const key of keys){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key]}}
}
const workout={date:'2026-10-19',type:'chest',text:'Bench press 1x8x225; 2x10x205',idempotencyKey:'stable-workout-key-1234'};
test('save expands all sets, read-back is account scoped, retries and new keys do not duplicate',async()=>withDatabase(async({run,rows,calls})=>{
 const first=await run('POST',workout);assert.equal(first.statusCode,201);
 assert.deepEqual(first.body.workout.exercises[0].sets,[{reps:'8',weight:'225'},{reps:'10',weight:'205'},{reps:'10',weight:'205'}]);
 assert.equal(first.body.workout.date,'10/19/2026');
 assert.equal((await run('POST',workout)).body.duplicate,true);
 assert.equal((await run('POST',{...workout,text:'BENCH  press 1x8x225, 2x10x205',idempotencyKey:'different-key-123456789'})).body.duplicate,true);
 assert.equal((await run('POST',{...workout,text:'Bench press 1x8x230'})).statusCode,409);
 rows.push({user_id:'another-user',data:{...first.body.workout,id:'another-user-workout'}});
 const read=await run('GET',null,{id:first.body.workout.id});assert.equal(read.body.length,1);assert.deepEqual(read.body[0],first.body.workout);
 assert.equal(calls.filter(c=>c.method==='POST').length,1);
}));
test('concurrent retries converge to one row when the database uniqueness migration is applied',async()=>withDatabase(async({run,rows})=>{
 const results=await Promise.all([run('POST',workout),run('POST',workout),run('POST',{...workout,idempotencyKey:'another-retry-key-1234'})]);
 assert.equal(rows.length,1);assert.equal(results.filter(r=>r.statusCode===201).length,1);
 assert.ok(results.every(r=>r.body.saved===true));
}));
test('calendar errors, zero reps and invalid query limits never touch the database',async()=>withDatabase(async({run,calls})=>{
 assert.equal((await run('POST',{...workout,date:'2026-02-30'})).statusCode,400);
 assert.equal((await run('POST',{...workout,text:'Bench press 2x0x225'})).statusCode,422);
 assert.equal((await run('GET',null,{limit:2.5})).statusCode,400);
 assert.equal(calls.length,0);
}));
