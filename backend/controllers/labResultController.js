const LabResult = require("../models/LabResult");

// ✅ ADD LAB RESULT
exports.addLabResult = async (req, res) => {
  try {
    const { aadhaar, testName, resultValue, unit, referenceRange, status, testDate } = req.body;

    if (!aadhaar || !testName || !resultValue) {
      return res.status(400).json({ message: "aadhaar, testName and resultValue are required ❌" });
    }

    const labResult = new LabResult({
      aadhaar,
      testName,
      resultValue,
      unit,
      referenceRange,
      status,
      testDate
    });

    await labResult.save();
    res.status(201).json(labResult);
  } catch (err) {
    console.error("❌ ADD LAB RESULT ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

// ✅ GET LAB RESULTS FOR A PATIENT
exports.getLabResults = async (req, res) => {
  try {
    const results = await LabResult.find({ aadhaar: req.params.aadhaar }).sort({ createdAt: -1 });
    res.json(results);
  } catch (err) {
    console.error("❌ GET LAB RESULTS ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

// ✅ DELETE LAB RESULT
exports.deleteLabResult = async (req, res) => {
  try {
    await LabResult.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully ✅" });
  } catch (err) {
    console.error("❌ DELETE LAB RESULT ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};
