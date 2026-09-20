/* =========================================================================
   vista-presupuestos.js — listado de presupuestos y editor
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U, App = global.App, UI = global.UI,
      Modelo = global.Modelo, Base = global.Base, Doc = global.Doc;

  var filtro = { texto: '', estado: 'todos', orden: 'fecha' };

  /* =======================================================================
     LISTADO
     ======================================================================= */

  App.vistas.presupuestos = {
    titulo: 'Presupuestos',
    subtitulo: function () {
      var n = App.estado.presupuestos.length;
      return n ? n + (n === 1 ? ' presupuesto guardado' : ' presupuestos guardados') : '';
    },
    acciones: function () {
      return '<button class="btn btn-pri" id="btn-nuevo">' + UI.ic('mas', 16) + '<span>Nuevo presupuesto</span></button>';
    },
    render: function (cont) {
      var lista = App.estado.presupuestos.slice();
      var hoy = U.hoyISO();

      lista.forEach(function (p) { p._efectivo = Modelo.estadoEfectivo(p, hoy); });

      var visibles = lista.filter(function (p) {
        if (filtro.estado !== 'todos' && p._efectivo !== filtro.estado) return false;
        if (!filtro.texto) return true;
        return U.contiene(p.numero, filtro.texto) ||
               U.contiene(p.cliente && p.cliente.nombre, filtro.texto) ||
               U.contiene(p.objeto, filtro.texto);
      });

      visibles.sort(function (a, b) {
        if (filtro.orden === 'importe') return Modelo.totales(b).total - Modelo.totales(a).total;
        if (filtro.orden === 'cliente') {
          return U.normaliza(a.cliente.nombre).localeCompare(U.normaliza(b.cliente.nombre));
        }
        return (b.fecha + b.creado).localeCompare(a.fecha + a.creado);
      });

      var cuentas = { todos: lista.length };
      Base.ESTADOS.forEach(function (e) {
        cuentas[e.id] = lista.filter(function (p) { return p._efectivo === e.id; }).length;
      });

      var chips = [{ id: 'todos', nombre: 'Todos' }].concat(Base.ESTADOS).map(function (e) {
        return '<button class="btn btn-s' + (filtro.estado === e.id ? ' btn-pri' : '') +
          '" data-filtro="' + e.id + '">' + e.nombre +
          ' <span class="tenue" style="font-weight:600">' + (cuentas[e.id] || 0) + '</span></button>';
      }).join('');

      cont.innerHTML =
        '<div class="tarjeta">' +
          '<div class="tarjeta-cab" style="flex-wrap:wrap;gap:8px">' +
            '<div class="flex" style="flex-wrap:wrap;gap:6px">' + chips + '</div>' +
            '<div class="der">' +
              '<div class="buscador"><span class="ic-b">' + UI.ic('lupa', 15) + '</span>' +
                '<input type="search" id="buscar" placeholder="Buscar por número, cliente u objeto" value="' + U.esc(filtro.texto) + '"></div>' +
              '<select id="orden" style="width:auto">' +
                '<option value="fecha"' + (filtro.orden === 'fecha' ? ' selected' : '') + '>Más recientes</option>' +
                '<option value="importe"' + (filtro.orden === 'importe' ? ' selected' : '') + '>Mayor importe</option>' +
                '<option value="cliente"' + (filtro.orden === 'cliente' ? ' selected' : '') + '>Cliente</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          (visibles.length ? tablaListado(visibles, hoy) :
            UI.vacio(
              lista.length ? 'Ningún presupuesto con ese filtro' : 'Todavía no hay presupuestos',
              lista.length ? 'Prueba con otro estado o borra la búsqueda.' : 'Crea el primero y quedará guardado en este dispositivo.',
              lista.length ? '' : '<button class="btn btn-pri" id="btn-nuevo-vacio">' + UI.ic('mas', 16) + '<span>Nuevo presupuesto</span></button>'
            )) +
        '</div>';
    },
    despues: function (cont) {
      var nuevo = function () { crear(); };
      var b1 = document.getElementById('btn-nuevo');
      if (b1) b1.addEventListener('click', nuevo);
      var b2 = document.getElementById('btn-nuevo-vacio');
      if (b2) b2.addEventListener('click', nuevo);

      var buscar = document.getElementById('buscar');
      if (buscar) {
        buscar.addEventListener('input', U.debounce(function () {
          filtro.texto = buscar.value;
          App.refrescar();
          var n = document.getElementById('buscar');
          if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
        }, 220));
      }
      var orden = document.getElementById('orden');
      if (orden) orden.addEventListener('change', function () { filtro.orden = orden.value; App.refrescar(); });

      cont.querySelectorAll('[data-filtro]').forEach(function (b) {
        b.addEventListener('click', function () { filtro.estado = b.dataset.filtro; App.refrescar(); });
      });

      cont.querySelectorAll('[data-abrir]').forEach(function (f) {
        f.addEventListener('click', function (e) {
          if (e.target.closest('button')) return;
          App.ir('editor', { id: f.dataset.abrir });
        });
      });
      cont.querySelectorAll('[data-accion]').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          accionRapida(b.dataset.accion, b.dataset.id);
        });
      });
    }
  };

  function tablaListado(lista, hoy) {
    var filas = lista.map(function (p) {
      var t = Modelo.totales(p);
      var dias = Modelo.diasParaCaducar(p, hoy);
      var pista = '';
      if (p._efectivo === 'enviado') {
        pista = dias <= 0 ? '<span class="apagado">caduca hoy</span>'
          : '<span class="apagado">' + dias + ' días</span>';
      } else if (p._efectivo === 'aceptado' && p.fechaRespuesta) {
        pista = '<span class="apagado">' + U.fechaCorta(p.fechaRespuesta) + '</span>';
      }
      return '<tr class="fila-click" data-abrir="' + p.id + '">' +
        '<td class="fuerte nowrap">' + U.esc(p.numero) + '</td>' +
        '<td class="nowrap tabla-oculta-movil">' + U.fechaCorta(p.fecha) + '</td>' +
        '<td>' + U.esc(p.cliente && p.cliente.nombre ? p.cliente.nombre : '—') +
          (p.objeto ? '<div class="apagado">' + U.esc(U.recorta(p.objeto, 64)) + '</div>' : '') + '</td>' +
        '<td class="cen tabla-oculta-movil">' + t.numLineas + '</td>' +
        '<td class="num fuerte">' + U.eur(t.total) + '</td>' +
        '<td>' + UI.etiquetaEstado(p._efectivo) + ' ' + pista + '</td>' +
        '<td><div class="acciones-fila">' +
          boton('ver', 'Vista previa', p.id) +
          boton('imprimir', 'Imprimir o guardar en PDF', p.id) +
          boton('copiar', 'Duplicar', p.id) +
        '</div></td>' +
      '</tr>';
    }).join('');

    return '<div class="tabla-caja"><table class="t"><thead><tr>' +
      '<th>Número</th><th class="tabla-oculta-movil">Fecha</th><th>Cliente</th>' +
      '<th class="cen tabla-oculta-movil">Part.</th><th class="der">Total</th><th>Estado</th><th></th>' +
      '</tr></thead><tbody>' + filas + '</tbody></table></div>';
  }

  function boton(accion, titulo, id) {
    return '<button class="btn btn-plano btn-icono" data-accion="' + accion + '" data-id="' + id +
      '" title="' + U.esc(titulo) + '">' + UI.ic(accion, 16) + '</button>';
  }

  function accionRapida(accion, id) {
    var p = App.presupuesto(id);
    if (!p) return;
    if (accion === 'ver') return previsualizar(p);
    if (accion === 'imprimir') return Doc.imprimir(App.estado, p);
    if (accion === 'copiar') return duplicar(p);
  }

  function crear() {
    var p = Modelo.nuevoPresupuesto(App.estado);
    Modelo.consumeNumero(App.estado);
    App.estado.presupuestos.push(p);
    App.guardar();
    App.ir('editor', { id: p.id });
  }

  function duplicar(orig) {
    var p = U.clona(orig);
    p.id = U.uid('pre');
    p.numero = Modelo.siguienteNumero(App.estado);
    Modelo.consumeNumero(App.estado);
    p.fecha = U.hoyISO();
    p.estado = 'borrador';
    p.fechaEnvio = null;
    p.fechaRespuesta = null;
    p.creado = new Date().toISOString();
    p.lineas.forEach(function (l) { l.id = U.uid('lin'); });
    App.estado.presupuestos.push(p);
    App.guardar();
    UI.aviso('Presupuesto duplicado como ' + p.numero, 'ok');
    App.ir('editor', { id: p.id });
  }

  function previsualizar(p) {
    var caja = document.createElement('div');
    caja.className = 'previsualizacion';
    caja.style.margin = '-20px';
    var m = UI.modal({
      titulo: 'Vista previa · ' + p.numero,
      ancho: 'extra',
      cuerpo: caja,
      sinFoco: true,
      botones: [
        { texto: 'Cerrar' },
        { texto: 'Imprimir o guardar en PDF', clase: 'btn-pri', icono: 'imprimir', cierra: false,
          accion: function () { Doc.imprimir(App.estado, p); } }
      ]
    });
    var salida = document.createElement('div');
    caja.appendChild(salida);
    Doc.render(App.estado, p, salida);
    ajustaEscala(caja, salida);
    var alRedimensionar = function () { ajustaEscala(caja, salida); };
    window.addEventListener('resize', alRedimensionar);
    var cerrarOrig = m.cerrar;
    m.cerrar = function () { window.removeEventListener('resize', alRedimensionar); cerrarOrig(); };
  }

  function ajustaEscala(caja, salida) {
    var anchoPagina = 210 * 96 / 25.4;
    var disponible = caja.clientWidth - 44;
    var escala = Math.min(1, disponible / anchoPagina);
    salida.style.transform = 'scale(' + escala + ')';
    salida.style.transformOrigin = 'top center';
    salida.style.width = anchoPagina + 'px';
    salida.style.margin = '0 auto';
    var alto = salida.scrollHeight * escala;
    salida.style.height = (salida.scrollHeight) + 'px';
    caja.style.height = Math.min(window.innerHeight - 220, alto + 40) + 'px';
  }

  /* =======================================================================
     EDITOR
     ======================================================================= */

  var editando = null;

  App.vistas.editor = {
    titulo: function () {
      var p = App.presupuesto(App.parametros.id);
      return p ? 'Presupuesto ' + p.numero : 'Presupuesto';
    },
    subtitulo: function () {
      var p = App.presupuesto(App.parametros.id);
      if (!p) return '';
      var t = Modelo.totales(p);
      return U.esc(p.cliente.nombre || 'Sin cliente') + ' · ' + t.numLineas +
        ' partidas · <b>' + U.eur(t.total) + '</b>';
    },
    acciones: function () {
      return '<button class="btn" data-vista="presupuestos">' + UI.ic('volver', 16) + '<span>Volver</span></button>' +
        '<button class="btn" id="ed-previa">' + UI.ic('ver', 16) + '<span>Vista previa</span></button>' +
        '<button class="btn btn-pri" id="ed-pdf">' + UI.ic('imprimir', 16) + '<span>Imprimir / PDF</span></button>';
    },
    render: function (cont) {
      var p = App.presupuesto(App.parametros.id);
      if (!p) {
        cont.innerHTML = UI.vacio('Presupuesto no encontrado', 'Puede que se haya borrado.');
        return;
      }
      editando = p;
      cont.innerHTML =
        bloqueCabecera(p) +
        '<div class="sep"></div>' +
        bloqueCliente(p) +
        '<div class="sep"></div>' +
        bloqueLineas(p) +
        '<div class="sep"></div>' +
        bloqueCondiciones(p) +
        '<div class="sep"></div>' +
        bloquePeligro(p);
    },
    despues: function (cont) {
      var p = editando;
      if (!p) return;
      conectaEditor(cont, p);
    }
  };

  function bloqueCabecera(p) {
    var estados = Base.ESTADOS.filter(function (e) { return e.id !== 'caducado'; });
    var efectivo = Modelo.estadoEfectivo(p);
    var avisoCaducado = efectivo === 'caducado'
      ? '<div class="aviso aviso-oro">' + UI.ic('reloj', 16) +
        '<div>Este presupuesto se envió el ' + U.fechaCorta(p.fechaEnvio || p.fecha) +
        ' y su validez terminó el ' + U.fechaCorta(Modelo.caducidad(p)) +
        '. Puedes ampliar la validez o volver a enviarlo con fecha de hoy.</div></div>'
      : '';
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Datos del presupuesto</h2>' +
      '<div class="der">' + UI.etiquetaEstado(efectivo) + '</div></div>' +
      '<div class="tarjeta-cuerpo">' + avisoCaducado +
        '<div class="fila-campos fc-4">' +
          UI.campo({ etiqueta: 'Número', nombre: 'numero', valor: p.numero }) +
          UI.campo({ etiqueta: 'Fecha de emisión', tipo: 'date', nombre: 'fecha', valor: p.fecha }) +
          UI.campo({ etiqueta: 'Validez (días)', tipo: 'number', nombre: 'validezDias', valor: p.validezDias, min: 0,
                     ayuda: 'Caduca el ' + U.fechaCorta(Modelo.caducidad(p)) }) +
          UI.campo({ etiqueta: 'Estado', tipo: 'select', nombre: 'estado', valor: p.estado,
                     opciones: estados.map(function (e) { return { valor: e.id, nombre: e.nombre }; }) }) +
        '</div>' +
        UI.campo({ etiqueta: 'Objeto del presupuesto', tipo: 'textarea', nombre: 'objeto', valor: p.objeto,
                   filas: 2, placeholder: 'Trabajos de reparación y acondicionamiento de techo y paramentos verticales.',
                   ayuda: 'Una o dos frases que resuman la obra. Aparece bajo los datos del cliente.' }) +
      '</div></div>';
  }

  function bloqueCliente(p) {
    var opciones = [{ valor: '', nombre: '— Escribir los datos a mano —' }].concat(
      App.estado.clientes.map(function (c) { return { valor: c.id, nombre: c.nombre }; })
    );
    var c = p.cliente || {};
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Cliente</h2>' +
      '<div class="der"><button class="btn btn-s" id="ed-guardar-cliente">' + UI.ic('guardar', 15) +
      '<span>Guardar en clientes</span></button></div></div>' +
      '<div class="tarjeta-cuerpo">' +
        UI.campo({ etiqueta: 'Cliente guardado', tipo: 'select', nombre: 'clienteId', valor: p.clienteId || '', opciones: opciones }) +
        '<div class="fila-campos fc-2">' +
          UI.campo({ etiqueta: 'Nombre o razón social', nombre: 'cli_nombre', valor: c.nombre, placeholder: 'ADINCO S.L.' }) +
          UI.campo({ etiqueta: 'NIF / CIF', nombre: 'cli_nif', valor: c.nif, placeholder: 'B12345678' }) +
        '</div>' +
        '<div class="fila-campos fc-2">' +
          UI.campo({ etiqueta: 'Dirección', nombre: 'cli_direccion', valor: c.direccion }) +
          '<div class="fila-campos fc-2">' +
            UI.campo({ etiqueta: 'Código postal', nombre: 'cli_cp', valor: c.cp }) +
            UI.campo({ etiqueta: 'Población', nombre: 'cli_ciudad', valor: c.ciudad }) +
          '</div>' +
        '</div>' +
        '<div class="fila-campos fc-2">' +
          UI.campo({ etiqueta: 'Teléfono', nombre: 'cli_telefono', valor: c.telefono }) +
          UI.campo({ etiqueta: 'Correo electrónico', tipo: 'email', nombre: 'cli_email', valor: c.email }) +
        '</div>' +
      '</div></div>';
  }

  function bloqueLineas(p) {
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Partidas</h2>' +
      '<div class="der">' +
        '<button class="btn btn-s" id="ed-add-banco">' + UI.ic('precios', 15) + '<span>Del banco de precios</span></button>' +
        '<button class="btn btn-s" id="ed-add-seccion">' + UI.ic('mas', 15) + '<span>Capítulo</span></button>' +
        '<button class="btn btn-s btn-pri" id="ed-add-linea">' + UI.ic('mas', 15) + '<span>Partida</span></button>' +
      '</div></div>' +
      '<div class="tarjeta-cuerpo">' +
        '<div class="tabla-caja"><table class="lineas" id="tabla-lineas"><thead><tr>' +
          '<th style="width:26px"></th>' +
          '<th>Descripción</th>' +
          '<th style="width:92px">Unidad</th>' +
          '<th style="width:84px" class="derecha">Cantidad</th>' +
          '<th style="width:100px" class="derecha">Precio</th>' +
          '<th style="width:76px" class="derecha">Dto. %</th>' +
          '<th style="width:104px" class="derecha">Importe</th>' +
          '<th style="width:36px"></th>' +
        '</tr></thead><tbody id="cuerpo-lineas">' + filasLineas(p) + '</tbody></table></div>' +
        (p.lineas.length ? '' : '<div class="vacio" style="padding:26px"><p>Aún no hay partidas. ' +
          'Añádelas del banco de precios o escríbelas a mano.</p></div>') +
        '<div class="linea-sep"></div>' +
        '<div class="fila-campos fc-3">' +
          UI.campo({ etiqueta: 'Descuento global (%)', tipo: 'number', nombre: 'descuentoGlobal', valor: p.descuentoGlobal, paso: '0.01', min: 0,
                     attrs: ' max="100"' }) +
          UI.campo({ etiqueta: 'IVA', tipo: 'select', nombre: 'ivaPct', valor: p.ivaPct,
                     opciones: Base.TIPOS_IVA.map(function (t) { return { valor: t.valor, nombre: t.nombre }; }),
                     ayuda: 'El 10 % pide tres cosas a la vez: que el cliente sea un particular o una ' +
                            'comunidad de vecinos, que la vivienda tenga más de dos años, y que el ' +
                            'material que pongas tú no pase del 40 % del importe sin IVA. Si falla una, va al 21 %.' }) +
          UI.campo({ etiqueta: 'Retención de IRPF', tipo: 'select', nombre: 'irpfPct', valor: p.irpfPct,
                     opciones: Base.TIPOS_IRPF.map(function (t) { return { valor: t.valor, nombre: t.nombre }; }),
                     ayuda: 'En obras y reformas casi siempre va sin retención: la llevan las actividades ' +
                            'profesionales, no las empresariales. Déjalo en cero salvo que tu gestor te diga otra cosa.' }) +
        '</div>' +
        '<div id="caja-resumen">' + resumenHTML(p) + '</div>' +
      '</div></div>';
  }

  function filasLineas(p) {
    return p.lineas.map(function (l, i) { return filaLinea(l, i, p); }).join('');
  }

  function filaLinea(l, i, p) {
    if (l.tipo === 'seccion') {
      return '<tr class="es-seccion" data-linea="' + l.id + '" data-indice="' + i + '">' +
        '<td class="mano" draggable="true" title="Arrastra para mover">' + UI.ic('mano', 14) + '</td>' +
        '<td colspan="6"><input type="text" data-campo="descripcion" value="' + U.esc(l.descripcion) +
          '" placeholder="Nombre del capítulo, por ejemplo: Baño"></td>' +
        '<td class="col-borrar"><button class="btn btn-plano btn-icono" data-borrar="' + l.id + '" title="Quitar">' + UI.ic('papelera', 15) + '</button></td>' +
      '</tr>';
    }
    var unidades = Base.UNIDADES.map(function (u) {
      return '<option value="' + u + '"' + (u === l.unidad ? ' selected' : '') + '>' + u + '</option>';
    }).join('');
    return '<tr data-linea="' + l.id + '" data-indice="' + i + '">' +
      '<td class="mano" draggable="true" title="Arrastra para mover">' + UI.ic('mano', 14) + '</td>' +
      '<td class="col-desc"><textarea data-campo="descripcion" rows="1" placeholder="Descripción de la partida">' + U.esc(l.descripcion) + '</textarea></td>' +
      '<td data-et="Unidad"><select data-campo="unidad">' + unidades + '</select></td>' +
      '<td data-et="Cantidad"><input type="text" inputmode="decimal" class="n" data-campo="cantidad" value="' + U.esc(U.cant(l.cantidad)) + '"></td>' +
      '<td data-et="Precio"><input type="text" inputmode="decimal" class="n" data-campo="precio" value="' + U.esc(dosDec(l.precio)) + '"></td>' +
      '<td data-et="Dto. %"><input type="text" inputmode="decimal" class="n" data-campo="descuento" value="' + U.esc(l.descuento ? U.cant(l.descuento) : '') + '"></td>' +
      '<td class="imp" data-importe="' + l.id + '">' + U.eur(Modelo.importeLinea(l)) + '</td>' +
      '<td class="col-borrar"><button class="btn btn-plano btn-icono" data-borrar="' + l.id + '" title="Quitar">' + UI.ic('papelera', 15) + '</button></td>' +
    '</tr>';
  }

  function dosDec(n) {
    return U.num(n).toFixed(2).replace('.', ',');
  }

  function resumenHTML(p) {
    var t = Modelo.totales(p);
    var filas = '';
    if (t.descuento) {
      filas += '<div class="fila"><span>Suma de partidas</span><b>' + U.eur(t.subtotal) + '</b></div>';
      filas += '<div class="fila"><span>Descuento ' + U.cant(t.descuentoPct) + ' %</span><b>−' + U.eur(t.descuento) + '</b></div>';
    }
    filas += '<div class="fila"><span>Base imponible</span><b>' + U.eur(t.base) + '</b></div>';
    filas += '<div class="fila"><span>IVA ' + U.cant(t.ivaPct) + ' %</span><b>' + U.eur(t.iva) + '</b></div>';
    if (t.irpf) filas += '<div class="fila"><span>Retención IRPF ' + U.cant(t.irpfPct) + ' %</span><b>−' + U.eur(t.irpf) + '</b></div>';
    return '<div class="resumen-caja">' + filas +
      '<div class="total"><span>Total</span><b>' + U.eur(t.total) + '</b></div></div>';
  }

  function bloqueCondiciones(p) {
    return '<div class="tarjeta"><div class="tarjeta-cab"><h2>Condiciones y observaciones</h2>' +
      '<div class="der"><button class="btn btn-s" id="ed-cond-reset">Restaurar las de Ajustes</button></div></div>' +
      '<div class="tarjeta-cuerpo">' +
        UI.campo({ etiqueta: 'Condiciones generales (una por línea)', tipo: 'textarea', nombre: 'condiciones',
                   valor: (p.condiciones || []).join('\n'), filas: 5 }) +
        UI.campo({ etiqueta: 'Observaciones', tipo: 'textarea', nombre: 'notas', valor: p.notas, filas: 3,
                   placeholder: 'Texto adicional que aparecerá al final del documento (opcional)' }) +
      '</div></div>';
  }

  function bloquePeligro(p) {
    return '<div class="tarjeta"><div class="tarjeta-cuerpo flex" style="flex-wrap:wrap;gap:10px">' +
      '<button class="btn" id="ed-duplicar">' + UI.ic('copiar', 16) + '<span>Duplicar</span></button>' +
      '<button class="btn" id="ed-exportar">' + UI.ic('descarga', 16) + '<span>Guardar como archivo</span></button>' +
      '<span class="flex-fin"></span>' +
      '<button class="btn btn-peligro" id="ed-borrar">' + UI.ic('papelera', 16) + '<span>Eliminar presupuesto</span></button>' +
      '</div></div>';
  }

  /* --- Conexión de eventos del editor ------------------------------------ */

  function conectaEditor(cont, p) {
    // Todo cambio del presupuesto pasa por aquí, así queda con su marca de
    // tiempo y la sincronización sabe cuál es la versión buena.
    function guarda() { App.tocar(p); return App.guardar(); }
    var guardarSuave = U.debounce(guarda, 400);

    function refrescaResumen() {
      var caja = document.getElementById('caja-resumen');
      if (caja) caja.innerHTML = resumenHTML(p);
      var sub = document.getElementById('sub-vista');
      if (sub) {
        var t = Modelo.totales(p);
        sub.innerHTML = U.esc(p.cliente.nombre || 'Sin cliente') + ' · ' + t.numLineas +
          ' partidas · <b>' + U.eur(t.total) + '</b>';
      }
    }

    /* Campos generales */
    cont.addEventListener('input', function (e) {
      var c = e.target;
      if (!c.name) return;
      var n = c.name;
      if (n === 'numero') p.numero = c.value;
      else if (n === 'fecha') p.fecha = c.value;
      else if (n === 'validezDias') p.validezDias = U.num(c.value);
      else if (n === 'objeto') p.objeto = c.value;
      else if (n === 'descuentoGlobal') {
        p.descuentoGlobal = Math.min(100, Math.max(0, U.num(c.value)));
        refrescaResumen();
      }
      else if (n === 'notas') p.notas = c.value;
      else if (n === 'condiciones') p.condiciones = c.value.split('\n');
      else if (n.indexOf('cli_') === 0) {
        p.cliente[n.slice(4)] = c.value;
        if (n === 'cli_nombre') refrescaResumen();
        var sel = cont.querySelector('[name=clienteId]');
        if (sel && sel.value) {
          // Al tocar los datos a mano se desliga del cliente guardado
          var g = App.cliente(sel.value);
          if (g && g[n.slice(4)] !== c.value) { sel.value = ''; p.clienteId = null; }
        }
      }
      guardarSuave();
    });

    cont.addEventListener('change', function (e) {
      var c = e.target;
      if (!c.name) return;
      if (c.name === 'estado') {
        p.estado = c.value;
        if (c.value === 'enviado' && !p.fechaEnvio) p.fechaEnvio = U.hoyISO();
        if (c.value === 'aceptado' || c.value === 'rechazado') p.fechaRespuesta = U.hoyISO();
        if (c.value === 'borrador') { p.fechaEnvio = null; p.fechaRespuesta = null; }
        guarda();
        App.refrescar();
      } else if (c.name === 'ivaPct') { p.ivaPct = U.num(c.value); refrescaResumen(); guarda(); }
      else if (c.name === 'irpfPct') { p.irpfPct = U.num(c.value); refrescaResumen(); guarda(); }
      else if (c.name === 'validezDias') { App.refrescar(); }
      else if (c.name === 'clienteId') {
        var cli = App.cliente(c.value);
        p.clienteId = c.value || null;
        if (cli) {
          ['nombre', 'nif', 'direccion', 'cp', 'ciudad', 'telefono', 'email'].forEach(function (k) {
            p.cliente[k] = cli[k] || '';
          });
        }
        guarda();
        App.refrescar();
      }
    });

    /* Líneas */
    var cuerpo = document.getElementById('cuerpo-lineas');
    if (cuerpo) {
      cuerpo.addEventListener('input', function (e) {
        var campo = e.target.dataset.campo;
        if (!campo) return;
        var fila = e.target.closest('[data-linea]');
        var l = lineaPorId(p, fila.dataset.linea);
        if (!l) return;
        if (campo === 'cantidad' || campo === 'precio' || campo === 'descuento') l[campo] = U.num(e.target.value);
        else l[campo] = e.target.value;
        if (e.target.tagName === 'TEXTAREA') autoAlto(e.target);
        var celda = cuerpo.querySelector('[data-importe="' + l.id + '"]');
        if (celda) celda.textContent = U.eur(Modelo.importeLinea(l));
        refrescaResumen();
        guardarSuave();
      });
      cuerpo.addEventListener('focusout', function (e) {
        var campo = e.target.dataset.campo;
        if (campo !== 'cantidad' && campo !== 'precio' && campo !== 'descuento') return;
        var fila = e.target.closest('[data-linea]');
        var l = lineaPorId(p, fila.dataset.linea);
        if (!l) return;
        if (campo === 'precio') e.target.value = dosDec(l.precio);
        else if (campo === 'descuento') e.target.value = l.descuento ? U.cant(l.descuento) : '';
        else e.target.value = U.cant(l.cantidad);
      });
      cuerpo.addEventListener('change', function (e) {
        if (e.target.dataset.campo === 'unidad') {
          var l = lineaPorId(p, e.target.closest('[data-linea]').dataset.linea);
          if (l) { l.unidad = e.target.value; guarda(); }
        }
      });
      cuerpo.addEventListener('click', function (e) {
        var b = e.target.closest('[data-borrar]');
        if (!b) return;
        p.lineas = p.lineas.filter(function (l) { return l.id !== b.dataset.borrar; });
        guarda();
        App.refrescar();
      });
      cuerpo.querySelectorAll('textarea').forEach(autoAlto);
      arrastrable(cuerpo, p);
    }

    enlaza('ed-add-linea', function () {
      p.lineas.push(Modelo.nuevaLinea({}));
      guarda();
      App.refrescar();
      enfocaUltima();
    });
    enlaza('ed-add-seccion', function () {
      p.lineas.push(Modelo.nuevaLinea({ tipo: 'seccion', descripcion: '' }));
      guarda();
      App.refrescar();
      enfocaUltima();
    });
    enlaza('ed-add-banco', function () { abreBanco(p); });
    enlaza('ed-previa', function () { previsualizar(p); });
    enlaza('ed-pdf', function () { Doc.imprimir(App.estado, p); });
    enlaza('ed-duplicar', function () { duplicar(p); });
    enlaza('ed-exportar', function () {
      Doc.exportarHTML(App.estado, p);
      UI.aviso('Presupuesto guardado como archivo', 'ok');
    });
    enlaza('ed-cond-reset', function () {
      p.condiciones = App.estado.ajustes.condiciones.slice();
      guarda();
      App.refrescar();
    });
    enlaza('ed-guardar-cliente', function () {
      if (!p.cliente.nombre) return UI.aviso('Escribe primero el nombre del cliente', 'err');
      var existente = App.estado.clientes.filter(function (c) {
        return U.normaliza(c.nombre) === U.normaliza(p.cliente.nombre);
      })[0];
      if (existente) {
        ['nif', 'direccion', 'cp', 'ciudad', 'telefono', 'email'].forEach(function (k) {
          if (p.cliente[k]) existente[k] = p.cliente[k];
        });
        App.tocar(existente);
        p.clienteId = existente.id;
        UI.aviso('Ficha de cliente actualizada', 'ok');
      } else {
        var c = Modelo.nuevoCliente(p.cliente);
        App.estado.clientes.push(c);
        p.clienteId = c.id;
        UI.aviso('Cliente guardado', 'ok');
      }
      guarda();
      App.refrescar();
    });
    enlaza('ed-borrar', function () {
      UI.confirmar({
        titulo: 'Eliminar presupuesto',
        html: 'Se borrará <b>' + U.esc(p.numero) + '</b> y no se podrá recuperar.',
        aceptar: 'Eliminar', peligro: true
      }).then(function (si) {
        if (!si) return;
        App.borrar('presupuestos', p.id);
        App.ir('presupuestos');
      });
    });
  }

  function enlaza(id, fn) {
    var n = document.getElementById(id);
    if (n) n.addEventListener('click', fn);
  }

  function lineaPorId(p, id) {
    return p.lineas.filter(function (l) { return l.id === id; })[0];
  }

  function autoAlto(t) {
    t.style.height = 'auto';
    t.style.height = Math.min(160, Math.max(38, t.scrollHeight)) + 'px';
  }

  function enfocaUltima() {
    var filas = document.querySelectorAll('#cuerpo-lineas tr');
    if (!filas.length) return;
    var c = filas[filas.length - 1].querySelector('textarea, input[type=text]');
    if (c) c.focus();
  }

  function arrastrable(cuerpo, p) {
    var origen = null;
    cuerpo.addEventListener('dragstart', function (e) {
      var fila = e.target.closest('tr');
      if (!fila) return;
      origen = fila;
      fila.classList.add('arrastrando');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', fila.dataset.linea); } catch (x) {}
    });
    cuerpo.addEventListener('dragend', function () {
      if (origen) origen.classList.remove('arrastrando');
      cuerpo.querySelectorAll('.destino').forEach(function (f) { f.classList.remove('destino'); });
      origen = null;
    });
    cuerpo.addEventListener('dragover', function (e) {
      if (!origen) return;
      e.preventDefault();
      var fila = e.target.closest('tr');
      cuerpo.querySelectorAll('.destino').forEach(function (f) { f.classList.remove('destino'); });
      if (fila && fila !== origen) fila.classList.add('destino');
    });
    cuerpo.addEventListener('drop', function (e) {
      if (!origen) return;
      e.preventDefault();
      var fila = e.target.closest('tr');
      if (!fila || fila === origen) return;
      var desde = p.lineas.findIndex(function (l) { return l.id === origen.dataset.linea; });
      var hasta = p.lineas.findIndex(function (l) { return l.id === fila.dataset.linea; });
      if (desde < 0 || hasta < 0) return;
      var mov = p.lineas.splice(desde, 1)[0];
      p.lineas.splice(hasta, 0, mov);
      App.tocar(p);
      App.guardar();
      App.refrescar();
    });
  }

  /* --- Selector del banco de precios -------------------------------------- */

  function abreBanco(p) {
    var caja = document.createElement('div');
    var seleccion = {};

    function pinta(texto) {
      var lista = App.estado.partidas.filter(function (x) {
        if (!texto) return true;
        return U.contiene(x.descripcion, texto) || U.contiene(x.codigo, texto) || U.contiene(x.categoria, texto);
      });
      lista.sort(function (a, b) { return (b.usos || 0) - (a.usos || 0); });
      var filas = lista.map(function (x) {
        return '<tr data-par="' + x.id + '" class="fila-click">' +
          '<td style="width:34px" class="cen"><input type="checkbox" data-sel="' + x.id + '"' +
            (seleccion[x.id] ? ' checked' : '') + '></td>' +
          '<td>' + U.esc(x.descripcion) + '<div class="apagado">' +
            U.esc(x.categoria || '') + (x.codigo ? ' · ' + U.esc(x.codigo) : '') + '</div></td>' +
          '<td class="cen">' + U.esc(x.unidad) + '</td>' +
          '<td class="num fuerte">' + U.eur(x.precio) + '</td>' +
          '<td style="width:96px"><input type="number" step="0.001" data-cant="' + x.id +
            '" value="' + (seleccion[x.id] || 1) + '" style="padding:5px 8px"></td>' +
        '</tr>';
      }).join('');
      caja.querySelector('#banco-lista').innerHTML = lista.length
        ? '<div class="tabla-caja"><table class="t"><thead><tr><th></th><th>Partida</th><th class="cen">Ud.</th>' +
          '<th class="der">Precio</th><th>Cantidad</th></tr></thead><tbody>' + filas + '</tbody></table></div>'
        : UI.vacio('Sin resultados', 'Prueba con otra palabra o crea la partida en la sección Precios.');
    }

    caja.innerHTML = '<div class="buscador" style="margin-bottom:14px">' +
      '<span class="ic-b">' + UI.ic('lupa', 15) + '</span>' +
      '<input type="search" id="banco-buscar" placeholder="Buscar en el banco de precios"></div>' +
      '<div id="banco-lista"></div>';

    var m = UI.modal({
      titulo: 'Añadir del banco de precios',
      ancho: 'ancho',
      cuerpo: caja,
      botones: [
        { texto: 'Cancelar' },
        { texto: 'Añadir al presupuesto', clase: 'btn-pri', icono: 'mas', accion: function () {
          var ids = Object.keys(seleccion);
          if (!ids.length) { UI.aviso('No has marcado ninguna partida', 'err'); return false; }
          ids.forEach(function (id) {
            var x = App.partida(id);
            if (!x) return;
            p.lineas.push(Modelo.nuevaLinea({
              codigo: x.codigo, descripcion: x.descripcion,
              unidad: x.unidad, cantidad: seleccion[id], precio: x.precio
            }));
            x.usos = (x.usos || 0) + 1;
            App.tocar(x);
          });
          App.tocar(p);
          App.guardar();
          App.refrescar();
          UI.aviso(ids.length + (ids.length === 1 ? ' partida añadida' : ' partidas añadidas'), 'ok');
        } }
      ]
    });

    pinta('');
    caja.querySelector('#banco-buscar').addEventListener('input', U.debounce(function (e) {
      pinta(e.target.value);
    }, 180));
    caja.addEventListener('change', function (e) {
      if (e.target.dataset.sel) {
        var id = e.target.dataset.sel;
        if (e.target.checked) {
          var c = caja.querySelector('[data-cant="' + id + '"]');
          seleccion[id] = U.num(c ? c.value : 1) || 1;
        } else delete seleccion[id];
      }
      if (e.target.dataset.cant && seleccion[e.target.dataset.cant] !== undefined) {
        seleccion[e.target.dataset.cant] = U.num(e.target.value) || 1;
      }
    });
    caja.addEventListener('click', function (e) {
      var fila = e.target.closest('[data-par]');
      if (!fila || e.target.tagName === 'INPUT') return;
      var chk = fila.querySelector('[data-sel]');
      chk.checked = !chk.checked;
      chk.dispatchEvent(new Event('change', { bubbles: true }));
    });
    return m;
  }

  App.crearPresupuesto = crear;
  App.previsualizar = previsualizar;
})(window);
