// Static server for the harborviewpartners.com mirror.
//   node serve.mjs [port]        ->  http://localhost:8080
//
// Sert aussi /api/chat, le relais du chatbot vers l'API Claude (voir
// api/_lib/chat-core.mjs). En production, c'est la fonction serverless
// api/chat.mjs qui joue ce rôle — la logique, elle, est la même.
//   ANTHROPIC_API_KEY=sk-ant-... node serve.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ChatError,
  checkRateLimit,
  createChatStream,
  STREAM_HEADERS,
} from './api/_lib/chat-core.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2] || 8080);

// Dossiers de code serveur : jamais servis comme fichiers statiques. Sans ce
// garde-fou, http://localhost:8080/api/_lib/persona.mjs afficherait le prompt
// système en clair dans le navigateur.
const PRIVATE_DIRS = [/^\/api\//i, /^\/netlify\//i];

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

/* ---------- Relais du chatbot ----------
   Pont entre l'API node:http (req/res en flux Node) et le cœur partagé, qui
   parle le format standard du Web (ReadableStream). Le corps est lu en
   entier avant l'appel — un message de chat est court, et la limite ci-dessous
   empêche qu'un client envoie un corps sans fin. */
async function handleChat(req, res) {
  const respondJson = (status, payload) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  };

  if (req.method !== 'POST') return respondJson(405, { error: 'Method not allowed.' });

  try {
    const body = await readJsonBody(req);
    checkRateLimit(req.socket.remoteAddress || 'local');
    const stream = await createChatStream(body);

    res.writeHead(200, STREAM_HEADERS);
    for await (const chunk of stream) {
      // Si le visiteur ferme l'onglet en cours de réponse, on cesse d'écrire.
      if (res.writableEnded) break;
      res.write(chunk);
    }
    res.end();
  } catch (e) {
    if (res.headersSent) return res.end();
    if (e instanceof ChatError) return respondJson(e.status, { error: e.message });
    console.error('[chat] erreur inattendue :', e);
    respondJson(500, { error: 'Something went wrong.' });
  }
}

function readJsonBody(req, limit = 128 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const parts = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new ChatError(413, 'Message too long.'));
        req.destroy();
        return;
      }
      parts.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(parts).toString('utf8')));
      } catch {
        reject(new ChatError(400, 'Malformed request.'));
      }
    });
    req.on('error', reject);
  });
}

http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (urlPath === '/api/chat') return handleChat(req, res);

  const file = PRIVATE_DIRS.some((re) => re.test(urlPath)) ? null : resolve(req.url);
  if (!file) {
    const page = path.join(ROOT, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.existsSync(page) ? fs.readFileSync(page) : '<h1>404</h1>');
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
