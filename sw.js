// Réseau d'abord (pour recevoir les mises à jour), cache en secours hors ligne.
const CACHE = 'gymbuddy-v2';
const ASSETS = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'icons/icon.svg',
  'src/app.js', 'src/lib/db.js', 'src/lib/format.js', 'src/lib/calc.js', 'src/lib/chart.js',
  'src/lib/timer.js', 'src/lib/salle-seed.js',
  'src/actions/index.js', 'src/actions/events.js', 'src/actions/salle.js', 'src/actions/poids.js',
  'src/views/salle.js', 'src/views/course.js', 'src/views/alimentation.js', 'src/views/assistant.js',
  'src/views/salle/ui.js', 'src/views/salle/accueil.js', 'src/views/salle/seance.js',
  'src/views/salle/programmes.js', 'src/views/salle/exercices.js', 'src/views/salle/historique.js',
  'src/views/salle/poids.js'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
