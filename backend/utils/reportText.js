const path = require("path");
const sharp = require("sharp");
const { createWorker } = require("tesseract.js");

// Turns an uploaded lab report (digital PDF or photo/screenshot) into plain text.
// Nothing is written to disk. Errors are ReportError with a code the controller maps to a status.

class ReportError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const MAX_PDF_PAGES = 8;
const MAX_TEXT_CHARS = 60000;
const MIN_TEXT_CHARS = 40;
const OCR_TIMEOUT_MS = 120000;
const PDF_TIMEOUT_MS = 30000;
const MAX_WAITING = 3; // OCR runs one at a time on this small server; a few can queue, the rest are told to retry
const WORKER_IDLE_MS = 90000; // free the OCR engine's memory when nobody's using it

// ---- file type (don't trust the client's content-type) ---------------------
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString("latin1") === "PNG") return "image";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image";
  return null;
}

function withTimeout(promise, ms, onTimeout) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(async () => {
      try {
        if (onTimeout) await onTimeout();
      } finally {
        reject(new ReportError("TIMEOUT", "Reading the report took too long ❌ — try a clearer or smaller image"));
      }
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ---- PDF with selectable text ----------------------------------------------
// Rebuild table rows: items on the same baseline form one line, and wide gaps
// become a run of spaces so "name   value   unit   range" stays separable.
function linesFromItems(items) {
  const rows = [];
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const size = Math.abs(it.transform[0]) || 10;
    const y = it.transform[5];
    let row = rows.find((r) => Math.abs(r.y - y) <= Math.max(2, size * 0.35));
    if (!row) rows.push((row = { y, items: [] }));
    row.items.push({ x: it.transform[4], w: it.width, size, str: it.str });
  }

  rows.sort((a, b) => b.y - a.y);
  return rows
    .map((r) => {
      r.items.sort((a, b) => a.x - b.x);
      let line = "";
      let prevEnd = null;
      for (const it of r.items) {
        if (prevEnd !== null) {
          const gap = it.x - prevEnd;
          line += gap > it.size * 1.2 ? "   " : gap > it.size * 0.12 ? " " : "";
        }
        line += it.str;
        prevEnd = it.x + it.w;
      }
      return line.trim();
    })
    .filter(Boolean)
    .join("\n");
}

async function pdfToText(buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0
    }).promise;
  } catch (err) {
    if (err && err.name === "PasswordException") throw new ReportError("PASSWORD", "This PDF is password-protected ❌");
    throw new ReportError("UNREADABLE", "Couldn't open that PDF ❌");
  }

  try {
    const pages = [];
    let total = 0;
    for (let i = 1; i <= Math.min(doc.numPages, MAX_PDF_PAGES) && total < MAX_TEXT_CHARS; i++) {
      const page = await doc.getPage(i);
      const text = linesFromItems((await page.getTextContent()).items);
      page.cleanup();
      pages.push(text);
      total += text.length;
    }
    return pages.join("\n");
  } finally {
    await doc.destroy().catch(() => {});
  }
}

// ---- photo / screenshot: OCR ---------------------------------------------------
let worker = null;
let workerInit = null;
let idleTimer = null;
let waiting = 0;
let chain = Promise.resolve();

function workerOptions() {
  // Language data is cached next to the app (the same eng.traineddata the Aadhaar OCR already uses).
  // TESSDATA_DIR lets tests/offline setups point at a local copy.
  const opts = { cachePath: path.join(__dirname, "..") };
  if (process.env.TESSDATA_DIR) Object.assign(opts, { langPath: process.env.TESSDATA_DIR, gzip: false });
  return opts;
}

function getWorker() {
  if (!workerInit) {
    workerInit = createWorker("eng", 1, workerOptions())
      .then(async (w) => {
        // keep wide gaps between table columns, and treat the page as one block of rows
        await w.setParameters({ preserve_interword_spaces: "1", tessedit_pageseg_mode: process.env.OCR_PSM || "6" });
        worker = w;
        return w;
      })
      .catch((err) => {
        workerInit = null;
        throw err;
      });
  }
  return workerInit;
}

async function killWorker() {
  const w = worker;
  worker = null;
  workerInit = null;
  if (w) await w.terminate().catch(() => {});
}

function scheduleIdleShutdown() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (waiting === 0) killWorker();
  }, WORKER_IDLE_MS);
  if (idleTimer.unref) idleTimer.unref();
}

