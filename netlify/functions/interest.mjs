const reply = (status, body) => Response.json(body, {
  status, headers: {"Cache-Control": "no-store"}
});

export default async function interest(request) {
  if (request.method !== "POST") return reply(405, {ok: false});
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return reply(403, {ok: false});
  }
  let payload;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return reply(413, {ok: false});
    payload = JSON.parse(raw);
    if (!payload || typeof payload !== "object") return reply(400, {ok: false});
  } catch {
    return reply(400, {ok: false});
  }
  const limits = {firstName: 80, lastName: 80, phone: 40, email: 254, city: 100};
  const fields = {};
  for (const [key, limit] of Object.entries(limits)) {
    const value = typeof payload[key] === "string" ? payload[key].trim() : "";
    if (value.length > limit) return reply(400, {ok: false});
    fields[key] = value;
  }
  if (!fields.firstName || (!fields.phone && !fields.email)
    || (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))) {
    return reply(400, {ok: false});
  }

  const upstream = Netlify.env.get("FAHRIU_APPS_SCRIPT_URL");
  if (!upstream || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(upstream)) {
    return reply(503, {ok: false});
  }

  const body = new URLSearchParams({
    ...fields, action: "apply", whatsapp: fields.phone,
    interest: "Jam i interesuar për Umren e ardhshme",
    source: "Ballina Fahriu Travel"
  });
  try {
    const response = await fetch(upstream, {
      method: "POST", body, signal: AbortSignal.timeout(8000)
    });
    if (response.ok && (await response.json()).ok === true) {
      return reply(200, {ok: true});
    }
  } catch {
    return reply(502, {ok: false});
  }
  return reply(502, {ok: false});
}

export const config = {path: "/api/interest"};
