// Reads the three facts the identity check needs out of the e-Aadhaar XML that DigiLocker returns:
//   <UidData uid="XXXXXXXX1234"> <Poi name="..." dob="DD-MM-YYYY" gender="F"/> ... <Pht>photo</Pht> ...
// Deliberately NOT a general XML parser: it looks only at the <UidData> and <Poi> start tags, never expands
// entities (only the five standard ones and numeric references are decoded), refuses documents that declare
// a DOCTYPE or ENTITY, and ignores everything else — the photo, the address and the signature are never read.
// Failures carry a reason code only; no part of the document ever ends up in an error message.

const MAX_CHARS = 300 * 1024; // real files are ~10 KB

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, ref) => {
    if (ref[0] === "#") {
      const code = ref[1].toLowerCase() === "x" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return NAMED[ref.toLowerCase()];
  });
}

function attributesOf(tagBody) {
  const out = {};
  const re = /([A-Za-z_][\w.:-]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(tagBody))) out[m[1]] = decode(m[2]);
  return out;
}

// every start tag <name ...> (with or without a namespace prefix), as { attribute: value }
function startTags(xml, name) {
  const re = new RegExp(`<(?:[\\w.-]+:)?${name}\\b((?:[^>"']|"[^"]*"|'[^']*')*)>`, "g");
  const found = [];
  let m;
  while ((m = re.exec(xml))) found.push(attributesOf(m[1]));
  return found;
}

const fail = (reason) => ({ ok: false, reason });

function parseAadhaarXml(xml) {
  if (typeof xml !== "string" || xml.trim() === "") return fail("empty");
  if (xml.length > MAX_CHARS) return fail("too_large");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) return fail("unsafe_xml");
  if (!/<(?:[\w.-]+:)?Certificate\b/.test(xml)) return fail("not_an_aadhaar_document");

  const poi = startTags(xml, "Poi");
  const uid = startTags(xml, "UidData");
  if (poi.length !== 1 || uid.length !== 1) return fail("unexpected_structure"); // exactly one of each, or we don't guess

  const name = (poi[0].name || "").trim();
  const maskedUid = (uid[0].uid || "").trim();
  if (!name || !maskedUid) return fail("missing_fields");

  return { ok: true, name, dob: (poi[0].dob || "").trim(), gender: (poi[0].gender || "").trim(), maskedUid };
}

module.exports = { parseAadhaarXml };
