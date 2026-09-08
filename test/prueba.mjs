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
import { mkdirSync, readFileSync } from 'node:fs';

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
// Sin nombre no deja pasar: es lo que encabeza cada presupuesto
await pagina.click('.bienvenida [data-guardar-datos]');
await pagina.waitForTimeout(120);
comprueba('el asistente no continúa sin nombre',
  (await pagina.locator('.bienvenida [name=b_nombre]').count()) === 1 &&
  /Hace falta al menos el nombre/.test(await pagina.textContent('.bienvenida')));
await pagina.fill('.bienvenida [name=b_nombre]', 'Reformas Vega Santos');
await pagina.waitForTimeout(300);
comprueba('el logotipo se previsualiza mientras escribes el nombre',
  /RV/.test(await pagina.innerHTML('#bv-logo-vista')),
  (await pagina.innerHTML('#bv-logo-vista')).slice(0, 120));
await pagina.fill('.bienvenida [name=b_nif]', '12345678z');
await pagina.fill('.bienvenida [name=b_telefono]', '600 000 000');
await pagina.fill('.bienvenida [name=b_email]', 'obras@ejemplo.es');
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
comprueba('el emisor queda con lo escrito en el asistente',
  (await pagina.evaluate(() => App.estado.ajustes.emisor.nombre)) === 'Reformas Vega Santos');
comprueba('el logotipo se dibuja con las iniciales del nombre',
  (await pagina.evaluate(() => Base.inicialesDe(App.estado.ajustes.emisor.nombre))) === 'RV');
comprueba('el logotipo lleva el nombre repartido en dos renglones',
  (await pagina.evaluate(() => {
    const svg = Base.logoDe('Reformas Vega Santos');
    return /REFORMAS VEGA/.test(svg) && /SANTOS/.test(svg);
  })) === true);
comprueba('el motor de datos es IndexedDB',
  (await pagina.evaluate(() => Store.info().motor)) === 'idb');

