/* =========================================================================
   build.mjs — genera dist/Presupuestos.html: un único archivo con todo
   dentro (CSS, JavaScript e iconos) que se abre con doble clic y funciona
   sin conexión.

   Uso:  node build.mjs
   No necesita instalar nada.
   ========================================================================= */

import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = dirname(fileURLToPath(import.meta.url));
const src = join(raiz, 'src');
const dist = join(raiz, 'dist');

const leer = (r) => readFileSync(join(src, r), 'utf8');
const leerB64 = (r) => readFileSync(join(src, r)).toString('base64');

let html = leer('index.html');

/* --- Hojas de estilo ---------------------------------------------------- */
const estilos = [
  ['css/app.css', 'css-app'],
  ['css/documento.css', 'css-documento']
];
for (const [ruta, id] of estilos) {
  const etiqueta = new RegExp(`\\s*<link rel="stylesheet" href="${ruta}">`);
  html = html.replace(etiqueta, () =>
    `\n<style id="${id}">\n${leer(ruta)}\n</style>`);
}

/* --- JavaScript --------------------------------------------------------- */
html = html.replace(/\s*<script src="(js\/[^"]+)"><\/script>/g, (_, ruta) =>
  `\n<script>\n${leer(ruta)}\n</script>`);

/* --- Icono como dato incrustado ----------------------------------------- */
html = html.replace(
  '<link rel="icon" href="assets/icono.svg" type="image/svg+xml">',
  `<link rel="icon" href="data:image/png;base64,${leerB64('assets/icono-192.png')}" type="image/png">`
);
html = html.replace(
  '<link rel="apple-touch-icon" href="assets/icono-180.png">',
  `<link rel="apple-touch-icon" href="data:image/png;base64,${leerB64('assets/icono-180.png')}">`
);

/* --- Sin manifiesto ni service worker en la versión de un solo archivo --- */
html = html.replace(/\s*<link rel="manifest"[^>]*>/, '');
html = html.replace(
  /\s*if \('serviceWorker' in navigator[\s\S]*?\.catch\(function \(\) \{\}\);\s*\}/,
  ''
);

/* --- Marca de compilación ----------------------------------------------- */
const fecha = new Date().toISOString().slice(0, 10);
html = html.replace('<head>', `<head>\n<!-- Presupuestos · archivo único generado el ${fecha} -->`);

/* --- Incrustar manual de uso para la versión monolítica --- */
try {
  const guiaHtml = leer('guia.html');
  html = html.replace('</body>', `<script>\nwindow.GUIA_HTML = ${JSON.stringify(guiaHtml)};\n</script>\n</body>`);
} catch (e) {}

mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'Presupuestos.html'), html, 'utf8');

/* --- Copia lista para publicar en la web -------------------------------- */
// Se sobrescribe en lugar de borrar: hay carpetas sincronizadas que no
// permiten eliminar archivos y el borrado haría fallar la compilación.
const web = join(dist, 'web');
cpSync(src, web, { recursive: true, force: true });

/* --- Versión para publicar como página alojada --------------------------
   Sin <html>, <head> ni <body>: solo el contenido, porque el servicio de
   publicación envuelve el archivo en su propio esqueleto. */
const cabeza = html.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/\s*<meta charset[^>]*>/, '')
  .replace(/\s*<meta name="viewport"[^>]*>/, '')
  .trim();
const cuerpo = html.match(/<body>([\s\S]*?)<\/body>/)[1].trim();
writeFileSync(join(dist, 'artifact.html'), cabeza + '\n\n' + cuerpo + '\n', 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log(`dist/Presupuestos.html  ${kb} KB`);
console.log('dist/web/               copia para servidor o PWA');
console.log('dist/artifact.html      contenido para publicar como página');
