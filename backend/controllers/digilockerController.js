const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const { markVerified } = require("../utils/verificationStore");
const { parseAadhaarXml } = require("../utils/aadhaarXml");
const { compareIdentity, parseDob, nameTokens } = require("../utils/identityMatch");
const { tooMany } = require("../utils/rateLimit");
const limits = require("../config/limits");

// Sandbox's test environment by default (use SANDBOX_BASE_URL=https://api.sandbox.co.in with Live keys).
// Test keys go with the test URL and live keys with the live URL; mixing them is refused.
// NOTE: Sandbox's access token is not a bearer token — it is sent in the `authorization` header
// as-is. Sending "Bearer <token>" makes the API answer 403 "Insufficient privilege", which is easy to
// mistake for an account-approval problem.
const SANDBOX_BASE = process.env.SANDBOX_BASE_URL || "https://test-api.sandbox.co.in";

// The public HTTPS URL this backend is reachable at — used to build the callback Sandbox redirects the
// user's browser back to once they've granted consent.
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://healthmirror.duckdns.org";

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_SESSIONS = 2000;
const MAX_FILE_CHARS = 400 * 1024;

// ================= AUTH (cached, refreshed when expired) =================
let cachedToken = null;
let cachedTokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiry) return cachedToken;

  const res = await fetch(`${SANDBOX_BASE}/authenticate`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.SANDBOX_API_KEY,
      "x-api-secret": process.env.SANDBOX_API_SECRET,
      "x-api-version": "1.0.0"
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) throw new Error(`Sandbox auth failed: ${res.status}`);

  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // tokens last 24h
  return cachedToken;
}

const sandboxHeaders = (token) => ({ authorization: token, "x-api-key": process.env.SANDBOX_API_KEY }); // token as-is, not "Bearer"

// session_id -> what the registration form claimed. Used once, by the callback.
const sessionToInfo = new Map();

function rememberSession(sessionId, info) {
  const now = Date.now();
  for (const [id, s] of sessionToInfo) if (now - s.createdAt > SESSION_TTL_MS) sessionToInfo.delete(id);
  if (sessionToInfo.size >= MAX_SESSIONS) sessionToInfo.delete(sessionToInfo.keys().next().value);
  sessionToInfo.set(sessionId, { ...info, createdAt: now });
}

