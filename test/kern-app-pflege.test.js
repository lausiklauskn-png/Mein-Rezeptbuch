// Proben: Installieren und Aktualisieren (kern/oberflaeche/app-pflege.mjs). Fenster, Service Worker und Speicher sind gestellt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { laeuftAlsApp, installation, aktualisieren, istApple } from '../kern/oberflaeche/app-pflege.mjs';

const fenster = ({ standalone = false, ua = 'Mozilla/5.0 (Linux; Android 14)' } = {}) => { const h = {}; return { h, matchMedia: (q) => ({ matches: standalone && q.includes('standalone') }), navigator: { userAgent: ua, platform: 'Linux' }, addEventListener: (n, f) => { h[n] = f; } }; };
test('als App erkannt: eigenes Fenster ja, Browser-Tab nein', () => {
  assert.equal(laeuftAlsApp(fenster({ standalone: true })), true); assert.equal(laeuftAlsApp(fenster()), false);
  assert.equal(istApple(fenster({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' })), true); assert.equal(istApple(fenster()), false);
});
test('Installieren: Knopf im Browser da, als App nicht; das Angebot des Browsers wird gezeigt; nach der Installation ist der Knopf weg', async () => {
  const w = fenster(); let n = 0; const i = installation(() => n++, w);
  assert.equal(i.zeigen(), true); assert.equal(i.kannFragen(), false); assert.equal(await i.fragen(), null, 'ohne Angebot fragt nichts');
  let gezeigt = 0, verhindert = 0; w.h.beforeinstallprompt({ preventDefault: () => verhindert++, prompt: async () => { gezeigt++; }, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  assert.equal(verhindert, 1); assert.equal(i.kannFragen(), true);
  assert.equal(await i.fragen(), 'accepted'); assert.equal(gezeigt, 1); assert.equal(i.zeigen(), false, 'angenommen: der Knopf geht weg');
  const w2 = fenster(); const j = installation(() => {}, w2); w2.h.appinstalled(); assert.equal(j.zeigen(), false, 'über das Browser-Menü installiert: der Knopf geht auch weg');
  assert.equal(installation(() => {}, fenster({ standalone: true })).zeigen(), false, 'läuft schon als App: kein Knopf');
  assert.ok(n >= 2);
});
test('Aktualisieren: ohne Netz bleibt alles; mit Netz nur der Speicher dieser App; eine neue Fassung wird abgewartet', async () => {
  const geloescht = [], speicher = { keys: async () => ['rezeptbuch-neu-0.14.3', 'mixarium-neu-x', 'fremd'], delete: async (n) => { geloescht.push(n); } };
  const alt = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error('offline'); };
    assert.equal(await aktualisieren({ cachePrefix: 'rezeptbuch-neu-', w: { location: { href: 'x' }, caches: speicher, navigator: {} } }), 'offline'); assert.deepEqual(geloescht, []);
    globalThis.fetch = async () => ({ ok: true });
    let aktualisiert = 0; const sw = { state: 'installing', addEventListener: (n, f) => { setTimeout(() => { sw.state = 'activated'; f(); }, 10); } };
    const reg = { update: async () => { aktualisiert++; }, installing: sw };
    const e = await aktualisieren({ cachePrefix: 'rezeptbuch-neu-', w: { location: { href: 'x' }, caches: speicher, navigator: { serviceWorker: { getRegistration: async () => reg } } } });
    assert.equal(e, 'neu'); assert.equal(aktualisiert, 1); assert.deepEqual(geloescht, ['rezeptbuch-neu-0.14.3'], 'nur der Speicher dieser App');
    geloescht.length = 0;
    assert.equal(await aktualisieren({ cachePrefix: 'mixarium-neu-', w: { location: { href: 'x' }, caches: speicher, navigator: {} } }), 'frisch'); assert.deepEqual(geloescht, ['mixarium-neu-x']);
  } finally { globalThis.fetch = alt; }
});
