# Presupuestos

Aplicación de presupuestos y control de gastos deducibles para un autónomo
español del sector de reformas. Funciona entera en el navegador, sin servidor
propio y sin conexión. Los datos viven en el dispositivo; si se activa la
sincronización, además se ponen de acuerdo entre el ordenador y el móvil a
través del Google Drive del propio usuario.

## Qué hace

- **Presupuestos** con capítulos, partidas, descuentos por línea y descuento
  global, IVA (21/10/4/0) y retención de IRPF (15/7/0).
- **Documento A4** paginado en JavaScript: la tabla nunca se corta a mitad de
  fila, repite cabecera al pasar de página, la cabecera completa solo sale en
  la primera y cada hoja lleva pie con los datos de contacto y "Página X de Y".
- **Estados y seguimiento**: borrador, enviado, aceptado, rechazado y caducado
  automático al pasar los días de validez. Avisos de los que caducan esta
  semana.
- **Clientes** con ficha, historial y total contratado.
- **Banco de precios** reutilizable, con importación y exportación en CSV.
- **Gastos deducibles** con 23 categorías propias de la actividad, porcentaje
  de IVA deducible y de afectación por categoría, y exportación en CSV para la
  gestoría.
- **Resumen trimestral** con IVA a liquidar (303) y pago fraccionado estimado
  (130), acumulado anual y desglose de gasto por categoría.
- **Sincronización** con la carpeta privada de aplicaciones de Google Drive:
  el ordenador y el móvil van al día solos, se puede trabajar sin cobertura y
  para cada registro gana la edición más reciente.
- **Copias de seguridad** en JSON, con restauración por reemplazo o fusión.

No emite facturas. Es deliberado: la facturación en España entra en el ámbito
de Verifactu y exige requisitos de registro e inalterabilidad que una
aplicación local no cumple.

## Estructura

```
presupuestos-app/
├── build.mjs          genera dist/ (sin dependencias)
├── servidor.mjs       servidor local de desarrollo
├── package.json
├── src/
│   ├── index.html
│   ├── manifest.webmanifest
│   ├── sw.js          service worker para uso sin conexión
│   ├── assets/        iconos
│   ├── css/
│   │   ├── app.css        interfaz
│   │   └── documento.css  hoja A4 y reglas de impresión
│   └── js/
│       ├── config.js      el ID de cliente de Google, lo único a rellenar
│       ├── util.js        formato de moneda y fechas, NIF, descargas
│       ├── store.js       persistencia (IndexedDB con reserva localStorage)
│       ├── datos-base.js  valores por defecto, categorías, logotipo
│       ├── modelo.js      cálculos, numeración, resúmenes fiscales
│       ├── ui.js          iconos, modales, avisos, campos
│       ├── documento.js   construcción y paginación del A4
│       ├── fusion.js      mezcla de dos copias registro a registro
│       ├── sync.js        transporte con Google Drive y ciclo de sincronía
│       ├── app.js         estado global, navegación, copias
│       └── vista-*.js     una por pantalla
├── test/
│   ├── prueba.mjs         47 comprobaciones de la aplicación
│   └── prueba-sync.mjs    26 comprobaciones de la sincronización
└── dist/
    ├── Presupuestos.html  archivo único, doble clic, sin conexión
    ├── artifact.html      contenido para publicar como página alojada
    └── web/               copia lista para servir como PWA
```

## Sincronización: puesta en marcha

Se hace una vez y sirve para todos los dispositivos. Son dos cosas: publicar
la aplicación en una dirección https fija y crear un ID de cliente de Google
que apunte a esa dirección.

### 1. Publicar la aplicación

Sube el contenido de `dist/web/` a cualquier alojamiento estático gratuito.
Con GitHub Pages:

1. Crea un repositorio nuevo, por ejemplo `presupuestos`.
2. Sube ahí lo que hay dentro de `dist/web/` (que el `index.html` quede en la
   raíz del repositorio).
3. Settings → Pages → Source: `Deploy from a branch`, rama `main`, carpeta `/`.
4. A los dos minutos tendrás `https://TUUSUARIO.github.io/presupuestos/`.

Cloudflare Pages y Netlify valen igual. Lo único que importa es que la
dirección sea `https` y no cambie.

### 2. Crear el ID de cliente de Google

1. Entra en <https://console.cloud.google.com/> y crea un proyecto.
2. APIs y servicios → Biblioteca → busca **Google Drive API** → Habilitar.
3. APIs y servicios → Pantalla de consentimiento de OAuth: tipo **Externo**,
   pon un nombre y tu correo. En **Público de destino** puedes dejarlo en
   pruebas y añadir la cuenta de Google de tu tío como usuario de prueba, o
   publicarlo: el alcance que usa la aplicación
   (`drive.appdata`) no es sensible, así que Google no exige verificación ni
   muestra la pantalla de "aplicación no verificada".
4. Credenciales → Crear credenciales → **ID de cliente de OAuth** → tipo
   **Aplicación web**.
5. En **Orígenes autorizados de JavaScript** añade tu dirección, sin barra
   final: `https://TUUSUARIO.github.io`. No hace falta URI de redirección.
6. Copia el ID que termina en `.apps.googleusercontent.com`.

### 3. Poner el ID en la aplicación

