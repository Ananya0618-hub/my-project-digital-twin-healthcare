const Treatment = require("../models/Treatment");
const LabResult = require("../models/LabResult");

// Public, free, no-auth FHIR R4 sandbox — the healthcare equivalent of what
// Sandbox.co.in was for the KYC Accelerator project. Not production data;
// HAPI regularly purges and reloads this server with fixed synthetic test data.
const FHIR_BASE = "https://hapi.fhir.org/baseR4";

async function fetchFhir(url) {
  const res = await fetch(url, { headers: { Accept: "application/fhir+json" } });
  if (!res.ok) throw new Error(`FHIR request failed: ${res.status}`);
  return res.json();
}

function deriveStatus(value, low, high) {
  if (typeof value !== "number") return "normal";
  if (typeof low === "number" && value < low) return "low";
  if (typeof high === "number" && value > high) return "high";
  return "normal";
}

exports.importFromFhirSandbox = async (req, res) => {
  try {
    const { aadhaar } = req.body;

    if (!aadhaar) {
      return res.status(400).json({ message: "aadhaar is required ❌" });
    }

    let conditions = [];
    let observations = [];
    let sourcePatientId = null;
    let attempts = 0;

    // The sandbox has patients with wildly varying amounts of recorded data —
    // try a few random ones until we land on one with usable conditions/labs.
    while (attempts < 6 && conditions.length === 0 && observations.length === 0) {
      attempts++;

      const offset = Math.floor(Math.random() * 500);
      const patientBundle = await fetchFhir(
        `${FHIR_BASE}/Patient?_count=1&_getpagesoffset=${offset}`
      );
      const patientEntry = patientBundle.entry?.[0];
      if (!patientEntry) continue;

      sourcePatientId = patientEntry.resource.id;

      const [condBundle, obsBundle] = await Promise.all([
        fetchFhir(`${FHIR_BASE}/Condition?patient=${sourcePatientId}&_count=5`),
        fetchFhir(`${FHIR_BASE}/Observation?patient=${sourcePatientId}&category=laboratory&_count=5`)
      ]);

      conditions = (condBundle.entry || [])
        .map(e => e.resource)
        .filter(c => c.code?.text || c.code?.coding?.[0]?.display);

      observations = (obsBundle.entry || [])
        .map(e => e.resource)
        .filter(
          o =>
            (o.code?.text || o.code?.coding?.[0]?.display) &&
            o.valueQuantity?.value !== undefined
        );
    }

    if (conditions.length === 0 && observations.length === 0) {
      return res.status(502).json({
        message: "Couldn't find usable sample data on the FHIR sandbox that time — try again ❌"
      });
    }

    const savedTreatments = [];
    for (const c of conditions.slice(0, 3)) {
      const diagnosis = c.code?.text || c.code?.coding?.[0]?.display || "Unspecified condition";
      const treatment = new Treatment({
        aadhaar,
        diagnosis,
        medication: "Not specified in source FHIR record"
      });
      await treatment.save();
      savedTreatments.push(treatment);
    }

    const savedLabs = [];
    for (const o of observations.slice(0, 3)) {
      const testName = o.code?.text || o.code?.coding?.[0]?.display || "Lab test";
      const value = o.valueQuantity?.value;
      const unit = o.valueQuantity?.unit || "";
      const low = o.referenceRange?.[0]?.low?.value;
      const high = o.referenceRange?.[0]?.high?.value;
      const referenceRange =
        low !== undefined && high !== undefined ? `${low} - ${high}` : "";
      const status = deriveStatus(value, low, high);

      const labResult = new LabResult({
        aadhaar,
        testName,
        resultValue: String(value),
        unit,
        referenceRange,
        status
      });
      await labResult.save();
      savedLabs.push(labResult);
    }

    res.json({
      message: "Imported sample data from the public FHIR sandbox ✅",
      sourcePatientId,
      treatmentsImported: savedTreatments.length,
      labResultsImported: savedLabs.length
    });
  } catch (err) {
    console.error("❌ FHIR IMPORT ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};
