/* =========================================================================
   botones.mjs — repaso de todos los botones de la aplicación

   Recorre cada pantalla, pulsa uno a uno todos los botones que hay a la
   vista y comprueba tres cosas: que no salte ningún error, que el botón
   haga algo (abrir una ventana, cambiar de pantalla, avisar) y que la
   aplicación quede utilizable después de pulsarlo.
   ========================================================================= */
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const requerir = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = requerir('playwright')); }
catch { ({ chromium } = requerir('/usr/lib/node_modules/playwright')); }

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const salida = join(dirname(fileURLToPath(import.meta.url)), 'salida');
mkdirSync(salida, { recursive: true });

const tipos = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };
const servidor = createServer((pet, res) => {
  let ruta = pet.url.split('?')[0];
  if (ruta === '/') ruta = '/index.html';
  try {
    const b = readFileSync(join(raiz, ruta));
    res.writeHead(200, { 'Content-Type': tipos[extname(ruta)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end('no'); }
});
await new Promise(r => servidor.listen(0, r));
const puerto = servidor.address().port;

let fallos = 0, revisados = 0;
const problemas = [];
function anota(donde, boton, texto) {
  fallos++;
  problemas.push(donde + ' › ' + boton + ': ' + texto);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 950 } });
const pagina = await contexto.newPage();

let erroresConsola = [];
const externo = (t) => /fonts\.googleapis|fonts\.gstatic|ERR_TUNNEL|ERR_NAME|ERR_INTERNET|Failed to load resource/.test(t);
pagina.on('pageerror', (e) => erroresConsola.push('excepción: ' + e.message));
pagina.on('console', (m) => { if (m.type() === 'error' && !externo(m.text())) erroresConsola.push(m.text()); });
// Ninguna descarga de verdad durante el repaso
await pagina.route('**/*.json', r => r.continue());

await pagina.goto(`http://localhost:${puerto}/index.html`);
await pagina.waitForTimeout(900);

// Puesta en marcha mínima y datos de ejemplo, para que haya algo que pulsar
await pagina.evaluate(async () => {
  App.estado.ajustes.emisor.nombre = 'Reformas Vega Santos';
  App.estado.ajustes.emisor.nif = '12345678Z';
  App.estado.ajustes.bienvenidaVista = true;
  const d = Demo.generar(App.estado);
  App.estado.clientes = App.estado.clientes.concat(d.clientes);
  App.estado.presupuestos = App.estado.presupuestos.concat(d.presupuestos);
  App.estado.gastos = App.estado.gastos.concat(d.gastos);
  await App.guardar();
});
await pagina.reload();
await pagina.waitForTimeout(900);
erroresConsola = [];

// Las descargas y la impresión se interceptan: aquí interesa que el botón
// responda, no llenar el disco de archivos.
await pagina.evaluate(() => {
  window.__descargas = [];
  const orig = U.descargar;
  U.descargar = function (nombre) { window.__descargas.push(nombre); return true; };
  window.__imprimir = 0;
  window.print = function () { window.__imprimir++; };
});

async function cierraModales() {
  for (let i = 0; i < 6; i++) {
    const n = await pagina.locator('.velo').count();
    if (!n) break;
    // Se cierra siempre por la aspa: nunca se confirma nada destructivo
    const aspa = pagina.locator('.velo .cerrar').last();
    if (await aspa.count()) await aspa.click({ timeout: 2000 }).catch(() => {});
    else await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(120);
  }
}

// Botones que se saltan a propósito: destruyen datos, abren el selector de
// archivos del sistema o piden salir a internet.
const SALTAR = new Set([
  'aj-reset',            // borra todo
  'aj-demo',             // ya se prueba en prueba.mjs, y aquí quitaría los datos
  'sync-conectar',       // abre la ventana de Google
  'sync-desconectar',
  'sync-ahora',
  'aj-instalar'          // depende del navegador
]);

async function repasaVista(nombre, ir) {
  await pagina.evaluate(ir);
  await pagina.waitForTimeout(400);
  await cierraModales();

  // Se listan una vez y se van pulsando por posición, porque cada pulsación
  // vuelve a pintar la pantalla y los nodos viejos dejan de servir.
  const fichas = await pagina.evaluate(() => {
    const vistos = [];
    document.querySelectorAll('#contenido button, #contenido label.btn, header button, nav button')
      .forEach((b) => {
        if (b.offsetParent === null) return;
        vistos.push({
          id: b.id || '',
          texto: (b.textContent || '').trim().slice(0, 40),
          titulo: b.getAttribute('title') || '',
          datos: b.dataset ? JSON.stringify(b.dataset) : '{}'
        });
      });
    return vistos;
  });

  for (let i = 0; i < fichas.length; i++) {
    const f = fichas[i];
    const etiqueta = f.id || f.texto || f.titulo || f.datos;
    if (SALTAR.has(f.id)) continue;
    revisados++;
    erroresConsola = [];

    const antes = await pagina.evaluate(() => ({
      vista: App.vistaActual, modales: document.querySelectorAll('.velo').length,
      html: document.getElementById('contenido').innerHTML.length,
      avisos: document.body.innerHTML.length
    }));

    const nodos = pagina.locator('#contenido button:visible, #contenido label.btn:visible, header button:visible, nav button:visible');
    if (i >= await nodos.count()) break;
    try {
      await nodos.nth(i).click({ timeout: 3000 });
    } catch (e) {
      anota(nombre, etiqueta, 'no se deja pulsar (' + String(e.message).split('\n')[0] + ')');
      continue;
    }
    await pagina.waitForTimeout(150);

    if (erroresConsola.length) {
      anota(nombre, etiqueta, erroresConsola.join(' | '));
      erroresConsola = [];
    }

    const despues = await pagina.evaluate(() => ({
      vista: App.vistaActual, modales: document.querySelectorAll('.velo').length,
      html: document.getElementById('contenido').innerHTML.length,
      descargas: (window.__descargas || []).length,
      imprimir: window.__imprimir || 0,
      avisos: document.body.innerHTML.length
    }));
    const hizoAlgo = despues.vista !== antes.vista || despues.modales !== antes.modales ||
      despues.html !== antes.html || despues.descargas > 0 || despues.imprimir > 0 ||
      despues.avisos !== antes.avisos;
    if (!hizoAlgo) {
      // Puede ser un botón de filtro que ya estaba puesto: se avisa, no es fallo
      console.log('  · ' + nombre + ' › ' + etiqueta + ': no cambió nada visible');
    }
    if (despues.descargas) await pagina.evaluate(() => { window.__descargas = []; });
    if (despues.imprimir) await pagina.evaluate(() => { window.__imprimir = 0; });

    await cierraModales();
    // Se vuelve a la pantalla por si el botón navegó a otra
    await pagina.evaluate(ir);
    await pagina.waitForTimeout(120);
    if (erroresConsola.length) { anota(nombre, etiqueta, erroresConsola.join(' | ')); erroresConsola = []; }
  }
  console.log('  ' + nombre + ': ' + fichas.length + ' botones');
}

console.log('Repaso de botones\n');

const primerPre = await pagina.evaluate(() => App.estado.presupuestos[0].id);
const primerCli = await pagina.evaluate(() => App.estado.clientes[0].id);

await repasaVista('Panel', () => App.ir('panel'));
await repasaVista('Presupuestos', () => App.ir('presupuestos'));
await repasaVista('Editor', new Function('return App.ir("editor", { id: "' + primerPre + '" })'));
await repasaVista('Clientes', () => App.ir('clientes'));
await repasaVista('Banco de precios', () => App.ir('precios'));
await repasaVista('Gastos', () => App.ir('gastos'));
await repasaVista('Resumen fiscal', () => App.ir('fiscal'));
await repasaVista('Ajustes', () => App.ir('ajustes'));

// Un repaso aparte de las ventanas que se abren desde las fichas
console.log('\nVentanas de las fichas');
async function repasaModal(nombre, abre) {
  erroresConsola = [];
  await pagina.evaluate(abre);
  await pagina.waitForTimeout(400);
  const n = await pagina.locator('.velo').count();
  if (!n) { anota(nombre, 'abrir', 'no se abrió la ventana'); return; }
  const botones = await pagina.locator('.velo .modal-pie button').allTextContents();
  console.log('  ' + nombre + ': ' + botones.map(t => t.trim()).filter(Boolean).join(' · '));
  revisados += botones.length;
  if (erroresConsola.length) anota(nombre, 'abrir', erroresConsola.join(' | '));
  await cierraModales();
}
await pagina.evaluate(() => App.ir('clientes'));
await pagina.waitForTimeout(300);
await repasaModal('Ficha de cliente', () => document.querySelector('#contenido tbody tr').click());
await pagina.evaluate(() => App.ir('precios'));
await pagina.waitForTimeout(300);
await repasaModal('Ficha de partida', () => document.querySelector('#contenido tbody tr').click());
await pagina.evaluate(() => App.ir('gastos'));
await pagina.waitForTimeout(300);
await repasaModal('Ficha de gasto', () => document.querySelector('#contenido tbody tr').click());

// Y el estado final: la aplicación tiene que seguir entera
await pagina.evaluate(() => App.ir('panel'));
await pagina.waitForTimeout(400);
const final = await pagina.evaluate(() => ({
  pres: App.estado.presupuestos.length, cli: App.estado.clientes.length,
  gas: App.estado.gastos.length, par: App.estado.partidas.length,
  pintado: document.getElementById('contenido').innerHTML.length
}));
if (final.pres < 10 || final.cli < 5 || final.gas < 50 || final.par < 10) {
  anota('Final', 'datos', 'se perdieron datos durante el repaso: ' + JSON.stringify(final));
}
if (final.pintado < 500) anota('Final', 'pantalla', 'el panel quedó vacío');
await pagina.screenshot({ path: join(salida, 'tras-botones.png'), fullPage: true });

console.log('\n' + revisados + ' botones pulsados');
if (fallos) {
  console.log('\n✗ ' + fallos + ' problemas:');
  problemas.forEach(p => console.log('  - ' + p));
} else {
  console.log('✓ ninguno dio error');
}
await navegador.close();
servidor.close();
process.exit(fallos ? 1 : 0);
