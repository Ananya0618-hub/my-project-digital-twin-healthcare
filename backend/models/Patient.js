const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
  name: String,
  aadhaar_id: String
});

module.exports = mongoose.model("Patient", patientSchema);