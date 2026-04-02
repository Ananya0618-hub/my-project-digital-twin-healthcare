exports.getDigitalTwinByPatient = (req, res) => {
  const { aadhaar_id } = req.params;

  res.json({
    aadhaar_id,
    heartRate: 72,
    bloodPressure: "120/80",
    riskLevel: "Low"
  });
};