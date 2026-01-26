// Minimal Gmail API check from Node.
// Usage:
//   GOOGLE_ACCESS_TOKEN="ya29...." node scripts/verify-gmail.mjs
//
// This checks whether Gmail API is reachable/enabled for the current token.

const token = process.env.GOOGLE_ACCESS_TOKEN;
if (!token) {
  console.error('Missing GOOGLE_ACCESS_TOKEN.');
  process.exit(1);
}

const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
  headers: { Authorization: `Bearer ${token}` }
});

const text = await res.text();
if (!res.ok) {
  console.error(`FAIL (${res.status})`);
  console.error(text);
  process.exit(2);
}

console.log('OK');

