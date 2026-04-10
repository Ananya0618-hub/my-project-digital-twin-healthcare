const express = require("express");
const router = express.Router();

const {
  addTreatment,
  getTreatments,
  deleteTreatment
} = require("../controllers/treatmentController");

// ✅ Add treatment
router.post("/", addTreatment);

// ✅ Get treatments
router.get("/:aadhaar", getTreatments);

// ✅ Delete treatment
router.delete("/:id", deleteTreatment);

module.exports = router;