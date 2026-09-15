const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Doctor = require("../models/Doctor");
const { isVerified } = require("../utils/verificationStore");

// ================= REGISTER =================
exports.registerDoctor = async (req, res) => {
  try {
    const { name, doctorRegId, specialty, phone, email, password, aadhaarNumber } = req.body;

    if (!name || !doctorRegId || !password) {
      return res.status(400).json({
        message: "Name, Doctor Registration ID and Password are required ❌"
      });
    }

    const existingDoctor = await Doctor.findOne({ doctorRegId });
    if (existingDoctor) {
      return res.status(400).json({
        message: "A doctor with this Registration ID already exists ❌"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verified = aadhaarNumber ? isVerified(aadhaarNumber) : false;

    const newDoctor = new Doctor({
      name,
      doctorRegId,
      specialty: specialty || "",
      phone: phone || "",
      email: email || "",
      password: hashedPassword,
      aadhaarNumber: aadhaarNumber || "",
      digilockerVerified: verified,
      digilockerVerifiedAt: verified ? new Date() : null
    });

    await newDoctor.save();

    res.status(201).json({ message: "Doctor registered successfully ✅" });
  } catch (err) {
    console.error("❌ DOCTOR REGISTER ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};

// ================= LOGIN =================
exports.loginDoctor = async (req, res) => {
  try {
    const { doctorRegId, password } = req.body;

    if (!doctorRegId || !password) {
      return res.status(400).json({ message: "All fields required ❌" });
    }

    const doctor = await Doctor.findOne({ doctorRegId });
    if (!doctor) {
      return res.status(400).json({ message: "Doctor not found ❌" });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password ❌" });
    }

    const token = jwt.sign(
      { id: doctor._id, doctorRegId: doctor.doctorRegId, role: "doctor" },
      "secret123",
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful ✅",
      token,
      doctorRegId: doctor.doctorRegId,
      name: doctor.name,
      specialty: doctor.specialty
    });
  } catch (err) {
    console.error("❌ DOCTOR LOGIN ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};
