import test from 'node:test';import assert from 'node:assert/strict';import {authorizeMcp} from '../api/_oauth.js';import metadata from '../api/oauth-resource.js';
test('OAuth authentication fails closed without configuration',async()=>{
 const req={headers:{authorization:'Bearer not-an-oauth-token'}};
 assert.equal(await authorizeMcp(req),false);
});
test('metadata remains disabled until trusted OAuth provider configured',()=>{
 const old=process.env.REP_OAUTH_ISSUER;delete process.env.REP_OAUTH_ISSUER;
 let status=0,body;const res={status(n){status=n;return this},setHeader(){return this},json(j){body=j;return this}};
 try{metadata({method:'GET'},res);assert.equal(status,503);assert.match(body.error,/not yet configured/);}
 finally{if(old!==undefined)process.env.REP_OAUTH_ISSUER=old;}
});