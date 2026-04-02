exports.getAllPatients = (req, res) => {
  res.json([
    { aadhaar_id: "1234", name: "Test Patient 1" },
    { aadhaar_id: "5678", name: "Test Patient 2" }
  ]);
};

exports.getPatientById = (req, res) => {
  const { aadhaar_id } = req.params;

  res.json({
    aadhaar_id,
    name: "Test Patient",
    age: 25,
    condition: "Healthy"
  });
};

exports.addPatient = (req, res) => {
  res.json({
    message: "Patient added (dummy)"
  });
};