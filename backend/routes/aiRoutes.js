const express = require("express");
const router = express.Router();

const { summarizePatient } = require("../controllers/aiController");

router.post("/summarize", summarizePatient);

module.exports = router;
