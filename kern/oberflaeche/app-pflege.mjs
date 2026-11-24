// Küchen-Kern · App installieren und aktualisieren (Klaus 24.11.: Knopf „Installieren“ oben, weg nach der Installation;
// ein Tipp auf die Versionsnummer holt die neueste Fassung, ohne hartes Neuladen am Handy).

/** Läuft die Seite als installierte App (eigenes Fenster statt Browser-Tab)? */
export const laeuftAlsApp = (w = globalThis) => !!(w.matchMedia?.('(display-mode: standalone)').matches || w.matchMedia?.('(display-mode: window-controls-overlay)').matches || w.navigator?.standalone);

/** Merkt sich das Angebot des Browsers zur Installation. beiAenderung(): die App zeichnet ihren Knopf neu.
 *  Zurück: { zeigen() – Knopf zeigen?, kannFragen() – bietet der Browser selbst an?, fragen() – Angebot zeigen → 'accepted' | 'dismissed' | null }. */
export function installation(beiAenderung = () => {}, w = globalThis) {
  let frage = null, fertig = false;
  w.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); frage = ev; beiAenderung(); });
  w.addEventListener('appinstalled', () => { frage = null; fertig = true; beiAenderung(); });
  return {
    zeigen: () => !fertig && !laeuftAlsApp(w),
    kannFragen: () => !!frage,
    async fragen() { const p = frage; if (!p) return null; frage = null; await p.prompt(); const c = await p.userChoice.catch(() => null); if (c?.outcome === 'accepted') fertig = true; beiAenderung(); return c?.outcome || null; },
  };
}
/** Wie installiert man ohne Angebot des Browsers? Für iPhone/iPad anders als sonst. */
export const istApple = (w = globalThis) => /iPad|iPhone|iPod/.test(w.navigator?.userAgent || '') || (w.navigator?.platform === 'MacIntel' && w.navigator?.maxTouchPoints > 1);

/** Holt die neueste Fassung: Service Worker auf Neues prüfen (eine neue Fassung übernimmt sofort), dann – nur mit Netz –
 *  den Speicher DIESER App leeren (Namen mit `cachePrefix`), damit jede Datei frisch kommt. Neu laden macht der Aufrufer.
 *  Zurück: 'offline' (nichts angefasst, die App bleibt, wie sie ist) | 'neu' (eine neue Fassung kam) | 'frisch' (Speicher geleert). */
export async function aktualisieren({ cachePrefix, w = globalThis, frist = 8000, probe } = {}) {
  const ok = await fetch(probe || w.location.href, { cache: 'no-store', method: 'HEAD' }).then((a) => a.ok, () => false);
  if (!ok) return 'offline';
  let neu = false;
  const reg = await w.navigator?.serviceWorker?.getRegistration?.().catch(() => null);
  if (reg) {
    await reg.update().catch(() => {});
    const sw = reg.installing || reg.waiting;
    if (sw) { neu = true; await new Promise((fertig) => { const t = setTimeout(fertig, frist); sw.addEventListener('statechange', () => { if (sw.state === 'activated' || sw.state === 'redundant') { clearTimeout(t); fertig(); } }); }); }
  }
  if (cachePrefix && w.caches) for (const n of await w.caches.keys()) if (n.startsWith(cachePrefix)) await w.caches.delete(n);
  return neu ? 'neu' : 'frisch';
}
