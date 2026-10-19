const Consent = require("../models/Consent");
const Patient = require("../models/Patient");
const AccessLog = require("../models/AccessLog");
const { getDoctorName } = require("../utils/doctors");
const { normalize: normalizeRegistrationNumber, isValid: isValidRegistrationNumber } = require("../utils/registrationNumber");
const { tooMany } = require("../utils/rateLimit");
const limits = require("../config/limits");

// ---- doctor: ask a patient for access -------------------------------------
exports.requestAccess = async (req, res) => {
  try {
    // A request names the patient by registration number (preferred) or Aadhaar. The reply never
    // contains the Aadhaar number.
    const { patientAadhaar: aadhaarIn, registrationNumber } = req.body || {};
    let patient;
    if (registrationNumber !== undefined) {
      const number = normalizeRegistrationNumber(registrationNumber);
      if (!number || !isValidRegistrationNumber(number)) {
        return res.status(400).json({ message: "That doesn't look like a valid registration number — check it for typos ❌" });
      }
      patient = await Patient.findOne({ registrationNumber: number });
      if (!patient) return res.status(404).json({ message: "No patient found with that registration number ❌" });
    } else {
      if (!/^\d{12}$/.test(aadhaarIn || "")) {
        return res.status(400).json({ message: "Enter a valid 12-digit Aadhaar ❌" });
      }
      patient = await Patient.findOne({ aadhaar_id: aadhaarIn });
      if (!patient) return res.status(404).json({ message: "No patient found with that Aadhaar ❌" });
    }
    const patientAadhaar = patient.aadhaar_id;

    const { doctorRegId } = req.user;
    const doctorName = await getDoctorName(doctorRegId);

    const existing = await Consent.findOne({ patientAadhaar, doctorRegId });
    if (existing && (existing.status === "approved" || existing.status === "pending")) {
      return res.json({ status: existing.status });
    }

    // a new (or re-opened) request uses up part of the doctor's hourly allowance
    if (tooMany(`consent:${doctorRegId}`, limits.consentRequests)) {
      return res.status(429).json({ message: "You've sent a lot of access requests ❌ — wait a while before sending more" });
    }

    // denied / revoked -> the doctor may ask again, which reopens it as pending
    const consent = existing || new Consent({ patientAadhaar, doctorRegId });
    consent.patientName = patient.name;
    consent.doctorName = doctorName;
    consent.status = "pending";
    consent.requestedAt = new Date();
    consent.respondedAt = null;

    try {
      await consent.save();
    } catch (err) {
      if (err && err.code === 11000) return res.json({ status: "pending" }); // concurrent double-click
      throw err;
    }

    res.status(201).json({ status: "pending" });
  } catch (err) {
    console.error("❌ CONSENT REQUEST ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

// ---- doctor: patients who have granted me access ---------------------------
exports.myPatients = async (req, res) => {
  try {
    const rows = await Consent.find({ doctorRegId: req.user.doctorRegId, status: "approved" }).sort({ respondedAt: -1 });
    const out = [];
    for (const c of rows) {
      const patient = await Patient.findOne({ aadhaar_id: c.patientAadhaar });
      out.push({
        patientAadhaar: c.patientAadhaar,
        registrationNumber: patient ? patient.registrationNumber || null : null,
        patientName: c.patientName,
        since: c.respondedAt
      });
    }
    res.json(out);
  } catch (err) {
    console.error("❌ MY PATIENTS ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

// ---- patient: who has asked / has access -----------------------------------
exports.listMine = async (req, res) => {
  try {
    const rows = await Consent.find({ patientAadhaar: req.user.aadhaar }).sort({ requestedAt: -1 });
    res.json(
      rows.map((c) => ({
        doctorRegId: c.doctorRegId,
        doctorName: c.doctorName,
        status: c.status,
        requestedAt: c.requestedAt,
        respondedAt: c.respondedAt
      }))
    );
  } catch (err) {
    console.error("❌ CONSENT LIST ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

// ---- patient: approve / deny / revoke --------------------------------------
const TRANSITIONS = {
  approve: { from: "pending", to: "approved" },
  deny: { from: "pending", to: "denied" },
  revoke: { from: "approved", to: "revoked" }
};

exports.respond = async (req, res) => {
  try {
    const { doctorRegId, decision } = req.body || {};
    const rule = TRANSITIONS[decision];
    if (!doctorRegId || !rule) {
      return res.status(400).json({ message: "doctorRegId and decision (approve/deny/revoke) are required ❌" });
    }

    // Scoped to the logged-in patient, so nobody can answer for someone else.
    const consent = await Consent.findOne({ patientAadhaar: req.user.aadhaar, doctorRegId });
    if (!consent) return res.status(404).json({ message: "No such access request ❌" });

    if (consent.status !== rule.from) {
      return res.status(400).json({ message: `Can't ${decision} a request that is ${consent.status} ❌` });
    }

    consent.status = rule.to;
    consent.respondedAt = new Date();
    await consent.save();

    res.json({ doctorRegId, status: consent.status });
  } catch (err) {
    console.error("❌ CONSENT RESPOND ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

// ---- patient: who accessed my data ------------------------------------------
exports.myAuditLog = async (req, res) => {
  try {
    const rows = await AccessLog.find({ patientAadhaar: req.user.aadhaar }).sort({ at: -1 }).limit(100);
    res.json(
      rows.map((r) => ({
        doctorRegId: r.doctorRegId,
        doctorName: r.doctorName,
        action: r.action,
        at: r.at
      }))
    );
  } catch (err) {
    console.error("❌ AUDIT LIST ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};
