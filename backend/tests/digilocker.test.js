const test = require("node:test");
const assert = require("node:assert");

process.env.SANDBOX_API_KEY = "key_test_abc";
process.env.SANDBOX_API_SECRET = "secret_xyz";

// capture everything the server logs, so we can prove no personal data is ever written to it
const logged = [];
const realLog = console.log;
const realErr = console.error;
console.log = (...a) => logged.push(a.join(" "));
console.error = (...a) => logged.push(a.join(" "));

const { start } = require("../test-support/harness");
const { isVerified, isVerifiedFor, TTL_MS, _reset: resetVerifications } = require("../utils/verificationStore");
const limits = require("../config/limits");
const { _reset } = require("../utils/rateLimit");

const SANDBOX = "https://test-api.sandbox.co.in";
const FILES = "https://files.example";
const TOKEN = "eyJ.access.token";

// ---- the document DigiLocker would return. Every personal value is unmistakable, so a leak is easy to spot.
const WHO = { name: "Bhoomi Testperson", dob: "14-03-1999", uid: "XXXXXXXX7391" };
const PII = ["Bhoomi", "Testperson", "14-03-1999", "7391", "Baner", "411045", "PHOTOBYTES", "Maharashtra"];
const photo = Buffer.from("PHOTOBYTES".repeat(300)).toString("base64");
const aadhaarXml = (who = WHO, extra = "") =>
  `<?xml version="1.0" encoding="UTF-8"?>${extra}<Certificate><CertificateData><KycRes code="c" ret="Y" ts="2026-11-11T10:00:00" ttl="2027-11-11T10:00:00" txn="t">` +
  `<UidData tkn="" uid="${who.uid}"><Poi dob="${who.dob}" gender="F" name="${who.name}"/>` +
  `<Poa country="India" dist="Pune" house="12 Flat" loc="Baner" pc="411045" state="Maharashtra" vtc="Pune"/><LData lang="06" name="x"/><Pht>${photo}</Pht></UidData></KycRes></CertificateData><Signature/></Certificate>`;

// ---- a stand-in for Sandbox and for the host that serves the file. Like the real Sandbox, it only
//      accepts the token when it is sent as-is.
let n = 0;
let lastSession;
const statuses = {};
let docMode = "ok";    // ok | credits | server_error | no_files | insecure_url | other_scheme | not_a_url
let fileMode = "ok";   // ok | not_found | forbidden | garbage | doctype
let initMode = "ok";   // ok | refuse
let document = WHO;
const calls = [];
const realFetch = global.fetch;
const reply = (status, body) => Promise.resolve({ ok: status < 400, status, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });

