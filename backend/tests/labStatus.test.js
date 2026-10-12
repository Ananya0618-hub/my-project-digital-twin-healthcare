const test = require("node:test");
const assert = require("node:assert");
const { computeLabStatus, parseReferenceRange } = require("../utils/labStatus");

test("computeLabStatus", () => {
  const cases = [
    ["225", "< 200", "high"],
    ["200", "<200", "high"],        // strict upper bound
    ["200", "<= 200", "normal"],    // inclusive upper bound
    ["45", "> 40", "normal"],
    ["40", "> 40", "low"],          // strict lower bound
    ["9", "30-100", "low"],
    ["30", "30-100", "normal"],     // bounds are inclusive
    ["100", "30 - 100", "normal"],
    ["120", "70 – 100", "high"],    // en dash
    ["5.5", "3.5 to 5.0", "high"],
    ["0.4", "0.4-4.0", "normal"],
    ["22", "≤ 40", "normal"],
    ["1,250", "< 1000", "high"],    // thousands separator
    ["225 mg/dL", "< 200", "high"], // unit typed into the value box
    ["Positive", "1-2", null],
    ["10", "", null],
    ["10", "normal", null],
    ["10", "M: 13-17, F: 12-15", null],
    ["5", "10-1", null]             // reversed range is rejected, not guessed
  ];
  for (const [value, range, expected] of cases) {
    assert.strictEqual(computeLabStatus(value, range), expected, `${value} vs "${range}"`);
  }
});

test("parseReferenceRange bounds", () => {
  assert.deepStrictEqual(parseReferenceRange("30-100"), { low: 30, high: 100, lowInclusive: true, highInclusive: true });
  assert.strictEqual(parseReferenceRange("< 200").low, null);
  assert.strictEqual(parseReferenceRange("> 40").high, null);
  assert.strictEqual(parseReferenceRange("garbage"), null);
});
