/* =========================================================================
   fusion.js — mezcla de dos copias de los datos
   Cada registro lleva su marca de tiempo y las bajas dejan rastro, así que
   dos dispositivos pueden trabajar sueltos y luego juntar lo hecho sin que
   uno pise al otro. Para cada registro gana la edición más reciente.
   Se expone en window.Fusion
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U;

  var COLECCIONES = ['presupuestos', 'clientes', 'partidas', 'gastos'];
  var DIAS_RASTRO = 120;   // cuánto se guarda el rastro de un borrado

  function ahora() { return new Date().toISOString(); }

  function marca(registro) {
    return registro && (registro.modificado || registro.creado) || '';
  }

  function indexa(lista) {
    var mapa = {};
    (lista || []).forEach(function (r) { if (r && r.id) mapa[r.id] = r; });
    return mapa;
  }

  /* --- Rastro de borrados ------------------------------------------------ */

  function anotaBorrado(estado, id) {
    if (!estado.borrados) estado.borrados = {};
    estado.borrados[id] = ahora();
  }

  function limpiaRastro(borrados) {
    var limite = new Date(Date.now() - DIAS_RASTRO * 86400000).toISOString();
    var salida = {};
    Object.keys(borrados || {}).forEach(function (id) {
      if (borrados[id] > limite) salida[id] = borrados[id];
    });
    return salida;
  }

  function uneRastros(a, b) {
    var salida = {};
    [a || {}, b || {}].forEach(function (mapa) {
      Object.keys(mapa).forEach(function (id) {
        if (!salida[id] || mapa[id] > salida[id]) salida[id] = mapa[id];
      });
    });
    return limpiaRastro(salida);
  }

  /* --- Mezcla ------------------------------------------------------------ */

  // Devuelve { estado, resumen }. No modifica ninguno de los dos originales.
  function fusiona(local, remoto) {
    if (!remoto) return { estado: local, resumen: vacio('sin-remoto') };
    if (!local) return { estado: remoto, resumen: vacio('sin-local') };

    var salida = U.clona(local);
    var resumen = vacio('fusion');
    var rastro = uneRastros(local.borrados, remoto.borrados);

    COLECCIONES.forEach(function (col) {
      var aqui = indexa(local[col]);
      var alla = indexa(remoto[col]);
      var ids = {};
      Object.keys(aqui).forEach(function (id) { ids[id] = true; });
      Object.keys(alla).forEach(function (id) { ids[id] = true; });

      var lista = [];
      Object.keys(ids).forEach(function (id) {
        var a = aqui[id], b = alla[id];
        var elegido = a;
        if (a && b) {
          if (marca(b) > marca(a)) { elegido = b; resumen.actualizados++; }
        } else if (b && !a) {
          elegido = b;
          resumen.nuevos++;
        }
        // Una baja solo se respeta si es posterior a la última edición
        var baja = rastro[id];
        if (baja && baja >= marca(elegido)) {
          if (a) resumen.eliminados++;
          return;
        }
        lista.push(elegido);
      });

      lista.sort(function (x, y) {
        return String(x.creado || '').localeCompare(String(y.creado || ''));
      });
      salida[col] = lista;
    });

    salida.borrados = rastro;
    salida.ajustes = fusionaAjustes(local.ajustes, remoto.ajustes, resumen);
    salida.version = 1;
    return { estado: salida, resumen: resumen };
  }

  function fusionaAjustes(a, b, resumen) {
    if (!b) return a;
    if (!a) return b;
    var gana = marca(b) > marca(a) ? b : a;
    var salida = U.clona(gana);
    if (gana === b) resumen.ajustes = true;
    // El contador de numeración nunca retrocede: si no, dos dispositivos
    // acabarían emitiendo el mismo número de presupuesto.
    var na = (a.numeracion || {}), nb = (b.numeracion || {});
    var anio = Math.max(U.num(na.anio), U.num(nb.anio));
    var siguiente = (U.num(na.anio) === U.num(nb.anio))
      ? Math.max(U.num(na.siguiente), U.num(nb.siguiente))
      : (U.num(na.anio) > U.num(nb.anio) ? U.num(na.siguiente) : U.num(nb.siguiente));
    salida.numeracion = U.clona(gana.numeracion || {});
    salida.numeracion.anio = anio || new Date().getFullYear();
    salida.numeracion.siguiente = Math.max(1, siguiente);
    // La fecha de la última copia local no se pisa con la del otro equipo
    salida.ultimaCopia = (a.ultimaCopia || '') > (b.ultimaCopia || '')
      ? a.ultimaCopia : b.ultimaCopia;
    return salida;
  }

  function vacio(motivo) {
    return { motivo: motivo, nuevos: 0, actualizados: 0, eliminados: 0, ajustes: false };
  }

  function hubocambios(resumen) {
    return !!(resumen.nuevos || resumen.actualizados || resumen.eliminados || resumen.ajustes);
  }

  function describe(resumen) {
    if (!hubocambios(resumen)) return 'Sin novedades';
    var trozos = [];
    if (resumen.nuevos) trozos.push(resumen.nuevos + (resumen.nuevos === 1 ? ' registro nuevo' : ' registros nuevos'));
    if (resumen.actualizados) trozos.push(resumen.actualizados + (resumen.actualizados === 1 ? ' actualizado' : ' actualizados'));
    if (resumen.eliminados) trozos.push(resumen.eliminados + (resumen.eliminados === 1 ? ' eliminado' : ' eliminados'));
    if (resumen.ajustes) trozos.push('ajustes');
    return trozos.join(', ');
  }

  // Huella del contenido, para no subir nada si no ha cambiado
  function huella(estado) {
    var copia = U.clona(estado);
    delete copia.ajustes.ultimaCopia;
    delete copia.sincronizacion;
    var texto = JSON.stringify(copia);
    var h = 5381;
    for (var i = 0; i < texto.length; i++) {
      h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
    }
    return String(h >>> 0) + '.' + texto.length;
  }

  global.Fusion = {
    COLECCIONES: COLECCIONES,
    fusiona: fusiona,
    anotaBorrado: anotaBorrado,
    limpiaRastro: limpiaRastro,
    hubocambios: hubocambios,
    describe: describe,
    huella: huella,
    marca: marca
  };
})(window);
