const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Patient = require("../models/Patient");

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    console.log("REGISTER HIT");
    console.log("BODY:", req.body);

    const { aadhaar, password, name } = req.body;

    // ✅ validation
    if (!aadhaar || !password) {
      return res.status(400).json({
        message: "Aadhaar & Password required ❌"
      });
    }

    if (aadhaar.length !== 12) {
      return res.status(400).json({
        message: "Aadhaar must be 12 digits ❌"
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

    // ✅ create patient profile
    const existingPatient = await Patient.findOne({
      aadhaar_id: aadhaar
    });

    if (!existingPatient) {
      const newPatient = new Patient({
        name: name || "New Patient",
        aadhaar_id: aadhaar
      });

      await newPatient.save();
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
        aadhaar: user.aadhaar
      },
      "secret123",
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