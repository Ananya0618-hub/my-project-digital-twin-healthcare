const Patient = require("../models/Patient");
const Treatment = require("../models/Treatment");
const LabResult = require("../models/LabResult");

const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";

// Strict, non-diagnostic system prompt — matches R4.3/R4.4 from the project report:
// the assistant must summarize/organize only, never diagnose or recommend treatment.
const SYSTEM_PROMPT = `You are a health-record summarization assistant inside the HealthMirror app.
You will be given a patient's stored treatment records and lab results as structured data.

Your job is ONLY to:
- Organize and summarize what is already recorded, in plain, friendly language
- Point out simple patterns (e.g. "you've had two fever episodes this month")
- Explain what a lab value being outside its reference range typically means in general terms

You must NEVER:
- Provide a diagnosis
- Recommend or suggest any medication, dosage, or treatment
- Tell the patient what they "should" do medically
- Speculate about conditions not explicitly present in the given data

Always end your response with this exact line on its own:
"This is an informational summary of your own records, not medical advice — please talk to a doctor about any concerns."

Keep the summary concise: 3-6 short paragraphs or bullet points, plain language, no jargon without a brief explanation.`;

exports.summarizePatient = async (req, res) => {
  try {
    const { aadhaar } = req.body;

    if (!aadhaar) {
      return res.status(400).json({ message: "aadhaar is required ❌" });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        message: "AI summarization isn't configured yet — ANTHROPIC_API_KEY is missing in .env ❌"
      });
    }

    const [patient, treatments, labResults] = await Promise.all([
      Patient.findOne({ aadhaar_id: aadhaar }),
      Treatment.find({ aadhaar }).sort({ createdAt: 1 }),
      LabResult.find({ aadhaar }).sort({ createdAt: 1 })
    ]);

    if (!patient) {
      return res.status(404).json({ message: "Patient not found ❌" });
    }

    if (treatments.length === 0 && labResults.length === 0) {
      return res.json({
        summary:
          "There isn't any treatment or lab history recorded yet, so there's nothing to summarize. " +
          "Once you add some records, come back here and I'll organize them for you."
      });
    }

    const dataForModel = {
      patientName: patient.name,
      treatments: treatments.map(t => ({ diagnosis: t.diagnosis, medication: t.medication })),
      labResults: labResults.map(l => ({
        testName: l.testName,
        resultValue: l.resultValue,
        unit: l.unit,
        referenceRange: l.referenceRange,
        status: l.status
      }))
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Here is this patient's stored record data as JSON:\n\n${JSON.stringify(dataForModel, null, 2)}\n\nPlease summarize it for the patient.`
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ CLAUDE API ERROR:", response.status, errText);
      return res.status(502).json({ message: "AI service error ❌" });
    }

    const data = await response.json();
    const summary = data.content?.[0]?.text || "No summary could be generated.";

    res.json({ summary });
  } catch (err) {
    console.error("❌ SUMMARIZE ERROR:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
};
