const mongoose = require("mongoose");

const labResultSchema = new mongoose.Schema(
  {
    aadhaar: { type: String, required: true },
    testName: { type: String, required: true },
    resultValue: { type: String, required: true },
    unit: { type: String, default: "" },
    referenceRange: { type: String, default: "" },
    // Parsed from referenceRange at save time so charts can draw the normal band.
    refLow: { type: Number, default: null },
    refHigh: { type: Number, default: null },
    status: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal"
    },
    testDate: { type: String, default: "" },
    // Set explicitly when a result is created. No schema default: Mongoose would apply it to
    // existing documents on load and give every old result today's date.
    date: { type: Date },
    hospital: { type: String, default: "" },
    doctorRegId: { type: String, default: "" },
    doctorName: { type: String, default: "" },
    source: {
      type: String,
      enum: ["patient", "doctor", "fhir-sandbox"],
      default: "patient"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("LabResult", labResultSchema);