Pégalo en `src/js/config.js` y vuelve a compilar, o —más rápido para probar—
ábrela y pégalo en Ajustes → Sincronización, donde queda guardado en ese
dispositivo.

Después, en cada dispositivo: Ajustes → **Conectar con Google Drive**, la
misma cuenta de Google en todos. Los datos van a la carpeta privada de
aplicaciones de ese Drive: no se ve entre sus archivos, no ocupa cuota
visible y solo la lee esta aplicación.

### Qué no sincroniza

El archivo `Presupuestos.html` del escritorio, porque Google no autoriza
orígenes `file://`. Ese archivo queda como copia offline de emergencia y se
mueve con las copias de seguridad. La copia publicada como artefacto de
Claude tampoco: su política de seguridad bloquea los scripts de Google.

## Decisiones de diseño

**Sin framework y con scripts clásicos.** No hay módulos ES, y es a propósito:
Chrome bloquea `import` en el protocolo `file://`, y el objetivo era que el
archivo compilado se abra con doble clic. Cada archivo se expone en un objeto
global (`U`, `Store`, `Base`, `Modelo`, `UI`, `Doc`, `App`) y el orden de carga
está en `index.html`.

**Paginación medida, no delegada al navegador.** `documento.js` va añadiendo
bloques y filas a una página de altura fija y comprueba `scrollHeight` contra
`clientHeight`. Cuando algo no cabe lo retira y abre una página nueva. Sale más
código que con `break-inside: avoid`, pero el resultado es idéntico en pantalla
y en papel, y permite cabecera reducida a partir de la segunda hoja y "Página X
de Y" real, que las cajas de margen de `@page` no dan en Chrome.

**Dos motores de almacenamiento.** IndexedDB cuando la aplicación se sirve por
HTTP, y `localStorage` cuando se abre como archivo local, donde Chrome no
permite IndexedDB. `store.js` elige solo y avisa si ninguno está disponible.

**Fusión por registro, no por archivo.** Cada presupuesto, cliente, partida y
gasto lleva su `modificado`, y las bajas dejan un rastro con fecha en
`estado.borrados`. Al sincronizar se comparan las dos copias registro a
registro y gana la edición más reciente; una baja solo se respeta si es
posterior a la última edición de ese registro. Así se puede trabajar sin
cobertura en los dos dispositivos sin que uno pise al otro, y sin montar un
CRDT para un caso de un solo usuario. El contador de numeración es la
excepción: nunca retrocede, se queda con el mayor de los dos, porque dos
presupuestos con el mismo número sí serían un problema de verdad.

Los datos de partida (el banco de precios) llevan identificadores fijos
derivados de su código, en lugar de aleatorios. Sin eso, dos dispositivos
recién instalados generarían dos bancos distintos y la primera
sincronización dejaría cuarenta partidas en vez de veinte.

**Nada crítico se pierde por un fallo de red.** Si Drive no responde o
devuelve un archivo dañado, la sincronización aborta y no toca lo local.
Antes de aplicar una fusión que cambie algo, la copia anterior se guarda
aparte y Ajustes ofrece deshacerla.

**Todo en el dispositivo, aunque haya sincronización.** La aplicación
funciona entera sin conexión; Drive es solo el sitio donde las dos copias
se ponen de acuerdo. Sin configurarlo, la aplicación va igual y el traslado
entre dispositivos se hace con el archivo JSON de copia de seguridad.

**Descargas con doble vía.** En un navegador normal los archivos se entregan
con un enlace `blob:`. Dentro de una página publicada en claude.ai ese enlace
no hace nada, así que `util.js` pide primero la capacidad `downloads` del visor
y solo cae al enlace si no existe. Afecta a las copias de seguridad, a los CSV
y al documento exportado.

## Desarrollo

```bash
node servidor.mjs           # http://localhost:8080 sobre src/
node build.mjs              # genera dist/
node test/prueba.mjs        # requiere playwright instalado
node test/prueba-sync.mjs   # dos navegadores contra un Drive de mentira
```

El build no instala nada: lee `src/`, incrusta CSS, JavaScript e iconos en un
único HTML y escribe las tres salidas de `dist/`.

Las pruebas abren la aplicación en Chromium y verifican cálculos con IVA e
IRPF, paginación con 15 y con 60 partidas, ausencia de desbordes, persistencia
tras recargar, resumen trimestral, descargas dentro de una página publicada y
recorrido por las siete pantallas. Dejan capturas y un PDF en `test/salida/`.

`prueba-sync.mjs` levanta dos navegadores aislados —el ordenador y el móvil—
contra un Drive simulado en el propio proceso, y comprueba el viaje de ida y
vuelta, las bajas, el conflicto de edición simultánea, que la numeración no
se repita, que no se suba nada sin cambios, el deshacer, y que un corte de
red o un archivo dañado no toquen los datos locales. No hace falta cuenta de
Google para ejecutarlas: el transporte se inyecta con `Sync.usarRemoto`.

## Ideas para más adelante

- Fotos de obra adjuntas a la partida.
- Certificaciones parciales sobre un presupuesto aceptado.
- Mediciones con fórmula (largo × ancho) en la cantidad.
- Recordatorio de seguimiento a los X días de enviar.
