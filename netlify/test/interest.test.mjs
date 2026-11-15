import test from "node:test";
import assert from "node:assert/strict";
import interest from "../functions/interest.mjs";

test("Fahriu interest forwards the existing Apps Script form and checks its response", async t => {
  const site = "https://fahriu-travel-umrah.netlify.app";
  const endpoint = "https://script.google.com/macros/s/mock-deployment/exec";
  let configuredUrl = endpoint;
  let confirmed = true;
  globalThis.Netlify = {env: {get: () => configuredUrl}};
  const upstream = t.mock.method(globalThis, "fetch", async (url, {method, body}) => {
    assert.equal(url, endpoint);
    assert.equal(method, "POST");
    assert.equal(body.get("action"), "apply");
    assert.equal(body.get("firstName"), "Test");
    assert.equal(body.get("whatsapp"), "+49000");
    assert.equal(body.has("arbitrary"), false);
    return Response.json({ok: confirmed, internal: "upstream details"});
  });
  const submit = (fields, origin = site) => interest(new Request(site + "/api/interest", {
    method: "POST", headers: {Origin: origin}, body: JSON.stringify(fields)
  }));
  const fields = {firstName: " Test ", phone: "+49000", arbitrary: "ignored"};
  assert.equal((await submit(fields, "https://example.org")).status, 403);
  assert.equal((await submit({firstName: "Test"})).status, 400);
  assert.equal(upstream.mock.callCount(), 0);
  const response = await submit(fields);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {ok: true});
  confirmed = false;
  assert.equal((await submit(fields)).status, 502);
  configuredUrl = "";
  assert.equal((await submit(fields)).status, 503);
  assert.equal(upstream.mock.callCount(), 2);
});
