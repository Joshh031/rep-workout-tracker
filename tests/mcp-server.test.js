import test from 'node:test';import assert from 'node:assert/strict';import handler from '../api/mcp.js';
function run(method,body,authorization){return new Promise((resolve,reject)=>{const req={method,body,headers:{authorization}};const res={status(n){this.statusCode=n;return this},setHeader(){return this},json(x){resolve({status:this.statusCode||200,body:x});return this},end(){resolve({status:this.statusCode||200})}};Promise.resolve(handler(req,res)).catch(reject);});}
test('private MCP rejects calls without bearer credentials',async()=>{const x=await run('POST',{jsonrpc:'2.0',id:1,method:'tools/list'});assert.equal(x.status,401);});
test('MCP initializes and only advertises scoped REP tools',async()=>{
 const prior=process.env.REP_CHATGPT_TOKEN;process.env.REP_CHATGPT_TOKEN='unit-test-private-mcp-key';
 try{const auth='Bearer unit-test-private-mcp-key';
 const init=await run('POST',{jsonrpc:'2.0',id:1,method:'initialize',params:{}},auth);
 assert.equal(init.body.result.serverInfo.name,'rep-workout-tracker');
 const list=await run('POST',{jsonrpc:'2.0',id:2,method:'tools/list'},auth);
 assert.deepEqual(list.body.result.tools.map(t=>t.name),['rep_get_workouts','rep_save_workout']);
 const reject=await run('POST',{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'rep_save_workout',arguments:{}}},auth);
 assert.equal(reject.body.result.isError,true);
 }finally{if(prior===undefined)delete process.env.REP_CHATGPT_TOKEN;else process.env.REP_CHATGPT_TOKEN=prior;}
});