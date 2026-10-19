const test = require("node:test");
const assert = require("node:assert");
console.log = () => {};
console.error = () => {};

const { start, patientToken, doctorToken } = require("../test-support/harness");
const limits = require("../config/limits");
const { generate, isValid } = require("../utils/registrationNumber");

const ALICE = "111111111111";
const BOB = "222222222222";
const CAROL = "333333333333";
const NUM = { [ALICE]: generate(), [BOB]: generate(), [CAROL]: generate() };

let ctx;
test.before(async () => { ctx = await start(); });
test.after(() => ctx.server.close());
test.beforeEach(async () => {
  Object.values(ctx.models).forEach((M) => M._reset());
  const m = ctx.models;
  await new m.Patient({ aadhaar_id: ALICE, name: "Alice", registrationNumber: NUM[ALICE] }).save();
  await new m.Patient({ aadhaar_id: BOB, name: "Bob", registrationNumber: NUM[BOB] }).save();
  await new m.Patient({ aadhaar_id: CAROL, name: "Carol", registrationNumber: NUM[CAROL] }).save();
  for (const [id, name] of [["DOC-1", "Asha Rao"], ["DOC-2", "Vikram Shah"], ["DOC-3", "Meera Iyer"], ["DOC-4", "Ravi Nair"], ["DOC-5", "Sana Khan"], ["DOC-6", "Tara Sen"]]) {
    await new m.Doctor({ doctorRegId: id, name }).save();
  }
});

const D = (id = "DOC-1") => doctorToken(id);
const lookup = (token, registrationNumber) => ctx.call("POST", "/api/patients/lookup", { token, body: { registrationNumber } });
const requestByNumber = (token, registrationNumber) => ctx.call("POST", "/api/consent/request", { token, body: { registrationNumber } });
const approve = (aadhaar, doctorRegId) => ctx.call("POST", "/api/consent/respond", { token: patientToken(aadhaar), body: { doctorRegId, decision: "approve" } });

test("lookup is for logged-in doctors only", async () => {
  assert.strictEqual((await lookup(null, NUM[ALICE])).status, 401);
  assert.strictEqual((await lookup("garbage", NUM[ALICE])).status, 401);
  assert.strictEqual((await lookup(patientToken(ALICE), NUM[ALICE])).status, 403);
});

test("malformed numbers, typos and Aadhaar-shaped input are rejected up front with a helpful message", async () => {
  const good = NUM[ALICE];
  const wrongCheck = good.slice(0, -1) + ((Number(good.slice(-1)) + 1) % 10);
  for (const bad of [undefined, "", "hello", ALICE, wrongCheck, "HM-1234-5678", 42]) {
    const r = await lookup(D(), bad);
    assert.strictEqual(r.status, 400, JSON.stringify(bad));
    assert.match(r.body.message, /valid registration number/);
  }
});

test("an unknown number looks exactly like a patient who hasn't approved you: nothing is revealed", async () => {
  const unknown = generate();
  const real = await lookup(D(), NUM[ALICE]);        // exists, no consent
  const ghost = await lookup(D(), unknown);          // doesn't exist
  assert.strictEqual(real.status, 403);
  assert.deepStrictEqual(ghost.body, real.body);
  assert.deepStrictEqual([real.body.code, real.body.consentStatus], ["CONSENT_REQUIRED", "none"]);
});

test("the full flow: request by number, patient approves, doctor opens the record — and it is audited", async () => {
  const req = await requestByNumber(D(), NUM[ALICE]);
  assert.strictEqual(req.status, 201);
  assert.deepStrictEqual(Object.keys(req.body), ["status"]);     // the reply is only the status…
  assert.ok(!JSON.stringify(req.body).includes(ALICE));          // …never the patient's Aadhaar

  const pending = await lookup(D(), NUM[ALICE]);
  assert.deepStrictEqual([pending.status, pending.body.consentStatus], [403, "pending"]);

  assert.strictEqual((await approve(ALICE, "DOC-1")).status, 200);

  const sloppy = NUM[ALICE].toLowerCase().replace(/-/g, " "); // however the doctor types it
  const open = await lookup(D(), sloppy);
  assert.strictEqual(open.status, 200);
  assert.deepStrictEqual([open.body.name, open.body.registrationNumber], ["Alice", NUM[ALICE]]);

  await lookup(D(), NUM[ALICE]); // a second look within the window doesn't add a second log entry
  const log = (await ctx.call("GET", "/api/consent/audit", { token: patientToken(ALICE) })).body;
  assert.deepStrictEqual(log.map((e) => [e.action, e.doctorRegId]), [["view_record", "DOC-1"]]);

  // approval is per patient and per doctor
  assert.strictEqual((await lookup(D(), NUM[BOB])).status, 403);
  assert.strictEqual((await lookup(D("DOC-2"), NUM[ALICE])).status, 403);
});

