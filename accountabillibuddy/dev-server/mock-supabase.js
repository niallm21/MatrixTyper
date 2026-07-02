/* Minimal in-memory stand-in for the Supabase REST (PostgREST) subset the app
   uses. For local two-device testing only — real deployments use Supabase.
   Run: node mock-supabase.js [port]                                        */
'use strict';
const http = require('http');

const db = { pairs: [], members: [], events: [] };
let nextId = 1;

function send(res, code, body) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'apikey, authorization, content-type, prefer',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

/* supports PostgREST-style filters: ?col=eq.value & id=gt.N & order=id.asc */
function applyFilters(rows, query) {
  let out = rows;
  for (const [k, v] of query.entries()) {
    if (k === 'order' || k === 'select') continue;
    const [op, ...rest] = v.split('.');
    const val = rest.join('.');
    if (op === 'eq') out = out.filter((r) => String(r[k]) === val);
    if (op === 'gt') out = out.filter((r) => Number(r[k]) > Number(val));
  }
  if (query.get('order') === 'id.asc') out = [...out].sort((a, b) => a.id - b.id);
  return out;
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url, 'http://x');
  const m = url.pathname.match(/^\/rest\/v1\/(pairs|members|events)$/);
  if (!m) return send(res, 404, { message: 'not found' });
  const table = m[1];

  if (req.method === 'GET') return send(res, 200, applyFilters(db[table], url.searchParams));

  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const row = Object.assign(JSON.parse(body), {
          id: nextId++, created_at: new Date().toISOString(),
        });
        db[table].push(row);
        send(res, 201, [row]);
      } catch { send(res, 400, { message: 'bad json' }); }
    });
    return;
  }
  send(res, 405, { message: 'method not allowed' });
});

const port = Number(process.argv[2]) || 8787;
server.listen(port, () => console.log('mock supabase on :' + port));
