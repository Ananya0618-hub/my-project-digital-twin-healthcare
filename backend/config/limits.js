// Per-doctor limits that stop someone probing for patients. In memory (one server process).
module.exports = {
  // attempts to open a patient who hasn't approved this doctor (wrong/guessed numbers count too)
  deniedAccess: { windowMs: 10 * 60 * 1000, max: 30 },
  // new (or re-opened) access requests
  consentRequests: { windowMs: 60 * 60 * 1000, max: 15 }
};
