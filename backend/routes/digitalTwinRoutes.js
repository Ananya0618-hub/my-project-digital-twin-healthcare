const express = require("express");
const router = express.Router();
const {
  getDigitalTwinByPatient
} = require("../controllers/digitalTwinController");

// GET digital twin summary by Aadhaar ID
router.get("/:aadhaar", getDigitalTwinByPatient);

module.exports = router;