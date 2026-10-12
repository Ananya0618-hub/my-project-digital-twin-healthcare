const express = require("express");
const router = express.Router();

const { addTreatment, getTreatments, deleteTreatment } = require("../controllers/treatmentController");
const {
  requireAuth,
  requireRole,
  requirePatientAccess,
  audit,
  fromBody,
  fromParams
} = require("../middleware/auth");

// ✅ Add treatment (patient for themselves, or a doctor the patient has approved)
router.post("/", requireAuth, requirePatientAccess(fromBody), audit("add_treatment"), addTreatment);

// ✅ Get treatments
router.get("/:aadhaar", requireAuth, requirePatientAccess(fromParams), audit("view_record"), getTreatments);

// ✅ Delete treatment (patient, own records only)
router.delete("/:id", requireAuth, requireRole("patient"), deleteTreatment);

module.exports = router;
