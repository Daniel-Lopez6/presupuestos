/* =========================================================================
   test/prueba.mjs — comprobaciones automáticas con Playwright
   Ejecuta:  node test/prueba.mjs
   Abre la aplicación en un navegador real y verifica cálculos, paginación,
   persistencia y resumen fiscal.
   ========================================================================= */
import { createRequire } from 'node:module';
const requerir = createRequire(import.meta.url);
// Playwright se resuelve desde la instalación global si no está en el proyecto
let chromium;
try { ({ chromium } = requerir('playwright')); }
catch { ({ chromium } = requerir(process.env.PLAYWRIGHT_PATH || '/home/claude/.npm-global/lib/node_modules/playwright')); }
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const salida = join(dirname(fileURLToPath(import.meta.url)), 'salida');
mkdirSync(salida, { recursive: true });

const tipos = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png' };

const servidor = createServer(async (pet, res) => {
  let r = decodeURIComponent(pet.url.split('?')[0]);
  if (r === '/') r = '/index.html';
  try {
    const datos = await readFile(join(raiz, normalize(r).replace(/^(\.\.[\/\\])+/, '')));
    res.writeHead(200, { 'Content-Type': tipos[extname(r)] || 'application/octet-stream' });
    res.end(datos);
  } catch { res.writeHead(404); res.end('404'); }
});
await new Promise(r => servidor.listen(8123, r));

let fallos = 0, aciertos = 0;
function comprueba(nombre, condicion, detalle) {
  if (condicion) { aciertos++; console.log('  ok   ' + nombre); }
  else { fallos++; console.log('  FALLO ' + nombre + (detalle ? '  → ' + detalle : '')); }
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 950 } });
const pagina = await contexto.newPage();
const erroresConsola = [];
pagina.on('pageerror', e => erroresConsola.push(String(e)));
const externo = (t) => /fonts\.googleapis|fonts\.gstatic|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET/.test(t);
pagina.on('console', m => { if (m.type() === 'error' && !externo(m.text())) erroresConsola.push(m.text()); });

await pagina.goto('http://localhost:8123/');
await pagina.waitForFunction(() => window.App && window.App.listo);
await pagina.waitForTimeout(200);

console.log('\n1. Arranque y puesta en marcha');
comprueba('la aplicación arranca sin errores', erroresConsola.length === 0, erroresConsola.join(' | '));

// El asistente de la primera vez: es lo primero que verá el usuario final
comprueba('la primera vez sale el asistente',
  (await pagina.locator('.bienvenida').count()) === 1);
comprueba('el asistente empieza por la presentación',
  /Tus presupuestos, en orden/.test(await pagina.textContent('.bienvenida')));
await pagina.click('.bienvenida [data-siguiente]');
await pagina.waitForTimeout(120);
comprueba('el segundo paso pide los datos del emisor',
  (await pagina.locator('.bienvenida [name=b_nif]').count()) === 1);
await pagina.fill('.bienvenida [name=b_nif]', '12345678z');
await pagina.click('.bienvenida [data-guardar-datos]');
await pagina.waitForTimeout(150);
comprueba('el NIF escrito en el asistente queda guardado en mayúsculas',
  (await pagina.evaluate(() => App.estado.ajustes.emisor.nif)) === '12345678Z',
  await pagina.evaluate(() => App.estado.ajustes.emisor.nif));
// Se recorre lo que quede y se cierra
for (let i = 0; i < 4; i++) {
  const n = await pagina.locator('.bienvenida [data-siguiente], .bienvenida [data-cerrar]').count();
  if (!n) break;
  await pagina.locator('.bienvenida [data-siguiente], .bienvenida [data-cerrar]').first().click();
  await pagina.waitForTimeout(120);
}
comprueba('el asistente se cierra al terminar', (await pagina.locator('.bienvenida').count()) === 0);
comprueba('no vuelve a salir en el siguiente arranque',
  (await pagina.evaluate(() => App.estado.ajustes.bienvenidaVista)) === true);
comprueba('hay banco de precios precargado', await pagina.evaluate(() => App.estado.partidas.length) === 20);
comprueba('el emisor está configurado',
  (await pagina.evaluate(() => App.estado.ajustes.emisor.nombre)) === 'Jose Angel Dominguez Ramos');
