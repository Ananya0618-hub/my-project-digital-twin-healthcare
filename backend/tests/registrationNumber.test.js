const test = require("node:test");
const assert = require("node:assert");
const { generate, normalize, isValid, generateUnique } = require("../utils/registrationNumber");
const { isValidVerhoeff, verhoeffCheckDigit } = require("../utils/verhoeff");
const { backfillRegistrationNumbers } = require("../utils/backfillRegistration");

const digitsOf = (n) => n.replace(/\D/g, "");
const withDigits = (d) => `HM-${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8, 12)}`;

test("Verhoeff check digit: matches the published example and always produces a valid number", () => {
  assert.strictEqual(verhoeffCheckDigit("236"), 3); // the standard textbook vector: 236 -> 2363
  assert.ok(isValidVerhoeff("2363"));
  for (let i = 0; i < 500; i++) {
    const body = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join("");
    assert.ok(isValidVerhoeff(body + verhoeffCheckDigit(body)), body);
  }
  assert.throws(() => verhoeffCheckDigit("12a4"));
});

test("generated numbers are well-formed, valid and unique", () => {
  const seen = new Set();
  let leadingZero = 0;
  for (let i = 0; i < 3000; i++) {
    const n = generate();
    assert.match(n, /^HM-\d{4}-\d{4}-\d{4}$/);
    assert.ok(isValid(n), n);
    seen.add(n);
    if (n.startsWith("HM-0")) leadingZero++;
  }
  assert.strictEqual(seen.size, 3000);
  assert.ok(leadingZero > 0, "numbers may start with 0 and must keep it");
});

test("the check digit catches every single-digit typo and every swap of neighbouring digits", () => {
  for (let k = 0; k < 150; k++) {
    const good = digitsOf(generate());
    for (let pos = 0; pos < 12; pos++) {
      for (let digit = 0; digit < 10; digit++) {
        if (String(digit) === good[pos]) continue;
        const typo = good.slice(0, pos) + digit + good.slice(pos + 1);
        assert.strictEqual(isValid(withDigits(typo)), false, `typo at ${pos}: ${typo}`);
      }
    }
    for (let pos = 0; pos < 11; pos++) {
      if (good[pos] === good[pos + 1]) continue;
      const swapped = good.slice(0, pos) + good[pos + 1] + good[pos] + good.slice(pos + 2);
      assert.strictEqual(isValid(withDigits(swapped)), false, `swap at ${pos}: ${swapped}`);
    }
  }
});

test("normalize accepts the ways people type a number, and rejects anything that isn't one", () => {
  const n = generate();
  const d = digitsOf(n);
  for (const typed of [n, n.toLowerCase(), `  ${n}  `, `hm ${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8)}`, `HM${d}`, `Hm-${d.slice(0, 4)}${d.slice(4)}`]) {
    assert.strictEqual(normalize(typed), n, typed);
  }
  const bad = [
    d,                       // bare 12 digits is the shape of an Aadhaar number — never a registration number
    `XX-${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`, `HM-${d.slice(0, 11)}`, `HM-${d}0`, "HM-ABCD-EFGH-IJKL",
    "", "HM", "  ", null, undefined, 123456789012, {}, []
  ];
  for (const b of bad) assert.strictEqual(normalize(b), null, String(b));
  assert.strictEqual(isValid(d), false);
});

test("a well-formed number with a wrong check digit is invalid", () => {
  const d = digitsOf(generate());
  const wrongCheck = (Number(d[11]) + 1) % 10;
  assert.strictEqual(isValid(withDigits(d.slice(0, 11) + wrongCheck)), false);
});

test("generateUnique retries when a number is taken, and gives up rather than loop forever", async () => {
  let calls = 0;
  const n = await generateUnique(async () => ++calls <= 3); // taken, taken, taken, free
  assert.strictEqual(calls, 4);
  assert.ok(isValid(n));

  let tries = 0;
  await assert.rejects(generateUnique(async () => (tries++, true), 5), /allocate/);
  assert.strictEqual(tries, 5);
});

test("backfill: dry run writes nothing; apply numbers everyone once; re-running changes nothing", async () => {
  const patients = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
  const assigned = {};
  const taken = new Set();
  const deps = (dryRun) => ({
    dryRun,
    findMissing: async () => patients.filter((p) => !assigned[p.id]),
    isTaken: async (n) => taken.has(n),
    assign: async (p, n) => { if (assigned[p.id]) return false; assigned[p.id] = n; taken.add(n); return true; }
  });

  assert.deepStrictEqual(await backfillRegistrationNumbers({ ...deps(true) }), { missing: 4, assigned: 0, skipped: 0 });
  assert.deepStrictEqual(assigned, {});
  assert.deepStrictEqual(await backfillRegistrationNumbers({ ...deps(undefined) , dryRun: undefined }), { missing: 4, assigned: 0, skipped: 0 }); // dry run is the default

  assert.deepStrictEqual(await backfillRegistrationNumbers(deps(false)), { missing: 4, assigned: 4, skipped: 0 });
  const numbers = Object.values(assigned);
  assert.strictEqual(new Set(numbers).size, 4);
  assert.ok(numbers.every(isValid));

  assert.deepStrictEqual(await backfillRegistrationNumbers(deps(false)), { missing: 0, assigned: 0, skipped: 0 });
  assert.deepStrictEqual(Object.values(assigned), numbers); // nobody's number changed
});

test("backfill: a patient who got a number in the meantime is skipped, not overwritten", async () => {
  const result = await backfillRegistrationNumbers({
    dryRun: false,
    findMissing: async () => [{ id: 1 }, { id: 2 }],
    isTaken: async () => false,
    assign: async (p) => p.id === 2 // patient 1 was numbered by someone else a moment ago
  });
  assert.deepStrictEqual(result, { missing: 2, assigned: 1, skipped: 1 });
});
