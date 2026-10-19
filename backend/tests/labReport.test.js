const test = require("node:test");
const assert = require("node:assert");
const path = require("path");

// The controllers log one line per request; keep that out of the test runner's output stream.
console.log = () => {};
console.error = () => {};

// Replace the file reader and the AI call BEFORE the routes load them.
const mock = (rel, exports) => {
  const file = require.resolve(path.join(__dirname, "..", rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports, children: [], paths: [] };
};
class ReportError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
let readImpl;
let aiImpl;
let aiPrompt;
mock("utils/reportText.js", { extractText: (...a) => readImpl(...a), ReportError });
mock("utils/groq.js", { chatCompletion: (args) => ((aiPrompt = args.user), aiImpl(args)) });

const { start, patientToken, doctorToken } = require("../test-support/harness");

const ALICE = "111111111111";
const BOB = "222222222222";
const DOC = "DOC-1";

const REPORT_TEXT = `Patient Name : Alice Verma
Mobile : 9000000001
Sample Collected On : 02/08/2026
Haemoglobin   9.0   g/dL   12.0 - 16.0
Total Cholesterol   225   mg/dL   < 200
HDL Cholesterol   45   mg/dL   > 40`;

const AI_OK = JSON.stringify({
  reportDate: "2026-08-02",
  results: [
    { testName: "Haemoglobin", resultValue: "9.0", unit: "g/dL", referenceRange: "12.0 - 16.0" },
    { testName: "Total Cholesterol", resultValue: "225", unit: "mg/dL", referenceRange: "< 200" },
    { testName: "HDL Cholesterol", resultValue: "45", unit: "mg/dL", referenceRange: "> 40" },
    { testName: "Ferritin", resultValue: "55", unit: "ng/mL", referenceRange: "" }
  ]
});

let ctx;
test.before(async () => { ctx = await start(); });
test.after(() => ctx.server.close());
test.beforeEach(async () => {
  Object.values(ctx.models).forEach((M) => M._reset());
  const m = ctx.models;
  await new m.Patient({ aadhaar_id: ALICE, name: "Alice" }).save();
  await new m.Patient({ aadhaar_id: BOB, name: "Bob" }).save();
  await new m.Doctor({ doctorRegId: DOC, name: "Asha Rao" }).save();
  readImpl = async () => ({ kind: "image", text: REPORT_TEXT });
  aiImpl = async () => AI_OK;
  aiPrompt = undefined;
});

// POST a file as multipart/form-data
async function upload(token, { bytes = Buffer.from("%PDF-1.4 fake"), type = "application/pdf", name = "report.pdf", field = "report" } = {}) {
  const form = new FormData();
  if (bytes) form.append(field, new Blob([bytes], { type }), name);
  const res = await fetch(`${ctx.base}/api/labresults/extract`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// each test uses its own patient token so the per-user rate limit doesn't leak between tests
let n = 0;
const freshPatient = () => patientToken(`9${String(++n).padStart(11, "0")}`);

test("extract needs a login, a file, and a supported type", async () => {
  assert.strictEqual((await upload(null)).status, 401);
  assert.strictEqual((await upload("garbage")).status, 401);
  const t = freshPatient();
  assert.strictEqual((await upload(t, { bytes: null })).status, 400);
  assert.strictEqual((await upload(t, { field: "wrongfield" })).status, 400);
  assert.strictEqual((await upload(t, { type: "text/plain", name: "x.txt" })).status, 415);
  assert.strictEqual((await upload(t, { type: "application/zip", name: "x.zip" })).status, 415);
  const tooBig = await upload(t, { bytes: Buffer.alloc(8 * 1024 * 1024 + 1) });
  assert.strictEqual(tooBig.status, 413);
  assert.match(tooBig.body.message, /8 MB/);
});

test("extract returns reviewable draft rows, flags what the report doesn't support, and saves nothing", async () => {
  const r = await upload(patientToken(ALICE));
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.method, "ai");
  assert.strictEqual(r.body.reportDate, "2026-08-02");
  assert.deepStrictEqual(
    r.body.rows.map((x) => [x.testName, x.resultValue, x.status, x.verified]),
    [["Haemoglobin", "9.0", "low", true], ["Total Cholesterol", "225", "high", true], ["HDL Cholesterol", "45", "normal", true], ["Ferritin", "55", null, false]]
  );
  // identity lines never reach the AI service
  assert.ok(!aiPrompt.includes("Alice Verma") && !aiPrompt.includes("9000000001"));
  assert.ok(aiPrompt.includes("Haemoglobin"));
  // extraction is read-only
  assert.strictEqual((await ctx.models.LabResult.find({})).length, 0);
});

test("extract falls back to pattern matching when the AI fails, and says so", async () => {
  aiImpl = async () => { throw Object.assign(new Error("down"), { code: "AI_HTTP", status: 503 }); };
  const r = await upload(freshPatient());
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.method, "pattern");
  assert.deepStrictEqual(r.body.rows.map((x) => x.testName), ["Haemoglobin", "Total Cholesterol", "HDL Cholesterol"]);
});

test("extract maps reader problems to clear statuses and messages", async () => {
  const cases = [
    ["SCANNED_PDF", 422, /scan/i],
    ["PASSWORD", 422, /password/i],
    ["UNREADABLE", 422, /open/i],
    ["BUSY", 429, /busy/i],
    ["TIMEOUT", 504, /too long/i],
    ["BAD_TYPE", 415, /JPG, PNG/]
  ];
  for (const [code, status, re] of cases) {
    const messages = { SCANNED_PDF: "This PDF is a scan ❌", PASSWORD: "This PDF is password-protected ❌", UNREADABLE: "Couldn't open that file ❌", BUSY: "The reader is busy ❌", TIMEOUT: "Reading took too long ❌", BAD_TYPE: "Not a JPG, PNG, WebP or PDF ❌" };
    readImpl = async () => { throw new ReportError(code, messages[code]); };
    const r = await upload(freshPatient());
    assert.strictEqual(r.status, status, code);
    assert.match(r.body.message, re, code);
  }
  readImpl = async () => { throw new Error("boom"); };
  assert.strictEqual((await upload(freshPatient())).status, 500);

  readImpl = async () => ({ kind: "image", text: "   \n  " });                       // nothing readable
  assert.strictEqual((await upload(freshPatient())).status, 422);
  readImpl = async () => ({ kind: "pdf", text: "Annual report. Nothing medical here at all, just words and more words." });
  aiImpl = async () => '{"reportDate": null, "results": []}';
  const none = await upload(freshPatient());                                          // text but no lab results
  assert.strictEqual(none.status, 422);
  assert.match(none.body.message, /by hand/);
});

test("a file with no lab results is refused with a clear message — whether the AI answered 'none' or was down", async () => {
  const dental = "DENTAL EXAMINATION REPORT\nTooth 14 - Filling intact\nFilling on tooth 14 intact\nCavity fillings for teeth 18 and 28\nGum condition : healthy";
  readImpl = async () => ({ kind: "image", text: dental });

  aiImpl = async () => '{"reportDate": null, "results": []}'; // the AI works and finds nothing
  let r = await upload(freshPatient());
  assert.strictEqual(r.status, 422);
  assert.match(r.body.message, /No lab results could be found/);

  aiImpl = async () => { throw Object.assign(new Error("down"), { code: "AI_HTTP", status: 503 }); }; // the AI is down
  r = await upload(freshPatient());
  assert.strictEqual(r.status, 422);
  assert.match(r.body.message, /No lab results could be found/);
});

test("extract is rate limited per login", async () => {
  const t = freshPatient();
  for (let i = 0; i < 8; i++) assert.strictEqual((await upload(t)).status, 200, `request ${i + 1}`);
  assert.strictEqual((await upload(t)).status, 429);
  assert.strictEqual((await upload(freshPatient())).status, 200); // another login is unaffected
});

test("a doctor can read a report too", async () => {
  assert.strictEqual((await upload(doctorToken(DOC))).status, 200);
});

// ------------------------------------------------------------------ saving confirmed rows
const ROWS = [
  { testName: "Haemoglobin", resultValue: "9.0", unit: "g/dL", referenceRange: "12.0 - 16.0" },
  { testName: "Total Cholesterol", resultValue: "225", unit: "mg/dL", referenceRange: "< 200" },
  { testName: "HDL Cholesterol", resultValue: "45", unit: "mg/dL", referenceRange: "> 40" }
];
const bulk = (token, body) => ctx.call("POST", "/api/labresults/bulk", { token, body });
const stored = () => ctx.models.LabResult.find({});

test("bulk: a patient saves confirmed rows; status is worked out server-side and can't be forced", async () => {
  const r = await bulk(patientToken(ALICE), {
    aadhaar: ALICE, hospital: "Sunrise Diagnostics", date: "2026-08-02",
    rows: ROWS.map((x) => ({ ...x, status: "normal", fromReport: false, source: "doctor", aadhaar: BOB }))  // client-supplied extras are ignored
  });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.saved, 3);

  const rows = await stored();
  assert.deepStrictEqual(rows.map((x) => [x.testName, x.status, x.refLow, x.refHigh]), [
    ["Haemoglobin", "low", 12, 16], ["Total Cholesterol", "high", null, 200], ["HDL Cholesterol", "normal", 40, null]
  ]);
  assert.ok(rows.every((x) => x.aadhaar === ALICE && x.fromReport === true && x.source === "patient" && x.hospital === "Sunrise Diagnostics"));
  assert.ok(rows.every((x) => new Date(x.date).toISOString().slice(0, 10) === "2026-08-02"));
  // a patient's free-text hospital stays on their record; it doesn't join the shared list
  assert.deepStrictEqual((await ctx.call("GET", "/api/hospitals", { token: patientToken(BOB) })).body, []);
});

