const { namesMatch, dobMatches } = require("./identityMatch");

// Tracks which Aadhaar numbers have passed DigiLocker verification, so registration can pick the result up —
// verification happens DURING sign-up, before any Patient/Doctor record exists to attach it to.
// A verification is bound to the identity that was checked (name, and date of birth for patients), and expires:
// the account must be created within 30 minutes, with the same details that were verified.
// In memory: a restart mid-registration just means verifying again.
const TTL_MS = 30 * 60 * 1000;
const MAX_RECORDS = 5000;
const records = new Map();

function prune(now = Date.now()) {
  for (const [aadhaar, r] of records) if (now - r.verifiedAt > TTL_MS) records.delete(aadhaar);
}

function markVerified(aadhaar, role, identity = {}) {
  prune();
  if (records.size >= MAX_RECORDS) records.delete(records.keys().next().value); // drop the oldest
  records.set(aadhaar, { role, verifiedAt: Date.now(), name: identity.name || "", dob: identity.dob || "" });
}

function getVerification(aadhaar) {
  const r = records.get(aadhaar);
  if (!r) return null;
  if (Date.now() - r.verifiedAt > TTL_MS) {
    records.delete(aadhaar);
    return null;
  }
  return r;
}

const isVerified = (aadhaar) => getVerification(aadhaar) !== null;

// True only if this Aadhaar was verified AND the details being registered are the ones that were verified.
function isVerifiedFor(aadhaar, { name, dob } = {}) {
  const r = getVerification(aadhaar);
  if (!r) return false;
  if (r.name && !namesMatch(name, r.name)) return false;
  if (r.dob && !dobMatches(dob, r.dob)) return false;
  return true;
}

// for tests only
const _reset = () => records.clear();

module.exports = { markVerified, isVerified, isVerifiedFor, TTL_MS, _reset };
