require("dotenv").config();
console.log("MONGO_URI:", process.env.MONGO_URI);

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
connectDB();

const patientRoutes = require("./routes/patientRoutes");
const digitalTwinRoutes = require("./routes/digitalTwinRoutes");
const treatmentRoutes = require("./routes/treatmentRoutes.js");
const authRoutes = require("./routes/authRoutes");

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Test route
app.get("/", (req, res) => {
  res.send("<h1>HealthMirror backend is running 🚀</h1>");
});

// ✅ Routes
app.use("/api/patients", patientRoutes);
app.use("/api/digitaltwin", digitalTwinRoutes);
app.use("/api/treatments", treatmentRoutes);
app.use("/api/auth", authRoutes);

// ✅ Connect DB FIRST
connectDB();

// ✅ Then start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});