// ================= STEP 1: START A DIGILOCKER SESSION =================
// Everything that can be checked for free is checked before Sandbox is called, because a completed
// verification costs real wallet credits.
exports.initiateSession = async (req, res) => {
  try {
    const { aadhaar, role: roleIn, name, dob } = req.body || {};
    const role = roleIn === "doctor" ? "doctor" : "patient";

    if (!/^\d{12}$/.test(String(aadhaar || ""))) {
      return res.status(400).json({ message: "Enter a valid 12-digit Aadhaar number first ❌" });
    }
    if (typeof name !== "string" || nameTokens(name).length === 0) {
      return res.status(400).json({ message: "Enter your name first — it is checked against DigiLocker ❌" });
    }
    if (role === "patient" && !(parseDob(dob) || {}).d) {
      return res.status(400).json({ message: "Enter your date of birth as DD/MM/YYYY first — it is checked against DigiLocker ❌" });
    }

    if (!process.env.SANDBOX_API_KEY || !process.env.SANDBOX_API_SECRET) {
      return res.status(500).json({ message: "DigiLocker verification isn't configured yet — SANDBOX_API_KEY/SECRET missing in .env ❌" });
    }

    // don't spend a verification on someone who can't register anyway
    const taken = role === "patient" ? await User.findOne({ aadhaar }) : await Doctor.findOne({ aadhaarNumber: aadhaar });
    if (taken) {
      return res.status(409).json({ message: "An account with this Aadhaar number already exists ❌ — log in instead" });
    }

    const overIp = tooMany(`dl:ip:${req.ip}`, limits.digilockerStartPerIp);
    const overAadhaar = tooMany(`dl:aadhaar:${aadhaar}`, limits.digilockerStartPerAadhaar);
    if (overIp || overAadhaar) {
      return res.status(429).json({ message: "Too many verification attempts ❌ — please wait a while and try again" });
    }

    const token = await getAccessToken();
    const sessionRes = await fetch(`${SANDBOX_BASE}/kyc/digilocker/sessions/init`, {
      method: "POST",
      headers: { ...sandboxHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        "@entity": "in.co.sandbox.kyc.digilocker.session.request",
        flow: "signin",
        doc_types: ["aadhaar"],
        redirect_url: `${PUBLIC_BASE_URL}/api/digilocker/callback`
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!sessionRes.ok) {
      console.error("❌ DIGILOCKER INIT ERROR:", sessionRes.status);
      return res.status(502).json({ message: "Couldn't start DigiLocker verification ❌" });
    }

    const { authorization_url, session_id } = (await sessionRes.json()).data;
    rememberSession(session_id, { aadhaar, role, name: name.trim(), dob: role === "patient" ? String(dob).trim() : "" });

    res.json({ authorizationUrl: authorization_url });
  } catch (err) {
    console.error("❌ DIGILOCKER INITIATE ERROR:", err.message);
    res.status(500).json({ message: "Couldn't start DigiLocker verification ❌" });
  }
};

// ================= STEP 2: DOWNLOAD THE AADHAAR DOCUMENT (once) =================
// -> { ok: true, document } | { ok: false, kind: "credits" | "error" }
async function fetchAadhaarDocument(sessionId, token) {
  const docRes = await fetch(`${SANDBOX_BASE}/kyc/digilocker/sessions/${sessionId}/documents/aadhaar`, {
    headers: sandboxHeaders(token),
    signal: AbortSignal.timeout(20000)
  });
  const body = await docRes.json().catch(() => ({}));

  if (!docRes.ok) {
    console.error("❌ DIGILOCKER DOCUMENT ERROR:", docRes.status, String(body.message || "").slice(0, 120));
    return { ok: false, kind: /credit|balance/i.test(String(body.message || "")) ? "credits" : "error" };
  }

  const files = (body.data && body.data.files) || [];
  const file = files.find((f) => /xml/i.test((f.metadata && f.metadata.ContentType) || "")) || files[0];
  if (!file || !file.url) return { ok: false, kind: "error" };

  const url = new URL(file.url);
  if (url.protocol !== "https:") return { ok: false, kind: "error" };

  let fileRes = await fetch(url, { signal: AbortSignal.timeout(20000) });
  // Sandbox credentials only ever go to Sandbox itself, never to whatever host holds the file
  if ([401, 403].includes(fileRes.status) && url.host === new URL(SANDBOX_BASE).host) {
    fileRes = await fetch(url, { headers: sandboxHeaders(token), signal: AbortSignal.timeout(20000) });
  }
  if (!fileRes.ok) return { ok: false, kind: "error" };

  const text = await fileRes.text();
  if (text.length > MAX_FILE_CHARS) return { ok: false, kind: "error" };

  const parsed = parseAadhaarXml(text);
  if (!parsed.ok) {
    console.error("❌ DIGILOCKER DOCUMENT UNREADABLE:", parsed.reason);
    return { ok: false, kind: "error" };
  }
  return { ok: true, document: parsed };
}

// ================= STEP 3: HANDLE THE REDIRECT BACK FROM DIGILOCKER =================
// ?digilocker=  success | failed (consent not completed) | mismatch&reason=aadhaar,dob,name |
//               unavailable (the service can't run right now) | error
exports.handleCallback = async (req, res) => {
  const go = (result, extra = "") => res.redirect(`${PUBLIC_BASE_URL}/?digilocker=${result}${extra}`);

  try {
    const { state } = req.query;
    // Sandbox passes the session_id as the second pipe-separated part of the OAuth "state"
    const sessionId = typeof state === "string" ? state.split("|")[1] : null;
    const info = sessionId ? sessionToInfo.get(sessionId) : null;
    if (!sessionId || !info) return go("error");

    // single use, FIRST: reloading or replaying this URL must never trigger a second (paid) download
    sessionToInfo.delete(sessionId);

    const token = await getAccessToken();
    const statusRes = await fetch(`${SANDBOX_BASE}/kyc/digilocker/sessions/${sessionId}/status`, {
      headers: sandboxHeaders(token),
      signal: AbortSignal.timeout(15000)
    });
    const status = ((await statusRes.json().catch(() => ({}))).data || {}).status;

    // consent not completed -> nothing to download, nothing to pay for
    if (status !== "succeeded") return go("failed");

    const doc = await fetchAadhaarDocument(sessionId, token);
    if (!doc.ok) {
      console.log("🪪 DIGILOCKER:", doc.kind === "credits" ? "unavailable (credits)" : "document error");
      return go(doc.kind === "credits" ? "unavailable" : "error");
    }

    const { ok, mismatches } = compareIdentity(info, doc.document);
    if (!ok) {
      console.log("🪪 DIGILOCKER: identity mismatch —", mismatches.join(","));
      return go("mismatch", `&reason=${mismatches.join(",")}`);
    }

    // Verified: this DigiLocker account belongs to the person the form describes.
    markVerified(info.aadhaar, info.role, { name: info.name, dob: info.dob });

    // best effort: if an account for this Aadhaar already exists, flag it too
    const flag = { digilockerVerified: true, digilockerVerifiedAt: new Date() };
    if (info.role === "doctor") await Doctor.findOneAndUpdate({ aadhaarNumber: info.aadhaar }, flag);
    else await Patient.findOneAndUpdate({ aadhaar_id: info.aadhaar }, flag);

    console.log("🪪 DIGILOCKER: verified");
    return go("success");
  } catch (err) {
    console.error("❌ DIGILOCKER CALLBACK ERROR:", err.message);
    return go("error");
  }
};
