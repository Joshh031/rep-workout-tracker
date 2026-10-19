# REP + Workout Goals integration

## Existing architecture (verified)
- Vite/React application, hosted on Vercel; GitHub `Joshh031/rep-workout-tracker`.
- Completed workouts are stored in Supabase `workouts` rows with a JSON `data` payload.
- Existing `src/parse.js` handles deterministic text like `Bayesian cable curls 5x10x20` and `MTS curls 1x12x40; 2x12x50`. Unrecognized formats currently use Claude inside the app. The separate API rejects ambiguous text rather than inventing numbers.
- Existing `src/compare.js` matches lifts, and History has LOG/PR/AI/MAP/WEEK already. New INSIGHTS adds quantitative summaries.

## Proposed private connection (NOT LIVE)
- New `GET/POST /api/chatgpt-workouts` in the feature branch. The endpoint is **disabled until configured and deployed**.
- Vercel env secret `REP_CHATGPT_TOKEN`: new long random Bearer token, independent of the existing browser APP_SECRET.
- Vercel env `REP_USER_ID`: exact current user's `rep_uid` used by the app, as a server-side value; no arbitrary client user IDs.
- Existing Vercel Supabase configuration `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` remain server-side.
- See `docs/chatgpt-action.openapi.yaml` for optional private custom GPT action schema; authentication is Bearer API key.
- Read-only test first. Then save one confirmed sample workout, confirm display, and remove the sample.
- Never transmit secrets or passphrases in chat messages, screenshots, URLs or public repositories.
- No browser FUEL integration; REP stores exercise detail, FUEL stores nutrition.
- The **existing Workout Goals conversation is not itself equipped with an action**. To invoke the API directly from ChatGPT requires a supported connector or a private custom GPT with this action; it cannot be silently enabled for ordinary chats simply by committing code. Keep coaching in Workout Goals and, until connector support is set up, copy the final exercise text into REP.

## Validation before enabling
- Run `npm test` and `npm run build` (CI runs both on PR).
- Test daily text formats and name variations, including different weights/reps within a session.
- Confirm historical records retained and filtered to the right user ID.
- Review the API's idempotency handling under retries and concurrency before live usage.
- Do not deploy or merge with unreviewed credentials. The endpoint must never expose the service role key.
