const express = require("express");
const router = express.Router();

const { importFromFhirSandbox } = require("../controllers/fhirImportController");

router.post("/import", importFromFhirSandbox);

module.exports = router;
