#!/usr/bin/env node
/* Static server tối giản cho dev/demo. Chạy: node scripts/serve.mjs [--dist] [--port 5173] */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const USE_DIST = args.includes('--dist');
const BASE = USE_DIST ? path.join(ROOT, 'dist') : ROOT;
const portArg = args.includes('--port') ? args[args.indexOf('--port') + 1] : process.env.PORT;
const PORT = Number(portArg) || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json'
};

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const full = path.resolve(BASE, rel);
    if (!full.startsWith(BASE + path.sep) && full !== BASE) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    let stat;
    try { stat = fs.statSync(full); } catch (e) { res.writeHead(404).end('Not found'); return; }
    const file = stat.isDirectory() ? path.join(full, 'index.html') : full;
    if (!fs.existsSync(file)) { res.writeHead(404).end('Not found'); return; }
    const body = fs.readFileSync(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(body);
  } catch (e) {
    res.writeHead(500).end('Server error');
  }
});

server.listen(PORT, () => {
  console.log(`CAPPAN ${USE_DIST ? 'dist' : 'source'}: http://localhost:${PORT}`);
});
