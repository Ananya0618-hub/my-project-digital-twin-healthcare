const mongoose = require("mongoose");

// Hospitals are created the first time a doctor records something there;
// the list then feeds the hospital suggestions in the UI.
const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameKey: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hospital", hospitalSchema);
