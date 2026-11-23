// Küchen-Kern · Ladebalken. Klaus 23.11.2026: „Vergiss den Ladebalken nicht, damit nie der Eindruck entsteht, die App ist
// abgestürzt. Bei allen, wo Zeit verbraucht wird.“ Eine Stelle für alle Wartezeiten (KI-Rezept, KI-Bild, Gratis-Foto,
// Sprachmodell der Sinn-Suche, Beispiel-Pakete, Datei einlesen, Foto aufbereiten).
//
// Zu sehen sind zwei Dinge, beide ohne Klick-Sperre (pointer-events:none):
//  - oben ein dünner Balken: wandert, solange unbekannt ist, wie weit es ist; füllt sich, sobald ein Anteil bekannt ist;
//  - unten eine Zeile mit drehendem Kreis, dem Text und ab 2 s einem Sekundenzähler – auch bei einer langen Wartezeit
//    bewegt sich damit sichtbar etwas.
// Laufen mehrere Dinge gleichzeitig, steht das zuletzt begonnene da; der Balken bleibt, bis das letzte fertig ist.
// Kurze Dinge (unter `verzoegerung` ms) zeigen nichts – ein Aufblitzen wäre unruhiger als gar nichts.
let eingerichtet = null;
const STIL = `
#warten-balken{position:fixed;left:0;right:0;top:0;height:3px;z-index:99998;pointer-events:none;overflow:hidden;opacity:0;transition:opacity .2s}
#warten-balken.an{opacity:1}
#warten-balken i{position:absolute;top:0;bottom:0;left:0;width:0;background:var(--akz,#3a7bd5);transition:width .3s}
#warten-balken.offen i{width:35%;animation:warten-lauf 1.3s ease-in-out infinite}
@keyframes warten-lauf{0%{left:-35%}100%{left:100%}}
#warten-zeile{position:fixed;left:50%;bottom:calc(76px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:99998;pointer-events:none;display:none;align-items:center;gap:9px;max-width:calc(100vw - 32px);padding:8px 14px;border-radius:999px;background:rgba(20,24,34,.9);color:#fff;font:600 13px/1.3 system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.25)}
#warten-zeile.an{display:flex}
#warten-zeile b{width:14px;height:14px;flex:none;border-radius:50%;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:warten-dreh .8s linear infinite}
#warten-zeile span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#warten-zeile small{opacity:.75;font-weight:500;flex:none}
@keyframes warten-dreh{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){#warten-balken.offen i{animation:none;width:100%;opacity:.5}#warten-zeile b{animation-duration:2.4s}}`;

/** Richtet Balken und Zeile einmal ein. sekunden(n): Text des Zählers (Vorgabe „12 s“). */
export function wartenEinrichten(doc = document, { verzoegerung = 250, sekunden = (n) => `${n} s` } = {}) {
  if (eingerichtet && eingerichtet.doc === doc) { eingerichtet.sekunden = sekunden; return eingerichtet; }
  const w = doc.defaultView, laufend = [];
  let balken, zeile, uhr = null;
  const bauen = () => {
    if (balken && balken.isConnected) return;
    if (!doc.getElementById('warten-stil')) { const st = doc.createElement('style'); st.id = 'warten-stil'; st.textContent = STIL; doc.head.appendChild(st); }
    balken = doc.createElement('div'); balken.id = 'warten-balken'; balken.innerHTML = '<i></i>';
    zeile = doc.createElement('div'); zeile.id = 'warten-zeile'; zeile.setAttribute('role', 'status'); zeile.setAttribute('aria-live', 'polite');
    zeile.innerHTML = '<b aria-hidden="true"></b><span></span><small></small>';
    doc.body.append(balken, zeile);
  };
  const zeichnen = () => {
    const sichtbar = laufend.filter((a) => a.sichtbar);
    if (!sichtbar.length) { if (balken) { balken.className = ''; zeile.className = ''; } if (uhr) { w.clearInterval(uhr); uhr = null; } return; }
    bauen(); const a = sichtbar[sichtbar.length - 1];
    balken.className = 'an' + (a.anteil == null ? ' offen' : '');
    balken.firstChild.style.width = a.anteil == null ? '' : Math.round(Math.max(0.03, Math.min(1, a.anteil)) * 100) + '%';
    zeile.className = 'an'; zeile.children[1].textContent = a.text;
    const s = Math.floor((Date.now() - a.seit) / 1000); zeile.children[2].textContent = s >= 2 ? h.sekunden(s) : '';
    if (!uhr) uhr = w.setInterval(zeichnen, 1000);
  };
  /** Beginnt eine Wartezeit. Zurück: { text(t), anteil(0..1 oder null), ende() } – ende() darf mehrfach kommen. */
  const start = (text) => {
    const a = { text: String(text || ''), anteil: null, seit: Date.now(), sichtbar: false, fertig: false };
    laufend.push(a);
    const zu = w.setTimeout(() => { if (!a.fertig) { a.sichtbar = true; zeichnen(); } }, h.verzoegerung);
    return {
      text(t) { a.text = String(t || ''); if (a.sichtbar) zeichnen(); },
      anteil(x) { a.anteil = x == null || !isFinite(x) ? null : x; if (a.sichtbar) zeichnen(); },
      ende() { if (a.fertig) return; a.fertig = true; w.clearTimeout(zu); const i = laufend.indexOf(a); if (i >= 0) laufend.splice(i, 1); zeichnen(); },
    };
  };
  /** Führt arbeit(handle) aus und zeigt dabei den Balken; endet auch bei einem Fehler. */
  const mit = async (text, arbeit) => { const x = start(text); try { return await arbeit(x); } finally { x.ende(); } };
  const h = { doc, start, mit, verzoegerung, sekunden, laufend: () => laufend.length };
  eingerichtet = h; return h;
}

/** Fortschritt des Sprachmodells (Modul 03 meldet `sbkim:embedding-progress`, je Datei {file, loaded, total, status}).
 *  Rechnet alle Dateien zusammen und ruft melde(anteil, geladenMB, gesamtMB). Zurück: abmelden(). */
export function modellFortschritt(melde, w = window) {
  const dateien = new Map();
  const hoer = (e) => {
    const d = (e && e.detail) || {}; if (!d.file || !(d.total > 0)) return;
    dateien.set(d.file, { geladen: d.status === 'done' ? d.total : d.loaded || 0, gesamt: d.total });
    let g = 0, t = 0; for (const x of dateien.values()) { g += x.geladen; t += x.gesamt; }
    melde(t ? g / t : null, Math.round(g / 1048576), Math.round(t / 1048576));
  };
  w.addEventListener('sbkim:embedding-progress', hoer);
  return () => w.removeEventListener('sbkim:embedding-progress', hoer);
}

/** Liest eine fetch-Antwort und meldet dabei den Anteil (0..1), wenn der Server die Länge nennt; sonst einfach lesen.
 *  Ist die Antwort gepackt, kann die genannte Länge kleiner sein als das Gelesene – der Anteil bleibt dann bei 1. */
export async function bytesMitAnteil(ant, melde = () => {}) {
  const gesamt = Number(ant.headers && ant.headers.get('content-length')) || 0;
  if (!ant.body || !ant.body.getReader || !gesamt) return new Uint8Array(await ant.arrayBuffer());
  const leser = ant.body.getReader(), teile = []; let g = 0;
  for (;;) { const { done, value } = await leser.read(); if (done) break; teile.push(value); g += value.length; melde(Math.min(1, g / gesamt)); }
  const aus = new Uint8Array(g); let o = 0; for (const t of teile) { aus.set(t, o); o += t.length; } return aus;
}
