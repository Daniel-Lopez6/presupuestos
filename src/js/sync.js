/* =========================================================================
   sync.js — sincronización con Google Drive
   Los datos se guardan en la carpeta privada de aplicaciones del Drive del
   usuario: una carpeta oculta que solo ve esta aplicación, dentro de su
   propia cuenta. Ni servidor propio ni terceros de por medio.

   El transporte está separado de la lógica para poder probar la
   sincronización sin tocar Google (ver Sync.usarRemoto).
   Se expone en window.Sync
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U, Fusion = global.Fusion;

  var ARCHIVO = 'presupuestos.json';
  var ALCANCE = 'https://www.googleapis.com/auth/drive.appdata';
  var CLAVE_LOCAL = 'presupuestos_app_sync';
  var CLAVE_DESHACER = 'presupuestos_app_antes_de_sincronizar';
  var ESPERA_AUTO = 8000;

  var estado = {
    conectado: false,
    sincronizando: false,
    necesitaGesto: false,
    ultima: null,
    ultimoResumen: null,
    error: null,
    hayDeshacer: false
  };

  var local = leerLocal();
  var oyentes = [];
  var temporizador = null;
  var remoto = null;

  /* --- Estado guardado en el dispositivo ---------------------------------- */

  function leerLocal() {
    try {
      var s = global.localStorage.getItem(CLAVE_LOCAL);
      return s ? JSON.parse(s) : {};
    } catch (e) { return {}; }
  }

  function escribeLocal() {
    try { global.localStorage.setItem(CLAVE_LOCAL, JSON.stringify(local)); }
    catch (e) {}
  }

  /* --- Transporte: Google Drive ------------------------------------------ */

  function clienteId() {
    try {
      var manual = global.localStorage.getItem('presupuestos_app_cliente_google');
      if (manual) return manual.trim();
    } catch (e) {}
    return ((global.CONFIG && global.CONFIG.clienteGoogle) || '').trim();
  }

  function guardaClienteId(valor) {
    try {
      if (valor) global.localStorage.setItem('presupuestos_app_cliente_google', valor.trim());
      else global.localStorage.removeItem('presupuestos_app_cliente_google');
    } catch (e) {}
  }

  function creaRemotoDrive() {
    var acceso = null;        // { token, caduca }
    var cliente = null;
    var guion = null;

    function cargaGuion() {
      if (guion) return guion;
      guion = new Promise(function (resolver, rechazar) {
        if (global.google && global.google.accounts && global.google.accounts.oauth2) return resolver();
        var s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.onload = function () { resolver(); };
        s.onerror = function () { rechazar(new Error('No se ha podido cargar Google. ¿Hay conexión?')); };
        document.head.appendChild(s);
      });
      return guion;
    }

    function tokenValido() {
      return acceso && acceso.token && acceso.caduca > Date.now() + 60000;
    }

    function autorizar(silencioso) {
      if (tokenValido()) return Promise.resolve(acceso.token);
      return cargaGuion().then(function () {
        return new Promise(function (resolver, rechazar) {
          if (!cliente) {
            cliente = global.google.accounts.oauth2.initTokenClient({
              client_id: clienteId(),
              scope: ALCANCE,
              callback: function (respuesta) {
                if (respuesta && respuesta.access_token) {
                  acceso = {
                    token: respuesta.access_token,
                    caduca: Date.now() + (U.num(respuesta.expires_in) || 3600) * 1000
                  };
                  if (cliente._resolver) cliente._resolver(acceso.token);
                } else if (cliente._rechazar) {
                  cliente._rechazar(errorDeGoogle(respuesta));
                }
                cliente._resolver = cliente._rechazar = null;
              },
              error_callback: function (e) {
                if (cliente._rechazar) cliente._rechazar(errorDeGoogle(e));
                cliente._resolver = cliente._rechazar = null;
              }
            });
          }
          cliente._resolver = resolver;
          cliente._rechazar = rechazar;
          try {
            cliente.requestAccessToken(silencioso ? { prompt: '' } : {});
          } catch (e) {
            cliente._resolver = cliente._rechazar = null;
            rechazar(e);
          }
        });
      });
    }

    function errorDeGoogle(e) {
      var tipo = e && (e.type || e.error) || '';
      var err = new Error(
        tipo === 'popup_closed' ? 'Has cerrado la ventana de Google sin terminar' :
        tipo === 'popup_failed_to_open' ? 'El navegador ha bloqueado la ventana de Google' :
        tipo === 'access_denied' ? 'Google no ha concedido el permiso' :
        (e && e.message) || 'Google no ha devuelto el permiso'
      );
      err.necesitaGesto = (tipo === 'popup_failed_to_open' || tipo === 'popup_closed' ||
                           tipo === 'interaction_required' || tipo === 'login_required' ||
                           tipo === 'consent_required' || tipo === 'immediate_failed');
      return err;
    }

    function pide(url, opciones) {
      opciones = opciones || {};
      return autorizar(true).then(function (token) {
        opciones.headers = Object.assign({ Authorization: 'Bearer ' + token }, opciones.headers || {});
        return fetch(url, opciones);
      }).then(function (r) {
        if (r.status === 401 || r.status === 403) {
          acceso = null;
          var e = new Error('Google ha rechazado el permiso. Vuelve a conectar.');
          e.necesitaGesto = true;
          throw e;
        }
        if (!r.ok) throw new Error('Google ha respondido ' + r.status);
        return r;
      });
    }

    function buscaArchivo() {
      if (local.archivoId) return Promise.resolve(local.archivoId);
      var url = 'https://www.googleapis.com/drive/v3/files' +
        '?spaces=appDataFolder&pageSize=10&fields=' + encodeURIComponent('files(id,name,modifiedTime)');
      return pide(url).then(function (r) { return r.json(); }).then(function (d) {
        var f = (d.files || []).filter(function (x) { return x.name === ARCHIVO; })[0];
        if (f) { local.archivoId = f.id; escribeLocal(); return f.id; }
        return null;
      });
    }

    return {
      nombre: 'drive',
      autorizar: autorizar,
      revocar: function () {
        if (!acceso || !acceso.token) return Promise.resolve();
        return new Promise(function (resolver) {
          try {
            global.google.accounts.oauth2.revoke(acceso.token, function () { acceso = null; resolver(); });
          } catch (e) { acceso = null; resolver(); }
        });
      },
      leer: function () {
        return buscaArchivo().then(function (id) {
          if (!id) return null;
          return pide('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media')
            .then(function (r) { return r.text(); })
            .then(function (texto) { return { texto: texto, id: id }; })
            .catch(function (e) {
              // El archivo pudo borrarse desde Drive: se empieza de nuevo
              if (/40[34]/.test(String(e.message))) { local.archivoId = null; escribeLocal(); return null; }
              throw e;
            });
        });
      },
      escribir: function (texto) {
        return buscaArchivo().then(function (id) {
          if (id) {
            return pide('https://www.googleapis.com/upload/drive/v3/files/' + id + '?uploadType=media', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: texto
            }).then(function () { return { id: id }; });
          }
          var limite = '-------presupuestos' + Date.now();
          var cuerpo =
            '--' + limite + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify({ name: ARCHIVO, parents: ['appDataFolder'] }) + '\r\n' +
            '--' + limite + '\r\nContent-Type: application/json\r\n\r\n' +
            texto + '\r\n--' + limite + '--\r\n';
          return pide('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
            method: 'POST',
            headers: { 'Content-Type': 'multipart/related; boundary=' + limite },
            body: cuerpo
          }).then(function (r) { return r.json(); }).then(function (d) {
            local.archivoId = d.id; escribeLocal();
            return { id: d.id };
          });
        });
      }
    };
  }

  function transporte() {
    if (!remoto) remoto = creaRemotoDrive();
    return remoto;
  }

  /* --- Disponibilidad ----------------------------------------------------- */

  function disponible() { return !motivoNoDisponible(); }

  function motivoNoDisponible() {
    if (remoto && remoto.nombre === 'prueba') return null;
    if (location.protocol === 'file:') {
      return 'La sincronización necesita que la aplicación se abra desde una dirección web. ' +
             'En el archivo local del escritorio no funciona: usa las copias de seguridad.';
    }
    if (global.claude && typeof global.claude.use === 'function') {
      return 'Esta copia está publicada dentro de Claude y no puede hablar con Google. ' +
             'Para sincronizar hay que usar la aplicación alojada en su propia dirección web.';
    }
    if (!clienteId()) {
      return 'Falta el ID de cliente de Google. Se pega una sola vez aquí abajo y ya queda guardado.';
    }
    return null;
  }

  /* --- Ciclo de sincronización -------------------------------------------- */

  function avisa() {
    oyentes.forEach(function (fn) { try { fn(instantanea()); } catch (e) {} });
  }

  function instantanea() {
    return {
      disponible: disponible(),
      motivo: motivoNoDisponible(),
      conectado: estado.conectado,
      sincronizando: estado.sincronizando,
      necesitaGesto: estado.necesitaGesto,
      ultima: local.ultima || null,
      ultimoResumen: estado.ultimoResumen,
      error: estado.error,
      hayDeshacer: estado.hayDeshacer,
      cuenta: local.cuenta || null
    };
  }

  function conectar() {
    if (!disponible()) return Promise.reject(new Error(motivoNoDisponible()));
    return transporte().autorizar(false).then(function () {
      estado.conectado = true;
      estado.necesitaGesto = false;
      local.activo = true;
      escribeLocal();
      return sincronizar({ gesto: true });
    }).catch(function (e) {
      estado.error = e.message;
      avisa();
      throw e;
    });
  }

  function desconectar() {
    return transporte().revocar().catch(function () {}).then(function () {
      estado.conectado = false;
      estado.ultimoResumen = null;
      local = {};
      escribeLocal();
      avisa();
    });
  }

  function sincronizar(opciones) {
    opciones = opciones || {};
    var App = global.App;
    if (!App || !App.estado) return Promise.resolve(false);
    if (!disponible()) return Promise.resolve(false);
    if (estado.sincronizando) return Promise.resolve(false);
    if (!local.activo && !opciones.gesto) return Promise.resolve(false);

    estado.sincronizando = true;
    estado.error = null;
    avisa();

    var t = transporte();
    return t.autorizar(!opciones.gesto)
      .then(function () {
        estado.conectado = true;
        estado.necesitaGesto = false;
        return t.leer();
      })
      .then(function (archivo) {
        var remotoObj = null;
        if (archivo && archivo.texto) {
          try { remotoObj = JSON.parse(archivo.texto); }
          catch (e) { throw new Error('El archivo de Drive está dañado y no se ha tocado nada'); }
        }
        var res = Fusion.fusiona(App.estado, remotoObj);
        estado.ultimoResumen = res.resumen;

        var aplicar = Promise.resolve();
        if (Fusion.hubocambios(res.resumen)) {
          guardaDeshacer(App.estado);
          App.estado = res.estado;
          aplicar = App.guardarYa().then(function () {
            if (App.listo) { App.pintaIdentidad(); App.refrescar(); }
          });
        }
        return aplicar.then(function () {
          var huella = Fusion.huella(App.estado);
          if (huella === local.huella && remotoObj) return false;
          return t.escribir(JSON.stringify(App.estado)).then(function () {
            local.huella = huella;
            return true;
          });
        });
      })
      .then(function (subido) {
        local.ultima = new Date().toISOString();
        escribeLocal();
        estado.sincronizando = false;
        avisa();
        return subido;
      })
      .catch(function (e) {
        estado.sincronizando = false;
        estado.error = e.message || String(e);
        if (e.necesitaGesto) { estado.necesitaGesto = true; estado.conectado = false; }
        avisa();
        if (opciones.gesto) throw e;
        return false;
      });
  }

  /* --- Deshacer la última sincronización ---------------------------------- */

  function guardaDeshacer(anterior) {
    try {
      global.localStorage.setItem(CLAVE_DESHACER, JSON.stringify({
        fecha: new Date().toISOString(),
        estado: anterior
      }));
      estado.hayDeshacer = true;
    } catch (e) { estado.hayDeshacer = false; }
  }

  function deshacer() {
    var App = global.App;
    var guardado;
    try { guardado = JSON.parse(global.localStorage.getItem(CLAVE_DESHACER)); }
    catch (e) { guardado = null; }
    if (!guardado || !guardado.estado) return Promise.resolve(false);
    App.estado = guardado.estado;
    local.huella = null;
    escribeLocal();
    return App.guardarYa().then(function () {
      try { global.localStorage.removeItem(CLAVE_DESHACER); } catch (e) {}
      estado.hayDeshacer = false;
      estado.ultimoResumen = null;
      App.pintaIdentidad();
      App.refrescar();
      avisa();
      return true;
    });
  }

  /* --- Sincronización automática ------------------------------------------ */

  function programar() {
    if (!local.activo || !disponible()) return;
    if (temporizador) clearTimeout(temporizador);
    temporizador = setTimeout(function () {
      temporizador = null;
      sincronizar({});
    }, ESPERA_AUTO);
  }

  function arrancar() {
    estado.hayDeshacer = false;
    try { estado.hayDeshacer = !!global.localStorage.getItem(CLAVE_DESHACER); } catch (e) {}
    if (!local.activo || !disponible()) { avisa(); return; }
    // Al abrir se intenta en silencio: si Google pide interacción, la interfaz
    // enseña el botón de reconectar en lugar de abrir una ventana sola.
    sincronizar({});
    global.addEventListener('online', function () { sincronizar({}); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') sincronizar({});
    });
  }

  global.Sync = {
    disponible: disponible,
    motivoNoDisponible: motivoNoDisponible,
    instantanea: instantanea,
    conectar: conectar,
    desconectar: desconectar,
    sincronizar: sincronizar,
    programar: programar,
    arrancar: arrancar,
    deshacer: deshacer,
    clienteId: clienteId,
    guardaClienteId: function (v) { guardaClienteId(v); remoto = null; avisa(); },
    escucha: function (fn) { oyentes.push(fn); },
    activo: function () { return !!local.activo; },
    // Punto de entrada para las pruebas: sustituye el transporte de Google
    usarRemoto: function (r) {
      remoto = r;
      local = r ? (leerLocal() || {}) : leerLocal();
    },
    olvidaLocal: function () { local = {}; escribeLocal(); }
  };
})(window);
