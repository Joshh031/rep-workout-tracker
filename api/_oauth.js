// REP OAuth JWT verifier. Fail closed unless issuer, audience, account subject
// and a trusted JWKS URL are set by the REP administrator.
import {createHash,createPublicKey,verify,timingSafeEqual} from 'node:crypto';
let cache={url:'',until:0,keys:[]};
const decode=s=>JSON.parse(Buffer.from(s,'base64url').toString('utf8'));
async function trustedKeys(url){
 if(cache.url===url&&cache.until>Date.now())return cache.keys;
 const resp=await fetch(url,{signal:AbortSignal.timeout(4000)});
 if(!resp.ok)throw Error('JWKS unavailable');
 const body=await resp.json();
 if(!Array.isArray(body.keys)||body.keys.length>100)throw Error('Invalid JWKS');
 cache={url,until:Date.now()+300000,keys:body.keys};
 return cache.keys;
}
export async function authorizeMcp(req,requiredScope='rep:read'){
 const token=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token||token.length>8192)return false;
 const legacy=process.env.REP_CHATGPT_TOKEN||'';
 if(legacy){const a=createHash('sha256').update(token).digest(),b=createHash('sha256').update(legacy).digest();if(timingSafeEqual(a,b))return true;}
 const {REP_OAUTH_ISSUER:issuer,REP_OAUTH_AUDIENCE:audience,REP_OAUTH_SUB:subject,REP_OAUTH_JWKS_URL:jwksUrl}=process.env;
 if(!issuer||!audience||!subject||!jwksUrl)return false;
 try{
  const url=new URL(jwksUrl);if(url.protocol!=='https:'||new URL(issuer).protocol!=='https:')return false;
  const segments=token.split('.');if(segments.length!==3)return false;
  const [h,p,s]=segments,{alg,kid}=decode(h),claims=decode(p);
  if(!['RS256','ES256'].includes(alg)||!kid||!s)return false;
  const now=Math.floor(Date.now()/1000);
  if(!String(claims.scope||'').split(' ').includes(requiredScope))return false;
  if(claims.iss!==issuer||claims.sub!==subject||!(Array.isArray(claims.aud)?claims.aud.includes(audience):claims.aud===audience)||!Number.isFinite(claims.exp)||claims.exp<=now||claims.nbf>now||claims.iat>now+60)return false;
  const jwk=(await trustedKeys(url.href)).find(k=>k.kid===kid&&k.use!=='enc'&&(!k.alg||k.alg===alg));
  if(!jwk)return false;
  const key=createPublicKey({key:jwk,format:'jwk'});
  return verify('sha256',Buffer.from(h+'.'+p),alg==='ES256'?{key,dsaEncoding:'ieee-p1363'}:key,Buffer.from(s,'base64url'));
 }catch{return false;}
}
