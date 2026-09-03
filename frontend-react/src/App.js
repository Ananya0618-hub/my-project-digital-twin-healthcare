import { useState, useEffect, useCallback } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement
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
  CloudDownload
} from "lucide-react";
import "./App.css";

ChartJS.register(CategoryScale, LinearScale, BarElement);

// Relative path — works both in local dev (CRA proxy) and in production,
// where Nginx serves this app and proxies /api to the backend on the
// same domain. No hardcoded host, no CORS headaches.
const API = "/api";

function App() {
  // view: "login" | "register" | "app" | "doctorLogin" | "doctorRegister" | "doctorApp"
  const [view, setView] = useState("login");

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

  // ===== Registration wizard: 1 = details, 2 = Aadhaar document, 3 = mobile OTP =====
  const [regStep, setRegStep] = useState(1);

  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [aadhaarVerifyLoading, setAadhaarVerifyLoading] = useState(false);
  const [aadhaarVerifyResult, setAadhaarVerifyResult] = useState(null);
  const [aadhaarVerifyError, setAadhaarVerifyError] = useState(null);

  const [otpSent, setOtpSent] = useState(false);
  const [otpDemoValue, setOtpDemoValue] = useState(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);

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
  const [testStatus, setTestStatus] = useState("normal");

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

  // LOAD TREATMENTS
  const loadTreatments = useCallback(() => {
    if (!aadhaar) return;

    fetch(`${API}/treatments/${aadhaar}`)
      .then(res => res.json())
      .then(data => setTreatments(Array.isArray(data) ? data : []));
  }, [aadhaar]);

  // LOAD PATIENT PROFILE
  const loadProfile = useCallback(() => {
    if (!aadhaar) return;

    fetch(`${API}/patients/${aadhaar}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => setProfile(data))
      .catch(() => setProfile(null));
  }, [aadhaar]);

  // LOAD LAB RESULTS
  const loadLabResults = useCallback(() => {
    if (!aadhaar) return;

    fetch(`${API}/labresults/${aadhaar}`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => setLabResults(Array.isArray(data) ? data : []))
      .catch(() => setLabResults([]));
  }, [aadhaar]);

  useEffect(() => {
    if (view === "app") {
      loadTreatments();
      loadProfile();
      loadLabResults();
    }
  }, [view, loadTreatments, loadProfile, loadLabResults]);

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

  // REGISTER
  // STEP 2: VERIFY AADHAAR DOCUMENT (OCR + checksum, matched against typed number)
  const verifyAadhaarDocument = async () => {
    if (regAadhaar.length !== 12) {
      alert("Enter the 12-digit Aadhaar number in Step 1 first ❌");
      return;
    }
    if (!aadhaarFile) {
      alert("Please choose an Aadhaar card image to upload ❌");
      return;
    }

    setAadhaarVerifyLoading(true);
    setAadhaarVerifyError(null);
    setAadhaarVerifyResult(null);

    try {
      const form = new FormData();
      form.append("aadhaarImage", aadhaarFile);
      form.append("aadhaarNumber", regAadhaar);

      const res = await fetch(`${API}/verify/extract`, {
        method: "POST",
        body: form
      });

      const data = await res.json();

      if (!res.ok) {
        setAadhaarVerifyError(data.message || "Verification failed ❌");
        return;
      }

      setAadhaarVerifyResult(data);
    } catch {
      setAadhaarVerifyError("Network error ❌");
    } finally {
      setAadhaarVerifyLoading(false);
    }
  };

  // STEP 3: SEND SIMULATED OTP
  const sendOtpForMobile = async () => {
    if (regMobile.length !== 10) {
      alert("Enter a 10-digit mobile number in Step 1 first ❌");
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      const res = await fetch(`${API}/verify/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: regMobile })
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.message || "Couldn't generate OTP ❌");
        return;
      }

      setOtpSent(true);
      setOtpDemoValue(data.otp);
    } catch {
      setOtpError("Network error ❌");
    } finally {
      setOtpLoading(false);
    }
  };

  // STEP 3: VERIFY OTP, THEN ACTUALLY CREATE THE ACCOUNT
  const verifyOtpAndRegister = async () => {
    if (!otpInput.trim()) {
      alert("Enter the OTP ❌");
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      const res = await fetch(`${API}/verify/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: regMobile, otp: otpInput })
      });

      const data = await res.json();

      if (!res.ok || !data.verified) {
        setOtpError(data.message || "OTP verification failed ❌");
        return;
      }

      await registerUser();
    } catch {
      setOtpError("Network error ❌");
    } finally {
      setOtpLoading(false);
    }
  };

  const registerUser = async () => {
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

      alert("Registered successfully ✅ Please log in.");
      setAadhaar(regAadhaar);
      setView("login");
    } catch {
      alert("Server error ❌");
    }
  };

  // SAVE TREATMENT
  const saveTreatment = async () => {
    if (!diagnosis.trim() || !medication.trim()) {
      alert("Please fill both fields ❌");
      return;
    }

    await fetch(`${API}/treatments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aadhaar, diagnosis, medication })
    });

    setDiagnosis("");
    setMedication("");
    loadTreatments();
    setActiveTab("patients");
  };

  // DELETE TREATMENT
  const deleteTreatment = async (id) => {
    await fetch(`${API}/treatments/${id}`, { method: "DELETE" });
    loadTreatments();
  };

  // SAVE LAB RESULT
  const saveLabResult = async () => {
    if (!testName.trim() || !testValue.trim()) {
      alert("Please fill in at least the test name and value ❌");
      return;
    }

    await fetch(`${API}/labresults`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aadhaar,
        testName,
        resultValue: testValue,
        unit: testUnit,
        referenceRange: testRange,
        status: testStatus
      })
    });

    setTestName("");
    setTestValue("");
    setTestUnit("");
    setTestRange("");
    setTestStatus("normal");
    loadLabResults();
  };

  const deleteLabResult = async (id) => {
    await fetch(`${API}/labresults/${id}`, { method: "DELETE" });
    loadLabResults();
  };

  // AI SUMMARY
  const summarizeHistory = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiSummary(null);

    try {
      const res = await fetch(`${API}/ai/summarize`, {
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
      const res = await fetch(`${API}/fhir/import`, {
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
  const registerDoctor = async () => {
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
          password: docPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Registration failed ❌");
        return;
      }

      alert("Doctor registered successfully ✅ Please log in.");
      setDocRegIdLogin(docRegId);
      setView("doctorLogin");
    } catch {
      alert("Server error ❌");
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
    setView("login");
  };

  // DOCTOR: LOOK UP A PATIENT BY AADHAAR
  const lookupPatient = async () => {
    if (!searchAadhaar.trim()) {
      alert("Enter a patient's Aadhaar number ❌");
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    setFoundPatient(null);
    setFoundTreatments([]);
    setFoundLabs([]);
    setDocSummary(null);

    try {
      const profileRes = await fetch(`${API}/patients/${searchAadhaar}`);
      if (!profileRes.ok) {
        setLookupError("No patient found with that Aadhaar ❌");
        return;
      }
      const profile = await profileRes.json();
      setFoundPatient(profile);

      const [treatRes, labRes] = await Promise.all([
        fetch(`${API}/treatments/${searchAadhaar}`),
        fetch(`${API}/labresults/${searchAadhaar}`)
      ]);
      setFoundTreatments(treatRes.ok ? await treatRes.json() : []);
      setFoundLabs(labRes.ok ? await labRes.json() : []);
    } catch {
      setLookupError("Network error ❌");
    } finally {
      setLookupLoading(false);
    }
  };

  const refreshFoundPatientRecords = async () => {
    if (!foundPatient) return;
    const [treatRes, labRes] = await Promise.all([
      fetch(`${API}/treatments/${foundPatient.aadhaar_id}`),
      fetch(`${API}/labresults/${foundPatient.aadhaar_id}`)
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

    await fetch(`${API}/treatments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aadhaar: foundPatient.aadhaar_id,
        diagnosis: docDiagnosis,
        medication: docMedication
      })
    });

    setDocDiagnosis("");
    setDocMedication("");
    refreshFoundPatientRecords();
  };

  // DOCTOR: AI SUMMARY FOR THE FOUND PATIENT
  const doctorSummarize = async () => {
    if (!foundPatient) return;

    setDocSummaryLoading(true);
    setDocSummaryError(null);
    setDocSummary(null);

    try {
      const res = await fetch(`${API}/ai/summarize`, {
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

          {/* STEP 1: PERSONAL + ACCOUNT DETAILS */}
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

          {/* STEP 2: AADHAAR DOCUMENT VERIFICATION */}
          {regStep === 2 && (
            <>
              <div className="form-section-label">Verify Aadhaar Document</div>
              <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginTop: -4, marginBottom: 16 }}>
                Upload a photo of your Aadhaar card. We'll read the printed number (OCR) and check
                it against the number you entered, plus validate it against the checksum pattern
                UIDAI uses for real Aadhaar numbers.
              </p>

              <label className="field-label">Aadhaar Card Photo</label>
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={e => {
                  setAadhaarFile(e.target.files?.[0] || null);
                  setAadhaarVerifyResult(null);
                  setAadhaarVerifyError(null);
                }}
              />

              <button
                className="btn btn-primary"
                style={{ marginTop: 18 }}
                onClick={verifyAadhaarDocument}
                disabled={aadhaarVerifyLoading}
              >
                {aadhaarVerifyLoading ? <Loader2 size={16} className="spin" /> : null}
                {aadhaarVerifyLoading ? "Reading document..." : "Verify Document"}
              </button>

              {aadhaarVerifyError && <div className="ai-error">{aadhaarVerifyError}</div>}

              {aadhaarVerifyResult && (
                <div className="ai-summary-box">
                  <p>{aadhaarVerifyResult.message}</p>
                  <p>
                    Checksum: <strong>{aadhaarVerifyResult.checksumValid ? "Valid pattern" : "Does not match UIDAI's pattern"}</strong>
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button className="btn" style={{ background: "var(--border)", color: "var(--ink-700)" }} onClick={() => setRegStep(1)}>
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!aadhaarVerifyResult?.matched}
                  onClick={() => setRegStep(3)}
                >
                  Continue
                </button>
              </div>

              <button className="link-btn" onClick={() => setRegStep(3)}>
                Skip for now (demo mode)
              </button>
            </>
          )}

          {/* STEP 3: MOBILE OTP */}
          {regStep === 3 && (
            <>
              <div className="form-section-label">Verify Mobile Number</div>
              <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginTop: -4, marginBottom: 16 }}>
                <strong>Demo mode:</strong> this OTP is simulated and shown directly below instead
                of being sent by real SMS (which needs a paid provider and DLT registration in India).
              </p>

              <button className="btn btn-primary" onClick={sendOtpForMobile} disabled={otpLoading}>
                {otpLoading && !otpSent ? <Loader2 size={16} className="spin" /> : null}
                {otpSent ? "Resend OTP" : "Send OTP"}
              </button>

              {otpSent && otpDemoValue && (
                <div className="ai-summary-box">
                  <p>
                    Your demo OTP is <strong style={{ fontSize: 18 }}>{otpDemoValue}</strong>
                  </p>
                  <p>Valid for 5 minutes.</p>
                </div>
              )}

              {otpSent && (
                <>
                  <label className="field-label" style={{ marginTop: 18 }}>Enter OTP</label>
                  <input
                    className="input"
                    placeholder="6-digit OTP"
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value)}
                    maxLength={6}
                  />
                </>
              )}

              {otpError && <div className="ai-error">{otpError}</div>}

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button className="btn" style={{ background: "var(--border)", color: "var(--ink-700)" }} onClick={() => setRegStep(2)}>
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={otpSent ? verifyOtpAndRegister : registerUser}
                  disabled={otpLoading}
                >
                  {otpLoading ? <Loader2 size={16} className="spin" /> : null}
                  {otpSent ? "Verify & Register" : "Skip & Register"}
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

  // ================= DOCTOR REGISTER VIEW =================
  if (view === "doctorRegister") {
    return (
      <div className="auth-page">
        <div className="auth-card wide">
          <div className="auth-brand">
            <div className="auth-icon-circle" style={{ background: "var(--teal-100)", color: "var(--teal-600)" }}>
              <Stethoscope size={26} />
            </div>
            <h2 className="auth-title">Doctor Registration</h2>
            <p className="auth-subtitle">Register with your Doctor Registration ID</p>
          </div>

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

          <label className="field-label">Password</label>
          <input className="input" type="password" placeholder="Choose a password" value={docPassword} onChange={e => setDocPassword(e.target.value)} />

          <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={registerDoctor}>
            Register
          </button>

          <button className="link-btn" onClick={() => setView("doctorLogin")}>
            Already registered? Login
          </button>
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

          <div className="nav-item active">
            <Search size={17} />
            Search Patient
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
                  <FileText size={17} color="var(--blue-600)" />
                  Treatment History
                </h3>
                {foundTreatments.length === 0 ? (
                  <div className="empty-state">No treatments recorded yet</div>
                ) : (
                  foundTreatments.map(t => (
                    <div className="treatment-item" key={t._id}>
                      <div className="treatment-icon">
                        <Stethoscope size={17} />
                      </div>
                      <div className="treatment-body">
                        <p className="treatment-diagnosis">{t.diagnosis}</p>
                        <p className="treatment-medication">{t.medication}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="card">
                <h3 className="card-heading">
                  <TestTube2 size={17} color="var(--blue-600)" />
                  Lab Results
                </h3>
                {foundLabs.length === 0 ? (
                  <div className="empty-state">No lab results recorded yet</div>
                ) : (
                  foundLabs.map(l => (
                    <div className="lab-item" key={l._id}>
                      <div className="lab-item-main">
                        <p className="treatment-diagnosis">{l.testName}</p>
                        <p className="treatment-medication">
                          {l.resultValue} {l.unit} {l.referenceRange ? `· Ref: ${l.referenceRange}` : ""}
                        </p>
                      </div>
                      <span className={`status-badge status-${l.status}`}>{l.status}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="card">
                <h3 className="card-heading">
                  <FlaskConical size={17} color="var(--blue-600)" />
                  Add Treatment for This Patient
                </h3>

                <label className="field-label">Diagnosis</label>
                <input className="input" placeholder="e.g. Fever" value={docDiagnosis} onChange={e => setDocDiagnosis(e.target.value)} />

                <label className="field-label">Medication</label>
                <input className="input" placeholder="e.g. Crocin" value={docMedication} onChange={e => setDocMedication(e.target.value)} />

                <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={doctorSaveTreatment}>
                  <PlusCircle size={16} />
                  Save Treatment
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
        </div>
      </div>
    );
  }

  // ================= MAIN APP =================
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "patients", label: "Patients", icon: Users },
    { id: "labs", label: "Lab Reports", icon: TestTube2 },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "add", label: "Add Treatment", icon: PlusCircle },
    { id: "ai", label: "AI Summary", icon: Sparkles },
    { id: "fhir", label: "FHIR Import", icon: CloudDownload }
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
                  </div>
                  <button className="btn-danger-outline btn" onClick={() => deleteTreatment(t._id)}>
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* LAB REPORTS */}
        {activeTab === "labs" && (
          <>
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
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>

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
                    </div>
                    <span className={`status-badge status-${l.status}`}>{l.status}</span>
                    <button className="btn-danger-outline btn" onClick={() => deleteLabResult(l._id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
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
      </div>
    </div>
  );
}

export default App;
