const test = require("node:test");
const assert = require("node:assert");
const { parseDob, dobMatches, uidTailMatches, namesMatch, compareIdentity } = require("../utils/identityMatch");

const NOW = new Date("2026-11-11T12:00:00Z");

test("parseDob reads the ways dates are typed, day first, and rejects impossible dates", () => {
  assert.deepStrictEqual(parseDob("14/03/1999", NOW), { y: 1999, m: 3, d: 14 });
  assert.deepStrictEqual(parseDob("14-3-1999", NOW), { y: 1999, m: 3, d: 14 });
  assert.deepStrictEqual(parseDob("4.12.2000", NOW), { y: 2000, m: 12, d: 4 });
  assert.deepStrictEqual(parseDob("1999-03-14", NOW), { y: 1999, m: 3, d: 14 });
  assert.deepStrictEqual(parseDob("1999", NOW), { y: 1999 });
  assert.deepStrictEqual(parseDob("29/02/2000", NOW), { y: 2000, m: 2, d: 29 }); // leap year
  for (const bad of ["31/02/2000", "29/02/1999", "00/01/2000", "13/13/2000", "12/2/99", "2099-01-01", "01/01/2099", "1850", "abc", "", null, undefined, "14/03", "1999/13/01"]) {
    assert.strictEqual(parseDob(bad, NOW), null, String(bad));
  }
});

test("dobMatches: same date in different notations matches, anything else doesn't; year-only records compare the year", () => {
  assert.ok(dobMatches("14/03/1999", "14-03-1999"));
  assert.ok(dobMatches("14-3-1999", "14-03-1999"));
  assert.ok(dobMatches("1999-03-14", "14-03-1999"));
  assert.ok(!dobMatches("15/03/1999", "14-03-1999"));
  assert.ok(!dobMatches("14/04/1999", "14-03-1999"));
  assert.ok(!dobMatches("14/03/2000", "14-03-1999"));
  assert.ok(!dobMatches("03/14/1999", "14-03-1999"));   // month-first is not a date
  assert.ok(dobMatches("14/03/1999", "1999"));           // Aadhaar holds only the year of birth
  assert.ok(!dobMatches("14/03/2000", "1999"));
  assert.ok(!dobMatches("1999", "14-03-1999"));          // the form must be a full date
  assert.ok(!dobMatches("", "14-03-1999") && !dobMatches("14/03/1999", "") && !dobMatches("14/03/1999", "unknown"));
});

test("uidTailMatches compares the visible digits and refuses to guess from fewer than four", () => {
  assert.ok(uidTailMatches("123456781234", "XXXXXXXX1234"));
  assert.ok(uidTailMatches("123456781234", "xxxxxxxx1234"));
  assert.ok(uidTailMatches("123456781234", "********1234"));
  assert.ok(uidTailMatches("123456781234", "XXXX56781234"));   // more digits showing is fine
  assert.ok(!uidTailMatches("123456781234", "XXXXXXXX1235"));
  assert.ok(!uidTailMatches("123456781234", "XXXXXXXX4321"));
  assert.ok(!uidTailMatches("123456781234", "XXXXXXXXXX34"));  // two digits prove too little
  assert.ok(!uidTailMatches("123456781234", "XXXXXXXXXXXX"));  // no digits at all
  assert.ok(!uidTailMatches("12345678123", "XXXXXXXX1234"));   // the form's Aadhaar isn't 12 digits
  assert.ok(!uidTailMatches("", "XXXXXXXX1234") && !uidTailMatches(undefined, "XXXXXXXX1234"));
});

test("namesMatch: tolerant of how people write names, strict about different people", () => {
  const yes = [
    ["Bhoomi Testperson", "Bhoomi Testperson"], ["bhoomi testperson", "BHOOMI TESTPERSON"],
    ["Bhoomi", "Bhoomi Testperson"],                 // first name only
    ["Testperson", "Bhoomi Testperson"],             // surname only
    ["Testperson Bhoomi", "Bhoomi Testperson"],      // order
    ["Bhoomi T", "Bhoomi Testperson"],               // initial
    ["B Testperson", "Bhoomi Testperson"],
    ["Mr. Bhoomi Testperson", "Bhoomi Testperson"],  // honorific
    ["Bhoomi Testperson", "Bhoomi Kumar Testperson"],// middle name missing
    ["Bhoomi Testpersen", "Bhoomi Testperson"],      // one-letter typo in a long name
    ["Álvaro Núñez", "Alvaro Nunez"],                // accents
    ["O'Neil Ananya", "ONeil Ananya"], ["Ananya  Gupta", "Ananya Gupta"]
  ];
  const no = [
    ["Rahul Sharma", "Bhoomi Testperson"], ["Bhoomi", "Bhumika Testperson"], ["Rohan", "Rahul"],
    ["B T", "Bhoomi Testperson"],                    // initials alone are not enough
    ["Bhoomi Testperson", "Testperson Kumari Anaya"],
    ["Ana", "Anamika"],                              // a prefix is not a match
    ["", "Bhoomi"], ["Bhoomi", ""], [null, "Bhoomi"], ["Mr.", "Bhoomi"], ["!!!", "Bhoomi"]
  ];
  for (const [a, b] of yes) assert.ok(namesMatch(a, b), `${a} ~ ${b}`);
  for (const [a, b] of no) assert.ok(!namesMatch(a, b), `${a} !~ ${b}`);
});

test("compareIdentity reports only WHICH categories disagree", () => {
  const doc = { maskedUid: "XXXXXXXX7391", name: "Bhoomi Testperson", dob: "14-03-1999" };
  const claim = { aadhaar: "555566667391", name: "Bhoomi Testperson", dob: "14/03/1999" };
  assert.deepStrictEqual(compareIdentity(claim, doc), { ok: true, mismatches: [] });
  assert.deepStrictEqual(compareIdentity({ ...claim, aadhaar: "555566667392" }, doc).mismatches, ["aadhaar"]);
  assert.deepStrictEqual(compareIdentity({ ...claim, dob: "15/03/1999" }, doc).mismatches, ["dob"]);
  assert.deepStrictEqual(compareIdentity({ ...claim, name: "Rahul Sharma" }, doc).mismatches, ["name"]);
  assert.deepStrictEqual(compareIdentity({ aadhaar: "555566660000", name: "Rahul", dob: "01/01/1980" }, doc).mismatches, ["aadhaar", "dob", "name"]);
  // doctors have no date of birth on their form: the other two facts still have to agree
  assert.deepStrictEqual(compareIdentity({ aadhaar: claim.aadhaar, name: claim.name }, doc), { ok: true, mismatches: [] });
  assert.deepStrictEqual(compareIdentity({ aadhaar: claim.aadhaar, name: "Rahul" }, doc).mismatches, ["name"]);
});
