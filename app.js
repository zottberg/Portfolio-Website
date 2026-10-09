// Zero-dependency Node server for the portfolio (GoDaddy cPanel "Setup Node.js App": startup file = app.js).
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// Only these files are ever served, so server code and dotfiles stay private.
const FILES = {
  '/favicon.svg': { file: 'favicon.svg', type: 'image/svg+xml' },
  '/apple-touch-icon.png': { file: 'apple-touch-icon.png', type: 'image/png' },
  '/og-image.png': { file: 'og-image.png', type: 'image/png' },
  '/Ani-Iashvili-Resume-2026.pdf': { file: 'Ani-Iashvili-Resume-2026.pdf', type: 'application/pdf' },
};

// Forced-download route: /download/resume
const DOWNLOADS = {
  '/download/resume': { file: 'Ani-Iashvili-Resume-2026.pdf', name: 'Ani-Iashvili-Resume-2026.pdf' },
};

function send(res, status, headers, filePath, method) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    res.writeHead(status, { ...headers, 'Content-Length': stat.size });
    if (method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

// index.html carries __ORIGIN__ placeholders in its <head> (social cards need absolute image URLs).
// Only the head is rewritten per request; the large body is sent as-is from memory.
let page = null;
function loadPage() {
  const file = path.join(ROOT, 'index.html');
  const mtime = fs.statSync(file).mtimeMs;
  if (!page || page.mtime !== mtime) {
    const buf = fs.readFileSync(file);
    const cut = buf.indexOf('</head>') + '</head>'.length;
    page = { mtime, head: buf.subarray(0, cut).toString('utf8'), tail: buf.subarray(cut) };
  }
  return page;
}

function sendIndex(req, res) {
  let p;
  try { p = loadPage(); } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }
  const proto = String(req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http')).split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost').split(',')[0].trim().replace(/[^a-zA-Z0-9.:\-\[\]]/g, '');
  const head = Buffer.from(p.head.split('__ORIGIN__').join(`${proto}://${host}`), 'utf8');
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
    'Content-Length': head.length + p.tail.length,
  });
  if (req.method === 'HEAD') return res.end();
  res.write(head);
  res.end(p.tail);
}

http
  .createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end();
    }

    const pathname = decodeURIComponent(req.url.split('?')[0]);

    if (pathname === '/' || pathname === '/index.html') return sendIndex(req, res);

    const dl = DOWNLOADS[pathname];
    if (dl) {
      return send(res, 200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${dl.name}"`,
        'Cache-Control': 'public, max-age=3600',
      }, path.join(ROOT, dl.file), req.method);
    }

    const entry = FILES[pathname];
    if (entry) {
      return send(res, 200, {
        'Content-Type': entry.type,
        'Cache-Control': 'public, max-age=300',
      }, path.join(ROOT, entry.file), req.method);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  })
  .listen(PORT, () => console.log(`Portfolio running on port ${PORT}`));
