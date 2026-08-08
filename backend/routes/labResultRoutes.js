const express = require("express");
const router = express.Router();

const { addLabResult, getLabResults, deleteLabResult } = require("../controllers/labResultController");

router.post("/", addLabResult);
router.get("/:aadhaar", getLabResults);
router.delete("/:id", deleteLabResult);

module.exports = router;
