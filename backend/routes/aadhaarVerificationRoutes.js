const express = require("express");
const router = express.Router();

const { extractAndVerify, sendOtp, verifyOtp } = require("../controllers/aadhaarVerificationController");
const uploadAadhaar = require("../middleware/uploadAadhaar");

router.post("/extract", uploadAadhaar.single("aadhaarImage"), extractAndVerify);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

module.exports = router;
