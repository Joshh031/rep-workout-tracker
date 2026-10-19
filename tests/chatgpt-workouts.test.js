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
