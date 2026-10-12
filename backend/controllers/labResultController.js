const LabResult = require("../models/LabResult");
const { getDoctorName } = require("../utils/doctors");
const { clean, ensureHospital } = require("../utils/hospitals");
const { parseRecordDate, sortByRecordDate } = require("../utils/recordInput");
const { computeLabStatus, parseReferenceRange } = require("../utils/labStatus");

const STATUSES = ["low", "normal", "high"];

// ✅ ADD LAB RESULT
// status: "low" | "normal" | "high" is an explicit override; omit it (or send
// "auto") and it's derived from the value and reference range, falling back
// to "normal" when the range can't be parsed.
exports.addLabResult = async (req, res) => {
  try {
    const { testName, resultValue, unit, referenceRange, status } = req.body;

    if (!testName || !resultValue) {
      return res.status(400).json({ message: "aadhaar, testName and resultValue are required ❌" });
    }

    const { date, error } = parseRecordDate(req.body.date);
    if (error) return res.status(400).json({ message: error });

    const range = parseReferenceRange(referenceRange);
    const finalStatus = STATUSES.includes(status) ? status : computeLabStatus(resultValue, referenceRange) || "normal";

    const isDoctor = req.user.role === "doctor";
    // only doctors add to the shared hospital list; patients' free text stays on their own record
    const hospital = isDoctor ? await ensureHospital(req.body.hospital) : clean(req.body.hospital);

    const labResult = new LabResult({
      aadhaar: req.targetAadhaar,
      testName: String(testName).trim(),
      resultValue: String(resultValue).trim(),
      unit: String(unit || "").trim(),
      referenceRange: String(referenceRange || "").trim(),
      refLow: range ? range.low : null,
      refHigh: range ? range.high : null,
      status: finalStatus,
      date: date || new Date(),
      hospital,
      source: isDoctor ? "doctor" : "patient",
      ...(isDoctor
        ? { doctorRegId: req.user.doctorRegId, doctorName: await getDoctorName(req.user.doctorRegId) }
        : {})
    });

    await labResult.save();
    res.status(201).json(labResult);
  } catch (err) {
    console.error("❌ ADD LAB RESULT ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

// ✅ GET LAB RESULTS FOR A PATIENT (newest first)
exports.getLabResults = async (req, res) => {
  try {
    const results = await LabResult.find({ aadhaar: req.targetAadhaar });
    res.json(sortByRecordDate(results, -1));
  } catch (err) {
    console.error("❌ GET LAB RESULTS ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

// ✅ DELETE LAB RESULT — same rules as treatments
exports.deleteLabResult = async (req, res) => {
  try {
    const doc = await LabResult.findById(req.params.id);
    if (!doc || doc.aadhaar !== req.user.aadhaar) {
      return res.status(404).json({ message: "Record not found ❌" });
    }
    if (doc.source === "doctor") {
      return res.status(403).json({ message: "Records added by a doctor can't be deleted ❌" });
    }

    await LabResult.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully ✅" });
  } catch (err) {
    if (err && err.name === "CastError") return res.status(404).json({ message: "Record not found ❌" });
    console.error("❌ DELETE LAB RESULT ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};
