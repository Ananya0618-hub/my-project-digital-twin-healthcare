// One-time job: give every existing patient a registration number.
//   node scripts/backfill-registration-numbers.js            -> dry run: only counts, writes nothing
//   node scripts/backfill-registration-numbers.js --apply    -> assigns the numbers
// Run from the backend folder (it reads MONGO_URI from .env). Safe to run again.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const { backfillRegistrationNumbers } = require("../utils/backfillRegistration");

(async () => {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);
  await Patient.init(); // make sure the unique index exists before writing numbers

  const result = await backfillRegistrationNumbers({
    dryRun: !apply,
    findMissing: () => Patient.find({ registrationNumber: { $exists: false } }, { _id: 1 }).lean(),
    isTaken: async (n) => !!(await Patient.exists({ registrationNumber: n })),
    // native driver on purpose: the schema marks the field immutable; this only writes if it is still unset
    assign: async (p, n) => (await Patient.collection.updateOne({ _id: p._id, registrationNumber: { $exists: false } }, { $set: { registrationNumber: n } })).modifiedCount === 1
  });

  console.log(apply ? "APPLIED" : "DRY RUN (nothing written — add --apply to write)");
  console.log(`patients without a number: ${result.missing}, assigned: ${result.assigned}, skipped: ${result.skipped}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error("Backfill failed:", err.message);
  process.exit(1);
});
