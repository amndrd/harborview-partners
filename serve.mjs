// Static server for the harborviewpartners.com mirror.
//   node serve.mjs [port]        ->  http://localhost:8080
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2] || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.hdr': 'image/vnd.radiance',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.map': 'application/json',
};

function resolve(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split('?')[0].split('#')[0]); } catch { p = urlPath; }
  // block traversal
  const safe = path.normalize(p).replace(/^(\.\.[/\\])+/, '');
  let f = path.join(ROOT, safe);
  if (!f.startsWith(ROOT)) return null;

  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;

  // clean URL: /about -> /about/index.html ; /about.html
  for (const cand of [f + '/index.html', f + '.html']) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  return null;
}

// Webflow's commerce JS asks its backend for a CSRF token before rendering
// product/cart pages. There is no backend here, so mint one locally and mirror
// the live response shape ({"ok":1} + a wf-csrf cookie) to keep those pages quiet.
function wfGraphqlStub(req, res) {
  const p = req.url.split('?')[0];
  if (!p.startsWith('/.wf_graphql/')) return false;
  const token = Buffer.from(String(Math.random()) + Date.now()).toString('base64url').slice(0, 43);
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };
  if (p.endsWith('/csrf')) {
    headers['Set-Cookie'] = [`wf-csrf=${token}; path=/; samesite=lax`, `wf-csrf.sig=${token}; path=/; samesite=lax; httponly`];
    res.writeHead(200, headers);
    return res.end(JSON.stringify({ ok: 1 })), true;
  }
  // Every other commerce call (apollo, …) needs a real Webflow backend. The live
  // site answers those with 401 for anonymous visitors and its JS degrades
  // cleanly, so return the same thing rather than a body the JS can't parse.
  res.writeHead(401, headers);
  return res.end(JSON.stringify({ ok: 0, msg: 'Unauthorized', code: 'Unauthorized' })), true;
}

http.createServer((req, res) => {
  if (wfGraphqlStub(req, res)) return;
  const file = resolve(req.url);
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('<h1>404</h1><p>' + req.url + '</p>');
  }
  const ext = path.extname(file).toLowerCase();
  const stat = fs.statSync(file);
  const type = MIME[ext] || 'application/octet-stream';

  // range support so <video> can seek
  const range = req.headers.range;
  if (range && /^bytes=/.test(range)) {
    const [s, e] = range.replace('bytes=', '').split('-');
    const start = parseInt(s, 10) || 0;
    const end = e ? parseInt(e, 10) : stat.size - 1;
    res.writeHead(206, {
      'Content-Type': type,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
    });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }

  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`Harborview Partners mirror  ->  http://localhost:${PORT}`);
});
