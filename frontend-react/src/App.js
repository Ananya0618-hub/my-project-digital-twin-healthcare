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
  FileText
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

  useEffect(() => {
    if (view === "app") {
      loadTreatments();
      loadProfile();
    }
  }, [view, loadTreatments, loadProfile]);

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

  const logout = () => {
    localStorage.clear();
    setAadhaar("");
    setPassword("");
    setProfile(null);
    setTreatments([]);
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
        maxBarThickness: 48
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#eef2f7" } },
      x: { grid: { display: false } }
    }
  };

  const isHighRisk = treatments.length > 5;

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
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "add", label: "Add Treatment", icon: PlusCircle }
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
              <p className="hero-welcome">Welcome back</p>
              <h2 className="hero-name">{profile?.name || aadhaar}</h2>
              <span className="risk-badge">
                <span
                  className="risk-dot"
                  style={{ background: isHighRisk ? "#fca5a5" : "#86efac" }}
                />
                {isHighRisk ? "High Risk" : "Normal"}
              </span>
            </div>

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

            <div className="stat-grid">
              <div className="stat-card">
                <p className="stat-label">Total Treatments</p>
                <p className="stat-value">{treatments.length}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Last Diagnosis</p>
                <p className="stat-value" style={{ fontSize: 16 }}>
                  {treatments[treatments.length - 1]?.diagnosis || "None"}
                </p>
              </div>
            </div>
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
              <Bar data={chartData} options={chartOptions} />
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
      </div>
    </div>
  );
}

export default App;
