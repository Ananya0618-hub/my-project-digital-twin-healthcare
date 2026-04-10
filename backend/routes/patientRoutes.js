const express = require("express");
const router = express.Router();

const {
  getAllPatients,
  getPatientById,
  addPatient,
  updatePatient   // ✅ added
} = require("../controllers/patientController");

// ✅ GET all patient
router.get("/", getAllPatients);

// ✅ GET patient by Aadhaar ID
router.get("/:aadhaar", getPatientById);

// ✅ POST add new patient
router.post("/", addPatient);

// ✅ PUT update patient by Aadhaar ID
router.put("/:aadhaar", updatePatient);

module.exports = router;