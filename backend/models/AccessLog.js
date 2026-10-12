const mongoose = require("mongoose");

// Append-only record of a doctor touching a patient's data (R7.3).
const accessLogSchema = new mongoose.Schema({
  patientAadhaar: { type: String, required: true, index: true },
  doctorRegId: { type: String, required: true },
  doctorName: { type: String, default: "" },
  action: {
    type: String,
    required: true,
    enum: ["view_record", "add_treatment", "add_lab", "ai_summary", "fhir_export"]
  },
  at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AccessLog", accessLogSchema);
