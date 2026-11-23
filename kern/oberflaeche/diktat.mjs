// Küchen-Kern · Spracheingabe für Textfelder. Im Browser über die eingebaute Spracherkennung (Web Speech).
// Android-App und Windows-App brauchen eigene Wege (kommen mit den Paketen); hier wird nur gemeldet, ob es geht.
// Hinweis für die Datenschutzerklärung: Chrome schickt den Ton zur Erkennung an Google.
const SR = () => globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export const diktatMoeglich = () => !!SR();
let laufend = null;
/** Startet oder beendet das Diktat für ein Feld. `stand(an)` meldet, ob gerade zugehört wird. */
export function diktat(feld, sprache = 'de-DE', stand = () => {}) {
  if (laufend) { const war = laufend.feld; diktatAus(); if (war === feld) return; }
  const K = SR(); if (!K || !feld) return;
  const e = new K(); e.lang = sprache; e.interimResults = true; e.continuous = true;
  const basis = feld.value ? feld.value.replace(/\s*$/, '') + ' ' : '';
  e.onresult = (ev) => { let t = ''; for (const r of ev.results) t += r[0].transcript; feld.value = basis + t.trim(); feld.dispatchEvent(new Event('input', { bubbles: true })); };
  e.onend = () => { if (laufend?.e === e) { laufend = null; stand(false); } };
  e.onerror = () => { if (laufend?.e === e) { laufend = null; stand(false); } };
  laufend = { e, feld, stand }; stand(true);
  try { e.start(); } catch { laufend = null; stand(false); }
}
export function diktatAus() { if (!laufend) return; const l = laufend; laufend = null; try { l.e.stop(); } catch { /* schon aus */ } l.stand(false); }
