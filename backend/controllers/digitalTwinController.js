const db = require("../config/db");

const getDigitalTwinByPatient = (req, res) => {
  const { aadhaar_id } = req.params;

  db.query(
    "SELECT * FROM digital_twin_summary WHERE aadhaar_id = ?",
    [aadhaar_id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(results[0] || {});
    }
  );
};

module.exports = {
  getDigitalTwinByPatient
};