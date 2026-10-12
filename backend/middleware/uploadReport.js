const multer = require("multer");

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

const upload = multer({
  storage: multer.memoryStorage(), // the report is processed in memory and never written to disk
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error("Upload a JPG, PNG, WebP or PDF ❌"), { code: "BAD_TYPE" }));
  }
});

// Same as upload.single("report"), but upload problems come back as JSON the UI can show.
module.exports = (req, res, next) => {
  upload.single("report")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "That file is too large — keep it under 8 MB ❌" });
    if (err.code === "BAD_TYPE") return res.status(415).json({ message: err.message });
    console.error("❌ REPORT UPLOAD ERROR:", err.code || err.message);
    res.status(400).json({ message: "Couldn't read the upload ❌" });
  });
};
