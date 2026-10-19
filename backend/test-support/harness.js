const path = require("path");
const express = require("express");
const jwt = require("jsonwebtoken");
const fake = require("./fakeModels");

// Swap the real Mongoose models for the in-memory fakes BEFORE anything else loads them.
for (const [name, Model] of Object.entries(fake)) {
  const file = require.resolve(path.join(__dirname, "..", "models", name));
  require.cache[file] = { id: file, filename: file, loaded: true, exports: Model, children: [], paths: [] };
}

const { JWT_SECRET } = require("../config/jwt");

const app = express();
app.use(express.json());
app.use("/api/auth", require("../routes/authRoutes"));
app.use("/api/patients", require("../routes/patientRoutes"));
app.use("/api/treatments", require("../routes/treatmentRoutes"));
app.use("/api/labresults", require("../routes/labResultRoutes"));
app.use("/api/ai", require("../routes/aiRoutes"));
app.use("/api/fhir", require("../routes/fhirImportRoutes"));
app.use("/api/consent", require("../routes/consentRoutes"));
app.use("/api/hospitals", require("../routes/hospitalRoutes"));

const patientToken = (aadhaar) => jwt.sign({ id: "p", aadhaar, role: "patient" }, JWT_SECRET);
const legacyPatientToken = (aadhaar) => jwt.sign({ id: "p", aadhaar }, JWT_SECRET); // pre-role tokens
const doctorToken = (doctorRegId) => jwt.sign({ id: "d", doctorRegId, role: "doctor" }, JWT_SECRET);

async function start() {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const call = async (method, url, { token, body } = {}) => {
    const res = await fetch(base + url, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, body: json, text };
  };

  return { server, call, base, models: fake };
}

module.exports = { start, patientToken, legacyPatientToken, doctorToken };