comprueba('el motor de datos es IndexedDB',
  (await pagina.evaluate(() => Store.info().motor)) === 'idb');

console.log('\n2. Presupuesto con 15 partidas');
const datos = await pagina.evaluate(() => {
  const p = Modelo.nuevoPresupuesto(App.estado);
  Modelo.consumeNumero(App.estado);
  p.cliente = { nombre: 'ADINCO S.L.', nif: 'B86745231', direccion: 'C/ Alcalá 145, 2º B',
                cp: '28009', ciudad: 'Madrid', telefono: '914 552 331', email: 'obras@adinco.es' };
  p.objeto = 'Trabajos de reparación y acondicionamiento de techo y paramentos verticales en oficina de planta primera.';
  p.ivaPct = 21; p.irpfPct = 15;
  const banco = App.estado.partidas;
  p.lineas.push(Modelo.nuevaLinea({ tipo: 'seccion', descripcion: 'Demolición y preparación' }));
  for (let i = 0; i < 5; i++) {
    const b = banco[i + 9];
    p.lineas.push(Modelo.nuevaLinea({ descripcion: b.descripcion, unidad: b.unidad, cantidad: i + 2, precio: b.precio }));
  }
  p.lineas.push(Modelo.nuevaLinea({ tipo: 'seccion', descripcion: 'Techos y paramentos' }));
  for (let i = 0; i < 5; i++) {
    const b = banco[i];
    p.lineas.push(Modelo.nuevaLinea({ descripcion: b.descripcion, unidad: b.unidad, cantidad: (i + 1) * 3, precio: b.precio }));
  }
  p.lineas.push(Modelo.nuevaLinea({ tipo: 'seccion', descripcion: 'Instalaciones y remates' }));
  for (let i = 0; i < 5; i++) {
    const b = banco[i + 15];
    p.lineas.push(Modelo.nuevaLinea({ descripcion: b.descripcion, unidad: b.unidad, cantidad: i + 1, precio: b.precio }));
  }
  p.lineas[3].descuento = 10;
  App.estado.presupuestos.push(p);
  const t = Modelo.totales(p);
  return { id: p.id, numero: p.numero, t, lineas: p.lineas.length };
});
comprueba('15 partidas y 3 capítulos', datos.lineas === 18 && datos.t.numLineas === 15,
  'lineas=' + datos.lineas + ' partidas=' + datos.t.numLineas);

// Comprobación independiente de los totales, calculada aquí
const manual = await pagina.evaluate((id) => {
  const p = App.presupuesto(id);
  let s = 0;
  p.lineas.forEach(l => {
    if (l.tipo === 'seccion') return;
    s += Math.round((l.cantidad * l.precio * (1 - (l.descuento || 0) / 100)) * 100) / 100;
  });
  s = Math.round(s * 100) / 100;
  const base = s;
  const iva = Math.round(base * 21) / 100;
  const irpf = Math.round(base * 15) / 100;
  return { base, iva, irpf, total: Math.round((base + iva - irpf) * 100) / 100 };
}, datos.id);
comprueba('base imponible correcta', Math.abs(manual.base - datos.t.base) < 0.005, manual.base + ' vs ' + datos.t.base);
comprueba('IVA 21 % correcto', Math.abs(manual.iva - datos.t.iva) < 0.005, manual.iva + ' vs ' + datos.t.iva);
comprueba('retención 15 % correcta', Math.abs(manual.irpf - datos.t.irpf) < 0.005, manual.irpf + ' vs ' + datos.t.irpf);
comprueba('total = base + IVA − IRPF', Math.abs(manual.total - datos.t.total) < 0.005, manual.total + ' vs ' + datos.t.total);

