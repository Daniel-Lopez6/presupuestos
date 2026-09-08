/* =========================================================================
   vista-panel.js — pantalla de inicio con la situación del negocio
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U, App = global.App, UI = global.UI, Modelo = global.Modelo;

  App.vistas.panel = {
    titulo: 'Panel',
    subtitulo: function () {
      var d = new Date();
      var f = d.getDate() + ' de ' + U.MESES[d.getMonth()] + ' de ' + d.getFullYear();
      return f.charAt(0).toUpperCase() + f.slice(1);
    },
    acciones: function () {
      return '<button class="btn btn-pri" id="pan-nuevo">' + UI.ic('mas', 16) + '<span>Nuevo presupuesto</span></button>';
    },
    render: function (cont) {
      var m = Modelo.metricas(App.estado);
      var hayDatos = App.estado.presupuestos.length > 0;

      var html = '';

      if (!hayDatos) {
        html += bienvenida();
      }

      html += '<div class="rejilla rej-4">' +
        kpi('Pendiente de respuesta', U.eur(m.importePendiente),
            m.pendientes + (m.pendientes === 1 ? ' presupuesto enviado' : ' presupuestos enviados')) +
        kpi('Aceptado en el ' + m.trimestre + 'T', U.eur(m.importeAceptadoTrimestre),
            'Impuestos incluidos', 'verde') +
        kpi('Tasa de aceptación', m.tasaAceptacion + ' %',
            m.aceptados + ' aceptados de ' + (m.aceptados + m.rechazados) + ' respondidos') +
        kpi('Importe medio', U.eur(m.ticketMedio), 'Base imponible de los aceptados') +
      '</div>';

      html += '<div class="sep"></div>';
      html += '<div class="rejilla rej-3">' +
        '<div style="grid-column:span 2">' + tarjetaRecientes() + '</div>' +
        '<div>' + tarjetaAvisos(m) + '<div class="sep"></div>' + tarjetaTrimestre(m) + '</div>' +
      '</div>';

      cont.innerHTML = html;
    },
    despues: function (cont) {
      var b = document.getElementById('pan-nuevo');
      if (b) b.addEventListener('click', function () { App.crearPresupuesto(); });
      var b2 = document.getElementById('pan-nuevo-2');
      if (b2) b2.addEventListener('click', function () { App.crearPresupuesto(); });
      cont.querySelectorAll('[data-abrir]').forEach(function (f) {
        f.addEventListener('click', function () { App.ir('editor', { id: f.dataset.abrir }); });
      });
    }
  };

  function kpi(titulo, valor, pie, clase) {
    return '<div class="kpi"><div class="kpi-tit">' + U.esc(titulo) + '</div>' +
      '<div class="kpi-val' + (clase ? ' ' + clase : '') + '">' + valor + '</div>' +
      '<div class="kpi-pie">' + U.esc(pie) + '</div></div>';
  }

  function bienvenida() {
    return '<div class="tarjeta" style="margin-bottom:18px"><div class="tarjeta-cuerpo">' +
      '<div class="flex" style="align-items:flex-start;gap:14px">' +
        '<div style="color:var(--oro)">' + UI.ic('bombilla', 26, 1.5) + '</div>' +
        '<div style="flex:1">' +
          '<h2 style="margin:0 0 6px;font-size:16px">Todo listo para empezar</h2>' +
          '<p style="margin:0 0 14px;color:var(--texto-2);font-size:13.5px;max-width:60ch">' +
            'Los datos del emisor ya están cargados y el banco de precios trae veinte partidas ' +
            'habituales de reforma. Crea el primer presupuesto, ajusta lo que haga falta e imprime. ' +
            'Todo queda guardado en este dispositivo.</p>' +
          '<div class="flex" style="gap:8px;flex-wrap:wrap">' +
            '<button class="btn btn-pri" id="pan-nuevo-2">' + UI.ic('mas', 16) + '<span>Crear el primero</span></button>' +
            '<button class="btn" data-vista="ajustes">' + UI.ic('ajustes', 16) + '<span>Revisar mis datos</span></button>' +
            '<button class="btn" data-vista="precios">' + UI.ic('precios', 16) + '<span>Ver el banco de precios</span></button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div></div>';
  }

  function tarjetaRecientes() {
    var lista = App.estado.presupuestos.slice().sort(function (a, b) {
      return String(b.modificado || b.creado).localeCompare(String(a.modificado || a.creado));
    }).slice(0, 7);

    if (!lista.length) {
      return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Últimos presupuestos</h2></div>' +
        UI.vacio('Sin movimientos', 'Aquí aparecerán los presupuestos según los vayas creando.') + '</div>';
    }

    var hoy = U.hoyISO();
    var filas = lista.map(function (p) {
      var t = Modelo.totales(p);
      return '<tr class="fila-click" data-abrir="' + p.id + '">' +
        '<td class="fuerte nowrap">' + U.esc(p.numero) + '</td>' +
        '<td>' + U.esc(p.cliente.nombre || '—') + '</td>' +
        '<td class="num fuerte">' + U.eur(t.total) + '</td>' +
        '<td>' + UI.etiquetaEstado(Modelo.estadoEfectivo(p, hoy)) + '</td>' +
      '</tr>';
    }).join('');

    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Últimos presupuestos</h2>' +
      '<div class="der"><button class="btn btn-s" data-vista="presupuestos">Ver todos</button></div></div>' +
      '<div class="tabla-caja"><table class="t"><tbody>' + filas + '</tbody></table></div></div>';
  }

  function tarjetaAvisos(m) {
    var items = [];
    if (m.porCaducar.length) {
      items.push('<div class="aviso aviso-oro" style="margin:0 0 10px">' + UI.ic('reloj', 16) +
        '<div><b>' + m.porCaducar.length + (m.porCaducar.length === 1 ? ' presupuesto caduca' : ' presupuestos caducan') +
        ' esta semana.</b><br>' +
        m.porCaducar.slice(0, 3).map(function (x) {
          return U.esc(x.p.numero) + ' · ' + U.esc(x.p.cliente.nombre || '—') +
            ' · ' + (x.dias <= 0 ? 'hoy' : 'en ' + x.dias + ' días');
        }).join('<br>') + '</div></div>');
    }
    if (m.caducados) {
      items.push('<div class="aviso aviso-info" style="margin:0 0 10px">' + UI.ic('info', 16) +
        '<div>Hay <b>' + m.caducados + '</b> ' + (m.caducados === 1 ? 'presupuesto caducado' : 'presupuestos caducados') +
        ' sin respuesta. Una llamada suele bastar para cerrarlos.</div></div>');
    }
    var dias = App.diasSinCopia();
    if (App.estado.presupuestos.length && (dias === null || dias >= 14)) {
      items.push('<div class="aviso aviso-info" style="margin:0 0 10px">' + UI.ic('escudo', 16) +
        '<div>' + (dias === null ? 'Todavía no has descargado ninguna copia de seguridad.'
          : 'La última copia de seguridad es de hace ' + dias + ' días.') +
        ' <a href="#ajustes">Descargar ahora</a></div></div>');
    }
    if (!items.length) {
      items.push('<div class="aviso aviso-verde" style="margin:0">' + UI.ic('check', 16) +
        '<div>Nada pendiente de revisar.</div></div>');
    }
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Avisos</h2></div>' +
      '<div class="tarjeta-cuerpo">' + items.join('') + '</div></div>';
  }

  function tarjetaTrimestre(m) {
    var r = Modelo.resumen(App.estado, m.anio, m.trimestre);
    var resultado = r.rendimiento;
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>' + m.trimestre + 'T ' + m.anio + '</h2>' +
      '<div class="der"><button class="btn btn-s" data-vista="fiscal">Detalle</button></div></div>' +
      '<div class="tarjeta-cuerpo">' +
        linea('Trabajo aceptado (base)', U.eur(r.ingresos.base)) +
        linea('Gastos deducibles', (U.r2(r.gastos.deducible) ? '−' : '') + U.eur(r.gastos.deducible)) +
        linea('Resultado estimado', U.eur(resultado), true) +
        '<div class="linea-sep" style="margin:12px 0"></div>' +
        linea('IVA repercutido', U.eur(r.ingresos.iva)) +
        linea('IVA soportado deducible', (U.r2(r.gastos.ivaDeducible) ? '−' : '') + U.eur(r.gastos.ivaDeducible)) +
        linea('IVA a liquidar', U.eur(r.ivaLiquidar), true) +
      '</div></div>';
  }

  function linea(texto, valor, fuerte) {
    return '<div class="flex" style="justify-content:space-between;padding:4px 0;font-size:13.5px' +
      (fuerte ? ';font-weight:650;color:var(--azul)' : ';color:var(--texto-2)') + '">' +
      '<span>' + U.esc(texto) + '</span><span style="font-variant-numeric:tabular-nums">' + valor + '</span></div>';
  }
})(window);
