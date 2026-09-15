const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const { markVerified } = require("../utils/verificationStore");

// Sandbox's test environment — pre-approved for all standard products
// (including DigiLocker) without needing production/business approval,
// which is exactly what a personal test/API key is meant for. Doesn't
// consume wallet balance either. Switch to the production base URL only
// once the account has gone through Sandbox's business approval process.
const SANDBOX_BASE = process.env.SANDBOX_BASE_URL || "https://test-api.sandbox.co.in";

// The public HTTPS URL this backend is reachable at — used to build the
// callback DigiLocker/Sandbox redirects the user's browser back to once
// they've granted consent.
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://healthmirror.duckdns.org";

// ================= AUTH (cached, refreshed when expired) =================
let cachedToken = null;
let cachedTokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiry) {
    return cachedToken;
  }

  const res = await fetch(`${SANDBOX_BASE}/authenticate`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.SANDBOX_API_KEY,
      "x-api-secret": process.env.SANDBOX_API_SECRET,
      "x-api-version": "1.0.0"
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sandbox auth failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Sandbox tokens are valid 24h — refresh a little early to be safe.
  cachedTokenExpiry = Date.now() + 23 * 60 * 60 * 1000;

  return cachedToken;
}

// In-memory map of DigiLocker session_id -> { aadhaar, role }. "role" is
// "patient" or "doctor" — needed because this same flow now runs during
// registration for both, before any database account exists yet.
const sessionToInfo = new Map();

// ================= STEP 1: START A DIGILOCKER SESSION =================
exports.initiateSession = async (req, res) => {
  try {
    const { aadhaar, role } = req.body;

    if (!aadhaar) {
      return res.status(400).json({ message: "aadhaar is required ❌" });
    }

    if (!process.env.SANDBOX_API_KEY || !process.env.SANDBOX_API_SECRET) {
      return res.status(500).json({
        message: "DigiLocker verification isn't configured yet — SANDBOX_API_KEY/SECRET missing in .env ❌"
      });
    }

    const token = await getAccessToken();

    const sessionRes = await fetch(`${SANDBOX_BASE}/kyc/digilocker/sessions/init`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-api-key": process.env.SANDBOX_API_KEY
      },
      body: JSON.stringify({
        "@entity": "in.co.sandbox.kyc.digilocker.session.request",
        flow: "signin",
        doc_types: ["aadhaar"],
        redirect_url: `${PUBLIC_BASE_URL}/api/digilocker/callback`
      })
    });

    if (!sessionRes.ok) {
      const errText = await sessionRes.text();
      console.error("❌ DIGILOCKER INIT ERROR:", sessionRes.status, errText);
      return res.status(502).json({ message: "Couldn't start DigiLocker verification ❌" });
    }

    const sessionData = await sessionRes.json();
    const { authorization_url, session_id } = sessionData.data;

    sessionToInfo.set(session_id, { aadhaar, role: role || "patient" });

    res.json({ authorizationUrl: authorization_url });
  } catch (err) {
    console.error("❌ DIGILOCKER INITIATE ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

// ================= STEP 2: HANDLE THE REDIRECT BACK FROM DIGILOCKER =================
exports.handleCallback = async (req, res) => {
  const frontendBase = PUBLIC_BASE_URL;

  try {
    const { state } = req.query;

    // Sandbox encodes the session_id as the second pipe-separated segment
    // of the OAuth "state" parameter it passes through DigiLocker and back.
    const sessionId = state ? state.split("|")[1] : null;
    const info = sessionId ? sessionToInfo.get(sessionId) : null;

    if (!sessionId || !info) {
      return res.redirect(`${frontendBase}/?digilocker=error`);
    }

    const { aadhaar, role } = info;
    const token = await getAccessToken();

    const statusRes = await fetch(`${SANDBOX_BASE}/kyc/digilocker/sessions/${sessionId}/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": process.env.SANDBOX_API_KEY
      }
    });

    const statusData = await statusRes.json();
    const status = statusData.data?.status;

    sessionToInfo.delete(sessionId);

    if (status === "succeeded") {
      // Record it in the in-memory store immediately — this is what makes
      // verification-during-registration work, since no Patient/Doctor
      // record may exist in the database yet at this point.
      markVerified(aadhaar, role);

      // Best-effort: if an account already exists (e.g. verifying from an
      // existing dashboard rather than mid-registration), update it too.
      if (role === "doctor") {
        await Doctor.findOneAndUpdate(
          { aadhaarNumber: aadhaar },
          { digilockerVerified: true, digilockerVerifiedAt: new Date() }
        );
      } else {
        await Patient.findOneAndUpdate(
          { aadhaar_id: aadhaar },
          { digilockerVerified: true, digilockerVerifiedAt: new Date() }
        );
      }

      return res.redirect(`${frontendBase}/?digilocker=success`);
    }

    return res.redirect(`${frontendBase}/?digilocker=failed`);
  } catch (err) {
    console.error("❌ DIGILOCKER CALLBACK ERROR:", err);
    return res.redirect(`${frontendBase}/?digilocker=error`);
  }
};
