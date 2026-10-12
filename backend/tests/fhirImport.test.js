const test = require("node:test");
const assert = require("node:assert");
const { deriveStatus } = require("../controllers/fhirImportController");

test("FHIR sandbox import: status comes from the value and the range, and is 'unrated' with nothing to compare", () => {
  const cases = [
    [9, 12, 16, "low"], [12, 12, 16, "normal"], [14, 12, 16, "normal"], [16, 12, 16, "normal"], [20, 12, 16, "high"],
    [5, 12, undefined, "low"], [15, 12, undefined, "normal"],            // one-sided ranges still work
    [250, undefined, 200, "high"], [150, undefined, 200, "normal"],
    [4.85, undefined, undefined, "unrated"],                             // no range at all
    ["Positive", 1, 2, "unrated"], [undefined, 1, 2, "unrated"], [NaN, 1, 2, "unrated"], [Infinity, 1, 2, "unrated"]
  ];
  for (const [value, low, high, expected] of cases) {
    assert.strictEqual(deriveStatus(value, low, high), expected, `${value} vs ${low}-${high}`);
  }
});