global.fetch = async (url, opts = {}) => {
  const u = String(url);
  const headers = Object.fromEntries(Object.entries(opts.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));

  if (u.startsWith("http://files.example")) { // a plain-http address: if the app ever fetches this, the test notices
    calls.push({ host: "files-insecure", url: u, headers });
    return reply(200, aadhaarXml(document));
  }
  if (u.startsWith(FILES)) {
    calls.push({ host: "files", url: u.slice(FILES.length), headers });
    if (fileMode === "not_found") return reply(404, "nope");
    if (fileMode === "forbidden") return reply(403, "denied");
    if (fileMode === "garbage") return reply(200, "<html><body>sign in</body></html>");
    if (fileMode === "doctype") return reply(200, aadhaarXml(document, '<!DOCTYPE x [<!ENTITY a "aaa">]>'));
    return reply(200, aadhaarXml(document));
  }
  if (!u.startsWith(SANDBOX)) return realFetch(url, opts);

  const path = u.slice(SANDBOX.length);
  calls.push({ host: "sandbox", url: path, method: opts.method || "GET", headers, body: opts.body ? JSON.parse(opts.body) : undefined });

  if (path === "/authenticate") return reply(200, { access_token: TOKEN });
  if (headers.authorization !== TOKEN) return reply(403, { code: 403, message: "Insufficient privilege" });

  if (path === "/kyc/digilocker/sessions/init") {
    if (initMode === "refuse") return reply(403, { code: 403, message: "Insufficient privilege" });
    lastSession = `sess-${++n}`;
    statuses[lastSession] = "succeeded";
    return reply(200, { data: { authorization_url: "https://digilocker.example/consent?x=1", session_id: lastSession } });
  }
  const m = path.match(/^\/kyc\/digilocker\/sessions\/([^/]+)\/(status|documents\/aadhaar)$/);
  if (m && m[2] === "status") return reply(200, { data: { status: statuses[m[1]] } });
  if (m && m[2] === "documents/aadhaar") {
    if (docMode === "credits") return reply(403, { code: 403, message: "Insufficient credits", transaction_id: "tx-1" });
    if (docMode === "server_error") return reply(500, { message: "boom" });
    if (docMode === "no_files") return reply(200, { data: { files: [] } });
    const odd = { insecure_url: "http://files.example/x.xml", other_scheme: "file:///etc/passwd", not_a_url: "not a url at all" }[docMode];
    if (odd) return reply(200, { data: { files: [{ url: odd, size: 1, metadata: { ContentType: "application/xml" } }] } });
    return reply(200, { data: { files: [{ url: `${FILES}/${m[1]}.xml`, size: 100, metadata: { ContentType: "application/xml", issuer_id: "in.gov.uidai", description: "Aadhaar Card" } }] } });
  }
  return reply(404, { message: "unmocked " + path });
};

let ctx;
test.before(async () => { ctx = await start(); });
test.after(() => { global.fetch = realFetch; console.log = realLog; console.error = realErr; ctx.server.close(); });
test.beforeEach(() => {
  Object.values(ctx.models).forEach((M) => M._reset());
  calls.length = 0;
  logged.length = 0;
  docMode = fileMode = initMode = "ok";
  document = WHO;
  limits.digilockerStartPerIp.max = 1000;
  _reset();
  resetVerifications();
});

const claim = (extra = {}) => ({ aadhaar: "555566667391", role: "patient", name: "Bhoomi Testperson", dob: "14/03/1999", ...extra });
const initiate = (body) => ctx.call("POST", "/api/digilocker/initiate", { body });
const comeBack = (sessionId) => realFetch(`${ctx.base}/api/digilocker/callback?state=${encodeURIComponent(`x|${sessionId}|y`)}`, { redirect: "manual" });
const where = (r) => r.headers.get("location").replace("https://healthmirror.duckdns.org", "");
const sandboxCalls = (path) => calls.filter((c) => c.host === "sandbox" && c.url.includes(path)).length;
const assertNoPersonalDataLogged = () => {
  const text = logged.join("\n");
  for (const p of PII) assert.ok(!text.includes(p), `"${p}" must never be logged`);
};

test("the access token goes to Sandbox as-is (never 'Bearer'), and Sandbox's credentials never go to the file host", async () => {
  const r = await initiate(claim());
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.strictEqual(r.body.authorizationUrl, "https://digilocker.example/consent?x=1");
  const init = calls.find((c) => c.url === "/kyc/digilocker/sessions/init");
  assert.strictEqual(init.headers.authorization, TOKEN);
  assert.ok(!/bearer/i.test(init.headers.authorization));
  assert.strictEqual(init.headers["x-api-key"], "key_test_abc");
  assert.deepStrictEqual(init.body, {
    "@entity": "in.co.sandbox.kyc.digilocker.session.request", flow: "signin", doc_types: ["aadhaar"],
    redirect_url: "https://healthmirror.duckdns.org/api/digilocker/callback"
  });

  await comeBack(lastSession);
  for (const c of calls.filter((x) => x.host === "sandbox" && x.url !== "/authenticate" && x.url !== "/kyc/digilocker/sessions/init")) {
    assert.strictEqual(c.headers.authorization, TOKEN, c.url);
  }
  const file = calls.find((c) => c.host === "files");
  assert.ok(file, "the file was downloaded");
  assert.deepStrictEqual(Object.keys(file.headers), [], "no credentials are sent to the file host");
});

