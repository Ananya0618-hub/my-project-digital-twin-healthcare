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

test("photo preparation: shadows cancel out, ink becomes black, paper becomes white (font-free check)", async () => {
  const sharp = require("sharp");
  const { prepareImage } = require("../utils/reportText");

  // A 600x800 'page' lit from one side (paper brightness 110 on the dark side up to 235 on the bright
  // side), with four patches of text-like ink: 3px vertical strokes every 9px, drawn at 40% of the
  // local paper brightness. (Thin strokes, like real text — not solid fills.)
  const W = 600;
  const H = 800;
  const page = Buffer.alloc(W * H);
  const paperAt = (x) => Math.round(110 + (125 * x) / (W - 1));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) page[y * W + x] = paperAt(x);

  const patches = [[60, 100], [60, 600], [480, 100], [480, 600]]; // [x, y] of 60x40 patches
  const strokes = []; // [x, y] of a pixel in the middle of a stroke
  for (const [bx, by] of patches) {
    for (let sx = bx; sx < bx + 60; sx += 9) {
      for (let y = by; y < by + 40; y++) for (let x = sx; x < sx + 3; x++) page[y * W + x] = Math.round(paperAt(x) * 0.4);
      strokes.push([sx + 1, by + 20]);
    }
  }
  const input = await sharp(page, { raw: { width: W, height: H, channels: 1 } }).jpeg({ quality: 92 }).toBuffer();

  const png = await prepareImage(input);
  const { data, info } = await sharp(png).toColourspace("b-w").raw().toBuffer({ resolveWithObject: true });
  assert.strictEqual(info.channels, 1);
  assert.ok(info.width >= 2000, "small images are scaled up for OCR");
  assert.ok(data.every((v) => v === 0 || v === 255), "output is pure black and white");

  const k = info.width / W; // scale factor
  const at = (x, y) => data[Math.round(y * k) * info.width + Math.round(x * k)];

  const inked = strokes.filter(([x, y]) => at(x, y) === 0).length;
  assert.strictEqual(inked, strokes.length, `${strokes.length - inked} of ${strokes.length} strokes were lost`);
  // paper stays white on both the dark and the bright side of the page, including between strokes
  for (const [x, y] of [[20, 300], [300, 300], [580, 300], [20, 700], [580, 700], [64, 120], [484, 620]]) {
    assert.strictEqual(at(x, y), 255, `paper at (${x},${y}) must be white — even on the dark side of the page`);
  }
});

test("photo preparation: shrinks huge images and keeps the pixel count bounded", async () => {
  const sharp = require("sharp");
  const { prepareImage } = require("../utils/reportText");
  const big = await sharp({ create: { width: 5000, height: 4000, channels: 3, background: "#f0f0f0" } }).jpeg().toBuffer();
  const { info } = await sharp(await prepareImage(big)).metadata().then((m) => ({ info: m }));
  assert.ok(info.width * info.height <= 12_000_000 * 1.01, `${info.width}x${info.height} exceeds the cap`);
});
