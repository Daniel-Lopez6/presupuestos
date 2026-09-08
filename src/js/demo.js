/* =========================================================================
   demo.js — datos de ejemplo de un año de trabajo

   Sirve para ver la aplicación llena antes de usarla en serio: clientes,
   presupuestos repartidos por el año y el libro de gastos con sus facturas.
   Todo es inventado. Se carga y se borra desde Ajustes con un botón.
   ========================================================================= */
(function (global) {
  'use strict';

  var U = global.U, Modelo = global.Modelo, Base = global.Base;

  // Números siempre iguales: así el ejemplo es el mismo en el móvil y en el
  // ordenador, y las pruebas pueden comprobar cifras concretas.
  function dado(semilla) {
    var s = semilla;
    return function (a, b) {
      s = (s * 1103515245 + 12345) % 2147483648;
      return a + (s / 2147483648) * (b - a);
    };
  }

  var CLIENTES = [
    { nombre: 'María Ferreiro Lago', nif: '33445566R', direccion: 'Rúa do Vilar, 24, 3º B', cp: '15705', ciudad: 'Santiago de Compostela', telefono: '699 11 22 33', email: 'mferreiro@example.com' },
    { nombre: 'Comunidad de Propietarios Avenida del Puerto 12', nif: 'H15987654', direccion: 'Avenida del Puerto, 12', cp: '15001', ciudad: 'A Coruña', telefono: '981 22 33 44', email: 'admin@example.com', notas: 'Contacto con el administrador de fincas. Pagan por transferencia a 30 días.' },
    { nombre: 'Rubén Castelo Pardiñas', nif: '44556677L', direccion: 'Camiño Real, 8', cp: '15142', ciudad: 'Arteixo', telefono: '600 44 55 66', email: 'rcastelo@example.com' },
    { nombre: 'Panadería O Forno, S.L.', nif: 'B15112238', direccion: 'Praza de Abastos, 3, bajo', cp: '15300', ciudad: 'Betanzos', telefono: '981 77 88 99', email: 'oforno@example.com', notas: 'Local comercial. Solo pueden trabajar por la tarde, después de cerrar.' },
    { nombre: 'Ana Belén Souto Rey', nif: '55667788Z', direccion: 'Rúa Nova, 47, 1º', cp: '15960', ciudad: 'Ribeira', telefono: '655 33 44 55', email: 'absouto@example.com' },
    { nombre: 'Xoán Miguez Arca', nif: '66778899D', direccion: 'Lugar de Vilar, 21', cp: '15898', ciudad: 'Teo', telefono: '677 88 99 00', email: 'xmiguez@example.com', notas: 'Casa de aldea. Reforma por fases, una habitación cada verano.' },
    { nombre: 'Inmobiliaria Cardeñas, S.L.', nif: 'B15445562', direccion: 'Rúa Real, 90, entresuelo', cp: '15003', ciudad: 'A Coruña', telefono: '981 44 55 66', email: 'obras@example.com', notas: 'Pisos para alquilar. Piden presupuesto cerrado y factura a nombre de la sociedad.' },
    { nombre: 'Lucía Vázquez Otero', nif: '77889900D', direccion: 'Avenida de Finisterre, 130, 5º C', cp: '15010', ciudad: 'A Coruña', telefono: '622 99 00 11', email: 'lvazquez@example.com' },
    { nombre: 'Bar Río Tambre', nif: '88990011K', direccion: 'Estrada de Noia, 5', cp: '15220', ciudad: 'Bertamiráns', telefono: '981 88 00 22', email: 'bartambre@example.com' }
  ];

  // Cada trabajo es una lista de partidas con su medición aproximada.
  var TRABAJOS = [
    { objeto: 'Reforma integral de baño en vivienda',
      lineas: [
        ['S', 'Demolición y preparación'],
        ['DE-01', 'Demolición de alicatado y solado de baño, con retirada de escombro', 'm²', 14, 18],
        ['DE-03', 'Retirada de sanitarios y mobiliario existente', 'ud', 1, 120],
        ['DE-02', 'Transporte de escombro a vertedero autorizado, incluida tasa', 'saco', 6, 38],
        ['S', 'Instalaciones'],
        ['FO-01', 'Renovación de la instalación de fontanería del baño en multicapa', 'ud', 1, 620],
        ['EL-01', 'Renovación de puntos de luz y enchufes del baño, con mecanismos', 'ud', 6, 58],
        ['S', 'Albañilería y acabados'],
        ['AL-01', 'Alicatado de azulejo cerámico con adhesivo cementoso, sin incluir material', 'm²', 32, 26],
        ['AL-02', 'Solado de baldosa cerámica sobre mortero de agarre', 'm²', 6, 28],
        ['FA-01', 'Montaje de plato de ducha y mampara', 'ud', 1, 340],
        ['PI-02', 'Pintura de techo en blanco, dos manos', 'm²', 6, 9.2]
      ] },
    { objeto: 'Pintura completa de vivienda',
      lineas: [
        ['S', 'Preparación'],
        ['PR-01', 'Protección de suelos y mobiliario con plástico y cinta', 'm²', 85, 2.4],
        ['PR-02', 'Reparación de grietas y desconchados, con lijado y sellado', 'm²', 18, 7.5],
        ['S', 'Pintura'],
        ['PI-01', 'Pintura plástica lisa en paredes, dos manos, incluida preparación de superficie', 'm²', 210, 8.5],
        ['PI-02', 'Pintura de techo en blanco, dos manos', 'm²', 85, 9.2],
        ['PI-03', 'Esmalte sobre carpintería metálica o de madera', 'm²', 26, 14]
      ] },
    { objeto: 'Reforma de cocina',
      lineas: [
        ['S', 'Demolición'],
        ['DE-01', 'Demolición de alicatado y solado de baño, con retirada de escombro', 'm²', 22, 18],
        ['DE-02', 'Transporte de escombro a vertedero autorizado, incluida tasa', 'saco', 9, 38],
        ['S', 'Instalaciones'],
        ['FO-02', 'Nueva toma de agua y desagüe para electrodomésticos', 'ud', 3, 145],
        ['EL-02', 'Cuadro eléctrico nuevo con diferencial y automáticos', 'ud', 1, 480],
        ['EL-01', 'Renovación de puntos de luz y enchufes del baño, con mecanismos', 'ud', 12, 58],
        ['S', 'Albañilería'],
        ['AL-01', 'Alicatado de azulejo cerámico con adhesivo cementoso, sin incluir material', 'm²', 28, 26],
        ['AL-02', 'Solado de baldosa cerámica sobre mortero de agarre', 'm²', 16, 28],
        ['AL-04', 'Formación de tabique de pladur con aislamiento', 'm²', 9, 46],
        ['S', 'Acabados'],
        ['PI-01', 'Pintura plástica lisa en paredes, dos manos, incluida preparación de superficie', 'm²', 34, 8.5],
        ['MO-03', 'Jornada completa de oficial', 'jornada', 4, 180]
      ] },
    { objeto: 'Cambio de ventanas y ajuste de contras',
      lineas: [
        ['CA-01', 'Desmontaje de ventana existente y retirada', 'ud', 7, 65],
        ['CA-02', 'Colocación de ventana de PVC con rotura de puente térmico', 'ud', 7, 210],
        ['AL-05', 'Remate de jambas y vierteaguas con mortero', 'ml', 26, 22],
        ['PI-01', 'Pintura plástica lisa en paredes, dos manos, incluida preparación de superficie', 'm²', 24, 8.5]
      ] },
    { objeto: 'Impermeabilización de terraza',
      lineas: [
        ['DE-04', 'Levantado de solado de terraza y limpieza de soporte', 'm²', 38, 21],
        ['IM-01', 'Impermeabilización con lámina de caucho y refuerzo de encuentros', 'm²', 38, 34],
        ['AL-02', 'Solado de baldosa cerámica sobre mortero de agarre', 'm²', 38, 28],
        ['AL-06', 'Rodapié perimetral de gres', 'ml', 24, 14],
        ['DE-02', 'Transporte de escombro a vertedero autorizado, incluida tasa', 'saco', 8, 38]
      ] },
    { objeto: 'Adecuación de local comercial',
      lineas: [
        ['S', 'Obra'],
        ['AL-04', 'Formación de tabique de pladur con aislamiento', 'm²', 42, 46],
        ['AL-07', 'Falso techo registrable de placa mineral', 'm²', 55, 32],
        ['AL-02', 'Solado de baldosa cerámica sobre mortero de agarre', 'm²', 55, 28],
        ['S', 'Instalaciones'],
        ['EL-02', 'Cuadro eléctrico nuevo con diferencial y automáticos', 'ud', 1, 480],
        ['EL-03', 'Instalación de luminarias led empotradas', 'ud', 18, 74],
        ['FO-01', 'Renovación de la instalación de fontanería del baño en multicapa', 'ud', 1, 620],
        ['S', 'Acabados'],
        ['PI-01', 'Pintura plástica lisa en paredes, dos manos, incluida preparación de superficie', 'm²', 130, 8.5],
        ['MO-01', 'Mano de obra oficial de 1ª', 'h', 60, 24]
      ] },
    { objeto: 'Sustitución de bajante y arreglo de humedades',
      lineas: [
        ['FO-03', 'Sustitución de bajante de PVC en patio interior', 'ml', 12, 68],
        ['AL-08', 'Picado de zona con humedad y saneado del soporte', 'm²', 9, 24],
        ['AL-09', 'Enfoscado maestreado con mortero hidrófugo', 'm²', 9, 31],
        ['PI-01', 'Pintura plástica lisa en paredes, dos manos, incluida preparación de superficie', 'm²', 16, 8.5]
      ] },
    { objeto: 'Reforma de habitación y armario empotrado',
      lineas: [
        ['AL-04', 'Formación de tabique de pladur con aislamiento', 'm²', 12, 46],
        ['CA-03', 'Armario empotrado con puertas correderas, montado', 'ml', 3, 420],
        ['AL-10', 'Solado de tarima laminada con manta aislante', 'm²', 16, 27],
        ['PI-01', 'Pintura plástica lisa en paredes, dos manos, incluida preparación de superficie', 'm²', 42, 8.5],
        ['PI-02', 'Pintura de techo en blanco, dos manos', 'm²', 16, 9.2]
      ] }
  ];

  // Los gastos fijos que se repiten todos los meses.
  var MENSUALES = [
    { categoria: 'cuota_reta', proveedor: 'Tesorería General de la Seguridad Social', concepto: 'Cuota de autónomos', base: 320, ivaPct: 0, formaPago: 'domiciliado' },
    { categoria: 'asesoria', proveedor: 'Asesoría Ponte, S.L.', concepto: 'Cuota mensual de gestoría', base: 75, ivaPct: 21, formaPago: 'domiciliado' },
    { categoria: 'telefonia', proveedor: 'Operadora de telefonía', concepto: 'Línea de móvil y fibra del negocio', base: 46.28, ivaPct: 21, formaPago: 'domiciliado' },
    { categoria: 'bancarios', proveedor: 'Banco', concepto: 'Comisión de mantenimiento de la cuenta', base: 8, ivaPct: 0, formaPago: 'domiciliado' }
  ];

  var PROVEEDORES_MATERIAL = [
    { proveedor: 'Almacenes Vilaboa, S.L.', nif: 'B15334451', concepto: 'Material de obra del mes' },
    { proveedor: 'Cerámicas do Norte', nif: 'B15667785', concepto: 'Azulejo y adhesivo cementoso' },
    { proveedor: 'Suministros Eléctricos Barcia', nif: 'B15221104', concepto: 'Mecanismos y cable' },
    { proveedor: 'Pinturas Ourolar', nif: 'B15889900', concepto: 'Pintura plástica y esmalte' }
  ];

  function restaDias(isoFecha, dias) {
    var d = U.desdeISO(isoFecha);
    d.setDate(d.getDate() - dias);
    return U.isoDe(d);
  }

  function iso(anio, mes, dia) {
    return anio + '-' + (mes < 10 ? '0' : '') + mes + '-' + (dia < 10 ? '0' : '') + dia;
  }

  /* --- Generación -------------------------------------------------------- */

  function generar(estado, hoyISO) {
    var hoy = hoyISO || U.hoyISO();
    var anio = Number(hoy.slice(0, 4));
    var mesActual = Number(hoy.slice(5, 7));
    var az = dado(20260101);

    // La numeración continúa donde la tenga el usuario y no repite ninguna
    // que ya exista, para que cargar el ejemplo no le pise sus presupuestos.
    var usados = {};
    (estado.presupuestos || []).forEach(function (p) { usados[p.numero] = true; });
    var contador = Math.max(1, U.num(estado.ajustes.numeracion.siguiente) || 1);
    function numeroLibre() {
      var cand = Modelo.formateaNumero(estado.ajustes, contador, anio);
      while (usados[cand]) { contador++; cand = Modelo.formateaNumero(estado.ajustes, contador, anio); }
      usados[cand] = true; contador++;
      return cand;
    }

    var clientes = CLIENTES.map(function (c, i) {
      var cl = Modelo.nuevoCliente(c);
      cl.id = 'cli_demo_' + (i + 1);
      return cl;
    });

    // Un presupuesto por quincena desde enero, parando en el mes de hoy.
    var presupuestos = [];
    var n = 0;
    for (var mes = 1; mes <= mesActual; mes++) {
      var cuantos = 2;
      for (var k = 0; k < cuantos; k++) {
        var trabajo = TRABAJOS[n % TRABAJOS.length];
        var cliente = clientes[(n * 4 + 2) % clientes.length];
        var dia = k === 0 ? 3 + Math.round(az(0, 6)) : 16 + Math.round(az(0, 7));
        if (mes === mesActual) {
          // En el mes de hoy no puede haber presupuestos con fecha futura
          var tope = Number(hoy.slice(8, 10));
          if (tope < 4) break;
          dia = Math.min(dia, tope - (k === 0 ? 3 : 1));
        }
        var esElUltimo = (mes === mesActual && k === cuantos - 1);
        var p = presupuestoDemo(estado, trabajo, cliente, anio, mes, dia, n, az, mesActual, esElUltimo);
        p.numero = numeroLibre();
        presupuestos.push(p);
        n++;
      }
    }

    // Que quede al menos uno esperando respuesta y dentro de plazo: si no,
    // el panel enseña un cero donde debería verse el trabajo pendiente.
    var recientes = presupuestos.filter(function (p) {
      return p.estado !== 'borrador' && p.fecha >= restaDias(hoy, 12);
    });
    if (recientes.length) {
      var elegido = recientes[recientes.length - 1];
      elegido.estado = 'enviado';
      elegido.fechaEnvio = elegido.fecha;
      elegido.fechaRespuesta = null;
      elegido.notas = 'Enviado por correo. Quedó en contestar esta semana.';
    }

    estado.ajustes.numeracion.siguiente = contador;

    var gastos = generaGastos(anio, mesActual, hoy, az);

    return { clientes: clientes, presupuestos: presupuestos, gastos: gastos };
  }

  function presupuestoDemo(estado, trabajo, cliente, anio, mes, dia, n, az, mesHoy, esElUltimo) {
    var p = Modelo.nuevoPresupuesto(estado);
    p.id = 'pre_demo_' + (n + 1);
    p.fecha = iso(anio, mes, dia);
    p.clienteId = cliente.id;
    p.cliente = {
      nombre: cliente.nombre, nif: cliente.nif, direccion: cliente.direccion,
      cp: cliente.cp, ciudad: cliente.ciudad, telefono: cliente.telefono, email: cliente.email
    };
    p.objeto = trabajo.objeto;
    p.lineas = trabajo.lineas.map(function (l) {
      if (l[0] === 'S') return Modelo.nuevaLinea({ tipo: 'seccion', descripcion: l[1] });
      // Se mueve un poco la medición para que no salgan dos iguales.
      var cantidad = U.r2(l[3] * (0.9 + az(0, 0.2)));
      return Modelo.nuevaLinea({ codigo: l[0], descripcion: l[1], unidad: l[2], cantidad: cantidad, precio: l[4] });
    });
    p.lineas.forEach(function (l, i) { l.id = 'lin_demo_' + (n + 1) + '_' + i; });

    // El 10 % reducido pide vivienda de un particular o de una comunidad de
    // vecinos. Un local de negocio va al 21 %, y así se ve la mezcla.
    var esNegocio = /S\.L\.|Bar /.test(cliente.nombre);
    p.ivaPct = esNegocio ? 21 : 10;
    p.irpfPct = 0;
    if (n % 5 === 3) p.descuentoGlobal = 5;

    // Estados: la mayoría aceptados, alguno enviado sin respuesta, alguno
    // rechazado y alguno caducado. Así el panel enseña de todo.
    var CICLO = ['aceptado', 'aceptado', 'enviado', 'aceptado', 'aceptado',
                 'rechazado', 'aceptado', 'caducado', 'aceptado'];
    var estadoP = CICLO[n % CICLO.length];
    var envio = iso(anio, mes, Math.min(28, dia + 1));
    var fechaRespuesta = iso(anio, mes, Math.min(28, dia + 6));
    // Un presupuesto de hace cuatro días no puede estar caducado todavía:
    // solo caduca lo que se envió hace más de un par de meses.
    if (estadoP === 'caducado' && mes > mesHoy - 2) estadoP = 'enviado';
    // Y el último de todos se queda a medias, como pasa en la vida real.
    if (esElUltimo) estadoP = 'borrador';
    p.estado = estadoP;
    if (estadoP !== 'borrador') p.fechaEnvio = envio;
    if (estadoP === 'aceptado' || estadoP === 'rechazado') p.fechaRespuesta = fechaRespuesta;
    if (estadoP === 'rechazado') p.notas = 'Le pareció caro y lo deja para el año que viene.';
    if (esNegocio && estadoP === 'aceptado') p.notas = 'Facturar a nombre de la sociedad.';
    p.creado = p.fecha + 'T09:00:00.000Z';
    p.modificado = (p.fechaRespuesta || p.fecha) + 'T18:00:00.000Z';
    return p;
  }

  function generaGastos(anio, mesActual, hoy, az) {
    var gastos = [];
    var c = 0;
    function mete(datos) {
      if (datos.fecha > hoy) return;
      var g = Modelo.nuevoGasto(datos);
      g.id = 'gas_demo_' + (++c);
      g.creado = datos.fecha + 'T12:00:00.000Z';
      g.modificado = g.creado;
      gastos.push(g);
    }

    for (var mes = 1; mes <= mesActual; mes++) {
      MENSUALES.forEach(function (m, i) {
        mete({
          fecha: iso(anio, mes, 1 + i), proveedor: m.proveedor, concepto: m.concepto,
          categoria: m.categoria, base: m.base, ivaPct: m.ivaPct, formaPago: m.formaPago,
          numeroFactura: m.categoria === 'cuota_reta' ? '' : 'F' + anio + '-' + mes + '-' + (i + 1)
        });
      });

      // Material: dos compras al mes en almacenes distintos.
      for (var j = 0; j < 2; j++) {
        var prov = PROVEEDORES_MATERIAL[(mes + j) % PROVEEDORES_MATERIAL.length];
        mete({
          fecha: iso(anio, mes, j === 0 ? 8 : 21), proveedor: prov.proveedor, nif: prov.nif,
          concepto: prov.concepto, categoria: 'materiales',
          base: U.r2(az(380, 1450)), ivaPct: 21, formaPago: 'transferencia',
          numeroFactura: 'A/' + anio + (mes < 10 ? '0' : '') + mes + (j === 0 ? '14' : '37')
        });
      }

      // Combustible de la furgoneta, dos repostajes.
      for (var f = 0; f < 2; f++) {
        mete({
          fecha: iso(anio, mes, f === 0 ? 6 : 20), proveedor: 'Estación de servicio',
          concepto: 'Gasóleo de la furgoneta', categoria: 'furgoneta_comb',
          base: U.r2(az(58, 96)), ivaPct: 21, formaPago: 'tarjeta'
        });
      }

      // Vertedero, cuando hay demoliciones.
      if (mes % 2 === 1) {
        mete({
          fecha: iso(anio, mes, 12), proveedor: 'Planta de tratamiento de residuos',
          concepto: 'Descarga de escombro de obra', categoria: 'residuos',
          base: U.r2(az(70, 190)), ivaPct: 21, formaPago: 'tarjeta'
        });
      }

      // Alquiler de maquinaria en los meses de obra grande.
      if (mes % 3 === 0) {
        mete({
          fecha: iso(anio, mes, 14), proveedor: 'Alquileres Ferro', nif: 'B15778897',
          concepto: 'Alquiler de andamio y martillo eléctrico', categoria: 'alquiler_maq',
          base: U.r2(az(180, 420)), ivaPct: 21, formaPago: 'transferencia',
          numeroFactura: 'ALQ-' + anio + '-' + (100 + mes)
        });
      }

      // Alguna subcontrata: electricista y fontanero con boletín.
      if (mes % 2 === 0) {
        mete({
          fecha: iso(anio, mes, 24), proveedor: 'Instalaciones Rego, S.L.', nif: 'B15990013',
          concepto: 'Instalación eléctrica y boletín', categoria: 'subcontratas',
          base: U.r2(az(420, 1100)), ivaPct: 21, formaPago: 'transferencia',
          numeroFactura: 'IR-' + anio + '-' + (200 + mes)
        });
      }

      // Dietas de los días que le toca comer fuera del municipio.
      mete({
        fecha: iso(anio, mes, 11), proveedor: 'Restaurante', concepto: 'Comida de trabajo fuera del municipio',
        categoria: 'dietas', base: 22, ivaPct: 10, formaPago: 'tarjeta',
        notas: 'Obra en Betanzos. Pagado con tarjeta, como pide Hacienda.'
      });
    }

    // Gastos sueltos del año.
    mete({ fecha: iso(anio, 1, 15), proveedor: 'Correduría de seguros', concepto: 'Seguro de responsabilidad civil, anual',
           categoria: 'seguros', base: 385, ivaPct: 0, formaPago: 'domiciliado', numeroFactura: 'RC-' + anio });
    mete({ fecha: iso(anio, 2, 9), proveedor: 'Suministros de protección laboral', concepto: 'Botas, guantes y ropa de trabajo con anagrama',
           categoria: 'epi', base: 214.5, ivaPct: 21, formaPago: 'tarjeta', numeroFactura: 'EPI-' + anio + '-08' });
    mete({ fecha: iso(anio, 3, 4), proveedor: 'Taller mecánico', concepto: 'Revisión y neumáticos de la furgoneta',
           categoria: 'furgoneta_mant', base: 468, ivaPct: 21, formaPago: 'tarjeta', numeroFactura: 'TM-' + anio + '-141' });
    mete({ fecha: iso(anio, 3, 27), proveedor: 'Herramientas Miño', concepto: 'Rozadora y juego de brocas',
           categoria: 'herramienta', base: 289, ivaPct: 21, formaPago: 'tarjeta', numeroFactura: 'HM-' + anio + '-77',
           notas: 'Menos de 300 €, así que va entero al gasto del año.' });
    mete({ fecha: iso(anio, 4, 18), proveedor: 'Imprenta', concepto: 'Rotulación de la furgoneta y tarjetas',
           categoria: 'publicidad', base: 340, ivaPct: 21, formaPago: 'transferencia', numeroFactura: 'IMP-' + anio + '-52' });
    mete({ fecha: iso(anio, 5, 6), proveedor: 'Ayuntamiento', concepto: 'Tasa de licencia de obra y ocupación de vía',
           categoria: 'tributos', base: 96.4, ivaPct: 0, formaPago: 'transferencia' });
    mete({ fecha: iso(anio, 5, 30), proveedor: 'Herramientas Miño', concepto: 'Martillo demoledor',
           categoria: 'amortizacion', base: 148, ivaPct: 0, formaPago: 'transferencia',
           notas: 'Cuota anual de amortización del martillo comprado el año pasado por 890 €.' });
    mete({ fecha: iso(anio, 6, 12), proveedor: 'Centro de formación', concepto: 'Curso de prevención de riesgos, 20 horas',
           categoria: 'formacion', base: 180, ivaPct: 0, formaPago: 'transferencia', numeroFactura: 'CF-' + anio + '-31' });
    mete({ fecha: iso(anio, 7, 3), proveedor: 'Servicio de copia de seguridad y software', concepto: 'Programa de gestión y almacenamiento en la nube',
           categoria: 'software', base: 119, ivaPct: 21, formaPago: 'tarjeta', numeroFactura: 'SW-' + anio + '-902' });
    mete({ fecha: iso(anio, 8, 8), proveedor: 'Compañía eléctrica', concepto: 'Luz de casa, con el despacho declarado en el 036',
           categoria: 'suministros_casa', base: 88.4, ivaPct: 21, formaPago: 'domiciliado',
           afectacion: 6, ivaAfectacion: 20,
           notas: 'El despacho ocupa el 20 % de la casa: 6 % en IRPF (el 30 % de 20) y 20 % del IVA.' });

    gastos.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    return gastos;
  }

  global.Demo = { generar: generar };

})(window);
