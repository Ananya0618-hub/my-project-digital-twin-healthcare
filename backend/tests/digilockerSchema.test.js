const test = require("node:test");
const assert = require("node:assert");

// The DigiLocker code queries and updates these fields by name. The in-memory test database would not notice a
// misspelled or renamed field, so this checks them against the REAL schemas.
test("the fields the DigiLocker flow reads and writes exist on the real models", () => {
  const User = require("../models/User");
  const Doctor = require("../models/Doctor");
  const Patient = require("../models/Patient");

  // free pre-check before paying for a verification
  assert.ok(User.schema.path("aadhaar"), "User.aadhaar");
  assert.ok(Doctor.schema.path("aadhaarNumber"), "Doctor.aadhaarNumber");

  // flagging an account that appeared while its owner was verifying
  assert.ok(Patient.schema.path("aadhaar_id"), "Patient.aadhaar_id");
  for (const [model, label] of [[Patient, "Patient"], [Doctor, "Doctor"]]) {
    assert.ok(model.schema.path("digilockerVerified"), `${label}.digilockerVerified`);
    assert.ok(model.schema.path("digilockerVerifiedAt"), `${label}.digilockerVerifiedAt`);
  }
});
