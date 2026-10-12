const Patient = require("../models/Patient");
const Treatment = require("../models/Treatment");
const LabResult = require("../models/LabResult");
const { buildBundle } = require("../utils/fhirBundle");
const { sortByRecordDate } = require("../utils/recordInput");

// GET /api/fhir/export/:aadhaar — the patient's record as a FHIR R4 Bundle.
// Access (own record, or consented doctor) is enforced by route middleware.
exports.exportBundle = async (req, res) => {
  try {
    const aadhaar = req.targetAadhaar;

    const patient = await Patient.findOne({ aadhaar_id: aadhaar });
    if (!patient) return res.status(404).json({ message: "Patient not found ❌" });

    const [treatments, labs] = await Promise.all([
      Treatment.find({ aadhaar }),
      LabResult.find({ aadhaar })
    ]);

    res.type("application/fhir+json").send(JSON.stringify(buildBundle({ patient, treatments: sortByRecordDate(treatments, 1), labs: sortByRecordDate(labs, 1) }), null, 2));
  } catch (err) {
    console.error("❌ FHIR EXPORT ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};
