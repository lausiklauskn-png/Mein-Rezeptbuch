// Küchen-Kern · Reinigung vor der KI (Klaus 2026-10-14: „Erst wenn etwas an eine KI geht, wird gereinigt“).
// Übernommen aus der alten App (bildFuersNetz, pdfFuersNetz, kiReiniger). Die Rechnung selbst steht in
// assets/reinigung.js (byte-gleich aus Workflow PDF) und wird erst geladen, wenn ein PDF hinausgehen soll.
//  - Ein FOTO geht nie als Original hinaus: neu gezeichnet (lange Kante 1200 px, JPEG), damit ohne Aufnahmedaten und Ort.
//    Ein Kamerafoto wird heruntergerechnet, nicht abgewiesen; der Deckel gilt für das, was hinausgeht (4 MB base64).
//    Lässt sich ein Foto nicht lesen, kommt '' zurück – der Aufrufer bricht ab und sagt es.
//  - Ein PDF geht nie roh hinaus: jede Seite als Bild mit 300 dpi, versteckter Text in der Kopie zugedeckt
//    (weiß auf weiß, unsichtbar gesetzt, winzig, außerhalb der Seite), Bild-Metadaten heraus. Höchstens 10 Seiten.
//  - Wurde etwas zugedeckt, hält der Sendevorgang EINMAL an („Ohne ihn senden“ / „Abbrechen“); nach „Abbrechen“ geht
//    nichts hinaus. Was entfernt wurde, wird am Rezept vermerkt (kiEntfernt).
// Grenzen (benannt): Text über einem Foto oder über sichtbarer Schrift bleibt · schräger Text wird nicht beurteilt ·
// pdf.js liegt im Netz neben Workflow PDF (`vendor`); ohne diese Adresse geht kein PDF hinaus.
import { text, fuelle } from '../oberflaeche/sprache.mjs';

export const BILD_NETZ_B64_MAX = 4 * 1024 * 1024, BILD_NETZ_STUFEN = [1200, 900, 700, 500, 380], BILD_ROH_MAX = 40 * 1024 * 1024;
export const PDF_SEITEN_MAX = 10, PDF_DPI = 300, PDF_MAX_KANTE = 5000, PDF_JPEG_GUETE = 0.92;
const ORT = { assets: '../assets/', vendor: '/Workflow-PDF/vendor/' };
/** Wo die Bausteine liegen: assets (reinigung.js, Prüfkern) und vendor (pdf.js, Texterkennung). */
export function orte(neu) { Object.assign(ORT, neu || {}); return { ...ORT }; }
const voll = (p) => new URL(p, globalThis.location ? globalThis.location.href : 'http://localhost/').href;

const b64Bytes = (u) => { const s = String(u || ''), i = s.indexOf(','); return i < 0 ? s.length : s.length - i - 1; };
function ueberImage(quelle) {
  return new Promise((ja, nein) => {
    const img = new Image(); img.onload = () => ja(img); img.onerror = () => nein(new Error('Bild nicht lesbar'));
    if (typeof Blob !== 'undefined' && quelle instanceof Blob) { const fr = new FileReader(); fr.onload = (e) => { img.src = e.target.result; }; fr.onerror = () => nein(new Error('Datei nicht lesbar')); fr.readAsDataURL(quelle); } else img.src = quelle;
  });
}
function dekodieren(quelle) {
  if (typeof Blob !== 'undefined' && quelle instanceof Blob && typeof createImageBitmap === 'function') return createImageBitmap(quelle).catch(() => ueberImage(quelle));
  return ueberImage(quelle);
}
function aufKante(bild, kante, guete) {
  const bw = bild.width || bild.naturalWidth, bh = bild.height || bild.naturalHeight, f = Math.min(1, kante / Math.max(bw, bh));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bw * f)); c.height = Math.max(1, Math.round(bh * f));
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bild, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', guete);
}
/** Zeichnet auf die Kante; passt das Ergebnis nicht unter den Deckel, geht es stufenweise kleiner (fail-soft: das kleinste). */
export function bildAufDeckel(bild, kante, guete, deckel) {
  const max = typeof deckel === 'number' && deckel > 0 ? deckel : BILD_NETZ_B64_MAX;
  let aus = aufKante(bild, kante, guete);
  if (b64Bytes(aus) <= max) return aus;
  for (const k of BILD_NETZ_STUFEN) { if (k >= kante) continue; aus = aufKante(bild, k, Math.min(guete, 0.82)); if (b64Bytes(aus) <= max) break; }
  return aus;
}
/** Der eine Weg, auf dem ein Foto an eine KI geht. Datei oder data:-Adresse → verkleinerte JPEG-Adresse, oder '' (nicht lesbar). */
export async function bildFuersNetz(quelle, kante = 1200, guete = 0.90, deckel) {
  let bild; try { bild = await dekodieren(quelle); } catch { return ''; }
  const aus = bildAufDeckel(bild, kante, guete, deckel); if (bild && bild.close) bild.close();
  return aus;
}
/** Ein Kamerafoto, EIN Dekodier-Durchgang, zwei Ergebnisse: was an die KI geht (netz) und was als Rezeptbild bleibt (store). */
export async function scanBildAufbereiten(datei) {
  let bild; try { bild = await dekodieren(datei); } catch { return null; }
  const netz = bildAufDeckel(bild, 1200, 0.90), store = aufKante(bild, 1024, 0.82); if (bild && bild.close) bild.close();
  return { netz, store };
}

