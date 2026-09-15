const Patient = require("../models/Patient");

const SANDBOX_BASE = "https://api.sandbox.co.in";

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

// In-memory map of DigiLocker session_id -> the patient's Aadhaar that
// initiated it, so we know whose record to update once they complete
// consent. Resets on server restart, which just means an in-flight
// verification would need to be started again — acceptable for a demo.
const sessionToAadhaar = new Map();

// ================= STEP 1: START A DIGILOCKER SESSION =================
exports.initiateSession = async (req, res) => {
  try {
    const { aadhaar } = req.body;

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

    sessionToAadhaar.set(session_id, aadhaar);

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
    const aadhaar = sessionId ? sessionToAadhaar.get(sessionId) : null;

    if (!sessionId || !aadhaar) {
      return res.redirect(`${frontendBase}/?digilocker=error`);
    }

    const token = await getAccessToken();

    const statusRes = await fetch(`${SANDBOX_BASE}/kyc/digilocker/sessions/${sessionId}/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": process.env.SANDBOX_API_KEY
      }
    });

    const statusData = await statusRes.json();
    const status = statusData.data?.status;

    if (status === "succeeded") {
      await Patient.findOneAndUpdate(
        { aadhaar_id: aadhaar },
        { digilockerVerified: true, digilockerVerifiedAt: new Date() }
      );
      sessionToAadhaar.delete(sessionId);
      return res.redirect(`${frontendBase}/?digilocker=success`);
    }

    sessionToAadhaar.delete(sessionId);
    return res.redirect(`${frontendBase}/?digilocker=failed`);
  } catch (err) {
    console.error("❌ DIGILOCKER CALLBACK ERROR:", err);
    return res.redirect(`${frontendBase}/?digilocker=error`);
  }
};
