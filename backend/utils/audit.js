const AccessLog = require("../models/AccessLog");
const { getDoctorName } = require("./doctors");

// One page view fires several reads (profile, treatments, labs); log it once
// per doctor+patient per window instead of three times.
const DEDUPE_MS = 5 * 60 * 1000;
const recentViews = new Map();

async function logAccess({ patientAadhaar, doctorRegId, action }) {
  if (action === "view_record") {
    const key = `${doctorRegId}|${patientAadhaar}`;
    const last = recentViews.get(key);
    if (last && Date.now() - last < DEDUPE_MS) return;
    recentViews.set(key, Date.now());
  }

  const doctorName = await getDoctorName(doctorRegId);
  await new AccessLog({ patientAadhaar, doctorRegId, doctorName, action }).save();
}

module.exports = { logAccess };
