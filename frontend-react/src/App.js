import { useState } from "react";

function App() {
  const [step, setStep] = useState(1);
  const [aadhaar, setAadhaar] = useState("");
  const [patient, setPatient] = useState(null);
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState("");

  const API = "https://my-project-digital-twin-healthcare.onrender.com/api/patients";

  const login = () => {
    fetch(`${API}/${aadhaar}`)
      .then(res => res.json())
      .then(data => {
        if (!data || Object.keys(data).length === 0) {
          alert("Patient not found ❌");
        } else {
          setPatient(data);
          setStep(2);
        }
      })
      .catch(() => alert("Server waking up... try again"));
  };

  const cardStyle = {
    background: "#ffffff",
    padding: "30px",
    borderRadius: "12px",
    width: "350px",
    margin: "40px auto",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
  };

  const buttonStyle = {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#4f46e5",
    color: "white",
    cursor: "pointer",
    marginTop: "10px"
  };

  const inputStyle = {
    padding: "12px",
    margin: "10px 0",
    width: "90%",
    borderRadius: "8px",
    border: "1px solid #ccc"
  };

  return (
    <div style={{
      fontFamily: "Arial",
      background: "linear-gradient(to right, #eef2ff, #f8fafc)",
      minHeight: "100vh",
      padding: "20px"
    }}>

      <h1 style={{ textAlign: "center" }}>HealthMirror</h1>

      {/* ✅ FIX: role used here → no warning */}
      {role && (
        <p style={{ textAlign: "center", color: "#555" }}>
          Logged in as: <b>{role}</b>
        </p>
      )}

      {/* STEP 1 LOGIN */}
      {step === 1 && (
        <div style={cardStyle}>
          <h2>Login</h2>

          <input
            placeholder="Enter Aadhaar ID"
            value={aadhaar}
            onChange={(e) => setAadhaar(e.target.value)}
            style={inputStyle}
          />

          <button style={buttonStyle} onClick={login}>
            Send OTP
          </button>
        </div>
      )}

      {/* STEP 2 OTP */}
      {step === 2 && (
        <div style={cardStyle}>
          <h2>OTP Verification</h2>

          <input
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            style={inputStyle}
          />

          <button style={buttonStyle} onClick={() => setStep(3)}>
            Verify
          </button>
        </div>
      )}

      {/* STEP 3 ROLE */}
      {step === 3 && (
        <div style={cardStyle}>
          <h2>Select Role</h2>

          <button
            style={buttonStyle}
            onClick={() => {
              setRole("Patient");
              setStep(4);
            }}
          >
            Continue as Patient
          </button>

          <br />

          <button
            style={{ ...buttonStyle, background: "#059669" }}
            onClick={() => {
              setRole("Doctor");
              setStep(6);
            }}
          >
            Continue as Doctor
          </button>
        </div>
      )}

      {/* STEP 4 PATIENT DASHBOARD */}
      {step === 4 && patient && (
        <div style={cardStyle}>
          <h2>Patient Dashboard</h2>

          <h3>{patient.name}</h3>
          <p>Aadhaar: {patient.aadhaar_id}</p>

          <hr />

          <p>Total Visits: 47</p>
          <p>Risk Score: Medium</p>
          <p>Chronic: Diabetes</p>

          <button style={buttonStyle} onClick={() => setStep(5)}>
            View Reports
          </button>
        </div>
      )}

      {/* STEP 5 REPORTS */}
      {step === 5 && (
        <div style={cardStyle}>
          <h2>Lab Reports</h2>

          <p>Cholesterol: 225</p>
          <p>LDL: 145</p>
          <p>HDL: 45</p>

          <button style={buttonStyle} onClick={() => setStep(4)}>
            Back
          </button>
        </div>
      )}

      {/* STEP 6 DOCTOR DASHBOARD */}
      {step === 6 && patient && (
        <div style={cardStyle}>
          <h2>Doctor Dashboard</h2>

          <h3>{patient.name}</h3>
          <p>Digital Twin Active</p>

          <button style={buttonStyle} onClick={() => setStep(7)}>
            Add Treatment
          </button>

          <br />

          <button
            style={{ ...buttonStyle, background: "#0ea5e9" }}
            onClick={() => setStep(5)}
          >
            View Reports
          </button>
        </div>
      )}

      {/* STEP 7 ADD TREATMENT */}
      {step === 7 && (
        <div style={cardStyle}>
          <h2>Add Treatment</h2>

          <input placeholder="Diagnosis" style={inputStyle} />
          <input placeholder="Medication" style={inputStyle} />

          <button
            style={{ ...buttonStyle, background: "#22c55e" }}
            onClick={() => alert("Treatment Saved")}
          >
            Save Treatment
          </button>
        </div>
      )}

    </div>
  );
}

export default App;