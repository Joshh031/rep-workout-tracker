// Validate REP OAuth bearer tokens issued by a configured OIDC/OAuth provider.
// Fail closed until issuer, audience AND account subject are configured.
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {createHash,timingSafeEqual} from 'node:crypto';
const trustedKeys=new Map();
export async function authorizeMcp(req){
 const token=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token)return false;
 const legacy=process.env.REP_CHATGPT_TOKEN||'';
 if(legacy){const a=createHash('sha256').update(token).digest();const b=createHash('sha256').update(legacy).digest();if(timingSafeEqual(a,b))return true;}
 const issuer=process.env.REP_OAUTH_ISSUER,audience=process.env.REP_OAUTH_AUDIENCE,subject=process.env.REP_OAUTH_SUB;
 if(!issuer||!audience||!subject||!/^https:\/\//.test(issuer))return false;
 try{
  const base=new URL(issuer);if(base.protocol!=='https:')return false;
  // Provider discovery is configured explicitly. Never trust a JWKS URL from a token.
  const jwksUrl=process.env.REP_OAUTH_JWKS_URL;
  if(!jwksUrl||!/^https:\/\//.test(jwksUrl))return false;
  const url=new URL(jwksUrl);
  if(!trustedKeys.has(url.href))trustedKeys.set(url.href,createRemoteJWKSet(url));
  const {payload}=await jwtVerify(token,trustedKeys.get(url.href),{issuer,audience,algorithms:['RS256','ES256']});
  return payload.sub===subject;
 }catch{return false;}
}
