// Küchen-Kern · Texterkennung mit Mistral OCR (Rechenzentrum in der EU), mit dem eigenen Schlüssel des Nutzers.
// Übernommen aus der alten App (SbkimOcr, Anbieter „mistral“): POST /v1/ocr, das Bild als data:-Adresse, Antwort als
// Markdown je Seite. Es geht nur das übergebene Bild hinaus – der Aufrufer schickt die verkleinerte, gereinigte Fassung.
import { text } from '../oberflaeche/sprache.mjs';

export const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr';
export const MISTRAL_OCR_MODELL = 'mistral-ocr-latest';
export const OCR_ZEIT_MS = 30000;

/** Putzt Markdown-Rauschen aus dem OCR-Text: Bild-Platzhalter weg, Link → nur Text, Überschriften-Zeichen weg. */
export function ocrTextPutzen(t) {
  if (!t || typeof t !== 'string') return '';
  return t.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/(^|\n)[ \t]{0,3}#{1,6}[ \t]+/g, '$1').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
const ausAntwort = (d) => (d && Array.isArray(d.pages) ? d.pages.map((p) => (p && (p.markdown || p.text)) || '').join('\n\n').trim() : d && typeof d.text === 'string' ? d.text.trim() : '');

/** Liest den Text eines Bildes (data:-Adresse). Zurück: { text, modell }. Wirft mit Klartext. */
export async function mistralOcr(schluessel, bild, { hol = fetch, modell = MISTRAL_OCR_MODELL, zeitMs = OCR_ZEIT_MS, sprache = 'de' } = {}) {
  if (!schluessel) { const f = new Error(text(sprache, 'Es ist kein Mistral-Schlüssel hinterlegt.', 'No Mistral key is stored.')); f.keinSchluessel = true; throw f; }
  if (!bild || !String(bild).startsWith('data:')) throw new Error(text(sprache, 'Es wurde kein Bild übergeben.', 'No picture was given.'));
  const ab = typeof AbortController === 'function' ? new AbortController() : null, uhr = ab ? setTimeout(() => ab.abort(), zeitMs) : null;
  let ant;
  try { ant = await hol(MISTRAL_OCR_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + schluessel }, body: JSON.stringify({ model: modell, document: { type: 'image_url', image_url: bild } }), signal: ab ? ab.signal : undefined }); }
  catch (e) { throw new Error(e && e.name === 'AbortError' ? text(sprache, 'Die Texterkennung hat zu lange gedauert.', 'Text recognition took too long.') : text(sprache, 'Keine Verbindung zu Mistral. Besteht Internet?', 'No connection to Mistral. Is there internet?')); }
  finally { if (uhr) clearTimeout(uhr); }
  if (!ant.ok) { const f = new Error(ant.status === 401 || ant.status === 403 ? text(sprache, 'Der Mistral-Schlüssel wurde abgelehnt. Bitte prüfen.', 'The Mistral key was rejected. Please check it.') : ant.status === 429 ? text(sprache, 'Mistral meldet: zu viele Anfragen. Bitte kurz warten.', 'Mistral reports: too many requests. Please wait a moment.') : text(sprache, 'Texterkennung fehlgeschlagen', 'Text recognition failed') + ' (HTTP ' + ant.status + ')'); f.status = ant.status; f.schluesselAbgelehnt = ant.status === 401 || ant.status === 403; throw f; }
  const d = await ant.json();
  return { text: ocrTextPutzen(ausAntwort(d)), modell: (d && typeof d.model === 'string' && d.model) || modell };
}