const skript = (src) => new Promise((ja, nein) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = () => ja(); s.onerror = () => nein(new Error('lädt nicht: ' + src.split('?')[0])); document.head.appendChild(s); });
export async function reinigungLaden() { if (!(globalThis.WFP && globalThis.WFP.Reinigung)) await skript(voll(ORT.assets + 'reinigung.js')); if (!(globalThis.WFP && globalThis.WFP.Reinigung)) throw new Error('Reinigung fehlt'); return globalThis.WFP.Reinigung; }
export async function pdfjsLaden() { const basis = voll(ORT.vendor + 'pdfjs/'); if (!globalThis.pdfjsLib) { await skript(basis + 'pdf.min.js'); globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc = basis + 'pdf.worker.min.js'; } return globalThis.pdfjsLib; }
export async function bytesAus(q) {
  if (q instanceof Uint8Array) return q;
  if (typeof q === 'string') { const b = atob(q.split(',')[1] || ''), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  return new Uint8Array(await q.arrayBuffer());
}
/* Seitenbild als JPEG: 92 %; zu groß → 85 %; immer noch zu groß → kleiner gezeichnet (aus der schon gereinigten Leinwand). */
function seiteJpeg(c, deckel = BILD_NETZ_B64_MAX) {
  let u = c.toDataURL('image/jpeg', PDF_JPEG_GUETE); if (u.length <= deckel) return u;
  u = c.toDataURL('image/jpeg', 0.85); if (u.length <= deckel) return u;
  const f = Math.sqrt(deckel / u.length) * 0.95, k = document.createElement('canvas'); k.width = Math.max(1, Math.round(c.width * f)); k.height = Math.max(1, Math.round(c.height * f));
  const kx = k.getContext('2d'); kx.fillStyle = '#fff'; kx.fillRect(0, 0, k.width, k.height); kx.drawImage(c, 0, 0, k.width, k.height); u = k.toDataURL('image/jpeg', 0.85); k.width = k.height = 0; return u;
}
/** Ein PDF als Seitenbilder. Zurück: { bilder:[data:image/jpeg], liste:[{seite,text,grund}], seiten, gesamt }.
 *  fortschritt(seite, von) meldet den Stand. */
export async function pdfFuersNetz(quelle, { fortschritt = () => {}, seitenMax = PDF_SEITEN_MAX } = {}) {
  const RE = await reinigungLaden(), L = await pdfjsLaden();
  const pdf = await L.getDocument({ data: await bytesAus(quelle), isEvalSupported: false }).promise;   // isEvalSupported:false: CVE-2024-4367
  const n = Math.min(pdf.numPages, seitenMax), bilder = [], liste = [];
  for (let i = 1; i <= n; i++) {
    fortschritt(i, n);
    const p = await pdf.getPage(i), v1 = p.getViewport({ scale: 1 }), vp = p.getViewport({ scale: Math.min(PDF_DPI / 72, PDF_MAX_KANTE / Math.max(v1.width, v1.height)) });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    await p.render({ canvasContext: x, viewport: vp }).promise;
    let zu = 0;
    try {
      const img = x.getImageData(0, 0, c.width, c.height), tc = await p.getTextContent();
      for (const t of tc.items) {
        if (!t.str || !t.str.trim()) continue;
        const tr = L.Util.transform(vp.transform, t.transform);
        if (Math.abs(Math.atan2(tr[1], tr[0])) > 0.05) continue;   // schräger Text: nicht beurteilt (Grenze)
        const st = { s: t.str, x: tr[4] / vp.scale, y: tr[5] / vp.scale, w: t.width, fh: Math.hypot(tr[2], tr[3]) / vp.scale };
        const g = RE.versteckt(st, img, vp.scale);
        if (g) { liste.push({ seite: i, text: t.str, grund: g }); RE.zudecken(img, st, vp.scale); zu++; }
      }
      if (zu) x.putImageData(img, 0, 0);
    } catch { /* ohne Textebene bleibt die Seite, wie sie gezeichnet ist */ }
    const m = RE.datenAdresseOhneMeta(seiteJpeg(c));
    m.entfernt.forEach((e) => liste.push({ seite: i, text: e.art + ' (' + e.bytes + ' Byte)', grund: 'meta' }));
    bilder.push(m.url); c.width = c.height = 0; try { p.cleanup(); } catch { /* schon frei */ }
  }
  const gesamt = pdf.numPages; try { pdf.destroy(); } catch { /* schon frei */ }
  return { bilder, liste, seiten: n, gesamt };
}

/** Hält einen Sendevorgang EINMAL an. frage(name, liste) → Promise<true|false> zeigt den Dialog (Sache der App).
 *  Zurück: { halt(name, liste) → darf gesendet werden?, st: { gefragt, ok, n } }. Nach „Abbrechen“ bleibt ok false. */
export function reiniger(frage) {
  const st = { gefragt: false, ok: true, n: 0 };
  return { st, async halt(name, liste) { if (!liste || !liste.length) return st.ok; if (!st.gefragt) { st.gefragt = true; st.ok = !!(await frage(name, liste)); } if (st.ok) st.n += liste.length; return st.ok; } };
}
/** Der Vermerk am Rezept (kiEntfernt), erst NACH „Ohne ihn senden“. Zurück: Zahl der neuen Vermerke. */
export function vermerken(rezept, liste, weg = 'scan') { const R = globalThis.WFP && globalThis.WFP.Reinigung; if (!rezept || !liste || !liste.length || !R) return 0; return R.vermerken(rezept, liste, weg); }

/* ---------- Texte (de/en im Code, die übrigen Sprachen über die Tabellen) ---------- */
const GRUND = { winzig: ['winzige Schrift', 'tiny text'], aussen: ['außerhalb der Seite', 'outside the page'], unsichtbar: ['auf der Seite nicht zu sehen', 'not visible on the page'], meta: ['Bild-Metadaten', 'image metadata'] };
export const grundText = (g, s = 'de') => (GRUND[g] ? text(s, GRUND[g][0], GRUND[g][1]) : String(g || ''));
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stueck = (e, s) => `<li data-ki-entfernt-stueck data-grund="${esc(e.grund)}"><b>${esc(grundText(e.grund, s))}</b>${e.seite ? ' · ' + esc(text(s, 'Seite', 'Page')) + ' ' + esc(e.seite) : ''}<br>„${esc(String(e.text).slice(0, 120))}“</li>`;
/** Inhalt des Halt-Dialogs (ohne Knöpfe; die setzt die App: „Ohne ihn senden“ / „Abbrechen“). */
export function haltHtml(name, liste, s = 'de') {
  return `<div data-ki-halt><p>${esc(fuelle(text(s, 'In „{0}“ steht Text, den man auf der Seite nicht sieht. Eine KI würde ihn trotzdem lesen.', '“{0}” contains text you cannot see on the page. An AI would still read it.'), name || 'PDF'))}</p>
   <ul class="ki-liste">${liste.slice(0, 8).map((e) => stueck(e, s)).join('')}</ul>${liste.length > 8 ? `<p><small>${esc(text(s, '… und weitere Stellen.', '… and more.'))}</small></p>` : ''}
   <p>${esc(text(s, 'Gesendet wird die sichere Fassung, ohne diesen Text. Die Datei selbst bleibt unverändert.', 'The safe version is sent, without this text. The file itself stays unchanged.'))}</p></div>`;
}
export const HALT_JA = ['Ohne ihn senden', 'Send without it'], HALT_TITEL = ['Versteckten Text gefunden', 'Hidden text found'];
/** Der Vermerk auf der Rezeptseite: aufklappbar, was vor dem Senden entfernt wurde. '' wenn nichts vermerkt ist. */
export function vermerkHtml(rezept, s = 'de') {
  const l = Array.isArray(rezept && rezept.kiEntfernt) ? rezept.kiEntfernt : []; if (!l.length) return '';
  return `<details class="ki-vermerk" data-ki-entfernt><summary>${esc(text(s, 'Vor dem Senden an eine KI entfernt', 'Removed before sending to an AI'))} · ${l.length}</summary><p>${esc(text(s, 'Dieser Text stand in der Datei, war auf der Seite aber nicht zu sehen. Er ging nicht mit.', 'This text was in the file but not visible on the page. It was not sent.'))}</p><ul class="ki-liste">${l.map((v) => stueck(v, s)).join('')}</ul></details>`;
}
export const MELDUNG = {
  abgebrochen: ['Senden abgebrochen. Nichts ging an die KI.', 'Sending cancelled. Nothing went to the AI.'],
  fotoKaputt: ['Dieses Foto ließ sich nicht lesen. Es wurde nichts gesendet.', 'This photo could not be read. Nothing was sent.'],
  pdfKaputt: ['Das PDF ließ sich nicht zeichnen. Es wurde nichts gesendet.', 'The PDF could not be drawn. Nothing was sent.'],
  seitenMax: ['Nur die ersten {0} von {1} Seiten gehen an die KI.', 'Only the first {0} of {1} pages go to the AI.'],
  zuGross: ['Die Datei ist größer als {0} MB und wurde nicht eingelesen.', 'The file is larger than {0} MB and was not read.'],
};
export const meldung = (k, s = 'de', ...w) => fuelle(text(s, MELDUNG[k][0], MELDUNG[k][1]), ...w);
