import { useState, useEffect, useCallback } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement);

// Relative path — works both in local dev (CRA proxy, see package.json "proxy")
// and in production, where Nginx serves this app and proxies /api to the
// backend on the same domain. No hardcoded host, no CORS headaches.
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
      body: JSON.stringify({
        aadhaar,
        diagnosis,
        medication
      })
    });

    setDiagnosis("");
    setMedication("");
    loadTreatments();
    setActiveTab("patients");
  };

  // DELETE TREATMENT
  const deleteTreatment = async (id) => {
    await fetch(`${API}/treatments/${id}`, {
      method: "DELETE"
    });

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
        backgroundColor: "#2563eb"
      }
    ]
  };

  // RISK
  const risk = treatments.length > 5 ? "High Risk 🔴" : "Normal 🟢";

  // STYLES
  const authWrap = {
    maxWidth: "420px",
    margin: "80px auto",
    textAlign: "center",
    background: "white",
    padding: "36px",
    borderRadius: "16px",
    boxShadow: "0 4px 24px rgba(15,23,42,0.08)"
  };

  const layout = {
    display: "flex",
    maxWidth: "1000px",
    margin: "auto",
    minHeight: "100vh"
  };

  const sidebar = {
    width: "220px",
    background: "#0f172a",
    color: "white",
    padding: "20px"
  };

  const tab = (t) => ({
    padding: "10px",
    marginTop: "10px",
    background: activeTab === t ? "#2563eb" : "transparent",
    cursor: "pointer",
    borderRadius: "6px"
  });

  const main = {
    flex: 1,
    padding: "24px",
    background: "#f1f5f9"
  };

  const card = {
    background: "white",
    padding: "18px",
    borderRadius: "12px",
    marginBottom: "16px",
    boxShadow: "0 1px 3px rgba(15,23,42,0.06)"
  };

  const input = {
    padding: "10px",
    width: "100%",
    margin: "8px 0",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    boxSizing: "border-box"
  };

  const btn = {
    padding: "11px",
    background: "#2563eb",
    color: "white",
    border: "none",
    width: "100%",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    marginTop: "6px"
  };

  const linkBtn = {
    background: "none",
    border: "none",
    color: "#2563eb",
    cursor: "pointer",
    marginTop: "14px",
    fontSize: "14px"
  };

  const sectionLabel = {
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    marginTop: "18px",
    marginBottom: "4px"
  };

  // LOGIN VIEW
  if (view === "login") {
    return (
      <div style={authWrap}>
        <h2>🏥 HealthMirror</h2>
        <p style={{ color: "#64748b", marginTop: "-8px" }}>Sign in to your account</p>

        <input
          placeholder="Aadhaar Number"
          value={aadhaar}
          onChange={e => setAadhaar(e.target.value)}
          style={input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={input}
        />

        <button style={btn} onClick={loginUser}>Login</button>

        <div>
          <button style={linkBtn} onClick={() => setView("register")}>
            Don't have an account? Register
          </button>
        </div>
      </div>
    );
  }

  // REGISTER VIEW
  if (view === "register") {
    return (
      <div style={{ ...authWrap, maxWidth: "480px" }}>
        <h2>📝 Create Account</h2>
        <p style={{ color: "#64748b", marginTop: "-8px" }}>Join HealthMirror in a couple of steps</p>

        <div style={sectionLabel}>Personal Details</div>
        <input placeholder="Full Name" value={regName} onChange={e => setRegName(e.target.value)} style={input} />
        <input placeholder="Date of Birth (DD/MM/YYYY)" value={regDob} onChange={e => setRegDob(e.target.value)} style={input} />
        <input placeholder="Mobile Number" value={regMobile} onChange={e => setRegMobile(e.target.value)} style={input} maxLength={10} />
        <input placeholder="Email" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={input} />
        <input placeholder="Address" value={regAddress} onChange={e => setRegAddress(e.target.value)} style={input} />

        <div style={sectionLabel}>Account</div>
        <input placeholder="12-digit Aadhaar" value={regAadhaar} onChange={e => setRegAadhaar(e.target.value)} style={input} maxLength={12} />
        <input type="password" placeholder="Choose a password" value={regPassword} onChange={e => setRegPassword(e.target.value)} style={input} />

        <button style={btn} onClick={registerUser}>Register</button>

        <div>
          <button style={linkBtn} onClick={() => setView("login")}>
            Already have an account? Login
          </button>
        </div>
      </div>
    );
  }

  // MAIN APP
  return (
    <div style={layout}>
      {/* SIDEBAR */}
      <div style={sidebar}>
        <h2>🏥 HealthMirror</h2>

        <div style={tab("dashboard")} onClick={() => setActiveTab("dashboard")}>Dashboard</div>
        <div style={tab("patients")} onClick={() => setActiveTab("patients")}>Patients</div>
        <div style={tab("analytics")} onClick={() => setActiveTab("analytics")}>Analytics</div>
        <div style={tab("add")} onClick={() => setActiveTab("add")}>Add Treatment</div>

        <button style={{ ...btn, marginTop: "20px" }} onClick={logout}>
          Logout
        </button>
      </div>

      {/* MAIN */}
      <div style={main}>
        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <>
            <div style={card}>
              <h2>Welcome {profile?.name || aadhaar} 👋</h2>
              <p><b>Risk Level:</b> {risk}</p>
            </div>

            {profile && (profile.mobile || profile.email || profile.address || profile.dob) && (
              <div style={card}>
                <h3>Personal Details</h3>
                {profile.dob && <p><b>Date of Birth:</b> {profile.dob}</p>}
                {profile.mobile && <p><b>Mobile:</b> {profile.mobile}</p>}
                {profile.email && <p><b>Email:</b> {profile.email}</p>}
                {profile.address && <p><b>Address:</b> {profile.address}</p>}
              </div>
            )}

            <div style={card}>
              <h3>Total Treatments</h3>
              <p>{treatments.length}</p>
            </div>

            <div style={card}>
              <h3>Last Diagnosis</h3>
              <p>{treatments[treatments.length - 1]?.diagnosis || "None"}</p>
            </div>
          </>
        )}

        {/* PATIENTS */}
        {activeTab === "patients" && (
          <div style={card}>
            <h3>Patient History 🔍</h3>

            <input
              placeholder="Search diagnosis or medication..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={input}
            />

            {filtered.length === 0 ? (
              <p>No results found</p>
            ) : (
              filtered.map(t => (
                <div key={t._id} style={card}>
                  <b>{t.diagnosis}</b>
                  <p>{t.medication}</p>

                  <button onClick={() => deleteTreatment(t._id)}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === "analytics" && (
          <div style={card}>
            <h3>Analytics 📊</h3>
            <Bar data={chartData} />
          </div>
        )}

        {/* ADD */}
        {activeTab === "add" && (
          <div style={card}>
            <h3>Add Treatment</h3>

            <input
              placeholder="Diagnosis"
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              style={input}
            />

            <input
              placeholder="Medication"
              value={medication}
              onChange={e => setMedication(e.target.value)}
              style={input}
            />

            <button style={btn} onClick={saveTreatment}>
              Save Treatment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
