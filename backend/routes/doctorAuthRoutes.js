const express = require("express");
const router = express.Router();

const { registerDoctor, loginDoctor } = require("../controllers/doctorAuthController");

router.post("/register", registerDoctor);
router.post("/login", loginDoctor);

module.exports = router;
