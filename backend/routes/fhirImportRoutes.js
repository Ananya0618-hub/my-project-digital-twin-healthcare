const express = require("express");
const router = express.Router();

const { importFromFhirSandbox } = require("../controllers/fhirImportController");
const { exportBundle } = require("../controllers/fhirExportController");
const {
  requireAuth,
  requireRole,
  requirePatientAccess,
  audit,
  fromBody,
  fromParams
} = require("../middleware/auth");

// Pull synthetic records from the public FHIR sandbox into the patient's own record
router.post("/import", requireAuth, requireRole("patient"), requirePatientAccess(fromBody), importFromFhirSandbox);

// Export a patient's record as a FHIR R4 Bundle (the patient, or an approved doctor)
router.get("/export/:aadhaar", requireAuth, requirePatientAccess(fromParams), audit("fhir_export"), exportBundle);

module.exports = router;
