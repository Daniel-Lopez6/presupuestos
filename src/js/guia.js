/* =========================================================================
   guia.js — el manual de uso, en un panel al lado

   El manual es una página aparte (guia.html) con sus propios estilos, así que
   se enseña dentro de un marco aislado. En el ordenador se queda a la derecha
   y la aplicación sigue usándose al lado; en el móvil ocupa la pantalla. La
   compilación mete el texto dentro del archivo, así que también funciona en el
   archivo suelto y sin conexión.
   ========================================================================= */
(function (global) {
  'use strict';

  var UI = global.UI;
  var cache = null;
  var panel = null;

  function contenido() {
    if (typeof global.GUIA_HTML === 'string' && global.GUIA_HTML) {
      return Promise.resolve(global.GUIA_HTML);
    }
    if (cache) return Promise.resolve(cache);
    var ruta = (global.CONFIG || {}).guia || 'guia.html';
    return fetch(ruta).then(function (r) {
      if (!r.ok) throw new Error('no está');
      return r.text();
    }).then(function (t) { cache = t; return t; });
  }

  function abierta() { return !!panel; }

  function alternar() { return abierta() ? cerrar() : abrir(); }

  function abrir() {
    if (abierta()) return;
    contenido().then(pinta).catch(function () {
      UI.aviso('No se ha podido abrir la guía', 'err');
    });
  }

  function pinta(html) {
    if (abierta()) return;
    panel = document.createElement('aside');
    panel.className = 'guia-panel';
    panel.setAttribute('aria-label', 'Guía de uso');
    panel.innerHTML =
      '<div class="guia-barra">' +
        '<b>Guía de uso</b>' +
        '<button class="btn btn-s btn-plano" id="guia-cerrar" title="Cerrar la guía">' +
          UI.ic('cruz', 16) + '<span class="guia-cerrar-txt">Cerrar</span></button>' +
      '</div>' +
      '<iframe class="guia-marco" title="Guía de uso"></iframe>';
    panel.querySelector('.guia-marco').setAttribute('srcdoc', html);
    panel.querySelector('#guia-cerrar').addEventListener('click', cerrar);

    document.body.appendChild(panel);
    document.body.classList.add('con-guia');
    document.addEventListener('keydown', tecla);
    marcaBoton(true);
  }

  function cerrar() {
    if (!panel) return;
    if (panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
    document.body.classList.remove('con-guia');
    document.removeEventListener('keydown', tecla);
    marcaBoton(false);
  }

  function tecla(e) { if (e.key === 'Escape') cerrar(); }

  function marcaBoton(activo) {
    document.querySelectorAll('[data-guia]').forEach(function (b) {
      b.classList.toggle('activo', !!activo);
      b.setAttribute('aria-pressed', activo ? 'true' : 'false');
    });
  }

  global.Guia = { abrir: abrir, cerrar: cerrar, alternar: alternar, abierta: abierta };

})(window);
