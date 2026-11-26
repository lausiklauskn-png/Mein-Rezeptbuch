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

import { alsDatenAdresse, BILD_SPEICHER } from '../oberflaeche/bild.mjs';
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
function speicherFassung(bild) {
  const bw = bild.width || bild.naturalWidth, bh = bild.height || bild.naturalHeight, f = Math.min(1, BILD_SPEICHER.kante / Math.max(bw, bh));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bw * f)); c.height = Math.max(1, Math.round(bh * f));
  c.getContext('2d').drawImage(bild, 0, 0, c.width, c.height); return alsDatenAdresse(c);
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
  const netz = bildAufDeckel(bild, 1200, 0.90), store = speicherFassung(bild); if (bild && bild.close) bild.close();   /* Klaus 26.11.: das Rezeptbild in hoher Qualität (1600 px, WebP), was an die KI geht, bleibt klein */
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
/* Der Prüfer für Anweisungen an eine KI (assets/pruefer-mail.js, byte-gleich aus Workflow PDF). Fehlt er, wird ohne ihn gereinigt (benannte Grenze). */
async function mailPruefer() { try { if (!globalThis.PrueferMail) await skript(voll(ORT.assets + 'pruefer-mail.js')); return globalThis.PrueferMail || null; } catch { return null; } }
/* Welche Zeilen (Texte) richten sich an eine KI? Zurück: Menge der Zeilennummern. Ein "\n" davor, sonst hält der Prüfer die erste Zeile für einen Mailkopf. */
function anweisungsZeilen(PM, zeilen) {
  const aus = new Set(); if (!PM || !zeilen.length) return aus;
  try { for (const st of PM.pruefeMail('\n' + zeilen.join('\n')).stellen || []) if (st.kennung === 'KI-ANWEISUNG') aus.add(Math.max(1, st.zeile - 1) - 1); } catch { /* ohne Prüfer keine Aussage */ }
  return aus;
}
export const MARKE_KANTE = 1100, MARKE_ROT = '#d61e1e';
/* Die Fundstellen einer Seite sichtbar machen (Klaus 23.11.: „eine rote Fläche dahinter, und der weiße Text ist zu sehen“).
   c: die noch ungereinigte Seite; funde: [{ s, x, y, w, fh (Seiteneinheiten), versteckt }]; m: Bildpunkte je Einheit. */
function markeZeichnen(c, funde, m) {
  const f = Math.min(1, MARKE_KANTE / Math.max(c.width, c.height)), k = document.createElement('canvas'); k.width = Math.max(1, Math.round(c.width * f)); k.height = Math.max(1, Math.round(c.height * f));
  const g = k.getContext('2d'); g.drawImage(c, 0, 0, k.width, k.height); g.textBaseline = 'middle';
  let unten = 0;   /* damit sich zwei Marken nicht überdecken, rückt die nächste darunter */
  for (const t of funde) {
    const h = Math.max(18, Math.min(34, t.fh * m * f * 1.3)), schrift = Math.round(h * 0.62);
    g.font = `600 ${schrift}px system-ui, sans-serif`;
    const text = String(t.s).trim().replace(/\s+/g, ' ');
    if (!t.versteckt) {   /* sichtbarer Text: nur umranden, er ist ja zu lesen */
      const x = Math.max(0, t.x * m * f - 3), y = Math.max(0, (t.y - t.fh) * m * f - 3), w = Math.min(k.width - x, Math.max(t.w, t.fh) * m * f + 6), hh = Math.max(10, t.fh * 1.3 * m * f + 6);
      g.fillStyle = 'rgba(214,30,30,.16)'; g.fillRect(x, y, w, hh); g.lineWidth = 2; g.strokeStyle = MARKE_ROT; g.strokeRect(x + 1, y + 1, w - 2, hh - 2); continue;
    }
    const w = Math.min(k.width - 8, g.measureText(text).width + schrift);
    let x = Math.min(Math.max(4, t.x * m * f), Math.max(4, k.width - w - 4)), y = Math.min(Math.max(4, t.y * m * f - h), k.height - h - 4);
    if (y < unten && y + h > unten - h) y = Math.min(unten + 2, k.height - h - 4);
    unten = y + h;
    g.fillStyle = MARKE_ROT; g.fillRect(x, y, w, h); g.fillStyle = '#fff';
    let s = text; while (s.length > 4 && g.measureText(s).width > w - schrift) s = s.slice(0, -2); g.fillText(s === text ? s : s.slice(0, -1) + '…', x + schrift / 2, y + h / 2);
  }
  const u = k.toDataURL('image/jpeg', 0.86); k.width = k.height = 0; return u;
}
/** Ein PDF als Seitenbilder. Zurück: { bilder:[data:image/jpeg], liste:[{seite,text,grund,anweisung?}], marken:[{seite,bild}], seiten, gesamt }.
 *  liste: versteckter Text (grund winzig|aussen|unsichtbar), sichtbare Anweisungen an eine KI (grund 'anweisung') und entfernte
 *  Bild-Metadaten (grund 'meta'). marken: je Seite mit Fund ein Bild, auf dem die Stellen rot hinterlegt zu lesen sind.
 *  zudecken=true (Vorgabe): die Stellen sind in `bilder` zugedeckt; false: die Seiten gehen, wie sie gezeichnet sind („Drin lassen“).
 *  fortschritt(seite, von) meldet den Stand. */
