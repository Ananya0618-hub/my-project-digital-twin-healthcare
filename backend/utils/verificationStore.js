// Tracks DigiLocker verification results by Aadhaar number, independent of
// whether a Patient/Doctor account has actually been created yet. This is
// what makes it possible to verify Aadhaar *during* registration — before
// there's any database record to attach the result to.
//
// In-memory and resets on server restart. Acceptable here: a registration
// in progress that gets interrupted by a server restart just needs to
// re-verify, same as any other in-flight session would.
const verifiedAadhaars = new Map();

function markVerified(aadhaar, role) {
  verifiedAadhaars.set(aadhaar, { role, verifiedAt: Date.now() });
}

function isVerified(aadhaar) {
  return verifiedAadhaars.has(aadhaar);
}

module.exports = { markVerified, isVerified };
