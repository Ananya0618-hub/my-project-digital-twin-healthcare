const test = require("node:test");
const assert = require("node:assert");
const { extractText, sniff, linesFromItems, ReportError } = require("../utils/reportText");

test("file type is decided from the bytes, not the claimed content-type", () => {
  assert.strictEqual(sniff(Buffer.from("%PDF-1.7\n....................")), "pdf");
  assert.strictEqual(sniff(Buffer.concat([Buffer.from([0x89]), Buffer.from("PNG\r\n\x1a\n"), Buffer.alloc(8)])), "image");
  assert.strictEqual(sniff(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)])), "image");
  assert.strictEqual(sniff(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")])), "image");
  assert.strictEqual(sniff(Buffer.from("<html><script>alert(1)</script></html>")), null);
  assert.strictEqual(sniff(Buffer.from("MZ" + "x".repeat(40))), null);
  assert.strictEqual(sniff(Buffer.alloc(3)), null);
});

test("extractText rejects things that aren't images or PDFs, and corrupt files", async () => {
  await assert.rejects(extractText(Buffer.from("just some text, definitely not a report")), (e) => e instanceof ReportError && e.code === "BAD_TYPE");
  await assert.rejects(extractText(Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from("garbage".repeat(20))])), (e) => e.code === "UNREADABLE");
  await assert.rejects(extractText(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("not really a jpeg".repeat(5))])), (e) => e.code === "UNREADABLE");
});

test("PDF text items on one baseline become one line, with wide gaps kept as column breaks", () => {
  const item = (str, x, y, width, size = 10) => ({ str, transform: [size, 0, 0, size, x, y], width });
  const text = linesFromItems([
    item("RBC Count", 50, 700, 45),
    item("4.85", 270, 700, 20),
    item("million/cumm", 360, 700, 60),
    item("Haemoglobin", 50, 720, 55),
    item("13.2", 270, 720, 18),
    item("Hb", 100, 720.5, 10) // slightly off the baseline, still the same row
  ]);
  const lines = text.split("\n");
  assert.strictEqual(lines.length, 2);
  assert.match(lines[0], /^Haemoglobin\s*Hb\s{3}13\.2$/);                // higher on the page = first
  assert.match(lines[1], /^RBC Count\s{3}4\.85\s{3}million\/cumm$/);
});
