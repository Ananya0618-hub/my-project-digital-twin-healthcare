require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const patientRoutes = require("./routes/patientRoutes");
const digitalTwinRoutes = require("./routes/digitalTwinRoutes");
const treatmentRoutes = require("./routes/treatmentRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("<h1>HealthMirror backend is running 🚀</h1>");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend reachable" });
});

app.use("/api/patients", patientRoutes);
app.use("/api/digitaltwin", digitalTwinRoutes);
app.use("/api/treatments", treatmentRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 3001;

connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
  });