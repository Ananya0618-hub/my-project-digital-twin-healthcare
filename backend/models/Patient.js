const mongoose = require("mongoose");
const { isValid: isValidRegistrationNumber } = require("../utils/registrationNumber");

// Mirrors "Step 1 — Register" from the KYC Accelerator's wizard:
// capture full customer/patient details up front instead of just a name.
const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    aadhaar_id: { type: String, required: true, unique: true },
    // Issued once at registration, never changes (immutable), never reissued. Sparse so patients created
    // before this existed can sit without one until the backfill script gives them theirs.
    registrationNumber: {
      type: String,
      unique: true,
      sparse: true,
      immutable: true,
      validate: { validator: isValidRegistrationNumber, message: "Not a valid registration number" }
    },
    mobile: { type: String },
    email: { type: String },
    address: { type: String },
    dob: { type: String }, // stored as DD/MM/YYYY string to keep the form simple
    digilockerVerified: { type: Boolean, default: false },
    digilockerVerifiedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);
