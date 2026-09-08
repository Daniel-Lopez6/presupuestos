/* =========================================================================
   test/prueba-sync.mjs — comprobaciones de la sincronización
   Levanta dos navegadores independientes (el ordenador y el móvil) contra
   un Drive de mentira que vive en este proceso, y comprueba que los datos
   viajan bien en los dos sentidos, incluidas las bajas y los conflictos.
   Ejecuta:  node test/prueba-sync.mjs
   ========================================================================= */
import { createRequire } from 'node:module';
const requerir = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = requerir('playwright')); }
catch { ({ chromium } = requerir(process.env.PLAYWRIGHT_PATH || '/home/claude/.npm-global/lib/node_modules/playwright')); }
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
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
await new Promise(r => servidor.listen(8127, r));

let fallos = 0, aciertos = 0;
function comprueba(nombre, condicion, detalle) {
  if (condicion) { aciertos++; console.log('  ok   ' + nombre); }
  else { fallos++; console.log('  FALLO ' + nombre + (detalle ? '  → ' + detalle : '')); }
}

/* --- El Drive de mentira: un único archivo compartido -------------------- */
let nube = null;
let escrituras = 0;
let modo = 'ok';   // 'ok' | 'roto' | 'caido'

const navegador = await chromium.launch();
const errores = [];

async function abreDispositivo(nombre) {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const pagina = await ctx.newPage();
  pagina.on('pageerror', e => errores.push(nombre + ': ' + e));
  pagina.on('console', m => {
    if (m.type() === 'error' && !/fonts\.|ERR_/.test(m.text())) errores.push(nombre + ': ' + m.text());
  });
  await pagina.exposeFunction('nubeLeer', async () => {
    if (modo === 'caido') throw new Error('sin conexión');
    if (modo === 'roto') return '{esto no es json';
    return nube;
  });
  await pagina.exposeFunction('nubeEscribir', async (texto) => { nube = texto; escrituras++; return true; });
  await pagina.goto('http://localhost:8127/');
  await pagina.waitForFunction(() => window.App && window.App.listo);
  // El asistente de la primera vez se prueba aparte; aquí estorba
  await pagina.evaluate(() => {
    App.estado.ajustes.bienvenidaVista = true;
    document.querySelectorAll('.velo').forEach(v => v.remove());
    document.body.style.overflow = '';
    return App.guardarYa();
  });
  await pagina.evaluate(() => {
    window.Sync.usarRemoto({
      nombre: 'prueba',
      autorizar: () => Promise.resolve('token-de-prueba'),
      revocar: () => Promise.resolve(),
      leer: async () => {
        const t = await window.nubeLeer();
        return t ? { texto: t, id: 'archivo' } : null;
      },
      escribir: async (texto) => { await window.nubeEscribir(texto); return { id: 'archivo' }; }
    });
  });
  return { nombre, ctx, pagina };
}

const sincroniza = (d) => d.pagina.evaluate(() => Sync.sincronizar({ gesto: true }));
const conecta = (d) => d.pagina.evaluate(() => Sync.conectar());
const mira = (d, fn, arg) => d.pagina.evaluate(fn, arg);

const pc = await abreDispositivo('PC');
const movil = await abreDispositivo('Móvil');

console.log('\n1. Primera subida desde el ordenador');
const idP1 = await mira(pc, () => {
  const p = Modelo.nuevoPresupuesto(App.estado);
  Modelo.consumeNumero(App.estado);
  p.cliente.nombre = 'ADINCO S.L.';
  p.objeto = 'Reparación de techo';
  p.lineas.push(Modelo.nuevaLinea({ descripcion: 'Pintura', unidad: 'm²', cantidad: 45, precio: 8.5 }));
  App.estado.presupuestos.push(p);
  App.estado.clientes.push(Modelo.nuevoCliente({ nombre: 'ADINCO S.L.', nif: 'B86745231' }));
  return App.guardarYa().then(() => p.id);
});
await conecta(pc);
comprueba('el ordenador ha subido los datos', nube !== null && escrituras === 1, 'escrituras=' + escrituras);
comprueba('el archivo de Drive es JSON válido', (() => { try { JSON.parse(nube); return true; } catch { return false; } })());

