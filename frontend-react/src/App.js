import { useState, useEffect, useCallback } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement);

function App() {
  const [step, setStep] = useState(1);
  const [aadhaar, setAadhaar] = useState("");
  const [password, setPassword] = useState("");

  const [activeTab, setActiveTab] = useState("dashboard");

  const [diagnosis, setDiagnosis] = useState("");
  const [medication, setMedication] = useState("");
  const [treatments, setTreatments] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const API = "http://localhost:3001/api";
  //const API = "http://10.68.7.207:3000/api";

  const user = JSON.parse(localStorage.getItem("user") || "null");

  // AUTO LOGIN
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = JSON.parse(localStorage.getItem("user"));

    if (token && savedUser) {
      setAadhaar(savedUser.aadhaar);
      setStep(4);
    }
  }, []);

  // LOAD TREATMENTS
  const loadTreatments = useCallback(() => {
    if (!aadhaar) return;

    fetch(`${API}/treatments/${aadhaar}`)
      .then(res => res.json())
      .then(data => setTreatments(data));
  }, [aadhaar]);

  useEffect(() => {
    if (step === 4) loadTreatments();
  }, [step, loadTreatments]);

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
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user) {
        setAadhaar(data.user.aadhaar);
      }
        setStep(4);
      } else {
        alert(data.message);
      }
    } catch {
      alert("Server error ❌");
    }
  };

  // SAVE TREATMENT
  const saveTreatment = async () => {
    await fetch(`${API}/treatments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aadhaar_id: aadhaar,
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
        backgroundColor: "#3b82f6"
      }
    ]
  };

  // RISK
  const risk = treatments.length > 5 ? "High Risk 🔴" : "Normal 🟢";

  // STYLES
  const layout = {
    display: "flex",
    maxWidth: "900px",
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
    padding: "20px",
    background: "#f1f5f9"
  };

  const card = {
    background: "white",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "15px"
  };

  const input = {
    padding: "10px",
    width: "100%",
    margin: "10px 0",
    borderRadius: "8px",
    border: "1px solid #ccc"
  };

  const btn = {
    padding: "10px",
    background: "#2563eb",
    color: "white",
    border: "none",
    width: "100%",
    borderRadius: "8px",
    cursor: "pointer"
  };

  // LOGIN UI
  if (step === 1) {
    return (
      <div style={{ maxWidth: "400px", margin: "auto", textAlign: "center", marginTop: "100px" }}>
        <h2>🏥 HealthMirror</h2>

        <input
          placeholder="Aadhaar"
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
      </div>
    );
  }

  return (
    <div style={layout}>

      {/* SIDEBAR */}
      <div style={sidebar}>
        <h2>🏥 HealthMirror</h2>

        <div style={tab("dashboard")} onClick={() => setActiveTab("dashboard")}>Dashboard</div>
        <div style={tab("patients")} onClick={() => setActiveTab("patients")}>Patients</div>
        <div style={tab("analytics")} onClick={() => setActiveTab("analytics")}>Analytics</div>
        <div style={tab("add")} onClick={() => setActiveTab("add")}>Add Treatment</div>

        <button
          style={{ ...btn, marginTop: "20px" }}
          onClick={() => {
            localStorage.clear();
            setStep(1);
          }}
        >
          Logout
        </button>
      </div>

      {/* MAIN */}
      <div style={main}>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <>
            <div style={card}>
              <h2>Welcome {user?.aadhaar} 👋</h2>
              <p><b>Risk Level:</b> {risk}</p>
            </div>

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