const LabResult = require("../models/LabResult");
const { getDoctorName } = require("../utils/doctors");
const { clean, ensureHospital } = require("../utils/hospitals");
const { parseRecordDate, sortByRecordDate } = require("../utils/recordInput");
const { computeLabStatus, parseReferenceRange } = require("../utils/labStatus");

const STATUSES = ["low", "normal", "high"];
const MAX_BULK_ROWS = 60;

// Builds one LabResult document. status: "low" | "normal" | "high" is an explicit
// override; anything else is derived from the value and reference range. With no
// usable range (or a non-numeric value) there is nothing to compare against, so the
// result is "unrated" — not "normal".
function buildLab({ aadhaar, row, user, hospital, date, doctorName, fromReport = false }) {
  const range = parseReferenceRange(row.referenceRange);
  const isDoctor = user.role === "doctor";

  return new LabResult({
    aadhaar,
    testName: String(row.testName).trim(),
    resultValue: String(row.resultValue).trim(),
    unit: String(row.unit || "").trim(),
    referenceRange: String(row.referenceRange || "").trim(),
    refLow: range ? range.low : null,
    refHigh: range ? range.high : null,
    status: STATUSES.includes(row.status) ? row.status : computeLabStatus(row.resultValue, row.referenceRange) || "unrated",
    date: date || new Date(),
    hospital,
    source: isDoctor ? "doctor" : "patient",
    fromReport,
    ...(isDoctor ? { doctorRegId: user.doctorRegId, doctorName } : {})
  });
}

// only doctors add to the shared hospital list; patients' free text stays on their own record
const resolveHospital = (user, value) => (user.role === "doctor" ? ensureHospital(value) : clean(value));

// ✅ ADD LAB RESULT
exports.addLabResult = async (req, res) => {
  try {
    const { testName, resultValue } = req.body;

    if (!testName || !resultValue) {
      return res.status(400).json({ message: "aadhaar, testName and resultValue are required ❌" });
    }

    const { date, error } = parseRecordDate(req.body.date);
    if (error) return res.status(400).json({ message: error });

    const labResult = buildLab({
      aadhaar: req.targetAadhaar,
      row: req.body,
      user: req.user,
      hospital: await resolveHospital(req.user, req.body.hospital),
      date,
      doctorName: req.user.role === "doctor" ? await getDoctorName(req.user.doctorRegId) : ""
    });

    await labResult.save();
    res.status(201).json(labResult);
  } catch (err) {
    console.error("❌ ADD LAB RESULT ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

// ✅ BULK ADD — the rows a person reviewed and confirmed after uploading a lab report.
// Status is always worked out server-side from the value and range.
exports.addLabResultsBulk = async (req, res) => {
  try {
    const rows = req.body.rows;
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_BULK_ROWS) {
      return res.status(400).json({ message: `Send between 1 and ${MAX_BULK_ROWS} results ❌` });
    }

    const { date, error } = parseRecordDate(req.body.date);
    if (error) return res.status(400).json({ message: error });

    const cleanRows = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const testName = String(r.testName ?? "").trim().slice(0, 80);
      const resultValue = String(r.resultValue ?? "").trim().slice(0, 20);
      if (!testName || !resultValue) {
        return res.status(400).json({ message: `Result ${i + 1}: test name and value are required ❌` });
      }
      cleanRows.push({
        testName,
        resultValue,
        unit: String(r.unit ?? "").trim().slice(0, 20),
        referenceRange: String(r.referenceRange ?? "").trim().slice(0, 40)
      });
    }

    const hospital = await resolveHospital(req.user, req.body.hospital);
    const doctorName = req.user.role === "doctor" ? await getDoctorName(req.user.doctorRegId) : "";

    const docs = cleanRows.map((row) =>
      buildLab({ aadhaar: req.targetAadhaar, row, user: req.user, hospital, date, doctorName, fromReport: true })
    );
    for (const doc of docs) await doc.save();

    res.status(201).json({ saved: docs.length });
  } catch (err) {
    console.error("❌ BULK ADD LAB RESULTS ERROR:", err);
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
