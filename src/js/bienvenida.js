/* =========================================================================
   bienvenida.js — lo que ve alguien la primera vez que abre la aplicación
   Cuatro pantallas, botones grandes y ninguna decisión obligatoria: revisar
   los datos, conectar Drive, instalarla y empezar. Todo se puede saltar y
   volver a hacer después desde Ajustes.
   Se expone en window.Bienvenida
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U, UI = global.UI;

  /* --- Instalación como aplicación ---------------------------------------- */

  var avisoInstalacion = null;

  global.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    avisoInstalacion = e;
    var b = document.getElementById('aj-instalar');
    if (b) b.hidden = false;
  });

  global.addEventListener('appinstalled', function () {
    avisoInstalacion = null;
    UI.aviso('Aplicación instalada', 'ok');
  });

  function yaInstalada() {
    return (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) ||
           global.navigator.standalone === true;
  }

  function esApple() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function sePuedeInstalar() {
    if (yaInstalada() || location.protocol === 'file:') return false;
    return !!avisoInstalacion || esApple();
  }

  function instalar() {
    if (!avisoInstalacion) return Promise.resolve('manual');
    var aviso = avisoInstalacion;
    avisoInstalacion = null;
    aviso.prompt();
    return aviso.userChoice.then(function (r) { return r.outcome; })
      .catch(function () { return 'error'; });
  }

  /* --- Asistente ----------------------------------------------------------- */

  function pasos() {
    var lista = ['hola', 'datos'];
    if (global.Sync && global.Sync.disponible() && !global.Sync.activo()) lista.push('sincronizar');
    if (sePuedeInstalar()) lista.push('instalar');
    lista.push('final');
    return lista;
  }

  function abrir(alTerminar) {
    var orden = pasos();
    var indice = 0;

    var caja = document.createElement('div');
    caja.className = 'bienvenida';

    var m = UI.modal({
      titulo: '',
      ancho: 'ancho',
      cuerpo: caja,
      sinFoco: true,
      cierraFuera: false,
      alCerrar: function () {
        marcaVista();
        if (alTerminar) alTerminar();
      }
    });
    m.nodo.querySelector('.modal-cab').style.display = 'none';

    function pinta() {
      var paso = orden[indice];
      caja.innerHTML = contenido[paso]() + puntos();
      conecta(paso);
      var f = caja.querySelector('input');
      if (f && paso === 'datos') f.focus();
    }

    function puntos() {
      return '<div class="bv-puntos">' + orden.map(function (_, i) {
        return '<i class="' + (i === indice ? 'activo' : (i < indice ? 'hecho' : '')) + '"></i>';
      }).join('') + '</div>';
    }

    function siguiente() {
      if (indice < orden.length - 1) { indice++; pinta(); }
      else m.cerrar();
    }

    var contenido = {
      hola: function () {
        return '<div class="bv-paso">' +
          '<div class="bv-marca">' + global.Base.MARCA_SVG + '</div>' +
          '<h2>Tus presupuestos, en orden</h2>' +
          '<p>Aquí haces el presupuesto, lo imprimes o lo mandas en PDF, y sabes en ' +
            'todo momento cuáles están pendientes de respuesta. También llevas la cuenta ' +
            'de los gastos que te puedes deducir.</p>' +
          '<p class="bv-tenue">Son dos minutos de preparación. Todo lo que elijas ahora ' +
            'se puede cambiar luego.</p>' +
          '<div class="bv-botones">' +
            '<button class="btn btn-pri btn-grande" data-siguiente>Empezar</button>' +
          '</div>' +
        '</div>';
      },

      datos: function () {
        var e = global.App.estado.ajustes.emisor;
        return '<div class="bv-paso bv-ancho">' +
          '<h2>Tus datos</h2>' +
          '<p>Es lo que sale en la cabecera y en el pie de cada presupuesto.</p>' +
          UI.campo({ etiqueta: 'Nombre o razón social', nombre: 'b_nombre', valor: e.nombre }) +
          '<div class="fila-campos fc-2">' +
            UI.campo({ etiqueta: 'NIF', nombre: 'b_nif', valor: e.nif, placeholder: '12345678Z' }) +
            UI.campo({ etiqueta: 'Teléfono', nombre: 'b_telefono', valor: e.telefono }) +
          '</div>' +
          UI.campo({ etiqueta: 'Correo electrónico', tipo: 'email', nombre: 'b_email', valor: e.email }) +
          '<div class="bv-botones">' +
            '<button class="btn btn-pri btn-grande" data-guardar-datos>Continuar</button>' +
          '</div>' +
        '</div>';
      },

      sincronizar: function () {
        return '<div class="bv-paso">' +
          '<div class="bv-icono">' + UI.ic('escudo', 40, 1.3) + '</div>' +
          '<h2>El móvil y el ordenador, juntos</h2>' +
          '<p>Si conectas tu Google, lo que apuntes en la obra desde el móvil aparece ' +
            'en el ordenador, y al revés. Se guarda en una carpeta oculta de tu propio ' +
            'Drive: no la ve nadie más y no ocupa espacio de tus archivos.</p>' +
          '<div class="bv-aviso">' + UI.ic('info', 16) +
            '<div>Usa <b>la misma cuenta de Google</b> en el móvil y en el ordenador. ' +
            'Si no, cada uno irá por su lado.</div></div>' +
          '<div class="bv-botones">' +
            '<button class="btn btn-pri btn-grande" data-conectar>Conectar mi Google</button>' +
            '<button class="btn btn-plano" data-siguiente>Ahora no</button>' +
          '</div>' +
          '<div id="bv-estado-sync"></div>' +
        '</div>';
      },

      instalar: function () {
        if (esApple() && !avisoInstalacion) {
          return '<div class="bv-paso">' +
            '<div class="bv-icono">' + UI.ic('descarga', 40, 1.3) + '</div>' +
            '<h2>Ponla en la pantalla de inicio</h2>' +
            '<p>Así se abre como cualquier otra aplicación, sin buscar el enlace, ' +
              'y funciona aunque te quedes sin cobertura.</p>' +
            '<ol class="bv-pasos-ios">' +
              '<li>Toca el botón <b>Compartir</b>, el cuadrado con la flecha hacia arriba.</li>' +
              '<li>Baja y elige <b>Añadir a pantalla de inicio</b>.</li>' +
              '<li>Toca <b>Añadir</b>.</li>' +
            '</ol>' +
            '<div class="bv-botones">' +
              '<button class="btn btn-pri btn-grande" data-siguiente>Hecho</button>' +
            '</div>' +
          '</div>';
        }
        return '<div class="bv-paso">' +
          '<div class="bv-icono">' + UI.ic('descarga', 40, 1.3) + '</div>' +
          '<h2>Instálala en este dispositivo</h2>' +
          '<p>Queda con su icono, se abre en su propia ventana sin barra de navegador ' +
            'y funciona sin internet. Es la misma aplicación, solo que a mano.</p>' +
          '<div class="bv-botones">' +
            '<button class="btn btn-pri btn-grande" data-instalar>Instalar</button>' +
            '<button class="btn btn-plano" data-siguiente>Ahora no</button>' +
          '</div>' +
        '</div>';
      },

      final: function () {
        return '<div class="bv-paso">' +
          '<div class="bv-icono bv-ok">' + UI.ic('check', 40, 1.6) + '</div>' +
          '<h2>Listo</h2>' +
          '<p>El banco de precios trae veinte partidas de reforma para empezar. ' +
            'Cámbialas por las tuyas cuando quieras, desde <b>Precios</b>.</p>' +
          '<div class="bv-botones">' +
            '<button class="btn btn-pri btn-grande" data-primer>Hacer mi primer presupuesto</button>' +
            '<button class="btn btn-plano" data-cerrar>Echar un vistazo antes</button>' +
          '</div>' +
        '</div>';
      }
    };

    function conecta(paso) {
      var b = function (sel, fn) {
        var n = caja.querySelector(sel);
        if (n) n.addEventListener('click', fn);
      };
      b('[data-siguiente]', siguiente);
      b('[data-cerrar]', function () { m.cerrar(); });
      b('[data-primer]', function () {
        m.cerrar();
        global.App.crearPresupuesto();
      });
      b('[data-guardar-datos]', function () {
        var v = UI.valores(caja);
        var e = global.App.estado.ajustes.emisor;
        if (v.b_nombre !== undefined) e.nombre = v.b_nombre.trim();
        if (v.b_nif !== undefined) e.nif = v.b_nif.trim().toUpperCase();
        if (v.b_telefono !== undefined) e.telefono = v.b_telefono.trim();
        if (v.b_email !== undefined) e.email = v.b_email.trim();
        global.App.tocar(global.App.estado.ajustes);
        global.App.guardar();
        global.App.pintaIdentidad();
        siguiente();
      });
      b('[data-instalar]', function () {
        instalar().then(function (r) {
          if (r === 'accepted') UI.aviso('Instalada', 'ok');
          siguiente();
        });
      });
      b('[data-conectar]', function () {
        var n = caja.querySelector('#bv-estado-sync');
        n.innerHTML = '<div class="bv-tenue" style="margin-top:14px">Abriendo la ventana de Google…</div>';
        global.Sync.conectar().then(function () {
          n.innerHTML = '<div class="bv-ok-linea">' + UI.ic('check', 16) + ' Conectado</div>';
          setTimeout(siguiente, 900);
        }, function (e) {
          n.innerHTML = '<div class="bv-error">' + U.esc(e.message || 'No se ha podido conectar') +
            '<br><span class="bv-tenue">Puedes seguir y hacerlo luego desde Ajustes.</span></div>';
        });
      });
    }

    pinta();
    return m;
  }

  function marcaVista() {
    var a = global.App.estado.ajustes;
    if (a.bienvenidaVista) return;
    a.bienvenidaVista = true;
    global.App.tocar(a);
    global.App.guardar(true);
  }

  function haceFalta() {
    return !global.App.estado.ajustes.bienvenidaVista;
  }

  global.Bienvenida = {
    abrir: abrir,
    haceFalta: haceFalta,
    sePuedeInstalar: sePuedeInstalar,
    yaInstalada: yaInstalada,
    esApple: esApple,
    instalar: instalar
  };
})(window);
