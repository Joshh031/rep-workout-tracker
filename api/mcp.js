// Private, stateless MCP Streamable HTTP adapter for REP.
// Keeps authentication, validation and persistence in the existing workout API.
import {authorizeMcp} from './_oauth.js';
import workoutApi from './chatgpt-workouts.js';

const VERSION='2025-03-26';
const TOOL_LIST=[
 {name:'rep_get_workouts',description:'Read the latest recorded REP workouts (no changes).',inputSchema:{type:'object',properties:{limit:{type:'integer',minimum:1,maximum:100,description:'Number of recent workouts (default 20)'}},additionalProperties:false}},
 {name:'rep_save_workout',description:'Save a completed workout to REP after the user has explicitly confirmed the exercise names, sets, repetitions, weights, workout type and date. Never save drafts, plans or hypothetical workouts.',inputSchema:{type:'object',properties:{
   date:{type:'string',description:'Workout date YYYY-MM-DD'},
   type:{type:'string',enum:['chest','back','legs','shoulders','biceps','triceps']},
   text:{type:'string',description:'Completed workout in REP notation, one exercise per line; e.g. Bench Press 3x8x225.'},
   idempotencyKey:{type:'string',minLength:16,maxLength:128,description:'Stable unique ID for this completed workout. Reuse on retries.'},
   confirmed:{type:'boolean',const:true,description:'True only after explicit user confirmation to save this completed workout'}
 },required:['date','type','text','idempotencyKey','confirmed'],additionalProperties:false}}
];
const reply=(res,id,result)=>res.status(200).json({jsonrpc:'2.0',id,result});
const fail=(res,id,code,message,status=200)=>res.status(status).json({jsonrpc:'2.0',id,error:{code,message}});
function invokeWorkoutApi(req,method,args={}){
 return new Promise(resolve=>{
   const fake={method,headers:{authorization:'Bearer '+(process.env.REP_CHATGPT_TOKEN||'')},query:{limit:args.limit},body:args};
   const res={status(n){this.code=n;return this},json(payload){resolve({status:this.code||200,payload});return this},setHeader(){}};
   Promise.resolve(workoutApi(fake,res)).catch(()=>resolve({status:500,payload:{error:'Workout service unavailable'}}));
 });
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('MCP-Protocol-Version',VERSION);
 if(!(await authorizeMcp(req))){
  res.setHeader('WWW-Authenticate','Bearer resource_metadata="https://rep-workout-tracker.vercel.app/.well-known/oauth-protected-resource"');
  return res.status(401).json({error:'Unauthorized'});
 }
 if(req.method==='GET')return res.status(405).json({error:'This MCP endpoint uses POST'});
 if(req.method==='DELETE')return res.status(200).end();
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const msg=req.body||{};
 if(msg.jsonrpc!=='2.0'||typeof msg.method!=='string')return fail(res,msg.id??null,-32600,'Invalid JSON-RPC request',400);
 if(msg.method==='notifications/initialized'||msg.method==='notifications/cancelled')return res.status(202).end();
 if(!Object.prototype.hasOwnProperty.call(msg,'id'))return res.status(202).end();
 if(msg.method==='initialize')return reply(res,msg.id,{protocolVersion:VERSION,capabilities:{tools:{listChanged:false}},serverInfo:{name:'rep-workout-tracker',version:'1.0.0'}});
 if(msg.method==='ping')return reply(res,msg.id,{});
 if(msg.method==='tools/list')return reply(res,msg.id,{tools:TOOL_LIST});
 if(msg.method==='tools/call'){
  const name=msg.params?.name,args=msg.params?.arguments||{};
  if(!TOOL_LIST.some(t=>t.name===name))return fail(res,msg.id,-32602,'Unknown tool');
  if(name==='rep_save_workout'&&args.confirmed!==true)return reply(res,msg.id,{isError:true,content:[{type:'text',text:'Not saved: explicit confirmation is required.'}]});
  const {status,payload}=await invokeWorkoutApi(req,name==='rep_get_workouts'?'GET':'POST',args);
  return reply(res,msg.id,{isError:status>=400,content:[{type:'text',text:JSON.stringify(payload)}]});
 }
 return fail(res,msg.id,-32601,'Method not found');
}
