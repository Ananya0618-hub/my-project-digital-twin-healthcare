const express = require("express");
const router = express.Router();

const { listHospitals } = require("../controllers/hospitalController");
const { requireAuth } = require("../middleware/auth");

router.get("/", requireAuth, listHospitals);

module.exports = router;
