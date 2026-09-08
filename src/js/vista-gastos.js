/* =========================================================================
   vista-gastos.js — libro de gastos deducibles
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U, App = global.App, UI = global.UI,
      Base = global.Base, Modelo = global.Modelo;

  var f = { anio: new Date().getFullYear(), trimestre: 0, categoria: 'todas', texto: '' };

  App.vistas.gastos = {
    titulo: 'Gastos',
    subtitulo: function () {
      var n = App.estado.gastos.length;
      return n ? n + (n === 1 ? ' gasto registrado' : ' gastos registrados') : '';
    },
    acciones: function () {
      return '<button class="btn" id="gas-csv">' + UI.ic('descarga', 16) + '<span>Exportar para la gestoría</span></button>' +
        '<button class="btn btn-pri" id="gas-nuevo">' + UI.ic('mas', 16) + '<span>Nuevo gasto</span></button>';
    },
    render: function (cont) {
      var lista = filtrados();
      var suma = { base: 0, iva: 0, ivaDed: 0, deducible: 0, total: 0 };
      lista.forEach(function (g) {
        var t = Modelo.totalesGasto(g);
        suma.base += t.base; suma.iva += t.iva; suma.ivaDed += t.ivaDeducible;
        suma.deducible += t.gastoDeducible; suma.total += t.total;
      });
      Object.keys(suma).forEach(function (k) { suma[k] = U.r2(suma[k]); });

      var filas = lista.map(function (g) {
        var t = Modelo.totalesGasto(g);
        var cat = Base.categoria(g.categoria);
        return '<tr class="fila-click" data-gas="' + g.id + '">' +
          '<td class="nowrap">' + U.fechaCorta(g.fecha) + '</td>' +
          '<td>' + U.esc(g.concepto || cat.nombre) +
            '<div class="apagado">' + U.esc(g.proveedor || '') +
            (g.numeroFactura ? ' · ' + U.esc(g.numeroFactura) : '') + '</div></td>' +
          '<td class="tabla-oculta-movil"><span class="eti eti-gris">' + U.esc(cat.nombre) + '</span></td>' +
          '<td class="num">' + U.eur(t.base) + '</td>' +
          '<td class="num tabla-oculta-movil">' + U.eur(t.iva) + '</td>' +
          '<td class="num fuerte">' + U.eur(t.gastoDeducible) +
            (t.afectacion < 100 ? '<div class="apagado">' + U.cant(t.afectacion) + ' %</div>' : '') + '</td>' +
          '<td><div class="acciones-fila">' +
            '<button class="btn btn-plano btn-icono" data-editar="' + g.id + '" title="Editar">' + UI.ic('lapiz', 16) + '</button>' +
          '</div></td></tr>';
      }).join('');

      cont.innerHTML =
        '<div class="aviso aviso-oro">' + UI.ic('info', 16) +
          '<div><b>Cómo se usa esto.</b> Apunta cada factura de gasto con su base y su IVA. ' +
          'La aplicación calcula qué parte es deducible según la categoría y lo lleva al resumen trimestral. ' +
          'Guarda siempre la factura original: sin ella el gasto no se puede deducir.</div></div>' +
        '<div class="rejilla rej-4" style="margin-bottom:18px">' +
          tarjeta('Base de los gastos', U.eur(suma.base)) +
          tarjeta('IVA soportado', U.eur(suma.iva)) +
          tarjeta('IVA deducible', U.eur(suma.ivaDed)) +
          tarjeta('Gasto deducible', U.eur(suma.deducible), 'verde') +
        '</div>' +
        '<div class="tarjeta">' +
          '<div class="tarjeta-cab" style="flex-wrap:wrap;gap:8px">' + controles() + '</div>' +
          (lista.length
            ? '<div class="tabla-caja"><table class="t"><thead><tr><th>Fecha</th><th>Concepto</th>' +
              '<th class="tabla-oculta-movil">Categoría</th><th class="der">Base</th>' +
              '<th class="der tabla-oculta-movil">IVA</th><th class="der">Deducible</th><th></th>' +
              '</tr></thead><tbody>' + filas + '</tbody></table></div>'
            : UI.vacio(App.estado.gastos.length ? 'Sin gastos con ese filtro' : 'Todavía no hay gastos',
                App.estado.gastos.length ? 'Cambia el periodo o la categoría.'
                  : 'Empieza por los habituales: material, combustible, cuota de autónomos.',
                '<button class="btn btn-pri" id="gas-nuevo-vacio">' + UI.ic('mas', 16) + '<span>Nuevo gasto</span></button>')) +
        '</div>';
    },
    despues: function (cont) {
      ['gas-nuevo', 'gas-nuevo-vacio'].forEach(function (id) {
        var b = document.getElementById(id);
        if (b) b.addEventListener('click', function () { formulario(null); });
      });
      document.getElementById('gas-csv').addEventListener('click', exportarCSV);

      ['f-anio', 'f-trimestre', 'f-categoria'].forEach(function (id) {
        var s = document.getElementById(id);
        if (!s) return;
        s.addEventListener('change', function () {
          if (id === 'f-anio') f.anio = U.num(s.value);
          if (id === 'f-trimestre') f.trimestre = U.num(s.value);
          if (id === 'f-categoria') f.categoria = s.value;
          App.refrescar();
        });
      });
      var buscar = document.getElementById('f-texto');
      if (buscar) buscar.addEventListener('input', U.debounce(function () {
        f.texto = buscar.value;
        App.refrescar();
        var n = document.getElementById('f-texto');
        if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
      }, 220));

      cont.querySelectorAll('[data-gas]').forEach(function (fila) {
        fila.addEventListener('click', function (e) {
          if (e.target.closest('button')) return;
          formulario(App.gasto(fila.dataset.gas));
        });
      });
      cont.querySelectorAll('[data-editar]').forEach(function (b) {
        b.addEventListener('click', function (e) { e.stopPropagation(); formulario(App.gasto(b.dataset.editar)); });
      });
    }
  };

  function tarjeta(titulo, valor, clase) {
    return '<div class="kpi"><div class="kpi-tit">' + U.esc(titulo) + '</div>' +
      '<div class="kpi-val' + (clase ? ' ' + clase : '') + '" style="font-size:21px">' + valor + '</div></div>';
  }

  function anios() {
    var s = {};
    App.estado.gastos.forEach(function (g) { if (g.fecha) s[g.fecha.slice(0, 4)] = true; });
    s[new Date().getFullYear()] = true;
    return Object.keys(s).sort().reverse();
  }

  function controles() {
    var opAnios = anios().map(function (a) {
      return '<option value="' + a + '"' + (String(f.anio) === a ? ' selected' : '') + '>' + a + '</option>';
    }).join('');
    var opTri = [{ v: 0, n: 'Todo el año' }, { v: 1, n: '1T · ene-mar' }, { v: 2, n: '2T · abr-jun' },
                 { v: 3, n: '3T · jul-sep' }, { v: 4, n: '4T · oct-dic' }].map(function (o) {
      return '<option value="' + o.v + '"' + (f.trimestre === o.v ? ' selected' : '') + '>' + o.n + '</option>';
    }).join('');
    var grupos = {};
    Base.CATEGORIAS_GASTO.forEach(function (c) {
      if (!grupos[c.grupo]) grupos[c.grupo] = [];
      grupos[c.grupo].push(c);
    });
    var opCat = '<option value="todas">Todas las categorías</option>' +
      Object.keys(grupos).map(function (g) {
        return '<optgroup label="' + U.esc(g) + '">' + grupos[g].map(function (c) {
          return '<option value="' + c.id + '"' + (f.categoria === c.id ? ' selected' : '') + '>' + U.esc(c.nombre) + '</option>';
        }).join('') + '</optgroup>';
      }).join('');

    return '<div class="flex" style="gap:8px;flex-wrap:wrap">' +
        '<select id="f-anio" style="width:auto">' + opAnios + '</select>' +
        '<select id="f-trimestre" style="width:auto">' + opTri + '</select>' +
        '<select id="f-categoria" style="width:auto;max-width:260px">' + opCat + '</select>' +
      '</div>' +
      '<div class="der"><div class="buscador"><span class="ic-b">' + UI.ic('lupa', 15) + '</span>' +
        '<input type="search" id="f-texto" placeholder="Buscar concepto o proveedor" value="' + U.esc(f.texto) + '"></div></div>';
  }

  function filtrados() {
    var r = f.trimestre ? Modelo.rangoTrimestre(f.anio, f.trimestre) : null;
    return App.estado.gastos.filter(function (g) {
      if (!g.fecha) return false;
      if (r) { if (g.fecha < r.desde || g.fecha > r.hasta) return false; }
      else if (g.fecha.slice(0, 4) !== String(f.anio)) return false;
      if (f.categoria !== 'todas' && g.categoria !== f.categoria) return false;
      if (f.texto && !(U.contiene(g.concepto, f.texto) || U.contiene(g.proveedor, f.texto) ||
                       U.contiene(g.numeroFactura, f.texto))) return false;
      return true;
    }).sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });
  }

  /* --- Formulario --------------------------------------------------------- */

  function formulario(gasto) {
    var esNuevo = !gasto;
    var g = gasto || Modelo.nuevoGasto({});
    var caja = document.createElement('div');

    var grupos = {};
    Base.CATEGORIAS_GASTO.forEach(function (c) {
      if (!grupos[c.grupo]) grupos[c.grupo] = [];
      grupos[c.grupo].push(c);
    });
    var opCat = Object.keys(grupos).map(function (gr) {
      return '<optgroup label="' + U.esc(gr) + '">' + grupos[gr].map(function (c) {
        return '<option value="' + c.id + '"' + (g.categoria === c.id ? ' selected' : '') + '>' + U.esc(c.nombre) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');

    caja.innerHTML =
      '<div class="fila-campos fc-2">' +
        UI.campo({ etiqueta: 'Fecha de la factura', tipo: 'date', nombre: 'fecha', valor: g.fecha }) +
        '<div class="campo"><label for="g-cat">Categoría</label>' +
          '<select id="g-cat" name="categoria">' + opCat + '</select></div>' +
      '</div>' +
      '<div id="g-nota-cat"></div>' +
      UI.campo({ etiqueta: 'Concepto', nombre: 'concepto', valor: g.concepto,
                 placeholder: 'Sacos de cemento y mortero cola' }) +
      '<div class="fila-campos fc-2">' +
        UI.campo({ etiqueta: 'Proveedor', nombre: 'proveedor', valor: g.proveedor }) +
        UI.campo({ etiqueta: 'NIF del proveedor', nombre: 'nif', valor: g.nif }) +
      '</div>' +
      '<div class="fila-campos fc-2">' +
        UI.campo({ etiqueta: 'Nº de factura', nombre: 'numeroFactura', valor: g.numeroFactura }) +
        UI.campo({ etiqueta: 'Forma de pago', tipo: 'select', nombre: 'formaPago', valor: g.formaPago,
                   opciones: [
                     { valor: 'tarjeta', nombre: 'Tarjeta' },
                     { valor: 'transferencia', nombre: 'Transferencia' },
                     { valor: 'domiciliado', nombre: 'Recibo domiciliado' },
                     { valor: 'efectivo', nombre: 'Efectivo' }
                   ] }) +
      '</div>' +
      '<div class="linea-sep"></div>' +
      '<div class="fila-campos fc-4">' +
        UI.campo({ etiqueta: 'Base imponible', tipo: 'number', nombre: 'base', valor: g.base, paso: '0.01', min: 0 }) +
        UI.campo({ etiqueta: 'IVA', tipo: 'select', nombre: 'ivaPct', valor: g.ivaPct,
                   opciones: [{ valor: 21, nombre: '21 %' }, { valor: 10, nombre: '10 %' },
                              { valor: 4, nombre: '4 %' }, { valor: 0, nombre: 'Sin IVA' }] }) +
        UI.campo({ etiqueta: 'Afectación a la actividad (%)', tipo: 'number', nombre: 'afectacion',
                   valor: g.afectacion === null || g.afectacion === undefined ? '' : g.afectacion,
                   paso: '1', min: 0, attrs: ' max="100" placeholder="según categoría"' }) +
        UI.campo({ etiqueta: 'IVA deducible (%)', tipo: 'number', nombre: 'ivaAfectacion',
                   valor: g.ivaAfectacion === null || g.ivaAfectacion === undefined ? '' : g.ivaAfectacion,
                   paso: '1', min: 0, attrs: ' max="100" placeholder="según categoría"' }) +
      '</div>' +
      '<div id="g-calculo"></div>' +
      UI.campo({ etiqueta: 'Notas', tipo: 'textarea', nombre: 'notas', valor: g.notas, filas: 2 });

    function recalcula() {
      var v = UI.valores(caja);
      var tmp = {
        base: v.base, ivaPct: v.ivaPct, categoria: v.categoria,
        afectacion: v.afectacion === '' ? null : U.num(v.afectacion),
        ivaAfectacion: v.ivaAfectacion === '' ? null : U.num(v.ivaAfectacion)
      };
      var t = Modelo.totalesGasto(tmp);
      var cat = Base.categoria(v.categoria);
      caja.querySelector('#g-nota-cat').innerHTML = cat.nota
        ? '<div class="aviso aviso-info" style="margin:-4px 0 14px">' + UI.ic('info', 15) +
          '<div>' + U.esc(cat.nota) + '</div></div>' : '';
      caja.querySelector('#g-calculo').innerHTML =
        '<div class="resumen-caja" style="width:100%;margin:0 0 14px">' +
          '<div class="fila"><span>Total de la factura</span><b>' + U.eur(t.total) + '</b></div>' +
          '<div class="fila"><span>IVA deducible (' + U.cant(t.ivaDeduciblePct) + ' %)</span><b>' + U.eur(t.ivaDeducible) + '</b></div>' +
          '<div class="fila"><span>Gasto deducible en IRPF (' + U.cant(t.afectacion) + ' %)</span><b>' + U.eur(t.gastoDeducible) + '</b></div>' +
        '</div>';
    }

    caja.addEventListener('input', recalcula);
    caja.addEventListener('change', recalcula);

    var botones = [{ texto: 'Cancelar' }];
    if (!esNuevo) {
      botones.push({ texto: 'Eliminar', clase: 'btn-peligro izq', cierra: false, accion: function (m) {
        UI.confirmar({ titulo: 'Eliminar gasto', texto: 'Se borrará del libro de gastos.', aceptar: 'Eliminar', peligro: true })
          .then(function (si) {
            if (!si) return;
            App.borrar('gastos', g.id);
            m.cerrar(); App.refrescar();
          });
        return false;
      } });
    }
    botones.push({ texto: esNuevo ? 'Guardar y añadir otro' : 'Guardar', clase: esNuevo ? '' : 'btn-pri',
      cierra: !esNuevo, accion: function (m) {
        if (!aplica(m.cuerpo, g)) return false;
        if (esNuevo) { App.estado.gastos.push(g); }
        App.guardar();
        App.refrescar();
        UI.aviso('Gasto guardado', 'ok');
        if (esNuevo) { m.cerrar(); formulario(null); }
      } });
    if (esNuevo) {
      botones.push({ texto: 'Guardar', clase: 'btn-pri', icono: 'guardar', accion: function (m) {
        if (!aplica(m.cuerpo, g)) return false;
        App.estado.gastos.push(g);
        App.guardar();
        App.refrescar();
        UI.aviso('Gasto guardado', 'ok');
      } });
    }

    var m = UI.modal({ titulo: esNuevo ? 'Nuevo gasto' : 'Editar gasto', cuerpo: caja, ancho: 'ancho', botones: botones });
    recalcula();
    return m;
  }

  function aplica(raiz, g) {
    var v = UI.valores(raiz);
    if (!v.fecha) { UI.aviso('Falta la fecha', 'err'); return false; }
    if (U.num(v.base) <= 0) { UI.aviso('La base imponible debe ser mayor que cero', 'err'); return false; }
    g.fecha = v.fecha;
    g.categoria = v.categoria;
    g.concepto = (v.concepto || '').trim();
    g.proveedor = (v.proveedor || '').trim();
    g.nif = (v.nif || '').trim();
    g.numeroFactura = (v.numeroFactura || '').trim();
    g.formaPago = v.formaPago;
    g.base = U.num(v.base);
    g.ivaPct = U.num(v.ivaPct);
    g.afectacion = v.afectacion === '' ? null : U.num(v.afectacion);
    g.ivaAfectacion = v.ivaAfectacion === '' ? null : U.num(v.ivaAfectacion);
    g.notas = (v.notas || '').trim();
    App.tocar(g);
    return true;
  }

  /* --- Exportación -------------------------------------------------------- */

  function exportarCSV() {
    var lista = filtrados();
    if (!lista.length) return UI.aviso('No hay gastos en el periodo seleccionado', 'err');
    var filas = [['Fecha', 'Proveedor', 'NIF', 'Nº factura', 'Concepto', 'Categoría',
                  'Base', 'Tipo IVA', 'Cuota IVA', 'Total', 'IVA deducible', 'Gasto deducible', 'Forma de pago']];
    lista.forEach(function (g) {
      var t = Modelo.totalesGasto(g);
      filas.push([
        U.fechaCorta(g.fecha), g.proveedor || '', g.nif || '', g.numeroFactura || '',
        g.concepto || '', Base.categoria(g.categoria).nombre,
        coma(t.base), U.cant(t.ivaPct), coma(t.iva), coma(t.total),
        coma(t.ivaDeducible), coma(t.gastoDeducible), g.formaPago || ''
      ]);
    });
    var csv = filas.map(function (fl) {
      return fl.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';');
    }).join('\r\n');
    var periodo = f.trimestre ? f.anio + '-' + f.trimestre + 'T' : String(f.anio);
    U.descargar('gastos-' + periodo + '.csv', '﻿' + csv, 'text/csv;charset=utf-8');
    UI.aviso('Gastos exportados', 'ok');
  }

  function coma(n) { return String(U.r2(n).toFixed(2)).replace('.', ','); }
})(window);
