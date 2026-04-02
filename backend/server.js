const express = require("express");
const cors = require("cors");

const patientRoutes = require("./routes/patientRoutes");
const digitalTwinRoutes = require("./routes/digitalTwinRoutes");
const treatmentRoutes = require("./routes/treatmentRoutes"); // ✅ NEW

const app = express();

app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("<h1>HealthMirror backend is running 🚀</h1>");
});

// Routes
app.use("/api/patients", patientRoutes);
app.use("/api/digitaltwin", digitalTwinRoutes);
app.use("/api/treatments", treatmentRoutes); // ✅ NEW ROUTE

// Port
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});