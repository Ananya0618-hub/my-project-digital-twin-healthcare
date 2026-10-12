const test = require("node:test");
const assert = require("node:assert");
const { start, patientToken, legacyPatientToken, doctorToken } = require("../test-support/harness");

const ALICE = "111111111111";
const BOB = "222222222222";
const DOC = "DOC-1";
const DOC2 = "DOC-2";

let ctx;
const seed = async () => {
  const m = ctx.models;
  Object.values(m).forEach((M) => M._reset());
  await new m.Patient({ aadhaar_id: ALICE, name: "Alice", mobile: "9000000001", dob: "01/02/1990" }).save();
  await new m.Patient({ aadhaar_id: BOB, name: "Bob", mobile: "9000000002" }).save();
  await new m.Doctor({ doctorRegId: DOC, name: "Asha Rao" }).save();
  await new m.Doctor({ doctorRegId: DOC2, name: "Vikram Shah" }).save();
};

test.before(async () => { ctx = await start(); });
test.after(() => ctx.server.close());
test.beforeEach(seed);

const A = () => patientToken(ALICE);
const B = () => patientToken(BOB);
const D = () => doctorToken(DOC);

// Doctor DOC asks Alice for access and Alice approves.
async function grant(aadhaar = ALICE, token = A()) {
  assert.strictEqual((await ctx.call("POST", "/api/consent/request", { token: D(), body: { patientAadhaar: aadhaar } })).status, 201);
  assert.strictEqual((await ctx.call("POST", "/api/consent/respond", { token, body: { doctorRegId: DOC, decision: "approve" } })).status, 200);
}

test("no token or a bad token is rejected on every data route", async () => {
  for (const [method, url, body] of [
    ["GET", `/api/patients/${ALICE}`],
    ["GET", `/api/treatments/${ALICE}`],
    ["GET", `/api/labresults/${ALICE}`],
    ["GET", `/api/fhir/export/${ALICE}`],
    ["POST", "/api/treatments", { aadhaar: ALICE, diagnosis: "x", medication: "y" }],
    ["POST", "/api/ai/summarize", { aadhaar: ALICE }],
    ["GET", "/api/hospitals"]
  ]) {
    assert.strictEqual((await ctx.call(method, url, { body })).status, 401, `${method} ${url} without token`);
    assert.strictEqual((await ctx.call(method, url, { body, token: "garbage" })).status, 401, `${method} ${url} bad token`);
  }
});

test("the old open 'list all patients' and 'create patient' endpoints are gone", async () => {
  assert.strictEqual((await ctx.call("GET", "/api/patients", { token: A() })).status, 404);
  assert.strictEqual((await ctx.call("POST", "/api/patients", { token: A(), body: { name: "x", aadhaar_id: "333333333333" } })).status, 404);
});

test("patients reach their own data (incl. pre-role legacy tokens) but not anyone else's", async () => {
  assert.strictEqual((await ctx.call("GET", `/api/patients/${ALICE}`, { token: A() })).status, 200);
  assert.strictEqual((await ctx.call("GET", `/api/treatments/${ALICE}`, { token: legacyPatientToken(ALICE) })).status, 200);

  for (const url of [`/api/patients/${BOB}`, `/api/treatments/${BOB}`, `/api/labresults/${BOB}`, `/api/fhir/export/${BOB}`]) {
    assert.strictEqual((await ctx.call("GET", url, { token: A() })).status, 403, url);
  }
  assert.strictEqual((await ctx.call("POST", "/api/treatments", { token: A(), body: { aadhaar: BOB, diagnosis: "x", medication: "y" } })).status, 403);
  assert.strictEqual((await ctx.call("PUT", `/api/patients/${BOB}`, { token: A(), body: { name: "Hacked" } })).status, 403);
  assert.strictEqual((await ctx.call("PUT", `/api/patients/${ALICE}`, { token: A(), body: { name: "Alice R" } })).status, 200);
});

