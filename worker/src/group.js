const kinds = new Set(["meeting", "program", "notice"]);

export async function groupRequest(request, env, path, reply) {
  if (!env.DB) return reply({ error: "unavailable" }, 503);
  const token = request.headers.get("Authorization")?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];
  if (!token) return reply({ error: "unauthorized" }, 401);

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const db = env.DB;
  const member = await db.prepare(
    "SELECT group_id, name, role FROM travel_members WHERE token_hash = ? AND active = 1"
  ).bind(hash).first();
  if (!member) return reply({ error: "unauthorized" }, 401);

  const { group_id: group, name, role } = member;
  const method = request.method;
  if (path === "/api/group/session" && method === "GET") {
    return reply({ name, role, group });
  }
  if (path === "/api/group/messages" && method === "GET") {
    const { results } = await db.prepare(
      "SELECT id, sender, role, body, created_at FROM travel_messages WHERE group_id = ? ORDER BY id DESC LIMIT 100"
    ).bind(group).all();
    return reply({ items: results.reverse() });
  }
  if (path === "/api/group/updates" && method === "GET") {
    const { results } = await db.prepare(
      `SELECT u.*, (r.update_id IS NOT NULL) AS attending FROM travel_updates u
       LEFT JOIN travel_rsvps r ON r.update_id = u.id AND r.token_hash = ?
       WHERE u.group_id = ? ORDER BY u.starts_at, u.id DESC`
    ).bind(hash, group).all();
    return reply({ items: results });
  }

  const record = path.match(/^\/api\/group\/(messages|updates|attendance)\/([1-9][0-9]{0,14})$/);
  if (method === "DELETE" && record && record[1] !== "attendance") {
    if (role !== "organizer") return reply({ error: "forbidden" }, 403);
    const statement = record[1] === "messages"
      ? "DELETE FROM travel_messages WHERE group_id = ? AND id = ?"
      : "DELETE FROM travel_updates WHERE group_id = ? AND id = ?";
    const result = await db.prepare(statement).bind(group, Number(record[2])).run();
    return result.meta.changes ? reply({ ok: true }) : reply({ error: "missing" }, 404);
  }
  if (method === "POST" && record?.[1] === "attendance") {
    const id = Number(record[2]);
    await db.prepare(
      `INSERT OR IGNORE INTO travel_rsvps (update_id, token_hash)
       SELECT id, ? FROM travel_updates WHERE id = ? AND group_id = ? AND kind = 'meeting'`
    ).bind(hash, id, group).run();
    const confirmed = await db.prepare(
      "SELECT 1 FROM travel_rsvps WHERE update_id = ? AND token_hash = ?"
    ).bind(id, hash).first();
    return confirmed ? reply({ ok: true }) : reply({ error: "missing" }, 404);
  }

  const writingMessage = method === "POST" && path === "/api/group/messages";
  const writingUpdate = (method === "POST" && path === "/api/group/updates")
    || (method === "PUT" && record?.[1] === "updates");
  if (!writingMessage && !writingUpdate) return reply({ error: "missing" }, 404);
  if (writingUpdate && role !== "organizer") return reply({ error: "forbidden" }, 403);
  if (env.RATE_LIMITER && !(await env.RATE_LIMITER.limit({ key: hash })).success) {
    return reply({ error: "rate_limited" }, 429);
  }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 16000) return reply({ error: "invalid" }, 400);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object") return reply({ error: "invalid" }, 400);
  } catch {
    return reply({ error: "invalid" }, 400);
  }
  const field = key => typeof body[key] === "string" ? body[key].trim() : "";
  if (writingMessage) {
    const message = field("body");
    if (!message || message.length > 3000) return reply({ error: "invalid" }, 400);
    await db.prepare(
      "INSERT INTO travel_messages (group_id, sender, role, body) VALUES (?, ?, ?, ?)"
    ).bind(group, name, role, message).run();
    return reply({ ok: true }, 201);
  }

  const kind = field("kind");
  const titles = ["title_sq", "title_de"].map(field);
  const details = ["details_sq", "details_de"].map(field);
  const date = field("starts_at");
  const location = field("location");
  const maps = field("maps_url");
  if (!kinds.has(kind) || titles.some(value => !value || value.length > 150)
      || details.some(value => !value || value.length > 3000)
      || (kind !== "notice" && !date) || (kind === "meeting" && !location)
      || (date && (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(date)
        || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString() !== date))
      || location.length > 200 || (maps && (!/^https:\/\/[^\s]+$/i.test(maps)
        || !URL.canParse(maps) || maps.length > 1000))) {
    return reply({ error: "invalid" }, 400);
  }
  const values = [kind, ...titles, ...details, date || null, location || null, maps || null, name];
  if (method === "PUT") {
    const result = await db.prepare(
      `UPDATE travel_updates SET kind = ?, title_sq = ?, title_de = ?, details_sq = ?,
       details_de = ?, starts_at = ?, location = ?, maps_url = ?, organizer = ?
       WHERE group_id = ? AND id = ? AND kind = ?`
    ).bind(...values, group, Number(record[2]), kind).run();
    return result.meta.changes ? reply({ ok: true }) : reply({ error: "missing" }, 404);
  }
  await db.prepare(
    `INSERT INTO travel_updates (group_id, kind, title_sq, title_de, details_sq, details_de,
     starts_at, location, maps_url, organizer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(group, ...values).run();
  return reply({ ok: true }, 201);
}
