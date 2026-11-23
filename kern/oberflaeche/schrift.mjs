// Küchen-Kern · Schrift-Regler: 85–150 % in 5er-Schritten, für die ganze App (Abgleich Mixarium Runde 3, Klaus 23.11.:
// „da kann ich nicht sehen, während ich etwas verändere, was verändert wird“). Beim Schieben wird nur die Variable --z
// gesetzt, nichts neu gezeichnet; sonst verliert der Regler den Finger. Im Stil: zoom:var(--z,1) auf dem Inhalt.
export const SCHRIFT_MIN = 85, SCHRIFT_MAX = 150, SCHRIFT_SCHRITT = 5;
export const schriftWert = (v) => { const n = Math.round((Number(v) || 100) / SCHRIFT_SCHRITT) * SCHRIFT_SCHRITT; return Math.min(SCHRIFT_MAX, Math.max(SCHRIFT_MIN, n)); };
export function schriftSetzen(el, prozent) { const w = schriftWert(prozent); el.style.setProperty('--z', String(w / 100)); return w; }
export const schriftRegler = (wert, sprache = 'de') => `<div class="schriftregler"><span aria-hidden="true" style="font-size:13px">A</span><input type="range" id="schriftregler" min="${SCHRIFT_MIN}" max="${SCHRIFT_MAX}" step="${SCHRIFT_SCHRITT}" value="${schriftWert(wert)}" aria-label="${sprache === 'de' ? 'Schriftgröße in Prozent' : 'Text size in percent'}"><span aria-hidden="true" style="font-size:21px">A</span><output id="schriftzahl">${schriftWert(wert)} %</output></div>`;
