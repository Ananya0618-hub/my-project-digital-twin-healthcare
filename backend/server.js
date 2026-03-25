const express = require("express");
const cors = require("cors");

const patientRoutes = require("./routes/patientRoutes");
const digitalTwinRoutes = require("./routes/digitalTwinRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("<h1>HealthMirror backend is running</h1>");
});

app.use("/api/patients", patientRoutes);
app.use("/api/digitaltwin", digitalTwinRoutes);

const PORT = process.env.PORT|| 3001;

app.listen(PORT,() => {
  console.log(`Server running on port ${PORT}`);
});

setInterval(() => {}, 1000);