self.SBKIM_SW_STANDALONE = false;
importScripts("./sbkim-sw-v3.js");
console.info("SBKIM-SW geladen via importScripts (Variante 3b)");
// Service Worker for Mein Rezeptbuch (Hauptapp)
const CACHE = 'mrz-v61';
// './' statt './index.html': ausgeliefert wird die Seite unter /Mein-Rezeptbuch/.
// './index.html' ist fuer den Browser eine ANDERE Adresse — addAll() hat das
// 4,8-MB-Dokument darum beim Installieren ein zweites Mal aus dem Netz geholt.
// './' liegt nach der Erst-Navigation bereits im HTTP-Cache (max-age=600) und
// kostet nichts mehr. Offline-Rueckfall unten zieht auf './' nach.
const SHELL = ['./', './sicherheit.html', './app-manifest.json', './icons/icon-book-blue-192.png', './icons/icon-book-blue-512.png'];

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
