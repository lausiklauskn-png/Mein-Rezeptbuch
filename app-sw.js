self.SBKIM_SW_STANDALONE = false;
importScripts("./sbkim-sw-v3.js");
console.info("SBKIM-SW geladen via importScripts (Variante 3b)");
// Service Worker for Mein Rezeptbuch (Hauptapp)
const CACHE = 'mrz-v62';
// './' statt './index.html': ausgeliefert wird die Seite unter /Mein-Rezeptbuch/.
// './index.html' ist fuer den Browser eine ANDERE Adresse — addAll() hat das
// 4,8-MB-Dokument darum beim Installieren ein zweites Mal aus dem Netz geholt.
// './' liegt nach der Erst-Navigation bereits im HTTP-Cache (max-age=600) und
// kostet nichts mehr. Offline-Rueckfall unten zieht auf './' nach.
const SHELL = [
  './',
  './sicherheit.html',
  './app-manifest.json',
  './icons/ausgeloest-48fb59f123.jpg?v=1',
  './icons/ausgeloest-e8f780c17b.png?v=1',
  './icons/icon-book-120.png?v=1',
  './icons/icon-book-144.png?v=1',
  './icons/icon-book-152.png?v=1',
  './icons/icon-book-180.png?v=1',
  './icons/icon-book-192.png?v=1',
  './icons/icon-book-72.png?v=1',
  './icons/icon-book-96.png?v=1',
  './icons/splash-1125x2436.png?v=1',
  './icons/splash-1170x2532.png?v=1',
  './icons/splash-1179x2556.png?v=1',
  './icons/splash-1242x2208.png?v=1',
  './icons/splash-1242x2688.png?v=1',
  './icons/splash-1284x2778.png?v=1',
  './icons/splash-1290x2796.png?v=1',
  './icons/splash-1536x2048.png?v=1',
  './icons/splash-2048x2732.png?v=1',
  './icons/splash-640x1136.png?v=1',
  './icons/splash-750x1334.png?v=1',
  './icons/splash-828x1792.png?v=1'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting(); // Sofort übernehmen – keine Wartezeit
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Network-first: immer frische Version versuchen, Cache nur als Fallback
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }).catch(() => caches.match(e.request).then(cached => cached || caches.match('./')))
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
