// Shared bearer check for all /api routes (files starting with "_" are not
// exposed as endpoints by Vercel). Compares the x-app-secret header against
// the APP_SECRET env var; sha256 both sides so the comparison is
// constant-time regardless of input length.
import { createHash, timingSafeEqual } from "node:crypto";

export function checkAuth(req, res) {
  const expected = process.env.APP_SECRET;
  if (!expected) {
    res.status(500).json({ error: "APP_SECRET is not configured in Vercel environment variables" });
    return false;
  }
  // Header is the normal path; ?s= allows browser-address-bar debugging
  // (e.g. /api/oura?debug=1&s=...).
  const got = String(req.headers["x-app-secret"] || req.query?.s || "");
  const a = createHash("sha256").update(got).digest();
  const b = createHash("sha256").update(expected).digest();
  if (!timingSafeEqual(a, b)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}
