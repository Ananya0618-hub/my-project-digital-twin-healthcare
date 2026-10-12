import { useState, useEffect, useCallback } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";
import {
  Building2,
  UserPlus,
  LayoutDashboard,
  Users,
  BarChart3,
  PlusCircle,
  LogOut,
  Search,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FlaskConical,
  ClipboardList,
  Stethoscope,
  FileText,
  TestTube2,
  Sparkles,
  Loader2,
  CloudDownload,
  ShieldCheck,
  History,
  Download,
  Lock,
  UserCheck,
  Check,
  X,
  TrendingUp,
  Upload
} from "lucide-react";
import "./App.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

// Relative path — works both in local dev (CRA proxy) and in production,
// where Nginx serves this app and proxies /api to the backend on the
// same domain. No hardcoded host, no CORS headaches.
const API = "/api";

// Which login the UI is currently acting as. App() sets this on every render so
// authFetch below picks the matching token.
let currentRole = "patient";

// fetch() that sends the logged-in user's token. A 401 means the session has
// expired (or the token is no good): clear it and go back to the login screen.
const authFetch = async (url, opts = {}) => {
  const token = localStorage.getItem(currentRole === "doctor" ? "doctorToken" : "token");
  const res = await fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  if (res.status === 401) {
    localStorage.clear();
    window.location.reload();
  }
  return res;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";
const recordDate = (rec) => rec.date || rec.createdAt || null;
const drName = (name) => (name ? `Dr. ${name.replace(/^dr\.?\s+/i, "")}` : "");
const todayLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const SOURCE_LABEL = { doctor: "Doctor", patient: "Self-reported", "fhir-sandbox": "FHIR sandbox" };
const ACCESS_ACTIONS = {
  view_record: "viewed your record",
  add_treatment: "added a treatment",
  add_lab: "added a lab result",
  ai_summary: "generated an AI summary",
  fhir_export: "exported your data (FHIR)"
};

// date · hospital · doctor, plus where the record came from
function RecordMeta({ rec, withDate = true }) {
  const source = rec.source || "patient";
  const bits = [withDate ? fmtDate(recordDate(rec)) : "", rec.hospital, drName(rec.doctorName)].filter(Boolean);
  return (
    <p className="record-meta">
      {bits.join(" · ")}
      <span className={`source-tag source-${source}`}>{SOURCE_LABEL[source] || source}</span>
      {rec.fromReport && <span className="source-tag source-report">From report</span>}
    </p>
  );
}

// Treatments and lab results merged into one date-ordered list
function Timeline({ treatments, labs }) {
  const items = [
    ...treatments.map((t) => ({ key: `t-${t._id}`, kind: "treatment", rec: t })),
    ...labs.map((l) => ({ key: `l-${l._id}`, kind: "lab", rec: l }))
  ].sort((a, b) => new Date(recordDate(b.rec) || 0) - new Date(recordDate(a.rec) || 0));

  if (items.length === 0) return <div className="empty-state">Nothing on the timeline yet</div>;

  return (
    <div className="timeline">
      {items.map(({ key, kind, rec }) => (
        <div className="timeline-item" key={key}>
          <div className={`timeline-dot ${kind === "lab" ? `dot-${rec.status}` : "dot-treatment"}`} />
          <p className="timeline-date">{fmtDate(recordDate(rec))}</p>
          {kind === "treatment" ? (
            <>
              <p className="treatment-diagnosis">{rec.diagnosis}</p>
              <p className="treatment-medication">{rec.medication}</p>
            </>
          ) : (
            <>
              <p className="treatment-diagnosis">
                {rec.testName}: {rec.resultValue} {rec.unit}
                <span className={`status-badge status-${rec.status}`} style={{ marginLeft: 8 }}>{rec.status}</span>
              </p>
              {rec.referenceRange && <p className="treatment-medication">Reference: {rec.referenceRange}</p>}
            </>
          )}
          <RecordMeta rec={rec} withDate={false} />
        </div>
      ))}
    </div>
  );
}

// Line chart per test (tests with 2+ numeric results), with the normal range
// drawn as dashed lines when the reference range could be parsed.
function LabTrends({ labs }) {
  const [selected, setSelected] = useState("");

  const groups = {};
  labs.forEach((l) => {
    const v = parseFloat(String(l.resultValue).replace(/,/g, ""));
    const when = new Date(recordDate(l));
    if (Number.isNaN(v) || Number.isNaN(when.getTime())) return;
    const name = l.testName.trim();
    (groups[name] = groups[name] || []).push({ ...l, v, when });
  });

  const names = Object.keys(groups).filter((n) => groups[n].length >= 2).sort();
  const active = names.includes(selected) ? selected : names[0];

  const heading = (
    <h3 className="card-heading">
      <TrendingUp size={17} color="var(--blue-600)" />
      Lab Trends
    </h3>
  );

  if (!active) {
    return (
      <div className="card">
        {heading}
        <div className="empty-state">Add two or more results for the same test to see a trend</div>
      </div>
    );
  }

  const pts = [...groups[active]].sort((a, b) => a.when - b.when);
  const latest = pts[pts.length - 1];
  const POINT_COLOR = { high: "#dc2626", low: "#d97706" };

  const datasets = [
    {
      label: `${active}${latest.unit ? ` (${latest.unit})` : ""}`,
      data: pts.map((p) => p.v),
      borderColor: "#2563eb",
      backgroundColor: "#2563eb",
      tension: 0.25,
      pointRadius: 5,
      pointBackgroundColor: pts.map((p) => POINT_COLOR[p.status] || "#2563eb")
    }
  ];
  const limitLine = (value, label) => ({
    label,
    data: pts.map(() => value),
    borderColor: "#94a3b8",
    borderDash: [6, 4],
    borderWidth: 1.5,
    pointRadius: 0
  });
  if (typeof latest.refHigh === "number") datasets.push(limitLine(latest.refHigh, "Upper limit"));
  if (typeof latest.refLow === "number") datasets.push(limitLine(latest.refLow, "Lower limit"));

  return (
    <div className="card">
      {heading}
      <select className="input" value={active} onChange={(e) => setSelected(e.target.value)}>
        {names.map((n) => (
          <option key={n} value={n}>
            {n} ({groups[n].length} results)
          </option>
        ))}
      </select>
      <div className="chart-wrap" style={{ marginTop: 16 }}>
        <Line
          data={{ labels: pts.map((p) => fmtDate(p.when)), datasets }}
          options={{
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.2,
            plugins: { legend: { display: datasets.length > 1, position: "bottom" } },
            scales: { y: { grid: { color: "#eef2f7" } }, x: { grid: { display: false } } }
          }}
        />
      </div>
    </div>
  );
}

// Hospital names already used by doctors, offered as suggestions in the forms
function HospitalOptions({ hospitals }) {
  return (
    <datalist id="hospital-options">
      {hospitals.map((h) => (
        <option key={h} value={h} />
      ))}
    </datalist>
  );
}

// Phone photos are huge; shrink them in the browser first (quicker upload, and well under the proxy's size limit).
async function downscaleImage(file) {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1024 * 1024) {
      if (bmp.close) bmp.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    if (bmp.close) bmp.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

// Upload a lab report -> the server reads it into draft rows -> the person reviews and edits
// them -> only the confirmed rows are saved. Nothing is saved without that confirmation.
function LabReportUpload({ aadhaar, onSaved }) {
  const [file, setFile] = useState(null);
  const [inputKey, setInputKey] = useState(0); // changing it clears the file input
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null); // { method, rows: [{ id, include, ... }] }
  const [hospital, setHospital] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(null);

  const pickFile = (e) => {
    setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
    setDraft(null);
    setError(null);
    setSavedCount(null);
  };

  const readReport = async () => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("That file is too large ❌");
      return;
    }
    setBusy(true);
    setError(null);
    setDraft(null);
    setSavedCount(null);

    try {
      const upload = await downscaleImage(file);
      const form = new FormData();
      form.append("report", upload, upload.name || file.name);

      const res = await authFetch(`${API}/labresults/extract`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Couldn't read that report ❌");
        return;
      }
      setDraft({
        method: data.method,
        rows: data.rows.map((r, i) => ({ ...r, id: i, include: r.verified }))
      });
      setDate(data.reportDate || "");
    } catch {
      setError("Network error ❌");
    } finally {
      setBusy(false);
    }
  };

  const updateRow = (id, patch) =>
    setDraft((d) => ({
      ...d,
      rows: d.rows.map((r) =>
        r.id !== id
          ? r
          : {
              ...r,
              ...patch,
              // the preview status was worked out from the old value/range; it's recalculated on save
              ...("resultValue" in patch || "referenceRange" in patch ? { status: null } : {})
            }
      )
    }));

  const included = draft ? draft.rows.filter((r) => r.include && r.testName.trim() && r.resultValue.trim()) : [];
  const unverified = draft ? draft.rows.filter((r) => !r.verified).length : 0;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(`${API}/labresults/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadhaar,
          hospital,
          date: date || undefined,
          rows: included.map(({ testName, resultValue, unit, referenceRange }) => ({ testName, resultValue, unit, referenceRange }))
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Couldn't save the results ❌");
        return;
      }
      setSavedCount(data.saved);
      setDraft(null);
      setFile(null);
      setInputKey((k) => k + 1);
      setHospital("");
      setDate("");
      if (onSaved) onSaved();
    } catch {
      setError("Network error ❌");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h3 className="card-heading">
        <Upload size={17} color="var(--blue-600)" />
        Upload Lab Report
      </h3>
      <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginTop: -6, marginBottom: 18 }}>
        Add a photo, screenshot or PDF of a lab report and the results are filled in for you — no typing each value.
        The report is read on our server and isn't stored. To pick out the results, its text (with name, ID and contact
        lines removed where we can detect them) is sent to an AI service. You check everything before anything is saved.
      </p>

      <input
        key={inputKey}
        className="input"
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        onChange={pickFile}
        aria-label="Lab report file"
      />

      <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={readReport} disabled={!file || busy}>
        {busy ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
        {busy ? "Reading your report… (photos can take up to a minute)" : "Read Report"}
      </button>

      {error && <div className="ai-error">{error}</div>}

      {savedCount !== null && (
        <div className="ai-summary-box">
          <p>Saved {savedCount} lab result{savedCount === 1 ? "" : "s"} ✅ — they're in the lab history below.</p>
        </div>
      )}

      {draft && (
        <>
          <div className="report-notes">
            <p>
              Check these against your report — <strong>{draft.rows.length}</strong> result{draft.rows.length === 1 ? "" : "s"} found.
              Reading can make mistakes, so fix anything that looks wrong or untick rows you don't want.
            </p>
            {draft.method === "pattern" && (
              <p className="report-warn">
                The AI service wasn't available, so this used basic pattern matching. Please check every row carefully.
              </p>
            )}
            {unverified > 0 && (
              <p className="report-warn">
                {unverified} row{unverified === 1 ? "" : "s"} marked <strong>Check</strong> couldn't be matched to the text of the
                report (or had a reference range that wasn't in it). They're unticked — correct them, then tick them if they're right.
              </p>
            )}
          </div>

          <div className="report-head">
            <span />
            <span>Test</span>
            <span>Value</span>
            <span>Unit</span>
            <span>Reference range</span>
            <span />
          </div>

          {draft.rows.map((r) => (
            <div className={`report-row ${r.include ? "" : "report-row-off"}`} key={r.id}>
              <input
                className="rr-check"
                type="checkbox"
                checked={r.include}
                onChange={(e) => updateRow(r.id, { include: e.target.checked })}
                aria-label={`Include ${r.testName}`}
              />
              <input className="input rr-name" placeholder="Test" value={r.testName} aria-label="Test name" onChange={(e) => updateRow(r.id, { testName: e.target.value })} />
              <input className="input rr-value" placeholder="Value" value={r.resultValue} aria-label="Value" onChange={(e) => updateRow(r.id, { resultValue: e.target.value })} />
              <input className="input rr-unit" placeholder="Unit" value={r.unit} aria-label="Unit" onChange={(e) => updateRow(r.id, { unit: e.target.value })} />
              <input className="input rr-range" placeholder="Range" value={r.referenceRange} aria-label="Reference range" onChange={(e) => updateRow(r.id, { referenceRange: e.target.value })} />
              <div className="rr-status">
                {r.status && <span className={`status-badge status-${r.status}`}>{r.status}</span>}
                {!r.verified && <span className="check-tag">Check</span>}
              </div>
            </div>
          ))}

          <div className="grid-2" style={{ marginTop: 16 }}>
            <div>
              <label className="field-label">Hospital / Lab (optional)</label>
              <input className="input" list="hospital-options" placeholder="e.g. Apollo Diagnostics" value={hospital} onChange={(e) => setHospital(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Report date</label>
              <input className="input" type="date" max={todayLocal()} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={save} disabled={included.length === 0 || saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
            {saving ? "Saving..." : `Save ${included.length} result${included.length === 1 ? "" : "s"}`}
          </button>
        </>
      )}
    </div>
  );
}

function App() {
  // view: "login" | "register" | "app" | "doctorLogin" | "doctorRegister" | "doctorApp"
  const [view, setView] = useState("login");
  currentRole = view === "doctorApp" ? "doctor" : "patient";

  // login fields
  const [aadhaar, setAadhaar] = useState("");
  const [password, setPassword] = useState("");

  // register fields (Step 1 — same intake as the mobile app)
  const [regName, setRegName] = useState("");
  const [regDob, setRegDob] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regAadhaar, setRegAadhaar] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // ===== Registration wizard: 1 = details, 2 = DigiLocker, 3 = result =====
  const [regStep, setRegStep] = useState(1);

  const [activeTab, setActiveTab] = useState("dashboard");

  const [diagnosis, setDiagnosis] = useState("");
  const [medication, setMedication] = useState("");
  const [treatments, setTreatments] = useState([]);
  const [profile, setProfile] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  // Lab results
  const [labResults, setLabResults] = useState([]);
  const [testName, setTestName] = useState("");
  const [testValue, setTestValue] = useState("");
  const [testUnit, setTestUnit] = useState("");
  const [testRange, setTestRange] = useState("");
  const [testStatus, setTestStatus] = useState("auto");

  // AI summary
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // FHIR sandbox import
  const [fhirLoading, setFhirLoading] = useState(false);
  const [fhirResult, setFhirResult] = useState(null);
  const [fhirError, setFhirError] = useState(null);

  // ===== Doctor auth =====
  const [docRegIdLogin, setDocRegIdLogin] = useState("");
  const [docPasswordLogin, setDocPasswordLogin] = useState("");
  const [doctor, setDoctor] = useState(null); // { doctorRegId, name, specialty }

  const [docName, setDocName] = useState("");
  const [docRegId, setDocRegId] = useState("");
  const [docSpecialty, setDocSpecialty] = useState("");
  const [docPhone, setDocPhone] = useState("");
  const [docEmail, setDocEmail] = useState("");
  const [docPassword, setDocPassword] = useState("");

  // ===== Doctor registration wizard: 1 = details, 2 = DigiLocker, 3 = result =====
  const [docRegStep, setDocRegStep] = useState(1);
  const [docAadhaarNumber, setDocAadhaarNumber] = useState("");

  // ===== Doctor dashboard: patient lookup =====
  const [searchAadhaar, setSearchAadhaar] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [foundPatient, setFoundPatient] = useState(null);
  const [foundTreatments, setFoundTreatments] = useState([]);
  const [foundLabs, setFoundLabs] = useState([]);

  const [docDiagnosis, setDocDiagnosis] = useState("");
  const [docMedication, setDocMedication] = useState("");

  const [docSummary, setDocSummary] = useState(null);
  const [docSummaryLoading, setDocSummaryLoading] = useState(false);
  const [docSummaryError, setDocSummaryError] = useState(null);

  // ===== Record attribution (hospital + date on treatments and labs) =====
  const [hospitals, setHospitals] = useState([]);
  const [tHospital, setTHospital] = useState("");
  const [tDate, setTDate] = useState("");
  const [testHospital, setTestHospital] = useState("");
  const [testDate, setTestDate] = useState("");

  // ===== Patient: who can see my records =====
  const [consents, setConsents] = useState([]);
  const [accessLog, setAccessLog] = useState([]);
  const [accessBusy, setAccessBusy] = useState(false);

  // ===== Doctor: access requests + recording for a patient =====
  const [doctorTab, setDoctorTab] = useState("search"); // "search" | "mine"
  const [consentNeeded, setConsentNeeded] = useState(null); // { aadhaar, status }
  const [myPatients, setMyPatients] = useState([]);
  const [docHospital, setDocHospital] = useState("");
  const [docDate, setDocDate] = useState("");
  const [docLabName, setDocLabName] = useState("");
  const [docLabValue, setDocLabValue] = useState("");
  const [docLabUnit, setDocLabUnit] = useState("");
  const [docLabRange, setDocLabRange] = useState("");
  const [docLabStatus, setDocLabStatus] = useState("auto");
  const [docLabHospital, setDocLabHospital] = useState("");
  const [docLabDate, setDocLabDate] = useState("");

  // AUTO LOGIN (doctor)
  useEffect(() => {
    const doctorToken = localStorage.getItem("doctorToken");
    const savedDoctor = JSON.parse(localStorage.getItem("doctor") || "null");

    if (doctorToken && savedDoctor) {
      setDoctor(savedDoctor);
      setView("doctorApp");
    }
  }, []);

  // AUTO LOGIN
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = JSON.parse(localStorage.getItem("user") || "null");

    if (token && savedUser) {
      setAadhaar(savedUser.aadhaar);
      setView("app");
    }
  }, []);

  // ===== DigiLocker verification =====
  const [digilockerLoading, setDigilockerLoading] = useState(false);
  const [digilockerBanner, setDigilockerBanner] = useState(null); // "success" | "failed" | "error" | null

  // Handle the redirect back from DigiLocker (?digilocker=success|failed|error in the URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("digilocker");

    if (result) {
      setDigilockerBanner(result);
      window.history.replaceState({}, "", window.location.pathname);

      // A full-page redirect to DigiLocker wipes React state, so if this
      // was part of a registration in progress, restore everything that
      // was saved right before redirecting.
      const pendingRaw = sessionStorage.getItem("pendingRegistration");
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);

          if (pending.flow === "patient") {
            setRegName(pending.fields.regName);
            setRegDob(pending.fields.regDob);
            setRegMobile(pending.fields.regMobile);
            setRegEmail(pending.fields.regEmail);
            setRegAddress(pending.fields.regAddress);
            setRegAadhaar(pending.fields.regAadhaar);
            setRegPassword(pending.fields.regPassword);
            setRegStep(pending.step);
            setView("register");
          } else if (pending.flow === "doctor") {
            setDocName(pending.fields.docName);
            setDocRegId(pending.fields.docRegId);
            setDocSpecialty(pending.fields.docSpecialty);
            setDocPhone(pending.fields.docPhone);
            setDocEmail(pending.fields.docEmail);
            setDocPassword(pending.fields.docPassword);
            setDocAadhaarNumber(pending.fields.docAadhaarNumber);
            setDocRegStep(pending.step);
            setView("doctorRegister");
          }
        } catch {
          // Malformed/missing saved state — nothing to restore, just show the banner.
        }
        sessionStorage.removeItem("pendingRegistration");
      }
    }
  }, []);

  // Shared helper: save in-progress registration state (since a full-page
  // redirect to DigiLocker wipes React state) and kick off the redirect.
  const saveAndRedirectToDigilocker = async (aadhaarNumber, role, pendingState) => {
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      alert("Enter a 12-digit Aadhaar number first ❌");
      return;
    }

    setDigilockerLoading(true);
    sessionStorage.setItem("pendingRegistration", JSON.stringify(pendingState));

    try {
      const res = await fetch(`${API}/digilocker/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar: aadhaarNumber, role })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Couldn't start DigiLocker verification ❌");
        setDigilockerLoading(false);
        sessionStorage.removeItem("pendingRegistration");
        return;
      }

      window.location.href = data.authorizationUrl;
    } catch {
      alert("Network error ❌");
      setDigilockerLoading(false);
      sessionStorage.removeItem("pendingRegistration");
    }
  };

  const startPatientRegistrationDigilocker = () => {
    saveAndRedirectToDigilocker(regAadhaar, "patient", {
      flow: "patient",
      step: 3,
      fields: { regName, regDob, regMobile, regEmail, regAddress, regAadhaar, regPassword }
    });
  };

  const startDoctorRegistrationDigilocker = () => {
    saveAndRedirectToDigilocker(docAadhaarNumber, "doctor", {
      flow: "doctor",
      step: 3,
      fields: { docName, docRegId, docSpecialty, docPhone, docEmail, docPassword, docAadhaarNumber }
    });
  };

  // LOAD TREATMENTS
  const loadTreatments = useCallback(() => {
    if (!aadhaar) return;

    authFetch(`${API}/treatments/${aadhaar}`)
      .then(res => res.json())
      .then(data => setTreatments(Array.isArray(data) ? data : []));
  }, [aadhaar]);

  // LOAD PATIENT PROFILE
  const loadProfile = useCallback(() => {
    if (!aadhaar) return;

    authFetch(`${API}/patients/${aadhaar}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => setProfile(data))
      .catch(() => setProfile(null));
  }, [aadhaar]);

  // LOAD LAB RESULTS
  const loadLabResults = useCallback(() => {
    if (!aadhaar) return;

    authFetch(`${API}/labresults/${aadhaar}`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => setLabResults(Array.isArray(data) ? data : []))
      .catch(() => setLabResults([]));
  }, [aadhaar]);

  const loadHospitals = useCallback(() => {
    authFetch(`${API}/hospitals`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setHospitals(Array.isArray(data) ? data : []))
      .catch(() => setHospitals([]));
  }, []);

  const loadConsents = useCallback(() => {
    authFetch(`${API}/consent/mine`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setConsents(Array.isArray(data) ? data : []))
      .catch(() => setConsents([]));
  }, []);

  const loadAccessLog = useCallback(() => {
    authFetch(`${API}/consent/audit`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAccessLog(Array.isArray(data) ? data : []))
      .catch(() => setAccessLog([]));
  }, []);

  const loadMyPatients = useCallback(() => {
    authFetch(`${API}/consent/doctor/patients`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMyPatients(Array.isArray(data) ? data : []))
      .catch(() => setMyPatients([]));
  }, []);

  useEffect(() => {
    if (view === "app") {
      loadTreatments();
      loadProfile();
      loadLabResults();
      loadHospitals();
      loadConsents(); // for the pending-requests badge
    }
  }, [view, loadTreatments, loadProfile, loadLabResults, loadHospitals, loadConsents]);

  useEffect(() => {
    if (view === "app" && activeTab === "access") {
      loadConsents();
      loadAccessLog();
    }
  }, [view, activeTab, loadConsents, loadAccessLog]);

  useEffect(() => {
    if (view === "doctorApp") {
      loadHospitals();
      loadMyPatients();
    }
  }, [view, loadHospitals, loadMyPatients]);

  // LOGIN
  const loginUser = async () => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token || "");
        localStorage.setItem("user", JSON.stringify({ aadhaar: data.aadhaar || aadhaar }));
        setView("app");
      } else {
        alert(data.message || "Login failed ❌");
      }
    } catch {
      alert("Server error ❌");
    }
  };

  // REGISTER (creates the account, then logs straight in — no separate login step)
  const registerAndLoginPatient = async () => {
    if (!regName.trim()) {
      alert("Please enter your name ❌");
      return;
    }
    if (regAadhaar.length !== 12) {
      alert("Aadhaar must be 12 digits ❌");
      return;
    }
    if (!regPassword) {
      alert("Please choose a password ❌");
      return;
    }
    if (regMobile && regMobile.length !== 10) {
      alert("Mobile number must be 10 digits ❌");
      return;
    }

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadhaar: regAadhaar,
          password: regPassword,
          name: regName,
          mobile: regMobile,
          email: regEmail,
          address: regAddress,
          dob: regDob
        })
      });

      const data = await res.json();

      if (!res.ok || data.message?.includes("❌")) {
        alert(data.message || "Registration failed ❌");
        return;
      }
    } catch {
      alert("Server error ❌");
      return;
    }

    // Auto-login right after registering, straight into the dashboard.
    try {
      const loginRes = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar: regAadhaar, password: regPassword })
      });

      const loginData = await loginRes.json();

      if (loginRes.ok) {
        localStorage.setItem("token", loginData.token || "");
        localStorage.setItem("user", JSON.stringify({ aadhaar: loginData.aadhaar || regAadhaar }));
        setAadhaar(regAadhaar);
        setView("app");
      } else {
        alert("Registered successfully ✅ — please log in.");
        setView("login");
      }
    } catch {
      alert("Registered successfully ✅ — please log in.");
      setView("login");
    }
  };

  // SAVE TREATMENT (self-reported)
  const saveTreatment = async () => {
    if (!diagnosis.trim() || !medication.trim()) {
      alert("Please fill both fields ❌");
      return;
    }

    const res = await authFetch(`${API}/treatments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aadhaar, diagnosis, medication, hospital: tHospital, date: tDate || undefined })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.message || "Couldn't save the treatment ❌");
      return;
    }

    setDiagnosis("");
    setMedication("");
    setTHospital("");
    setTDate("");
    loadTreatments();
    setActiveTab("patients");
  };

  // DELETE TREATMENT
  const deleteTreatment = async (id) => {
    const res = await authFetch(`${API}/treatments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.message || "Couldn't delete ❌");
    }
    loadTreatments();
  };

  // SAVE LAB RESULT — status "auto" lets the server work it out from the reference range
  const saveLabResult = async () => {
    if (!testName.trim() || !testValue.trim()) {
      alert("Please fill in at least the test name and value ❌");
      return;
    }

    const res = await authFetch(`${API}/labresults`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aadhaar,
        testName,
        resultValue: testValue,
        unit: testUnit,
        referenceRange: testRange,
        status: testStatus,
        hospital: testHospital,
        date: testDate || undefined
      })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.message || "Couldn't save the lab result ❌");
      return;
    }

    setTestName("");
    setTestValue("");
    setTestUnit("");
    setTestRange("");
    setTestStatus("auto");
    setTestHospital("");
    setTestDate("");
    loadLabResults();
  };

  const deleteLabResult = async (id) => {
    const res = await authFetch(`${API}/labresults/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.message || "Couldn't delete ❌");
    }
    loadLabResults();
  };

  // PATIENT: approve / deny / revoke a doctor's access
  const respondConsent = async (doctorRegId, decision) => {
    setAccessBusy(true);
    try {
      const res = await authFetch(`${API}/consent/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorRegId, decision })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Couldn't update access ❌");
      }
      loadConsents();
    } finally {
      setAccessBusy(false);
    }
  };

  // FHIR export — a fetch with the token, then saved as a file
  const downloadFhir = async (targetAadhaar) => {
    const res = await authFetch(`${API}/fhir/export/${targetAadhaar}`);
    if (!res.ok) {
      alert("Couldn't export the record ❌");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `healthmirror-fhir-${targetAadhaar.slice(-4)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // AI SUMMARY
  const summarizeHistory = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiSummary(null);

    try {
      const res = await authFetch(`${API}/ai/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar })
      });

      const data = await res.json();

      if (!res.ok) {
        setAiError(data.message || "Couldn't generate a summary right now ❌");
        return;
      }

      setAiSummary(data.summary);
    } catch {
      setAiError("Network error ❌");
    } finally {
      setAiLoading(false);
    }
  };

  // FHIR SANDBOX IMPORT
  const importFromFhir = async () => {
    setFhirLoading(true);
    setFhirError(null);
    setFhirResult(null);

    try {
      const res = await authFetch(`${API}/fhir/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar })
      });

      const data = await res.json();

      if (!res.ok) {
        setFhirError(data.message || "Import failed ❌");
        return;
      }

      setFhirResult(data);
      loadTreatments();
      loadLabResults();
    } catch {
      setFhirError("Network error ❌");
    } finally {
      setFhirLoading(false);
    }
  };

  // DOCTOR REGISTER
  const registerAndLoginDoctor = async () => {
    if (!docName.trim() || !docRegId.trim() || !docPassword) {
      alert("Name, Doctor Registration ID and password are required ❌");
      return;
    }

    try {
      const res = await fetch(`${API}/doctorauth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: docName,
          doctorRegId: docRegId,
          specialty: docSpecialty,
          phone: docPhone,
          email: docEmail,
          password: docPassword,
          aadhaarNumber: docAadhaarNumber
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Registration failed ❌");
        return;
      }
    } catch {
      alert("Server error ❌");
      return;
    }

    // Auto-login right after registering, straight into the doctor dashboard.
    try {
      const loginRes = await fetch(`${API}/doctorauth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorRegId: docRegId, password: docPassword })
      });

      const loginData = await loginRes.json();

      if (loginRes.ok) {
        const docInfo = { doctorRegId: loginData.doctorRegId, name: loginData.name, specialty: loginData.specialty };
        localStorage.setItem("doctorToken", loginData.token || "");
        localStorage.setItem("doctor", JSON.stringify(docInfo));
        setDoctor(docInfo);
        setView("doctorApp");
      } else {
        alert("Registered successfully ✅ — please log in.");
        setView("doctorLogin");
      }
    } catch {
      alert("Registered successfully ✅ — please log in.");
      setView("doctorLogin");
    }
  };

  // DOCTOR LOGIN
  const loginDoctor = async () => {
    try {
      const res = await fetch(`${API}/doctorauth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorRegId: docRegIdLogin, password: docPasswordLogin })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Login failed ❌");
        return;
      }

      const docInfo = { doctorRegId: data.doctorRegId, name: data.name, specialty: data.specialty };
      localStorage.setItem("doctorToken", data.token || "");
      localStorage.setItem("doctor", JSON.stringify(docInfo));
      setDoctor(docInfo);
      setView("doctorApp");
    } catch {
      alert("Server error ❌");
    }
  };

  const doctorLogout = () => {
    localStorage.removeItem("doctorToken");
    localStorage.removeItem("doctor");
    setDoctor(null);
    setFoundPatient(null);
    setFoundTreatments([]);
    setFoundLabs([]);
    setSearchAadhaar("");
    setDocSummary(null);
    setConsentNeeded(null);
    setMyPatients([]);
    setDoctorTab("search");
    setView("login");
  };

  // DOCTOR: LOOK UP A PATIENT BY AADHAAR (needs the patient's approval)
  const lookupPatient = async (override) => {
    // onClick passes an event, openPatient passes an Aadhaar string
    const target = (typeof override === "string" ? override : searchAadhaar).trim();
    if (!target) {
      alert("Enter a patient's Aadhaar number ❌");
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    setConsentNeeded(null);
    setFoundPatient(null);
    setFoundTreatments([]);
    setFoundLabs([]);
    setDocSummary(null);

    try {
      const profileRes = await authFetch(`${API}/patients/${target}`);

      if (profileRes.status === 403) {
        const body = await profileRes.json().catch(() => ({}));
        if (body.code === "CONSENT_REQUIRED") {
          setConsentNeeded({ aadhaar: target, status: body.consentStatus || "none" });
        } else {
          setLookupError(body.message || "Access denied ❌");
        }
        return;
      }
      if (!profileRes.ok) {
        setLookupError("No patient found with that Aadhaar ❌");
        return;
      }
      const profile = await profileRes.json();
      setFoundPatient(profile);

      const [treatRes, labRes] = await Promise.all([
        authFetch(`${API}/treatments/${target}`),
        authFetch(`${API}/labresults/${target}`)
      ]);
      setFoundTreatments(treatRes.ok ? await treatRes.json() : []);
      setFoundLabs(labRes.ok ? await labRes.json() : []);
    } catch {
      setLookupError("Network error ❌");
    } finally {
      setLookupLoading(false);
    }
  };

  // DOCTOR: ask the patient for access
  const requestAccess = async () => {
    if (!consentNeeded) return;
    setLookupError(null);

    const res = await authFetch(`${API}/consent/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientAadhaar: consentNeeded.aadhaar })
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setConsentNeeded(null);
      setLookupError(data.message || "Couldn't send the request ❌");
      return;
    }
    setConsentNeeded({ aadhaar: consentNeeded.aadhaar, status: data.status });
  };

  // DOCTOR: open one of the patients who've approved access
  const openPatient = (patientAadhaar) => {
    setSearchAadhaar(patientAadhaar);
    setDoctorTab("search");
    lookupPatient(patientAadhaar);
  };

  const refreshFoundPatientRecords = async () => {
    if (!foundPatient) return;
    const [treatRes, labRes] = await Promise.all([
      authFetch(`${API}/treatments/${foundPatient.aadhaar_id}`),
      authFetch(`${API}/labresults/${foundPatient.aadhaar_id}`)
    ]);
    setFoundTreatments(treatRes.ok ? await treatRes.json() : []);
    setFoundLabs(labRes.ok ? await labRes.json() : []);
  };

  // DOCTOR: ADD TREATMENT FOR THE FOUND PATIENT
  const doctorSaveTreatment = async () => {
    if (!docDiagnosis.trim() || !docMedication.trim()) {
      alert("Please fill both fields ❌");
      return;
    }

    const res = await authFetch(`${API}/treatments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aadhaar: foundPatient.aadhaar_id,
        diagnosis: docDiagnosis,
        medication: docMedication,
        hospital: docHospital,
        date: docDate || undefined
      })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.message || "Couldn't save the treatment ❌");
      return;
    }

    setDocDiagnosis("");
    setDocMedication("");
    setDocDate("");
    refreshFoundPatientRecords();
    loadHospitals();
  };

  // DOCTOR: ADD A LAB RESULT FOR THE FOUND PATIENT
  const doctorSaveLab = async () => {
    if (!docLabName.trim() || !docLabValue.trim()) {
      alert("Please fill in at least the test name and value ❌");
      return;
    }

    const res = await authFetch(`${API}/labresults`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aadhaar: foundPatient.aadhaar_id,
        testName: docLabName,
        resultValue: docLabValue,
        unit: docLabUnit,
        referenceRange: docLabRange,
        status: docLabStatus,
        hospital: docLabHospital,
        date: docLabDate || undefined
      })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.message || "Couldn't save the lab result ❌");
      return;
    }

    setDocLabName("");
    setDocLabValue("");
    setDocLabUnit("");
    setDocLabRange("");
    setDocLabStatus("auto");
    setDocLabDate("");
    refreshFoundPatientRecords();
    loadHospitals();
  };

  // DOCTOR: AI SUMMARY FOR THE FOUND PATIENT
  const doctorSummarize = async () => {
    if (!foundPatient) return;

    setDocSummaryLoading(true);
    setDocSummaryError(null);
    setDocSummary(null);

    try {
      const res = await authFetch(`${API}/ai/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar: foundPatient.aadhaar_id })
      });

      const data = await res.json();

      if (!res.ok) {
        setDocSummaryError(data.message || "Couldn't generate a summary ❌");
        return;
      }

      setDocSummary(data.summary);
    } catch {
      setDocSummaryError("Network error ❌");
    } finally {
      setDocSummaryLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    setAadhaar("");
    setPassword("");
    setProfile(null);
    setTreatments([]);
    setLabResults([]);
    setAiSummary(null);
    setConsents([]);
    setAccessLog([]);
    setActiveTab("dashboard");
    setView("login");
  };

  // FILTER
  const filtered = treatments.filter(t =>
    t.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.medication.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ANALYTICS DATA
  const count = {};
  treatments.forEach(t => {
    count[t.diagnosis] = (count[t.diagnosis] || 0) + 1;
  });

  const chartData = {
    labels: Object.keys(count),
    datasets: [
      {
        label: "Cases",
        data: Object.values(count),
        backgroundColor: "#2563eb",
        borderRadius: 6,
        barPercentage: 0.5,
        categoryPercentage: 0.5,
        maxBarThickness: 64
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: Object.keys(count).length <= 2 ? 3.2 : 2.2,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: "#eef2f7" }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  // ===== Derived: chronic conditions (diagnosis repeated 2+ times) =====
  const diagnosisCounts = {};
  treatments.forEach(t => {
    const key = t.diagnosis.trim().toLowerCase();
    diagnosisCounts[key] = (diagnosisCounts[key] || 0) + 1;
  });
  const chronicConditions = Object.entries(diagnosisCounts)
    .filter(([, c]) => c >= 2)
    .map(([name, c]) => ({ name, count: c }));

  // ===== Derived: risk score (record-complexity proxy, not a clinical diagnosis) =====
  const abnormalLabs = labResults.filter(l => l.status !== "normal").length;
  const riskScore = Math.min(treatments.length * 12 + abnormalLabs * 10, 100);
  const riskLabel = riskScore < 30 ? "Low" : riskScore < 70 ? "Moderate" : "High";
  const riskColor = riskScore < 30 ? "var(--green-600)" : riskScore < 70 ? "var(--amber-600)" : "var(--red-600)";

  // ===== Derived: lifetime summary =====
  const daysOnRecord = profile?.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / 86400000))
    : 0;

  const initial = (profile?.name || aadhaar || "?").trim().charAt(0).toUpperCase();

  // ================= LOGIN VIEW =================
  if (view === "login") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-icon-circle">
              <Building2 size={28} />
            </div>
            <h2 className="auth-title">HealthMirror</h2>
            <p className="auth-subtitle">Sign in to your account</p>
          </div>

          <label className="field-label">Aadhaar Number</label>
          <input
            className="input"
            placeholder="12-digit Aadhaar"
            value={aadhaar}
            onChange={e => setAadhaar(e.target.value)}
          />

          <label className="field-label">Password</label>
          <input
            className="input"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={loginUser}>
            Login
          </button>

          <button className="link-btn" onClick={() => setView("register")}>
            Don't have an account? Register
          </button>

          <button className="link-btn" style={{ marginTop: 4 }} onClick={() => setView("doctorLogin")}>
            Login as Doctor
          </button>
        </div>
      </div>
    );
  }

  // ================= REGISTER VIEW (3-step wizard) =================
  if (view === "register") {
    return (
      <div className="auth-page">
        <div className="auth-card wide">
          <div className="auth-brand">
            <div className="auth-icon-circle" style={{ background: "var(--teal-100)", color: "var(--teal-600)" }}>
              <UserPlus size={26} />
            </div>
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-subtitle">Step {regStep} of 3</p>
          </div>

          {/* STEP 1: ALL DETAILS */}
          {regStep === 1 && (
            <>
              <div className="form-section-label">Personal Details</div>
              <label className="field-label">Full Name</label>
              <input className="input" placeholder="Your name" value={regName} onChange={e => setRegName(e.target.value)} />

              <label className="field-label">Date of Birth</label>
              <input className="input" placeholder="DD/MM/YYYY" value={regDob} onChange={e => setRegDob(e.target.value)} />

              <label className="field-label">Mobile Number</label>
              <input className="input" placeholder="10-digit mobile" value={regMobile} onChange={e => setRegMobile(e.target.value)} maxLength={10} />

              <label className="field-label">Email</label>
              <input className="input" placeholder="you@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />

              <label className="field-label">Address</label>
              <input className="input" placeholder="Your address" value={regAddress} onChange={e => setRegAddress(e.target.value)} />

              <div className="form-section-label">Account</div>
              <label className="field-label">Aadhaar Number</label>
              <input className="input" placeholder="12-digit Aadhaar" value={regAadhaar} onChange={e => setRegAadhaar(e.target.value)} maxLength={12} />

              <label className="field-label">Password</label>
              <input className="input" type="password" placeholder="Choose a password" value={regPassword} onChange={e => setRegPassword(e.target.value)} />

              <button
                className="btn btn-primary"
                style={{ marginTop: 22 }}
                onClick={() => {
                  if (!regName.trim()) return alert("Please enter your name ❌");
                  if (regAadhaar.length !== 12) return alert("Aadhaar must be 12 digits ❌");
                  if (regMobile.length !== 10) return alert("Mobile number must be 10 digits ❌");
                  if (!regPassword) return alert("Please choose a password ❌");
                  setDigilockerBanner(null);
                  setRegStep(2);
                }}
              >
                Continue
              </button>

              <button className="link-btn" onClick={() => setView("login")}>
                Already have an account? Login
              </button>
            </>
          )}

          {/* STEP 2: DIGILOCKER VERIFICATION */}
          {regStep === 2 && (
            <>
              <div className="form-section-label">Verify with DigiLocker</div>
              <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginTop: -4, marginBottom: 16 }}>
                Confirm your Aadhaar through DigiLocker — you'll log in with your own Aadhaar-linked
                mobile OTP directly on DigiLocker's site, not ours. You'll be redirected away and
                brought back here automatically once you're done.
              </p>

              <button className="btn btn-primary" onClick={startPatientRegistrationDigilocker} disabled={digilockerLoading}>
                {digilockerLoading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
                {digilockerLoading ? "Redirecting..." : "Verify with DigiLocker"}
              </button>

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button className="btn" style={{ background: "var(--border)", color: "var(--ink-700)" }} onClick={() => setRegStep(1)}>
                  Back
                </button>
              </div>

              <button
                className="link-btn"
                onClick={() => {
                  setDigilockerBanner(null);
                  setRegStep(3);
                }}
              >
                Skip for now (pending platform approval)
              </button>
            </>
          )}

          {/* STEP 3: RESULT */}
          {regStep === 3 && (
            <>
              <div className="form-section-label">Verification Result</div>

              {digilockerBanner === "success" && (
                <div className="ai-summary-box">
                  <p>Aadhaar verified successfully via DigiLocker ✅</p>
                </div>
              )}
              {digilockerBanner === "failed" && (
                <div className="ai-error">DigiLocker verification wasn't completed ❌</div>
              )}
              {digilockerBanner === "error" && (
                <div className="ai-error">Something went wrong during DigiLocker verification ❌</div>
              )}
              {!digilockerBanner && (
                <div className="ai-error">Aadhaar not verified yet — you can still continue for now</div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button className="btn" style={{ background: "var(--border)", color: "var(--ink-700)" }} onClick={() => setRegStep(2)}>
                  Try Again
                </button>
                <button className="btn btn-primary" onClick={registerAndLoginPatient}>
                  Continue to Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ================= DOCTOR LOGIN VIEW =================
  if (view === "doctorLogin") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-icon-circle" style={{ background: "var(--teal-100)", color: "var(--teal-600)" }}>
              <Stethoscope size={26} />
            </div>
            <h2 className="auth-title">Doctor Login</h2>
            <p className="auth-subtitle">Access your patient dashboard</p>
          </div>

          <label className="field-label">Doctor Registration ID</label>
          <input
            className="input"
            placeholder="e.g. DOC12345"
            value={docRegIdLogin}
            onChange={e => setDocRegIdLogin(e.target.value)}
          />

          <label className="field-label">Password</label>
          <input
            className="input"
            type="password"
            placeholder="Enter your password"
            value={docPasswordLogin}
            onChange={e => setDocPasswordLogin(e.target.value)}
          />

          <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={loginDoctor}>
            Login
          </button>

          <button className="link-btn" onClick={() => setView("doctorRegister")}>
            New doctor? Register
          </button>

          <button className="link-btn" style={{ marginTop: 4 }} onClick={() => setView("login")}>
            Continue as Patient
          </button>
        </div>
      </div>
    );
  }

  // ================= DOCTOR REGISTER VIEW (3-step wizard) =================
  if (view === "doctorRegister") {
    return (
      <div className="auth-page">
        <div className="auth-card wide">
          <div className="auth-brand">
            <div className="auth-icon-circle" style={{ background: "var(--teal-100)", color: "var(--teal-600)" }}>
              <Stethoscope size={26} />
            </div>
            <h2 className="auth-title">Doctor Registration</h2>
            <p className="auth-subtitle">Step {docRegStep} of 3</p>
          </div>

          {/* STEP 1: ALL DETAILS */}
          {docRegStep === 1 && (
            <>
              <label className="field-label">Full Name</label>
              <input className="input" placeholder="Dr. Your Name" value={docName} onChange={e => setDocName(e.target.value)} />

              <label className="field-label">Doctor Registration ID</label>
              <input className="input" placeholder="e.g. DOC12345" value={docRegId} onChange={e => setDocRegId(e.target.value)} />

              <label className="field-label">Specialty</label>
              <input className="input" placeholder="e.g. Cardiologist" value={docSpecialty} onChange={e => setDocSpecialty(e.target.value)} />

              <label className="field-label">Phone</label>
              <input className="input" placeholder="Phone number" value={docPhone} onChange={e => setDocPhone(e.target.value)} />

              <label className="field-label">Email</label>
              <input className="input" placeholder="you@hospital.com" value={docEmail} onChange={e => setDocEmail(e.target.value)} />

              <label className="field-label">Aadhaar Number</label>
              <input className="input" placeholder="12-digit Aadhaar" value={docAadhaarNumber} onChange={e => setDocAadhaarNumber(e.target.value)} maxLength={12} />

              <label className="field-label">Password</label>
              <input className="input" type="password" placeholder="Choose a password" value={docPassword} onChange={e => setDocPassword(e.target.value)} />

              <button
                className="btn btn-primary"
                style={{ marginTop: 22 }}
                onClick={() => {
                  if (!docName.trim() || !docRegId.trim() || !docPassword) {
                    return alert("Name, Doctor Registration ID and password are required ❌");
                  }
                  if (docAadhaarNumber.length !== 12) return alert("Aadhaar must be 12 digits ❌");
                  setDigilockerBanner(null);
                  setDocRegStep(2);
                }}
              >
                Continue
              </button>

              <button className="link-btn" onClick={() => setView("doctorLogin")}>
                Already registered? Login
              </button>
            </>
          )}

          {/* STEP 2: DIGILOCKER VERIFICATION */}
          {docRegStep === 2 && (
            <>
              <div className="form-section-label">Verify with DigiLocker</div>
              <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginTop: -4, marginBottom: 16 }}>
                Confirm your Aadhaar through DigiLocker — you'll log in with your own Aadhaar-linked
                mobile OTP directly on DigiLocker's site, not ours. You'll be redirected away and
                brought back here automatically once you're done.
              </p>

              <button className="btn btn-primary" onClick={startDoctorRegistrationDigilocker} disabled={digilockerLoading}>
                {digilockerLoading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
                {digilockerLoading ? "Redirecting..." : "Verify with DigiLocker"}
              </button>

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button className="btn" style={{ background: "var(--border)", color: "var(--ink-700)" }} onClick={() => setDocRegStep(1)}>
                  Back
                </button>
              </div>

              <button
                className="link-btn"
                onClick={() => {
                  setDigilockerBanner(null);
                  setDocRegStep(3);
                }}
              >
                Skip for now (pending platform approval)
              </button>
            </>
          )}

          {/* STEP 3: RESULT */}
          {docRegStep === 3 && (
            <>
              <div className="form-section-label">Verification Result</div>

              {digilockerBanner === "success" && (
                <div className="ai-summary-box">
                  <p>Aadhaar verified successfully via DigiLocker ✅</p>
                </div>
              )}
              {digilockerBanner === "failed" && (
                <div className="ai-error">DigiLocker verification wasn't completed ❌</div>
              )}
              {digilockerBanner === "error" && (
                <div className="ai-error">Something went wrong during DigiLocker verification ❌</div>
              )}
              {!digilockerBanner && (
                <div className="ai-error">Aadhaar not verified yet — you can still continue for now</div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button className="btn" style={{ background: "var(--border)", color: "var(--ink-700)" }} onClick={() => setDocRegStep(2)}>
                  Try Again
                </button>
                <button className="btn btn-primary" onClick={registerAndLoginDoctor}>
                  Continue to Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ================= DOCTOR DASHBOARD =================
  if (view === "doctorApp") {
    return (
      <div className="app-shell">
        <div className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Stethoscope size={18} />
            </div>
            HealthMirror
          </div>

          <div className={`nav-item ${doctorTab === "search" ? "active" : ""}`} onClick={() => setDoctorTab("search")}>
            <Search size={17} />
            Search Patient
          </div>
          <div className={`nav-item ${doctorTab === "mine" ? "active" : ""}`} onClick={() => { setDoctorTab("mine"); loadMyPatients(); }}>
            <UserCheck size={17} />
            My Patients
          </div>

          <div className="sidebar-spacer" />

          <div style={{ color: "#94a3b8", fontSize: 12.5, padding: "0 14px 10px" }}>
            {doctor?.name} {doctor?.specialty ? `· ${doctor.specialty}` : ""}
          </div>

          <button className="logout-btn" onClick={doctorLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>

        <div className="main">
          <HospitalOptions hospitals={hospitals} />

          {/* MY PATIENTS */}
          {doctorTab === "mine" && (
            <div className="card">
              <h3 className="card-heading">
                <UserCheck size={17} color="var(--blue-600)" />
                My Patients
              </h3>
              <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginTop: -6, marginBottom: 18 }}>
                Patients who have approved your access.
              </p>

              {myPatients.length === 0 ? (
                <div className="empty-state">No approved patients yet — search for a patient and request access</div>
              ) : (
                myPatients.map((p) => (
                  <div className="consent-row" key={p.patientAadhaar}>
                    <div className="consent-info">
                      <p className="treatment-diagnosis">{p.patientName || "Patient"}</p>
                      <p className="treatment-medication">
                        Aadhaar ••••{p.patientAadhaar.slice(-4)} · access since {fmtDate(p.since)}
                      </p>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => openPatient(p.patientAadhaar)}>
                      Open
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SEARCH + PATIENT RECORD */}
          {doctorTab === "search" && (
            <>
              <div className="card">
                <h3 className="card-heading">
                  <Search size={17} color="var(--blue-600)" />
                  Search Patient by Aadhaar
                </h3>

                <div className="search-wrap">
                  <Search size={16} />
                  <input
                    className="input"
                    placeholder="Enter 12-digit Aadhaar"
                    value={searchAadhaar}
                    onChange={e => setSearchAadhaar(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && lookupPatient()}
                  />
                </div>

                <button className="btn btn-primary" onClick={lookupPatient} disabled={lookupLoading}>
                  {lookupLoading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                  {lookupLoading ? "Searching..." : "Search"}
                </button>

                {lookupError && <div className="ai-error">{lookupError}</div>}
              </div>

              {consentNeeded && (
                <div className="card">
                  <h3 className="card-heading">
                    <Lock size={17} color="var(--blue-600)" />
                    Patient approval needed
                  </h3>

                  {consentNeeded.status === "pending" ? (
                    <p style={{ color: "var(--ink-500)", fontSize: 13.5, margin: 0 }}>
                      Your request is waiting for the patient. Once they approve it in their Access &amp; Privacy
                      tab, search again to open the record.
                    </p>
                  ) : (
                    <>
                      <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginTop: 0, marginBottom: 16 }}>
                        {consentNeeded.status === "denied"
                          ? "This patient denied your earlier request. "
                          : consentNeeded.status === "revoked"
                          ? "This patient has withdrawn your access. "
                          : "You don't have access to this patient's record yet. "}
                        Send a request — they'll see it in their Access &amp; Privacy tab and can approve or deny it.
                      </p>
                      <button className="btn btn-primary" onClick={requestAccess}>
                        <Lock size={16} />
                        Request access
                      </button>
                    </>
                  )}
                </div>
              )}

              {foundPatient && (
                <>
                  <div className="card">
                    <div className="hero-top">
                      <div className="avatar-circle" style={{ background: "var(--teal-600)" }}>
                        {(foundPatient.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="detail-label" style={{ margin: 0 }}>Patient</p>
                        <h2 style={{ margin: "2px 0 0", fontSize: 20 }}>{foundPatient.name}</h2>
                      </div>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ marginLeft: "auto" }}
                        onClick={() => downloadFhir(foundPatient.aadhaar_id)}
                      >
                        <Download size={14} />
                        Export FHIR
                      </button>
                    </div>

                    <div style={{ marginTop: 18 }}>
                      {foundPatient.dob && (
                        <div className="detail-row">
                          <Calendar size={16} className="detail-icon" />
                          <div>
                            <p className="detail-label">Date of Birth</p>
                            <p className="detail-value">{foundPatient.dob}</p>
                          </div>
                        </div>
                      )}
                      {foundPatient.mobile && (
                        <div className="detail-row">
                          <Phone size={16} className="detail-icon" />
                          <div>
                            <p className="detail-label">Mobile</p>
                            <p className="detail-value">{foundPatient.mobile}</p>
                          </div>
                        </div>
                      )}
                      {foundPatient.email && (
                        <div className="detail-row">
                          <Mail size={16} className="detail-icon" />
                          <div>
                            <p className="detail-label">Email</p>
                            <p className="detail-value">{foundPatient.email}</p>
                          </div>
                        </div>
                      )}
                      {foundPatient.address && (
                        <div className="detail-row">
                          <MapPin size={16} className="detail-icon" />
                          <div>
                            <p className="detail-label">Address</p>
                            <p className="detail-value">{foundPatient.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="card-heading">
                      <History size={17} color="var(--blue-600)" />
                      Visit Timeline
                    </h3>
                    <Timeline treatments={foundTreatments} labs={foundLabs} />
                  </div>

                  <LabTrends labs={foundLabs} />

                  <div className="card">
                    <h3 className="card-heading">
                      <FlaskConical size={17} color="var(--blue-600)" />
                      Add Treatment for This Patient
                    </h3>

                    <label className="field-label">Diagnosis</label>
                    <input className="input" placeholder="e.g. Fever" value={docDiagnosis} onChange={e => setDocDiagnosis(e.target.value)} />

                    <label className="field-label">Medication</label>
                    <input className="input" placeholder="e.g. Crocin" value={docMedication} onChange={e => setDocMedication(e.target.value)} />

                    <div className="grid-2">
                      <div>
                        <label className="field-label">Hospital / Clinic</label>
                        <input className="input" list="hospital-options" placeholder="e.g. Apollo Hospital" value={docHospital} onChange={e => setDocHospital(e.target.value)} />
                      </div>
                      <div>
                        <label className="field-label">Date</label>
                        <input className="input" type="date" max={todayLocal()} value={docDate} onChange={e => setDocDate(e.target.value)} />
                      </div>
                    </div>

                    <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={doctorSaveTreatment}>
                      <PlusCircle size={16} />
                      Save Treatment
                    </button>
                  </div>

                  <LabReportUpload
                    aadhaar={foundPatient.aadhaar_id}
                    onSaved={() => {
                      refreshFoundPatientRecords();
                      loadHospitals();
                    }}
                  />

                  <div className="card">
                    <h3 className="card-heading">
                      <TestTube2 size={17} color="var(--blue-600)" />
                      Add Lab Result for This Patient
                    </h3>

                    <label className="field-label">Test Name</label>
                    <input className="input" placeholder="e.g. Total Cholesterol" value={docLabName} onChange={e => setDocLabName(e.target.value)} />

                    <div className="grid-3">
                      <div>
                        <label className="field-label">Value</label>
                        <input className="input" placeholder="e.g. 225" value={docLabValue} onChange={e => setDocLabValue(e.target.value)} />
                      </div>
                      <div>
                        <label className="field-label">Unit</label>
                        <input className="input" placeholder="mg/dL" value={docLabUnit} onChange={e => setDocLabUnit(e.target.value)} />
                      </div>
                      <div>
                        <label className="field-label">Reference Range</label>
                        <input className="input" placeholder="< 200" value={docLabRange} onChange={e => setDocLabRange(e.target.value)} />
                      </div>
                    </div>

                    <label className="field-label">Status</label>
                    <select className="input" value={docLabStatus} onChange={e => setDocLabStatus(e.target.value)}>
                      <option value="auto">Auto — work it out from the reference range</option>
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>

                    <div className="grid-2">
                      <div>
                        <label className="field-label">Hospital / Lab</label>
                        <input className="input" list="hospital-options" placeholder="e.g. Apollo Diagnostics" value={docLabHospital} onChange={e => setDocLabHospital(e.target.value)} />
                      </div>
                      <div>
                        <label className="field-label">Test Date</label>
                        <input className="input" type="date" max={todayLocal()} value={docLabDate} onChange={e => setDocLabDate(e.target.value)} />
                      </div>
                    </div>

                    <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={doctorSaveLab}>
                      <PlusCircle size={16} />
                      Save Lab Result
                    </button>
                  </div>

                  <div className="card">
                    <h3 className="card-heading">
                      <Sparkles size={17} color="var(--blue-600)" />
                      AI Summary for This Patient
                    </h3>

                    <button className="btn btn-primary" onClick={doctorSummarize} disabled={docSummaryLoading}>
                      {docSummaryLoading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                      {docSummaryLoading ? "Summarizing..." : "Summarize Patient History"}
                    </button>

                    {docSummaryError && <div className="ai-error">{docSummaryError}</div>}

                    {docSummary && (
                      <div className="ai-summary-box">
                        {docSummary.split("\n").filter(Boolean).map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ================= MAIN APP =================
  const pendingCount = consents.filter((c) => c.status === "pending").length;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "timeline", label: "Timeline", icon: History },
    { id: "patients", label: "Patients", icon: Users },
    { id: "labs", label: "Lab Reports", icon: TestTube2 },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "add", label: "Add Treatment", icon: PlusCircle },
    { id: "ai", label: "AI Summary", icon: Sparkles },
    { id: "fhir", label: "FHIR Import", icon: CloudDownload },
    { id: "access", label: "Access & Privacy", icon: Lock }
  ];

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Building2 size={18} />
          </div>
          HealthMirror
        </div>

        {navItems.map(item => (
          <div
            key={item.id}
            className={`nav-item ${activeTab === item.id ? "active" : ""}`}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon size={17} />
            {item.label}
            {item.id === "access" && pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
          </div>
        ))}

        <div className="sidebar-spacer" />

        <button className="logout-btn" onClick={logout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {/* MAIN */}
      <div className="main">
        <HospitalOptions hospitals={hospitals} />

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <>
            <div className="card hero-card">
              <div className="hero-top">
                <div className="avatar-circle">{initial}</div>
                <div>
                  <p className="hero-welcome">Welcome back</p>
                  <h2 className="hero-name">{profile?.name || aadhaar}</h2>
                </div>
              </div>
            </div>

            <div className="stat-grid">
              <div className="stat-card">
                <p className="stat-label">Total Visits</p>
                <p className="stat-value">{treatments.length}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Days on Record</p>
                <p className="stat-value">{daysOnRecord}</p>
              </div>
            </div>

            <div className="card">
              <h3 className="card-heading">
                <ClipboardList size={17} color="var(--blue-600)" />
                Health Record Score
              </h3>
              <div className="risk-bar-track">
                <div className="risk-bar-fill" style={{ width: `${riskScore}%`, background: riskColor }} />
              </div>
              <p className="risk-bar-caption">
                <strong style={{ color: riskColor }}>{riskScore}/100 · {riskLabel}</strong> — based on how many
                records exist and how many lab values are outside their normal range, not a medical diagnosis.
              </p>
            </div>

            {chronicConditions.length > 0 && (
              <div className="card">
                <h3 className="card-heading">
                  <Stethoscope size={17} color="var(--blue-600)" />
                  Recurring Conditions
                </h3>
                <div className="tag-row">
                  {chronicConditions.map(c => (
                    <span className="condition-tag" key={c.name}>
                      {c.name} × {c.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile && (profile.mobile || profile.email || profile.address || profile.dob) && (
              <div className="card">
                <h3 className="card-heading">
                  <ClipboardList size={17} color="var(--blue-600)" />
                  Personal Details
                </h3>

                {profile.dob && (
                  <div className="detail-row">
                    <Calendar size={16} className="detail-icon" />
                    <div>
                      <p className="detail-label">Date of Birth</p>
                      <p className="detail-value">{profile.dob}</p>
                    </div>
                  </div>
                )}
                {profile.mobile && (
                  <div className="detail-row">
                    <Phone size={16} className="detail-icon" />
                    <div>
                      <p className="detail-label">Mobile</p>
                      <p className="detail-value">{profile.mobile}</p>
                    </div>
                  </div>
                )}
                {profile.email && (
                  <div className="detail-row">
                    <Mail size={16} className="detail-icon" />
                    <div>
                      <p className="detail-label">Email</p>
                      <p className="detail-value">{profile.email}</p>
                    </div>
                  </div>
                )}
                {profile.address && (
                  <div className="detail-row">
                    <MapPin size={16} className="detail-icon" />
                    <div>
                      <p className="detail-label">Address</p>
                      <p className="detail-value">{profile.address}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* PATIENTS */}
        {activeTab === "patients" && (
          <div className="card">
            <h3 className="card-heading">
              <FileText size={17} color="var(--blue-600)" />
              Patient History
            </h3>

            <div className="search-wrap">
              <Search size={16} />
              <input
                className="input"
                placeholder="Search diagnosis or medication..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">No results found</div>
            ) : (
              filtered.map(t => (
                <div className="treatment-item" key={t._id}>
                  <div className="treatment-icon">
                    <Stethoscope size={17} />
                  </div>
                  <div className="treatment-body">
                    <p className="treatment-diagnosis">{t.diagnosis}</p>
                    <p className="treatment-medication">{t.medication}</p>
                    <RecordMeta rec={t} />
                  </div>
                  {t.source !== "doctor" && (
                    <button className="btn-danger-outline btn" onClick={() => deleteTreatment(t._id)}>
                      <Trash2 size={13} />
                      Delete
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* LAB REPORTS */}
        {activeTab === "labs" && (
          <>
            <LabReportUpload aadhaar={aadhaar} onSaved={loadLabResults} />

            <div className="card">
              <h3 className="card-heading">
                <TestTube2 size={17} color="var(--blue-600)" />
                Add Lab Result
              </h3>

              <label className="field-label">Test Name</label>
              <input className="input" placeholder="e.g. Total Cholesterol" value={testName} onChange={e => setTestName(e.target.value)} />

              <div className="grid-3">
                <div>
                  <label className="field-label">Value</label>
                  <input className="input" placeholder="e.g. 225" value={testValue} onChange={e => setTestValue(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Unit</label>
                  <input className="input" placeholder="mg/dL" value={testUnit} onChange={e => setTestUnit(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Reference Range</label>
                  <input className="input" placeholder="< 200" value={testRange} onChange={e => setTestRange(e.target.value)} />
                </div>
              </div>

              <label className="field-label">Status</label>
              <select className="input" value={testStatus} onChange={e => setTestStatus(e.target.value)}>
                <option value="auto">Auto — work it out from the reference range</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>

              <div className="grid-2">
                <div>
                  <label className="field-label">Hospital / Lab (optional)</label>
                  <input className="input" list="hospital-options" placeholder="e.g. Apollo Diagnostics" value={testHospital} onChange={e => setTestHospital(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Test Date</label>
                  <input className="input" type="date" max={todayLocal()} value={testDate} onChange={e => setTestDate(e.target.value)} />
                </div>
              </div>

              <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={saveLabResult}>
                <PlusCircle size={16} />
                Save Lab Result
              </button>
            </div>

            <div className="card">
              <h3 className="card-heading">
                <FileText size={17} color="var(--blue-600)" />
                Lab History
              </h3>

              {labResults.length === 0 ? (
                <div className="empty-state">No lab results recorded yet</div>
              ) : (
                labResults.map(l => (
                  <div className="lab-item" key={l._id}>
                    <div className="lab-item-main">
                      <p className="treatment-diagnosis">{l.testName}</p>
                      <p className="treatment-medication">
                        {l.resultValue} {l.unit} {l.referenceRange ? `· Ref: ${l.referenceRange}` : ""}
                      </p>
                      <RecordMeta rec={l} />
                    </div>
                    <span className={`status-badge status-${l.status}`}>{l.status}</span>
                    {l.source !== "doctor" && (
                      <button className="btn-danger-outline btn" onClick={() => deleteLabResult(l._id)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <LabTrends labs={labResults} />
          </>
        )}

        {/* ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="card">
            <h3 className="card-heading">
              <BarChart3 size={17} color="var(--blue-600)" />
              Analytics
            </h3>
            {treatments.length === 0 ? (
              <div className="empty-state">Add a treatment to see analytics here</div>
            ) : (
              <div className="chart-wrap">
                <Bar data={chartData} options={chartOptions} />
              </div>
            )}
          </div>
        )}

        {/* ADD */}
        {activeTab === "add" && (
          <div className="card">
            <h3 className="card-heading">
              <FlaskConical size={17} color="var(--blue-600)" />
              Add Treatment
            </h3>

            <label className="field-label">Diagnosis</label>
            <input
              className="input"
              placeholder="e.g. Fever"
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
            />

            <label className="field-label">Medication</label>
            <input
              className="input"
              placeholder="e.g. Crocin"
              value={medication}
              onChange={e => setMedication(e.target.value)}
            />

            <div className="grid-2">
              <div>
                <label className="field-label">Hospital / Clinic (optional)</label>
                <input className="input" list="hospital-options" placeholder="e.g. Apollo Hospital" value={tHospital} onChange={e => setTHospital(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Date</label>
                <input className="input" type="date" max={todayLocal()} value={tDate} onChange={e => setTDate(e.target.value)} />
              </div>
            </div>

            <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={saveTreatment}>
              <PlusCircle size={16} />
              Save Treatment
            </button>
          </div>
        )}

        {/* AI SUMMARY */}
        {activeTab === "ai" && (
          <div className="card">
            <h3 className="card-heading">
              <Sparkles size={17} color="var(--blue-600)" />
              AI Health Summary
            </h3>
            <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginTop: -6, marginBottom: 18 }}>
              Organizes your existing records into plain language. It doesn't diagnose or recommend treatment.
            </p>

            <button className="btn btn-primary" onClick={summarizeHistory} disabled={aiLoading}>
              {aiLoading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              {aiLoading ? "Summarizing..." : "Summarize My History"}
            </button>

            {aiError && (
              <div className="ai-error">{aiError}</div>
            )}

            {aiSummary && (
              <div className="ai-summary-box">
                {aiSummary.split("\n").filter(Boolean).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
          </div>
        )}
        {/* TIMELINE */}
        {activeTab === "timeline" && (
          <div className="card">
            <h3 className="card-heading">
              <History size={17} color="var(--blue-600)" />
              Visit Timeline
            </h3>
            <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginTop: -6, marginBottom: 18 }}>
              Every treatment and lab result in date order, with who recorded it and where.
            </p>
            <Timeline treatments={treatments} labs={labResults} />
          </div>
        )}

        {/* FHIR IMPORT */}
        {activeTab === "fhir" && (
          <div className="card">
            <h3 className="card-heading">
              <CloudDownload size={17} color="var(--blue-600)" />
              Import from FHIR Sandbox
            </h3>
            <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginTop: -6, marginBottom: 18 }}>
              Pulls real conditions and lab observations from the public HAPI FHIR test
              server (<code>hapi.fhir.org</code>) — synthetic patient data, not real
              hospital records — and adds a few to your own treatment and lab history.
            </p>

            <button className="btn btn-primary" onClick={importFromFhir} disabled={fhirLoading}>
              {fhirLoading ? <Loader2 size={16} className="spin" /> : <CloudDownload size={16} />}
              {fhirLoading ? "Importing..." : "Import Sample Data"}
            </button>

            {fhirError && <div className="ai-error">{fhirError}</div>}

            {fhirResult && (
              <div className="ai-summary-box">
                <p>
                  Imported {fhirResult.treatmentsImported} treatment record(s) and{" "}
                  {fhirResult.labResultsImported} lab result(s) from synthetic FHIR
                  patient <strong>{fhirResult.sourcePatientId}</strong>.
                </p>
                <p>Check the Patients and Lab Reports tabs to see what came in.</p>
              </div>
            )}
          </div>
        )}

        {/* ACCESS & PRIVACY */}
        {activeTab === "access" && (
          <>
            <div className="card">
              <h3 className="card-heading">
                <Lock size={17} color="var(--blue-600)" />
                Doctor Access
              </h3>
              <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginTop: -6, marginBottom: 18 }}>
                A doctor can only see your records after you approve them, and you can take that
                access back at any time.
              </p>

              {consents.length === 0 ? (
                <div className="empty-state">No doctor has asked for access yet</div>
              ) : (
                consents.map((c) => (
                  <div className="consent-row" key={c.doctorRegId}>
                    <div className="consent-info">
                      <p className="treatment-diagnosis">{drName(c.doctorName) || c.doctorRegId}</p>
                      <p className="treatment-medication">
                        ID {c.doctorRegId} · requested {fmtDate(c.requestedAt)}
                      </p>
                    </div>

                    {c.status === "pending" ? (
                      <div className="consent-actions">
                        <button className="btn btn-primary btn-sm" disabled={accessBusy} onClick={() => respondConsent(c.doctorRegId, "approve")}>
                          <Check size={14} />
                          Approve
                        </button>
                        <button className="btn btn-outline btn-sm" disabled={accessBusy} onClick={() => respondConsent(c.doctorRegId, "deny")}>
                          <X size={14} />
                          Deny
                        </button>
                      </div>
                    ) : c.status === "approved" ? (
                      <div className="consent-actions">
                        <span className="status-badge status-approved">Approved</span>
                        <button className="btn-danger-outline btn" disabled={accessBusy} onClick={() => respondConsent(c.doctorRegId, "revoke")}>
                          Revoke
                        </button>
                      </div>
                    ) : (
                      <span className={`status-badge status-${c.status}`}>{c.status}</span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <h3 className="card-heading">
                <ClipboardList size={17} color="var(--blue-600)" />
                Access Log
              </h3>
              <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginTop: -6, marginBottom: 18 }}>
                Every time a doctor opens or changes your record, it's listed here.
              </p>

              {accessLog.length === 0 ? (
                <div className="empty-state">No doctor has accessed your records yet</div>
              ) : (
                accessLog.map((e, i) => (
                  <div className="log-row" key={i}>
                    <span className="log-when">{fmtDateTime(e.at)}</span>
                    <span>
                      <strong>{drName(e.doctorName) || e.doctorRegId}</strong> {ACCESS_ACTIONS[e.action] || e.action}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <h3 className="card-heading">
                <Download size={17} color="var(--blue-600)" />
                Your Data
              </h3>
              <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginTop: -6, marginBottom: 18 }}>
                Download your treatments and lab results as a standard FHIR R4 bundle — the format
                hospital systems use to exchange records. Your Aadhaar number is not included.
              </p>
              <button className="btn btn-primary" onClick={() => downloadFhir(aadhaar)}>
                <Download size={16} />
                Download My Data (FHIR)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
