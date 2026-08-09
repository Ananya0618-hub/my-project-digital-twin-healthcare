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
  // view: "login" | "register" | "app"
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
        </div>
      </div>
    );
  }

  // ================= REGISTER VIEW =================
  if (view === "register") {
    return (
      <div className="auth-page">
        <div className="auth-card wide">
          <div className="auth-brand">
            <div className="auth-icon-circle" style={{ background: "var(--teal-100)", color: "var(--teal-600)" }}>
              <UserPlus size={26} />
            </div>
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-subtitle">Join HealthMirror in a couple of steps</p>
          </div>

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

          <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={registerUser}>
            Register
          </button>

          <button className="link-btn" onClick={() => setView("login")}>
            Already have an account? Login
          </button>
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