test("nothing is sent to Sandbox unless the form details are complete and sensible", async () => {
  const bad = [
    [claim({ aadhaar: undefined }), /12-digit/], [claim({ aadhaar: "1234" }), /12-digit/], [claim({ aadhaar: "12345678901a" }), /12-digit/],
    [claim({ name: undefined }), /name/], [claim({ name: "   " }), /name/], [claim({ name: "Mr." }), /name/], [claim({ name: 42 }), /name/],
    [claim({ dob: undefined }), /date of birth/], [claim({ dob: "31/02/2000" }), /date of birth/], [claim({ dob: "1999" }), /date of birth/], [claim({ dob: "next week" }), /date of birth/]
  ];
  for (const [body, message] of bad) {
    const r = await initiate(body);
    assert.strictEqual(r.status, 400, JSON.stringify(body));
    assert.match(r.body.message, message);
  }
  assert.strictEqual(calls.length, 0, "Sandbox was never called");

  // doctors have no date of birth on their form
  assert.strictEqual((await initiate({ aadhaar: "555566667391", role: "doctor", name: "Asha Rao" })).status, 200);
  const none = await ctx.call("POST", "/api/digilocker/initiate", {});
  assert.strictEqual(none.status, 400);
});

test("an Aadhaar that already has an account is refused for free, before any verification is paid for", async () => {
  await new ctx.models.User({ aadhaar: "555566667391", password: "x" }).save();
  const r = await initiate(claim());
  assert.strictEqual(r.status, 409);
  assert.match(r.body.message, /already exists/);

  await new ctx.models.Doctor({ doctorRegId: "DOC-1", name: "Asha Rao", aadhaarNumber: "222233334444" }).save();
  assert.strictEqual((await initiate({ aadhaar: "222233334444", role: "doctor", name: "Asha Rao" })).status, 409);
  assert.strictEqual(calls.length, 0);
});

test("starting verification is rate limited per Aadhaar number and per client", async () => {
  for (let i = 0; i < 3; i++) assert.strictEqual((await initiate(claim())).status, 200);
  const blocked = await initiate(claim());
  assert.strictEqual(blocked.status, 429);
  assert.match(blocked.body.message, /Too many/);
  assert.strictEqual(sandboxCalls("/sessions/init"), 3, "the blocked attempt never reached Sandbox");

  _reset();
  limits.digilockerStartPerIp.max = 2;
  assert.strictEqual((await initiate(claim({ aadhaar: "111111111111" }))).status, 200);
  assert.strictEqual((await initiate(claim({ aadhaar: "222222222222" }))).status, 200);
  assert.strictEqual((await initiate(claim({ aadhaar: "333333333333" }))).status, 429);
});

test("matching identity: verified, the document is fetched exactly once, and none of it is logged", async () => {
  await initiate(claim());
  await new ctx.models.Patient({ aadhaar_id: "555566667391", name: "Bhoomi" }).save(); // created while verifying
  const back = await comeBack(lastSession);

  assert.strictEqual(back.status, 302);
  assert.strictEqual(where(back), "/?digilocker=success");
  assert.ok(isVerified("555566667391"));
  assert.ok(isVerifiedFor("555566667391", { name: "Bhoomi Testperson", dob: "14/03/1999" }));
  assert.strictEqual((await ctx.models.Patient.findOne({ aadhaar_id: "555566667391" })).digilockerVerified, true);

  assert.strictEqual(sandboxCalls("/documents/aadhaar"), 1);
  assert.strictEqual(calls.filter((c) => c.host === "files").length, 1);
  assertNoPersonalDataLogged();
  assert.ok(logged.some((l) => /verified/.test(l)), "the outcome itself is logged");
});

test("names and dates are matched the way people write them", async () => {
  await initiate(claim({ name: "bhoomi", dob: "14-3-1999" }));
  assert.strictEqual(where(await comeBack(lastSession)), "/?digilocker=success");
  await initiate(claim({ aadhaar: "111122227391", name: "T. Bhoomi", dob: "14.03.1999" }));
  assert.strictEqual(where(await comeBack(lastSession)), "/?digilocker=success");
});

