/* Service worker: guarda la aplicación para poder abrirla sin conexión. */
var CACHE = 'presupuestos-v2';
var ARCHIVOS = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css', './css/documento.css',
  './js/config.js', './js/util.js', './js/store.js', './js/datos-base.js', './js/modelo.js',
  './js/ui.js', './js/documento.js', './js/fusion.js', './js/sync.js', './js/app.js',
  './js/vista-panel.js', './js/vista-presupuestos.js', './js/vista-clientes.js',
  './js/vista-precios.js', './js/vista-gastos.js', './js/vista-fiscal.js', './js/vista-ajustes.js',
  './assets/icono.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ARCHIVOS.map(function (u) {
      return c.add(u).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.map(function (k) {
      return k === CACHE ? null : caches.delete(k);
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copia = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia).catch(function () {}); });
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (r) {
        return r || caches.match('./index.html');
      });
    })
  );
});