export async function pdfFuersNetz(quelle, { fortschritt = () => {}, seitenMax = PDF_SEITEN_MAX, zudecken = true } = {}) {
  const RE = await reinigungLaden(), L = await pdfjsLaden(), PM = await mailPruefer();
  const pdf = await L.getDocument({ data: await bytesAus(quelle), isEvalSupported: false }).promise;   // isEvalSupported:false: CVE-2024-4367
  const n = Math.min(pdf.numPages, seitenMax), bilder = [], liste = [], marken = [];
  for (let i = 1; i <= n; i++) {
    fortschritt(i, n);
    const p = await pdf.getPage(i), v1 = p.getViewport({ scale: 1 }), vp = p.getViewport({ scale: Math.min(PDF_DPI / 72, PDF_MAX_KANTE / Math.max(v1.width, v1.height)) });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    await p.render({ canvasContext: x, viewport: vp }).promise;
    try {
      const img = x.getImageData(0, 0, c.width, c.height), tc = await p.getTextContent(), stuecke = [];
      for (const t of tc.items) {
        if (!t.str || !t.str.trim()) continue;
        const tr = L.Util.transform(vp.transform, t.transform);
        if (Math.abs(Math.atan2(tr[1], tr[0])) > 0.05) continue;   // schräger Text: nicht beurteilt (Grenze)
        const st = { s: t.str, x: tr[4] / vp.scale, y: tr[5] / vp.scale, w: t.width, fh: Math.hypot(tr[2], tr[3]) / vp.scale };
        st.grund = RE.versteckt(st, img, vp.scale); st.versteckt = !!st.grund; stuecke.push(st);
      }
      /* Zeilen bilden (Stücke auf gleicher Grundlinie) und je Zeile fragen, ob sie sich an eine KI richtet. */
      const zeilen = []; for (const st of stuecke) { const z = zeilen[zeilen.length - 1]; if (z && Math.abs(z[0].y - st.y) < Math.max(z[0].fh, st.fh) * 0.5 && z[0].versteckt === st.versteckt) z.push(st); else zeilen.push([st]); }
      const an = anweisungsZeilen(PM, zeilen.map((z) => z.map((st) => st.s).join(' ')));
      zeilen.forEach((z, nr) => { if (an.has(nr)) for (const st of z) { st.anweisung = true; if (!st.grund) st.grund = 'anweisung'; } });
      const funde = stuecke.filter((st) => st.grund);
      if (funde.length) {
        marken.push({ seite: i, bild: markeZeichnen(c, funde, vp.scale) });
        for (const st of funde) liste.push({ seite: i, text: st.s, grund: st.grund, ...(st.anweisung ? { anweisung: true } : {}) });
        if (zudecken) {
          for (const st of funde) if (st.versteckt) RE.zudecken(img, st, vp.scale);
          x.putImageData(img, 0, 0); x.fillStyle = '#fff';
          for (const st of funde) if (!st.versteckt) x.fillRect(st.x * vp.scale - 2, (st.y - st.fh * 1.1) * vp.scale, Math.max(st.w, st.fh) * vp.scale + 4, st.fh * 1.45 * vp.scale);   /* sichtbare Anweisung: weiß überdeckt */
        }
      }
    } catch { /* ohne Textebene bleibt die Seite, wie sie gezeichnet ist */ }
    const m = RE.datenAdresseOhneMeta(seiteJpeg(c));
    m.entfernt.forEach((e) => liste.push({ seite: i, text: e.art + ' (' + e.bytes + ' Byte)', grund: 'meta' }));
    bilder.push(m.url); c.width = c.height = 0; try { p.cleanup(); } catch { /* schon frei */ }
  }
  const gesamt = pdf.numPages; try { pdf.destroy(); } catch { /* schon frei */ }
  return { bilder, liste, marken, seiten: n, gesamt };
}
/** Die Funde, über die ein Mensch entscheidet (versteckter Text, Anweisungen an eine KI); Metadaten gehen still heraus. */
export const fundeZumEntscheiden = (liste) => (liste || []).filter((e) => e.grund !== 'meta');
/** Ein kurzer Name für das, was gefunden wurde: „Versteckter Text“ oder „Befehl an eine KI“ (mit Zahl ab zwei). */
export function fundName(liste, s = 'de') {
  const f = fundeZumEntscheiden(liste), n = f.length, ki = f.some((e) => e.anweisung || e.grund === 'anweisung');
  return (ki ? text(s, 'Befehl an eine KI', 'Instruction to an AI') : text(s, 'Versteckter Text', 'Hidden text')) + (n > 1 ? ' · ' + n : '');
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
const GRUND = { anweisung: ['Befehl an eine KI', 'instruction to an AI'], winzig: ['winzige Schrift', 'tiny text'], aussen: ['außerhalb der Seite', 'outside the page'], unsichtbar: ['auf der Seite nicht zu sehen', 'not visible on the page'], meta: ['Bild-Metadaten', 'image metadata'] };
export const grundText = (g, s = 'de') => (GRUND[g] ? text(s, GRUND[g][0], GRUND[g][1]) : String(g || ''));
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stueck = (e, s) => `<li data-ki-entfernt-stueck data-grund="${esc(e.grund)}"><b>${esc(grundText(e.grund, s))}</b>${e.seite ? ' · ' + esc(text(s, 'Seite', 'Page')) + ' ' + esc(e.seite) : ''}<br>„${esc(String(e.text).slice(0, 120))}“</li>`;
/** Inhalt des Halt-Hinweises: EINE Zeile („2 versteckte Stellen gehen nicht mit“), die Stellen selbst eingeklappt dahinter.
 *  Klaus 23.11.: keine Absätze; ein Kochbuch ist ein Bilderbuch. Die Knöpfe setzt die App („Ohne ihn senden“ / „Abbrechen“). */
export function haltHtml(name, liste, s = 'de') {
  const n = liste.length;
  return `<details class="ki-halt" data-ki-halt><summary>${esc(n === 1 ? text(s, '1 versteckte Stelle geht nicht mit', '1 hidden passage is not sent') : fuelle(text(s, '{0} versteckte Stellen gehen nicht mit', '{0} hidden passages are not sent'), n))}</summary>
   <p>${esc(fuelle(text(s, 'In „{0}“ steht Text, den man auf der Seite nicht sieht. Eine KI würde ihn lesen. Gesendet wird die Fassung ohne ihn; die Datei bleibt unverändert.', '“{0}” contains text you cannot see on the page. An AI would read it. The version without it is sent; the file stays unchanged.'), name || 'PDF'))}</p>
   <ul class="ki-liste">${liste.slice(0, 8).map((e) => stueck(e, s)).join('')}</ul>${n > 8 ? `<p><small>${esc(text(s, '… und weitere Stellen.', '… and more.'))}</small></p>` : ''}</details>`;
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
