// Single source for the JWT signing secret. The "secret123" fallback keeps
// tokens already issued to logged-in users valid; set JWT_SECRET in .env to
// replace it (that invalidates existing sessions — users just log in again).
module.exports = { JWT_SECRET: process.env.JWT_SECRET || "secret123" };
