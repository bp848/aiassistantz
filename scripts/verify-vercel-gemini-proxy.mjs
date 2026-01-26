// Verifies the Vercel Gemini proxy handler (api/gemini-proxy.cjs) in-process.
//
// Usage:
//   GEMINI_API_KEY="..." node scripts/verify-vercel-gemini-proxy.mjs
//
// Notes:
// - This does NOT start an HTTP server; it calls the handler directly with mock req/res.
// - Requires Node 18+ (global fetch) and the installed @google/genai dependency.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const handler = require('../api/gemini-proxy.cjs');

if (!process.env.GEMINI_API_KEY && !process.env.VITE_GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY (recommended) or VITE_GEMINI_API_KEY.');
  process.exit(1);
}

const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const req = {
  method: 'POST',
  body: {
    model,
    contents: [{ role: 'user', parts: [{ text: 'ping' }] }]
  }
};

const res = (() => {
  const headers = {};
  let statusCode = 200;
  let body = '';
  return {
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    get statusCode() {
      return statusCode;
    },
    set statusCode(v) {
      statusCode = v;
    },
    end(chunk) {
      body += chunk || '';
      try {
        const json = JSON.parse(body || '{}');
        if (statusCode >= 200 && statusCode < 300) {
          console.log('OK');
          process.exit(0);
        }
        console.error(`FAIL (${statusCode})`);
        console.error(JSON.stringify(json, null, 2));
        process.exit(2);
      } catch {
        console.error(`FAIL (${statusCode})`);
        console.error(body);
        process.exit(2);
      }
    }
  };
})();

await handler(req, res);

