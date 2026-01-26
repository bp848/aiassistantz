// Minimal Gemini health check from Node.
// Usage:
//   VITE_GEMINI_API_KEY="..." node scripts/verify-gemini.mjs
//   GEMINI_API_KEY="..." node scripts/verify-gemini.mjs

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Missing VITE_GEMINI_API_KEY (or GEMINI_API_KEY).');
  process.exit(1);
}

const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
  model
)}:generateContent?key=${encodeURIComponent(apiKey)}`;

const body = {
  contents: [{ role: 'user', parts: [{ text: 'ping' }] }]
};

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

if (!res.ok) {
  const text = await res.text();
  console.error(`FAIL (${res.status})`);
  console.error(text);
  process.exit(2);
}

console.log('OK');

