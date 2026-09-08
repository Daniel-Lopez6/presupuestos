/* =========================================================================
   app.js — arranque, estado global y navegación
   Se expone en window.App
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U, Base = global.Base, Store = global.Store,
      Modelo = global.Modelo, UI = global.UI;

  var App = {
    estado: null,
    vistas: {},
    vistaActual: null,
    parametros: {},
    listo: false
  };

  var MENU = [
    { id: 'panel',        nombre: 'Panel',        icono: 'panel' },
    { id: 'presupuestos', nombre: 'Presupuestos', icono: 'presupuestos' },
    { id: 'clientes',     nombre: 'Clientes',     icono: 'clientes' },
    { id: 'precios',      nombre: 'Precios',      icono: 'precios' },
    { id: 'gastos',       nombre: 'Gastos',       icono: 'gastos' },
    { id: 'fiscal',       nombre: 'Resumen',      icono: 'fiscal' },
    { id: 'ajustes',      nombre: 'Ajustes',      icono: 'ajustes' }
  ];

  var MENU_MOVIL = ['panel', 'presupuestos', 'clientes', 'gastos', 'fiscal'];

  /* --- Estado ------------------------------------------------------------ */

  function normaliza(estado) {
    var base = Base.estadoInicial();
    if (!estado || typeof estado !== 'object') return base;
    estado.version = 1;
    estado.ajustes = Object.assign({}, base.ajustes, estado.ajustes || {});
    estado.ajustes.emisor = Object.assign({}, base.ajustes.emisor, (estado.ajustes || {}).emisor || {});
    estado.ajustes.numeracion = Object.assign({}, base.ajustes.numeracion, (estado.ajustes || {}).numeracion || {});
    if (!Array.isArray(estado.ajustes.condiciones)) estado.ajustes.condiciones = base.ajustes.condiciones;
    if (!estado.borrados || typeof estado.borrados !== 'object') estado.borrados = {};
    if (!estado.ajustes.modificado) estado.ajustes.modificado = estado.ajustes.creado || base.ajustes.creado;
    ['clientes', 'partidas', 'presupuestos', 'gastos'].forEach(function (k) {
      if (!Array.isArray(estado[k])) estado[k] = [];
      // Los datos guardados antes de existir la sincronización no traen
      // marcas de tiempo: se les pone una para que la fusión pueda comparar.
      estado[k].forEach(function (r) {
        if (!r.creado) r.creado = new Date(0).toISOString();
        if (!r.modificado) r.modificado = r.creado;
      });
    });
    estado.presupuestos.forEach(function (p) {
      if (!Array.isArray(p.lineas)) p.lineas = [];
      if (!p.cliente) p.cliente = Modelo.clienteVacio();
      if (!Array.isArray(p.condiciones)) p.condiciones = estado.ajustes.condiciones.slice();
      p.lineas.forEach(function (l) { if (!l.id) l.id = U.uid('lin'); });
    });
    return estado;
  }

  // Marca un registro como recién tocado. Es lo que decide quién gana cuando
  // el mismo registro se ha editado en dos dispositivos.
  App.tocar = function (registro) {
    if (registro) registro.modificado = new Date().toISOString();
    return registro;
  };

  // Borra dejando rastro, para que la baja también viaje al otro dispositivo.
  App.borrar = function (coleccion, id) {
    App.estado[coleccion] = App.estado[coleccion].filter(function (x) { return x.id !== id; });
    global.Fusion.anotaBorrado(App.estado, id);
    return App.guardar();
  };

  var avisoFalloDado = 0;

  App.guardar = function (silencioso) {
    if (!App.estado) return Promise.resolve();
    App.estado.modificado = new Date().toISOString();
    return Store.guardar(App.estado).then(function (ok) {
      if (ok === false) return falloAlGuardar();
      if (global.Sync) global.Sync.programar();
      if (!silencioso) marcaEstadoGuardado();
    });
  };

  // Si el navegador se queda sin espacio hay que avisar: de lo contrario el
  // usuario seguiría trabajando creyendo que todo se está guardando.
  function falloAlGuardar() {
    var n = document.getElementById('estado-guardado');
    if (n) n.innerHTML = '<b style="color:#E8A87C">No se ha podido guardar</b>';
    if (Date.now() - avisoFalloDado < 60000) return;
    avisoFalloDado = Date.now();
    UI.modal({
      titulo: 'No se han podido guardar los cambios',
      cuerpo: '<p>El navegador ha rechazado la escritura, casi siempre por falta de espacio.</p>' +
        '<p>Descarga ahora una copia de seguridad para no perder nada. Después puedes ' +
        'liberar espacio borrando presupuestos antiguos o quitando el logotipo desde Ajustes.</p>',
      botones: [
        { texto: 'Seguir' },
        { texto: 'Descargar copia', clase: 'btn-pri', icono: 'descarga', accion: function () { App.exportar(); } }
      ]
    });
  }

  App.guardarYa = function () {
    return App.estado ? Store.guardarYa(App.estado) : Promise.resolve();
  };

  function marcaEstadoGuardado() {
    var n = document.getElementById('estado-guardado');
    if (!n) return;
    n.textContent = 'Guardado ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  /* --- Búsqueda de entidades --------------------------------------------- */

  App.presupuesto = function (id) {
    return App.estado.presupuestos.filter(function (p) { return p.id === id; })[0] || null;
  };
  App.cliente = function (id) {
    return App.estado.clientes.filter(function (c) { return c.id === id; })[0] || null;
  };
  App.partida = function (id) {
    return App.estado.partidas.filter(function (p) { return p.id === id; })[0] || null;
  };
  App.gasto = function (id) {
    return App.estado.gastos.filter(function (g) { return g.id === id; })[0] || null;
  };

  /* --- Navegación --------------------------------------------------------- */

  App.ir = function (vista, parametros, sinHistorial) {
    if (!App.vistas[vista]) vista = 'panel';
    App.vistaActual = vista;
    App.parametros = parametros || {};
    var destino = '#' + vista + (App.parametros.id ? '/' + App.parametros.id : '');
    if (!sinHistorial && location.hash !== destino) {
      location.hash = destino;
      return; // el evento hashchange vuelve a llamar a ir()
    }
    pinta();
  };

  App.refrescar = function () { pinta(); };

  function pinta() {
    var v = App.vistas[App.vistaActual];
    if (!v) return;
    document.querySelectorAll('.nav-item').forEach(function (b) {
      b.classList.toggle('activo', b.dataset.vista === App.vistaActual);
    });
    document.querySelectorAll('.nav-movil button').forEach(function (b) {
      b.classList.toggle('activo', b.dataset.vista === App.vistaActual);
    });
    var titulo = document.getElementById('titulo-vista');
    var sub = document.getElementById('sub-vista');
    var acciones = document.getElementById('acciones-vista');
    var cont = document.getElementById('contenido');

    titulo.textContent = typeof v.titulo === 'function' ? v.titulo() : (v.titulo || '');
    var s = typeof v.subtitulo === 'function' ? v.subtitulo() : (v.subtitulo || '');
    sub.innerHTML = s;
    sub.style.display = s ? '' : 'none';
    acciones.innerHTML = v.acciones ? v.acciones() : '';
    cont.innerHTML = '';
    v.render(cont);
    if (v.despues) v.despues(cont);
    window.scrollTo(0, 0);
    actualizaContadores();
  }

  function actualizaContadores() {
    var hoy = U.hoyISO();
    var pend = App.estado.presupuestos.filter(function (p) {
      return Modelo.estadoEfectivo(p, hoy) === 'enviado';
    }).length;
    var n = document.querySelector('.nav-item[data-vista="presupuestos"] .nav-cuenta');
    if (n) {
      n.textContent = pend || '';
      n.style.display = pend ? '' : 'none';
    }
  }

  function leeHash() {
    var h = (location.hash || '#panel').slice(1);
    var trozos = h.split('/');
    return { vista: trozos[0] || 'panel', id: trozos[1] || null };
  }

  /* --- Copias de seguridad ------------------------------------------------ */

  App.exportar = function () {
    var copia = U.clona(App.estado);
    copia.exportado = new Date().toISOString();
    copia.aplicacion = 'Presupuestos JA';
    var nombre = 'copia-presupuestos-' + U.hoyISO() + '.json';
    U.descargar(nombre, JSON.stringify(copia, null, 2));
    App.estado.ajustes.ultimaCopia = U.hoyISO();
    App.guardar(true);
    UI.aviso('Copia de seguridad descargada', 'ok');
  };

  App.importar = function (texto, modo) {
    var datos;
    try { datos = JSON.parse(texto); }
    catch (e) { throw new Error('El archivo no tiene el formato esperado'); }
    if (!datos || typeof datos !== 'object' || !datos.ajustes) {
      throw new Error('El archivo no parece una copia de esta aplicación');
    }
    if (modo === 'fusionar') {
      // Misma mezcla que usa la sincronización: gana la edición más reciente
      // de cada registro y las bajas se respetan.
      var res = global.Fusion.fusiona(App.estado, normaliza(datos));
      App.estado = normaliza(res.estado);
      UI.aviso(global.Fusion.describe(res.resumen), 'ok', 4200);
    } else {
      App.estado = normaliza(datos);
    }
    return App.guardarYa().then(function () {
      UI.aviso('Datos importados correctamente', 'ok');
      App.ir(App.vistaActual || 'panel', {}, true);
    });
  };

  App.diasSinCopia = function () {
    var u = App.estado.ajustes.ultimaCopia;
    if (!u) return null;
    return U.diasEntre(u, U.hoyISO());
  };

  /* --- Arranque ------------------------------------------------------------ */

  function montaEsqueleto() {
    var app = document.getElementById('app');
    var nav = MENU.map(function (m) {
      return '<button class="nav-item" data-vista="' + m.id + '">' +
        '<span class="nav-ic">' + UI.ic(m.icono, 17) + '</span>' +
        '<span>' + m.nombre + '</span>' +
        (m.id === 'presupuestos' ? '<span class="nav-cuenta" style="display:none"></span>' : '') +
      '</button>';
    }).join('');

    var navMovil = MENU_MOVIL.map(function (id) {
      var m = MENU.filter(function (x) { return x.id === id; })[0];
      return '<button data-vista="' + m.id + '">' + UI.ic(m.icono, 19) +
        '<span>' + m.nombre + '</span></button>';
    }).join('');

    app.innerHTML =
      '<aside class="barra">' +
        '<div class="barra-marca">' +
          '<p class="barra-marca-tit">Presupuestos</p>' +
          '<div class="barra-marca-sub" id="marca-emisor"></div>' +
        '</div>' +
        '<nav class="nav">' + nav + '</nav>' +
        '<div class="barra-pie">' +
          '<div id="estado-guardado">Listo</div>' +
          '<div id="estado-motor" style="margin-top:3px"></div>' +
          '<div id="estado-sync" style="margin-top:3px"></div>' +
        '</div>' +
      '</aside>' +
      '<div class="principal">' +
        '<header class="cabecera">' +
          '<div><h1 id="titulo-vista"></h1><div class="cabecera-sub" id="sub-vista"></div></div>' +
          '<div class="cabecera-acciones" id="acciones-vista"></div>' +
        '</header>' +
        '<main class="contenido" id="contenido"></main>' +
      '</div>' +
      '<nav class="nav-movil">' + navMovil + '</nav>';

    app.addEventListener('click', function (e) {
      var b = e.target.closest('[data-vista]');
      if (b) App.ir(b.dataset.vista);
    });
  }

  function pintaIdentidad() {
    var e = App.estado.ajustes.emisor;
    var n = document.getElementById('marca-emisor');
    if (n) n.textContent = e.nombre || 'Sin configurar';
    document.title = 'Presupuestos · ' + (e.nombre || '');
    var m = document.getElementById('estado-motor');
    if (m) {
      var info = Store.info();
      m.innerHTML = info.fiable
        ? 'Datos en este dispositivo'
        : '<b style="color:#E8A87C">Atención: sin almacenamiento</b>';
      m.title = info.etiqueta + (info.error ? ' · ' + info.error : '');
    }
    pintaSync();
  }
  App.pintaIdentidad = pintaIdentidad;

  // Línea de estado de la sincronización, bajo el indicador de guardado
  function pintaSync(s) {
    var n = document.getElementById('estado-sync');
    if (!n || !global.Sync) return;
    s = s || global.Sync.instantanea();
    if (!global.Sync.activo()) {
      n.innerHTML = s.disponible
        ? '<a href="#ajustes" style="color:#8D9AAF">Activar sincronización</a>'
        : '';
      return;
    }
    if (s.sincronizando) { n.innerHTML = 'Sincronizando…'; return; }
    if (s.necesitaGesto) {
      n.innerHTML = '<a href="#ajustes" style="color:#E8A87C">Vuelve a conectar Drive</a>';
      return;
    }
    if (s.error) {
      n.innerHTML = '<span style="color:#E8A87C" title="' + U.esc(s.error) + '">Sin sincronizar</span>';
      return;
    }
    n.textContent = s.ultima
      ? 'Drive · ' + new Date(s.ultima).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : 'Drive conectado';
  }
  App.pintaSync = pintaSync;

  function avisosDeArranque() {
    var info = Store.info();
    if (!info.fiable) {
      UI.modal({
        titulo: 'No se pueden guardar los datos',
        cuerpo: '<p>El navegador no permite guardar información en este contexto, así que ' +
          'todo lo que hagas se perderá al cerrar la ventana.</p>' +
          '<p>Suele ocurrir en ventanas de incógnito o con el almacenamiento del sitio bloqueado. ' +
          'Abre la aplicación en una ventana normal o usa la versión web.</p>',
        botones: [{ texto: 'Entendido', clase: 'btn-pri' }]
      });
      return;
    }
    var dias = App.diasSinCopia();
    var hayDatos = App.estado.presupuestos.length + App.estado.gastos.length > 0;
    if (hayDatos && (dias === null || dias >= 14)) {
      UI.aviso('Conviene descargar una copia de seguridad desde Ajustes', '', 5200);
    }
  }

  App.iniciar = function () {
    montaEsqueleto();
    Store.iniciar()
      .then(function (guardado) {
        App.estado = normaliza(guardado);
        if (!guardado) return App.guardarYa();
      })
      .catch(function (e) {
        console.error(e);
        App.estado = Base.estadoInicial();
      })
      .then(function () {
        Store.pedirPersistencia();
        pintaIdentidad();
        App.listo = true;
        var r = leeHash();
        App.ir(r.vista, { id: r.id }, true);
        avisosDeArranque();
        window.addEventListener('hashchange', function () {
          var x = leeHash();
          App.ir(x.vista, { id: x.id }, true);
        });
        window.addEventListener('beforeunload', function () { App.guardarYa(); });
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'hidden') App.guardarYa();
        });
        if (global.Sync) {
          global.Sync.escucha(function (s) {
            pintaSync(s);
            if (App.vistaActual === 'ajustes' && !s.sincronizando) App.refrescar();
          });
          global.Sync.arrancar();
        }
      });
  };

  global.App = App;
})(window);
