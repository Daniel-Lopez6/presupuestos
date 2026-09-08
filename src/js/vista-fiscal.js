/* =========================================================================
   vista-fiscal.js — resumen trimestral estimado (IVA e IRPF)
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U, App = global.App, UI = global.UI,
      Modelo = global.Modelo, Base = global.Base;

  var anioActivo = new Date().getFullYear();
  var trimestreActivo = Math.floor(new Date().getMonth() / 3) + 1;

  App.vistas.fiscal = {
    titulo: 'Resumen trimestral',
    subtitulo: function () { return 'Estimación a partir de los presupuestos aceptados y los gastos registrados'; },
    acciones: function () {
      return '<button class="btn" id="fis-csv">' + UI.ic('descarga', 16) + '<span>Descargar resumen</span></button>';
    },
    render: function (cont) {
      var anual = Modelo.resumenAnual(App.estado, anioActivo, trimestreActivo);
      var r = anual.trimestres[trimestreActivo - 1];
      var ac = anual.acumulado;

      cont.innerHTML =
        selectorPeriodo(anual) +
        '<div class="sep"></div>' +
        '<div class="rejilla rej-2">' +
          tarjetaIVA(r) +
          tarjetaIRPF(r, ac) +
        '</div>' +
        '<div class="sep"></div>' +
        '<div class="rejilla rej-2">' +
          tarjetaCategorias(r) +
          tarjetaEvolucion(anual) +
        '</div>' +
        '<div class="sep"></div>' +
        '<div class="aviso aviso-oro">' + UI.ic('aviso', 16) +
          '<div><b>Esto es una estimación de trabajo, no una declaración.</b> Los ingresos salen de los ' +
          'presupuestos marcados como aceptados, no de facturas emitidas, y los cálculos no contemplan ' +
          'bienes de inversión, operaciones intracomunitarias, criterios de caja ni reducciones. ' +
          'Sirve para saber por dónde vas y para llevar los números ordenados a tu asesor, que es quien ' +
          'presenta los modelos 303 y 130.</div></div>';
    },
    despues: function (cont) {
      cont.querySelectorAll('[data-tri]').forEach(function (b) {
        b.addEventListener('click', function () { trimestreActivo = U.num(b.dataset.tri); App.refrescar(); });
      });
      var s = document.getElementById('fis-anio');
      if (s) s.addEventListener('change', function () { anioActivo = U.num(s.value); App.refrescar(); });
      document.getElementById('fis-csv').addEventListener('click', descargar);
    }
  };

  function aniosDisponibles() {
    var s = {};
    App.estado.gastos.forEach(function (g) { if (g.fecha) s[g.fecha.slice(0, 4)] = true; });
    App.estado.presupuestos.forEach(function (p) {
      var f = p.fechaRespuesta || p.fecha;
      if (f) s[f.slice(0, 4)] = true;
    });
    s[new Date().getFullYear()] = true;
    return Object.keys(s).sort().reverse();
  }

  function selectorPeriodo(anual) {
    var op = aniosDisponibles().map(function (a) {
      return '<option value="' + a + '"' + (String(anioActivo) === a ? ' selected' : '') + '>' + a + '</option>';
    }).join('');
    var nombres = ['1T · enero a marzo', '2T · abril a junio', '3T · julio a septiembre', '4T · octubre a diciembre'];
    var botones = nombres.map(function (n, i) {
      var t = anual.trimestres[i];
      return '<button class="btn' + (trimestreActivo === i + 1 ? ' btn-pri' : '') + '" data-tri="' + (i + 1) + '" ' +
        'style="flex:1 1 0;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 13px">' +
        '<span style="font-weight:650">' + n + '</span>' +
        '<span style="font-size:12px;opacity:.75">' + U.eur(t.rendimiento) + ' de resultado</span></button>';
    }).join('');
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Periodo</h2>' +
      '<div class="der"><select id="fis-anio" style="width:auto">' + op + '</select></div></div>' +
      '<div class="tarjeta-cuerpo"><div class="flex" style="gap:8px;flex-wrap:wrap;align-items:stretch">' +
      botones + '</div></div></div>';
  }

  function tarjetaIVA(r) {
    var aPagar = r.ivaLiquidar >= 0;
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>IVA del trimestre</h2>' +
      '<div class="der pequeno tenue">Modelo 303</div></div>' +
      '<div class="tarjeta-cuerpo">' +
        fila('IVA repercutido (cobrado al cliente)', U.eur(r.ingresos.iva)) +
        fila('IVA soportado deducible', menos(r.gastos.ivaDeducible)) +
        '<div class="linea-sep" style="margin:12px 0"></div>' +
        '<div class="flex" style="justify-content:space-between;align-items:baseline">' +
          '<span style="font-weight:650">' + (aPagar ? 'A ingresar' : 'A compensar') + '</span>' +
          '<span style="font-size:24px;font-weight:700;color:' + (aPagar ? 'var(--azul)' : '#1E7A44') + '">' +
          U.eur(Math.abs(r.ivaLiquidar)) + '</span>' +
        '</div>' +
        '<div class="ayuda" style="margin-top:8px">' +
          (aPagar
            ? 'Reserva este importe: no es dinero tuyo, lo has cobrado por cuenta de Hacienda.'
            : 'Has soportado más IVA del que has repercutido, así que queda a tu favor para el siguiente trimestre.') +
        '</div>' +
      '</div></div>';
  }

  function tarjetaIRPF(r, ac) {
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Rendimiento e IRPF</h2>' +
      '<div class="der pequeno tenue">Modelo 130</div></div>' +
      '<div class="tarjeta-cuerpo">' +
        fila('Ingresos del trimestre (base)', U.eur(r.ingresos.base)) +
        fila('Gastos deducibles', menos(r.gastos.deducible)) +
        fila('Resultado del trimestre', U.eur(r.rendimiento), true) +
        '<div class="linea-sep" style="margin:12px 0"></div>' +
        fila('Rendimiento acumulado del año', U.eur(ac.rendimiento)) +
        fila('20 % del rendimiento', U.eur(U.r2(Math.max(0, ac.rendimiento) * 0.2))) +
        fila('Retenciones ya practicadas', menos(ac.retenido)) +
        fila('Pagos de trimestres anteriores', menos(ac.pagos130Previos)) +
        '<div class="linea-sep" style="margin:12px 0"></div>' +
        '<div class="flex" style="justify-content:space-between;align-items:baseline">' +
          '<span style="font-weight:650">Pago fraccionado estimado</span>' +
          '<span style="font-size:24px;font-weight:700;color:var(--azul)">' + U.eur(ac.pago130) + '</span>' +
        '</div>' +
        '<div class="ayuda" style="margin-top:8px">Si el 70 % o más de tus ingresos llevan retención, ' +
          'puedes quedar exento de presentar el 130. Consúltalo con tu asesor.</div>' +
      '</div></div>';
  }

  function tarjetaCategorias(r) {
    var lista = Object.keys(r.porCategoria).map(function (k) { return r.porCategoria[k]; })
      .sort(function (a, b) { return b.deducible - a.deducible; });
    var maximo = lista.length ? lista[0].deducible : 0;
    var cuerpo = lista.length
      ? lista.map(function (c) {
          var pct = maximo ? Math.round(c.deducible / maximo * 100) : 0;
          return '<div style="margin-bottom:12px">' +
            '<div class="flex" style="justify-content:space-between;font-size:13px;margin-bottom:4px">' +
              '<span>' + U.esc(c.nombre) + ' <span class="tenue">· ' + c.n + '</span></span>' +
              '<b style="font-variant-numeric:tabular-nums">' + U.eur(c.deducible) + '</b></div>' +
            '<div class="barra-progreso"><i style="width:' + pct + '%"></i></div></div>';
        }).join('')
      : '<div class="vacio" style="padding:20px"><p>Sin gastos registrados en este trimestre.</p></div>';
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Gasto deducible por categoría</h2></div>' +
      '<div class="tarjeta-cuerpo">' + cuerpo + '</div></div>';
  }

  function tarjetaEvolucion(anual) {
    var max = 0;
    anual.trimestres.forEach(function (t) {
      max = Math.max(max, t.ingresos.base, t.gastos.deducible);
    });
    var barras = anual.trimestres.map(function (t, i) {
      var hi = max ? Math.round(t.ingresos.base / max * 100) : 0;
      var hg = max ? Math.round(t.gastos.deducible / max * 100) : 0;
      return '<div style="flex:1 1 0;display:flex;flex-direction:column;align-items:center;gap:6px">' +
        '<div style="display:flex;align-items:flex-end;gap:4px;height:120px">' +
          '<div title="Ingresos" style="width:16px;height:' + Math.max(2, hi) + '%;background:var(--azul);border-radius:3px 3px 0 0"></div>' +
          '<div title="Gastos" style="width:16px;height:' + Math.max(2, hg) + '%;background:var(--oro);border-radius:3px 3px 0 0"></div>' +
        '</div>' +
        '<div style="font-size:12px;font-weight:600;color:' + (trimestreActivo === i + 1 ? 'var(--azul)' : 'var(--texto-3)') + '">' +
          (i + 1) + 'T</div></div>';
    }).join('');
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Año ' + anioActivo + '</h2>' +
      '<div class="der pequeno tenue">' +
        '<span style="display:inline-flex;align-items:center;gap:5px"><i style="width:9px;height:9px;background:var(--azul);border-radius:2px;display:inline-block"></i>Ingresos</span> ' +
        '<span style="display:inline-flex;align-items:center;gap:5px;margin-left:10px"><i style="width:9px;height:9px;background:var(--oro);border-radius:2px;display:inline-block"></i>Gastos</span>' +
      '</div></div>' +
      '<div class="tarjeta-cuerpo"><div class="flex" style="align-items:flex-end;gap:8px">' + barras + '</div>' +
      '<div class="linea-sep"></div>' +
      fila('Ingresos del año (base)', U.eur(anual.trimestres.reduce(function (s, t) { return s + t.ingresos.base; }, 0))) +
      fila('Gastos deducibles del año', U.eur(anual.trimestres.reduce(function (s, t) { return s + t.gastos.deducible; }, 0))) +
      '</div></div>';
  }

  // Evita imprimir "−0,00" cuando el importe es cero
  function menos(v) { return (U.r2(v) ? '−' : '') + U.eur(v); }

  function fila(texto, valor, fuerte) {
    return '<div class="flex" style="justify-content:space-between;padding:5px 0;font-size:13.5px' +
      (fuerte ? ';font-weight:650;color:var(--azul)' : ';color:var(--texto-2)') + '">' +
      '<span>' + U.esc(texto) + '</span>' +
      '<span style="font-variant-numeric:tabular-nums;white-space:nowrap">' + valor + '</span></div>';
  }

  function descargar() {
    var anual = Modelo.resumenAnual(App.estado, anioActivo, trimestreActivo);
    var filas = [['Concepto', '1T', '2T', '3T', '4T', 'Año']];
    function linea(nombre, fn) {
      var vals = anual.trimestres.map(fn);
      var total = vals.reduce(function (s, v) { return s + v; }, 0);
      filas.push([nombre].concat(vals.map(num)).concat([num(total)]));
    }
    linea('Ingresos aceptados (base)', function (t) { return t.ingresos.base; });
    linea('IVA repercutido', function (t) { return t.ingresos.iva; });
    linea('Retenciones de IRPF', function (t) { return t.ingresos.irpf; });
    linea('Gastos deducibles', function (t) { return t.gastos.deducible; });
    linea('IVA soportado deducible', function (t) { return t.gastos.ivaDeducible; });
    linea('IVA a liquidar', function (t) { return t.ivaLiquidar; });
    linea('Rendimiento del trimestre', function (t) { return t.rendimiento; });
    var csv = filas.map(function (f) {
      return f.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';');
    }).join('\r\n');
    U.descargar('resumen-' + anioActivo + '.csv', '﻿' + csv, 'text/csv;charset=utf-8');
    UI.aviso('Resumen descargado', 'ok');
  }

  function num(n) { return U.r2(n).toFixed(2).replace('.', ','); }
})(window);
