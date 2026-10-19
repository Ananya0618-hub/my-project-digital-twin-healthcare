const crypto = require("crypto");
const { isValidVerhoeff, verhoeffCheckDigit } = require("./verhoeff");

// A patient's registration number: HM-4829-1037-5526
//   "HM" + 11 random digits + 1 Verhoeff check digit, so a mistyped digit (or two swapped digits) is
//   caught before anything is looked up.
// It is issued once, never changes, and is never handed out twice. It is an IDENTIFIER the patient
// can give a doctor instead of their Aadhaar number — not a secret. Consent is still what gates access.
// Random, not sequential: a sequential number would let anyone walk through the whole range.
// The "HM" prefix is required on input so it can never be confused with a 12-digit Aadhaar number.

const PREFIX = "HM";
const BODY_DIGITS = 11;

const format = (twelveDigits) =>
  `${PREFIX}-${twelveDigits.slice(0, 4)}-${twelveDigits.slice(4, 8)}-${twelveDigits.slice(8, 12)}`;

function generate() {
  let body = "";
  for (let i = 0; i < BODY_DIGITS; i++) body += crypto.randomInt(0, 10);
  return format(body + verhoeffCheckDigit(body));
}

// "hm 4829 1037 5526", "HM4829-1037-5526" -> "HM-4829-1037-5526"; anything else -> null.
// Bare digits are deliberately NOT accepted: that shape is an Aadhaar number.
function normalize(input) {
  if (typeof input !== "string") return null;
  const m = input.trim().toUpperCase().replace(/[\s-]/g, "").match(/^HM(\d{12})$/);
  return m ? format(m[1]) : null;
}

function isValid(input) {
  const n = normalize(input);
  return n !== null && isValidVerhoeff(n.slice(PREFIX.length + 1).replace(/-/g, ""));
}

// isTaken(number) -> Promise<boolean>. A clash is astronomically unlikely, but it is checked anyway.
async function generateUnique(isTaken, maxAttempts = 8) {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generate();
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error("Couldn't allocate a registration number");
}

module.exports = { generate, normalize, isValid, generateUnique, PREFIX };