test("requesting access: unknown or malformed numbers fail clearly, and the Aadhaar route still works", async () => {
  assert.strictEqual((await requestByNumber(D(), generate())).status, 404);
  assert.strictEqual((await requestByNumber(D(), "nonsense")).status, 400);
  assert.strictEqual((await requestByNumber(D(), ALICE)).status, 400);

  const viaAadhaar = await ctx.call("POST", "/api/consent/request", { token: D(), body: { patientAadhaar: ALICE } });
  assert.strictEqual(viaAadhaar.status, 201);
  // the same patient asked for by number is the same request, not a second one
  const again = await requestByNumber(D(), NUM[ALICE]);
  assert.deepStrictEqual([again.status, again.body.status], [200, "pending"]);
  assert.strictEqual((await ctx.call("GET", "/api/consent/mine", { token: patientToken(ALICE) })).body.length, 1);
});

test("'my patients' shows each approved patient's registration number", async () => {
  await ctx.call("POST", "/api/consent/request", { token: D(), body: { patientAadhaar: ALICE } }); // asked by Aadhaar
  await requestByNumber(D(), NUM[BOB]);                                                            // asked by number
  await approve(ALICE, "DOC-1");                                                                   // Bob stays pending
  const mine = (await ctx.call("GET", "/api/consent/doctor/patients", { token: D() })).body;
  assert.deepStrictEqual(mine.map((p) => [p.patientName, p.registrationNumber]), [["Alice", NUM[ALICE]]]);
});

test("rate limit: a doctor probing for patients is cut off, but patients who approved them stay reachable", async () => {
  const saved = { ...limits.deniedAccess };
  limits.deniedAccess.max = 3;
  try {
    await requestByNumber(D("DOC-6"), NUM[ALICE]);
    await approve(ALICE, "DOC-6");

    assert.strictEqual((await lookup(D("DOC-6"), generate())).status, 403);                                   // guessed number
    assert.strictEqual((await ctx.call("GET", `/api/patients/${BOB}`, { token: D("DOC-6") })).status, 403);   // guessed Aadhaar
    assert.strictEqual((await lookup(D("DOC-6"), NUM[CAROL])).status, 403);                                   // real, but not theirs
    const blocked = await lookup(D("DOC-6"), generate());
    assert.strictEqual(blocked.status, 429);
    assert.match(blocked.body.message, /Too many attempts/);
    assert.strictEqual((await ctx.call("GET", `/api/treatments/${BOB}`, { token: D("DOC-6") })).status, 429);

    // none of that touches the records they ARE allowed to see…
    assert.strictEqual((await lookup(D("DOC-6"), NUM[ALICE])).status, 200);
    assert.strictEqual((await ctx.call("GET", `/api/treatments/${ALICE}`, { token: D("DOC-6") })).status, 200);
    // …or any other doctor. (The limiter's memory is per doctor and lives for the whole test run, so the doctors in
    // the two rate-limit tests are ones no other test uses.)
    assert.strictEqual((await lookup(D("DOC-5"), generate())).status, 403);
  } finally {
    Object.assign(limits.deniedAccess, saved);
  }
});

test("rate limit: only a limited number of new access requests per hour; repeating a pending one is free", async () => {
  const saved = { ...limits.consentRequests };
  limits.consentRequests.max = 2;
  try {
    assert.strictEqual((await requestByNumber(D("DOC-3"), NUM[ALICE])).status, 201);
    assert.strictEqual((await requestByNumber(D("DOC-3"), NUM[BOB])).status, 201);
    const over = await requestByNumber(D("DOC-3"), NUM[CAROL]);
    assert.strictEqual(over.status, 429);
    assert.match(over.body.message, /lot of access requests/);
    assert.strictEqual((await ctx.call("GET", "/api/consent/mine", { token: patientToken(CAROL) })).body.length, 0); // nothing was created

    assert.strictEqual((await requestByNumber(D("DOC-3"), NUM[ALICE])).status, 200); // already pending: no new request, no cost
    assert.strictEqual((await requestByNumber(D("DOC-4"), NUM[CAROL])).status, 201);  // other doctors have their own allowance
  } finally {
    Object.assign(limits.consentRequests, saved);
  }
});

test("a patient can see their number, but can't change it (or their Aadhaar or verified flag) through a profile update", async () => {
  const token = patientToken(ALICE);
  assert.strictEqual((await ctx.call("GET", `/api/patients/${ALICE}`, { token })).body.registrationNumber, NUM[ALICE]);

  const hijack = generate();
  const r = await ctx.call("PUT", `/api/patients/${ALICE}`, {
    token,
    body: { name: "Alice R", registrationNumber: hijack, aadhaar_id: BOB, digilockerVerified: true }
  });
  assert.strictEqual(r.status, 200);
  const after = await ctx.models.Patient.findOne({ aadhaar_id: ALICE });
  assert.deepStrictEqual([after.name, after.registrationNumber, after.digilockerVerified], ["Alice R", NUM[ALICE], undefined]);
  assert.strictEqual(await ctx.models.Patient.findOne({ aadhaar_id: BOB }).then((p) => p.name), "Bob");
});

test("the FHIR export carries the registration number and still never contains the Aadhaar number", async () => {
  const r = await ctx.call("GET", `/api/fhir/export/${ALICE}`, { token: patientToken(ALICE) });
  assert.strictEqual(r.status, 200);
  const patient = r.body.entry.find((e) => e.resource.resourceType === "Patient").resource;
  assert.ok(patient.identifier.some((i) => i.system === "urn:healthmirror:registration-number" && i.value === NUM[ALICE]));
  assert.ok(!r.text.includes(ALICE));
  assert.ok(isValid(NUM[ALICE]));
});