console.log('\n3. Paginación del documento A4');
const pag = await pagina.evaluate((id) => {
  const zona = document.createElement('div');
  zona.style.position = 'absolute'; zona.style.left = '-10000px';
  document.body.appendChild(zona);
  const n = Doc.render(App.estado, App.presupuesto(id), zona);
  const desbordes = [];
  zona.querySelectorAll('.d-cuerpo').forEach((c, i) => {
    if (c.scrollHeight > c.clientHeight + 1) desbordes.push(i + 1 + ':' + c.scrollHeight + '>' + c.clientHeight);
  });
  const cabeceras = zona.querySelectorAll('.d-tabla thead').length;
  const filas = zona.querySelectorAll('.d-tabla tbody tr').length;
  const numeros = Array.from(zona.querySelectorAll('.d-pie-num')).map(x => x.textContent);
  const alturas = Array.from(zona.querySelectorAll('.d-pag')).map(x => Math.round(x.getBoundingClientRect().height));
  const totalPintado = zona.querySelector('.d-total-final strong').textContent;
  const firmas = zona.querySelectorAll('.d-firmas').length;
  zona.remove();
  return { n, desbordes, cabeceras, filas, numeros, alturas, totalPintado, firmas };
}, datos.id);
comprueba('el documento ocupa 2 páginas', pag.n === 2, 'páginas=' + pag.n);
comprueba('ninguna página desborda', pag.desbordes.length === 0, pag.desbordes.join(', '));
comprueba('todas las filas se han pintado', pag.filas === 18, 'filas=' + pag.filas);
comprueba('la tabla repite cabecera al partirse', pag.cabeceras === pag.n, 'cabeceras=' + pag.cabeceras);
comprueba('numeración de páginas correcta',
  pag.numeros.join('|') === 'Página 1 de 2|Página 2 de 2', pag.numeros.join('|'));
comprueba('altura A4 exacta (1123 px)', pag.alturas.every(h => Math.abs(h - 1123) <= 1), pag.alturas.join(','));
comprueba('el total impreso coincide',
  pag.totalPintado.replace(/\s|€/g, '') === new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(datos.t.total),
  pag.totalPintado);
comprueba('el bloque de firmas aparece una sola vez', pag.firmas === 1);

console.log('\n4. Un presupuesto corto cabe en una página');
const corto = await pagina.evaluate(() => {
  const p = Modelo.nuevoPresupuesto(App.estado);
  p.cliente.nombre = 'Comunidad de Propietarios Loreto 5';
  p.objeto = 'Repaso de pintura en portal.';
  p.lineas.push(Modelo.nuevaLinea({ descripcion: 'Pintura plástica lisa en paredes, dos manos', unidad: 'm²', cantidad: 45, precio: 8.5 }));
  p.lineas.push(Modelo.nuevaLinea({ descripcion: 'Medios auxiliares y limpieza final', unidad: 'partida', cantidad: 1, precio: 120 }));
  App.estado.presupuestos.push(p);
  const zona = document.createElement('div');
  zona.style.position = 'absolute'; zona.style.left = '-10000px';
  document.body.appendChild(zona);
  const n = Doc.render(App.estado, p, zona);
  const desborda = Array.from(zona.querySelectorAll('.d-cuerpo')).some(c => c.scrollHeight > c.clientHeight + 1);
  zona.remove();
  const t = Modelo.totales(p);
  return { n, desborda, base: t.base, total: t.total };
});
comprueba('una sola página', corto.n === 1, 'páginas=' + corto.n);
comprueba('sin desbordes', !corto.desborda);
comprueba('base 45×8,50 + 120 = 502,50', Math.abs(corto.base - 502.5) < 0.005, String(corto.base));
comprueba('total con IVA 21 % = 608,03', Math.abs(corto.total - 608.03) < 0.005, String(corto.total));

console.log('\n5. Caso extremo: 60 partidas');
const largo = await pagina.evaluate(() => {
  const p = Modelo.nuevoPresupuesto(App.estado);
  p.cliente.nombre = 'Prueba de carga';
  for (let i = 0; i < 60; i++) {
    p.lineas.push(Modelo.nuevaLinea({
      descripcion: 'Partida número ' + (i + 1) + ' con una descripción larga para forzar el salto de línea dentro de la celda de la tabla',
      unidad: 'm²', cantidad: i + 1, precio: 12.35
    }));
  }
  const zona = document.createElement('div');
  zona.style.position = 'absolute'; zona.style.left = '-10000px';
  document.body.appendChild(zona);
  const n = Doc.render(App.estado, p, zona);
  const desbordes = Array.from(zona.querySelectorAll('.d-cuerpo')).filter(c => c.scrollHeight > c.clientHeight + 1).length;
  const filas = zona.querySelectorAll('.d-tabla tbody tr').length;
  zona.remove();
  return { n, desbordes, filas };
});
comprueba('se reparte en varias páginas', largo.n >= 3, 'páginas=' + largo.n);
comprueba('sin desbordes con 60 partidas', largo.desbordes === 0, 'desbordes=' + largo.desbordes);
comprueba('las 60 filas están', largo.filas === 60, 'filas=' + largo.filas);

