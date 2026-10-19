const buckets = new Map();

// Records one hit for `key` and says whether it is now over the limit (true = refuse).
// Old hits fall out of the window as time passes.
function tooMany(key, { windowMs, max }) {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  return false;
}

module.exports = { tooMany };
