const mongoose = require("mongoose");

// A doctor's access to one patient's record. Created as "pending" when the
// doctor requests access; only the patient can move it to approved/denied/
// revoked. Every doctor read/write of patient data checks for "approved".
const consentSchema = new mongoose.Schema(
  {
    patientAadhaar: { type: String, required: true },
    patientName: { type: String, default: "" },
    doctorRegId: { type: String, required: true },
    doctorName: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "denied", "revoked"],
      default: "pending"
    },
    requestedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

consentSchema.index({ patientAadhaar: 1, doctorRegId: 1 }, { unique: true });

module.exports = mongoose.model("Consent", consentSchema);
