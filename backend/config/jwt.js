// Single source for the JWT signing secret. No production fallback:
// the server refuses to start without a real secret.
// Under Node's test runner (NODE_TEST_CONTEXT) or NODE_ENV=test, a test-only
// secret is allowed so the suite runs without a .env.
const inTest =
  process.env.NODE_ENV === "test" || Boolean(process.env.NODE_TEST_CONTEXT);

const secret = process.env.JWT_SECRET || (inTest ? "test-only-secret" : null);

if (!secret || (!inTest && secret.length < 32)) {
  throw new Error("JWT_SECRET is missing or too short — set it in backend/.env");
}

module.exports = { JWT_SECRET: secret };
