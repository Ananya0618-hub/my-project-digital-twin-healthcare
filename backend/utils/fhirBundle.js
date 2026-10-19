const crypto = require("crypto");
const { parseReferenceRange, parseValue } = require("./labStatus");

const OBS_INTERPRETATION = "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation";
const INTERPRETATION = {
  low: { code: "L", display: "Low" },
  normal: { code: "N", display: "Normal" },
  high: { code: "H", display: "High" }
};

// "18/06/2006" -> "2006-06-18"; passes through ISO dates; anything else dropped.
function toFhirBirthDate(dob) {
  if (!dob) return undefined;
  const dmy = String(dob).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : undefined;
}

const iso = (d) => {
  const t = d ? new Date(d) : null;
  return t && !Number.isNaN(t.getTime()) ? t.toISOString() : undefined;
};

const uuidRef = () => `urn:uuid:${crypto.randomUUID()}`;
const PLACEHOLDER_MED = /^not specified/i;

const quantity = (value, unit) =>
  value === null || value === undefined ? undefined : { value, ...(unit ? { unit } : {}) };

// Builds a FHIR R4 "collection" Bundle from a patient's stored records.
// The Aadhaar number is deliberately NOT included: the patient is identified
// by an internal id only.
function buildBundle({ patient, treatments, labs }) {
  const entries = [];
  const add = (fullUrl, resource) => entries.push({ fullUrl, resource: { ...resource, id: fullUrl.slice(9) } });

  const patientRef = uuidRef();
  entries.push({
    fullUrl: patientRef,
    resource: {
      resourceType: "Patient",
      id: patientRef.slice(9),
      identifier: [
        { system: "urn:healthmirror:patient-id", value: String(patient._id) },
        ...(patient.registrationNumber ? [{ system: "urn:healthmirror:registration-number", value: patient.registrationNumber }] : [])
      ],
      name: [{ text: patient.name }],
      ...(patient.mobile || patient.email
        ? {
            telecom: [
              ...(patient.mobile ? [{ system: "phone", value: patient.mobile }] : []),
              ...(patient.email ? [{ system: "email", value: patient.email }] : [])
            ]
          }
        : {}),
      ...(toFhirBirthDate(patient.dob) ? { birthDate: toFhirBirthDate(patient.dob) } : {}),
      ...(patient.address ? { address: [{ text: patient.address }] } : {})
    }
  });

  const noteFor = (rec) => (rec.hospital ? [{ text: `Recorded at ${rec.hospital}` }] : undefined);
  const byDoctor = (rec) => (rec.doctorName ? { display: rec.doctorName } : undefined);

  for (const t of treatments) {
    const conditionRef = uuidRef();
    const recordedDate = iso(t.date);

    add(conditionRef, {
      resourceType: "Condition",
      clinicalStatus: {
        coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }]
      },
      code: { text: t.diagnosis },
      subject: { reference: patientRef },
      ...(recordedDate ? { recordedDate } : {}),
      ...(byDoctor(t) ? { recorder: byDoctor(t) } : {}),
      ...(noteFor(t) ? { note: noteFor(t) } : {})
    });

    if (t.medication && !PLACEHOLDER_MED.test(t.medication)) {
      add(uuidRef(), {
        resourceType: "MedicationStatement",
        status: "unknown",
        medicationCodeableConcept: { text: t.medication },
        subject: { reference: patientRef },
        ...(recordedDate ? { effectiveDateTime: recordedDate } : {}),
        reasonReference: [{ reference: conditionRef }]
      });
    }
  }

  for (const l of labs) {
    const num = parseValue(l.resultValue);
    const isNumeric = num !== null && /^\s*-?\d*\.?\d+\s*$/.test(String(l.resultValue).replace(/,/g, ""));
    const range = parseReferenceRange(l.referenceRange);
    const effective = iso(l.date);

    add(uuidRef(), {
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            { system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory", display: "Laboratory" }
          ]
        }
      ],
      code: { text: l.testName },
      subject: { reference: patientRef },
      ...(effective ? { effectiveDateTime: effective } : {}),
      ...(byDoctor(l) ? { performer: [byDoctor(l)] } : {}),
      ...(isNumeric ? { valueQuantity: quantity(num, l.unit) } : { valueString: `${l.resultValue}${l.unit ? " " + l.unit : ""}` }),
      ...(INTERPRETATION[l.status]
        ? { interpretation: [{ coding: [{ system: OBS_INTERPRETATION, ...INTERPRETATION[l.status] }] }] }
        : {}),
      ...(l.referenceRange
        ? {
            referenceRange: [
              {
                ...(range && range.low !== null ? { low: quantity(range.low, l.unit) } : {}),
                ...(range && range.high !== null ? { high: quantity(range.high, l.unit) } : {}),
                text: l.referenceRange
              }
            ]
          }
        : {}),
      ...(noteFor(l) ? { note: noteFor(l) } : {})
    });
  }

  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: entries
  };
}

module.exports = { buildBundle, toFhirBirthDate };
