// Shared test scaffolding: a Vercel-style res mock and a fetch router.

export const mockRes = () => {
  const r = {
    statusCode: 200, headers: {}, body: null,
    status(c) { r.statusCode = c; return r; },
    json(b) { r.body = b; return r; },
    send(t) { r.body = t; return r; },
    setHeader(k, v) { r.headers[k] = v; },
  };
  return r;
};

export const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

// Install a fetch stub. `routes` is [[matcher, handler]]: matcher is a
// substring or RegExp tested against the URL; handler(url, init) returns a
// Response-like (or a plain body, which is wrapped as 200 JSON). Every call is
// recorded in `calls` so tests can assert on writes.
export function stubFetch(routes) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || "GET", body: init.body ? JSON.parse(init.body) : null, headers: init.headers || {} });
    for (const [m, h] of routes) {
      const hit = m instanceof RegExp ? m.test(String(url)) : String(url).includes(m);
      if (hit) {
        const out = await h(String(url), init);
        const responseLike = out && (typeof out.json === "function" || typeof out.text === "function");
        return responseLike ? out : jsonResponse(out);
      }
    }
    throw new Error(`unstubbed fetch: ${url}`);
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}
