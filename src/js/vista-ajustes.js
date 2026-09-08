/* =========================================================================
   vista-ajustes.js — datos del emisor, aspecto, numeración y copias
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U, App = global.App, UI = global.UI,
      Base = global.Base, Store = global.Store, Modelo = global.Modelo;

  App.vistas.ajustes = {
    titulo: 'Ajustes',
    subtitulo: function () { return 'Datos que aparecen en todos los presupuestos'; },
    acciones: function () { return ''; },
    render: function (cont) {
      var a = App.estado.ajustes;
      var info = Store.info();

      cont.innerHTML =
        '<div class="rejilla rej-2">' +
          '<div>' + tarjetaEmisor(a) + '<div class="sep"></div>' + tarjetaNumeracion(a) +
            '<div class="sep"></div>' + tarjetaValores(a) + '</div>' +
          '<div>' + tarjetaMarca(a) + '<div class="sep"></div>' + tarjetaCondiciones(a) +
            '<div class="sep"></div>' + tarjetaSync() +
            '<div class="sep"></div>' + tarjetaDatos(info) + '</div>' +
        '</div>';
    },
    despues: function (cont) { conecta(cont); }
  };

  function tarjetaEmisor(a) {
    var e = a.emisor;
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Datos del emisor</h2></div>' +
      '<div class="tarjeta-cuerpo">' +
        UI.campo({ etiqueta: 'Nombre y apellidos o razón social', nombre: 'em_nombre', valor: e.nombre }) +
        '<div class="fila-campos fc-2">' +
          UI.campo({ etiqueta: 'NIF', nombre: 'em_nif', valor: e.nif,
                     ayuda: 'Recomendable: un presupuesto sin NIF resulta menos profesional.' }) +
          UI.campo({ etiqueta: 'Teléfono', nombre: 'em_telefono', valor: e.telefono }) +
        '</div>' +
        UI.campo({ etiqueta: 'Dirección', nombre: 'em_direccion', valor: e.direccion }) +
        '<div class="fila-campos fc-2">' +
          UI.campo({ etiqueta: 'Código postal', nombre: 'em_cp', valor: e.cp }) +
          UI.campo({ etiqueta: 'Población', nombre: 'em_ciudad', valor: e.ciudad }) +
        '</div>' +
        '<div class="fila-campos fc-2">' +
          UI.campo({ etiqueta: 'Correo electrónico', tipo: 'email', nombre: 'em_email', valor: e.email }) +
          UI.campo({ etiqueta: 'Web', nombre: 'em_web', valor: e.web, placeholder: 'opcional' }) +
        '</div>' +
        '<div id="aj-error-emisor"></div>' +
      '</div></div>';
  }

  function tarjetaMarca(a) {
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Logotipo y firma</h2></div>' +
      '<div class="tarjeta-cuerpo">' +
        '<div class="etiqueta">Logotipo del documento</div>' +
        '<div style="background:#F7F8FA;border:1px solid var(--linea);border-radius:8px;padding:16px;text-align:center;margin-bottom:10px">' +
          '<div id="aj-vista-logo" style="max-width:230px;margin:0 auto">' +
            (a.logo ? '<img src="' + a.logo + '" style="max-width:100%;max-height:110px">'
              : (Base.logoDe(a.emisor.nombre) ||
                 '<span class="tenue pequeno">Escribe tu nombre arriba y aquí verás el logotipo</span>')) +
          '</div>' +
        '</div>' +
        '<div class="flex" style="gap:8px;flex-wrap:wrap;margin-bottom:6px">' +
          '<label class="btn btn-s">' + UI.ic('subida', 15) + '<span>Subir logotipo</span>' +
            '<input type="file" id="aj-logo" accept="image/*" hidden></label>' +
          (a.logo ? '<button class="btn btn-s" id="aj-logo-quitar">Volver al generado</button>' : '') +
        '</div>' +
        '<div class="ayuda">Si no subes ninguno, se dibuja con tus iniciales y tu nombre. ' +
          'Para uno propio: PNG o JPG, se guarda dentro de la aplicación y se reduce solo.</div>' +
        '<label class="check" style="margin-top:12px"><input type="checkbox" name="mostrarLogo"' +
          (a.mostrarLogo !== false ? ' checked' : '') + '><span>Mostrar el logotipo en el documento</span></label>' +

        '<div class="linea-sep"></div>' +
        '<div class="etiqueta">Firma escaneada (opcional)</div>' +
        '<div id="aj-vista-firma" style="min-height:44px;margin-bottom:10px">' +
          (a.firma ? '<img src="' + a.firma + '" style="max-height:70px">' :
            '<span class="tenue pequeno">Sin firma. El documento dejará el hueco en blanco para firmar a mano.</span>') +
        '</div>' +
        '<div class="flex" style="gap:8px;flex-wrap:wrap">' +
          '<label class="btn btn-s">' + UI.ic('subida', 15) + '<span>Subir firma</span>' +
            '<input type="file" id="aj-firma" accept="image/*" hidden></label>' +
          (a.firma ? '<button class="btn btn-s" id="aj-firma-quitar">Quitar</button>' : '') +
        '</div>' +
      '</div></div>';
  }

  function tarjetaNumeracion(a) {
    var n = a.numeracion;
    var ejemplo = Modelo.formateaNumero(a, n.siguiente, n.anio);
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Numeración</h2></div>' +
      '<div class="tarjeta-cuerpo">' +
        '<div class="fila-campos fc-3">' +
          UI.campo({ etiqueta: 'Formato', nombre: 'num_formato', valor: n.formato,
                     ayuda: '{n} número · {aaaa} año · {aa} año corto' }) +
          UI.campo({ etiqueta: 'Siguiente número', tipo: 'number', nombre: 'num_siguiente', valor: n.siguiente, min: 1 }) +
          UI.campo({ etiqueta: 'Dígitos', tipo: 'number', nombre: 'num_digitos', valor: n.digitos, min: 1,
                     ayuda: '2 dígitos: 01, 02…' }) +
        '</div>' +
        '<label class="check"><input type="checkbox" name="num_reinicio"' +
          (n.reinicioAnual ? ' checked' : '') + '><span>Empezar de nuevo en 1 cada año</span></label>' +
        '<div class="aviso aviso-info" style="margin:14px 0 0">' + UI.ic('info', 15) +
          '<div>El próximo presupuesto será <b id="aj-ejemplo">' + U.esc(ejemplo) + '</b></div></div>' +
      '</div></div>';
  }

  function tarjetaValores(a) {
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Valores por defecto</h2></div>' +
      '<div class="tarjeta-cuerpo">' +
        '<div class="fila-campos fc-3">' +
          UI.campo({ etiqueta: 'IVA habitual', tipo: 'select', nombre: 'ivaPorDefecto', valor: a.ivaPorDefecto,
                     opciones: Base.TIPOS_IVA.map(function (t) { return { valor: t.valor, nombre: t.nombre }; }) }) +
          UI.campo({ etiqueta: 'Retención habitual', tipo: 'select', nombre: 'irpfPorDefecto', valor: a.irpfPorDefecto,
                     opciones: Base.TIPOS_IRPF.map(function (t) { return { valor: t.valor, nombre: t.nombre }; }) }) +
          UI.campo({ etiqueta: 'Validez (días)', tipo: 'number', nombre: 'validezDias', valor: a.validezDias, min: 0 }) +
        '</div>' +
        '<label class="check"><input type="checkbox" name="mostrarCodigos"' +
          (a.mostrarCodigos ? ' checked' : '') + '><span>Mostrar la columna de código en el documento</span></label>' +
        '<div class="ayuda" style="margin-top:8px">Estos valores se aplican a los presupuestos nuevos. ' +
          'En cada uno puedes cambiarlos sin afectar al resto.</div>' +
      '</div></div>';
  }

  function tarjetaCondiciones(a) {
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Condiciones generales</h2></div>' +
      '<div class="tarjeta-cuerpo">' +
        UI.campo({ tipo: 'textarea', nombre: 'condiciones', valor: (a.condiciones || []).join('\n'), filas: 7,
                   ayuda: 'Una condición por línea. Se copian en cada presupuesto nuevo.' }) +
      '</div></div>';
  }

  function tarjetaDatos(info) {
    var dias = App.diasSinCopia();
    var e = App.estado;
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Datos y copias de seguridad</h2></div>' +
      '<div class="tarjeta-cuerpo">' +
        '<div class="aviso ' + (info.fiable ? 'aviso-verde' : 'aviso-rojo') + '">' +
          UI.ic(info.fiable ? 'escudo' : 'aviso', 16) +
          '<div><b>' + U.esc(info.etiqueta) + '</b><br>' +
            (info.fiable
              ? (global.Sync && global.Sync.activo()
                  ? 'Los datos están en este dispositivo y en tu propio Google Drive. En ningún sitio más.'
                  : 'Todo se guarda solo en este dispositivo. Ni se envía ni se comparte con nadie.')
              : 'No se puede guardar nada. Abre la aplicación en una ventana normal del navegador.') +
          '</div></div>' +
        '<div class="rejilla rej-2" style="gap:10px;margin-bottom:16px">' +
          mini('Presupuestos', e.presupuestos.length) +
          mini('Clientes', e.clientes.length) +
          mini('Partidas', e.partidas.length) +
          mini('Gastos', e.gastos.length) +
        '</div>' +
        (dias === null
          ? '<div class="aviso aviso-oro">' + UI.ic('aviso', 15) + '<div>Todavía no has descargado ninguna copia.</div></div>'
          : (dias >= 14
            ? '<div class="aviso aviso-oro">' + UI.ic('reloj', 15) + '<div>Última copia hace ' + dias + ' días.</div></div>'
            : '<div class="ayuda" style="margin-bottom:12px">Última copia: ' + U.fechaCorta(App.estado.ajustes.ultimaCopia) + '</div>')) +
        '<div class="flex" style="gap:8px;flex-wrap:wrap">' +
          '<button class="btn btn-pri" id="aj-exportar">' + UI.ic('descarga', 15) + '<span>Descargar copia</span></button>' +
          '<label class="btn">' + UI.ic('subida', 15) + '<span>Restaurar copia</span>' +
            '<input type="file" id="aj-importar" accept=".json,application/json" hidden></label>' +
        '</div>' +
        '<div class="ayuda" style="margin-top:10px">Guarda la copia en el móvil, en un pendrive o en el correo. ' +
          'Es la forma de pasar los datos a otro dispositivo y de no perder nada si se estropea este.</div>' +
        '<div class="linea-sep"></div>' +
        '<div class="flex" style="gap:8px;flex-wrap:wrap">' +
          '<button class="btn" id="aj-asistente">' + UI.ic('bombilla', 15) +
            '<span>Repetir la puesta en marcha</span></button>' +
          (global.Bienvenida && global.Bienvenida.sePuedeInstalar()
            ? '<button class="btn" id="aj-instalar">' + UI.ic('descarga', 15) +
              '<span>Instalar en este dispositivo</span></button>' : '') +
        '</div>' +
        '<div class="linea-sep"></div>' +
        '<button class="btn btn-peligro" id="aj-reset">' + UI.ic('papelera', 15) + '<span>Empezar de cero</span></button>' +
      '</div></div>';
  }

  /* --- Sincronización con Google Drive ------------------------------------ */

  function tarjetaSync() {
    var S = global.Sync;
    if (!S) return '';
    var s = S.instantanea();
    var cuerpo;

    if (!s.disponible) {
      cuerpo = '<div class="aviso aviso-info" style="margin-bottom:14px">' + UI.ic('info', 16) +
        '<div>' + U.esc(s.motivo) + '</div></div>' +
        (S.clienteId() || location.protocol === 'file:' ? '' : campoCliente(''));
    } else if (!S.activo()) {
      cuerpo =
        '<p style="margin:0 0 14px;font-size:13.5px;color:var(--texto-2)">' +
          'Guarda una copia de los datos en la carpeta privada de aplicaciones de tu Google Drive, ' +
          'invisible para el resto de archivos y solo accesible desde aquí. Conecta la misma cuenta ' +
          'en el ordenador y en el móvil y los dos van al día solos.</p>' +
        '<button class="btn btn-pri" id="sy-conectar">' + UI.ic('escudo', 15) +
          '<span>Conectar con Google Drive</span></button>' +
        '<div class="linea-sep"></div>' + campoCliente(S.clienteId());
    } else {
      var linea = s.sincronizando ? 'Sincronizando…'
        : s.necesitaGesto ? 'Google pide volver a dar permiso'
        : s.error ? U.esc(s.error)
        : s.ultima ? 'Última vez: ' + new Date(s.ultima).toLocaleString('es-ES')
        : 'Conectado, aún sin sincronizar';
      var clase = s.error || s.necesitaGesto ? 'aviso-oro' : 'aviso-verde';
      cuerpo =
        '<div class="aviso ' + clase + '">' + UI.ic(s.error || s.necesitaGesto ? 'aviso' : 'check', 16) +
          '<div><b>' + (s.necesitaGesto ? 'Hay que reconectar' : 'Sincronización activa') + '</b><br>' + linea +
          (s.ultimoResumen && global.Fusion.hubocambios(s.ultimoResumen)
            ? '<br>Último cambio recibido: ' + U.esc(global.Fusion.describe(s.ultimoResumen)) : '') +
          '</div></div>' +
        '<div class="flex" style="gap:8px;flex-wrap:wrap">' +
          '<button class="btn btn-pri" id="sy-ahora"' + (s.sincronizando ? ' disabled' : '') + '>' +
            UI.ic('guardar', 15) + '<span>' + (s.necesitaGesto ? 'Reconectar' : 'Sincronizar ahora') + '</span></button>' +
          (s.hayDeshacer ? '<button class="btn" id="sy-deshacer">' + UI.ic('volver', 15) +
            '<span>Deshacer la última</span></button>' : '') +
          '<button class="btn btn-peligro" id="sy-desconectar">' + UI.ic('cruz', 15) + '<span>Desconectar</span></button>' +
        '</div>' +
        '<div class="ayuda" style="margin-top:10px">Gana siempre la última edición de cada registro, ' +
          'así que puedes trabajar sin cobertura y se pondrá todo en su sitio al volver.</div>';
    }

    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Sincronización</h2>' +
      '<div class="der pequeno tenue">Google Drive</div></div>' +
      '<div class="tarjeta-cuerpo">' + cuerpo + '</div></div>';
  }

  function campoCliente(valor) {
    return UI.campo({
      etiqueta: 'ID de cliente de Google', nombre: 'sy_cliente', valor: valor,
      placeholder: '000000000000-xxxxxxxx.apps.googleusercontent.com',
      ayuda: 'Se crea una vez en Google Cloud y se pega aquí. No es una contraseña. ' +
             'Los pasos están en el README del proyecto.'
    }) + '<button class="btn btn-s" id="sy-guardar-cliente">' + UI.ic('guardar', 15) +
      '<span>Guardar</span></button>';
  }

  function mini(titulo, valor) {
    return '<div style="background:#F7F8FA;border-radius:8px;padding:10px 12px">' +
      '<div style="font-size:11.5px;color:var(--texto-3);font-weight:600;text-transform:uppercase;letter-spacing:.06em">' +
      U.esc(titulo) + '</div><div style="font-size:19px;font-weight:700;color:var(--azul)">' + valor + '</div></div>';
  }

  /* --- Eventos ------------------------------------------------------------ */

  function conecta(cont) {
    var a = App.estado.ajustes;
    function guarda() { App.tocar(a); return App.guardar(); }
    var guardarSuave = U.debounce(function () { guarda(); App.pintaIdentidad(); }, 400);

    cont.addEventListener('input', function (e) {
      var c = e.target;
      if (!c.name) return;
      var n = c.name;
      if (n.indexOf('em_') === 0) a.emisor[n.slice(3)] = c.value;
      else if (n === 'num_formato') { a.numeracion.formato = c.value; refrescaEjemplo(); }
      else if (n === 'num_siguiente') { a.numeracion.siguiente = Math.max(1, U.num(c.value)); refrescaEjemplo(); }
      else if (n === 'num_digitos') { a.numeracion.digitos = Math.max(1, U.num(c.value)); refrescaEjemplo(); }
      else if (n === 'validezDias') a.validezDias = U.num(c.value);
      else if (n === 'condiciones') a.condiciones = c.value.split('\n');
      guardarSuave();
    });

    cont.addEventListener('change', function (e) {
      var c = e.target;
      if (!c.name) return;
      if (c.name === 'ivaPorDefecto') a.ivaPorDefecto = U.num(c.value);
      else if (c.name === 'irpfPorDefecto') a.irpfPorDefecto = U.num(c.value);
      else if (c.name === 'num_reinicio') a.numeracion.reinicioAnual = c.checked;
      else if (c.name === 'mostrarCodigos') a.mostrarCodigos = c.checked;
      else if (c.name === 'mostrarLogo') a.mostrarLogo = c.checked;
      guarda();
    });

    function refrescaEjemplo() {
      var n = document.getElementById('aj-ejemplo');
      if (n) n.textContent = Modelo.formateaNumero(a, a.numeracion.siguiente, a.numeracion.anio);
    }

    imagen('aj-logo', 640, function (dataUrl) {
      a.logo = dataUrl;
      guarda();
      App.refrescar();
      UI.aviso('Logotipo actualizado', 'ok');
    });
    imagen('aj-firma', 480, function (dataUrl) {
      a.firma = dataUrl;
      guarda();
      App.refrescar();
      UI.aviso('Firma guardada', 'ok');
    });

    boton('aj-logo-quitar', function () { a.logo = null; guarda(); App.refrescar(); });
    boton('aj-firma-quitar', function () { a.firma = null; guarda(); App.refrescar(); });
    boton('aj-exportar', function () { App.exportar(); App.refrescar(); });

    var imp = document.getElementById('aj-importar');
    if (imp) imp.addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (!f) return;
      var lector = new FileReader();
      lector.onload = function (ev) {
        var texto = String(ev.target.result);
        UI.modal({
          titulo: 'Restaurar copia de seguridad',
          cuerpo: '<p style="margin-top:0">¿Cómo quieres restaurar los datos del archivo ' +
            '<b>' + U.esc(f.name) + '</b>?</p>' +
            '<div class="aviso aviso-oro" style="margin-bottom:0">' + UI.ic('aviso', 15) +
            '<div><b>Reemplazar</b> borra todo lo que hay ahora y deja solo lo de la copia. ' +
            '<b>Fusionar</b> mantiene lo actual y añade lo que falte.</div></div>',
          sinFoco: true,
          botones: [
            { texto: 'Cancelar' },
            { texto: 'Fusionar', accion: function () { restaura(texto, 'fusionar'); } },
            { texto: 'Reemplazar todo', clase: 'btn-peligro', accion: function () { restaura(texto, 'reemplazar'); } }
          ]
        });
      };
      lector.readAsText(f, 'utf-8');
      e.target.value = '';
    });

    boton('aj-reset', function () {
      UI.confirmar({
        titulo: 'Empezar de cero',
        html: 'Se borrarán <b>todos</b> los presupuestos, clientes, precios y gastos de este dispositivo. ' +
          'Descarga antes una copia si quieres conservarlos.',
        aceptar: 'Borrar todo', peligro: true
      }).then(function (si) {
        if (!si) return;
        var rastro = {};
        var cuando = new Date().toISOString();
        ['presupuestos', 'clientes', 'partidas', 'gastos'].forEach(function (col) {
          App.estado[col].forEach(function (r) { rastro[r.id] = cuando; });
        });
        App.estado = Base.estadoInicial();
        // Sin este rastro, la próxima sincronización devolvería todo lo borrado
        App.estado.borrados = rastro;
        App.guardarYa().then(function () {
          App.pintaIdentidad();
          App.ir('panel');
          UI.aviso('Aplicación reiniciada', 'ok');
        });
      });
    });

    boton('aj-asistente', function () {
      if (!global.Bienvenida) return;
      App.estado.ajustes.bienvenidaVista = false;
      global.Bienvenida.abrir(function () { App.refrescar(); });
    });

    boton('aj-instalar', function () {
      if (!global.Bienvenida) return;
      if (global.Bienvenida.esApple()) {
        return UI.modal({
          titulo: 'Añadir a la pantalla de inicio',
          cuerpo: '<ol style="padding-left:20px;line-height:1.9;margin:0">' +
            '<li>Toca el botón <b>Compartir</b>, el cuadrado con la flecha hacia arriba.</li>' +
            '<li>Baja y elige <b>Añadir a pantalla de inicio</b>.</li>' +
            '<li>Toca <b>Añadir</b>.</li></ol>',
          botones: [{ texto: 'Entendido', clase: 'btn-pri' }]
        });
      }
      global.Bienvenida.instalar().then(function () { App.refrescar(); });
    });

    conectaSync();
  }

  function conectaSync() {
    var S = global.Sync;
    if (!S) return;

    boton('sy-guardar-cliente', function () {
      var c = document.querySelector('[name=sy_cliente]');
      if (!c) return;
      var v = c.value.trim();
      if (v && !/\.apps\.googleusercontent\.com$/.test(v)) {
        return UI.aviso('Ese ID no tiene la forma que da Google', 'err', 3600);
      }
      S.guardaClienteId(v);
      UI.aviso(v ? 'ID guardado' : 'ID borrado', 'ok');
      App.refrescar();
    });

    boton('sy-conectar', function () {
      UI.aviso('Abriendo la ventana de Google…');
      S.conectar().then(function () {
        UI.aviso('Drive conectado y datos al día', 'ok');
        App.refrescar();
      }, function (e) {
        UI.aviso(e.message || 'No se ha podido conectar', 'err', 5200);
        App.refrescar();
      });
    });

    boton('sy-ahora', function () {
      S.sincronizar({ gesto: true }).then(function () {
        var s = S.instantanea();
        UI.aviso(s.ultimoResumen ? global.Fusion.describe(s.ultimoResumen) : 'Todo al día', 'ok');
        App.refrescar();
      }, function (e) {
        UI.aviso(e.message || 'No se ha podido sincronizar', 'err', 5200);
        App.refrescar();
      });
    });

    boton('sy-deshacer', function () {
      UI.confirmar({
        titulo: 'Deshacer la última sincronización',
        texto: 'Se vuelve a dejar este dispositivo como estaba justo antes de recibir los últimos cambios.',
        aceptar: 'Deshacer'
      }).then(function (si) {
        if (!si) return;
        S.deshacer().then(function (ok) {
          UI.aviso(ok ? 'Datos restaurados' : 'No había nada que deshacer', ok ? 'ok' : 'err');
          App.refrescar();
        });
      });
    });

    boton('sy-desconectar', function () {
      UI.confirmar({
        titulo: 'Desconectar Drive',
        texto: 'Este dispositivo dejará de sincronizar. Los datos siguen aquí y también en Drive.',
        aceptar: 'Desconectar', peligro: true
      }).then(function (si) {
        if (!si) return;
        S.desconectar().then(function () {
          UI.aviso('Drive desconectado', 'ok');
          App.refrescar();
        });
      });
    });
  }

  function restaura(texto, modo) {
    try {
      App.importar(texto, modo).then(function () { App.pintaIdentidad(); });
    } catch (err) {
      UI.aviso(err.message || 'No se ha podido leer el archivo', 'err', 4200);
    }
  }

  function boton(id, fn) {
    var n = document.getElementById(id);
    if (n) n.addEventListener('click', fn);
  }

  function imagen(id, maxLado, alTerminar) {
    var n = document.getElementById(id);
    if (!n) return;
    n.addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (!f) return;
      U.imagenADataURL(f, maxLado, function (err, dataUrl) {
        if (err) return UI.aviso(err.message, 'err');
        alTerminar(dataUrl);
      });
      e.target.value = '';
    });
  }
})(window);
