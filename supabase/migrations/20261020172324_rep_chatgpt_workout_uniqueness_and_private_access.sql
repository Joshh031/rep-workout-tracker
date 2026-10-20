-- Applied to the existing REP Supabase project; migration version 20261020172324.
-- Does not insert, update or delete workout records. If pre-existing duplicate
-- ChatGPT IDs exist, the transaction fails safely; do not delete history.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS workouts_chatgpt_id_unique
 ON public.workouts (user_id, (data->>'id'))
 WHERE data->>'source' = 'chatgpt' AND data->>'id' IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS workouts_chatgpt_content_unique
 ON public.workouts (user_id, (data->>'canonicalHash'))
 WHERE data->>'source' = 'chatgpt' AND data->>'canonicalHash' IS NOT NULL;
-- REP uses the server-side secret key. Deny direct public table access.
ALTER POLICY "public access" ON public.workouts TO service_role;
COMMIT;
