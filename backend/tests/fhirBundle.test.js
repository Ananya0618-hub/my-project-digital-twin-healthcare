const test = require("node:test");
const assert = require("node:assert");
const { buildBundle, toFhirBirthDate } = require("../utils/fhirBundle");

const patient = { _id: "665f1c", name: "Anaya", mobile: "9545450130", email: "a@b.com", dob: "08/09/2006", address: "Pune" };
const treatments = [
  { diagnosis: "High blood sugar", medication: "Metformin", date: new Date("2026-08-01"), hospital: "AIIMS Delhi", doctorName: "Asha Rao", source: "doctor" },
  { diagnosis: "Hypertension", medication: "Not specified in source FHIR record", date: new Date("2026-07-01"), source: "fhir-sandbox" }
];
const labs = [
  { testName: "Vitamin D", resultValue: "9", unit: "ng/mL", referenceRange: "30-100", status: "low", date: new Date("2026-08-02"), doctorName: "Asha Rao" },
  { testName: "Total Cholesterol", resultValue: "225", unit: "mg/dL", referenceRange: "< 200", status: "high", date: new Date("2026-08-03") },
  { testName: "COVID antigen", resultValue: "Positive", unit: "", referenceRange: "", status: "normal", date: new Date("2026-08-04") }
];

test("toFhirBirthDate", () => {
  assert.strictEqual(toFhirBirthDate("08/09/2006"), "2006-09-08");
  assert.strictEqual(toFhirBirthDate("2006-09-08"), "2006-09-08");
  assert.strictEqual(toFhirBirthDate("whenever"), undefined);
  assert.strictEqual(toFhirBirthDate(""), undefined);
});

test("bundle has the right shape and every reference resolves", () => {
  const b = buildBundle({ patient, treatments, labs });

  assert.strictEqual(b.resourceType, "Bundle");
  assert.strictEqual(b.type, "collection");
  assert.ok(!Number.isNaN(Date.parse(b.timestamp)));

  const urls = new Set(b.entry.map((e) => e.fullUrl));
  assert.strictEqual(urls.size, b.entry.length, "fullUrls are unique");

  const counts = {};
  for (const e of b.entry) {
    assert.strictEqual(e.fullUrl, `urn:uuid:${e.resource.id}`);
    counts[e.resource.resourceType] = (counts[e.resource.resourceType] || 0) + 1;
    for (const ref of JSON.stringify(e.resource).match(/urn:uuid:[0-9a-f-]+/g) || []) {
      assert.ok(urls.has(ref), `dangling reference ${ref}`);
    }
  }
  // 1 patient, 2 conditions, 1 medication (the placeholder one is skipped), 3 observations
  assert.deepStrictEqual(counts, { Patient: 1, Condition: 2, MedicationStatement: 1, Observation: 3 });
});

test("patient resource", () => {
  const p = buildBundle({ patient, treatments: [], labs: [] }).entry[0].resource;
  assert.strictEqual(p.resourceType, "Patient");
  assert.strictEqual(p.birthDate, "2006-09-08");
  assert.deepStrictEqual(p.name, [{ text: "Anaya" }]);
  assert.strictEqual(p.identifier[0].value, "665f1c");
});

test("observations: quantity, interpretation, reference range", () => {
  const obs = buildBundle({ patient, treatments: [], labs }).entry.map((e) => e.resource).filter((r) => r.resourceType === "Observation");

  const vitD = obs.find((o) => o.code.text === "Vitamin D");
  assert.deepStrictEqual(vitD.valueQuantity, { value: 9, unit: "ng/mL" });
  assert.strictEqual(vitD.interpretation[0].coding[0].code, "L");
  assert.deepStrictEqual(vitD.referenceRange[0].low, { value: 30, unit: "ng/mL" });
  assert.deepStrictEqual(vitD.referenceRange[0].high, { value: 100, unit: "ng/mL" });
  assert.strictEqual(vitD.performer[0].display, "Asha Rao");

  const chol = obs.find((o) => o.code.text === "Total Cholesterol");
  assert.strictEqual(chol.interpretation[0].coding[0].code, "H");
  assert.strictEqual(chol.referenceRange[0].low, undefined);
  assert.strictEqual(chol.referenceRange[0].high.value, 200);

  const covid = obs.find((o) => o.code.text === "COVID antigen");
  assert.strictEqual(covid.valueQuantity, undefined);
  assert.strictEqual(covid.valueString, "Positive");
  assert.strictEqual(covid.referenceRange, undefined);
});

test("conditions and medications link together", () => {
  const b = buildBundle({ patient, treatments, labs: [] });
  const res = b.entry.map((e) => e.resource);
  const cond = res.find((r) => r.resourceType === "Condition" && r.code.text === "High blood sugar");
  const med = res.find((r) => r.resourceType === "MedicationStatement");
  assert.strictEqual(med.reasonReference[0].reference, b.entry.find((e) => e.resource === cond).fullUrl);
  assert.strictEqual(cond.recorder.display, "Asha Rao");
  assert.strictEqual(cond.note[0].text, "Recorded at AIIMS Delhi");
});

test("an unrated result is exported without an interpretation (it must not read as normal)", () => {
  const b = buildBundle({
    patient,
    treatments: [],
    labs: [
      { testName: "RBC Count", resultValue: "4.85", unit: "million/cumm", referenceRange: "", status: "unrated", date: new Date("2026-08-02") },
      { testName: "Vitamin D", resultValue: "9", unit: "ng/mL", referenceRange: "30-100", status: "low", date: new Date("2026-08-02") }
    ]
  });
  const obs = b.entry.map((e) => e.resource).filter((r) => r.resourceType === "Observation");
  assert.strictEqual(obs.find((o) => o.code.text === "RBC Count").interpretation, undefined);
  assert.strictEqual(obs.find((o) => o.code.text === "Vitamin D").interpretation[0].coding[0].code, "L");
});
