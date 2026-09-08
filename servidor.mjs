/* Servidor local para desarrollar: node servidor.mjs → http://localhost:8080 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), 'src');
const tipos = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png'
};

createServer(async (peticion, respuesta) => {
  let ruta = decodeURIComponent(peticion.url.split('?')[0]);
  if (ruta === '/') ruta = '/index.html';
  const destino = join(raiz, normalize(ruta).replace(/^(\.\.[\/\\])+/, ''));
  try {
    const datos = await readFile(destino);
    respuesta.writeHead(200, {
      'Content-Type': tipos[extname(destino)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    respuesta.end(datos);
  } catch {
    respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    respuesta.end('No encontrado');
  }
}).listen(8080, () => console.log('http://localhost:8080'));