test("bulk: access rules are the same as for any other record write", async () => {
  assert.strictEqual((await bulk(null, { aadhaar: ALICE, rows: ROWS })).status, 401);
  assert.strictEqual((await bulk(patientToken(BOB), { aadhaar: ALICE, rows: ROWS })).status, 403);

  const noConsent = await bulk(doctorToken(DOC), { aadhaar: ALICE, rows: ROWS });
  assert.strictEqual(noConsent.status, 403);
  assert.strictEqual(noConsent.body.code, "CONSENT_REQUIRED");
  assert.strictEqual((await stored()).length, 0);

  await ctx.call("POST", "/api/consent/request", { token: doctorToken(DOC), body: { patientAadhaar: ALICE } });
  await ctx.call("POST", "/api/consent/respond", { token: patientToken(ALICE), body: { doctorRegId: DOC, decision: "approve" } });

  const ok = await bulk(doctorToken(DOC), { aadhaar: ALICE, hospital: "Apollo Hospital", rows: ROWS });
  assert.strictEqual(ok.status, 201);
  const rows = await stored();
  assert.ok(rows.every((x) => x.source === "doctor" && x.doctorRegId === DOC && x.doctorName === "Asha Rao" && x.fromReport === true));
  assert.deepStrictEqual((await ctx.call("GET", "/api/hospitals", { token: patientToken(BOB) })).body, ["Apollo Hospital"]);

  // doctor-written, so the patient can't delete them; and it's one audit entry, not one per row
  assert.strictEqual((await ctx.call("DELETE", `/api/labresults/${rows[0]._id}`, { token: patientToken(ALICE) })).status, 403);
  const log = (await ctx.call("GET", "/api/consent/audit", { token: patientToken(ALICE) })).body;
  assert.deepStrictEqual(log.map((e) => e.action), ["add_lab"]);
});

