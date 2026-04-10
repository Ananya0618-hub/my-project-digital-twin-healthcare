const mongoose = require("mongoose");

const treatmentSchema = new mongoose.Schema({
  aadhaar: String,
  diagnosis: String,
  medication: String,
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Treatment", treatmentSchema);