console.log('\n6. Gastos y resumen fiscal');
const fiscal = await pagina.evaluate((id) => {
  const p = App.presupuesto(id);
  p.estado = 'aceptado';
  p.fecha = new Date().getFullYear() + '-02-10';
  p.fechaRespuesta = new Date().getFullYear() + '-02-20';
  const anio = new Date().getFullYear();
  App.estado.gastos.push(Modelo.nuevoGasto({ fecha: anio + '-01-15', concepto: 'Material', categoria: 'materiales', base: 1000, ivaPct: 21 }));
  App.estado.gastos.push(Modelo.nuevoGasto({ fecha: anio + '-02-10', concepto: 'Gasoil', categoria: 'vehiculo_comb', base: 200, ivaPct: 21 }));
  App.estado.gastos.push(Modelo.nuevoGasto({ fecha: anio + '-03-01', concepto: 'Cuota autónomos', categoria: 'cuota_reta', base: 320, ivaPct: 0 }));
  const r = Modelo.resumen(App.estado, anio, 1);
  return { r, base: Modelo.totales(p).base, iva: Modelo.totales(p).iva, irpf: Modelo.totales(p).irpf };
}, datos.id);
comprueba('los ingresos del 1T son el presupuesto aceptado',
  Math.abs(fiscal.r.ingresos.base - fiscal.base) < 0.005, fiscal.r.ingresos.base + ' vs ' + fiscal.base);
comprueba('gasto deducible = 1000 + 100 (50 % gasoil) + 320',
  Math.abs(fiscal.r.gastos.deducible - 1420) < 0.005, String(fiscal.r.gastos.deducible));
comprueba('IVA soportado deducible = 210 + 21 (50 %)',
  Math.abs(fiscal.r.gastos.ivaDeducible - 231) < 0.005, String(fiscal.r.gastos.ivaDeducible));
comprueba('IVA a liquidar = repercutido − soportado',
  Math.abs(fiscal.r.ivaLiquidar - (fiscal.iva - 231)) < 0.005, String(fiscal.r.ivaLiquidar));
comprueba('rendimiento = ingresos − gastos deducibles',
  Math.abs(fiscal.r.rendimiento - (fiscal.base - 1420)) < 0.005, String(fiscal.r.rendimiento));

const p130 = await pagina.evaluate(() => Modelo.resumenAnual(App.estado, new Date().getFullYear(), 1).acumulado);
comprueba('el pago fraccionado descuenta las retenciones',
  Math.abs(p130.pago130 - Math.max(0, Math.round((p130.rendimiento * 0.2 - p130.retenido) * 100) / 100)) < 0.02,
  JSON.stringify(p130));

console.log('\n7. Persistencia');
await pagina.evaluate(() => App.guardarYa());
await pagina.reload();
await pagina.waitForFunction(() => window.App && window.App.listo);
const tras = await pagina.evaluate(() => ({
  presupuestos: App.estado.presupuestos.length,
  gastos: App.estado.gastos.length,
  cliente: App.estado.presupuestos[0].cliente.nombre
}));
comprueba('los presupuestos sobreviven a recargar', tras.presupuestos === 2, JSON.stringify(tras));
comprueba('los gastos sobreviven a recargar', tras.gastos === 3);
comprueba('los datos del cliente se conservan', tras.cliente === 'ADINCO S.L.');

console.log('\n8. Recorrido por la interfaz');
for (const vista of ['panel', 'presupuestos', 'clientes', 'precios', 'gastos', 'fiscal', 'ajustes']) {
  erroresConsola.length = 0;
  await pagina.evaluate(v => App.ir(v), vista);
  await pagina.waitForTimeout(120);
  const pintado = await pagina.evaluate(() => document.getElementById('contenido').children.length > 0);
  comprueba('la vista ' + vista + ' se pinta sin errores', pintado && erroresConsola.length === 0,
    erroresConsola.join(' | '));
}