test("bulk: bad input is refused as a whole — nothing is half-saved", async () => {
  const t = patientToken(ALICE);
  const cases = [
    [{ aadhaar: ALICE }, 400],
    [{ aadhaar: ALICE, rows: [] }, 400],
    [{ aadhaar: ALICE, rows: "nope" }, 400],
    [{ aadhaar: ALICE, rows: Array.from({ length: 61 }, (_, i) => ({ testName: `T${i}x`, resultValue: "1" })) }, 400],
    [{ aadhaar: ALICE, rows: [ROWS[0], { testName: "Ferritin", resultValue: "" }] }, 400],
    [{ aadhaar: ALICE, rows: [ROWS[0], null] }, 400],
    [{ aadhaar: ALICE, rows: ROWS, date: "2999-01-01" }, 400],
    [{ aadhaar: ALICE, rows: ROWS, date: "garbage" }, 400]
  ];
  for (const [body, status] of cases) assert.strictEqual((await bulk(t, body)).status, status, JSON.stringify(body).slice(0, 60));
  assert.strictEqual((await stored()).length, 0);

  const msg = (await bulk(t, { aadhaar: ALICE, rows: [ROWS[0], { testName: "Ferritin", resultValue: "" }] })).body.message;
  assert.match(msg, /Result 2/);
});

test("bulk: reviewed rows keep what the person typed; an unusable range leaves the result 'unrated', not 'normal'", async () => {
  const r = await bulk(patientToken(ALICE), { aadhaar: ALICE, rows: [{ testName: "Ferritin", resultValue: "55", unit: "ng/mL", referenceRange: "see note" }] });
  assert.strictEqual(r.status, 201);
  const [row] = await stored();
  assert.deepStrictEqual([row.status, row.refLow, row.refHigh, row.referenceRange], ["unrated", null, null, "see note"]);
});
