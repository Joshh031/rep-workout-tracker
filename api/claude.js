// Anthropic proxy: the browser never holds the API key. Requires the
// x-app-secret header (see _auth.js). Model is allowlisted and max_tokens
// clamped so a leaked passphrase can't run up arbitrary API spend.

import { checkAuth } from "./_auth.js";

const ALLOWED_MODELS = new Set(["claude-sonnet-4-6"]);
const MAX_TOKENS_CAP = 2000;

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const key = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_KEY;
  if (!key) {
    return res.status(500).json({ error: "Anthropic API key not configured" });
  }
  const body = req.body || {};
  if (!ALLOWED_MODELS.has(body.model)) {
    return res.status(400).json({ error: "Model not allowed" });
  }
  body.max_tokens = Math.min(body.max_tokens || 1000, MAX_TOKENS_CAP);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const text = await r.text();
  res.status(r.status);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  return res.send(text);
}