test("a doctor is verified on Aadhaar digits and name alone", async () => {
  await initiate({ aadhaar: "555566667391", role: "doctor", name: "Dr. Bhoomi Testperson" });
  await new ctx.models.Doctor({ doctorRegId: "DOC-9", name: "Bhoomi", aadhaarNumber: "555566667391" }).save(); // created while verifying
  assert.strictEqual(where(await comeBack(lastSession)), "/?digilocker=success");
  assert.strictEqual((await ctx.models.Doctor.findOne({ doctorRegId: "DOC-9" })).digilockerVerified, true);
  assert.ok(isVerifiedFor("555566667391", { name: "Bhoomi Testperson" }));
});

test("someone else's DigiLocker is NOT accepted: any disagreement means not verified, and only the category is reported", async () => {
  const cases = [
    [claim({ aadhaar: "555566660000" }), "aadhaar"],                      // typed someone else's Aadhaar
    [claim({ dob: "15/03/1999" }), "dob"],
    [claim({ name: "Rahul Sharma" }), "name"],
    [claim({ aadhaar: "999988880000", name: "Rahul Sharma", dob: "01/01/1980" }), "aadhaar,dob,name"]
  ];
  for (const [body, reason] of cases) {
    await new ctx.models.Patient({ aadhaar_id: body.aadhaar, name: "x" }).save().catch(() => {});
    await initiate(body);
    const back = await comeBack(lastSession);
    assert.strictEqual(where(back), `/?digilocker=mismatch&reason=${reason}`, reason);
    assert.ok(!isVerified(body.aadhaar), `${reason}: must not be verified`);
    assert.ok(!(await ctx.models.Patient.findOne({ aadhaar_id: body.aadhaar })).digilockerVerified, `${reason}: account must not be flagged`);
  }
  assertNoPersonalDataLogged();
});

test("a document whose Aadhaar shows fewer than four digits can't confirm anything", async () => {
  document = { ...WHO, uid: "XXXXXXXXXX91" };
  await initiate(claim());
  assert.strictEqual(where(await comeBack(lastSession)), "/?digilocker=mismatch&reason=aadhaar");
});

test("consent not completed: nothing is downloaded and nothing is paid for", async () => {
  for (const status of ["created", "failed", "expired", undefined]) {
    calls.length = 0;
    _reset(); // four tries for one Aadhaar would otherwise hit the (deliberate) 3-per-hour limit
    await initiate(claim());
    statuses[lastSession] = status;
    assert.strictEqual(where(await comeBack(lastSession)), "/?digilocker=failed", String(status));
    assert.strictEqual(sandboxCalls("/documents/aadhaar"), 0, `${status}: no document fetch`);
    assert.ok(!isVerified("555566667391"));
  }
});

test("when Sandbox's wallet is out of credits the user is told it's unavailable, and nothing is verified", async () => {
  docMode = "credits";
  await initiate(claim());
  assert.strictEqual(where(await comeBack(lastSession)), "/?digilocker=unavailable");
  assert.ok(!isVerified("555566667391"));
  assert.ok(logged.some((l) => /unavailable \(credits\)/.test(l)));
});

test("technical failures end safely as 'error': nothing verified, nothing leaked", async () => {
  const scenarios = [
    ["server_error", "ok"], ["no_files", "ok"], ["ok", "not_found"], ["ok", "forbidden"], ["ok", "garbage"], ["ok", "doctype"]
  ];
  for (const [doc, file] of scenarios) {
    docMode = doc; fileMode = file;
    await initiate(claim());
    assert.strictEqual(where(await comeBack(lastSession)), "/?digilocker=error", `${doc}/${file}`);
    assert.ok(!isVerified("555566667391"), `${doc}/${file}`);
  }
  assertNoPersonalDataLogged();
});

