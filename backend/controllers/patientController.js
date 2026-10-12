const Patient = require("../models/Patient");

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

module.exports = {
  getPatientById,
  updatePatient
};
