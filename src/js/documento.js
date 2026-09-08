/* =========================================================================
   documento.js — genera el presupuesto en páginas A4 reales
   La paginación se hace midiendo en el navegador: se van añadiendo bloques
   y filas a la página hasta que no cabe más, y entonces se abre una nueva.
   Así nada se corta por la mitad y la tabla repite su cabecera.
   Se expone en window.Doc
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U, Modelo = global.Modelo, Base = global.Base;

  /* --- Iconos (trazo, 16 px, heredan color) ----------------------------- */
  var IC = {
    emisor: '<path d="M8 8.6a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Z"/><path d="M2.6 14.4c0-2.7 2.4-4.3 5.4-4.3s5.4 1.6 5.4 4.3"/>',
    cliente: '<rect x="1.8" y="4.6" width="12.4" height="9" rx="1.4"/><path d="M5.8 4.6V3.4c0-.7.6-1.3 1.3-1.3h1.8c.7 0 1.3.6 1.3 1.3v1.2"/><path d="M1.8 8.6h12.4"/>',
    objeto: '<rect x="3.2" y="2.4" width="9.6" height="12" rx="1.3"/><path d="M6 1.4h4v2H6z"/><path d="M5.8 7h4.4M5.8 10h3"/>',
    trabajos: '<path d="M9.8 3.2a2.9 2.9 0 0 1 3.9 3.6l-7 7a1.7 1.7 0 0 1-2.4-2.4l7-7Z"/><path d="M2.3 5.4a2.6 2.6 0 0 0 3.4 3.4"/>',
    euro: '<path d="M12.6 4.3a4.7 4.7 0 1 0 0 7.6"/><path d="M2.9 6.8h6.5M2.9 9.4h6.5"/>',
    condiciones: '<rect x="3.2" y="1.9" width="9.6" height="12.2" rx="1.3"/><path d="M5.7 5.4h4.6M5.7 8h4.6M5.7 10.6h2.8"/>',
    lugar: '<path d="M8 14.5s4.7-4.2 4.7-7.6A4.7 4.7 0 0 0 8 2.2a4.7 4.7 0 0 0-4.7 4.7c0 3.4 4.7 7.6 4.7 7.6Z"/><circle cx="8" cy="6.8" r="1.7"/>',
    tel: '<path d="M13.6 11.4v1.9a1.3 1.3 0 0 1-1.4 1.3A12.5 12.5 0 0 1 1.4 3.8 1.3 1.3 0 0 1 2.7 2.4h1.9a1.3 1.3 0 0 1 1.3 1.1c.1.7.3 1.3.5 1.9a1.3 1.3 0 0 1-.3 1.4l-.8.8a10.4 10.4 0 0 0 4 4l.8-.8a1.3 1.3 0 0 1 1.4-.3c.6.2 1.2.4 1.9.5a1.3 1.3 0 0 1 1.2 1.4Z"/>',
    mail: '<rect x="1.6" y="3.4" width="12.8" height="9.2" rx="1.3"/><path d="m1.9 4.4 6.1 4.2 6.1-4.2"/>',
    nif: '<rect x="1.6" y="3.4" width="12.8" height="9.2" rx="1.3"/><path d="M4.6 9.6h2.2M4.6 7.2h4.8M9.8 9.6h1.6"/>'
  };

  function icono(nombre, tam) {
    return '<svg class="ic" viewBox="0 0 16 16" width="' + (tam || 13) + '" height="' + (tam || 13) +
      '" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">' +
      (IC[nombre] || '') + '</svg>';
  }

  // Se usa <template> porque un <div> descarta las etiquetas <tr>
  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function bloqueSeccion(icon, titulo) {
    return '<div class="d-sec">' + icono(icon) + '<span>' + U.esc(titulo) + '</span></div>';
  }

  /* --- Cabeceras y pie -------------------------------------------------- */

  function logoHTML(ajustes) {
    if (ajustes.mostrarLogo === false) {
      return '<div class="d-logo-texto"><strong>' + U.esc(ajustes.emisor.nombre) + '</strong></div>';
    }
    if (ajustes.logo) return '<img class="d-logo" src="' + ajustes.logo + '" alt="">';
    var generado = Base.logoDe(ajustes.emisor.nombre);
    if (!generado) return '';
    return '<div class="d-logo d-logo-svg">' + generado + '</div>';
  }

  function cabeceraPrimera(estado, p) {
    var a = estado.ajustes;
    return el(
      '<header class="d-cab">' +
        '<div class="d-cab-izq">' + logoHTML(a) + '</div>' +
        '<div class="d-cab-der">' +
          '<h1 class="d-titulo">PRESUPUESTO</h1>' +
          '<table class="d-meta"><tbody>' +
            '<tr><th>Nº DE PRESUPUESTO</th><td>' + U.esc(p.numero) + '</td></tr>' +
            '<tr><th>FECHA</th><td>' + U.esc(U.fechaLarga(p.fecha)) + '</td></tr>' +
            '<tr><th>VÁLIDO HASTA</th><td>' + U.esc(U.fechaCorta(Modelo.caducidad(p))) + '</td></tr>' +
          '</tbody></table>' +
        '</div>' +
      '</header>'
    );
  }

  function cabeceraSiguiente(estado, p) {
    var a = estado.ajustes;
    return el(
      '<header class="d-cab d-cab-mini">' +
        '<div class="d-cab-mini-izq">' + U.esc(a.emisor.nombre) + '</div>' +
        '<div class="d-cab-mini-der">Presupuesto ' + U.esc(p.numero) +
          ' · ' + U.esc(U.fechaCorta(p.fecha)) + '</div>' +
      '</header>'
    );
  }

  function pie(estado) {
    var e = estado.ajustes.emisor;
    var trozos = [];
    var dir = [e.direccion, [e.cp, e.ciudad].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    if (dir) trozos.push('<span class="d-pie-it">' + icono('lugar', 11) + U.esc(dir) + '</span>');
    if (e.telefono) trozos.push('<span class="d-pie-it">' + icono('tel', 11) + U.esc(e.telefono) + '</span>');
    if (e.email) trozos.push('<span class="d-pie-it">' + icono('mail', 11) + U.esc(e.email) + '</span>');
    return el(
      '<footer class="d-pie">' +
        '<div class="d-pie-datos">' + trozos.join('') + '</div>' +
        '<div class="d-pie-num"></div>' +
      '</footer>'
    );
  }

  /* --- Bloques del cuerpo ----------------------------------------------- */

  function fichaEmisor(estado) {
    var e = estado.ajustes.emisor;
    var lineas = [];
    lineas.push('<strong>' + U.esc(e.nombre) + '</strong>');
    if (e.nif) lineas.push('NIF: ' + U.esc(e.nif));
    if (e.direccion) lineas.push(U.esc(e.direccion));
    var cpCiudad = [e.cp, e.ciudad].filter(Boolean).join(' – ');
    if (cpCiudad) lineas.push(U.esc(cpCiudad));
    if (e.telefono) lineas.push('Teléfono: ' + U.esc(e.telefono));
    if (e.email) lineas.push(U.esc(e.email));
    if (e.web) lineas.push(U.esc(e.web));
    return '<div class="d-ficha">' + bloqueSeccion('emisor', 'Datos del emisor') +
      '<div class="d-ficha-cuerpo">' + lineas.join('<br>') + '</div></div>';
  }

  function fichaCliente(p) {
    var c = p.cliente || {};
    var lineas = [];
    lineas.push('<strong>' + U.esc(c.nombre || '—') + '</strong>');
    if (c.nif) lineas.push('NIF: ' + U.esc(c.nif));
    if (c.direccion) lineas.push(U.esc(c.direccion));
    var cpCiudad = [c.cp, c.ciudad].filter(Boolean).join(' – ');
    if (cpCiudad) lineas.push(U.esc(cpCiudad));
    if (c.telefono) lineas.push('Teléfono: ' + U.esc(c.telefono));
    if (c.email) lineas.push(U.esc(c.email));
    return '<div class="d-ficha">' + bloqueSeccion('cliente', 'Datos del cliente') +
      '<div class="d-ficha-cuerpo">' + lineas.join('<br>') + '</div></div>';
  }

  function bloques(estado, p) {
    var lista = [];
    var a = estado.ajustes;

    lista.push(el('<div class="d-bq d-partes">' + fichaEmisor(estado) + fichaCliente(p) + '</div>'));

    if (p.objeto && p.objeto.trim()) {
      lista.push(el('<div class="d-bq">' + bloqueSeccion('objeto', 'Objeto del presupuesto') +
        '<p class="d-texto">' + U.nl2br(p.objeto.trim()) + '</p></div>'));
    }

    lista.push({ tipo: 'tabla', datos: p, ajustes: a });
    lista.push({ tipo: 'totales', datos: p });

    var cond = (p.condiciones || []).filter(function (c) { return c && c.trim(); });
    if (cond.length) {
      lista.push(el('<div class="d-bq">' + bloqueSeccion('condiciones', 'Condiciones generales') +
        '<ul class="d-lista">' + cond.map(function (c) {
          return '<li>' + U.esc(c) + '</li>';
        }).join('') + '</ul></div>'));
    }

    if (p.notas && p.notas.trim()) {
      lista.push(el('<div class="d-bq"><div class="d-nota"><span class="d-nota-tit">Observaciones</span>' +
        '<p>' + U.nl2br(p.notas.trim()) + '</p></div></div>'));
    }

    lista.push(el(firmasHTML(estado)));
    return lista;
  }

  function firmasHTML(estado) {
    var a = estado.ajustes;
    var firma = a.firma
      ? '<img class="d-firma-img" src="' + a.firma + '" alt="">'
      : '<div class="d-firma-hueco"></div>';
    return '<div class="d-bq d-firmas">' +
      '<div class="d-firma">' +
        '<div class="d-firma-tit">Aceptación del cliente</div>' +
        '<div class="d-firma-hueco"></div>' +
        '<div class="d-firma-linea"></div>' +
        '<div class="d-firma-pie">Firma y sello · Fecha</div>' +
      '</div>' +
      '<div class="d-firma">' +
        '<div class="d-firma-tit">Firma del profesional</div>' +
        firma +
        '<div class="d-firma-linea"></div>' +
        '<div class="d-firma-pie">' + U.esc(a.emisor.nombre) + '</div>' +
      '</div>' +
    '</div>';
  }

  /* --- Tabla de partidas ------------------------------------------------ */

  function nuevaTabla(ajustes, conTitulo, continuacion) {
    var cols = ajustes.mostrarCodigos
      ? '<col class="c-n"><col class="c-cod"><col><col class="c-ud"><col class="c-cant"><col class="c-pre"><col class="c-imp">'
      : '<col class="c-n"><col><col class="c-ud"><col class="c-cant"><col class="c-pre"><col class="c-imp">';
    var th = '<tr>' +
      '<th class="t-c">Nº</th>' +
      (ajustes.mostrarCodigos ? '<th>Código</th>' : '') +
      '<th>Descripción</th>' +
      '<th class="t-c">Ud.</th>' +
      '<th class="t-d">Cant.</th>' +
      '<th class="t-d">Precio</th>' +
      '<th class="t-d">Importe</th></tr>';
    var cabecera = conTitulo
      ? bloqueSeccion('euro', 'Desglose económico' + (continuacion ? ' (continuación)' : ''))
      : '';
    var envoltorio = el('<div class="d-bq d-tabla-bq">' + cabecera +
      '<table class="d-tabla"><colgroup>' + cols + '</colgroup>' +
      '<thead>' + th + '</thead><tbody></tbody></table></div>');
    return { caja: envoltorio, cuerpo: envoltorio.querySelector('tbody') };
  }

  function filaLinea(l, indice, ajustes) {
    var colspan = ajustes.mostrarCodigos ? 7 : 6;
    if (l.tipo === 'seccion') {
      return el('<tr class="f-seccion"><td colspan="' + colspan + '">' +
        U.esc(l.descripcion || 'Capítulo') + '</td></tr>');
    }
    var imp = Modelo.importeLinea(l);
    var desc = U.num(l.descuento)
      ? '<span class="f-desc">−' + U.cant(l.descuento) + ' % dto.</span>' : '';
    return el('<tr>' +
      '<td class="t-c f-num">' + indice + '</td>' +
      (ajustes.mostrarCodigos ? '<td class="f-cod">' + U.esc(l.codigo || '') + '</td>' : '') +
      '<td class="f-descripcion">' + U.nl2br(l.descripcion || '') + desc + '</td>' +
      '<td class="t-c">' + U.esc(l.unidad || '') + '</td>' +
      '<td class="t-d">' + U.cant(l.cantidad) + '</td>' +
      '<td class="t-d">' + U.eur(l.precio, false) + '</td>' +
      '<td class="t-d f-imp">' + U.eur(imp, false) + '</td>' +
    '</tr>');
  }

  function bloqueTotales(p) {
    var t = Modelo.totales(p);
    var filas = '';
    if (t.descuento) {
      filas += '<tr><th>Suma de partidas</th><td>' + U.eur(t.subtotal) + '</td></tr>';
      filas += '<tr><th>Descuento ' + U.cant(t.descuentoPct) + ' %</th><td>−' + U.eur(t.descuento) + '</td></tr>';
    }
    filas += '<tr><th>Base imponible</th><td>' + U.eur(t.base) + '</td></tr>';
    filas += '<tr><th>IVA (' + U.cant(t.ivaPct) + ' %)</th><td>' + U.eur(t.iva) + '</td></tr>';
    if (t.irpf) {
      filas += '<tr><th>Retención IRPF (' + U.cant(t.irpfPct) + ' %)</th><td>−' + U.eur(t.irpf) + '</td></tr>';
    }
    return el('<div class="d-bq d-totales-bq">' +
      '<div class="d-totales">' +
        '<table class="d-totales-tabla"><tbody>' + filas + '</tbody></table>' +
        '<div class="d-total-final"><span>Total presupuesto</span><strong>' + U.eur(t.total) + '</strong></div>' +
      '</div>' +
    '</div>');
  }

  /* --- Motor de paginación ---------------------------------------------- */

  function nuevaPagina(estado, p, contenedor, numero) {
    var pag = el('<section class="d-pag"><div class="d-pag-int">' +
      '<div class="d-zona-cab"></div><div class="d-cuerpo"></div>' +
      '</div></section>');
    pag.querySelector('.d-zona-cab').appendChild(
      numero === 1 ? cabeceraPrimera(estado, p) : cabeceraSiguiente(estado, p)
    );
    pag.querySelector('.d-pag-int').appendChild(pie(estado));
    contenedor.appendChild(pag);
    return { nodo: pag, cuerpo: pag.querySelector('.d-cuerpo') };
  }

  function desborda(cuerpo) {
    return cuerpo.scrollHeight > cuerpo.clientHeight + 1;
  }

  function render(estado, p, contenedor) {
    contenedor.innerHTML = '';
    contenedor.classList.add('d-doc');

    var numPagina = 1;
    var pagina = nuevaPagina(estado, p, contenedor, numPagina);
    var lista = bloques(estado, p);
    var a = estado.ajustes;

    function saltar() {
      numPagina++;
      pagina = nuevaPagina(estado, p, contenedor, numPagina);
    }

    for (var i = 0; i < lista.length; i++) {
      var b = lista[i];

      if (b && b.tipo === 'tabla') {
        var lineas = p.lineas || [];
        if (!lineas.length) continue;
        var idx = 0, contador = 0, continuacion = false;
        while (idx < lineas.length) {
          var t = nuevaTabla(a, true, continuacion);
          pagina.cuerpo.appendChild(t.caja);
          if (desborda(pagina.cuerpo)) {
            pagina.cuerpo.removeChild(t.caja);
            saltar();
            pagina.cuerpo.appendChild(t.caja);
          }
          var metidas = 0;
          while (idx < lineas.length) {
            var l = lineas[idx];
            var num = l.tipo === 'seccion' ? '' : (++contador);
            var fila = filaLinea(l, num, a);
            t.cuerpo.appendChild(fila);
            if (desborda(pagina.cuerpo)) {
              t.cuerpo.removeChild(fila);
              if (l.tipo !== 'seccion') contador--;
              break;
            }
            metidas++; idx++;
          }
          if (metidas === 0) {
            // Ni una fila cabe: la página está agotada, abrimos otra
            pagina.cuerpo.removeChild(t.caja);
            saltar();
            continue;
          }
          if (idx < lineas.length) { saltar(); continuacion = true; }
        }
        continue;
      }

      if (b && b.tipo === 'totales') {
        var tot = bloqueTotales(p);
        pagina.cuerpo.appendChild(tot);
        if (desborda(pagina.cuerpo)) {
          pagina.cuerpo.removeChild(tot);
          saltar();
          pagina.cuerpo.appendChild(tot);
        }
        continue;
      }

      pagina.cuerpo.appendChild(b);
      if (desborda(pagina.cuerpo)) {
        pagina.cuerpo.removeChild(b);
        saltar();
        pagina.cuerpo.appendChild(b);
      }
    }

    // Numeración de páginas
    var pags = contenedor.querySelectorAll('.d-pag');
    for (var k = 0; k < pags.length; k++) {
      pags[k].querySelector('.d-pie-num').textContent =
        'Página ' + (k + 1) + ' de ' + pags.length;
      pags[k].classList.toggle('d-ultima', k === pags.length - 1);
    }
    return pags.length;
  }

  /* --- Impresión -------------------------------------------------------- */

  function imprimir(estado, p) {
    var zona = document.getElementById('zona-impresion');
    if (!zona) {
      zona = document.createElement('div');
      zona.id = 'zona-impresion';
      document.body.appendChild(zona);
    }
    render(estado, p, zona);
    document.body.classList.add('imprimiendo');
    // Un modal abierto deja overflow:hidden en la página y eso también
    // recorta la impresión: se quita mientras dura y se devuelve después.
    var overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = '';
    var limpiar = function () {
      document.body.classList.remove('imprimiendo');
      document.body.style.overflow = overflowPrevio;
      zona.innerHTML = '';
      window.removeEventListener('afterprint', limpiar);
    };
    window.addEventListener('afterprint', limpiar);
    setTimeout(function () {
      try {
        window.print();
      } catch (e) {
        // Algunos visores incrustados bloquean la impresión: en ese caso
        // entregamos el documento como archivo para abrirlo e imprimirlo.
        limpiar();
        exportarHTML(estado, p);
        return;
      }
      setTimeout(limpiar, 1500);
    }, 120);
  }

  // Guarda el presupuesto como página web suelta, con sus estilos incrustados.
  function exportarHTML(estado, p) {
    var zona = document.createElement('div');
    render(estado, p, zona);
    var html = '<!doctype html><meta charset="utf-8"><title>' +
      U.esc(nombreArchivo(estado, p)) + '</title><style>' +
      'body{margin:0;background:#fff;display:flex;flex-direction:column;align-items:center}' +
      cssDocumento() + '</style>' + zona.innerHTML;
    return U.descargar(nombreArchivo(estado, p) + '.html', html, 'text/html;charset=utf-8');
  }

  function nombreArchivo(estado, p) {
    var cli = (p.cliente && p.cliente.nombre ? p.cliente.nombre : 'cliente')
      .replace(/[^\wáéíóúñÁÉÍÓÚÑ ]+/g, '').trim().replace(/\s+/g, '-');
    return 'Presupuesto-' + String(p.numero).replace(/[\/\\]/g, '-') + '-' + cli;
  }

  // Devuelve el CSS del documento para poder exportarlo como página suelta
  function cssDocumento() {
    var tag = document.getElementById('css-documento');
    if (tag && tag.textContent) return tag.textContent;
    var trozos = [];
    for (var i = 0; i < document.styleSheets.length; i++) {
      var hoja = document.styleSheets[i], reglas;
      try { reglas = hoja.cssRules; } catch (e) { continue; }
      if (!reglas) continue;
      for (var j = 0; j < reglas.length; j++) trozos.push(reglas[j].cssText);
    }
    return trozos.join('\n');
  }

  global.Doc = {
    render: render,
    cssDocumento: cssDocumento,
    imprimir: imprimir,
    exportarHTML: exportarHTML,
    icono: icono,
    nombreArchivo: nombreArchivo
  };
})(window);