console.log('\n9. Editor: alta de partida desde la interfaz');
erroresConsola.length = 0;
await pagina.evaluate((id) => App.ir('editor', { id }), datos.id);
await pagina.waitForTimeout(200);
await pagina.click('#ed-add-linea');
await pagina.waitForTimeout(200);
const nLineas = await pagina.evaluate((id) => App.presupuesto(id).lineas.length, datos.id);
comprueba('el botón de nueva partida añade una línea', nLineas === 19, 'lineas=' + nLineas);
await pagina.fill('#cuerpo-lineas tr:last-child textarea', 'Partida escrita a mano');
await pagina.fill('#cuerpo-lineas tr:last-child input[data-campo=cantidad]', '3');
await pagina.fill('#cuerpo-lineas tr:last-child input[data-campo=precio]', '25,50');
await pagina.click('#cuerpo-lineas tr:last-child textarea');
await pagina.waitForTimeout(250);
const importeCelda = await pagina.textContent('#cuerpo-lineas tr:last-child .imp');
comprueba('el importe de la línea se calcula al escribir', importeCelda.replace(/\s|€/g, '') === '76,50', importeCelda);
comprueba('sin errores en el editor', erroresConsola.length === 0, erroresConsola.join(' | '));
const precioForm = await pagina.inputValue('#cuerpo-lineas tr:last-child input[data-campo=precio]');
comprueba('el precio se reformatea con coma y dos decimales', precioForm === '25,50', precioForm);

console.log('\n10. Descargas dentro de una página publicada');
erroresConsola.length = 0;
const descarga = await pagina.evaluate(async () => {
  // Simula el visor de claude.ai, donde los enlaces de descarga no funcionan
  // y hay que pedirle el guardado a la propia página anfitriona.
  const recibido = [];
  window.claude = {
    use: async (nombre) => nombre === 'downloads'
      ? { save: async (peticion) => { recibido.push(peticion.filename); return { status: 'saved' }; } }
      : null
  };
  await U.descargar('prueba.json', '{"a":1}');
  await U.descargar('prueba.csv', 'a;b', 'text/csv');
  return recibido;
});
comprueba('la copia de seguridad se entrega al visor', descarga.indexOf('prueba.json') > -1, JSON.stringify(descarga));
comprueba('los CSV se entregan al visor', descarga.indexOf('prueba.csv') > -1, JSON.stringify(descarga));
comprueba('sin errores al descargar', erroresConsola.length === 0, erroresConsola.join(' | '));
await pagina.evaluate(() => { delete window.claude; });

console.log('\n11. Capturas');
await pagina.evaluate(() => App.ir('panel'));
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: join(salida, 'panel.png'), fullPage: true });
await pagina.evaluate((id) => App.ir('editor', { id }), datos.id);
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: join(salida, 'editor.png'), fullPage: true });
await pagina.evaluate(() => App.ir('fiscal'));
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: join(salida, 'fiscal.png'), fullPage: true });
await pagina.evaluate(() => App.ir('gastos'));
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: join(salida, 'gastos.png'), fullPage: true });

// Documento a tamaño real
await pagina.evaluate((id) => {
  document.body.innerHTML = '<div id="doc"></div>';
  document.body.style.background = '#fff';
  Doc.render(App.estado, App.presupuesto(id), document.getElementById('doc'));
}, datos.id);
await pagina.waitForTimeout(400);
const paginas = await pagina.$$('.d-pag');
for (let i = 0; i < paginas.length; i++) {
  await paginas[i].screenshot({ path: join(salida, 'documento-' + (i + 1) + '.png') });
}
await pagina.pdf({ path: join(salida, 'presupuesto.pdf'), format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
console.log('  capturas en test/salida/');

console.log('\n' + (fallos ? '✗ ' + fallos + ' fallos, ' : '✓ ') + aciertos + ' comprobaciones correctas');
await navegador.close();
servidor.close();
process.exit(fallos ? 1 : 0);
