const test = require("node:test");
const assert = require("node:assert");
const { parseAadhaarXml } = require("../utils/aadhaarXml");

const PHOTO = Buffer.from("PHOTOBYTES".repeat(400)).toString("base64");
// shaped like the real file: Certificate > CertificateData > KycRes > UidData > Poi/Poa/LData/Pht, plus a signature
const xml = (poi = `<Poi dob="14-03-1999" gender="F" name="Bhoomi Testperson"/>`, uid = `<UidData tkn="" uid="XXXXXXXX7391">`, root = "Certificate") =>
  `<?xml version="1.0" encoding="UTF-8"?><${root}><CertificateData><KycRes code="c" ret="Y" ts="2026-11-11T10:00:00" ttl="2027-11-11T10:00:00" txn="t">${uid}${poi}` +
  `<Poa country="India" dist="Pune" house="12 Flat" pc="411045" state="Maharashtra" vtc="Pune"/><LData lang="06" name="local"/><Pht>${PHOTO}</Pht></UidData></KycRes></CertificateData>` +
  `<Signature><SignedInfo/><SignatureValue>AAAA</SignatureValue></Signature></${root}>`;

test("reads name, date of birth and the masked Aadhaar from a real-shaped document", () => {
  assert.deepStrictEqual(parseAadhaarXml(xml()), { ok: true, name: "Bhoomi Testperson", dob: "14-03-1999", gender: "F", maskedUid: "XXXXXXXX7391" });
});

test("tolerates namespaces, attribute order, single quotes elsewhere, and entities in names", () => {
  const ns = `<?xml version="1.0"?><ns2:Certificate xmlns:ns2="urn:x"><ns2:CertificateData><ns2:KycRes><ns2:UidData uid="XXXXXXXX7391"><ns2:Poi name="D&apos;Souza &amp; Sons &#233;" gender="M" dob="1999"/></ns2:UidData></ns2:KycRes></ns2:CertificateData></ns2:Certificate>`;
  assert.deepStrictEqual(parseAadhaarXml(ns), { ok: true, name: "D'Souza & Sons é", dob: "1999", gender: "M", maskedUid: "XXXXXXXX7391" });
  assert.strictEqual(parseAadhaarXml(xml(`<Poi gender="F" name="A &gt; B" dob="01-01-2000"/>`)).name, "A > B");
  assert.strictEqual(parseAadhaarXml(xml(`<Poi dob="14-03-1999" name="Quote &quot;Q&quot; Person" gender="F">`.replace(">", "/>"))).name, 'Quote "Q" Person');
});

test("a '>' inside an attribute value doesn't break reading the tag", () => {
  assert.strictEqual(parseAadhaarXml(xml(`<Poi name="Weird > Name" dob="14-03-1999" gender="F"/>`)).name, "Weird > Name");
});

test("refuses anything that isn't exactly one well-formed Aadhaar document, with a reason code and nothing from the file", () => {
  const cases = {
    empty: [null, undefined, "", "   ", 42, {}],
    not_an_aadhaar_document: ["<html><body>login</body></html>", '{"name":"x"}', "%PDF-1.4 ..."],
    unsafe_xml: ['<!DOCTYPE x [<!ENTITY a "aaaa">]>' + xml(), "<!ENTITY zzz 'x'>" + xml()],
    unexpected_structure: [xml(`<Poi name="A" dob="1" /><Poi name="B" dob="2" />`), xml(``), xml(undefined, `<UidData uid="XXXXXXXX1111"></UidData><UidData uid="XXXXXXXX2222">`)],
    missing_fields: [xml(`<Poi dob="14-03-1999"/>`), xml(`<Poi name="X" dob="14-03-1999"/>`, `<UidData tkn="">`)],
    too_large: [xml() + " ".repeat(400 * 1024)]
  };
  for (const [reason, inputs] of Object.entries(cases)) {
    for (const input of inputs) {
      const r = parseAadhaarXml(input);
      assert.deepStrictEqual(r, { ok: false, reason }, `${reason}: ${String(input).slice(0, 40)}`);
    }
  }
});

test("entities are never expanded beyond the standard ones, so a 'billion laughs' file does nothing", () => {
  const bomb = `<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">]>` + xml(`<Poi name="&lol2;" dob="14-03-1999"/>`);
  assert.strictEqual(parseAadhaarXml(bomb).reason, "unsafe_xml");
  assert.strictEqual(parseAadhaarXml(xml(`<Poi name="&lol2; x" dob="14-03-1999"/>`)).name, "&lol2; x"); // unknown entity stays as plain text
});

test("the photo, address and signature are never part of what is returned", () => {
  const r = parseAadhaarXml(xml());
  assert.deepStrictEqual(Object.keys(r).sort(), ["dob", "gender", "maskedUid", "name", "ok"]);
  assert.ok(!JSON.stringify(r).includes("PHOTO") && !JSON.stringify(r).includes("Pune") && !JSON.stringify(r).includes("411045"));
});
