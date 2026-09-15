const mongoose = require("mongoose");

// Mirrors the DOCTOR entity from the project's data model (doctor_reg_id PK,
// speciality, phone, email) — R1.4/R1.5 in the requirement analysis.
const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    doctorRegId: { type: String, required: true, unique: true },
    specialty: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    password: { type: String, required: true },
    aadhaarNumber: { type: String, default: "" },
    digilockerVerified: { type: Boolean, default: false },
    digilockerVerifiedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);
