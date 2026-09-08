/* =========================================================================
   test/privacidad.mjs — el código no debe llevar datos de nadie

   La aplicación se publica en un repositorio y en una página abiertos, así
   que ningún nombre, teléfono, dirección ni correo real puede quedarse
   dentro del código. Todo eso lo escribe cada usuario en su dispositivo.

   Ejecuta:  node test/privacidad.mjs
   No necesita navegador.
   ========================================================================= */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(raiz, 'src');

let fallos = 0, aciertos = 0;
function comprueba(nombre, condicion, detalle) {
  if (condicion) { aciertos++; console.log('  ok   ' + nombre); }
  else { fallos++; console.log('  FALLO ' + nombre + (detalle ? '  → ' + detalle : '')); }
}

/* --- 1. Rastreo de datos personales en lo que se publica ----------------- */

const EXTENSIONES = ['.js', '.html', '.css', '.webmanifest', '.svg'];

// Lo que sí puede aparecer: marcadores de posición y ejemplos evidentes
const PERMITIDO = [
  /ejemplo\.(es|com)/i,
  /googleusercontent\.com/i,
  /@?(example|dominio|tucorreo|correo)\b/i,
  /000000000000-/,
  /12345678Z/i,
  /B12345678/i
];

const SOSPECHAS = [
  { nombre: 'correo electrónico', patron: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { nombre: 'teléfono español', patron: /\b[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/g },
  { nombre: 'dirección postal', patron: /\bC\/\s?[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+/g }
];

function archivos(dir) {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const completo = join(dir, nombre);
    if (statSync(completo).isDirectory()) salida.push(...archivos(completo));
    else if (EXTENSIONES.includes(extname(nombre))) salida.push(completo);
  }
  return salida;
}

const hallazgos = [];
for (const archivo of archivos(src)) {
  const texto = readFileSync(archivo, 'utf8');
  for (const { nombre, patron } of SOSPECHAS) {
    for (const encontrado of texto.match(patron) || []) {
      if (PERMITIDO.some(p => p.test(encontrado))) continue;
      hallazgos.push(relative(raiz, archivo) + ' · ' + nombre + ': ' + encontrado);
    }
  }
}

console.log('\n1. Nada personal dentro de src/');
comprueba('sin correos, teléfonos ni direcciones reales en el código',
  hallazgos.length === 0, hallazgos.slice(0, 6).join(' | '));

/* --- 2. Los valores de fábrica salen en blanco --------------------------- */

// Se cargan los dos módulos que hacen falta con un window de mentira
const ventana = { U: { uid: (p) => (p || 'id') + '_prueba' } };
for (const modulo of ['src/js/datos-base.js']) {
  const codigo = readFileSync(join(raiz, modulo), 'utf8');
  new Function('window', codigo + '\n//# sourceURL=' + modulo)(ventana);
}
const Base = ventana.Base;
const inicial = Base.estadoInicial();
const emisor = inicial.ajustes.emisor;

console.log('\n2. Valores de fábrica');
comprueba('el emisor viene vacío',
  Object.keys(emisor).every(k => emisor[k] === ''), JSON.stringify(emisor));
comprueba('no hay clientes ni presupuestos de partida',
  inicial.clientes.length === 0 && inicial.presupuestos.length === 0 && inicial.gastos.length === 0);
comprueba('el banco de precios trae 20 partidas genéricas', inicial.partidas.length === 20);
comprueba('las partidas de fábrica tienen identificador estable',
  inicial.partidas.every(p => /^par_base_/.test(p.id)));

/* --- 3. El logotipo se construye con el nombre de cada uno --------------- */

console.log('\n3. Logotipo generado');
comprueba('iniciales de un nombre de dos palabras', Base.inicialesDe('Ana Pérez') === 'AP');
comprueba('iniciales de un nombre largo', Base.inicialesDe('Reformas Vega Santos e Hijos') === 'RV');
comprueba('iniciales de una sola palabra', Base.inicialesDe('Obralia') === 'OB');
comprueba('sin nombre no se dibuja logotipo', Base.logoDe('') === '');
const svg = Base.logoDe('Reformas Vega Santos');
comprueba('el logotipo lleva las iniciales', />RV</.test(svg), svg.slice(0, 200));
comprueba('el logotipo reparte el nombre en dos renglones',
  />REFORMAS VEGA</.test(svg) && />SANTOS</.test(svg));
const largo = Base.logoDe('Construcciones y Reformas Integrales del Norte');
comprueba('un nombre muy largo reduce el cuerpo de letra para caber',
  /font-size="1[0-9]\.[0-9]"/.test(largo) || /font-size="[0-9]\.[0-9]"/.test(largo),
  (largo.match(/font-size="[\d.]+"/g) || []).join(' '));
comprueba('el nombre se escapa para no romper el SVG',
  /&amp;/.test(Base.logoDe('Pepe &amp; Hijos').replace('&amp;amp;', '&amp;')) ||
  !/[<>]/.test(Base.logoDe('Pepe <script> Hijos').replace(/<\/?(svg|g|text|path)[^>]*>/g, '')));

console.log('\n' + (fallos ? '✗ ' + fallos + ' fallos, ' : '✓ ') + aciertos + ' comprobaciones correctas');
process.exit(fallos ? 1 : 0);
