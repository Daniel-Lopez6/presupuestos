/* =========================================================================
   vista-precios.js — banco de precios reutilizable
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U, App = global.App, UI = global.UI, Base = global.Base;
  var busqueda = '', categoriaActiva = 'todas';

  App.vistas.precios = {
    titulo: 'Banco de precios',
    subtitulo: function () {
      var n = App.estado.partidas.length;
      return n + (n === 1 ? ' partida guardada' : ' partidas guardadas');
    },
    acciones: function () {
      return '<button class="btn" id="pre-importar">' + UI.ic('subida', 16) + '<span>Importar CSV</span></button>' +
        '<button class="btn" id="pre-exportar">' + UI.ic('descarga', 16) + '<span>Exportar CSV</span></button>' +
        '<button class="btn btn-pri" id="pre-nueva">' + UI.ic('mas', 16) + '<span>Nueva partida</span></button>';
    },
    render: function (cont) {
      var todas = App.estado.partidas;
      var nombres = Base.categoriasDe(App.estado);
      var haySinCategoria = todas.some(function (p) { return !p.categoria; });
      if (haySinCategoria) nombres = nombres.concat(['Sin categoría']);

      var lista = todas.filter(function (p) {
        if (categoriaActiva !== 'todas' && (p.categoria || 'Sin categoría') !== categoriaActiva) return false;
        if (!busqueda) return true;
        return U.contiene(p.descripcion, busqueda) || U.contiene(p.codigo, busqueda) || U.contiene(p.categoria, busqueda);
      });
      lista.sort(function (a, b) {
        var c = String(a.categoria || '').localeCompare(String(b.categoria || ''));
        return c !== 0 ? c : String(a.codigo || '').localeCompare(String(b.codigo || ''));
      });

      var chips = ['todas'].concat(nombres).map(function (n) {
        var cuantas = n === 'todas' ? todas.length : todas.filter(function (p) {
          return (p.categoria || 'Sin categoría') === n;
        }).length;
        return '<button class="btn btn-s' + (categoriaActiva === n ? ' btn-pri' : '') +
          '" data-cat="' + U.esc(n) + '">' + U.esc(n === 'todas' ? 'Todas' : n) +
          ' <span class="tenue" style="font-weight:600">' + cuantas + '</span></button>';
      }).join('') +
      '<button class="btn btn-s" id="cat-nueva" title="Crear una categoría">' +
        UI.ic('mas', 14) + '<span>Categoría</span></button>' +
      (categoriaActiva !== 'todas' && categoriaActiva !== 'Sin categoría'
        ? '<span class="tenue" style="margin:0 2px">·</span>' +
          '<button class="btn btn-s btn-plano" id="cat-renombrar" title="Cambiar el nombre">' +
            UI.ic('lapiz', 14) + '</button>' +
          '<button class="btn btn-s btn-plano" id="cat-borrar" title="Borrar la categoría">' +
            UI.ic('papelera', 14) + '</button>'
        : '');

      var filas = lista.map(function (p) {
        return '<tr class="fila-click" data-par="' + p.id + '">' +
          '<td class="apagado nowrap">' + U.esc(p.codigo || '') + '</td>' +
          '<td>' + U.esc(p.descripcion) + '</td>' +
          '<td class="tabla-oculta-movil">' + U.esc(p.categoria || '') + '</td>' +
          '<td class="cen">' + U.esc(p.unidad) + '</td>' +
          '<td class="num fuerte">' + U.eur(p.precio) + '</td>' +
          '<td class="cen apagado tabla-oculta-movil">' + (p.usos || 0) + '</td>' +
          '<td><div class="acciones-fila">' +
            '<button class="btn btn-plano btn-icono" data-editar="' + p.id + '" title="Editar">' + UI.ic('lapiz', 16) + '</button>' +
          '</div></td></tr>';
      }).join('');

      cont.innerHTML =
        '<div class="aviso aviso-info">' + UI.ic('info', 16) +
          '<div>Las partidas de aquí se insertan en cualquier presupuesto con dos clics. ' +
          'Los precios son sin IVA. Ajusta los tuyos y añade los que uses a menudo: es lo que más tiempo ahorra.</div></div>' +
        '<div class="tarjeta">' +
          '<div class="tarjeta-cab" style="flex-wrap:wrap;gap:8px">' +
            '<div class="flex" style="flex-wrap:wrap;gap:6px">' + chips + '</div>' +
            '<div class="der"><div class="buscador"><span class="ic-b">' + UI.ic('lupa', 15) + '</span>' +
              '<input type="search" id="pre-buscar" placeholder="Buscar partida" value="' + U.esc(busqueda) + '"></div></div>' +
          '</div>' +
          (lista.length
            ? '<div class="tabla-caja"><table class="t"><thead><tr><th>Código</th><th>Descripción</th>' +
              '<th class="tabla-oculta-movil">Categoría</th><th class="cen">Ud.</th><th class="der">Precio</th>' +
              '<th class="cen tabla-oculta-movil">Usos</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>'
            : UI.vacio('Sin partidas', 'Crea la primera o importa un CSV con tus precios.')) +
        '</div>';
    },
    despues: function (cont) {
      document.getElementById('pre-nueva').addEventListener('click', function () { formulario(null); });
      document.getElementById('pre-exportar').addEventListener('click', exportarCSV);
      document.getElementById('pre-importar').addEventListener('click', importarCSV);
      var buscar = document.getElementById('pre-buscar');
      if (buscar) buscar.addEventListener('input', U.debounce(function () {
        busqueda = buscar.value;
        App.refrescar();
        var n = document.getElementById('pre-buscar');
        if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
      }, 220));
      cont.querySelectorAll('[data-cat]').forEach(function (b) {
        b.addEventListener('click', function () { categoriaActiva = b.dataset.cat; App.refrescar(); });
      });
      enlaza('cat-nueva', nuevaCategoria);
      enlaza('cat-renombrar', function () { renombraCategoria(categoriaActiva); });
      enlaza('cat-borrar', function () { borraCategoria(categoriaActiva); });
      cont.querySelectorAll('[data-par]').forEach(function (f) {
        f.addEventListener('click', function (e) {
          if (e.target.closest('button')) return;
          formulario(App.partida(f.dataset.par));
        });
      });
      cont.querySelectorAll('[data-editar]').forEach(function (b) {
        b.addEventListener('click', function (e) { e.stopPropagation(); formulario(App.partida(b.dataset.editar)); });
      });
    }
  };

  function enlaza(id, fn) {
    var n = document.getElementById(id);
    if (n) n.addEventListener('click', fn);
  }

  function guardaCategorias(lista) {
    App.estado.ajustes.categoriasPrecios = lista;
    App.tocar(App.estado.ajustes);
    return App.guardar();
  }

  function nuevaCategoria() {
    UI.modal({
      titulo: 'Nueva categoría',
      cuerpo: UI.campo({ etiqueta: 'Nombre', nombre: 'cat', placeholder: 'Fontanería',
        ayuda: 'Sirve para tener el banco de precios ordenado por oficios o por zonas de la obra.' }),
      botones: [
        { texto: 'Cancelar' },
        { texto: 'Crear', clase: 'btn-pri', icono: 'mas', accion: function (m) {
          var nombre = (UI.valores(m.cuerpo).cat || '').trim();
          if (!nombre) { UI.aviso('Ponle un nombre', 'err'); return false; }
          var actuales = Base.categoriasDe(App.estado);
          if (actuales.some(function (c) { return U.normaliza(c) === U.normaliza(nombre); })) {
            UI.aviso('Ya tienes una categoría con ese nombre', 'err');
            return false;
          }
          guardaCategorias(actuales.concat([nombre]));
          categoriaActiva = nombre;
          App.refrescar();
          UI.aviso('Categoría creada', 'ok');
        } }
      ]
    });
  }

  function renombraCategoria(vieja) {
    UI.modal({
      titulo: 'Cambiar el nombre',
      cuerpo: UI.campo({ etiqueta: 'Nombre', nombre: 'cat', valor: vieja,
        ayuda: 'Se cambia también en todas las partidas que la tengan.' }),
      botones: [
        { texto: 'Cancelar' },
        { texto: 'Guardar', clase: 'btn-pri', icono: 'guardar', accion: function (m) {
          var nombre = (UI.valores(m.cuerpo).cat || '').trim();
          if (!nombre) { UI.aviso('Ponle un nombre', 'err'); return false; }
          if (nombre === vieja) return;
          App.estado.partidas.forEach(function (p) {
            if (p.categoria === vieja) { p.categoria = nombre; App.tocar(p); }
          });
          guardaCategorias(Base.categoriasDe(App.estado)
            .filter(function (c) { return c !== vieja; }).concat([nombre]));
          categoriaActiva = nombre;
          App.refrescar();
          UI.aviso('Categoría renombrada', 'ok');
        } }
      ]
    });
  }

  function borraCategoria(nombre) {
    var dentro = App.estado.partidas.filter(function (p) { return p.categoria === nombre; });

    function quitaDeAjustes() {
      return guardaCategorias(Base.categoriasDe(App.estado).filter(function (c) { return c !== nombre; }));
    }

    if (!dentro.length) {
      return UI.confirmar({
        titulo: 'Borrar la categoría',
        html: 'La categoría <b>' + U.esc(nombre) + '</b> está vacía, así que no se pierde ninguna partida.',
        aceptar: 'Borrar', peligro: true
      }).then(function (si) {
        if (!si) return;
        quitaDeAjustes();
        categoriaActiva = 'todas';
        App.refrescar();
        UI.aviso('Categoría borrada', 'ok');
      });
    }

    UI.modal({
      titulo: 'Borrar la categoría',
      cuerpo: '<p style="margin-top:0">En <b>' + U.esc(nombre) + '</b> tienes <b>' + dentro.length +
        (dentro.length === 1 ? '</b> partida.' : '</b> partidas.') + ' ¿Qué hago con ellas?</p>' +
        '<div class="aviso aviso-oro" style="margin-bottom:0">' + UI.ic('aviso', 15) +
        '<div>Si las conservas, se quedan en el banco de precios sin categoría y las ' +
        'puedes recolocar cuando quieras.</div></div>',
      sinFoco: true,
      botones: [
        { texto: 'Cancelar' },
        { texto: 'Conservar las partidas', accion: function () {
          dentro.forEach(function (p) { p.categoria = ''; App.tocar(p); });
          quitaDeAjustes();
          categoriaActiva = 'todas';
          App.refrescar();
          UI.aviso('Categoría borrada, partidas conservadas', 'ok');
        } },
        { texto: 'Borrar también las partidas', clase: 'btn-peligro', accion: function () {
          dentro.forEach(function (p) {
            App.estado.partidas = App.estado.partidas.filter(function (x) { return x.id !== p.id; });
            global.Fusion.anotaBorrado(App.estado, p.id);
          });
          quitaDeAjustes();
          categoriaActiva = 'todas';
          App.refrescar();
          UI.aviso('Categoría y partidas borradas', 'ok');
        } }
      ]
    });
  }

  function categoriasExistentes() {
    return Base.categoriasDe(App.estado);
  }

  function formulario(partida) {
    var esNueva = !partida;
    var p = partida || { id: U.uid('par'), codigo: '', descripcion: '', unidad: 'ud', precio: 0, categoria: '', usos: 0 };
    var caja = document.createElement('div');
    caja.innerHTML =
      UI.campo({ etiqueta: 'Descripción', tipo: 'textarea', nombre: 'descripcion', valor: p.descripcion, filas: 2,
                 ayuda: 'Escríbela tal cual quieres que salga impresa en el presupuesto.' }) +
      '<div class="fila-campos fc-3">' +
        UI.campo({ etiqueta: 'Código', nombre: 'codigo', valor: p.codigo, placeholder: 'PI-01' }) +
        UI.campo({ etiqueta: 'Unidad', tipo: 'select', nombre: 'unidad', valor: p.unidad, opciones: Base.UNIDADES }) +
        UI.campo({ etiqueta: 'Precio sin IVA', tipo: 'number', nombre: 'precio', valor: p.precio, paso: '0.01', min: 0 }) +
      '</div>' +
      UI.campo({ etiqueta: 'Categoría', nombre: 'categoria', valor: p.categoria,
                 attrs: ' list="lista-categorias"', ayuda: 'Sirve para agrupar y filtrar.' }) +
      '<datalist id="lista-categorias">' +
        categoriasExistentes().map(function (c) { return '<option value="' + U.esc(c) + '">'; }).join('') +
      '</datalist>';

    var botones = [{ texto: 'Cancelar' }];
    if (!esNueva) {
      botones.push({ texto: 'Eliminar', clase: 'btn-peligro izq', cierra: false, accion: function (m) {
        UI.confirmar({ titulo: 'Eliminar partida', texto: 'Se quitará del banco de precios.', aceptar: 'Eliminar', peligro: true })
          .then(function (si) {
            if (!si) return;
            App.borrar('partidas', p.id);
            m.cerrar(); App.refrescar();
          });
        return false;
      } });
    }
    botones.push({ texto: 'Guardar', clase: 'btn-pri', icono: 'guardar', accion: function (m) {
      var v = UI.valores(m.cuerpo);
      if (!v.descripcion || !v.descripcion.trim()) { UI.aviso('Falta la descripción', 'err'); return false; }
      p.descripcion = v.descripcion.trim();
      p.codigo = (v.codigo || '').trim();
      p.unidad = v.unidad;
      p.precio = U.num(v.precio);
      p.categoria = (v.categoria || '').trim();
      App.tocar(p);
      if (esNueva) App.estado.partidas.push(p);
      App.guardar();
      App.refrescar();
      UI.aviso(esNueva ? 'Partida creada' : 'Partida actualizada', 'ok');
    } });

    UI.modal({ titulo: esNueva ? 'Nueva partida' : 'Editar partida', cuerpo: caja, botones: botones });
  }

  function exportarCSV() {
    var filas = [['codigo', 'descripcion', 'unidad', 'precio', 'categoria']];
    App.estado.partidas.forEach(function (p) {
      filas.push([p.codigo || '', p.descripcion, p.unidad, String(p.precio).replace('.', ','), p.categoria || '']);
    });
    var csv = filas.map(function (f) {
      return f.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';');
    }).join('\r\n');
    U.descargar('banco-de-precios.csv', '﻿' + csv, 'text/csv;charset=utf-8');
    UI.aviso('Banco de precios exportado', 'ok');
  }

  function importarCSV() {
    var caja = document.createElement('div');
    caja.innerHTML =
      '<p style="margin-top:0;font-size:13.5px;color:var(--texto-2)">Un archivo CSV con estas columnas, ' +
      'separadas por punto y coma:<br><code>codigo;descripcion;unidad;precio;categoria</code></p>' +
      '<input type="file" accept=".csv,text/csv" id="pre-archivo">' +
      '<div id="pre-vista" style="margin-top:14px"></div>';
    var pendientes = [];
    var m = UI.modal({
      titulo: 'Importar precios desde CSV',
      cuerpo: caja,
      botones: [
        { texto: 'Cancelar' },
        { texto: 'Importar', clase: 'btn-pri', icono: 'subida', accion: function () {
          if (!pendientes.length) { UI.aviso('No hay nada que importar', 'err'); return false; }
          pendientes.forEach(function (p) { App.estado.partidas.push(p); });
          App.guardar();
          App.refrescar();
          UI.aviso(pendientes.length + ' partidas importadas', 'ok');
        } }
      ]
    });
    caja.querySelector('#pre-archivo').addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (!f) return;
      var lector = new FileReader();
      lector.onload = function (ev) {
        pendientes = parseaCSV(String(ev.target.result));
        caja.querySelector('#pre-vista').innerHTML = pendientes.length
          ? '<div class="aviso aviso-verde" style="margin:0">' + UI.ic('check', 16) +
            '<div>Se han leído <b>' + pendientes.length + '</b> partidas. Pulsa Importar para añadirlas.</div></div>'
          : '<div class="aviso aviso-rojo" style="margin:0">' + UI.ic('aviso', 16) +
            '<div>No se ha reconocido ninguna fila. Revisa el separador y las columnas.</div></div>';
      };
      lector.readAsText(f, 'utf-8');
    });
    return m;
  }

  function parseaCSV(texto) {
    var lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lineas.length) return [];
    var sep = (lineas[0].split(';').length >= lineas[0].split(',').length) ? ';' : ',';
    var cabecera = trocea(lineas[0], sep).map(function (c) { return U.normaliza(c); });
    var idx = {
      codigo: cabecera.indexOf('codigo'),
      descripcion: cabecera.indexOf('descripcion'),
      unidad: cabecera.indexOf('unidad'),
      precio: cabecera.indexOf('precio'),
      categoria: cabecera.indexOf('categoria')
    };
    var desde = idx.descripcion > -1 ? 1 : 0;
    if (idx.descripcion < 0) { idx = { codigo: 0, descripcion: 1, unidad: 2, precio: 3, categoria: 4 }; }
    var res = [];
    for (var i = desde; i < lineas.length; i++) {
      var c = trocea(lineas[i], sep);
      var d = (c[idx.descripcion] || '').trim();
      if (!d) continue;
      res.push({
        id: U.uid('par'),
        creado: new Date().toISOString(),
        modificado: new Date().toISOString(),
        codigo: (c[idx.codigo] || '').trim(),
        descripcion: d,
        unidad: (c[idx.unidad] || 'ud').trim() || 'ud',
        precio: U.num(c[idx.precio]),
        categoria: (c[idx.categoria] || '').trim(),
        usos: 0
      });
    }
    return res;
  }

  function trocea(linea, sep) {
    var res = [], actual = '', comillas = false;
    for (var i = 0; i < linea.length; i++) {
      var ch = linea[i];
      if (ch === '"') {
        if (comillas && linea[i + 1] === '"') { actual += '"'; i++; }
        else comillas = !comillas;
      } else if (ch === sep && !comillas) { res.push(actual); actual = ''; }
      else actual += ch;
    }
    res.push(actual);
    return res;
  }
})(window);
