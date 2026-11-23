// Mein Rezeptbuch (neu) · Service Worker: die App läuft nach dem ersten Öffnen ohne Netz.
// Vorrat = Hülle und alle Module. Beispielbuch und Katalog gehören NICHT dazu (Beispiele liegen nach dem Laden im Gerät).
// Bei jeder neuen Fassung FASSUNG hochzählen; `node --test` prüft, dass die Liste zu den Modulen passt.
const FASSUNG = 'rezeptbuch-neu-0.13.0';
const VORRAT = [
 "./",
 "./index.html",
 "./app.css",
 "./manifest.webmanifest",
 "../ausgaben/rezeptbuch/ausgabe.json",
 "../icons/icon-book-192.png?v=1",
 "../icons/ausgeloest-48fb59f123.jpg?v=1",
 "./start-rezepte.json",
 "../kern/import/text.mjs",
 "../kern/modell/einkauf.mjs",
 "../kern/modell/kategorien-fest.mjs",
 "../kern/modell/kategorien.mjs",
 "../kern/modell/kochen.mjs",
 "../kern/modell/ordner.mjs",
 "../kern/modell/einheiten.mjs",
 "../kern/ki/helfer.mjs",
 "../kern/ausgabe/druck.mjs",
 "../kern/teilen/qr.mjs",
 "../kern/modell/mengen.mjs",
 "../kern/modell/plan.mjs",
 "../kern/modell/rezept.mjs",
 "../kern/modell/suche.mjs",
 "../kern/modell/warengruppen.mjs",
 "../kern/modell/zustand.mjs",
 "../kern/oberflaeche/bild.mjs",
 "../kern/oberflaeche/diktat.mjs",
 "../kern/oberflaeche/hinweis.mjs",
 "../kern/oberflaeche/warten.mjs",
 "../kern/oberflaeche/farben.mjs",
 "../kern/oberflaeche/geraete.mjs",
 "../kern/oberflaeche/schrift.mjs",
 "../kern/oberflaeche/symbole.mjs",
 "../kern/sicherung/sicherung.mjs",
 "../kern/speicher/speicher.mjs",
 "../kern/suche/bedeutung.mjs",
 "../sbkim/03_embedding.js",
 "../sbkim/04_match.js",
 "../kern/speicher/tresor.mjs",
 "../kern/ki/bild.mjs",
 "../kern/speicher/uebernahme.mjs",
 "../kern/oberflaeche/sprache.mjs",
 "../kern/ki/schluessel.mjs",
 "../kern/ki/claude.mjs",
 "../kern/ki/ocr.mjs",
 "../kern/ki/reinigung.mjs",
 "../kern/import/scan.mjs",
 "../kern/import/web.mjs",
 "../kern/pruefung/datei.mjs",
 "../assets/reinigung.js",
 "../assets/pruefer-formate.js",
 "../assets/pruefer-mail.js",
 "../assets/pruefer-anhang.js",
 "./app.mjs"
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(FASSUNG).then((c) => c.addAll(VORRAT)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n.startsWith('rezeptbuch-neu-') && n !== FASSUNG).map((n) => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/beispiele/')) return;   // alles andere geht normal ins Netz
  e.respondWith(caches.open(FASSUNG).then(async (c) => {
    const da = await c.match(e.request, { ignoreSearch: u.pathname.endsWith('.mjs') || u.pathname.endsWith('.css') });
    const netz = fetch(e.request).then((a) => { if (a.ok && VORRAT.some((v) => new URL(v, self.registration.scope).pathname === u.pathname)) c.put(e.request, a.clone()); return a; }).catch(() => null);
    return da || (await netz) || new Response('Ohne Netz nicht erreichbar.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }));
});
