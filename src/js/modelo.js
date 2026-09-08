/* =========================================================================
   modelo.js — reglas de negocio: cálculos, numeración y resúmenes
   Se expone en window.Modelo
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U;
  var Base = global.Base;

  /* --- Creación de entidades ------------------------------------------- */

  function nuevaLinea(datos) {
    datos = datos || {};
    return {
      id: U.uid('lin'),
      tipo: datos.tipo || 'partida',        // 'partida' | 'seccion'
      codigo: datos.codigo || '',
      descripcion: datos.descripcion || '',
      unidad: datos.unidad || 'ud',
      cantidad: datos.cantidad === undefined ? 1 : U.num(datos.cantidad),
      precio: U.num(datos.precio),
      descuento: U.num(datos.descuento)
    };
  }

  function nuevoPresupuesto(estado) {
    var a = estado.ajustes;
    return {
      id: U.uid('pre'),
      numero: siguienteNumero(estado),
      fecha: U.hoyISO(),
      validezDias: U.num(a.validezDias) || 15,
      clienteId: null,
      cliente: clienteVacio(),
      objeto: '',
      lineas: [],
      descuentoGlobal: 0,
      ivaPct: U.num(a.ivaPorDefecto),
      irpfPct: U.num(a.irpfPorDefecto),
      condiciones: (a.condiciones || []).slice(),
      notas: '',
      estado: 'borrador',
      fechaEnvio: null,
      fechaRespuesta: null,
      creado: new Date().toISOString(),
      modificado: new Date().toISOString()
    };
  }

  function clienteVacio() {
    return { nombre: '', nif: '', direccion: '', cp: '', ciudad: '', telefono: '', email: '' };
  }

  function nuevoCliente(datos) {
    var c = clienteVacio();
    c.id = U.uid('cli');
    c.notas = '';
    c.creado = new Date().toISOString();
    c.modificado = c.creado;
    if (datos) for (var k in datos) if (datos.hasOwnProperty(k)) c[k] = datos[k];
    return c;
  }

  function nuevoGasto(datos) {
    datos = datos || {};
    var g = {
      id: U.uid('gas'),
      fecha: datos.fecha || U.hoyISO(),
      proveedor: datos.proveedor || '',
      nif: datos.nif || '',
      concepto: datos.concepto || '',
      categoria: datos.categoria || 'materiales',
      numeroFactura: datos.numeroFactura || '',
      base: U.num(datos.base),
      ivaPct: datos.ivaPct === undefined ? 21 : U.num(datos.ivaPct),
      afectacion: datos.afectacion === undefined ? null : U.num(datos.afectacion),
      formaPago: datos.formaPago || 'tarjeta',
      obraId: datos.obraId || null,
      notas: datos.notas || '',
      creado: new Date().toISOString()
    };
    g.modificado = g.creado;
    return g;
  }

  /* --- Numeración ------------------------------------------------------ */

  function formateaNumero(ajustes, n, anio) {
    var d = Math.max(1, U.num(ajustes.numeracion.digitos) || 1);
    var texto = String(n);
    while (texto.length < d) texto = '0' + texto;
    return String(ajustes.numeracion.formato || '{n}/{aaaa}')
      .replace('{n}', texto)
      .replace('{aaaa}', String(anio))
      .replace('{aa}', String(anio).slice(-2));
  }

  function siguienteNumero(estado) {
    var a = estado.ajustes;
    var anioActual = new Date().getFullYear();
    if (a.numeracion.reinicioAnual && a.numeracion.anio !== anioActual) {
      a.numeracion.anio = anioActual;
      a.numeracion.siguiente = 1;
    }
    var n = Math.max(1, U.num(a.numeracion.siguiente) || 1);
    // Evita duplicados si el usuario ha editado números a mano
    var usados = {};
    (estado.presupuestos || []).forEach(function (p) { usados[p.numero] = true; });
    var candidato = formateaNumero(a, n, a.numeracion.anio);
    var vueltas = 0;
    while (usados[candidato] && vueltas < 5000) {
      n++; vueltas++;
      candidato = formateaNumero(a, n, a.numeracion.anio);
    }
    a.numeracion.siguiente = n;
    return candidato;
  }

  function consumeNumero(estado) {
    estado.ajustes.numeracion.siguiente = U.num(estado.ajustes.numeracion.siguiente) + 1;
  }

  /* --- Cálculo del presupuesto ----------------------------------------- */

  function importeLinea(l) {
    if (l.tipo === 'seccion') return 0;
    var bruto = U.num(l.cantidad) * U.num(l.precio);
    var desc = U.num(l.descuento);
    if (desc) bruto = bruto * (1 - desc / 100);
    return U.r2(bruto);
  }

  function totales(p) {
    var subtotal = 0;
    (p.lineas || []).forEach(function (l) { subtotal += importeLinea(l); });
    subtotal = U.r2(subtotal);

    var descGlobalPct = U.num(p.descuentoGlobal);
    var descGlobal = U.r2(subtotal * descGlobalPct / 100);
    var base = U.r2(subtotal - descGlobal);

    var ivaPct = U.num(p.ivaPct);
    var irpfPct = U.num(p.irpfPct);
    var iva = U.r2(base * ivaPct / 100);
    var irpf = U.r2(base * irpfPct / 100);
    var total = U.r2(base + iva - irpf);

    return {
      subtotal: subtotal,
      descuentoPct: descGlobalPct,
      descuento: descGlobal,
      base: base,
      ivaPct: ivaPct, iva: iva,
      irpfPct: irpfPct, irpf: irpf,
      total: total,
      numLineas: (p.lineas || []).filter(function (l) { return l.tipo !== 'seccion'; }).length
    };
  }

  function caducidad(p) {
    return U.sumaDias(p.fecha, U.num(p.validezDias) || 0);
  }

  // Estado efectivo: un presupuesto enviado que pasa su validez se marca caducado
  function estadoEfectivo(p, hoy) {
    hoy = hoy || U.hoyISO();
    if (p.estado === 'enviado') {
      var fin = caducidad(p);
      if (fin && U.diasEntre(fin, hoy) > 0) return 'caducado';
    }
    return p.estado;
  }

  function diasParaCaducar(p, hoy) {
    return U.diasEntre(hoy || U.hoyISO(), caducidad(p));
  }

  /* --- Cálculo del gasto ------------------------------------------------ */

  function totalesGasto(g) {
    var cat = Base.categoria(g.categoria);
    var base = U.r2(U.num(g.base));
    var ivaPct = U.num(g.ivaPct);
    var iva = U.r2(base * ivaPct / 100);
    var total = U.r2(base + iva);

    var afectacion = (g.afectacion === null || g.afectacion === undefined)
      ? U.num(cat.irpfDeducible) : U.num(g.afectacion);
    var pctIva = U.num(cat.ivaDeducible);
    // Si el usuario reduce la afectación, el IVA deducible no puede superarla
    if (afectacion < pctIva) pctIva = afectacion;

    return {
      base: base,
      ivaPct: ivaPct,
      iva: iva,
      total: total,
      afectacion: afectacion,
      gastoDeducible: U.r2(base * afectacion / 100),
      ivaDeduciblePct: pctIva,
      ivaDeducible: U.r2(iva * pctIva / 100)
    };
  }

  /* --- Resumen fiscal --------------------------------------------------- */

  function rangoTrimestre(anio, t) {
    var mesIni = (t - 1) * 3;
    var ini = new Date(anio, mesIni, 1);
    var fin = new Date(anio, mesIni + 3, 0);
    return { desde: U.isoDe(ini), hasta: U.isoDe(fin) };
  }

  function enRango(iso, desde, hasta) {
    if (!iso) return false;
    return iso >= desde && iso <= hasta;
  }

  // Los ingresos se toman de los presupuestos aceptados, por su fecha de
  // aceptación (o de emisión si no consta). Es una estimación de trabajo
  // contratado, no un libro de facturas emitidas.
  function resumen(estado, anio, t) {
    var r = rangoTrimestre(anio, t);
    var ing = { base: 0, iva: 0, irpf: 0, total: 0, n: 0 };
    var gas = { base: 0, iva: 0, ivaDeducible: 0, deducible: 0, total: 0, n: 0 };
    var porCategoria = {};

    (estado.presupuestos || []).forEach(function (p) {
      if (p.estado !== 'aceptado') return;
      var fecha = p.fechaRespuesta || p.fecha;
      if (!enRango(fecha, r.desde, r.hasta)) return;
      var tt = totales(p);
      ing.base += tt.base; ing.iva += tt.iva; ing.irpf += tt.irpf; ing.total += tt.total; ing.n++;
    });

    (estado.gastos || []).forEach(function (g) {
      if (!enRango(g.fecha, r.desde, r.hasta)) return;
      var tg = totalesGasto(g);
      gas.base += tg.base; gas.iva += tg.iva;
      gas.ivaDeducible += tg.ivaDeducible;
      gas.deducible += tg.gastoDeducible;
      gas.total += tg.total; gas.n++;
      var cat = Base.categoria(g.categoria);
      if (!porCategoria[cat.id]) porCategoria[cat.id] = { nombre: cat.nombre, grupo: cat.grupo, base: 0, deducible: 0, n: 0 };
      porCategoria[cat.id].base += tg.base;
      porCategoria[cat.id].deducible += tg.gastoDeducible;
      porCategoria[cat.id].n++;
    });

    ['base', 'iva', 'irpf', 'total'].forEach(function (k) { ing[k] = U.r2(ing[k]); });
    ['base', 'iva', 'ivaDeducible', 'deducible', 'total'].forEach(function (k) { gas[k] = U.r2(gas[k]); });
    Object.keys(porCategoria).forEach(function (k) {
      porCategoria[k].base = U.r2(porCategoria[k].base);
      porCategoria[k].deducible = U.r2(porCategoria[k].deducible);
    });

    var ivaLiquidar = U.r2(ing.iva - gas.ivaDeducible);
    var rendimiento = U.r2(ing.base - gas.deducible);

    return {
      anio: anio, trimestre: t, desde: r.desde, hasta: r.hasta,
      ingresos: ing,
      gastos: gas,
      porCategoria: porCategoria,
      ivaLiquidar: ivaLiquidar,
      rendimiento: rendimiento,
      margen: ing.base > 0 ? U.r2(rendimiento / ing.base * 100) : 0
    };
  }

  // Acumulado del año hasta el trimestre indicado, para el pago fraccionado
  function resumenAnual(estado, anio, hastaT) {
    var acumulado = { base: 0, deducible: 0, retenido: 0, ivaLiquidar: 0 };
    var trimestres = [];
    for (var t = 1; t <= 4; t++) {
      var s = resumen(estado, anio, t);
      trimestres.push(s);
      if (t <= hastaT) {
        acumulado.base += s.ingresos.base;
        acumulado.deducible += s.gastos.deducible;
        acumulado.retenido += s.ingresos.irpf;
        acumulado.ivaLiquidar += s.ivaLiquidar;
      }
    }
    acumulado.base = U.r2(acumulado.base);
    acumulado.deducible = U.r2(acumulado.deducible);
    acumulado.retenido = U.r2(acumulado.retenido);
    acumulado.ivaLiquidar = U.r2(acumulado.ivaLiquidar);
    acumulado.rendimiento = U.r2(acumulado.base - acumulado.deducible);
    // Pago fraccionado del modelo 130: 20 % del rendimiento acumulado menos
    // lo ya ingresado en trimestres anteriores y menos las retenciones.
    var bruto = U.r2(Math.max(0, acumulado.rendimiento) * 0.20);
    var previos = 0;
    for (var i = 0; i < hastaT - 1; i++) {
      var acc = 0, ded = 0, ret = 0;
      for (var j = 0; j <= i; j++) {
        acc += trimestres[j].ingresos.base;
        ded += trimestres[j].gastos.deducible;
        ret += trimestres[j].ingresos.irpf;
      }
      previos += Math.max(0, U.r2(Math.max(0, U.r2(acc - ded)) * 0.20 - ret));
    }
    acumulado.pago130 = U.r2(Math.max(0, bruto - acumulado.retenido - U.r2(previos)));
    acumulado.pagos130Previos = U.r2(previos);
    return { trimestres: trimestres, acumulado: acumulado };
  }

  /* --- Métricas del panel ----------------------------------------------- */

  function metricas(estado) {
    var hoy = U.hoyISO();
    var d = U.desdeISO(hoy);
    var anio = d.getFullYear();
    var t = Math.floor(d.getMonth() / 3) + 1;
    var r = rangoTrimestre(anio, t);
    var m = {
      totalPresupuestos: 0, borradores: 0, pendientes: 0, aceptados: 0,
      rechazados: 0, caducados: 0,
      importePendiente: 0, importeAceptadoTrimestre: 0, importeAceptadoAnio: 0,
      baseAceptadaTrimestre: 0,
      tasaAceptacion: 0, ticketMedio: 0,
      porCaducar: [], anio: anio, trimestre: t
    };
    var sumaAceptados = 0, decididos = 0;

    (estado.presupuestos || []).forEach(function (p) {
      var e = estadoEfectivo(p, hoy);
      var tt = totales(p);
      m.totalPresupuestos++;
      if (e === 'borrador') m.borradores++;
      if (e === 'enviado') {
        m.pendientes++;
        m.importePendiente += tt.total;
        var dias = diasParaCaducar(p, hoy);
        if (dias >= 0 && dias <= 5) m.porCaducar.push({ p: p, dias: dias, total: tt.total });
      }
      if (e === 'caducado') m.caducados++;
      if (e === 'aceptado') {
        m.aceptados++; decididos++;
        sumaAceptados += tt.base;
        var f = p.fechaRespuesta || p.fecha;
        if (enRango(f, r.desde, r.hasta)) {
          m.importeAceptadoTrimestre += tt.total;
          m.baseAceptadaTrimestre += tt.base;
        }
        if (f && f.slice(0, 4) === String(anio)) m.importeAceptadoAnio += tt.total;
      }
      if (e === 'rechazado') { m.rechazados++; decididos++; }
    });

    m.importePendiente = U.r2(m.importePendiente);
    m.importeAceptadoTrimestre = U.r2(m.importeAceptadoTrimestre);
    m.baseAceptadaTrimestre = U.r2(m.baseAceptadaTrimestre);
    m.importeAceptadoAnio = U.r2(m.importeAceptadoAnio);
    m.tasaAceptacion = decididos ? Math.round(m.aceptados / decididos * 100) : 0;
    m.ticketMedio = m.aceptados ? U.r2(sumaAceptados / m.aceptados) : 0;
    m.porCaducar.sort(function (a, b) { return a.dias - b.dias; });

    var gastoTrimestre = 0;
    (estado.gastos || []).forEach(function (g) {
      if (enRango(g.fecha, r.desde, r.hasta)) gastoTrimestre += totalesGasto(g).gastoDeducible;
    });
    m.gastoTrimestre = U.r2(gastoTrimestre);
    m.resultadoTrimestre = U.r2(m.baseAceptadaTrimestre - gastoTrimestre);
    return m;
  }

  global.Modelo = {
    nuevaLinea: nuevaLinea,
    nuevoPresupuesto: nuevoPresupuesto,
    nuevoCliente: nuevoCliente,
    nuevoGasto: nuevoGasto,
    clienteVacio: clienteVacio,
    formateaNumero: formateaNumero,
    siguienteNumero: siguienteNumero,
    consumeNumero: consumeNumero,
    importeLinea: importeLinea,
    totales: totales,
    caducidad: caducidad,
    estadoEfectivo: estadoEfectivo,
    diasParaCaducar: diasParaCaducar,
    totalesGasto: totalesGasto,
    rangoTrimestre: rangoTrimestre,
    resumen: resumen,
    resumenAnual: resumenAnual,
    metricas: metricas
  };
})(window);
