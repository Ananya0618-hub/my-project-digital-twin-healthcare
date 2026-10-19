const test = require("node:test");
const assert = require("node:assert");

// The REAL Mongoose schema (validation needs no database).
const Patient = require("../models/Patient");
const { generate } = require("../utils/registrationNumber");

const base = { name: "Alice", aadhaar_id: "111111111111" };

test("registrationNumber: valid ones pass, malformed or mistyped ones fail, and it may be absent (older patients)", () => {
  assert.strictEqual(new Patient({ ...base, registrationNumber: generate() }).validateSync(), undefined);
  assert.strictEqual(new Patient(base).validateSync(), undefined);

  const good = generate();
  const wrongCheck = good.slice(0, -1) + ((Number(good.slice(-1)) + 1) % 10);
  for (const bad of [wrongCheck, "abc", "HM-1234", "111122223333", ""]) {
    const err = new Patient({ ...base, registrationNumber: bad }).validateSync();
    assert.ok(err && err.errors.registrationNumber, `should reject ${JSON.stringify(bad)}`);
  }
});

test("registrationNumber can't be changed once it exists", () => {
  const original = generate();
  const doc = Patient.hydrate({ ...base, registrationNumber: original }); // a document loaded from the database
  try { doc.registrationNumber = generate(); } catch { /* strict mode may throw instead of ignoring */ }
  assert.strictEqual(doc.registrationNumber, original);
});

test("registrationNumber is backed by a unique, sparse index", () => {
  const entry = Patient.schema.indexes().find(([fields]) => fields.registrationNumber === 1);
  assert.ok(entry, "an index on registrationNumber must be declared");
  assert.strictEqual(entry[1].unique, true);
  assert.strictEqual(entry[1].sparse, true);
});

test("a patient loaded without a number stays without one (no default invented on load)", () => {
  assert.strictEqual(Patient.hydrate(base).registrationNumber, undefined);
});
