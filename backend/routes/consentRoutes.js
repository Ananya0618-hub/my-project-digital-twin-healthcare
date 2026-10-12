const express = require("express");
const router = express.Router();

const consent = require("../controllers/consentController");
const { requireAuth, requireRole } = require("../middleware/auth");

// doctor
router.post("/request", requireAuth, requireRole("doctor"), consent.requestAccess);
router.get("/doctor/patients", requireAuth, requireRole("doctor"), consent.myPatients);

// patient
router.get("/mine", requireAuth, requireRole("patient"), consent.listMine);
router.post("/respond", requireAuth, requireRole("patient"), consent.respond);
router.get("/audit", requireAuth, requireRole("patient"), consent.myAuditLog);

module.exports = router;
