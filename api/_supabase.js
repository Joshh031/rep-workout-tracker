// Shared Supabase config + header handling for the API routes.

export function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY || "";
  return { url, key };
}

// Legacy Supabase keys are JWTs (eyJ...) and are sent as both apikey and a
// Bearer token. The new sb_secret_/sb_publishable_ keys are NOT JWTs — they
// go in the apikey header only; a Bearer header with a non-JWT value can be
// rejected by the gateway.
export function supabaseHeaders(key) {
  const h = { "Content-Type": "application/json", apikey: key };
  if (key.startsWith("eyJ")) h.Authorization = `Bearer ${key}`;
  return h;
}
