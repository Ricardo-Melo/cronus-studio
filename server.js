const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleApiRequest } = require('./api.js');

let PORT = parseInt(process.env.PORT) || 5173;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

process.on('uncaughtException', (err) => {
  console.error('Server handled uncaughtException:', err.message);
});

const server = http.createServer((req, res) => {
  req.on('error', () => {});
  res.on('error', () => {});

  let reqPath = req.url.split('?')[0];

  // Roteamento da API REST conectada ao SQLite
  if (reqPath.startsWith('/api/')) {
    return handleApiRequest(req, res);
  }

  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, decodeURIComponent(reqPath));

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {});
    stream.pipe(res);
  });
});

function startServer(portToTry) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${portToTry} in use, trying ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(portToTry, () => {
    console.log(`Server running at http://localhost:${portToTry}`);
  });
}

startServer(PORT);
setInterval(() => {}, 60000);
