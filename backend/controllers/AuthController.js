const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Patient = require("../models/Patient");
const { isVerified } = require("../utils/verificationStore");
const { JWT_SECRET } = require("../config/jwt");
const { generateUnique } = require("../utils/registrationNumber");

// Creates the patient with a freshly issued registration number. Two sign-ups racing for the same
// number is vanishingly unlikely, but the unique index would reject the loser, so try again.
async function createPatientWithNumber(fields) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const registrationNumber = await generateUnique(async (n) => !!(await Patient.findOne({ registrationNumber: n })));
    try {
      const patient = new Patient({ ...fields, registrationNumber });
      await patient.save();
      return patient;
    } catch (err) {
      const clashOnNumber = err && err.code === 11000 && err.keyPattern && err.keyPattern.registrationNumber;
      if (!clashOnNumber) throw err;
    }
  }
  throw new Error("Couldn't issue a registration number — please try again");
}

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    console.log("REGISTER HIT");
    console.log("BODY:", req.body);

    const { aadhaar, password, name, mobile, email, address, dob } = req.body;

    // ✅ validation
    if (!aadhaar || !password || !name) {
      return res.status(400).json({
        message: "Name, Aadhaar & Password required ❌"
      });
    }

    if (aadhaar.length !== 12) {
      return res.status(400).json({
        message: "Aadhaar must be 12 digits ❌"
      });
    }

    if (mobile && !/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({
        message: "Mobile must be a 10 digit number ❌"
      });
    }

    // ✅ check existing user
    const existingUser = await User.findOne({ aadhaar });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists ❌"
      });
    }

    // ✅ hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ create user
    const newUser = new User({
      aadhaar,
      password: hashedPassword
    });

    await newUser.save();

    // ✅ create patient profile — Step 1 (Register) style customer intake
    const existingPatient = await Patient.findOne({
      aadhaar_id: aadhaar
    });

    if (!existingPatient) {
      try {
        await createPatientWithNumber({
          name: name || "New Patient",
          aadhaar_id: aadhaar,
          mobile: mobile || "",
          email: email || "",
          address: address || "",
          dob: dob || "",
          digilockerVerified: isVerified(aadhaar),
          digilockerVerifiedAt: isVerified(aadhaar) ? new Date() : null
        });
      } catch (err) {
        // don't leave a login behind with no patient profile: it would block signing up again
        await User.findByIdAndDelete(newUser._id);
        throw err;
      }
    }

    res.status(201).json({
      message: "Registered successfully ✅"
    });

  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);
    res.status(500).json({
      message: err.message || "Server error ❌"
    });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    console.log("LOGIN HIT");
    console.log("BODY:", req.body);

    const { aadhaar, password } = req.body;

    // ✅ validation
    if (!aadhaar || !password) {
      return res.status(400).json({
        message: "All fields required ❌"
      });
    }

    // 🔥 FIND USER
    const user = await User.findOne({ aadhaar });
    console.log("USER FOUND:", user);

    if (!user) {
      return res.status(400).json({
        message: "User not found ❌"
      });
    }

    // 🔥 CHECK PASSWORD
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("PASSWORD MATCH:", isMatch);

    if (!isMatch) {
      return res.status(400).json({
        message: "Wrong password ❌"
      });
    }

    // 🔥 GENERATE TOKEN
    const token = jwt.sign(
      {
        id: user._id,
        aadhaar: user.aadhaar,
        role: "patient"
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 🔥 FINAL RESPONSE
    console.log("SENDING RESPONSE:", user.aadhaar);

    res.json({
      message: "Login successful ✅",
      token,
      aadhaar: user.aadhaar
    });

  } catch (err) {
    console.error("🔥 LOGIN ERROR:", err);
    res.status(500).json({
      message: err.message || "Server error ❌"
    });
  }
};