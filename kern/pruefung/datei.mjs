// Küchen-Kern · „Datei prüfen“ (Klaus 2026-10-14: „Auf Knopfdruck“) und die Prüfung eines Textes auf Anweisungen an eine KI.
// Der Prüfkern ist der des Auslieferungsprüfers aus Workflow PDF, byte-gleich unter assets/ (pruefer-formate.js,
// pruefer-mail.js, pruefer-anhang.js). Er wird erst auf Knopfdruck geladen und rechnet im Gerät, ohne Netz.
// Diese Datei ist der Klebstoff (Vorbild assets/eingang.js): sie prüft die ORIGINALDATEI, markiert und entfernt nichts.
// Gemeldet wird, was eine KI oder einen Menschen täuschen soll. Es ist keine Virenprüfung, und „ungeprüft“ heißt nicht „sauber“.
// Für PDFs und Text in Bildern braucht der Kern pdf.js und die Texterkennung aus `vendor` (im Netz neben Workflow PDF);
// fehlen sie, sagt die Prüfung „ungeprüft“ mit Grund.
import { text } from '../oberflaeche/sprache.mjs';
import { orte } from '../ki/reinigung.mjs';

const KERN = ['pruefer-formate.js', 'pruefer-mail.js', 'pruefer-anhang.js'];
export const WARN = ['KI-ANWEISUNG', 'PDF-KI-ANWEISUNG', 'BILD-KI-ANWEISUNG', 'PDF-VERSTECKTER-TEXT', 'VERSTECKTER-TEXT', 'BILD-LSB-VERDACHT', 'PDF-ANHANG', 'ANHANG-PROGRAMM', 'ANHANG-TARNUNG'];
const NAME = {
  'KI-ANWEISUNG': ['Anweisung an eine KI im Text', 'Instruction to an AI in the text'], 'PDF-KI-ANWEISUNG': ['Anweisung an eine KI im Text', 'Instruction to an AI in the text'],
  'BILD-KI-ANWEISUNG': ['Anweisung an eine KI im Bild', 'Instruction to an AI in the picture'], 'PDF-VERSTECKTER-TEXT': ['Unsichtbarer Text im PDF', 'Invisible text in the PDF'],
  'VERSTECKTER-TEXT': ['Unsichtbarer Text', 'Invisible text'], 'BILD-LSB-VERDACHT': ['Verdacht: versteckter Text in den Bildpunkten', 'Suspicion: hidden text in the pixels'],
  'PDF-ANHANG': ['Im PDF steckt eine weitere Datei', 'The PDF contains another file'], 'ANHANG-PROGRAMM': ['Das ist ein Programm', 'This is a program'], 'ANHANG-TARNUNG': ['Die Endung passt nicht zum Inhalt', 'The file ending does not match the content'],
};
export const fundName = (k, s = 'de') => (NAME[k] ? text(s, NAME[k][0], NAME[k][1]) : k);
const MARKE_KANTE = 1600;
const voll = (p) => new URL(p, globalThis.location.href).href;
const skript = (src) => new Promise((ja, nein) => { const el = document.createElement('script'); el.src = src; el.async = false; el.onload = () => ja(); el.onerror = () => nein(new Error('Datei fehlt: ' + src.split('?')[0].split('/').pop())); document.head.appendChild(el); });

let bereitP = null;
/** Lädt den Prüfkern (einmal) und sagt ihm, wo pdf.js und die Texterkennung liegen. */
export function pruefKern() {
  if (bereitP) return bereitP;
  bereitP = (async () => {
    const o = orte();
    for (const d of KERN) if (!(d === 'pruefer-mail.js' && globalThis.PrueferMail) && !(d === 'pruefer-anhang.js' && globalThis.PrueferAnhang)) await skript(voll(o.assets + d));
    const A = globalThis.PrueferAnhang;
    if (!A || !A.pruefe) throw new Error('der Prüfkern meldet sich nicht');
    A.pfade({ pdfjs: voll(o.vendor + 'pdfjs/'), tesseract: voll(o.vendor + 'tesseract/') });
    return A;
  })();
  bereitP.catch(() => { bereitP = null; });
  return bereitP;
}
async function markiert(A, bytes, befunde) {
  try {
    const c = await A.markieren(bytes, befunde); if (!c) return null;
    const f = Math.min(1, MARKE_KANTE / Math.max(c.width, c.height)), k = document.createElement('canvas'); k.width = Math.round(c.width * f); k.height = Math.round(c.height * f);
    k.getContext('2d').drawImage(c, 0, 0, k.width, k.height); return k.toDataURL('image/jpeg', 0.85);
  } catch { return null; }
}
/** Prüft eine Datei. Zurück: { stand:'warnung'|'sauber'|'ungeprueft', funde:[{kennung,satz}], schritte:[…], hinweise:[…], markiert, art }.
 *  Wirft nie: was schiefgeht, heißt „ungeprueft“ mit Grund. */
