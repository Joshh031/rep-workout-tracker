# REP + Workout Goals integration

REP remains the existing Vite/React site and Supabase database. Coaching stays
in the user's existing Workout Goals conversation. Do not recreate the app,
database, Auth0 tenant/API/client, or an existing ChatGPT connection.

## Implemented server behavior

- `POST /api/mcp`: authenticated, stateless Streamable HTTP; negotiates
  2025-03-26, 2025-06-18 and 2025-11-25. GET/DELETE return 405.
- `rep_get_workouts`: actual records, server-bound to `REP_USER_ID`, with date,
  type, exact ID and limit/offset filters. Use paging for older progression data.
- `rep_save_workout`: requires both read/write scopes and explicit
  `confirmed: true`; accepts one exercise per line, including mixed set groups
  such as `Bench press 1x8x225; 2x10x205`.
- Rejects impossible calendar dates, invalid tool arguments and zero reps.
- JWT verification checks signature, issuer, audience, expiry, subject and
  scopes; unknown signing-key IDs trigger a JWKS refresh. Existing private
  REST bearer access is retained. Never send that bearer token to the model.
- OAuth scopes are declared on tools. Permission failures include an MCP
  authentication challenge so ChatGPT can request the missing permission.
- Server instructions require confirmation, retry-safe IDs and read-back.
- Retry handling recognizes the same key and equivalent workout content,
  preserves existing records, and never overwrites on conflict.

## Database prerequisite for concurrent duplicate protection

Applied and verified `supabase/migrations/20261020172324_rep_chatgpt_workout_uniqueness_and_private_access.sql`
on the existing REP project on 2026-10-20. Both partial unique indexes are
valid. The pre-existing public workout policy is restricted to the backend
service role; RLS remains enabled. Record count and full-record checksum were
unchanged, and the production backend database health check still succeeds.
The transaction fails if existing ChatGPT records violate the ID constraint;
do not delete history to force it through.

The database now arbitrates simultaneous ChatGPT inserts by workout ID and
canonical content hash. A real, user-approved save/retry/read-back test through
ChatGPT remains pending; unit tests are not a substitute for that test.

## OAuth client connection

Use the existing Auth0 **REP ChatGPT Connector** Regular Web Application and
**REP Workout Tracker API**. In ChatGPT's existing connection, select OAuth
and User-Defined OAuth Client. Keep the client secret in the secure connection
form only, never in source code, URLs, chat or logs.

- MCP URL and expected audience:
  `https://rep-workout-tracker.vercel.app/api/mcp`
- Issuer: the exact Auth0 issuer, including its trailing slash; it must match
  protected-resource metadata and the token's `iss` claim.
- Base scopes: `openid rep:read rep:write`. Only add `offline_access` if Auth0
  allows refresh tokens for this API/application.
- Copy the **exact callback shown by this existing ChatGPT connection** into
  the existing Auth0 application's Allowed Callback URLs. Do not guess it or
  recreate a connection to obtain a different callback.
- Match the client authentication method in ChatGPT and Auth0, normally
  `client_secret_post` or `client_secret_basic` for a confidential web client.
- Authorization Code with S256 PKCE must be enabled. Do not switch to password
  grants, disable JWT checks, or make the MCP endpoint anonymous.
- ChatGPT sends `resource`, while Auth0 traditionally uses `audience`. Inspect
  Auth0's **Resource Parameter Compatibility Profile** and set it to
  `compatibility` if required so the REP resource selects the existing REP API.
  Avoid a tenant-wide default audience that can affect unrelated applications.
- If API RBAC is enabled, verify that the authorized user has `rep:read` and
  `rep:write`. Defining API permissions alone does not assign them to users.

Protected-resource discovery is available at both
`/.well-known/oauth-protected-resource` and
`/.well-known/oauth-protected-resource/api/mcp`.

## Deployment configuration

Required: `REP_USER_ID`, `REP_CHATGPT_TOKEN`, `REP_OAUTH_SUB`,
`REP_OAUTH_ISSUER`, `REP_OAUTH_AUDIENCE`, `REP_OAUTH_JWKS_URL`.
Database access uses `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`, with the existing
`VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` fallback retained for compatibility.
The browser does not reference these fallback keys. Do not add such references.
A successful `/api/health` database check proves backend connectivity only,
not an authenticated account-specific MCP read or a working ChatGPT connection.

## Acceptance checks (do not mark complete without actual results)

1. Authenticate in ChatGPT and call `rep_get_workouts`; record an actual date,
   exercise and sets from the bound account. Do not substitute mock data or a
   direct database query for this MCP verification.
2. Ask the user to approve the **specific** real workout to save. Prefer a
   confirmed completed workout missing from REP rather than invented test data.
3. Save once, read the returned ID back, and check it in REP.
4. Repeat the identical request/key and confirm one database row. Also verify
   concurrent retries after the indexes have been applied.
5. Open the existing Workout Goals conversation, select `@REP Workout Tracker`
   if the composer offers it, and make a read-only lookup there. Inspect actual
   conversation availability; do not assume a new connection is auto-attached.
   Do not substitute a new GPT or conversation without explaining a verified
   platform limitation.

Run `npm test` and `npm run build` before deployment. Local tests use synthetic
workouts and signed test JWTs; they do not create production workout records.

Official references:
- https://developers.openai.com/plugins/build/auth
- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://auth0.com/docs/get-started/auth0-overview/create-applications/register-applications-with-cimd
- https://modelcontextprotocol.io/specification/2025-11-25/basic/transports

## Verified status, 2026-10-20

PR #48 is deployed to production. All 100 automated tests and the build pass.
Live checks confirm both metadata routes return 200, missing/invalid credentials
return 401 with scopes, and an untrusted Origin returns 403. Direct authenticated
database reads work, but these are not an OAuth MCP tool call.

Remaining: inspect the existing Auth0 application/client settings and complete
ChatGPT OAuth, then perform an approved save/read-back/retry test in the existing
Workout Goals conversation. In this run the Auth0 dashboard blocked the cloud
browser with security verification; ChatGPT Google sign-in returned HTTP 520.
The precise client-side OAuth failure cannot be established from public
discovery alone. No new plugin, Auth0 application or database was created.