console.log('\n2. El móvil se conecta y recibe todo');
await conecta(movil);
const enMovil = await mira(movil, () => ({
  presupuestos: App.estado.presupuestos.length,
  clientes: App.estado.clientes.length,
  objeto: App.estado.presupuestos[0].objeto,
  partidas: App.estado.presupuestos[0].lineas.length,
  emisor: App.estado.ajustes.emisor.nombre
}));
comprueba('el móvil tiene el presupuesto', enMovil.presupuestos === 1, JSON.stringify(enMovil));
comprueba('el móvil tiene el cliente', enMovil.clientes === 1);
comprueba('llega el contenido completo, no solo la ficha',
  enMovil.objeto === 'Reparación de techo' && enMovil.partidas === 1, JSON.stringify(enMovil));
comprueba('el banco de precios no se duplica',
  (await mira(movil, () => App.estado.partidas.length)) === 20,
  String(await mira(movil, () => App.estado.partidas.length)));

console.log('\n3. Cambio en el móvil, llega al ordenador');
await mira(movil, (id) => {
  const p = App.presupuesto(id);
  p.objeto = 'Reparación de techo y pintura de paramentos';
  p.estado = 'enviado';
  App.tocar(p);
  App.estado.gastos.push(Modelo.nuevoGasto({
    fecha: U.hoyISO(), concepto: 'Sacos de mortero', categoria: 'materiales', base: 120, ivaPct: 21
  }));
  return App.guardarYa();
}, idP1);
await sincroniza(movil);
await sincroniza(pc);
const enPC = await mira(pc, (id) => ({
  objeto: App.presupuesto(id).objeto,
  estado: App.presupuesto(id).estado,
  gastos: App.estado.gastos.length
}), idP1);
comprueba('el ordenador ve el texto editado en el móvil',
  enPC.objeto === 'Reparación de techo y pintura de paramentos', JSON.stringify(enPC));
comprueba('el ordenador ve el estado cambiado', enPC.estado === 'enviado');
comprueba('el ordenador ve el gasto nuevo', enPC.gastos === 1);

console.log('\n4. Una baja también viaja');
await mira(pc, () => {
  const c = App.estado.clientes[0];
  return App.borrar('clientes', c.id).then(() => App.guardarYa());
});
await sincroniza(pc);
await sincroniza(movil);
comprueba('el cliente borrado en el PC desaparece del móvil',
  (await mira(movil, () => App.estado.clientes.length)) === 0,
  String(await mira(movil, () => App.estado.clientes.length)));
comprueba('la baja no arrastra al presupuesto',
  (await mira(movil, () => App.estado.presupuestos.length)) === 1);

console.log('\n5. Los dos editan lo mismo sin sincronizar: gana el último');
await mira(pc, (id) => {
  App.presupuesto(id).notas = 'Escrito en el ordenador';
  App.tocar(App.presupuesto(id));
  return App.guardarYa();
}, idP1);
await new Promise(r => setTimeout(r, 1100));
await mira(movil, (id) => {
  App.presupuesto(id).notas = 'Escrito después en el móvil';
  App.tocar(App.presupuesto(id));
  return App.guardarYa();
}, idP1);
await sincroniza(pc);
await sincroniza(movil);
await sincroniza(pc);
const notas = await mira(pc, (id) => App.presupuesto(id).notas, idP1);
comprueba('gana la edición más reciente', notas === 'Escrito después en el móvil', notas);

console.log('\n6. Cada uno crea un presupuesto a la vez: sin números repetidos');
await mira(pc, () => {
  const p = Modelo.nuevoPresupuesto(App.estado);
  Modelo.consumeNumero(App.estado);
  p.cliente.nombre = 'Cliente del ordenador';
  App.estado.presupuestos.push(p);
  return App.guardarYa();
});
await mira(movil, () => {
  const p = Modelo.nuevoPresupuesto(App.estado);
  Modelo.consumeNumero(App.estado);
  p.cliente.nombre = 'Cliente del móvil';
  App.estado.presupuestos.push(p);
  return App.guardarYa();
});
await sincroniza(pc);
await sincroniza(movil);
await sincroniza(pc);
const numeros = await mira(pc, () => App.estado.presupuestos.map(p => p.numero));
comprueba('los tres presupuestos siguen ahí', numeros.length === 3, JSON.stringify(numeros));
const siguiente = await mira(pc, () => App.estado.ajustes.numeracion.siguiente);
comprueba('el contador no retrocede', siguiente >= 3, 'siguiente=' + siguiente);
const nuevoNumero = await mira(pc, () => Modelo.siguienteNumero(App.estado));
comprueba('el siguiente número no choca con ninguno',
  numeros.indexOf(nuevoNumero) === -1, nuevoNumero + ' entre ' + JSON.stringify(numeros));

