const mongoose = require("mongoose");

const labResultSchema = new mongoose.Schema(
  {
    aadhaar: { type: String, required: true },
    testName: { type: String, required: true },
    resultValue: { type: String, required: true },
    unit: { type: String, default: "" },
    referenceRange: { type: String, default: "" },
    status: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal"
    },
    testDate: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("LabResult", labResultSchema);
