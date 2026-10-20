import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import handler from '../api/mcp.js';
function run(method,body,authorization,headers={}){return new Promise((resolve,reject)=>{
 const responseHeaders={};
 const req={method,body,headers:{authorization,...headers}};
 const res={status(n){this.statusCode=n;return this},setHeader(k,v){responseHeaders[k]=v;return this},json(x){resolve({status:this.statusCode||200,body:x,headers:responseHeaders});return this},end(){resolve({status:this.statusCode||200,headers:responseHeaders})}};
 Promise.resolve(handler(req,res)).catch(reject);
});}
test('MCP exposes only protocol and tool descriptions before OAuth, without database access',async()=>{
 const originalFetch=globalThis.fetch;let requests=0;
 globalThis.fetch=async()=>{requests++;throw Error('Discovery must not access data or JWKS')};
 try{
  const init=await run('POST',{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25'}});
  assert.equal(init.status,200);assert.equal(init.body.result.serverInfo.version,'1.1.1');
  const list=await run('POST',{jsonrpc:'2.0',id:2,method:'tools/list'});
  assert.deepEqual(list.body.result.tools.map(t=>t.name),['rep_get_workouts','rep_save_workout']);
  for(const tool of list.body.result.tools)assert.ok(tool.securitySchemes.every(s=>s.type==='oauth2'));
  assert.equal(requests,0);
 }finally{globalThis.fetch=originalFetch;}
});
test('missing and malformed tokens produce in-chat OAuth challenges and never access workouts',async()=>{
 const originalFetch=globalThis.fetch;let requests=0;
 globalThis.fetch=async()=>{requests++;throw Error('Unauthenticated calls must not reach database')};
 try{
  const cases=[['rep_get_workouts',{limit:1}],['rep_save_workout',{date:'2026-10-20',type:'chest',text:'Bench press 1x8x225',idempotencyKey:'synthetic-denied-test-key',confirmed:true}]];
  for(const authorization of [undefined,'Bearer not-a-valid-token']){
   for(const [name,args] of cases){
    const x=await run('POST',{jsonrpc:'2.0',id:3,method:'tools/call',params:{name,arguments:args}},authorization);
    assert.equal(x.status,200);assert.equal(x.body.id,3);assert.equal(x.body.result.isError,true);
    const challenge=x.body.result._meta['mcp/www_authenticate'][0];
    assert.match(challenge,/error="invalid_token"/);assert.match(challenge,/error_description=".+"/);
    assert.match(challenge,/scope="rep:read rep:write"/);assert.match(challenge,/resource_metadata=/);
    assert.equal(x.body.result.structuredContent,undefined);
   }
  }
  assert.equal(requests,0);
  const discovery=await run('GET',null);
  assert.equal(discovery.status,401);assert.match(discovery.headers['WWW-Authenticate'],/resource_metadata=/);
 }finally{globalThis.fetch=originalFetch;}
});
test('MCP negotiates supported versions and advertises permissions and workflow',async()=>{
 const prior=process.env.REP_CHATGPT_TOKEN;process.env.REP_CHATGPT_TOKEN='unit-test-private-mcp-key';
 try{
  const auth='Bearer unit-test-private-mcp-key';
  for(const version of ['2025-03-26','2025-06-18','2025-11-25']){
   const init=await run('POST',{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:version}},auth);
   assert.equal(init.body.result.protocolVersion,version);assert.match(init.body.result.instructions,/read back/i);
  }
  const list=await run('POST',{jsonrpc:'2.0',id:2,method:'tools/list'},auth);
  assert.deepEqual(list.body.result.tools.map(t=>t.name),['rep_get_workouts','rep_save_workout']);
  assert.equal(list.body.result.tools[0].annotations.readOnlyHint,true);
  assert.deepEqual(list.body.result.tools[1].securitySchemes,[{type:'oauth2',scopes:['rep:read','rep:write']}]);
  const reject=await run('POST',{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'rep_save_workout',arguments:{}}},auth);
  assert.equal(reject.body.error.code,-32602);
  assert.equal((await run('POST',{jsonrpc:'2.0',method:'notifications/initialized'},auth)).status,202);
  assert.equal((await run('DELETE',null,auth)).status,405);
  assert.equal((await run('POST','{',auth)).body.error.code,-32700);
  assert.equal((await run('POST',{jsonrpc:'2.0',id:1,method:'ping'},auth,{'mcp-protocol-version':'bogus'})).status,400);
  assert.equal((await run('POST',{jsonrpc:'2.0',id:1,method:'ping'},auth,{origin:'https://attacker.example'})).status,403);
 }finally{if(prior===undefined)delete process.env.REP_CHATGPT_TOKEN;else process.env.REP_CHATGPT_TOKEN=prior;}
});
test('actual signed OAuth read token cannot write; correct write token reaches confirmation check',async()=>{
 const keys=['REP_OAUTH_ISSUER','REP_OAUTH_AUDIENCE','REP_OAUTH_SUB','REP_OAUTH_JWKS_URL'];
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const originalFetch=globalThis.fetch;
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk={...publicKey.export({format:'jwk'}),kid:'mcp-test-key',alg:'RS256',use:'sig'};
 Object.assign(process.env,{REP_OAUTH_ISSUER:'https://issuer.example/',REP_OAUTH_AUDIENCE:'https://rep.example/mcp',REP_OAUTH_SUB:'auth0|test',REP_OAUTH_JWKS_URL:'https://issuer.example/mcp-keys'});
 globalThis.fetch=async()=>({ok:true,json:async()=>({keys:[jwk]})});
 const token=(scope,overrides={})=>{
  const h=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url');
  const p=Buffer.from(JSON.stringify({iss:process.env.REP_OAUTH_ISSUER,aud:process.env.REP_OAUTH_AUDIENCE,sub:process.env.REP_OAUTH_SUB,exp:Math.floor(Date.now()/1000)+300,scope,...overrides})).toString('base64url');
  return 'Bearer '+h+'.'+p+'.'+sign('sha256',Buffer.from(h+'.'+p),privateKey).toString('base64url');
 };
 try{
  const request={jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'rep_save_workout',arguments:{}}};
  const readOnly=await run('POST',request,token('rep:read'));
  assert.equal(readOnly.body.result.isError,true);assert.match(readOnly.body.result._meta['mcp/www_authenticate'][0],/insufficient_scope/);
  assert.equal((await run('POST',request,token('rep:read rep:write'))).body.error.code,-32602);
  for(const overrides of [{sub:'someone-else'},{aud:'other-api'},{exp:1},{iss:'https://wrong-issuer.example/'}]){
   const denied=await run('POST',request,token('rep:read rep:write',overrides));
   assert.equal(denied.body.result.isError,true);
   assert.match(denied.body.result._meta['mcp/www_authenticate'][0],/invalid_token/);
  }
 }finally{globalThis.fetch=originalFetch;for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k]}}
});