console.log('\n7. No se sube nada si no ha cambiado nada');
const antes = escrituras;
await sincroniza(pc);
await sincroniza(pc);
comprueba('dos sincronizaciones seguidas no escriben en Drive', escrituras === antes,
  'escrituras=' + (escrituras - antes));

console.log('\n8. Deshacer la última sincronización');
await mira(movil, () => {
  const p = App.estado.presupuestos[0];
  p.objeto = 'Texto que el ordenador va a recibir y luego deshacer';
  App.tocar(p);
  return App.guardarYa();
});
await sincroniza(movil);
const antesDeRecibir = await mira(pc, () => App.estado.presupuestos[0].objeto);
await sincroniza(pc);
const trasRecibir = await mira(pc, () => App.estado.presupuestos[0].objeto);
comprueba('el ordenador recibe el cambio', trasRecibir !== antesDeRecibir, trasRecibir);
const deshecho = await mira(pc, () => Sync.deshacer());
comprueba('deshacer devuelve el estado anterior',
  deshecho === true && (await mira(pc, () => App.estado.presupuestos[0].objeto)) === antesDeRecibir);

console.log('\n9. Empezar de cero borra también en el otro dispositivo');
await mira(pc, () => {
  const rastro = {}, cuando = new Date().toISOString();
  ['presupuestos', 'clientes', 'partidas', 'gastos'].forEach(col => {
    App.estado[col].forEach(r => { rastro[r.id] = cuando; });
  });
  App.estado = Base.estadoInicial();
  App.estado.borrados = rastro;
  return App.guardarYa();
});
await sincroniza(pc);
await sincroniza(movil);
const restos = await mira(movil, () => ({
  presupuestos: App.estado.presupuestos.length,
  gastos: App.estado.gastos.length,
  clientes: App.estado.clientes.length
}));
comprueba('el móvil se queda sin presupuestos', restos.presupuestos === 0, JSON.stringify(restos));
comprueba('el móvil se queda sin gastos', restos.gastos === 0, JSON.stringify(restos));

console.log('\n10. Cuando Drive falla, los datos locales no se tocan');
await mira(pc, () => {
  const p = Modelo.nuevoPresupuesto(App.estado);
  p.cliente.nombre = 'Trabajo importante que no se puede perder';
  p.lineas.push(Modelo.nuevaLinea({ descripcion: 'Partida', unidad: 'ud', cantidad: 2, precio: 50 }));
  App.estado.presupuestos.push(p);
  return App.guardarYa();
});
const antesDelFallo = await mira(pc, () => JSON.stringify({
  n: App.estado.presupuestos.length,
  nombre: App.estado.presupuestos[0].cliente.nombre
}));

modo = 'caido';
await mira(pc, () => Sync.sincronizar({}));
comprueba('sin conexión no se pierde nada',
  (await mira(pc, () => JSON.stringify({
    n: App.estado.presupuestos.length,
    nombre: App.estado.presupuestos[0].cliente.nombre
  }))) === antesDelFallo);
comprueba('la interfaz se entera del fallo',
  (await mira(pc, () => !!Sync.instantanea().error)) === true);

modo = 'roto';
await mira(pc, () => Sync.sincronizar({}));
comprueba('un archivo dañado en Drive no borra nada',
  (await mira(pc, () => JSON.stringify({
    n: App.estado.presupuestos.length,
    nombre: App.estado.presupuestos[0].cliente.nombre
  }))) === antesDelFallo);
comprueba('el archivo dañado tampoco se sobrescribe a ciegas',
  (await mira(pc, () => /dañado/.test(Sync.instantanea().error || ''))) === true,
  await mira(pc, () => Sync.instantanea().error));

modo = 'ok';
await sincroniza(pc);
comprueba('al volver la conexión sube lo pendiente',
  JSON.parse(nube).presupuestos.length === 1,
  String(JSON.parse(nube).presupuestos.length));

console.log('\n11. Sin errores en consola');
comprueba('ninguna excepción durante todo el recorrido', errores.length === 0, errores.slice(0, 4).join(' | '));

console.log('\n' + (fallos ? '✗ ' + fallos + ' fallos, ' : '✓ ') + aciertos + ' comprobaciones correctas');
await navegador.close();
servidor.close();
process.exit(fallos ? 1 : 0);
