/* =========================================================================
   util.js — utilidades transversales
   Sin dependencias. Se expone en window.U
   ========================================================================= */
(function (global) {
  'use strict';

  var MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
               'agosto','septiembre','octubre','noviembre','diciembre'];

  function uid(prefijo) {
    return (prefijo || 'id') + '_' +
      Date.now().toString(36) + '_' +
      Math.random().toString(36).slice(2, 8);
  }

  /* --- Números y moneda ------------------------------------------------ */

  // Redondeo a 2 decimales estable (evita 1.005 -> 1.00)
  function r2(n) {
    if (!isFinite(n)) return 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v === null || v === undefined) return 0;
    var s = String(v).trim();
    if (!s) return 0;
    // Acepta "1.234,56" y "1234.56"
    if (s.indexOf(',') > -1 && s.indexOf('.') > -1) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.indexOf(',') > -1) {
      s = s.replace(',', '.');
    }
    s = s.replace(/[^0-9.\-]/g, '');
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  function eur(n, conSimbolo) {
    var v = r2(num(n));
    var neg = v < 0;
    v = Math.abs(v);
    var partes = v.toFixed(2).split('.');
    var ent = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    var s = ent + ',' + partes[1];
    if (conSimbolo !== false) s += ' €';
    return (neg ? '-' : '') + s;
  }

  function cant(n) {
    var v = num(n);
    var s = (Math.round(v * 1000) / 1000).toString().replace('.', ',');
    return s;
  }

  function pct(n) {
    var v = num(n);
    return (Math.round(v * 100) / 100).toString().replace('.', ',') + ' %';
  }

  /* --- Fechas ---------------------------------------------------------- */

  function hoyISO() {
    var d = new Date();
    return isoDe(d);
  }

  function isoDe(d) {
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  function desdeISO(iso) {
    if (!iso) return null;
    var p = String(iso).split('-');
    if (p.length !== 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  }

  function fechaLarga(iso) {
    var d = desdeISO(iso);
    if (!d) return '';
    return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
  }

  function fechaCorta(iso) {
    var d = desdeISO(iso);
    if (!d) return '';
    return String(d.getDate()).padStart(2, '0') + '/' +
           String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function sumaDias(iso, dias) {
    var d = desdeISO(iso);
    if (!d) return '';
    d.setDate(d.getDate() + (dias | 0));
    return isoDe(d);
  }

  function diasEntre(isoA, isoB) {
    var a = desdeISO(isoA), b = desdeISO(isoB);
    if (!a || !b) return 0;
    return Math.round((b - a) / 86400000);
  }

  function trimestreDe(iso) {
    var d = desdeISO(iso);
    if (!d) return null;
    return { anio: d.getFullYear(), t: Math.floor(d.getMonth() / 3) + 1 };
  }

  /* --- Texto ----------------------------------------------------------- */

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Texto con saltos de línea -> HTML seguro
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

  function normaliza(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function contiene(texto, busqueda) {
    return normaliza(texto).indexOf(normaliza(busqueda)) > -1;
  }

  function recorta(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  /* --- Validación NIF / CIF español ------------------------------------ */

  function validaNIF(valor) {
    var v = String(valor || '').toUpperCase().replace(/[\s-]/g, '');
    if (!v) return { ok: true, tipo: '' }; // vacío se permite
    var letras = 'TRWAGMYFPDXBNJZSQVHLCKE';
    if (/^[0-9]{8}[A-Z]$/.test(v)) {
      return { ok: letras[parseInt(v.slice(0, 8), 10) % 23] === v[8], tipo: 'DNI' };
    }
    if (/^[XYZ][0-9]{7}[A-Z]$/.test(v)) {
      var n = ({ X: '0', Y: '1', Z: '2' })[v[0]] + v.slice(1, 8);
      return { ok: letras[parseInt(n, 10) % 23] === v[8], tipo: 'NIE' };
    }
    if (/^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(v)) {
      var suma = 0;
      for (var i = 1; i <= 7; i++) {
        var d = parseInt(v[i], 10);
        if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
        suma += d;
      }
      var ctrl = (10 - (suma % 10)) % 10;
      var esperado = 'JABCDEFGHI'[ctrl];
      return { ok: v[8] === String(ctrl) || v[8] === esperado, tipo: 'CIF' };
    }
    return { ok: false, tipo: '' };
  }

  function validaEmail(v) {
    if (!v) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());
  }

  /* --- Varios ---------------------------------------------------------- */

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 250);
    };
  }

  function clona(o) {
    return o === undefined ? o : JSON.parse(JSON.stringify(o));
  }

  function ordenarPor(campo, desc) {
    return function (a, b) {
      var x = a[campo], y = b[campo];
      if (x === y) return 0;
      var res = (x > y) ? 1 : -1;
      return desc ? -res : res;
    };
  }

  // Descarga de archivos. En un navegador normal se usa un enlace; cuando la
  // aplicación corre dentro de una página publicada en claude.ai, el enlace no
  // funciona y hay que pedirle el guardado al propio visor.
  var promesaGuardador = null;

  function guardadorDelVisor() {
    if (!promesaGuardador) {
      promesaGuardador = (global.claude && typeof global.claude.use === 'function')
        ? global.claude.use('downloads').catch(function () { return null; })
        : Promise.resolve(null);
    }
    return promesaGuardador;
  }

  function descargaConEnlace(nombre, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 300);
  }

  function descargar(nombre, contenido, tipo) {
    var blob = new Blob([contenido], { type: tipo || 'application/json;charset=utf-8' });
    return guardadorDelVisor().then(function (guardador) {
      if (!guardador) return descargaConEnlace(nombre, blob);
      return guardador.save({ filename: nombre, data: blob }).then(null, function (e) {
        var codigo = e && e.code;
        if (codigo === 'declined' || codigo === 'rate_limited') return;
        return descargaConEnlace(nombre, blob);
      });
    });
  }

  // Reduce una imagen a un dataURL manejable (para logo y firma)
  var TOPE_GUARDADO = 700 * 1024;   // lo que no conviene pasar por registro

  // Prepara una imagen para guardarla dentro de la aplicación.
  // Un SVG se conserva tal cual: es vectorial y sale nítido impreso a
  // cualquier tamaño. El resto se reduce, y si aun así ocupa demasiado se
  // vuelve a reducir hasta que entra, porque todo esto vive en el navegador.
  function imagenADataURL(file, maxLado, callback) {
    if (!file) return callback(new Error('No hay archivo'));
    if (file.size > 8 * 1024 * 1024) {
      return callback(new Error('La imagen pesa más de 8 MB. Prueba con una más pequeña.'));
    }

    var esSVG = /svg/i.test(file.type) || /\.svg$/i.test(file.name || '');
    var lector = new FileReader();

    lector.onerror = function () { callback(new Error('No se pudo abrir el archivo')); };

    if (esSVG) {
      lector.onload = function (e) {
        var texto = String(e.target.result);
        if (!/<svg[\s>]/i.test(texto)) return callback(new Error('Ese archivo no sirve como logotipo'));
        // El SVG se pinta dentro de una <img>, que no ejecuta scripts, pero
        // se limpia igualmente lo que no pinta nada.
        texto = texto
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '');
        var codificado;
        try { codificado = btoa(unescape(encodeURIComponent(texto))); }
        catch (err) { return callback(new Error('No se pudo leer el SVG')); }
        callback(null, 'data:image/svg+xml;base64,' + codificado);
      };
      return lector.readAsText(file, 'utf-8');
    }

    lector.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var lado = maxLado;
        var salida = null;
        // Como mucho tres intentos: original, y dos reducciones
        for (var i = 0; i < 3; i++) {
          salida = redibuja(img, lado, file.type);
          if (salida.length <= TOPE_GUARDADO) break;
          lado = Math.round(lado * 0.65);
        }
        callback(null, salida);
      };
      img.onerror = function () { callback(new Error('No se pudo leer la imagen')); };
      img.src = e.target.result;
    };
    lector.readAsDataURL(file);
  }

  function redibuja(img, maxLado, tipoArchivo) {
    var w = img.naturalWidth || img.width || 1;
    var h = img.naturalHeight || img.height || 1;
    var escala = Math.min(1, maxLado / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * escala));
    c.height = Math.max(1, Math.round(h * escala));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    // PNG para conservar la transparencia de un logotipo; JPEG para fotos
    var tipo = /jpe?g/i.test(tipoArchivo || '') ? 'image/jpeg' : 'image/png';
    return c.toDataURL(tipo, 0.92);
  }

  global.U = {
    MESES: MESES,
    uid: uid, r2: r2, num: num, eur: eur, cant: cant, pct: pct,
    hoyISO: hoyISO, isoDe: isoDe, desdeISO: desdeISO,
    fechaLarga: fechaLarga, fechaCorta: fechaCorta,
    sumaDias: sumaDias, diasEntre: diasEntre, trimestreDe: trimestreDe,
    esc: esc, nl2br: nl2br, normaliza: normaliza, contiene: contiene, recorta: recorta,
    validaNIF: validaNIF, validaEmail: validaEmail,
    debounce: debounce, clona: clona, ordenarPor: ordenarPor,
    descargar: descargar, imagenADataURL: imagenADataURL
  };
})(window);
