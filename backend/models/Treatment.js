const mongoose = require("mongoose");

const treatmentSchema = new mongoose.Schema({
  aadhaar: String,
  diagnosis: String,
  medication: String,
  date: {
    type: Date,
    default: Date.now
  },
  // Attribution — who recorded this and where. doctorRegId/doctorName are set
  // server-side from the doctor's token, never from the request body.
  hospital: { type: String, default: "" },
  doctorRegId: { type: String, default: "" },
  doctorName: { type: String, default: "" },
  source: {
    type: String,
    enum: ["patient", "doctor", "fhir-sandbox"],
    default: "patient"
  }
});

module.exports = mongoose.model("Treatment", treatmentSchema);
