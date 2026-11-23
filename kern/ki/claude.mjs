// Küchen-Kern · Ein Aufruf an Claude (Anthropic), direkt aus dem Gerät mit dem eigenen Schlüssel des Nutzers.
// Übernommen aus den alten Apps (triggerScan, Übersetzen, Labor): POST /v1/messages, Kopfzeilen für den Aufruf aus dem Browser.
//  - Drei Stufen wie bisher: schnell, standard, profi. Die Modelle sind die heutigen dieser Stufen (Haiku, Sonnet, Opus).
//  - Keine temperature/top_p, kein vorgefülltes Antwortstück, kein erzwungenes Werkzeug: die heutigen Modelle lehnen das ab (400).
//  - max_tokens großzügig: das Denken der Modelle zählt mit.
//  - Es geht nur hinaus, was der Aufrufer übergibt. Wer ein Bild oder PDF schickt, schickt die gereinigte Fassung (ki/reinigung.mjs).
import { text } from '../oberflaeche/sprache.mjs';

export const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';
export const STUFEN = {
  schnell: { modell: 'claude-haiku-5-5', name: ['Schnell', 'Fast'], dazu: ['günstig, für klare Vorlagen', 'low cost, for clear originals'] },
  standard: { modell: 'claude-sonnet-5-5', name: ['Standard', 'Standard'], dazu: ['gründlicher, für Handschrift und schwierige Fotos', 'more thorough, for handwriting and difficult photos'] },
  profi: { modell: 'claude-opus-5-5', name: ['Profi', 'Pro'], dazu: ['am genauesten, am teuersten', 'most accurate, most expensive'] },
};
export const MAX_TOKENS = 16000;
export const stufe = (s) => STUFEN[s] || STUFEN.schnell;

const kopf = (schluessel) => ({ 'content-type': 'application/json', 'x-api-key': schluessel, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' });
export const bildBlock = (dataUrl) => ({ type: 'image', source: { type: 'base64', media_type: String(dataUrl).slice(5).split(';')[0] || 'image/jpeg', data: String(dataUrl).split(',')[1] || '' } });

/** Der Text einer Antwort; wirft mit Klartext, wenn das Modell ablehnt oder die Antwort abgeschnitten ist. */
export function antwortText(antwort, sprache = 'de') {
  if (!antwort || !Array.isArray(antwort.content)) throw new Error(text(sprache, 'Die KI hat nicht geantwortet.', 'The AI did not answer.'));
  if (antwort.stop_reason === 'refusal') throw new Error(text(sprache, 'Die KI hat diese Anfrage abgelehnt.', 'The AI declined this request.'));
  const t = antwort.content.filter((b) => b && b.type === 'text').map((b) => b.text || '').join('').trim();
  if (!t) throw new Error(antwort.stop_reason === 'max_tokens' ? text(sprache, 'Die Antwort der KI war zu lang und wurde abgeschnitten.', 'The AI answer was too long and was cut off.') : text(sprache, 'Die KI hat nichts zurückgegeben.', 'The AI returned nothing.'));
  return t;
}

/** Fragt Claude. inhalt: Text oder Liste von Blöcken (Bild, Text). Zurück: der Antworttext. */
export async function frageClaude(schluessel, inhalt, { stufe: st = 'schnell', modell = null, maxTokens = MAX_TOKENS, system = '', hol = fetch, sprache = 'de' } = {}) {
  if (!schluessel) { const f = new Error(text(sprache, 'Es ist kein Anthropic-Schlüssel hinterlegt.', 'No Anthropic key is stored.')); f.keinSchluessel = true; throw f; }
  const koerper = { model: modell || stufe(st).modell, max_tokens: maxTokens, messages: [{ role: 'user', content: inhalt }] };
  if (system) koerper.system = system;
  let ant;
  try { ant = await hol(CLAUDE_URL, { method: 'POST', headers: kopf(schluessel), body: JSON.stringify(koerper) }); }
  catch { throw new Error(text(sprache, 'Keine Verbindung zu Anthropic. Besteht Internet?', 'No connection to Anthropic. Is there internet?')); }
  if (!ant.ok) {
    const j = await ant.json().catch(() => ({})), art = j.error?.type || '';
    const f = new Error(ant.status === 401 || art === 'authentication_error' ? text(sprache, 'Der Anthropic-Schlüssel wurde abgelehnt. Bitte prüfen.', 'The Anthropic key was rejected. Please check it.')
      : ant.status === 402 || art === 'billing_not_active' ? text(sprache, 'Anthropic meldet: kein Guthaben.', 'Anthropic reports: no credit.')
      : ant.status === 429 ? text(sprache, 'Anthropic meldet: zu viele Anfragen oder kein Guthaben.', 'Anthropic reports: too many requests or no credit.')
      : ant.status === 413 ? text(sprache, 'Die Anfrage war zu groß für die KI.', 'The request was too large for the AI.')
      : ant.status >= 500 ? text(sprache, 'Anthropic ist gerade überlastet. Bitte gleich noch einmal.', 'Anthropic is overloaded right now. Please try again shortly.')
      : (j.error?.message || 'HTTP ' + ant.status));
    f.status = ant.status; f.schluesselAbgelehnt = ant.status === 401 || art === 'authentication_error'; throw f;
  }
  return antwortText(await ant.json(), sprache);
}

/** Holt das JSON-Objekt aus einer KI-Antwort (JSON-Sanitizer der alten App): Zäune weg, vom ersten { bis zum letzten },
 *  rohe Zeilenumbrüche und Steuerzeichen in Zeichenketten entschärft. Wirft, wenn kein Objekt zu lesen ist. */
export function jsonAusAntwort(roh, sprache = 'de') {
  let t = String(roh || '').replace(/```json\s*|```\s*/g, '').trim();
  const a = t.indexOf('{'), e = t.lastIndexOf('}');
  if (a >= 0 && e > a) t = t.slice(a, e + 1);
  t = t.replace(/\r\n|\r|\n/g, ' ');
  let aus = '', inText = false, flucht = false;
  for (const c of t) {
    if (flucht) { aus += c; flucht = false; continue; }
    if (c === '\\') { aus += c; flucht = true; continue; }
    if (c === '"') { inText = !inText; aus += c; continue; }
    if (inText && c.charCodeAt(0) < 0x20) { if (c === '\t') aus += '\\t'; continue; }
    aus += c;
  }
  try { const o = JSON.parse(aus); if (o && typeof o === 'object') return o; } catch { /* unten */ }
  throw new Error(text(sprache, 'Die Antwort der KI ließ sich nicht lesen. Bitte noch einmal versuchen.', 'The AI answer could not be read. Please try again.'));
}