export async function dateiPruefen(name, quelle) {
  try {
    const A = await pruefKern();
    const b = quelle instanceof Uint8Array ? quelle : new Uint8Array(quelle instanceof ArrayBuffer ? quelle : await quelle.arrayBuffer());
    const r = await A.pruefe(name || 'datei', b);
    let alle = r.befunde.slice(), hinweise = r.hinweise.slice();
    if (/^(png|webp)$/.test(r.art) && A.verdachtPruefen) { const v = await A.verdachtPruefen(name, b); if (v.geprueft) alle = alle.concat(v.befunde); else if (r.art === 'png') hinweise.push(v.grund); hinweise = hinweise.concat(v.hinweise || []); }
    const warn = alle.filter((x) => WARN.includes(x.kennung)), funde = warn.map((x) => ({ kennung: x.kennung, satz: x.satz }));
    const schritte = []; for (const x of funde) for (const s of (A.wasTun ? A.wasTun(x.kennung) : []) || []) if (!schritte.includes(s)) schritte.push(s);
    return { stand: funde.length ? 'warnung' : r.bildUngeprueft ? 'ungeprueft' : 'sauber', funde, schritte, hinweise, markiert: funde.length ? await markiert(A, b, warn) : null, art: r.art };
  } catch (e) { return { stand: 'ungeprueft', funde: [], schritte: [], hinweise: ['Die Prüfung lief nicht: ' + ((e && e.message) || e)], markiert: null, art: '' }; }
}
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const STAND = { warnung: ['Auffällig', 'Suspicious'], sauber: ['Nichts Auffälliges gefunden', 'Nothing suspicious found'], ungeprueft: ['Nicht vollständig geprüft', 'Not fully checked'] };
/** Das Ergebnis als HTML für ein Fenster der App. */
export function pruefHtml(p, s = 'de') {
  return `<div data-pruef-dialog="${esc(p.stand)}"><p class="pruef-stand ${esc(p.stand)}" data-pruef-stand><b>${esc(text(s, STAND[p.stand][0], STAND[p.stand][1]))}</b>${p.stand === 'ungeprueft' ? ' · ' + esc(text(s, '„ungeprüft“ heißt nicht „sauber“', '“unchecked” does not mean “clean”')) : ''}</p>
   ${p.funde.length ? `<ul class="ki-liste" data-pruef-funde>${p.funde.map((x) => `<li data-kennung="${esc(x.kennung)}"><b>${esc(fundName(x.kennung, s))}</b><br>${esc(x.satz || '')}</li>`).join('')}</ul>` : ''}
   ${p.schritte.length ? `<p><b>${esc(text(s, 'Was jetzt tun', 'What to do now'))}</b></p><ol class="ki-liste" data-was-tun>${p.schritte.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>` : ''}
   ${p.markiert ? `<img class="pruef-bild" data-pruef-markiert src="${esc(p.markiert)}" alt="">` : ''}
   ${(p.hinweise || []).slice(0, 4).map((t) => `<p><small>${esc(t)}</small></p>`).join('')}</div>`;
}
export const PRUEF_ERKLAERUNG = ['Geprüft wird die Originaldatei, im Gerät und ohne Netz. Gesucht wird nach versteckten Anweisungen an eine KI, unsichtbarem Text und Tarnungen. Es wird nichts entfernt. Das ist keine Virenprüfung.', 'The original file is checked on this device, offline. It looks for hidden instructions to an AI, invisible text and disguises. Nothing is removed. This is not a virus scan.'];

/** Stehen in einem Text Anweisungen an eine KI? (Bildauftrag, Suchfrage.) Zurück: die Stellen; [] wenn nichts oder der Prüfer fehlt. */
export async function kiAnweisungen(t) {
  try { if (!globalThis.PrueferMail) await skript(voll(orte().assets + 'pruefer-mail.js')); } catch { return []; }   // fail-soft: ohne Prüfer kein Halt (benannte Grenze)
  try { return ((globalThis.PrueferMail.pruefeMail(String(t || '')).stellen) || []).filter((x) => x.kennung === 'KI-ANWEISUNG'); } catch { return []; }
}
