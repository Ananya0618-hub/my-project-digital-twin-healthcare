const express = require("express");
const router = express.Router();

const { initiateSession, handleCallback } = require("../controllers/digilockerController");

router.post("/initiate", initiateSession);
router.get("/callback", handleCallback);

module.exports = router;
