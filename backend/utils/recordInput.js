// Shared validation for the fields common to treatments and lab results.

// -> { date } (Date or undefined = use the default) or { error }
function parseRecordDate(value) {
  if (value === undefined || value === null || value === "") return { date: undefined };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { error: "Invalid date ❌" };
  if (d.getTime() > Date.now() + 24 * 60 * 60 * 1000) return { error: "Date can't be in the future ❌" };
  return { date: d };
}

// Newest first (dir = -1) or oldest first (dir = 1). Records saved before `date`
// existed fall back to createdAt.
function sortByRecordDate(rows, dir = -1) {
  const t = (r) => new Date(r.date || r.createdAt || 0).getTime();
  return [...rows].sort((a, b) => (t(a) - t(b)) * (dir < 0 ? -1 : 1));
}

module.exports = { parseRecordDate, sortByRecordDate };
