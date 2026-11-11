const test = require("node:test");
const assert = require("node:assert");
console.log = () => {};
console.error = () => {};

process.env.SANDBOX_API_KEY = "key_test_abc";
process.env.SANDBOX_API_SECRET = "secret_xyz";

const { start } = require("../test-support/harness");
const { isVerified } = require("../utils/verificationStore");

const SANDBOX = "https://test-api.sandbox.co.in";
const TOKEN = "eyJ.access.token"; // what /authenticate hands back

// A stand-in for Sandbox. Like the real one, it only accepts the token when it is sent as-is.
const seen = [];
let initMode = "ok";           // "ok" | "refuse"
let sessionStatus = "succeeded";
const realFetch = global.fetch;
const reply = (status, body) => Promise.resolve({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });

global.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (!u.startsWith(SANDBOX)) return realFetch(url, opts);

  const headers = Object.fromEntries(Object.entries(opts.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  seen.push({ url: u.slice(SANDBOX.length), method: opts.method || "GET", headers, body: opts.body ? JSON.parse(opts.body) : undefined });

  if (u.endsWith("/authenticate")) return reply(200, { access_token: TOKEN });
  if (headers.authorization !== TOKEN) return reply(403, { code: 403, message: "Insufficient privilege" }); // e.g. a "Bearer …" token
  if (u.endsWith("/kyc/digilocker/sessions/init")) {
    return initMode === "refuse"
      ? reply(403, { code: 403, message: "Insufficient privilege" })
      : reply(200, { data: { authorization_url: "https://digilocker.example/consent?x=1", session_id: "sess-1" } });
  }
  if (u.endsWith("/status")) return reply(200, { data: { status: sessionStatus } });
  return reply(404, { message: "unmocked " + u });
};

let ctx;
test.before(async () => { ctx = await start(); });
test.after(() => { global.fetch = realFetch; ctx.server.close(); });
test.beforeEach(() => { seen.length = 0; initMode = "ok"; sessionStatus = "succeeded"; });

const initiate = (aadhaar, role) => ctx.call("POST", "/api/digilocker/initiate", { body: { aadhaar, role } });
const callback = (state) => realFetch(`${ctx.base}/api/digilocker/callback?state=${encodeURIComponent(state)}`, { redirect: "manual" });

test("the access token is sent the way Sandbox requires: as-is, never as a 'Bearer' token", async () => {
  const r = await initiate("111111111111", "patient");
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.strictEqual(r.body.authorizationUrl, "https://digilocker.example/consent?x=1");

  const init = seen.find((c) => c.url === "/kyc/digilocker/sessions/init");
  assert.strictEqual(init.headers.authorization, TOKEN);
  assert.ok(!/bearer/i.test(init.headers.authorization));
  assert.strictEqual(init.headers["x-api-key"], "key_test_abc");
  assert.deepStrictEqual(init.body, {
    "@entity": "in.co.sandbox.kyc.digilocker.session.request",
    flow: "signin",
    doc_types: ["aadhaar"],
    redirect_url: "https://healthmirror.duckdns.org/api/digilocker/callback"
  });
});

test("the session-status check on the way back uses the same header format", async () => {
  await initiate("222222222222", "patient");
  const back = await callback("abc|sess-1|def");
  assert.strictEqual(back.status, 302);
  assert.match(back.headers.get("location"), /\/\?digilocker=success$/);

  const status = seen.find((c) => c.url === "/kyc/digilocker/sessions/sess-1/status");
  assert.strictEqual(status.headers.authorization, TOKEN);
  assert.ok(!/bearer/i.test(status.headers.authorization));
});

test("a successful consent marks that Aadhaar verified, and flags an existing patient or doctor record", async () => {
  const m = ctx.models;
  await new m.Patient({ aadhaar_id: "333333333333", name: "Alice" }).save();
  await new m.Doctor({ doctorRegId: "DOC-9", name: "Asha Rao", aadhaarNumber: "777777777777" }).save();

  await initiate("333333333333", "patient");
  assert.strictEqual(isVerified("333333333333"), false);
  const back = await callback("a|sess-1|b");
  assert.match(back.headers.get("location"), /\/\?digilocker=success$/);
  assert.strictEqual(isVerified("333333333333"), true);
  const patient = await m.Patient.findOne({ aadhaar_id: "333333333333" });
  assert.strictEqual(patient.digilockerVerified, true);
  assert.ok(patient.digilockerVerifiedAt instanceof Date);

  await initiate("777777777777", "doctor");
  await callback("a|sess-1|b");
  assert.strictEqual((await m.Doctor.findOne({ doctorRegId: "DOC-9" })).digilockerVerified, true);
  // roles are kept apart: the doctor's Aadhaar didn't flag any patient
  assert.strictEqual((await m.Patient.find({ digilockerVerified: true })).length, 1);
});

test("a refused or abandoned consent does not verify anyone, and a stale or forged state is rejected", async () => {
  await initiate("444444444444", "patient");
  sessionStatus = "failed";
  const refused = await callback("a|sess-1|b");
  assert.match(refused.headers.get("location"), /\?digilocker=failed$/);
  assert.strictEqual(isVerified("444444444444"), false);

  const unknown = await callback("a|never-issued|b");
  assert.match(unknown.headers.get("location"), /\?digilocker=error$/);
  const missing = await callback("");
  assert.match(missing.headers.get("location"), /\?digilocker=error$/);
});

test("when Sandbox refuses the session, the user gets a clear message and nothing is marked verified", async () => {
  initMode = "refuse";
  const r = await initiate("555555555555", "patient");
  assert.strictEqual(r.status, 502);
  assert.match(r.body.message, /Couldn't start DigiLocker verification/);
  assert.strictEqual(isVerified("555555555555"), false);
});

test("a request with no Aadhaar, or a server with no Sandbox keys, fails clearly", async () => {
  assert.strictEqual((await initiate(undefined, "patient")).status, 400);

  const key = process.env.SANDBOX_API_KEY;
  delete process.env.SANDBOX_API_KEY;
  try {
    const r = await initiate("666666666666", "patient");
    assert.strictEqual(r.status, 500);
    assert.match(r.body.message, /SANDBOX_API_KEY/);
  } finally {
    process.env.SANDBOX_API_KEY = key;
  }
});
