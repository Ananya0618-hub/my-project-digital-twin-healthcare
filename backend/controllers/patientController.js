const Patient = require("../models/Patient");
const { normalize: normalizeRegistrationNumber, isValid: isValidRegistrationNumber } = require("../utils/registrationNumber");
const { findConsent, denyAccess } = require("../middleware/auth");
const { logAccess } = require("../utils/audit");

// ✅ GET PATIENT BY AADHAAR
const getPatientById = async (req, res) => {
  try {
    const { aadhaar } = req.params;

    const patient = await Patient.findOne({ aadhaar_id: aadhaar });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found ❌" });
    }

    res.json(patient);
  } catch (err) {
    console.error("❌ GET PATIENT ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

// ✅ UPDATE PATIENT BY AADHAAR
const updatePatient = async (req, res) => {
  try {
    const { aadhaar } = req.params;
    const { name, mobile, email, address, dob } = req.body;

    const patient = await Patient.findOne({ aadhaar_id: aadhaar });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found ❌" });
    }

    if (name) patient.name = name;
    if (mobile) patient.mobile = mobile;
    if (email) patient.email = email;
    if (address) patient.address = address;
    if (dob) patient.dob = dob;

    await patient.save();

    res.json({
      message: "Patient updated successfully ✅",
      patient
    });
  } catch (err) {
    console.error("❌ UPDATE PATIENT ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

// POST /api/patients/lookup  { registrationNumber }   (doctors)
// The same rule as opening a patient by Aadhaar: no approved consent, no record. An unknown number is
// answered exactly like a patient who simply hasn't approved this doctor, so it reveals nothing.
const lookupByRegistration = async (req, res) => {
  try {
    const number = normalizeRegistrationNumber(req.body && req.body.registrationNumber);
    if (!number || !isValidRegistrationNumber(number)) {
      return res.status(400).json({ message: "That doesn't look like a valid registration number — check it for typos ❌" });
    }

    const patient = await Patient.findOne({ registrationNumber: number });
    const consent = patient ? await findConsent(patient.aadhaar_id, req.user.doctorRegId) : null;
    if (!consent || consent.status !== "approved") return denyAccess(req, res, consent);

    try {
      await logAccess({ patientAadhaar: patient.aadhaar_id, doctorRegId: req.user.doctorRegId, action: "view_record" });
    } catch (err) {
      console.error("❌ AUDIT LOG ERROR:", err);
      return res.status(500).json({ message: "Couldn't record access log ❌" });
    }

    res.json(patient);
  } catch (err) {
    console.error("❌ LOOKUP BY REGISTRATION ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

module.exports = {
  getPatientById,
  updatePatient,
  lookupByRegistration
};
