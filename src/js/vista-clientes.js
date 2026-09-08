/* =========================================================================
   vista-clientes.js — fichas de clientes
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U, App = global.App, UI = global.UI, Modelo = global.Modelo;
  var busqueda = '';

  App.vistas.clientes = {
    titulo: 'Clientes',
    subtitulo: function () {
      var n = App.estado.clientes.length;
      return n ? n + (n === 1 ? ' ficha guardada' : ' fichas guardadas') : '';
    },
    acciones: function () {
      return '<button class="btn btn-pri" id="cli-nuevo">' + UI.ic('mas', 16) + '<span>Nuevo cliente</span></button>';
    },
    render: function (cont) {
      var lista = App.estado.clientes.filter(function (c) {
        if (!busqueda) return true;
        return U.contiene(c.nombre, busqueda) || U.contiene(c.nif, busqueda) ||
               U.contiene(c.ciudad, busqueda) || U.contiene(c.telefono, busqueda);
      });
      lista.sort(function (a, b) { return U.normaliza(a.nombre).localeCompare(U.normaliza(b.nombre)); });

      var filas = lista.map(function (c) {
        var e = estadisticas(c.id);
        return '<tr class="fila-click" data-cli="' + c.id + '">' +
          '<td class="fuerte">' + U.esc(c.nombre) +
            (c.nif ? '<div class="apagado">' + U.esc(c.nif) + '</div>' : '') + '</td>' +
          '<td class="tabla-oculta-movil">' + U.esc([c.cp, c.ciudad].filter(Boolean).join(' ')) + '</td>' +
          '<td class="tabla-oculta-movil">' + U.esc(c.telefono || '') +
            (c.email ? '<div class="apagado">' + U.esc(c.email) + '</div>' : '') + '</td>' +
          '<td class="cen">' + e.total + '</td>' +
          '<td class="num fuerte">' + U.eur(e.aceptado) + '</td>' +
          '<td><div class="acciones-fila">' +
            '<button class="btn btn-plano btn-icono" data-presupuesto="' + c.id + '" title="Nuevo presupuesto para este cliente">' + UI.ic('presupuestos', 16) + '</button>' +
            '<button class="btn btn-plano btn-icono" data-editar="' + c.id + '" title="Editar">' + UI.ic('lapiz', 16) + '</button>' +
          '</div></td>' +
        '</tr>';
      }).join('');

      cont.innerHTML = '<div class="tarjeta">' +
        '<div class="tarjeta-cab">' +
          '<div class="buscador"><span class="ic-b">' + UI.ic('lupa', 15) + '</span>' +
            '<input type="search" id="cli-buscar" placeholder="Buscar cliente" value="' + U.esc(busqueda) + '"></div>' +
        '</div>' +
        (lista.length
          ? '<div class="tabla-caja"><table class="t"><thead><tr><th>Cliente</th>' +
            '<th class="tabla-oculta-movil">Población</th><th class="tabla-oculta-movil">Contacto</th>' +
            '<th class="cen">Presup.</th><th class="der">Aceptado</th><th></th></tr></thead>' +
            '<tbody>' + filas + '</tbody></table></div>'
          : UI.vacio(App.estado.clientes.length ? 'Sin resultados' : 'Todavía no hay clientes',
              App.estado.clientes.length ? 'Prueba con otra palabra.'
                : 'Puedes crearlos aquí o guardarlos directamente desde un presupuesto.',
              App.estado.clientes.length ? '' : '<button class="btn btn-pri" id="cli-nuevo-vacio">' +
                UI.ic('mas', 16) + '<span>Nuevo cliente</span></button>')) +
      '</div>';
    },
    despues: function (cont) {
      ['cli-nuevo', 'cli-nuevo-vacio'].forEach(function (id) {
        var b = document.getElementById(id);
        if (b) b.addEventListener('click', function () { formulario(null); });
      });
      var buscar = document.getElementById('cli-buscar');
      if (buscar) buscar.addEventListener('input', U.debounce(function () {
        busqueda = buscar.value;
        App.refrescar();
        var n = document.getElementById('cli-buscar');
        if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
      }, 220));

      cont.querySelectorAll('[data-cli]').forEach(function (f) {
        f.addEventListener('click', function (e) {
          if (e.target.closest('button')) return;
          detalle(f.dataset.cli);
        });
      });
      cont.querySelectorAll('[data-editar]').forEach(function (b) {
        b.addEventListener('click', function (e) { e.stopPropagation(); formulario(App.cliente(b.dataset.editar)); });
      });
      cont.querySelectorAll('[data-presupuesto]').forEach(function (b) {
        b.addEventListener('click', function (e) { e.stopPropagation(); presupuestoPara(b.dataset.presupuesto); });
      });
    }
  };

  function estadisticas(clienteId) {
    var r = { total: 0, aceptado: 0, lista: [] };
    App.estado.presupuestos.forEach(function (p) {
      var coincide = p.clienteId === clienteId;
      if (!coincide) {
        var c = App.cliente(clienteId);
        if (c && p.cliente && U.normaliza(p.cliente.nombre) === U.normaliza(c.nombre)) coincide = true;
      }
      if (!coincide) return;
      r.total++;
      r.lista.push(p);
      if (p.estado === 'aceptado') r.aceptado += Modelo.totales(p).total;
    });
    r.aceptado = U.r2(r.aceptado);
    return r;
  }

  function formulario(cliente) {
    var esNuevo = !cliente;
    var c = cliente || Modelo.nuevoCliente();
    var caja = document.createElement('div');
    caja.innerHTML =
      UI.campo({ etiqueta: 'Nombre o razón social', nombre: 'nombre', valor: c.nombre, requerido: true }) +
      '<div class="fila-campos fc-2">' +
        UI.campo({ etiqueta: 'NIF / CIF', nombre: 'nif', valor: c.nif }) +
        UI.campo({ etiqueta: 'Teléfono', nombre: 'telefono', valor: c.telefono }) +
      '</div>' +
      UI.campo({ etiqueta: 'Dirección', nombre: 'direccion', valor: c.direccion }) +
      '<div class="fila-campos fc-2">' +
        UI.campo({ etiqueta: 'Código postal', nombre: 'cp', valor: c.cp }) +
        UI.campo({ etiqueta: 'Población', nombre: 'ciudad', valor: c.ciudad }) +
      '</div>' +
      UI.campo({ etiqueta: 'Correo electrónico', tipo: 'email', nombre: 'email', valor: c.email }) +
      UI.campo({ etiqueta: 'Notas internas', tipo: 'textarea', nombre: 'notas', valor: c.notas, filas: 2,
                 ayuda: 'No se imprimen en el presupuesto.' }) +
      '<div id="cli-error"></div>';

    var botones = [{ texto: 'Cancelar' }];
    if (!esNuevo) {
      botones.push({ texto: 'Eliminar', clase: 'btn-peligro izq', cierra: false, accion: function (m) {
        UI.confirmar({
          titulo: 'Eliminar cliente',
          html: 'Se borrará la ficha de <b>' + U.esc(c.nombre) + '</b>. Los presupuestos ya emitidos conservan sus datos.',
          aceptar: 'Eliminar', peligro: true
        }).then(function (si) {
          if (!si) return;
          App.borrar('clientes', c.id);
          m.cerrar();
          App.refrescar();
        });
        return false;
      } });
    }
    botones.push({ texto: 'Guardar', clase: 'btn-pri', icono: 'guardar', accion: function (m) {
      var v = UI.valores(m.cuerpo);
      if (!v.nombre || !v.nombre.trim()) {
        m.cuerpo.querySelector('#cli-error').innerHTML = '<div class="ayuda error">Escribe al menos el nombre.</div>';
        return false;
      }
      var nif = U.validaNIF(v.nif);
      if (v.nif && !nif.ok) {
        m.cuerpo.querySelector('#cli-error').innerHTML =
          '<div class="ayuda error">El NIF o CIF no parece correcto. Puedes guardarlo igualmente pulsando otra vez.</div>';
        if (!m._avisado) { m._avisado = true; return false; }
      }
      ['nombre', 'nif', 'direccion', 'cp', 'ciudad', 'telefono', 'email', 'notas'].forEach(function (k) {
        c[k] = (v[k] || '').trim();
      });
      App.tocar(c);
      if (esNuevo) App.estado.clientes.push(c);
      App.guardar();
      App.refrescar();
      UI.aviso(esNuevo ? 'Cliente creado' : 'Cliente actualizado', 'ok');
    } });

    UI.modal({ titulo: esNuevo ? 'Nuevo cliente' : 'Editar cliente', cuerpo: caja, botones: botones });
  }

  function detalle(id) {
    var c = App.cliente(id);
    if (!c) return;
    var e = estadisticas(id);
    var lista = e.lista.sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });
    var filas = lista.map(function (p) {
      return '<tr class="fila-click" data-ir="' + p.id + '">' +
        '<td class="fuerte nowrap">' + U.esc(p.numero) + '</td>' +
        '<td class="nowrap">' + U.fechaCorta(p.fecha) + '</td>' +
        '<td class="num">' + U.eur(Modelo.totales(p).total) + '</td>' +
        '<td>' + UI.etiquetaEstado(Modelo.estadoEfectivo(p)) + '</td></tr>';
    }).join('');

    var caja = document.createElement('div');
    caja.innerHTML =
      '<div class="rejilla rej-2" style="margin-bottom:16px">' +
        '<div class="kpi"><div class="kpi-tit">Presupuestos</div><div class="kpi-val">' + e.total + '</div></div>' +
        '<div class="kpi"><div class="kpi-tit">Trabajo aceptado</div><div class="kpi-val verde">' + U.eur(e.aceptado) + '</div></div>' +
      '</div>' +
      '<div style="font-size:13.5px;color:var(--texto-2);line-height:1.7;margin-bottom:16px">' +
        (c.nif ? '<div>NIF: ' + U.esc(c.nif) + '</div>' : '') +
        (c.direccion ? '<div>' + U.esc(c.direccion) + '</div>' : '') +
        ([c.cp, c.ciudad].filter(Boolean).length ? '<div>' + U.esc([c.cp, c.ciudad].filter(Boolean).join(' ')) + '</div>' : '') +
        (c.telefono ? '<div>' + U.esc(c.telefono) + '</div>' : '') +
        (c.email ? '<div>' + U.esc(c.email) + '</div>' : '') +
        (c.notas ? '<div class="aviso aviso-info" style="margin-top:12px">' + U.nl2br(c.notas) + '</div>' : '') +
      '</div>' +
      (lista.length
        ? '<table class="t"><thead><tr><th>Número</th><th>Fecha</th><th class="der">Total</th><th>Estado</th></tr></thead>' +
          '<tbody>' + filas + '</tbody></table>'
        : '<div class="vacio" style="padding:24px"><p>Sin presupuestos todavía.</p></div>');

    var m = UI.modal({
      titulo: c.nombre,
      ancho: 'ancho',
      cuerpo: caja,
      sinFoco: true,
      botones: [
        { texto: 'Cerrar' },
        { texto: 'Editar ficha', icono: 'lapiz', accion: function () { formulario(c); } },
        { texto: 'Nuevo presupuesto', clase: 'btn-pri', icono: 'mas', accion: function () { presupuestoPara(id); } }
      ]
    });
    caja.querySelectorAll('[data-ir]').forEach(function (f) {
      f.addEventListener('click', function () { m.cerrar(); App.ir('editor', { id: f.dataset.ir }); });
    });
  }

  function presupuestoPara(clienteId) {
    var c = App.cliente(clienteId);
    var p = Modelo.nuevoPresupuesto(App.estado);
    Modelo.consumeNumero(App.estado);
    if (c) {
      p.clienteId = c.id;
      ['nombre', 'nif', 'direccion', 'cp', 'ciudad', 'telefono', 'email'].forEach(function (k) {
        p.cliente[k] = c[k] || '';
      });
    }
    App.estado.presupuestos.push(p);
    App.guardar();
    App.ir('editor', { id: p.id });
  }
})(window);