test("a doctor is locked out until the patient approves, and again after revoking", async () => {
  let r = await ctx.call("GET", `/api/patients/${ALICE}`, { token: D() });
  assert.strictEqual(r.status, 403);
  assert.strictEqual(r.body.code, "CONSENT_REQUIRED");
  assert.strictEqual(r.body.consentStatus, "none");

  // request -> pending: still locked out, on every route
  assert.strictEqual((await ctx.call("POST", "/api/consent/request", { token: D(), body: { patientAadhaar: ALICE } })).body.status, "pending");
  r = await ctx.call("GET", `/api/treatments/${ALICE}`, { token: D() });
  assert.strictEqual(r.status, 403);
  assert.strictEqual(r.body.consentStatus, "pending");
  assert.strictEqual((await ctx.call("POST", "/api/treatments", { token: D(), body: { aadhaar: ALICE, diagnosis: "x", medication: "y" } })).status, 403);
  assert.strictEqual((await ctx.call("POST", "/api/ai/summarize", { token: D(), body: { aadhaar: ALICE } })).status, 403);
  assert.strictEqual((await ctx.call("GET", `/api/fhir/export/${ALICE}`, { token: D() })).status, 403);

  // the patient sees the request
  const mine = await ctx.call("GET", "/api/consent/mine", { token: A() });
  assert.deepStrictEqual(mine.body.map((c) => [c.doctorRegId, c.doctorName, c.status]), [[DOC, "Asha Rao", "pending"]]);

  // approve -> access
  assert.strictEqual((await ctx.call("POST", "/api/consent/respond", { token: A(), body: { doctorRegId: DOC, decision: "approve" } })).status, 200);
  assert.strictEqual((await ctx.call("GET", `/api/patients/${ALICE}`, { token: D() })).status, 200);
  assert.strictEqual((await ctx.call("GET", `/api/labresults/${ALICE}`, { token: D() })).status, 200);

  // consent is per patient: Bob is still off limits
  assert.strictEqual((await ctx.call("GET", `/api/patients/${BOB}`, { token: D() })).status, 403);
  // and per doctor: another doctor gets nothing from Alice's approval
  assert.strictEqual((await ctx.call("GET", `/api/patients/${ALICE}`, { token: doctorToken(DOC2) })).status, 403);

  // revoke -> locked out again
  assert.strictEqual((await ctx.call("POST", "/api/consent/respond", { token: A(), body: { doctorRegId: DOC, decision: "revoke" } })).status, 200);
  r = await ctx.call("GET", `/api/patients/${ALICE}`, { token: D() });
  assert.strictEqual(r.status, 403);
  assert.strictEqual(r.body.consentStatus, "revoked");
});

test("consent transitions: deny, re-request, invalid moves, requesting a missing patient", async () => {
  await ctx.call("POST", "/api/consent/request", { token: D(), body: { patientAadhaar: ALICE } });

  // a pending request can't be revoked; a nonexistent one can't be answered
  assert.strictEqual((await ctx.call("POST", "/api/consent/respond", { token: A(), body: { doctorRegId: DOC, decision: "revoke" } })).status, 400);
  assert.strictEqual((await ctx.call("POST", "/api/consent/respond", { token: A(), body: { doctorRegId: "NOPE", decision: "approve" } })).status, 404);
  assert.strictEqual((await ctx.call("POST", "/api/consent/respond", { token: A(), body: { doctorRegId: DOC, decision: "bogus" } })).status, 400);

  // deny, then the doctor may ask again, which reopens it as pending
  assert.strictEqual((await ctx.call("POST", "/api/consent/respond", { token: A(), body: { doctorRegId: DOC, decision: "deny" } })).status, 200);
  assert.strictEqual((await ctx.call("GET", `/api/patients/${ALICE}`, { token: D() })).body.consentStatus, "denied");
  assert.strictEqual((await ctx.call("POST", "/api/consent/request", { token: D(), body: { patientAadhaar: ALICE } })).body.status, "pending");
  // asking twice doesn't create a second request
  await ctx.call("POST", "/api/consent/request", { token: D(), body: { patientAadhaar: ALICE } });
  assert.strictEqual((await ctx.call("GET", "/api/consent/mine", { token: A() })).body.length, 1);

  assert.strictEqual((await ctx.call("POST", "/api/consent/request", { token: D(), body: { patientAadhaar: "999999999999" } })).status, 404);
  assert.strictEqual((await ctx.call("POST", "/api/consent/request", { token: D(), body: { patientAadhaar: "123" } })).status, 400);
});

