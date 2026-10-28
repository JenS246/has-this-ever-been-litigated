import { createServer } from 'node:http';

const PORT = Number.parseInt(process.env.PORT || '8793', 10);
const COURTLISTENER_TOKEN = process.env.COURTLISTENER_TOKEN || '';
const ALLOWED_ORIGINS = new Set([
  'https://jens246.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
const SEARCH_URL = 'https://www.courtlistener.com/api/rest/v4/search/';
const CACHE_TTL_MS = 10 * 60 * 1000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 30;
const cache = new Map();
const requestCounts = new Map();

createServer(async (request, response) => {
  const origin = request.headers.origin || '';
  if (origin && ALLOWED_ORIGINS.has(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Accept');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method === 'OPTIONS') return response.writeHead(204).end();
  if (request.method !== 'GET') return sendJson(response, 405, { detail: 'Method not allowed.' });

  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (requestUrl.pathname === '/api/health') {
    return sendJson(response, COURTLISTENER_TOKEN ? 200 : 503, {
      ok: Boolean(COURTLISTENER_TOKEN),
      service: 'has-this-ever-been-litigated-api',
    });
  }
  if (requestUrl.pathname !== '/api/search') return sendJson(response, 404, { detail: 'Not found.' });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return sendJson(response, 403, { detail: 'Origin not allowed.' });
  if (!COURTLISTENER_TOKEN) return sendJson(response, 503, { detail: 'Search is temporarily unavailable.' });

  const clientAddress = (request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown').toString().split(',')[0].trim();
  if (!withinRateLimit(clientAddress)) return sendJson(response, 429, { detail: 'Too many searches. Give it a moment, then try again.' });

  const term = (requestUrl.searchParams.get('q') || '').trim().replace(/\s+/g, ' ');
  if (!term || term.length > 80 || /[\u0000-\u001f\u007f]/.test(term)) {
    return sendJson(response, 400, { detail: 'Enter a valid word or short phrase, up to 80 characters.' });
  }

  const cacheKey = term.toLocaleLowerCase('en-US');
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return sendJson(response, 200, cached.body);
  if (cached) cache.delete(cacheKey);

  const upstreamUrl = new URL(SEARCH_URL);
  upstreamUrl.searchParams.set('type', 'o');
  upstreamUrl.searchParams.set('highlight', 'on');
  upstreamUrl.searchParams.set('q', `"${term.replace(/[\\"]/g, '\\$&')}"`);

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: `Token ${COURTLISTENER_TOKEN}`,
        'User-Agent': 'has-this-ever-been-litigated/1.0 (https://github.com/JenS246/has-this-ever-been-litigated)',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (upstream.status === 429) return sendJson(response, 429, { detail: 'The opinion archive is busy. Give it a moment, then try again.' });
    if (!upstream.ok) return sendJson(response, 502, { detail: 'The opinion archive did not answer. Please try again.' });
    const body = await upstream.json();
    cache.set(cacheKey, { body, expiresAt: Date.now() + CACHE_TTL_MS });
    return sendJson(response, 200, body);
  } catch {
    return sendJson(response, 502, { detail: 'The opinion archive did not answer. Please try again.' });
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`has-this-ever-been-litigated-api listening on 0.0.0.0:${PORT}`);
});

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

function withinRateLimit(address) {
  const now = Date.now();
  const existing = requestCounts.get(address);
  if (!existing || existing.resetsAt <= now) {
    requestCounts.set(address, { count: 1, resetsAt: now + RATE_WINDOW_MS });
    return true;
  }
  existing.count += 1;
  return existing.count <= RATE_LIMIT;
}
