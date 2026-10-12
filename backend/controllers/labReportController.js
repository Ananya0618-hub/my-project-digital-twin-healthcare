const { extractText } = require("../utils/reportText");
const { extractLabRows } = require("../utils/labExtract");

// POST /api/labresults/extract (multipart, field "report")
// Reads an uploaded lab report and returns DRAFT rows. Nothing is saved here — the
// client shows them for review and sends the confirmed ones to /bulk.
// The file is processed in memory and discarded; report text is never logged.

// Reading reports uses real CPU/RAM on a small server, so each login gets a modest allowance.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const hits = new Map();

function overLimit(key) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

const ERROR_STATUS = { BAD_TYPE: 415, SCANNED_PDF: 422, PASSWORD: 422, UNREADABLE: 422, BUSY: 429, TIMEOUT: 504 };

exports.extractReport = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Choose a lab report to upload ❌" });

  const who = req.user.role === "doctor" ? `d:${req.user.doctorRegId}` : `p:${req.user.aadhaar}`;
  if (overLimit(who)) {
    return res.status(429).json({ message: "That's a lot of reports in a short time ❌ — wait a few minutes and try again" });
  }

  try {
    const started = Date.now();
    const { kind, text } = await extractText(req.file.buffer);

    if (text.replace(/\s/g, "").length < 40) {
      return res.status(422).json({ message: "Couldn't find readable text in that file ❌ — try a clearer photo or a PDF" });
    }

    const result = await extractLabRows(text);
    console.log(`📄 LAB REPORT READ: ${kind}, ${result.rows.length} rows (${result.method}), ${Date.now() - started}ms`);

    if (result.rows.length === 0) {
      return res.status(422).json({ message: "No lab results could be found in that file ❌ — you can still enter them by hand" });
    }

    res.json(result);
  } catch (err) {
    if (err.code && ERROR_STATUS[err.code]) return res.status(ERROR_STATUS[err.code]).json({ message: err.message });
    console.error("❌ LAB REPORT EXTRACT ERROR:", err.code || err.message);
    res.status(500).json({ message: "Couldn't read that report ❌" });
  }
};