test("another patient can't answer a request addressed to Alice", async () => {
  await ctx.call("POST", "/api/consent/request", { token: D(), body: { patientAadhaar: ALICE } });
  const r = await ctx.call("POST", "/api/consent/respond", { token: B(), body: { doctorRegId: DOC, decision: "approve" } });
  assert.strictEqual(r.status, 404); // Bob has no such request — his consent list is separate
  assert.strictEqual((await ctx.call("GET", `/api/patients/${ALICE}`, { token: D() })).status, 403);
});

test("role separation on consent endpoints", async () => {
  assert.strictEqual((await ctx.call("POST", "/api/consent/request", { token: A(), body: { patientAadhaar: BOB } })).status, 403);
  assert.strictEqual((await ctx.call("GET", "/api/consent/mine", { token: D() })).status, 403);
  assert.strictEqual((await ctx.call("POST", "/api/consent/respond", { token: D(), body: { doctorRegId: DOC, decision: "approve" } })).status, 403);
  assert.strictEqual((await ctx.call("GET", "/api/consent/audit", { token: D() })).status, 403);
  assert.strictEqual((await ctx.call("PUT", `/api/patients/${ALICE}`, { token: D(), body: { name: "x" } })).status, 403);
});

test("doctor-added records carry server-side attribution that the body can't spoof", async () => {
  await grant();
  const r = await ctx.call("POST", "/api/treatments", {
    token: D(),
    body: {
      aadhaar: ALICE, diagnosis: "Fever", medication: "Crocin", date: "2026-08-01", hospital: "  AIIMS   Delhi ",
      doctorRegId: "DOC-2", doctorName: "Someone Else", source: "patient"
    }
  });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.doctorRegId, DOC);
  assert.strictEqual(r.body.doctorName, "Asha Rao");
  assert.strictEqual(r.body.source, "doctor");
  assert.strictEqual(r.body.hospital, "AIIMS Delhi");
  assert.strictEqual(new Date(r.body.date).toISOString().slice(0, 10), "2026-08-01");

  // the aadhaar can't be redirected via a different route param either
  const own = await ctx.call("POST", "/api/treatments", { token: A(), body: { aadhaar: ALICE, diagnosis: "Cold", medication: "Rest", doctorName: "Fake MD", source: "doctor" } });
  assert.strictEqual(own.body.source, "patient");
  assert.strictEqual(own.body.doctorName, "");
});

test("input validation on dates and required fields", async () => {
  const post = (body) => ctx.call("POST", "/api/treatments", { token: A(), body: { aadhaar: ALICE, diagnosis: "x", medication: "y", ...body } });
  assert.strictEqual((await post({ date: "not a date" })).status, 400);
  assert.strictEqual((await post({ date: "2999-01-01" })).status, 400);
  assert.strictEqual((await post({ diagnosis: "  " })).status, 400);
  assert.strictEqual((await post({})).status, 201);
  assert.strictEqual((await ctx.call("POST", "/api/labresults", { token: A(), body: { aadhaar: ALICE, testName: "x", resultValue: "1", date: "garbage" } })).status, 400);
});

test("deleting: own self-reported records only; doctor-written ones are protected", async () => {
  await grant();
  const docRec = (await ctx.call("POST", "/api/treatments", { token: D(), body: { aadhaar: ALICE, diagnosis: "Fever", medication: "Crocin" } })).body;
  const ownRec = (await ctx.call("POST", "/api/treatments", { token: A(), body: { aadhaar: ALICE, diagnosis: "Cold", medication: "Rest" } })).body;
  const docLab = (await ctx.call("POST", "/api/labresults", { token: D(), body: { aadhaar: ALICE, testName: "Hb", resultValue: "13" } })).body;

  assert.strictEqual((await ctx.call("DELETE", `/api/treatments/${docRec._id}`, { token: A() })).status, 403);
  assert.strictEqual((await ctx.call("DELETE", `/api/labresults/${docLab._id}`, { token: A() })).status, 403);
  assert.strictEqual((await ctx.call("DELETE", `/api/treatments/${ownRec._id}`, { token: B() })).status, 404); // Bob can't touch Alice's
  assert.strictEqual((await ctx.call("DELETE", `/api/treatments/${ownRec._id}`, { token: D() })).status, 403); // doctors never delete
  assert.strictEqual((await ctx.call("DELETE", `/api/treatments/${ownRec._id}`, { token: A() })).status, 200);
  assert.strictEqual((await ctx.call("DELETE", "/api/treatments/does-not-exist", { token: A() })).status, 404);
  assert.strictEqual((await ctx.call("GET", `/api/treatments/${ALICE}`, { token: A() })).body.length, 1);
});

