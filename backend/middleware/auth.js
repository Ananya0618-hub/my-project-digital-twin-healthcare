const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/jwt");
const Consent = require("../models/Consent");
const { logAccess } = require("../utils/audit");
const { tooMany } = require("../utils/rateLimit");
const limits = require("../config/limits");

// Verifies the Bearer token and sets req.user:
//   patient -> { role: "patient", aadhaar }
//   doctor  -> { role: "doctor", doctorRegId }
// Tokens issued before roles existed have no "role" claim and are patients.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Login required ❌" });

  try {
    const p = jwt.verify(token, JWT_SECRET);
    req.user =
      p.role === "doctor"
        ? { role: "doctor", doctorRegId: p.doctorRegId }
        : { role: "patient", aadhaar: p.aadhaar };
    next();
  } catch {
    res.status(401).json({ message: "Session expired — please log in again ❌" });
  }
}

const requireRole = (role) => (req, res, next) =>
  req.user && req.user.role === role
    ? next()
    : res.status(403).json({ message: `This action is for ${role}s only ❌` });

const fromParams = (req) => req.params.aadhaar;
const fromBody = (req) => req.body && req.body.aadhaar;

// A doctor's consent record for one patient (null if they have never asked).
const findConsent = (patientAadhaar, doctorRegId) => Consent.findOne({ patientAadhaar, doctorRegId });

// Refuse a doctor who has no approved consent. Every refusal counts toward a limit, so someone
// trying lots of Aadhaar or registration numbers to find patients is cut off (429) after a few.
// A doctor opening patients who DID approve them is never counted.
function denyAccess(req, res, consent) {
  if (tooMany(`denied:${req.user.doctorRegId}`, limits.deniedAccess)) {
    return res.status(429).json({ message: "Too many attempts to open records you don't have access to ❌ — wait a few minutes and try again" });
  }
  return res.status(403).json({
    code: "CONSENT_REQUIRED",
    consentStatus: consent ? consent.status : "none",
    message: "This patient hasn't granted you access ❌"
  });
}

// Gate for anything that reads or writes one patient's data.
//   patient -> only their own Aadhaar
//   doctor  -> only with an approved Consent from that patient
// Sets req.targetAadhaar for downstream handlers.
const requirePatientAccess = (getAadhaar) => async (req, res, next) => {
  const aadhaar = getAadhaar(req);
  if (!aadhaar || typeof aadhaar !== "string") {
    return res.status(400).json({ message: "aadhaar is required ❌" });
  }

  if (req.user.role === "patient") {
    if (req.user.aadhaar !== aadhaar) {
      return res.status(403).json({ message: "You can only access your own records ❌" });
    }
  } else {
    const consent = await findConsent(aadhaar, req.user.doctorRegId);
    if (!consent || consent.status !== "approved") return denyAccess(req, res, consent);
  }

  req.targetAadhaar = aadhaar;
  next();
};

// Records doctor access (patients accessing themselves aren't logged).
// Fails closed: if the log can't be written the request is refused.
const audit = (action) => async (req, res, next) => {
  if (req.user.role !== "doctor") return next();
  try {
    await logAccess({ patientAadhaar: req.targetAadhaar, doctorRegId: req.user.doctorRegId, action });
    next();
  } catch (err) {
    console.error("❌ AUDIT LOG ERROR:", err);
    res.status(500).json({ message: "Couldn't record access log ❌" });
  }
};

module.exports = { requireAuth, requireRole, requirePatientAccess, audit, fromParams, fromBody, findConsent, denyAccess };
