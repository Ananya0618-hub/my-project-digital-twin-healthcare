const express = require("express");
const router = express.Router();
const {
  getAllPatients,
  getPatientById,
  addPatient
} = require("../controllers/patientController");

// GET all patients
router.get("/", getAllPatients);

// GET patient by Aadhaar ID
router.get("/:aadhaar_id", getPatientById);

// POST add new patient
router.post("/", addPatient);

module.exports = router;