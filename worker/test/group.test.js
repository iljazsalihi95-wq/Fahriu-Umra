import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../src/index.js";

const origin = "https://fahriu-travel-umrah.netlify.app";
const digest = token => createHash("sha256").update(token).digest("hex");

test("Private group workflow persists records and enforces group membership", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../migrations/0001_group.sql", import.meta.url), "utf8"));
  const insert = sqlite.prepare("INSERT INTO travel_members VALUES (?, ?, ?, ?, ?)");
  const organizer = "a".repeat(64);
  const traveler = "b".repeat(64);
  const outsider = "c".repeat(64);
  insert.run(digest(organizer), "A", "Test organizer", "organizer", 1);
  insert.run(digest(traveler), "A", "Test traveler", "member", 1);
  insert.run(digest(outsider), "B", "Other organizer", "organizer", 1);

  const DB = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      return { bind(...args) { return {
        first: () => statement.get(...args),
        all: () => ({results:statement.all(...args)}),
        run: () => ({meta:statement.run(...args)})
      }; } };
    }
  };
  const request = (path, token, method = "GET", data, from = origin) => worker.fetch(
    new Request(origin + "/api/group/" + path, {
      method,
      headers:{Origin:from, ...(token ? {Authorization:"Bearer " + token} : {})},
      body:data === undefined ? undefined : JSON.stringify(data)
    }), {DB, ALLOWED_ORIGINS:origin}
  );

  assert.equal((await request("updates")).status, 401);
  assert.equal((await request("messages", traveler, "GET", undefined, "https://example.org")).status, 403);
  assert.equal((await (await request("session", traveler)).json()).role, "member");
  const meeting = {
    kind:"meeting", title_sq:"Takimi i provës", title_de:"Testtreffen",
    details_sq:"Udhëzimet", details_de:"Hinweise", starts_at:"2026-12-25T10:00:00.000Z",
    location:"Test", maps_url:"https://example.org/map"
  };
  assert.equal((await request("updates", traveler, "POST", meeting)).status, 403);
  assert.equal((await request("updates", organizer, "POST", {...meeting, maps_url:"javascript:alert(1)"})).status, 400);
  assert.equal((await request("updates", organizer, "POST", meeting)).status, 201);
  const [item] = (await (await request("updates", traveler)).json()).items;
  assert.equal(item.title_de, meeting.title_de);
  assert.equal((await request("attendance/" + item.id, outsider, "POST")).status, 404);
  assert.equal((await request("attendance/" + item.id, traveler, "POST")).status, 200);
  assert.equal((await request("attendance/" + item.id, traveler, "POST")).status, 200);
  assert.equal((await (await request("updates", traveler)).json()).items[0].attending, 1);
  assert.equal((await request("updates/" + item.id, outsider, "PUT", meeting)).status, 404);
  assert.equal((await request("updates/" + item.id, organizer, "PUT", {...meeting, title_de:"Aktualisiert"})).status, 200);
  assert.equal((await (await request("updates", traveler)).json()).items[0].title_de, "Aktualisiert");
  for (const kind of ["notice", "program"]) {
    assert.equal((await request("updates", organizer, "POST", {...meeting, kind})).status, 201);
  }
  assert.equal((await (await request("updates", traveler)).json()).items.length, 3);
  assert.deepEqual((await (await request("updates", outsider)).json()).items, []);

  assert.equal((await request("messages", traveler, "POST", {body:"Mesazh prove"})).status, 201);
  const [message] = (await (await request("messages", organizer)).json()).items;
  assert.equal(message.body, "Mesazh prove");
  assert.equal(message.sender, "Test traveler");
  assert.deepEqual((await (await request("messages", outsider)).json()).items, []);
  assert.equal((await request("messages/" + message.id, traveler, "DELETE")).status, 403);
  assert.equal((await request("messages/" + message.id, organizer, "DELETE")).status, 200);
  assert.deepEqual((await (await request("messages", organizer)).json()).items, []);
  sqlite.prepare("UPDATE travel_members SET active = 0 WHERE token_hash = ?").run(digest(traveler));
  assert.equal((await request("messages", traveler)).status, 401);
  sqlite.close();
});
