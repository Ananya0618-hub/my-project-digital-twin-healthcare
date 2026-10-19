const { generateUnique } = require("./registrationNumber");

// Gives a registration number to every patient who doesn't have one yet.
// The database access is injected so the logic can be tested without a database:
//   findMissing()          -> patients that have no registrationNumber
//   isTaken(number)        -> boolean
//   assign(patient, number)-> true if it was written, false if the patient already got one meanwhile
// Safe to re-run: patients that already have a number are never touched.
async function backfillRegistrationNumbers({ findMissing, isTaken, assign, dryRun = true }) {
  const missing = await findMissing();
  const result = { missing: missing.length, assigned: 0, skipped: 0 };
  if (dryRun) return result;

  for (const patient of missing) {
    const number = await generateUnique(isTaken);
    if (await assign(patient, number)) result.assigned++;
    else result.skipped++;
  }
  return result;
}

module.exports = { backfillRegistrationNumbers };