// Preparing the picture is what makes OCR reliable on phone photos. Measured on degraded test photos
// (tilt, JPEG noise, shadows): a plain grayscale+sharpen version got ~26/98 rows fully right, this gets ~68.
//   1. scale to about 300 DPI for an A4 page (small screenshots are enlarged, big photos shrunk),
//      with a pixel cap so a huge image can't exhaust this small server's memory
//   2. divide the page by a heavily blurred copy of itself, which cancels shadows and uneven light
//   3. black-and-white: a pixel is text if it is clearly darker than the paper around it
const TARGET_WIDTH = 2500;
const MAX_SCALE = 4;
const MAX_PIXELS = 12_000_000;
const INK_RATIO = 0.75; // darker than 75% of the local paper brightness = ink
const SIZE_OPTS = { failOn: "none", limitInputPixels: 60_000_000 };

async function prepareImage(buffer) {
  try {
    const meta = await sharp(buffer, SIZE_OPTS).metadata();
    const rotated = meta.orientation >= 5; // phone photos carry an EXIF rotation; width/height swap
    const w0 = rotated ? meta.height : meta.width;
    const h0 = rotated ? meta.width : meta.height;

    const scale = Math.min(MAX_SCALE, TARGET_WIDTH / w0, Math.sqrt(MAX_PIXELS / (w0 * h0)));
    const width = Math.max(1, Math.round(w0 * scale));
    const height = Math.max(1, Math.round(h0 * scale));

    if (process.env.OCR_PREPROCESS === "legacy") {
      // kill-switch back to the simple pipeline, in case the new one misbehaves on some input
      return await sharp(buffer, SIZE_OPTS).rotate().resize({ width, height, fit: "fill" }).grayscale().normalize().sharpen().png().toBuffer();
    }

    // NB: .toColourspace("b-w") is needed, otherwise .raw() hands back 3 channels
    const { data, info } = await sharp(buffer, SIZE_OPTS)
      .rotate()
      .resize({ width, height, fit: "fill", kernel: "lanczos3" })
      .toColourspace("b-w")
      .raw()
      .toBuffer({ resolveWithObject: true });

    const paper = await sharp(data, { raw: { width: info.width, height: info.height, channels: 1 } })
      .blur(Math.max(8, Math.round(info.width * 0.022)))
      .toColourspace("b-w") // without this .raw() returns 3 channels and every pixel is compared with the wrong value
      .raw()
      .toBuffer();

    if (info.channels !== 1 || paper.length !== data.length) {
      throw new ReportError("INTERNAL", "Image preparation produced an unexpected layout");
    }

    const bw = Buffer.allocUnsafe(data.length);
    for (let i = 0; i < data.length; i++) {
      bw[i] = data[i] >= INK_RATIO * Math.max(paper[i], 8) ? 255 : 0;
    }
    // 300 DPI: tesseract sizes its text assumptions from this, and warns about a bogus 25 dpi without it
    return await sharp(bw, { raw: { width: info.width, height: info.height, channels: 1 } }).withMetadata({ density: 300 }).png().toBuffer();
  } catch (err) {
    if (err instanceof ReportError) throw err;
    throw new ReportError("UNREADABLE", "Couldn't open that image ❌");
  }
}

function runOcr(png) {
  if (waiting >= MAX_WAITING) {
    throw new ReportError("BUSY", "The report reader is busy right now ❌ — try again in a minute");
  }
  waiting++;

  const job = chain.then(async () => {
    try {
      const w = await getWorker();
      const result = await withTimeout(w.recognize(png), OCR_TIMEOUT_MS, killWorker);
      return result.data.text || "";
    } finally {
      waiting--;
      scheduleIdleShutdown();
    }
  });
  chain = job.catch(() => {});
  return job;
}

// ---- entry point -----------------------------------------------------------------
async function extractText(buffer) {
  const kind = sniff(buffer);
  if (!kind) throw new ReportError("BAD_TYPE", "That doesn't look like a JPG, PNG, WebP or PDF file ❌");

  let text;
  if (kind === "pdf") {
    text = await withTimeout(pdfToText(buffer), PDF_TIMEOUT_MS);
    if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS) {
      throw new ReportError("SCANNED_PDF", "This PDF is a scan with no selectable text ❌ — upload a photo or screenshot of the page instead");
    }
  } else {
    text = await runOcr(await prepareImage(buffer));
  }

  return { kind, text: text.slice(0, MAX_TEXT_CHARS) };
}

module.exports = { extractText, ReportError, sniff, linesFromItems, prepareImage };
