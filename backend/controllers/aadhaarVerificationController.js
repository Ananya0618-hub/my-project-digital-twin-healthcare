const { createWorker } = require("tesseract.js");
const { isValidVerhoeff } = require("../utils/verhoeff");

// ================= OCR WORKER (singleton, created once and reused) =================
// tesseract.js downloads its English language data (~4MB) from a CDN the
// first time a worker is created. Creating it once here — rather than per
// request — means that download only happens once per server start, not
// on every registration attempt.
let workerPromise = null;
function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng");
  }
  return workerPromise;
}

// ================= DOCUMENT VERIFICATION =================
exports.extractAndVerify = async (req, res) => {
  try {
    const typedNumber = (req.body.aadhaarNumber || "").replace(/\s/g, "");

    if (!req.file) {
      return res.status(400).json({ message: "Please upload an Aadhaar card image ❌" });
    }
    if (!/^\d{12}$/.test(typedNumber)) {
      return res.status(400).json({ message: "Enter the 12-digit Aadhaar number first ❌" });
    }

    const worker = await getWorker();
    const {
      data: { text }
    } = await worker.recognize(req.file.buffer);

    // Aadhaar cards print the number as four-space-separated groups of 4 digits.
    // Pull out every sequence that looks like that pattern from the OCR text.
    const candidateMatches = text.match(/\d{4}\s?\d{4}\s?\d{4}/g) || [];
    const candidates = candidateMatches.map(c => c.replace(/\s/g, ""));

    const matched = candidates.includes(typedNumber);
    const checksumValid = isValidVerhoeff(typedNumber);

    res.json({
      matched,
      checksumValid,
      candidatesFound: candidates,
      message: matched
        ? "The Aadhaar number on the uploaded document matches what you entered ✅"
        : "Couldn't find that Aadhaar number on the uploaded document ❌ — try a clearer photo, or double-check the number you typed"
    });
  } catch (err) {
    console.error("❌ AADHAAR OCR ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

// ================= SIMULATED MOBILE OTP =================
// In-memory store, resets on server restart — fine for a demo flow.
// Real SMS delivery would need a paid provider + DLT template registration
// in India, which isn't realistic to set up for a student project on short
// notice. This simulates the exact same flow (generate, expire, verify)
// but shows the OTP directly instead of sending it by text.
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;

exports.sendOtp = (req, res) => {
  const { mobile } = req.body;

  if (!/^\d{10}$/.test(mobile || "")) {
    return res.status(400).json({ message: "Enter a valid 10-digit mobile number ❌" });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(mobile, { otp, expiresAt: Date.now() + OTP_TTL_MS });

  res.json({
    message: "Demo OTP generated — simulated, not sent via real SMS ✅",
    otp,
    expiresInSeconds: OTP_TTL_MS / 1000
  });
};

exports.verifyOtp = (req, res) => {
  const { mobile, otp } = req.body;
  const entry = otpStore.get(mobile);

  if (!entry) {
    return res.status(400).json({ message: "No OTP was requested for this number ❌" });
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(mobile);
    return res.status(400).json({ message: "OTP expired — request a new one ❌" });
  }
  if (entry.otp !== otp) {
    return res.status(400).json({ message: "Incorrect OTP ❌" });
  }

  otpStore.delete(mobile);
  res.json({ verified: true, message: "Mobile number verified ✅" });
};
