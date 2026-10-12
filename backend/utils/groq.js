// Minimal Groq chat call for structured extraction. Throws an Error with .code:
//   NO_KEY (not configured) | AI_HTTP (non-2xx, .status set) | AI_TIMEOUT
async function chatCompletion({ system, user, maxTokens = 4096, timeoutMs = 45000 }) {
  if (!process.env.GROQ_API_KEY) throw Object.assign(new Error("GROQ_API_KEY missing"), { code: "NO_KEY" });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        temperature: 0,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });
    if (!res.ok) throw Object.assign(new Error(`Groq HTTP ${res.status}`), { code: "AI_HTTP", status: res.status });

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (err) {
    if (err.name === "AbortError") throw Object.assign(new Error("Groq timeout"), { code: "AI_TIMEOUT" });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { chatCompletion };
