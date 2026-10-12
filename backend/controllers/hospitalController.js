const Hospital = require("../models/Hospital");

exports.listHospitals = async (req, res) => {
  try {
    const rows = await Hospital.find().sort({ name: 1 });
    res.json(rows.map((h) => h.name));
  } catch (err) {
    console.error("❌ HOSPITAL LIST ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};