test("the document is only ever fetched from an https address, whatever the reply says", async () => {
  for (const mode of ["insecure_url", "other_scheme", "not_a_url"]) {
    docMode = mode;
    calls.length = 0;
    _reset();
    await initiate(claim());
    assert.strictEqual(where(await comeBack(lastSession)), "/?digilocker=error", mode);
    assert.ok(!isVerified("555566667391"), mode);
    assert.strictEqual(calls.filter((c) => c.host.startsWith("files")).length, 0, `${mode}: nothing may be fetched`);
  }
});

test("a 403 from the file host is not retried with Sandbox's credentials", async () => {
  fileMode = "forbidden";
  await initiate(claim());
  await comeBack(lastSession);
  const fileCalls = calls.filter((c) => c.host === "files");
  assert.strictEqual(fileCalls.length, 1);
  assert.deepStrictEqual(Object.keys(fileCalls[0].headers), []);
});

test("a session can be used once: replaying or reloading the callback costs nothing and verifies nothing new", async () => {
  await initiate(claim());
  const session = lastSession;
  assert.strictEqual(where(await comeBack(session)), "/?digilocker=success");
  const before = calls.length;
  assert.strictEqual(where(await comeBack(session)), "/?digilocker=error");
  assert.strictEqual(calls.length, before, "no further calls to Sandbox or the file host");

  // and a made-up or missing state is rejected without touching Sandbox
  assert.strictEqual(where(await comeBack("never-issued")), "/?digilocker=error");
  const bare = await realFetch(`${ctx.base}/api/digilocker/callback`, { redirect: "manual" });
  assert.strictEqual(where(bare), "/?digilocker=error");
  assert.strictEqual(calls.length, before);
});

test("when Sandbox refuses to start a session the user gets a clear message, and nothing is stored", async () => {
  initMode = "refuse";
  const r = await initiate(claim());
  assert.strictEqual(r.status, 502);
  assert.match(r.body.message, /Couldn't start DigiLocker verification/);
  assert.strictEqual(where(await comeBack(lastSession || "none")), "/?digilocker=error");
});

test("a server with no Sandbox keys says so", async () => {
  const key = process.env.SANDBOX_API_KEY;
  delete process.env.SANDBOX_API_KEY;
  try {
    const r = await initiate(claim());
    assert.strictEqual(r.status, 500);
    assert.match(r.body.message, /SANDBOX_API_KEY/);
  } finally {
    process.env.SANDBOX_API_KEY = key;
  }
});

test("registration only counts the verification for the details that were verified, and only for 30 minutes", async () => {
  await initiate(claim());
  await comeBack(lastSession);
  const A = "555566667391";

  assert.ok(isVerifiedFor(A, { name: "Bhoomi Testperson", dob: "14/03/1999" }));
  assert.ok(!isVerifiedFor(A, { name: "Bhoomi Testperson", dob: "15/03/1999" }), "a different date of birth");
  assert.ok(!isVerifiedFor(A, { name: "Rahul Sharma", dob: "14/03/1999" }), "a different name");
  assert.ok(!isVerifiedFor("111111111111", { name: "Bhoomi Testperson", dob: "14/03/1999" }), "a different Aadhaar");

  const register = (extra = {}) => ctx.call("POST", "/api/auth/register", { body: { aadhaar: A, password: "pw12345", name: "Bhoomi Testperson", dob: "14/03/1999", mobile: "9000000001", ...extra } });

  // changing the date of birth after verifying means the account is created, but NOT marked verified
  assert.strictEqual((await register({ dob: "01/01/2000" })).status, 201);
  assert.strictEqual((await ctx.models.Patient.findOne({ aadhaar_id: A })).digilockerVerified, false);
  Object.values(ctx.models).forEach((M) => M._reset());

  assert.strictEqual((await register()).status, 201);
  assert.strictEqual((await ctx.models.Patient.findOne({ aadhaar_id: A })).digilockerVerified, true);

  const realNow = Date.now;
  Date.now = () => realNow() + TTL_MS + 1000;
  try {
    assert.ok(!isVerified(A), "expired");
  } finally {
    Date.now = realNow;
  }
});
