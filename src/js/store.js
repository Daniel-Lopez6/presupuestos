/* =========================================================================
   store.js — capa de almacenamiento
   Guarda el estado completo de la aplicación en el dispositivo.
   Motor principal: IndexedDB (persistente y sin límite práctico).
   Motor de reserva: localStorage (necesario al abrir el archivo con
   doble clic, porque Chrome bloquea IndexedDB en el protocolo file://).
   Se expone en window.Store
   ========================================================================= */
(function (global) {
  'use strict';

  var NOMBRE_BD = 'presupuestos_app';
  var ALMACEN = 'estado';
  var CLAVE = 'documento';
  var CLAVE_LS = 'presupuestos_app_v1';

  var motor = null;      // 'idb' | 'ls' | 'memoria'
  var bd = null;
  var enMemoria = null;
  var escrituraPendiente = null;
  var ultimoError = null;

  /* --- IndexedDB ------------------------------------------------------- */

  function abrirIDB() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB || location.protocol === 'file:') {
        return reject(new Error('IndexedDB no disponible'));
      }
      var temporizador = setTimeout(function () {
        reject(new Error('IndexedDB no responde'));
      }, 3000);
      var pet;
      try {
        pet = global.indexedDB.open(NOMBRE_BD, 1);
      } catch (e) {
        clearTimeout(temporizador);
        return reject(e);
      }
      pet.onupgradeneeded = function () {
        var db = pet.result;
        if (!db.objectStoreNames.contains(ALMACEN)) db.createObjectStore(ALMACEN);
      };
      pet.onsuccess = function () {
        clearTimeout(temporizador);
        resolve(pet.result);
      };
      pet.onerror = function () {
        clearTimeout(temporizador);
        reject(pet.error || new Error('Error al abrir IndexedDB'));
      };
      pet.onblocked = function () {
        clearTimeout(temporizador);
        reject(new Error('IndexedDB bloqueada'));
      };
    });
  }

  function leerIDB() {
    return new Promise(function (resolve, reject) {
      var tx = bd.transaction(ALMACEN, 'readonly');
      var pet = tx.objectStore(ALMACEN).get(CLAVE);
      pet.onsuccess = function () { resolve(pet.result || null); };
      pet.onerror = function () { reject(pet.error); };
    });
  }

  function escribirIDB(datos) {
    return new Promise(function (resolve, reject) {
      var tx = bd.transaction(ALMACEN, 'readwrite');
      tx.objectStore(ALMACEN).put(datos, CLAVE);
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error || new Error('Transacción abortada')); };
    });
  }

  /* --- localStorage ---------------------------------------------------- */

  function localDisponible() {
    try {
      var k = '__prueba__';
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }

  function leerLS() {
    try {
      var s = global.localStorage.getItem(CLAVE_LS);
      return s ? JSON.parse(s) : null;
    } catch (e) { ultimoError = e; return null; }
  }

  function escribirLS(datos) {
    var s = JSON.stringify(datos);
    global.localStorage.setItem(CLAVE_LS, s);
    return true;
  }

  /* --- API pública ----------------------------------------------------- */

  // Prepara el motor de almacenamiento. Devuelve el estado guardado o null.
  function iniciar() {
    return abrirIDB()
      .then(function (db) {
        bd = db;
        motor = 'idb';
        return leerIDB();
      })
      .catch(function (e) {
        ultimoError = e;
        if (localDisponible()) {
          motor = 'ls';
          return leerLS();
        }
        motor = 'memoria';
        return null;
      })
      .then(function (datos) {
        // Migración: si estamos en IndexedDB pero solo hay copia en
        // localStorage (por ejemplo tras publicar la app), la recuperamos.
        if (motor === 'idb' && !datos && localDisponible()) {
          var previo = leerLS();
          if (previo) { datos = previo; guardar(previo); }
        }
        return datos;
      });
  }

  // Guarda el estado completo. Agrupa escrituras muy seguidas: si llegan
  // varias en menos de 120 ms solo se escribe la última, y las anteriores
  // se dan por buenas porque esa última incluye sus cambios.
  function guardar(datos) {
    enMemoria = datos;
    if (escrituraPendiente) {
      clearTimeout(escrituraPendiente.temporizador);
      escrituraPendiente.resolver(true);
    }
    return new Promise(function (resolve) {
      var temporizador = setTimeout(function () {
        escrituraPendiente = null;
        volcar(datos).then(resolve, function (e) {
          ultimoError = e;
          // Si IndexedDB falla en caliente, pasamos a localStorage
          if (motor === 'idb' && localDisponible()) {
            motor = 'ls';
            try { escribirLS(datos); return resolve(true); }
            catch (e2) { ultimoError = e2; }
          }
          resolve(false);
        });
      }, 120);
      escrituraPendiente = { temporizador: temporizador, resolver: resolve };
    });
  }

  // Escritura inmediata (al cerrar la ventana o antes de exportar)
  function volcar(datos) {
    datos = datos || enMemoria;
    if (!datos) return Promise.resolve(false);
    if (motor === 'idb') return escribirIDB(datos);
    if (motor === 'ls') {
      try { return Promise.resolve(escribirLS(datos)); }
      catch (e) { return Promise.reject(e); }
    }
    return Promise.resolve(false);
  }

  function guardarYa(datos) {
    if (escrituraPendiente) {
      clearTimeout(escrituraPendiente.temporizador);
      escrituraPendiente.resolver(true);
      escrituraPendiente = null;
    }
    return volcar(datos);
  }

  function borrarTodo() {
    try { global.localStorage.removeItem(CLAVE_LS); } catch (e) {}
    if (motor === 'idb' && bd) return escribirIDB(null);
    return Promise.resolve(true);
  }

  // Pide al navegador que no borre estos datos al liberar espacio.
  function pedirPersistencia() {
    if (navigator.storage && navigator.storage.persist) {
      return navigator.storage.persist().catch(function () { return false; });
    }
    return Promise.resolve(false);
  }

  function info() {
    var etiquetas = {
      idb: 'Base de datos del navegador (IndexedDB)',
      ls: 'Almacenamiento local del navegador',
      memoria: 'Solo memoria — los datos se perderán al cerrar'
    };
    return {
      motor: motor,
      etiqueta: etiquetas[motor] || 'Desconocido',
      fiable: motor === 'idb' || motor === 'ls',
      error: ultimoError ? String(ultimoError.message || ultimoError) : null
    };
  }

  global.Store = {
    iniciar: iniciar,
    guardar: guardar,
    guardarYa: guardarYa,
    borrarTodo: borrarTodo,
    pedirPersistencia: pedirPersistencia,
    info: info
  };
})(window);
