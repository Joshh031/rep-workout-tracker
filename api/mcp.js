// Stateless MCP adapter: public protocol/tool descriptions, private workout tools.
import {authorizeMcp} from './_oauth.js';
import workoutApi from './chatgpt-workouts.js';
import runApi from './chatgpt-runs.js';

const VERSIONS=['2025-03-26','2025-06-18','2025-11-25'];
const VERSION=VERSIONS.at(-1);
const METADATA='https://rep-workout-tracker.vercel.app/.well-known/oauth-protected-resource';
const ORIGINS=new Set(['https://chatgpt.com','https://rep-workout-tracker.vercel.app']);
const TYPES=['chest','back','legs','shoulders','biceps','triceps','running'];
const instructions='Use REP as the source of truth for Workout Goals coaching. Read recorded workouts before discussing progression or saving. Interpret NxRxW as sets x reps x pounds; expand every group, including semicolon-separated groups. Confirm the date (America/New_York), workout type, names and all sets, reps and weights before saving; clarify ambiguity. Never save plans. Reuse the same idempotencyKey on retries. After saving, read back the returned workout ID and report only verified data. For runs, confirm cumulative stops, total distance, elapsed time and maximum speed; use rep_save_run. Keep coaching in the current conversation.';
const TOOL_LIST=[
 {name:'rep_get_workouts',title:'Read REP workouts',description:'Read actual saved REP workouts for progression or duplicate checking. Filter by date, workout type or workout ID; use offset to page through older history. No changes.',
  annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
  securitySchemes:[{type:'oauth2',scopes:['rep:read']}],
  inputSchema:{type:'object',properties:{
   limit:{type:'integer',minimum:1,maximum:100,description:'Page size (default 20)'},
   offset:{type:'integer',minimum:0,description:'Number of records to skip (default 0)'},
   date:{type:'string',description:'Workout date YYYY-MM-DD'},
   type:{type:'string',enum:TYPES},
   id:{type:'string',minLength:1,maxLength:128,description:'Exact workout ID returned when saved'}
  },additionalProperties:false}},
 {name:'rep_save_run',title:'Save a completed run',description:'Save a confirmed treadmill or outdoor run into REP. Times are cumulative elapsed seconds including any pauses unless stated otherwise. Read for duplicates before saving. Never save a plan. Use the same idempotency key on retries.',
  annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false},
  securitySchemes:[{type:'oauth2',scopes:['rep:read','rep:write']}],
  inputSchema:{type:'object',properties:{
   date:{type:'string',description:'Run date YYYY-MM-DD'},
   distanceMiles:{type:'number',description:'Total distance in miles'},
   durationSeconds:{type:'integer',description:'Cumulative elapsed seconds'},
   maxSpeedMph:{type:'number',description:'Maximum speed in mph'},
   stops:{type:'array',description:'Optional cumulative checkpoints, ordered by elapsed time',items:{type:'object',properties:{elapsedSeconds:{type:'integer'},distanceMiles:{type:'number'},maxSpeedMph:{type:'number'}},required:['elapsedSeconds','distanceMiles'],additionalProperties:false}},
   notes:{type:'string',maxLength:1000},
   idempotencyKey:{type:'string',minLength:16,maxLength:128},
   confirmed:{type:'boolean',const:true}
  },required:['date','distanceMiles','durationSeconds','maxSpeedMph','idempotencyKey','confirmed'],additionalProperties:false}},
 {name:'rep_save_workout',title:'Save a confirmed REP workout',description:'Save a completed workout only after the user explicitly confirms the date, workout type, exercise names and every set, rep and weight in pounds. Read existing records first. Never save drafts, plans or hypothetical workouts. Reuse the idempotency key when retrying.',
  annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false},
  securitySchemes:[{type:'oauth2',scopes:['rep:read','rep:write']}],
  inputSchema:{type:'object',properties:{
   date:{type:'string',description:'Confirmed workout date YYYY-MM-DD, using America/New_York for relative dates'},
   type:{type:'string',enum:TYPES},
   text:{type:'string',maxLength:8000,description:'One exercise per line in sets x reps x pounds notation; e.g. Bench press 1x8x225; 2x10x205. Do not omit any sets.'},
   idempotencyKey:{type:'string',minLength:16,maxLength:128,description:'Stable unique ID for this completed workout. Reuse on retries.'},
   confirmed:{type:'boolean',const:true,description:'True only after the user explicitly confirms saving these exact workout details'}
  },required:['date','type','text','idempotencyKey','confirmed'],additionalProperties:false}}
];
const reply=(res,id,result)=>res.status(200).json({jsonrpc:'2.0',id,result});
const fail=(res,id,code,message,status=200)=>res.status(status).json({jsonrpc:'2.0',id,error:{code,message}});
function authenticationRequired(res,id,tool,error='invalid_token'){
 const description=error==='insufficient_scope'?'Grant rep:read and rep:write to save confirmed workouts':'Connect REP with a valid access token before reading or saving workouts';
 const challenge=`Bearer error="${error}", error_description="${description}", scope="rep:read rep:write", resource_metadata="${METADATA}"`;
 // Only fixed tool names and outcomes are logged; never credentials or arguments.
 console.info(JSON.stringify({event:'rep_mcp_auth_required',tool:tool.name,error}));
 res.setHeader('WWW-Authenticate',challenge);
 return reply(res,id,{isError:true,content:[{type:'text',text:description+'. No workout data was read or changed.'}],_meta:{'mcp/www_authenticate':[challenge]}});
}
function invokeWorkoutApi(method,args={},isRun=false){
 return new Promise(resolve=>{
  const req={method,headers:{authorization:'Bearer '+(process.env.REP_CHATGPT_TOKEN||'')},query:args,body:args};
  const res={status(n){this.code=n;return this},json(payload){resolve({status:this.code||200,payload});return this},setHeader(){}};
  Promise.resolve((isRun?runApi:workoutApi)(req,res)).catch(()=>resolve({status:500,payload:{error:'Workout service unavailable'}}));
 });
}
function validateArgs(tool,args){
 if(!args||typeof args!=='object'||Array.isArray(args))return false;
 const schema=tool.inputSchema;
 if(Object.keys(args).some(k=>!Object.hasOwn(schema.properties,k)))return false;
 if((schema.required||[]).some(k=>!Object.hasOwn(args,k)))return false;
 return Object.entries(args).every(([key,value])=>{
  const rule=schema.properties[key];
  if(rule.type==='array'){if(!Array.isArray(value))return false;return value.every(item=>item&&typeof item==='object'&&!Array.isArray(item)&&Object.entries(item).every(([k,v])=>rule.items.properties[k]&&typeof v===rule.items.properties[k].type)&&rule.items.required.every(k=>Object.hasOwn(item,k))&&Object.keys(item).every(k=>Object.hasOwn(rule.items.properties,k)));}
  if(rule.type==='number'&&(typeof value!=='number'||!Number.isFinite(value)))return false;
  if(rule.type==='integer'&&(!Number.isInteger(value)||value<(rule.minimum??-Infinity)||value>(rule.maximum??Infinity)))return false;
  if(!['integer','number','array'].includes(rule.type)&&typeof value!==rule.type)return false;
  if(typeof value==='string'&&(value.length<(rule.minLength??0)||value.length>(rule.maxLength??Infinity)))return false;
  if(rule.enum&&!rule.enum.includes(value))return false;
  return !Object.hasOwn(rule,'const')||value===rule.const;
 });
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const origin=req.headers?.origin;
 if(origin&&!ORIGINS.has(origin))return res.status(403).json({error:'Origin not allowed'});
 if(req.method!=='POST'){
  if(!(await authorizeMcp(req))){
   res.setHeader('WWW-Authenticate',`Bearer resource_metadata="${METADATA}", scope="rep:read rep:write"`);
   return res.status(401).json({error:'Unauthorized'});
  }
  res.setHeader('Allow','POST');
  return res.status(405).json({error:'This stateless MCP endpoint uses POST'});
 }
 const version=req.headers?.['mcp-protocol-version'];
 if(version&&!VERSIONS.includes(version))return fail(res,null,-32600,'Unsupported MCP protocol version',400);
 let msg=req.body;
 if(typeof msg==='string'){try{msg=JSON.parse(msg)}catch{return fail(res,null,-32700,'Invalid JSON',400)}}
 if(!msg||Array.isArray(msg)||msg.jsonrpc!=='2.0'||typeof msg.method!=='string')return fail(res,null,-32600,'Invalid JSON-RPC request',400);
 if(!Object.hasOwn(msg,'id'))return res.status(202).end();
 if(typeof msg.id!=='string'&&!(typeof msg.id==='number'&&Number.isFinite(msg.id)))return fail(res,null,-32600,'Invalid request ID',400);
 if(msg.method==='initialize'){
  console.info(JSON.stringify({event:'rep_mcp_discovery',operation:'initialize'}));
  const negotiated=VERSIONS.includes(msg.params?.protocolVersion)?msg.params.protocolVersion:VERSION;
  res.setHeader('MCP-Protocol-Version',negotiated);
  return reply(res,msg.id,{protocolVersion:negotiated,capabilities:{tools:{listChanged:false}},serverInfo:{name:'rep-workout-tracker',version:'1.1.1'},instructions});
 }
 res.setHeader('MCP-Protocol-Version',version||'2025-03-26');
 if(msg.method==='ping')return reply(res,msg.id,{});
 if(msg.method==='tools/list'){
  console.info(JSON.stringify({event:'rep_mcp_discovery',operation:'tools/list'}));
  return reply(res,msg.id,{tools:TOOL_LIST});
 }
 if(msg.method==='tools/call'){
  const tool=TOOL_LIST.find(t=>t.name===msg.params?.name);
  if(!tool)return fail(res,msg.id,-32602,'Unknown tool');
  // Discovery never opens the database. Every data operation must pass OAuth
  // before argument handling or the private REST adapter can execute.
  if(!(await authorizeMcp(req)))return authenticationRequired(res,msg.id,tool);
  const args=msg.params?.arguments??{};
  if(['rep_save_workout','rep_save_run'].includes(tool.name)&&!(await authorizeMcp(req,'rep:write'))){
   return authenticationRequired(res,msg.id,tool,'insufficient_scope');
  }
  if(!validateArgs(tool,args))return fail(res,msg.id,-32602,'Invalid tool arguments; saving requires confirmed: true and complete workout details');
  const {status,payload}=await invokeWorkoutApi(tool.name==='rep_get_workouts'?'GET':'POST',args,tool.name==='rep_save_run');
  console.info(JSON.stringify({event:'rep_mcp_tool_result',tool:tool.name,status}));
  const result={isError:status>=400,content:[{type:'text',text:JSON.stringify(payload)}]};
  if((version||'2025-03-26')!=='2025-03-26')result.structuredContent=Array.isArray(payload)?{workouts:payload}:payload;
  return reply(res,msg.id,result);
 }
 return fail(res,msg.id,-32601,'Method not found');
}
