const Hospital = require("../models/Hospital");

const clean = (s) => String(s || "").trim().replace(/\s+/g, " ").slice(0, 120);

// Registers a hospital name the first time it's used. Never throws — a failure
// here must not block saving the record itself.
async function ensureHospital(name) {
  const n = clean(name);
  if (!n) return "";
  try {
    const nameKey = n.toLowerCase();
    const existing = await Hospital.findOne({ nameKey });
    if (!existing) await new Hospital({ name: n, nameKey }).save();
  } catch (err) {
    if (!(err && err.code === 11000)) console.error("ensureHospital:", err.message);
  }
  return n;
}

module.exports = { clean, ensureHospital };
