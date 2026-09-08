/* =========================================================================
   ui.js — piezas de interfaz reutilizables: iconos, avisos, modales
   Se expone en window.UI
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U;

  var ICONOS = {
    panel: '<path d="M3 3h7v7H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 14h7v7H3z"/>',
    presupuestos: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
    clientes: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
    precios: '<path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    gastos: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    fiscal: '<path d="M3 3v18h18"/><path d="m7 14 3-4 3 3 5-6"/>',
    ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    lupa: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    lapiz: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    copiar: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    papelera: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    ver: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>',
    imprimir: '<path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>',
    descarga: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    subida: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    cruz: '<path d="M18 6 6 18M6 6l12 12"/>',
    aviso: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    reloj: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    enviar: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z"/>',
    volver: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    mano: '<path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01"/>',
    guardar: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
    bombilla: '<path d="M9 18h6M10 22h4"/><path d="M15.1 14a5 5 0 1 0-6.2 0c.6.5.9 1.2 1 1.9h4.2c.1-.7.4-1.4 1-1.9Z"/>'
  };

  function ic(nombre, tam, grosor) {
    return '<svg class="ic" viewBox="0 0 24 24" width="' + (tam || 16) + '" height="' + (tam || 16) +
      '" fill="none" stroke="currentColor" stroke-width="' + (grosor || 1.8) +
      '" stroke-linecap="round" stroke-linejoin="round">' + (ICONOS[nombre] || '') + '</svg>';
  }

  /* --- Avisos flotantes -------------------------------------------------- */

  function aviso(texto, tipo, ms) {
    var caja = document.getElementById('avisos');
    if (!caja) return;
    var t = document.createElement('div');
    t.className = 'toast' + (tipo ? ' ' + tipo : '');
    t.textContent = texto;
    caja.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .2s';
      t.style.opacity = '0';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220);
    }, ms || 2600);
  }

  /* --- Modal ------------------------------------------------------------- */

  var pilaModales = [];

  function modal(opciones) {
    var velo = document.createElement('div');
    velo.className = 'velo';
    var clases = 'modal' + (opciones.ancho ? ' ' + opciones.ancho : '');
    velo.innerHTML =
      '<div class="' + clases + '" role="dialog" aria-modal="true">' +
        '<div class="modal-cab"><h2></h2>' +
          '<button class="btn btn-plano btn-icono cerrar" title="Cerrar">' + ic('cruz', 17) + '</button>' +
        '</div>' +
        '<div class="modal-cuerpo"></div>' +
        '<div class="modal-pie"></div>' +
      '</div>';
    velo.querySelector('h2').textContent = opciones.titulo || '';
    var cuerpo = velo.querySelector('.modal-cuerpo');
    if (typeof opciones.cuerpo === 'string') cuerpo.innerHTML = opciones.cuerpo;
    else if (opciones.cuerpo) cuerpo.appendChild(opciones.cuerpo);

    var pie = velo.querySelector('.modal-pie');
    if (!opciones.botones || !opciones.botones.length) pie.style.display = 'none';
    (opciones.botones || []).forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'btn ' + (b.clase || '') + (b.izquierda ? ' izq' : '');
      btn.innerHTML = (b.icono ? ic(b.icono, 15) : '') + '<span>' + U.esc(b.texto) + '</span>';
      btn.addEventListener('click', function () {
        if (b.accion) { if (b.accion(api) === false) return; }
        if (b.cierra !== false) api.cerrar();
      });
      pie.appendChild(btn);
    });

    var api = {
      nodo: velo,
      cuerpo: cuerpo,
      pie: pie,
      cerrar: function () {
        if (!velo.parentNode) return;
        velo.parentNode.removeChild(velo);
        pilaModales.pop();
        if (!pilaModales.length) document.body.style.overflow = '';
        if (opciones.alCerrar) opciones.alCerrar();
      }
    };

    velo.querySelector('.cerrar').addEventListener('click', api.cerrar);
    velo.addEventListener('mousedown', function (e) {
      if (e.target === velo && opciones.cierraFuera !== false) api.cerrar();
    });

    document.body.appendChild(velo);
    document.body.style.overflow = 'hidden';
    pilaModales.push(api);
    setTimeout(function () {
      var f = cuerpo.querySelector('input, select, textarea');
      if (f && !opciones.sinFoco) f.focus();
    }, 40);
    return api;
  }

  function confirmar(opciones) {
    return new Promise(function (resolve) {
      modal({
        titulo: opciones.titulo || '¿Confirmas?',
        cuerpo: '<p style="margin:0;font-size:14px;line-height:1.55">' + (opciones.html || U.esc(opciones.texto || '')) + '</p>',
        sinFoco: true,
        botones: [
          { texto: opciones.cancelar || 'Cancelar', accion: function () { resolve(false); } },
          {
            texto: opciones.aceptar || 'Aceptar',
            clase: opciones.peligro ? 'btn-peligro' : 'btn-pri',
            accion: function () { resolve(true); }
          }
        ],
        alCerrar: function () { resolve(false); }
      });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pilaModales.length) {
      pilaModales[pilaModales.length - 1].cerrar();
    }
  });

  /* --- Formularios ------------------------------------------------------- */

  function campo(o) {
    var id = o.id || U.uid('c');
    var control;
    var atrib = 'id="' + id + '" name="' + U.esc(o.nombre || id) + '"' +
      (o.requerido ? ' required' : '') +
      (o.placeholder ? ' placeholder="' + U.esc(o.placeholder) + '"' : '') +
      (o.paso ? ' step="' + o.paso + '"' : '') +
      (o.min !== undefined ? ' min="' + o.min + '"' : '') +
      (o.attrs || '');
    if (o.tipo === 'textarea') {
      control = '<textarea ' + atrib + (o.filas ? ' rows="' + o.filas + '"' : '') + '>' + U.esc(o.valor || '') + '</textarea>';
    } else if (o.tipo === 'select') {
      control = '<select ' + atrib + '>' + (o.opciones || []).map(function (op) {
        var v = op.valor !== undefined ? op.valor : op;
        var n = op.nombre !== undefined ? op.nombre : op;
        return '<option value="' + U.esc(v) + '"' +
          (String(v) === String(o.valor) ? ' selected' : '') + '>' + U.esc(n) + '</option>';
      }).join('') + '</select>';
    } else {
      control = '<input type="' + (o.tipo || 'text') + '" ' + atrib +
        ' value="' + U.esc(o.valor === undefined || o.valor === null ? '' : o.valor) + '">';
    }
    return '<div class="campo">' +
      (o.etiqueta ? '<label for="' + id + '">' + U.esc(o.etiqueta) + '</label>' : '') +
      control +
      (o.ayuda ? '<div class="ayuda">' + o.ayuda + '</div>' : '') +
    '</div>';
  }

  function valores(raiz) {
    var res = {};
    raiz.querySelectorAll('input, select, textarea').forEach(function (c) {
      if (!c.name) return;
      if (c.type === 'checkbox') res[c.name] = c.checked;
      else res[c.name] = c.value;
    });
    return res;
  }

  function vacio(titulo, texto, botonHTML) {
    return '<div class="vacio"><div class="vacio-tit">' + U.esc(titulo) + '</div>' +
      '<p>' + U.esc(texto) + '</p>' + (botonHTML || '') + '</div>';
  }

  function etiquetaEstado(id) {
    var e = global.Base.estado(id);
    return '<span class="eti eti-' + e.color + '">' + U.esc(e.nombre) + '</span>';
  }

  global.UI = {
    ic: ic,
    aviso: aviso,
    modal: modal,
    confirmar: confirmar,
    campo: campo,
    valores: valores,
    vacio: vacio,
    etiquetaEstado: etiquetaEstado
  };
})(window);
