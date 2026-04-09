let patients = [
  { aadhaar_id: "9999", name: "Rahul" },
  { aadhaar_id: "7777", name: "Ayush" }
];

// ✅ GET ALL PATIENTS
const getAllPatients = (req, res) => {
  res.json(patients);
};

// ✅ GET PATIENT BY ID
const getPatientById = (req, res) => {
  const { aadhaar_id } = req.params;

  const patient = patients.find(p => p.aadhaar_id === aadhaar_id);

  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }

  res.json(patient);
};

// ✅ ADD NEW PATIENT
const addPatient = (req, res) => {
  const { name, aadhaar_id } = req.body;

  // check if already exists
  const exists = patients.find(p => p.aadhaar_id === aadhaar_id);

  if (exists) {
    return res.status(400).json({ message: "Patient already exists" });
  }

  const newPatient = { name, aadhaar_id };

  patients.push(newPatient);

  res.status(201).json({
    message: "Patient added successfully",
    patient: newPatient
  });
};

// ✅ UPDATE PATIENT BY ID
const updatePatient = (req, res) => {
  const { aadhaar_id } = req.params;
  const { name } = req.body;

  const patient = patients.find(p => p.aadhaar_id === aadhaar_id);

  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }

  // update fields
  if (name) patient.name = name;

  res.json({
    message: "Patient updated successfully",
    patient
  });
};

module.exports = {
  getAllPatients,
  getPatientById,
  addPatient,
  updatePatient
};