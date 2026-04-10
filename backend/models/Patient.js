const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
  name: String,
  aadhaar: String
});

module.exports = mongoose.model("Patient", patientSchema);