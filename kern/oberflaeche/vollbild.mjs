// Echtes Vollbild für Browser, Windows-Hülle und Android-Hülle (Klaus 27.11.2026: „eine echte Vollbildansicht für Handy und für
// Desktop“, die Leisten des Systems sollen mit verschwinden und beim Zurückschalten wiederkommen).
//   Browser und Windows (Electron): requestFullscreen / exitFullscreen.
//   Android (Capacitor): die Hülle beendet das Browser-Vollbild sofort wieder (BridgeWebChromeClient ruft onCustomViewHidden).
//   Dort setzt das kleine Plugin `AppVollbild` der Hülle (paket/android/nachbessern.mjs schreibt es) die Leisten des Systems aus
//   und an, aufgerufen über Capacitor.nativePromise (kein zusätzliches Skript nötig). Eine ältere APK ohne das Plugin lehnt still ab.
//   Fehlt beides, passiert nichts – die App zeigt ihre eigene Vollbild-Ansicht trotzdem.
export const vollbildBruecke = (w = globalThis) => { try { const c = w.Capacitor; return c?.isNativePlatform?.() && typeof c.nativePromise === 'function' ? { setzen: (an) => c.nativePromise('AppVollbild', 'setzen', { an }) } : null; } catch { return null; } };
export const browserVollbildAn = (w = globalThis) => { try { return !!w.document?.fullscreenElement; } catch { return false; } };
export function vollbildSetzen(an, w = globalThis) {
  const b = vollbildBruecke(w);
  if (b) { try { b.setzen(!!an)?.catch?.(() => { /* ältere Hülle ohne das Plugin */ }); } catch { /* Hülle ohne Brücke */ } return; }
  try {
    const d = w.document, p = an ? (d.fullscreenElement ? null : d.documentElement.requestFullscreen?.()) : d.fullscreenElement ? d.exitFullscreen?.() : null;
    p?.catch?.(() => { /* ohne Browser-Vollbild */ });
  } catch { /* ohne Vollbild */ }
}
