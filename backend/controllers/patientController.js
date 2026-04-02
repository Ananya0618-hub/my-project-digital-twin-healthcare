let patients = [
  { aadhaar_id: "9999", name: "Rahul" },
  { aadhaar_id: "7777", name: "Ayush" }
];

// ✅ GET ALL
const getAllPatients = (req, res) => {
  res.json(patients);
};

// ✅ GET BY ID
const getPatientById = (req, res) => {
  const { aadhaar_id } = req.params;

  const patient = patients.find(p => p.aadhaar_id === aadhaar_id);

  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }

  res.json(patient);
};

// ✅ POST ADD PATIENT
const addPatient = (req, res) => {
  const { name, aadhaar_id } = req.body;

  const newPatient = { name, aadhaar_id };

  patients.push(newPatient);

  res.status(201).json({
    message: "Patient added successfully",
    patient: newPatient
  });
};

module.exports = {
  getAllPatients,
  getPatientById,
  addPatient
};