const express = require("express");
const router = express.Router();

const { getPatientById, updatePatient } = require("../controllers/patientController");
const {
  requireAuth,
  requireRole,
  requirePatientAccess,
  audit,
  fromParams
} = require("../middleware/auth");

// Patients are created through /api/auth/register only. The old open
// "list every patient" and "create patient" endpoints were removed.

// GET patient by Aadhaar ID — the patient themselves, or a doctor they've approved
router.get("/:aadhaar", requireAuth, requirePatientAccess(fromParams), audit("view_record"), getPatientById);

// PUT update — the patient themselves only
router.put("/:aadhaar", requireAuth, requireRole("patient"), requirePatientAccess(fromParams), updatePatient);

module.exports = router;
