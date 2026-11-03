import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'application/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2', '.txt':'text/plain' };
const server = http.createServer(async (request, response) => {
  let file;
  try { const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); file = resolve(root, '.' + (path.endsWith('/') ? path + 'index.html' : path)); } catch { response.writeHead(400).end(); return; }
  if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try { const body = await readFile(file); response.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-store'}).end(body); }
  catch { response.writeHead(404,{'Content-Type':'text/html; charset=utf-8'}).end(await readFile(resolve(root,'404.html')).catch(()=>'Not found')); }
});
server.listen(4178,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4178'));
