const db = require("../config/db");

const getAllPatients = (req, res) => {
  db.query("SELECT * FROM patients", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
};

const getPatientById = (req, res) => {
  const { aadhaar_id } = req.params;

  db.query(
    "SELECT * FROM patients WHERE aadhaar_id = ?",
    [aadhaar_id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(results[0] || {});
    }
  );
};

const addPatient = (req, res) => {
  const { aadhaar_id, name, age, gender, phone } = req.body;

  db.query(
    "INSERT INTO patients (aadhaar_id, name, age, gender, phone) VALUES (?, ?, ?, ?, ?)",
    [aadhaar_id, name, age, gender, phone],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Patient added successfully", id: results.insertId });
    }
  );
};

module.exports = {
  getAllPatients,
  getPatientById,
  addPatient
};