test("lab status: auto from the reference range, explicit override, and safe fallback", async () => {
  const post = async (body) => (await ctx.call("POST", "/api/labresults", { token: A(), body: { aadhaar: ALICE, testName: "T", ...body } })).body;

  let l = await post({ resultValue: "9", unit: "ng/mL", referenceRange: "30-100" });
  assert.deepStrictEqual([l.status, l.refLow, l.refHigh], ["low", 30, 100]);

  l = await post({ resultValue: "225", referenceRange: "< 200", status: "auto" });
  assert.deepStrictEqual([l.status, l.refLow, l.refHigh], ["high", null, 200]);

  l = await post({ resultValue: "45", referenceRange: "> 40" });
  assert.strictEqual(l.status, "normal");

  l = await post({ resultValue: "9", referenceRange: "30-100", status: "high" }); // manual override wins
  assert.strictEqual(l.status, "high");

  l = await post({ resultValue: "Positive", referenceRange: "see note" }); // unparseable -> normal, no crash
  assert.deepStrictEqual([l.status, l.refLow, l.refHigh], ["normal", null, null]);
});

test("hospitals: only doctors add to the shared list; names are de-duplicated", async () => {
  await grant();
  await ctx.call("POST", "/api/treatments", { token: A(), body: { aadhaar: ALICE, diagnosis: "a", medication: "b", hospital: "Patient Typed Clinic" } });
  await ctx.call("POST", "/api/treatments", { token: D(), body: { aadhaar: ALICE, diagnosis: "a", medication: "b", hospital: "Apollo Hospital" } });
  await ctx.call("POST", "/api/labresults", { token: D(), body: { aadhaar: ALICE, testName: "a", resultValue: "1", hospital: "apollo hospital" } });
  assert.deepStrictEqual((await ctx.call("GET", "/api/hospitals", { token: B() })).body, ["Apollo Hospital"]);
  // the patient's own record still keeps what they typed
  const recs = (await ctx.call("GET", `/api/treatments/${ALICE}`, { token: A() })).body;
  assert.ok(recs.some((t) => t.hospital === "Patient Typed Clinic"));
});

test("audit log: doctor actions are recorded, page-view reads are collapsed, patients see only their own", async () => {
  // A dedicated patient: repeated page views by the same doctor are collapsed
  // within a 5-minute window, and earlier tests already viewed Alice as DOC.
  const CARL = "333333333333";
  const carl = patientToken(CARL);
  await new ctx.models.Patient({ aadhaar_id: CARL, name: "Carl" }).save();
  await grant(CARL, carl);

  // one 'page view' = profile + treatments + labs -> a single log entry
  for (const u of [`/api/patients/${CARL}`, `/api/treatments/${CARL}`, `/api/labresults/${CARL}`]) {
    assert.strictEqual((await ctx.call("GET", u, { token: D() })).status, 200);
  }
  await ctx.call("POST", "/api/treatments", { token: D(), body: { aadhaar: CARL, diagnosis: "x", medication: "y" } });
  await ctx.call("POST", "/api/labresults", { token: D(), body: { aadhaar: CARL, testName: "a", resultValue: "1" } });
  await ctx.call("GET", `/api/fhir/export/${CARL}`, { token: D() });
  await ctx.call("POST", "/api/ai/summarize", { token: D(), body: { aadhaar: CARL } }); // AI call itself fails without a key; access is still logged
  // the patient reading their own data isn't logged
  await ctx.call("GET", `/api/treatments/${CARL}`, { token: carl });

  const log = (await ctx.call("GET", "/api/consent/audit", { token: carl })).body;
  assert.deepStrictEqual(log.map((e) => e.action).sort(), ["add_lab", "add_treatment", "ai_summary", "fhir_export", "view_record"]);
  assert.ok(log.every((e) => e.doctorRegId === DOC && e.doctorName === "Asha Rao" && e.at));

  // other patients see nothing of Carl's log
  assert.deepStrictEqual((await ctx.call("GET", "/api/consent/audit", { token: B() })).body, []);
});

