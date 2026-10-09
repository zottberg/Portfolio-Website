// Zero-dependency Node server for the portfolio (GoDaddy cPanel "Setup Node.js App": startup file = app.js).
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// Only these files are ever served, so server code and dotfiles stay private.
const FILES = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { file: 'index.html', type: 'text/html; charset=utf-8' },
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

http
  .createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end();
    }

    const pathname = decodeURIComponent(req.url.split('?')[0]);

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
