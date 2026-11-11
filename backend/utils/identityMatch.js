// Decides whether the person who logged into DigiLocker is the person the registration form describes.
// The document gives: the LAST DIGITS of the Aadhaar number, the date of birth, and the name.
// The form gives: the full Aadhaar number, a DD/MM/YYYY date of birth (patients only), and a name.
// All available facts must agree. The only thing ever reported back is WHICH category disagreed —
// never what the document said.

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysIn = (y, m) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

// "14/03/1999", "14-3-1999", "14.03.1999" (day first, as in India), "1999-03-14", or just "1999" -> {y,m,d} | {y} | null
function parseDob(value, now = new Date()) {
  const s = String(value ?? "").trim();
  const year = (y) => y >= 1900 && y <= now.getUTCFullYear();
  let m = s.match(/^(\d{4})$/);
  if (m) return year(+m[1]) ? { y: +m[1] } : null;

  let y, mo, d;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) [y, mo, d] = [+m[1], +m[2], +m[3]];
  else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) [d, mo, y] = [+m[1], +m[2], +m[3]];
  else return null;

  if (!year(y) || mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
  if (Date.UTC(y, mo - 1, d) > now.getTime()) return null;
  return { y, m: mo, d };
}

// Some Aadhaar records hold only a year of birth; then only the year can be compared.
function dobMatches(formDob, documentDob) {
  const f = parseDob(formDob);
  const a = parseDob(documentDob);
  if (!f || !a) return false;
  if (a.m === undefined) return f.y === a.y;
  return f.m !== undefined && f.y === a.y && f.m === a.m && f.d === a.d;
}

// The document shows the Aadhaar masked, e.g. XXXXXXXX1234. Compare the visible tail; fewer than 4 digits proves too little.
function uidTailMatches(formAadhaar, maskedUid) {
  const tail = (String(maskedUid).match(/(\d+)$/) || [])[1] || "";
  return /^\d{12}$/.test(String(formAadhaar)) && tail.length >= 4 && String(formAadhaar).endsWith(tail);
}

const HONORIFICS = new Set(["mr", "mrs", "ms", "miss", "dr", "prof", "shri", "sri", "smt", "kumari", "km", "late"]);

const nameTokens = (s) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !HONORIFICS.has(t));

function withinOneEdit(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length || i === b.length) return true;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i);
}

// Order doesn't matter, a middle or last name may be missing from one side, initials match a name that starts
// with them, and a one-letter typo is forgiven in longer names. At least one real name must match in full,
// so "A B" can't stand in for "Anamika Bhatt".
function namesMatch(formName, documentName) {
  const f = nameTokens(formName);
  const d = nameTokens(documentName);
  if (!f.length || !d.length) return false;

  const [short, long] = f.length <= d.length ? [f, d] : [d, f];
  const used = new Set();
  let real = 0;

  for (const t of short) {
    let hit = -1;
    for (let i = 0; i < long.length && hit < 0; i++) {
      if (used.has(i)) continue;
      const u = long[i];
      if (t === u) {
        hit = i;
        if (t.length >= 3) real++;
      } else if (t.length === 1 && u.startsWith(t)) hit = i;
      else if (u.length === 1 && t.startsWith(u)) hit = i;
      else if (t.length >= 5 && u.length >= 5 && withinOneEdit(t, u)) {
        hit = i;
        real++;
      }
    }
    if (hit < 0) return false;
    used.add(hit);
  }
  return real >= 1;
}

// claimed: what the form said { aadhaar, name, dob? }   document: what DigiLocker returned { maskedUid, name, dob }
// -> { ok, mismatches: ["aadhaar" | "dob" | "name", ...] }
function compareIdentity(claimed, document) {
  const mismatches = [];
  if (!uidTailMatches(claimed.aadhaar, document.maskedUid)) mismatches.push("aadhaar");
  if (claimed.dob && !dobMatches(claimed.dob, document.dob)) mismatches.push("dob");
  if (!namesMatch(claimed.name, document.name)) mismatches.push("name");
  return { ok: mismatches.length === 0, mismatches };
}

module.exports = { parseDob, dobMatches, uidTailMatches, namesMatch, compareIdentity, nameTokens };
