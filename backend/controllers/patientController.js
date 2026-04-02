// Dummy controller (no MySQL)

exports.getAllPatients = (req, res) => {
  res.json([
    {
      aadhaar_id: "1234",
      name: "Test Patient 1",
      age: 25,
      condition: "Healthy"
    },
    {
      aadhaar_id: "5678",
      name: "Test Patient 2",
      age: 30,
      condition: "Diabetes"
    }
  ]);
};

exports.getPatientById = (req, res) => {
  const { aadhaar_id } = req.params;

  res.json({
    aadhaar_id,
    name: "Test Patient",
    age: 28,
    condition: "Healthy"
  });
};

exports.addPatient = (req, res) => {
  const newPatient = req.body;

  res.json({
    message: "Patient added successfully (dummy)",
    patient: newPatient
  });
};