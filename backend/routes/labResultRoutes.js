const express = require("express");
const router = express.Router();

const { addLabResult, getLabResults, deleteLabResult } = require("../controllers/labResultController");
const {
  requireAuth,
  requireRole,
  requirePatientAccess,
  audit,
  fromBody,
  fromParams
} = require("../middleware/auth");

router.post("/", requireAuth, requirePatientAccess(fromBody), audit("add_lab"), addLabResult);
router.get("/:aadhaar", requireAuth, requirePatientAccess(fromParams), audit("view_record"), getLabResults);
router.delete("/:id", requireAuth, requireRole("patient"), deleteLabResult);

module.exports = router;