console.log('\n2. Presupuesto con 15 partidas');
const datos = await pagina.evaluate(() => {
  const p = Modelo.nuevoPresupuesto(App.estado);
  Modelo.consumeNumero(App.estado);
  p.cliente = { nombre: 'Construcciones Miralbueno S.L.', nif: 'B99999999', direccion: 'C/ Mayor 12, 2º B',
                cp: '50001', ciudad: 'Zaragoza', telefono: '900 000 000', email: 'obras@ejemplo.es' };
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
// El coche particular es el caso raro: la mitad del IVA, nada en IRPF
comprueba('el gasoil del coche particular no baja el IRPF',
  Math.abs(fiscal.r.gastos.deducible - 1320) < 0.005, String(fiscal.r.gastos.deducible));
comprueba('pero su IVA sí se deduce al 50 %',
  Math.abs(fiscal.r.gastos.ivaDeducible - 231) < 0.005, String(fiscal.r.gastos.ivaDeducible));
const furgo = await pagina.evaluate(() => Modelo.totalesGasto(
  { base: 200, ivaPct: 21, categoria: 'furgoneta_comb', afectacion: null }));
comprueba('la furgoneta de trabajo sí se deduce entera',
  furgo.gastoDeducible === 200 && Math.abs(furgo.ivaDeducible - 42) < 0.005, JSON.stringify(furgo));
const bajado = await pagina.evaluate(() => Modelo.totalesGasto(
  { base: 100, ivaPct: 21, categoria: 'telefonia', afectacion: 60 }));
comprueba('bajar la afectación de un gasto normal baja también su IVA',
  bajado.gastoDeducible === 60 && Math.abs(bajado.ivaDeducible - 12.6) < 0.005, JSON.stringify(bajado));
comprueba('IVA a liquidar = repercutido − soportado',
  Math.abs(fiscal.r.ivaLiquidar - (fiscal.iva - 231)) < 0.005, String(fiscal.r.ivaLiquidar));
comprueba('rendimiento = ingresos − gastos deducibles',
  Math.abs(fiscal.r.rendimiento - (fiscal.base - 1320)) < 0.005, String(fiscal.r.rendimiento));

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
comprueba('los datos del cliente se conservan', tras.cliente === 'Construcciones Miralbueno S.L.');

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

console.log('\n11. Logotipo propio');
const logos = await pagina.evaluate(async () => {
  const pasa = (file, lado) => new Promise((res, rej) =>
    U.imagenADataURL(file, lado, (e, d) => e ? rej(e) : res(d)));

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40">' +
              '<script>alert(1)<\/script><rect width="100" height="40" fill="#B08D57" ' +
              'onload="alert(2)"/><text x="6" y="26">MI LOGO</text></svg>';
  const comoSVG = await pasa(new File([svg], 'logo.svg', { type: 'image/svg+xml' }), 1400);
  const descifrado = atob(comoSVG.split(',')[1]);

  // Un PNG de verdad, generado al vuelo y más grande que el tope
  const c = document.createElement('canvas');
  c.width = 2400; c.height = 900;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#16233A'; ctx.fillRect(0, 0, 2400, 900);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const comoPNG = await pasa(new File([blob], 'logo.png', { type: 'image/png' }), 1400);
  const medido = await new Promise(r => {
    const i = new Image();
    i.onload = () => r({ w: i.naturalWidth, h: i.naturalHeight });
    i.src = comoPNG;
  });

  let errorGrande = null;
  try {
    await pasa(new File([new Uint8Array(9 * 1024 * 1024)], 'enorme.png', { type: 'image/png' }), 1400);
  } catch (e) { errorGrande = e.message; }

  return { comoSVG, descifrado, comoPNG: comoPNG.slice(0, 30), medido, errorGrande };
});
comprueba('un SVG se guarda como vectorial, sin rasterizar',
  logos.comoSVG.indexOf('data:image/svg+xml;base64,') === 0, logos.comoSVG.slice(0, 40));
comprueba('el SVG conserva su contenido', /MI LOGO/.test(logos.descifrado));
comprueba('al SVG se le quitan scripts y manejadores',
  !/<script/i.test(logos.descifrado) && !/onload=/i.test(logos.descifrado),
  logos.descifrado.slice(0, 160));
comprueba('un PNG grande se reduce al lado máximo',
  logos.comoPNG.indexOf('data:image/png') === 0 && logos.medido.w === 1400,
  JSON.stringify(logos.medido));
comprueba('un archivo enorme se rechaza con un aviso claro',
  /8 MB/.test(logos.errorGrande || ''), String(logos.errorGrande));

const conLogo = await pagina.evaluate(() => {
  App.estado.ajustes.logo = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg"/>');
  const zona = document.createElement('div');
  zona.style.position = 'absolute'; zona.style.left = '-10000px';
  document.body.appendChild(zona);
  Doc.render(App.estado, App.estado.presupuestos[0], zona);
  const img = zona.querySelector('.d-logo');
  const esImagen = !!img && img.tagName === 'IMG';
  zona.remove();
  App.estado.ajustes.logo = null;
  return esImagen;
});
comprueba('el documento usa el logotipo subido cuando lo hay', conLogo === true);

console.log('\n12. Impresión de verdad');
// El fallo que esto vigila: el contenedor de impresión estaba oculto con
// display:none, y lo oculto mide cero, así que la paginación metía todo en
// una sola hoja. En pantalla se veía bien y el PDF salía de una página.
const impresion = await pagina.evaluate((id) => {
  const zona = document.getElementById('zona-impresion');
  Doc.render(App.estado, App.presupuesto(id), zona);
  const estilo = getComputedStyle(zona);
  return {
    paginas: zona.querySelectorAll('.d-pag').length,
    filas: zona.querySelectorAll('.d-tabla tbody tr').length,
    display: estilo.display,
    ancho: Math.round(zona.getBoundingClientRect().width)
  };
}, datos.id);
comprueba('el contenedor de impresión se puede medir', impresion.display !== 'none', impresion.display);
comprueba('tiene el ancho de un A4', Math.abs(impresion.ancho - 794) <= 2, String(impresion.ancho));
comprueba('el documento a imprimir se reparte en 2 páginas', impresion.paginas === 2, String(impresion.paginas));
comprueba('no se pierde ninguna fila al imprimir', impresion.filas === 19, String(impresion.filas));

// Y con la vista previa abierta, que deja la página con overflow oculto
const conModal = await pagina.evaluate((id) => {
  document.body.style.overflow = 'hidden';          // lo que hace un modal
  const zona = document.getElementById('zona-impresion');
  Doc.render(App.estado, App.presupuesto(id), zona);
  document.body.classList.add('imprimiendo');
  const previo = document.body.style.overflow;
  document.body.style.overflow = '';
  const r = { paginas: zona.querySelectorAll('.d-pag').length, overflowAntes: previo };
  document.body.classList.remove('imprimiendo');
  zona.innerHTML = '';
  return r;
}, datos.id);
comprueba('también son 2 páginas con la vista previa abierta', conModal.paginas === 2, String(conModal.paginas));

// El PDF de verdad, contando páginas dentro del archivo
await pagina.evaluate((id) => {
  const zona = document.getElementById('zona-impresion');
  Doc.render(App.estado, App.presupuesto(id), zona);
  document.body.classList.add('imprimiendo');
  document.body.style.overflow = '';
}, datos.id);
await pagina.waitForTimeout(200);
const rutaPDF = join(salida, 'impresion.pdf');
await pagina.pdf({ path: rutaPDF, format: 'A4', printBackground: true,
                   margin: { top: 0, bottom: 0, left: 0, right: 0 } });
const crudo = readFileSync(rutaPDF).toString('latin1');
const hojas = (crudo.split('/Type /Page').length - 1) - (crudo.split('/Type /Pages').length - 1);
comprueba('el PDF descargado tiene las 2 páginas', hojas === 2, String(hojas));
await pagina.evaluate(() => {
  document.body.classList.remove('imprimiendo');
  document.getElementById('zona-impresion').innerHTML = '';
});

// El caso de los suministros de casa: dos porcentajes distintos en el mismo
// recibo. En IRPF el 30 % de la parte afecta; en IVA la proporción de uso real.
const casa = await pagina.evaluate(() => Modelo.totalesGasto(
  { base: 100, ivaPct: 21, categoria: 'suministros_casa', afectacion: 6, ivaAfectacion: 20 }));
comprueba('los suministros de casa admiten un IVA distinto de la afectación',
  casa.gastoDeducible === 6 && casa.ivaDeducible === 4.2, JSON.stringify(casa));
const casaSinIva = await pagina.evaluate(() => Modelo.totalesGasto(
  { base: 100, ivaPct: 21, categoria: 'suministros_casa', afectacion: 6 }));
comprueba('sin escribirlo, los suministros de casa siguen sin deducir IVA',
  casaSinIva.ivaDeducible === 0, JSON.stringify(casaSinIva));
const tope = await pagina.evaluate(() => Modelo.totalesGasto(
  { base: 100, ivaPct: 21, categoria: 'materiales', ivaAfectacion: 250 }));
comprueba('un porcentaje de IVA disparatado se recorta al 100 %',
  tope.ivaDeduciblePct === 100, String(tope.ivaDeduciblePct));

console.log('\n13. Categorías del banco de precios');
// El tío también hace fontanería: tiene que poder crear sus propias
// cajetillas y borrar las de ejemplo que no use.
await pagina.evaluate(() => App.ir('precios'));
await pagina.waitForTimeout(250);
const chipsIniciales = await pagina.locator('[data-cat]').count();
comprueba('las categorías salen como botones con su cuenta',
  chipsIniciales > 1 && /\d/.test(await pagina.textContent('[data-cat="todas"]')),
  await pagina.textContent('[data-cat="todas"]'));

// Crear una nueva
await pagina.click('#cat-nueva');
await pagina.waitForTimeout(150);
await pagina.fill('.velo [name=cat]', 'Fontanería');
await pagina.click('.velo .modal-pie button:has-text("Crear")');
await pagina.waitForTimeout(250);
comprueba('se puede crear una categoría nueva',
  (await pagina.locator('[data-cat="Fontanería"]').count()) === 1);
comprueba('la categoría nueva queda guardada en los ajustes',
  await pagina.evaluate(() => (App.estado.ajustes.categoriasPrecios || []).indexOf('Fontanería') >= 0));

// No deja repetir nombre
await pagina.click('#cat-nueva');
await pagina.waitForTimeout(150);
await pagina.fill('.velo [name=cat]', 'fontaneria');
await pagina.click('.velo .modal-pie button:has-text("Crear")');
await pagina.waitForTimeout(150);
comprueba('avisa si el nombre ya existe',
  (await pagina.locator('.velo').count()) === 1 &&
  (await pagina.evaluate(() => Base.categoriasDe(App.estado).filter(c => U.normaliza(c) === 'fontaneria').length)) === 1);
await pagina.click('.velo .modal-pie button:has-text("Cancelar")');
await pagina.waitForTimeout(150);

// Una partida dentro de la categoría nueva
await pagina.evaluate(async () => {
  const np = { id: U.uid('par'), codigo: 'FON01', descripcion: 'Sustitución de bajante',
               unidad: 'ml', precio: 42, categoria: 'Fontanería', usos: 0 };
  App.tocar(np); App.estado.partidas.push(np);
  await App.guardar();
  App.refrescar();
});
await pagina.waitForTimeout(250);
comprueba('la categoría nueva cuenta sus partidas',
  /1/.test(await pagina.textContent('[data-cat="Fontanería"]')),
  await pagina.textContent('[data-cat="Fontanería"]'));

// Renombrar: tiene que arrastrar las partidas
await pagina.click('[data-cat="Fontanería"]');
await pagina.waitForTimeout(200);
comprueba('al elegir una categoría aparecen los botones de renombrar y borrar',
  (await pagina.locator('#cat-renombrar').count()) === 1 &&
  (await pagina.locator('#cat-borrar').count()) === 1);
await pagina.click('#cat-renombrar');
await pagina.waitForTimeout(150);
await pagina.fill('.velo [name=cat]', 'Fontanería y desagües');
await pagina.click('.velo .modal-pie button:has-text("Guardar")');
await pagina.waitForTimeout(250);
comprueba('al renombrar se cambia también en las partidas',
  (await pagina.evaluate(() => App.estado.partidas.filter(p => p.categoria === 'Fontanería y desagües').length)) === 1 &&
  (await pagina.evaluate(() => App.estado.partidas.filter(p => p.categoria === 'Fontanería').length)) === 0);
comprueba('el nombre viejo desaparece de la lista',
  (await pagina.evaluate(() => Base.categoriasDe(App.estado).indexOf('Fontanería'))) === -1);

// Borrar conservando las partidas
await pagina.click('#cat-borrar');
await pagina.waitForTimeout(200);
comprueba('antes de borrar avisa de cuántas partidas hay dentro',
  /1<\/b> partida/.test(await pagina.innerHTML('.velo .modal-cuerpo')));
await pagina.click('.velo .modal-pie button:has-text("Conservar las partidas")');
await pagina.waitForTimeout(250);
const conservada = await pagina.evaluate(() => {
  const p = App.estado.partidas.find(x => x.codigo === 'FON01');
  return { existe: !!p, categoria: p ? p.categoria : null,
           enLista: Base.categoriasDe(App.estado).indexOf('Fontanería y desagües') };
});
comprueba('borrando la categoría se conservan las partidas',
  conservada.existe === true && conservada.categoria === '', JSON.stringify(conservada));
comprueba('la categoría borrada ya no aparece', conservada.enLista === -1);

// Borrar también las partidas
await pagina.evaluate(async () => {
  App.estado.ajustes.categoriasPrecios = (App.estado.ajustes.categoriasPrecios || []).concat(['Prueba']);
  const np = { id: U.uid('par'), codigo: 'PRU01', descripcion: 'Partida de prueba',
               unidad: 'ud', precio: 1, categoria: 'Prueba', usos: 0 };
  App.tocar(np); App.estado.partidas.push(np);
  await App.guardar();
  App.refrescar();
});
await pagina.waitForTimeout(200);
await pagina.click('[data-cat="Prueba"]');
await pagina.waitForTimeout(200);
await pagina.click('#cat-borrar');
await pagina.waitForTimeout(200);
await pagina.click('.velo .modal-pie button:has-text("Borrar también las partidas")');
await pagina.waitForTimeout(250);
const borrada = await pagina.evaluate(() => ({
  queda: App.estado.partidas.filter(p => p.codigo === 'PRU01').length,
  enLista: Base.categoriasDe(App.estado).indexOf('Prueba'),
  lapida: Object.keys((App.estado.borrados || {})).length
}));
comprueba('borrando la categoría con sus partidas se van las dos',
  borrada.queda === 0 && borrada.enLista === -1, JSON.stringify(borrada));
comprueba('el borrado deja constancia para que no vuelva al sincronizar',
  borrada.lapida > 0, String(borrada.lapida));

// Una categoría vacía se borra sin preguntar por las partidas
await pagina.evaluate(async () => {
  App.estado.ajustes.categoriasPrecios = (App.estado.ajustes.categoriasPrecios || []).concat(['Vacía']);
  await App.guardar();
  App.refrescar();
});
await pagina.waitForTimeout(200);
await pagina.click('[data-cat="Vacía"]');
await pagina.waitForTimeout(200);
await pagina.click('#cat-borrar');
await pagina.waitForTimeout(200);
comprueba('una categoría vacía avisa de que no se pierde nada',
  /no se pierde ninguna partida/.test(await pagina.textContent('.velo .modal-cuerpo')));
await pagina.click('.velo .modal-pie button:has-text("Borrar")');
await pagina.waitForTimeout(250);
comprueba('la categoría vacía se borra',
  (await pagina.evaluate(() => Base.categoriasDe(App.estado).indexOf('Vacía'))) === -1);

// Al guardar una partida con una categoría escrita a mano, queda registrada
await pagina.evaluate(async () => {
  const np = { id: U.uid('par'), codigo: 'CAR01', descripcion: 'Puerta de paso',
               unidad: 'ud', precio: 180, categoria: 'Carpintería', usos: 0 };
  App.tocar(np); App.estado.partidas.push(np);
  await App.guardar();
  App.refrescar();
});
await pagina.waitForTimeout(250);
comprueba('una categoría escrita en una partida aparece sola en los botones',
  (await pagina.locator('[data-cat="Carpintería"]').count()) === 1);
await pagina.evaluate(() => App.ir('precios'));
await pagina.waitForTimeout(200);

console.log('\n14. Datos de ejemplo');
// Se cargan desde Ajustes, tienen que dejar el resumen trimestral con
// contenido y poder quitarse sin llevarse por delante lo del usuario.
const antesDemo = await pagina.evaluate(() => ({
  pres: App.estado.presupuestos.length, cli: App.estado.clientes.length, gas: App.estado.gastos.length }));
await pagina.evaluate(() => App.ir('ajustes'));
await pagina.waitForTimeout(300);
comprueba('el botón de datos de ejemplo está en Ajustes',
  (await pagina.locator('#aj-demo').count()) === 1);
await pagina.click('#aj-demo');
await pagina.waitForTimeout(200);
await pagina.click('.velo .modal-pie button:has-text("Cargar")');
await pagina.waitForTimeout(600);
const demo = await pagina.evaluate(() => {
  const anio = new Date().getFullYear();
  const t = Math.floor(new Date().getMonth() / 3) + 1;
  const r = Modelo.resumen(App.estado, anio, t);
  const an = Modelo.resumenAnual(App.estado, anio, t).acumulado;
  const estados = {};
  App.estado.presupuestos.forEach(p => { estados[p.estado] = (estados[p.estado] || 0) + 1; });
  return { pres: App.estado.presupuestos.length, cli: App.estado.clientes.length,
           gas: App.estado.gastos.length, estados: estados,
           ingresos: r.ingresos.base, gastos: r.gastos.deducible, pago130: an.pago130,
           ivas: Array.from(new Set(App.estado.presupuestos.map(p => p.ivaPct))).sort(),
           futuros: App.estado.gastos.filter(g => g.fecha > U.hoyISO()).length };
});
comprueba('cargan clientes, presupuestos y gastos de ejemplo',
  demo.pres > antesDemo.pres && demo.cli > antesDemo.cli && demo.gas > 50,
  JSON.stringify({ pres: demo.pres, cli: demo.cli, gas: demo.gas }));
comprueba('el resumen del trimestre deja de estar vacío',
  demo.ingresos > 0 && demo.gastos > 0 && demo.pago130 > 0,
  JSON.stringify({ ing: demo.ingresos, gas: demo.gastos, p130: demo.pago130 }));
comprueba('hay presupuestos en todos los estados',
  ['borrador', 'enviado', 'aceptado', 'rechazado', 'caducado'].every(e => demo.estados[e] > 0),
  JSON.stringify(demo.estados));
comprueba('hay obras al 10 % y locales al 21 %',
  demo.ivas.indexOf(10) >= 0 && demo.ivas.indexOf(21) >= 0, JSON.stringify(demo.ivas));
comprueba('ningún gasto de ejemplo tiene fecha futura', demo.futuros === 0, String(demo.futuros));
const nifsDemo = await pagina.evaluate(() => {
  const malos = [];
  App.estado.clientes.forEach(c => { if (c.nif && !U.validaNIF(c.nif).ok) malos.push(c.nombre + ' ' + c.nif); });
  App.estado.gastos.forEach(g => { if (g.nif && !U.validaNIF(g.nif).ok) malos.push(g.proveedor + ' ' + g.nif); });
  return malos;
});
comprueba('los NIF de ejemplo pasan la validación', nifsDemo.length === 0, nifsDemo.join(' | '));
// Y quitarlos deja exactamente lo de antes
await pagina.evaluate(() => App.ir('ajustes'));
await pagina.waitForTimeout(300);
await pagina.click('#aj-demo');
await pagina.waitForTimeout(200);
await pagina.click('.velo .modal-pie button:has-text("Quitar")');
await pagina.waitForTimeout(600);
const tras2 = await pagina.evaluate(() => ({
  pres: App.estado.presupuestos.length, cli: App.estado.clientes.length,
  gas: App.estado.gastos.length, part: App.estado.partidas.length }));
comprueba('quitarlos devuelve todo a como estaba',
  tras2.pres === antesDemo.pres && tras2.cli === antesDemo.cli && tras2.gas === antesDemo.gas,
  JSON.stringify({ antes: antesDemo, ahora: tras2 }));
comprueba('el banco de precios no se toca al quitar el ejemplo', tras2.part > 0, String(tras2.part));
// Se vuelven a cargar para las capturas y para dejar la aplicación llena
await pagina.evaluate(() => App.ir('ajustes'));
await pagina.waitForTimeout(300);
await pagina.click('#aj-demo');
await pagina.waitForTimeout(200);
await pagina.click('.velo .modal-pie button:has-text("Cargar")');
await pagina.waitForTimeout(600);

console.log('\n15. Capturas');
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
