// Parses lab reference ranges ("30-100", "< 200", ">= 40", "3.5 to 5.0") and
// derives low/normal/high from a result value. Anything it can't parse
// returns null so callers can fall back instead of guessing.

const NUM = "(-?\\d*\\.?\\d+)";
const UPPER_RE = new RegExp(`^\\s*(<=|≤|<|up to|below|less than)\\s*${NUM}`, "i");
const LOWER_RE = new RegExp(`^\\s*(>=|≥|>|above|greater than|at least)\\s*${NUM}`, "i");
const BETWEEN_RE = new RegExp(`^\\s*${NUM}\\s*(?:-|–|—|to)\\s*${NUM}`, "i");

function parseValue(value) {
  const m = String(value ?? "").replace(/,/g, "").match(/^\s*(-?\d*\.?\d+)/);
  return m ? parseFloat(m[1]) : null;
}

// -> { low, high, lowInclusive, highInclusive } (missing bound = null) or null
function parseReferenceRange(range) {
  if (!range || typeof range !== "string") return null;

  let m = range.match(UPPER_RE);
  if (m) {
    return { low: null, high: parseFloat(m[2]), lowInclusive: true, highInclusive: /=|≤|up to/i.test(m[1]) };
  }

  m = range.match(LOWER_RE);
  if (m) {
    return { low: parseFloat(m[2]), high: null, lowInclusive: /=|≥|at least/i.test(m[1]), highInclusive: true };
  }

  m = range.match(BETWEEN_RE);
  if (m) {
    const low = parseFloat(m[1]);
    const high = parseFloat(m[2]);
    if (low > high) return null;
    return { low, high, lowInclusive: true, highInclusive: true };
  }

  return null;
}

// -> "low" | "normal" | "high" | null
function computeLabStatus(value, range) {
  const v = parseValue(value);
  const r = parseReferenceRange(range);
  if (v === null || !r) return null;

  if (r.low !== null && (r.lowInclusive ? v < r.low : v <= r.low)) return "low";
  if (r.high !== null && (r.highInclusive ? v > r.high : v >= r.high)) return "high";
  return "normal";
}

module.exports = { parseValue, parseReferenceRange, computeLabStatus };
