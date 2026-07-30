const mongoose = require("mongoose");

// Mirrors "Step 1 — Register" from the KYC Accelerator's wizard:
// capture full customer/patient details up front instead of just a name.
const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    aadhaar_id: { type: String, required: true, unique: true },
    mobile: { type: String },
    email: { type: String },
    address: { type: String },
    dob: { type: String } // stored as DD/MM/YYYY string to keep the form simple
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);
