const express = require("express");
const router = express.Router();
const {
  getDigitalTwinByPatient
} = require("../controllers/digitalTwinController");

// GET digital twin summary by Aadhaar ID
router.get("/:aadhaar_id", getDigitalTwinByPatient);

module.exports = router;