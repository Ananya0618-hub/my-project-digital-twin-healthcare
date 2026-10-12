const test = require("node:test");
const assert = require("node:assert");
process.env.GROQ_API_KEY = "test-key";
console.log = () => {};
console.error = () => {};

const { start, patientToken } = require("../test-support/harness");

const ALICE = "111111111111";

test("AI summary: an unrated lab is sent without a status, so it can't be described as normal", async () => {
  const realFetch = global.fetch;
  let sent = null;
  global.fetch = async (url, opts) => {
    if (!String(url).includes("api.groq.com")) return realFetch(url, opts);
    sent = JSON.parse(opts.body).messages[1].content;
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "ok" } }] }) };
  };

  const ctx = await start();
  try {
    const m = ctx.models;
    await new m.Patient({ aadhaar_id: ALICE, name: "Alice" }).save();
    await new m.LabResult({ aadhaar: ALICE, testName: "RBC Count", resultValue: "4.85", unit: "million/cumm", referenceRange: "", status: "unrated" }).save();
    await new m.LabResult({ aadhaar: ALICE, testName: "Vitamin D", resultValue: "9", unit: "ng/mL", referenceRange: "30-100", status: "low" }).save();

    const r = await ctx.call("POST", "/api/ai/summarize", { token: patientToken(ALICE), body: { aadhaar: ALICE } });
    assert.strictEqual(r.status, 200);

    const labs = JSON.parse(sent.slice(sent.indexOf("{"), sent.lastIndexOf("}") + 1)).labResults;
    const rbc = labs.find((l) => l.testName === "RBC Count");
    const vitD = labs.find((l) => l.testName === "Vitamin D");
    assert.ok(!("status" in rbc), "no status for an unrated result");
    assert.strictEqual(vitD.status, "low");
  } finally {
    global.fetch = realFetch;
    ctx.server.close();
  }
});
