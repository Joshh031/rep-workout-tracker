// MCP OAuth protected-resource metadata (RFC 9728).
export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const issuer=process.env.REP_OAUTH_ISSUER;
 if(!issuer||!/^https:\/\//.test(issuer))return res.status(503).json({error:'OAuth provider not yet configured'});
 return res.status(200).json({resource:'https://rep-workout-tracker.vercel.app/api/mcp',authorization_servers:[issuer],scopes_supported:['rep:read','rep:write']});
}