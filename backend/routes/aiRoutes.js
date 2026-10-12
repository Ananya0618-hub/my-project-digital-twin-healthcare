const express = require("express");
const router = express.Router();

const { summarizePatient } = require("../controllers/aiController");
const { requireAuth, requirePatientAccess, audit, fromBody } = require("../middleware/auth");

router.post("/summarize", requireAuth, requirePatientAccess(fromBody), audit("ai_summary"), summarizePatient);

module.exports = router;
