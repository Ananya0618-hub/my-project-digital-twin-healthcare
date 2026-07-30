const Patient = require("../models/Patient");

// ✅ GET ALL PATIENTS
const getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find();
    res.json(patients);
  } catch (err) {
    console.error("❌ GET ALL PATIENTS ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

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

// ✅ ADD NEW PATIENT (used outside the register flow, e.g. admin add)
const addPatient = async (req, res) => {
  try {
    const { name, aadhaar_id, mobile, email, address, dob } = req.body;

    const exists = await Patient.findOne({ aadhaar_id });
    if (exists) {
      return res.status(400).json({ message: "Patient already exists ❌" });
    }

    const newPatient = new Patient({ name, aadhaar_id, mobile, email, address, dob });
    await newPatient.save();

    res.status(201).json({
      message: "Patient added successfully ✅",
      patient: newPatient
    });
  } catch (err) {
    console.error("❌ ADD PATIENT ERROR:", err);
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
  getAllPatients,
  getPatientById,
  addPatient,
  updatePatient
};
