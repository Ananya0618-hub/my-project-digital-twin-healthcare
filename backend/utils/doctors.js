const Doctor = require("../models/Doctor");

// Doctor display names, cached per process (names rarely change, and this is
// read on every audited request).
const cache = new Map();

async function getDoctorName(doctorRegId) {
  if (!doctorRegId) return "";
  if (cache.has(doctorRegId)) return cache.get(doctorRegId);
  const doc = await Doctor.findOne({ doctorRegId });
  const name = doc ? doc.name : "";
  if (name) cache.set(doctorRegId, name);
  return name;
}

module.exports = { getDoctorName };
