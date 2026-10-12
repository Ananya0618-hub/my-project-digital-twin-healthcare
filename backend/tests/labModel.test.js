const test = require("node:test");
const assert = require("node:assert");

// The REAL Mongoose schema (no database needed for validation) — the other tests use in-memory fakes.
const LabResult = require("../models/LabResult");

const base = { aadhaar: "111111111111", testName: "RBC Count", resultValue: "4.85" };

test("LabResult accepts low, normal, high and unrated, and rejects anything else", () => {
  for (const status of ["low", "normal", "high", "unrated"]) {
    assert.strictEqual(new LabResult({ ...base, status }).validateSync(), undefined, status);
  }
  const err = new LabResult({ ...base, status: "weird" }).validateSync();
  assert.ok(err && err.errors.status, "an unknown status must fail validation");
});

test("a result saved without a status defaults to unrated, never normal", () => {
  assert.strictEqual(new LabResult(base).status, "unrated");
});
