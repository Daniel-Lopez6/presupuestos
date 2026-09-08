/* =========================================================================
   datos-base.js — valores por defecto, catálogos y textos fijos
   Se expone en window.Base
   ========================================================================= */
(function (global) {
  'use strict';

  var LOGO_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 148" width="320" height="148" role="img" aria-label="Logotipo">' +
      '<g fill="none" stroke="#B08D57" stroke-width="2.6" stroke-linecap="round">' +
        '<path d="M120.53 66.36 A42 42 0 1 1 199.47 66.36"/>' +
      '</g>' +
      '<text x="160" y="75" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" ' +
        'font-size="66" fill="#16233A" letter-spacing="-1">JA</text>' +
      '<text x="160" y="112" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" ' +
        'font-size="20.5" fill="#16233A" letter-spacing="6" dx="-3">JOSE ANGEL</text>' +
      '<text x="160" y="133" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" ' +
        'font-size="12.5" fill="#16233A" letter-spacing="4.6" dx="-2.3">DOMINGUEZ RAMOS</text>' +
    '</svg>';

  var CONDICIONES = [
    'Validez del presupuesto: 15 días desde la fecha de emisión.',
    'Plazo de ejecución: a concretar según disponibilidad y aceptación del cliente.',
    'Forma de pago: a convenir.',
    'Los trabajos no incluyen partidas no descritas expresamente en este documento.',
    'Cualquier modificación o trabajo adicional será presupuestado aparte.'
  ];

  var UNIDADES = ['ud', 'm', 'm²', 'm³', 'ml', 'kg', 'h', 'jornada', 'partida', 'saco', 'l', '%'];

  var ESTADOS = [
    { id: 'borrador',  nombre: 'Borrador',  color: 'gris'    },
    { id: 'enviado',   nombre: 'Enviado',   color: 'azul'    },
    { id: 'aceptado',  nombre: 'Aceptado',  color: 'verde'   },
    { id: 'rechazado', nombre: 'Rechazado', color: 'rojo'    },
    { id: 'caducado',  nombre: 'Caducado',  color: 'naranja' }
  ];

  var TIPOS_IVA = [
    { valor: 21, nombre: '21 % — general' },
    { valor: 10, nombre: '10 % — obras de renovación en vivienda' },
    { valor: 4,  nombre: '4 % — superreducido' },
    { valor: 0,  nombre: '0 % — exento / no sujeto' }
  ];

  var TIPOS_IRPF = [
    { valor: 0,  nombre: 'Sin retención — cliente particular' },
    { valor: 15, nombre: '15 % — cliente empresa o profesional' },
    { valor: 7,  nombre: '7 % — nuevo autónomo (año de alta y dos siguientes)' }
  ];

  /* Categorías de gasto deducible para un autónomo en estimación directa.
     ivaDeducible: porcentaje del IVA soportado que se suele poder deducir.
     irpfDeducible: porcentaje del gasto que se suele imputar al rendimiento. */
  var CATEGORIAS_GASTO = [
    { id: 'materiales', nombre: 'Compras de material y mercaderías', grupo: 'Obra',
      ivaDeducible: 100, irpfDeducible: 100,
      nota: 'Material adquirido para ejecutar los trabajos. Deducible al 100 % con factura completa a nombre del negocio.' },
    { id: 'subcontratas', nombre: 'Subcontratas y trabajos de otras empresas', grupo: 'Obra',
      ivaDeducible: 100, irpfDeducible: 100,
      nota: 'Trabajos ejecutados por terceros. Guarda la factura del subcontratista con su NIF.' },
    { id: 'herramienta', nombre: 'Herramienta y pequeño material', grupo: 'Obra',
      ivaDeducible: 100, irpfDeducible: 100,
      nota: 'Herramienta de menos de 300 € por unidad se puede llevar directamente a gasto. Por encima, va a amortización.' },
    { id: 'epi', nombre: 'EPI y ropa de trabajo', grupo: 'Obra',
      ivaDeducible: 100, irpfDeducible: 100,
      nota: 'Ropa con anagrama, calzado de seguridad, guantes, cascos. La ropa de calle no es deducible.' },
    { id: 'alquiler_maq', nombre: 'Alquiler de maquinaria y medios auxiliares', grupo: 'Obra',
      ivaDeducible: 100, irpfDeducible: 100,
      nota: 'Andamios, dumper, martillo, contenedores de escombro.' },
    { id: 'residuos', nombre: 'Gestión de residuos y vertedero', grupo: 'Obra',
      ivaDeducible: 100, irpfDeducible: 100,
      nota: 'Tasas de vertedero y retirada de escombros vinculadas a la obra.' },

    { id: 'vehiculo_comb', nombre: 'Vehículo: combustible y peajes', grupo: 'Vehículo',
      ivaDeducible: 50, irpfDeducible: 50,
      nota: 'En turismos, Hacienda presume un 50 % de afectación. En furgoneta industrial se puede defender el 100 %, pero hay que poder probarlo.' },
    { id: 'vehiculo_mant', nombre: 'Vehículo: mantenimiento, seguro e ITV', grupo: 'Vehículo',
      ivaDeducible: 50, irpfDeducible: 50,
      nota: 'Mismo criterio de afectación que el combustible. El seguro no lleva IVA.' },

    { id: 'suministros_local', nombre: 'Suministros del local (luz, agua, gas)', grupo: 'Local',
      ivaDeducible: 100, irpfDeducible: 100,
      nota: 'Deducible al 100 % si el local está afecto exclusivamente a la actividad.' },
    { id: 'alquiler_local', nombre: 'Alquiler de local o nave', grupo: 'Local',
      ivaDeducible: 100, irpfDeducible: 100,
      nota: 'Si el arrendador es empresa o profesional, la factura lleva IVA y puede llevar retención de IRPF.' },
    { id: 'suministros_casa', nombre: 'Suministros del domicilio afecto', grupo: 'Local',
      ivaDeducible: 0, irpfDeducible: 30,
      nota: 'Se deduce el 30 % de la parte proporcional de la vivienda declarada como afecta. El IVA de estos suministros no es deducible.' },

    { id: 'cuota_reta', nombre: 'Cuota de autónomos (RETA)', grupo: 'Estructura',
      ivaDeducible: 0, irpfDeducible: 100,
      nota: 'Gasto deducible íntegro, sin IVA.' },
    { id: 'seguros', nombre: 'Seguros de la actividad', grupo: 'Estructura',
      ivaDeducible: 0, irpfDeducible: 100,
      nota: 'Responsabilidad civil, accidentes, convenio. Las primas de seguro no llevan IVA.' },
    { id: 'asesoria', nombre: 'Asesoría y servicios profesionales', grupo: 'Estructura',
      ivaDeducible: 100, irpfDeducible: 100,
      nota: 'Gestoría, abogado, arquitecto. Sus facturas suelen incluir retención de IRPF.' },
    { id: 'telefonia', nombre: 'Telefonía e internet', grupo: 'Estructura',
      ivaDeducible: 100, irpfDeducible: 100,
      nota: 'Al 100 % si la línea está a nombre del negocio y es de uso exclusivo. Si es mixta, imputa la parte proporcional.' },
    { id: 'software', nombre: 'Software, dominios y servicios digitales', grupo: 'Estructura',
      ivaDeducible: 100, irpfDeducible: 100,
      nota: 'Programas, alojamiento web, almacenamiento en la nube.' },
    { id: 'bancarios', nombre: 'Gastos financieros y comisiones', grupo: 'Estructura',
      ivaDeducible: 0, irpfDeducible: 100,
      nota: 'Comisiones de la cuenta del negocio, intereses de préstamos de la actividad. Exentos de IVA.' },
    { id: 'publicidad', nombre: 'Publicidad y captación de clientes', grupo: 'Estructura',
      ivaDeducible: 100, irpfDeducible: 100,
      nota: 'Anuncios, rotulación del vehículo, tarjetas, página web.' },
    { id: 'formacion', nombre: 'Formación y libros técnicos', grupo: 'Estructura',
      ivaDeducible: 100, irpfDeducible: 100,
      nota: 'Debe estar relacionada con la actividad. Los cursos de formación reglada suelen ir exentos de IVA.' },
    { id: 'dietas', nombre: 'Dietas y manutención', grupo: 'Estructura',
      ivaDeducible: 0, irpfDeducible: 100,
      nota: 'Máximo 26,67 € por día en España sin pernocta. Obligatorio pagar con tarjeta o transferencia y que sea en día laborable fuera del municipio.' },
    { id: 'amortizacion', nombre: 'Amortización de bienes de inversión', grupo: 'Estructura',
      ivaDeducible: 0, irpfDeducible: 100,
      nota: 'Reparto anual del coste de vehículos, maquinaria grande y equipos. El IVA se dedujo en la compra, no aquí.' },
    { id: 'tributos', nombre: 'Tributos y tasas de la actividad', grupo: 'Estructura',
      ivaDeducible: 0, irpfDeducible: 100,
      nota: 'IAE, tasas municipales, licencias de obra. Las multas y sanciones nunca son deducibles.' },
    { id: 'otros', nombre: 'Otros gastos deducibles', grupo: 'Estructura',
      ivaDeducible: 100, irpfDeducible: 100,
      nota: 'Cualquier gasto vinculado de forma directa y probada a la actividad.' }
  ];

  var PARTIDAS_EJEMPLO = [
    { codigo: 'MO-01', descripcion: 'Mano de obra oficial de 1ª', unidad: 'h', precio: 24, categoria: 'Mano de obra' },
    { codigo: 'MO-02', descripcion: 'Mano de obra peón', unidad: 'h', precio: 18, categoria: 'Mano de obra' },
    { codigo: 'MO-03', descripcion: 'Jornada completa de oficial', unidad: 'jornada', precio: 180, categoria: 'Mano de obra' },
    { codigo: 'PI-01', descripcion: 'Pintura plástica lisa en paredes, dos manos, incluida preparación de superficie', unidad: 'm²', precio: 8.5, categoria: 'Pintura' },
    { codigo: 'PI-02', descripcion: 'Pintura de techo en blanco, dos manos', unidad: 'm²', precio: 9.2, categoria: 'Pintura' },
    { codigo: 'PI-03', descripcion: 'Esmalte sobre carpintería metálica o de madera', unidad: 'm²', precio: 14, categoria: 'Pintura' },
    { codigo: 'AL-01', descripcion: 'Alicatado de azulejo cerámico con adhesivo cementoso, sin incluir material', unidad: 'm²', precio: 26, categoria: 'Albañilería' },
    { codigo: 'AL-02', descripcion: 'Solado de baldosa cerámica sobre mortero de agarre', unidad: 'm²', precio: 28, categoria: 'Albañilería' },
    { codigo: 'AL-03', descripcion: 'Tabique de ladrillo hueco doble recibido con mortero', unidad: 'm²', precio: 32, categoria: 'Albañilería' },
    { codigo: 'DE-01', descripcion: 'Demolición de alicatado o solado, con retirada de escombro', unidad: 'm²', precio: 16, categoria: 'Demolición' },
    { codigo: 'DE-02', descripcion: 'Desmontaje de techo registrable, incluidos medios auxiliares', unidad: 'm²', precio: 11, categoria: 'Demolición' },
    { codigo: 'DE-03', descripcion: 'Carga y transporte de escombro a vertedero autorizado', unidad: 'm³', precio: 48, categoria: 'Demolición' },
    { codigo: 'PL-01', descripcion: 'Falso techo continuo de placa de yeso laminado sobre perfilería', unidad: 'm²', precio: 34, categoria: 'Pladur' },
    { codigo: 'PL-02', descripcion: 'Reposición de placa de techo registrable deteriorada', unidad: 'ud', precio: 12, categoria: 'Pladur' },
    { codigo: 'PL-03', descripcion: 'Relleno de huecos y reparación de bovedillas', unidad: 'ud', precio: 38, categoria: 'Pladur' },
    { codigo: 'FO-01', descripcion: 'Punto de luz completo, incluido mecanismo', unidad: 'ud', precio: 55, categoria: 'Instalaciones' },
    { codigo: 'FO-02', descripcion: 'Sustitución de toma de corriente', unidad: 'ud', precio: 28, categoria: 'Instalaciones' },
    { codigo: 'FO-03', descripcion: 'Sustitución de grifería de lavabo o fregadero', unidad: 'ud', precio: 65, categoria: 'Instalaciones' },
    { codigo: 'AU-01', descripcion: 'Medios auxiliares, protecciones y limpieza final de obra', unidad: 'partida', precio: 120, categoria: 'Auxiliares' },
    { codigo: 'AU-02', descripcion: 'Alquiler de andamio homologado', unidad: 'jornada', precio: 45, categoria: 'Auxiliares' }
  ];

  function ajustesPorDefecto() {
    return {
      emisor: {
        nombre: 'Jose Angel Dominguez Ramos',
        nif: '',
        direccion: 'C/ Loreto y Chicote Nº5, 3º Drch',
        cp: '28004',
        ciudad: 'Madrid',
        telefono: '695 948 921',
        email: 'jadominguezramos@gmail.com',
        web: ''
      },
      logo: null,            // dataURL; si es null se usa el logotipo vectorial
      firma: null,           // dataURL de la firma escaneada
      mostrarLogo: true,
      numeracion: {
        formato: '{n}/{aaaa}',
        siguiente: 1,
        anio: new Date().getFullYear(),
        reinicioAnual: true,
        digitos: 1
      },
      ivaPorDefecto: 21,
      irpfPorDefecto: 0,
      validezDias: 15,
      condiciones: CONDICIONES.slice(),
      textoPie: '',
      mostrarCodigos: false,
      colorPrincipal: '#16233A',
      colorAcento: '#B08D57',
      creado: null,
      modificado: null,
      ultimaCopia: null
    };
  }

  var SEMILLA = '2026-01-01T00:00:00.000Z';   // fecha de los datos de partida

  function estadoInicial() {
    var ahora = new Date().toISOString();
    var ajustes = ajustesPorDefecto();
    ajustes.creado = ahora;
    ajustes.modificado = ahora;
    return {
      version: 1,
      ajustes: ajustes,
      clientes: [],
      partidas: PARTIDAS_EJEMPLO.map(function (p) {
        return {
          // Identificador estable y fecha fija: así el mismo banco de precios
          // creado en dos dispositivos distintos es el mismo, y al
          // sincronizar se reconoce en vez de duplicarse.
          id: 'par_base_' + p.codigo.toLowerCase().replace(/[^a-z0-9]/g, ''),
          codigo: p.codigo,
          descripcion: p.descripcion,
          unidad: p.unidad,
          precio: p.precio,
          categoria: p.categoria,
          usos: 0,
          creado: SEMILLA,
          modificado: SEMILLA
        };
      }),
      presupuestos: [],
      gastos: [],
      borrados: {}
    };
  }

  global.Base = {
    LOGO_SVG: LOGO_SVG,
    CONDICIONES: CONDICIONES,
    UNIDADES: UNIDADES,
    ESTADOS: ESTADOS,
    TIPOS_IVA: TIPOS_IVA,
    TIPOS_IRPF: TIPOS_IRPF,
    CATEGORIAS_GASTO: CATEGORIAS_GASTO,
    ajustesPorDefecto: ajustesPorDefecto,
    estadoInicial: estadoInicial,
    categoria: function (id) {
      for (var i = 0; i < CATEGORIAS_GASTO.length; i++) {
        if (CATEGORIAS_GASTO[i].id === id) return CATEGORIAS_GASTO[i];
      }
      return { id: id, nombre: 'Sin categoría', grupo: 'Otros', ivaDeducible: 0, irpfDeducible: 100, nota: '' };
    },
    estado: function (id) {
      for (var i = 0; i < ESTADOS.length; i++) if (ESTADOS[i].id === id) return ESTADOS[i];
      return ESTADOS[0];
    }
  };
})(window);