test("refused requests leave no audit entry", async () => {
  await ctx.call("GET", `/api/patients/${BOB}`, { token: D() }); // no consent
  assert.strictEqual(ctx.models.AccessLog.find({}) && (await ctx.models.AccessLog.find({})).length, 0);
});

test("'my patients' lists only approved consents", async () => {
  await grant();
  await ctx.call("POST", "/api/consent/request", { token: D(), body: { patientAadhaar: BOB } }); // pending
  const mine = (await ctx.call("GET", "/api/consent/doctor/patients", { token: D() })).body;
  assert.deepStrictEqual(mine.map((p) => [p.patientAadhaar, p.patientName]), [[ALICE, "Alice"]]);
});

test("FHIR export: gated like the rest, valid bundle, and no Aadhaar in the file", async () => {
  assert.strictEqual((await ctx.call("GET", `/api/fhir/export/${ALICE}`, { token: D() })).status, 403);
  await grant();
  await ctx.call("POST", "/api/treatments", { token: D(), body: { aadhaar: ALICE, diagnosis: "Fever", medication: "Crocin", hospital: "Apollo" } });
  await ctx.call("POST", "/api/labresults", { token: D(), body: { aadhaar: ALICE, testName: "Vit D", resultValue: "9", unit: "ng/mL", referenceRange: "30-100" } });

  for (const token of [A(), D()]) {
    const r = await ctx.call("GET", `/api/fhir/export/${ALICE}`, { token });
    assert.strictEqual(r.status, 200);
    assert.ok(r.text.length > 0);
    assert.strictEqual(r.body.resourceType, "Bundle");
    assert.deepStrictEqual(r.body.entry.map((e) => e.resource.resourceType).sort(), ["Condition", "MedicationStatement", "Observation", "Patient"]);
    assert.ok(!r.text.includes(ALICE), "Aadhaar number must not appear in the export");
    const obs = r.body.entry.find((e) => e.resource.resourceType === "Observation").resource;
    assert.strictEqual(obs.interpretation[0].coding[0].code, "L");
  }
});

test("doctor-written records show up in the patient's own timeline data", async () => {
  await grant();
  await ctx.call("POST", "/api/treatments", { token: D(), body: { aadhaar: ALICE, diagnosis: "Fever", medication: "Crocin", hospital: "Apollo", date: "2026-08-01" } });
  const t = (await ctx.call("GET", `/api/treatments/${ALICE}`, { token: A() })).body;
  assert.deepStrictEqual([t[0].doctorName, t[0].hospital, t[0].source], ["Asha Rao", "Apollo", "doctor"]);
});

test("records saved before `date` existed (old labs) fall back to createdAt and sort correctly", async () => {
  const { LabResult } = ctx.models;
  // as stored by the previous version: no `date` field, only createdAt
  await new LabResult({ aadhaar: ALICE, testName: "Old", resultValue: "1", createdAt: new Date("2026-03-01") }).save();
  await ctx.call("POST", "/api/labresults", { token: A(), body: { aadhaar: ALICE, testName: "Backdated", resultValue: "2", date: "2026-05-01" } });
  await ctx.call("POST", "/api/labresults", { token: A(), body: { aadhaar: ALICE, testName: "Today", resultValue: "3" } });

  const names = (await ctx.call("GET", `/api/labresults/${ALICE}`, { token: A() })).body.map((l) => l.testName);
  assert.deepStrictEqual(names, ["Today", "Backdated", "Old"]);
});
