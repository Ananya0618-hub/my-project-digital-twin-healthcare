const test = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
console.log = () => {};
console.error = () => {};

const { start } = require("../test-support/harness");
const { isValid, generate } = require("../utils/registrationNumber");

let ctx;
test.before(async () => { ctx = await start(); });
test.after(() => ctx.server.close());
test.beforeEach(() => Object.values(ctx.models).forEach((M) => M._reset()));

const register = (aadhaar, extra = {}) =>
  ctx.call("POST", "/api/auth/register", { body: { aadhaar, password: "pw12345", name: "Alice", mobile: "9000000001", ...extra } });
const patientOf = (aadhaar) => ctx.models.Patient.findOne({ aadhaar_id: aadhaar });

test("registering issues a valid registration number, and every patient gets a different one", async () => {
  const numbers = [];
  for (const aadhaar of ["111111111111", "222222222222", "333333333333", "444444444444"]) {
    assert.strictEqual((await register(aadhaar)).status, 201);
    const p = await patientOf(aadhaar);
    assert.ok(isValid(p.registrationNumber), p.registrationNumber);
    numbers.push(p.registrationNumber);
  }
  assert.strictEqual(new Set(numbers).size, 4);
});

test("the new patient can log in and sees their number in their own profile", async () => {
  await register("111111111111");
  const login = await ctx.call("POST", "/api/auth/login", { body: { aadhaar: "111111111111", password: "pw12345" } });
  assert.strictEqual(login.status, 200);
  const profile = await ctx.call("GET", "/api/patients/111111111111", { token: login.body.token });
  assert.strictEqual(profile.status, 200);
  assert.ok(isValid(profile.body.registrationNumber));
});

test("if the first number it picks is already taken, it picks another", async () => {
  const taken = generate();
  await new ctx.models.Patient({ name: "Existing", aadhaar_id: "999999999999", registrationNumber: taken }).save();

  // make the generator produce the taken number's 11 digits first, then behave normally
  const queue = taken.replace(/\D/g, "").slice(0, 11).split("").map(Number);
  const realRandomInt = crypto.randomInt;
  crypto.randomInt = (...args) => (queue.length ? queue.shift() : realRandomInt(...args));
  try {
    assert.strictEqual((await register("111111111111")).status, 201);
  } finally {
    crypto.randomInt = realRandomInt;
  }
  const p = await patientOf("111111111111");
  assert.ok(isValid(p.registrationNumber));
  assert.notStrictEqual(p.registrationNumber, taken);
  assert.strictEqual((await patientOf("999999999999")).registrationNumber, taken); // the other patient is untouched
});

test("if two sign-ups race for the same number, the one that loses retries", async () => {
  const Patient = ctx.models.Patient;
  const realSave = Patient.prototype.save;
  let failedOnce = false;
  Patient.prototype.save = async function () {
    if (!failedOnce) {
      failedOnce = true;
      throw Object.assign(new Error("E11000 duplicate key"), { code: 11000, keyPattern: { registrationNumber: 1 } });
    }
    return realSave.call(this);
  };
  try {
    assert.strictEqual((await register("111111111111")).status, 201);
  } finally {
    Patient.prototype.save = realSave;
  }
  assert.ok(isValid((await patientOf("111111111111")).registrationNumber));
});

test("if the patient record can't be created, no orphan login is left behind", async () => {
  const Patient = ctx.models.Patient;
  const realSave = Patient.prototype.save;
  Patient.prototype.save = async () => { throw new Error("database hiccup"); };
  try {
    assert.strictEqual((await register("111111111111")).status, 500);
  } finally {
    Patient.prototype.save = realSave;
  }
  assert.strictEqual((await ctx.models.User.find({})).length, 0, "the half-created login must be removed");
  assert.strictEqual((await register("111111111111")).status, 201, "and signing up again must work (not 'User already exists')");
});

test("a duplicate Aadhaar is still refused, and refusing it doesn't use up a registration number", async () => {
  assert.strictEqual((await register("111111111111")).status, 201);
  const before = (await ctx.models.Patient.find({})).length;
  assert.strictEqual((await register("111111111111")).status, 400);
  assert.strictEqual((await ctx.models.Patient.find({})).length, before);
});
