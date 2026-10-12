const express = require("express");
const router = express.Router();

const { addLabResult, addLabResultsBulk, getLabResults, deleteLabResult } = require("../controllers/labResultController");
const { extractReport } = require("../controllers/labReportController");
const uploadReport = require("../middleware/uploadReport");
const {
  requireAuth,
  requireRole,
  requirePatientAccess,
  audit,
  fromBody,
  fromParams
} = require("../middleware/auth");

router.post("/", requireAuth, requirePatientAccess(fromBody), audit("add_lab"), addLabResult);

// Read an uploaded lab report into draft rows (saves nothing), then save the confirmed rows
router.post("/extract", requireAuth, uploadReport, extractReport);
router.post("/bulk", requireAuth, requirePatientAccess(fromBody), audit("add_lab"), addLabResultsBulk);

router.get("/:aadhaar", requireAuth, requirePatientAccess(fromParams), audit("view_record"), getLabResults);
router.delete("/:id", requireAuth, requireRole("patient"), deleteLabResult);

module.exports = router;
