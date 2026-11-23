// Küchen-Kern · KI-Schlüssel: Anthropic (Claude), OpenAI (Bilder), Mistral (Texterkennung, EU).
// Ein Schlüssel liegt NUR in diesem Gerät (Kern-Speicher) und kommt in keine Sicherung.
// Hat die bisherige App einen hinterlegt, gilt er weiter – gelesen, nie geändert. Wird hier ein Schlüssel gelöscht,
// merkt sich der Kern das (leerer Eintrag), damit der alte nicht still zurückkommt.
import { text, fuelle } from '../oberflaeche/sprache.mjs';

export const ANBIETER = {
  anthropic: { name: 'Anthropic', beginn: 'sk-ant-', seite: 'platform.claude.com/settings/keys',
    wofuer: ['Foto-Scan, Web-Import, Übersetzen und die übrigen KI-Helfer (Claude)', 'Photo scan, web import, translation and the other AI helpers (Claude)'] },
  openai: { name: 'OpenAI', beginn: 'sk-', seite: 'platform.openai.com/api-keys',
    wofuer: ['KI-Bilder', 'AI pictures'] },
  mistral: { name: 'Mistral', beginn: '', seite: 'console.mistral.ai/api-keys',
    wofuer: ['Texterkennung beim Foto-Scan (Mistral OCR, Rechenzentrum in der EU)', 'Text recognition for the photo scan (Mistral OCR, data centre in the EU)'] },
};
const eintrag = (a) => 'schluessel-' + a;
/** Die Seite des Anbieters, auf der man einen Schlüssel erstellt (Klaus 23.11.: Direktlink, „dass man schneller an den Punkt kommt“). */
export const schluesselAdresse = (a) => (ANBIETER[a] ? 'https://' + ANBIETER[a].seite : '');

/** lager: Kern-Speicher. altNamen: { anthropic: ['claudeKey9m'], … } – die Speicher-Namen der bisherigen App (nur lesen). */
/* Schon der Zugriff auf localStorage kann werfen (abgeschotteter Rahmen, gesperrter Speicher): dann gibt es keinen alten Schlüssel. */
const alterSpeicher = () => { try { return globalThis.localStorage; } catch { return null; } };
export function schluessel(lager, { altNamen = {}, alt = alterSpeicher() } = {}) {
  const ausAlt = (a) => { try { for (const n of altNamen[a] || []) { const v = alt && alt.getItem(n); if (v && String(v).trim()) return String(v).trim(); } } catch { /* kein Zugriff */ } return ''; };
  return {
    /** Der Schlüssel oder ''. */
    async hol(a) { const v = await lager.hol(eintrag(a)).catch(() => null); return v == null ? ausAlt(a) : String(v); },
    async da(a) { return !!(await this.hol(a)); },
    /** Speichert (getrimmt). Ein leerer Wert löscht. */
    async setz(a, wert) { await lager.setz(eintrag(a), String(wert || '').trim()); },
    /** Löscht: der Eintrag bleibt als leere Marke stehen, damit ein Schlüssel der alten App nicht wieder gilt. */
    async weg(a) { await lager.setz(eintrag(a), ''); },
    /** Übersicht für die Einstellungen: [{ id, name, da }] */
    async liste() { const aus = []; for (const id of Object.keys(ANBIETER)) aus.push({ id, name: ANBIETER[id].name, da: await this.da(id) }); return aus; },
  };
}

/** Sieht der Text wie ein Schlüssel dieses Anbieters aus? Kein Netz, nur die Form (Länge, Anfang, keine Leerzeichen). */
export function formPasst(a, wert) {
  const w = String(wert || '').trim(), b = (ANBIETER[a] || {}).beginn || '';
  return w.length >= 20 && !/\s/.test(w) && w.startsWith(b);
}
/** Kurzer Erklärtext für das „?“ am Schlüssel-Feld. */
export function erklaerung(a, sprache = 'de') {
  const A = ANBIETER[a]; if (!A) return '';
  return fuelle(text(sprache, 'Für: {0}. Den Schlüssel legst du selbst bei {1} an ({2}). Er bleibt nur in diesem Gerät, steht in keiner Sicherung und geht nur an {1}, wenn du die Funktion auslöst. Die Kosten rechnet {1} direkt mit dir ab.',
    'For: {0}. You create the key yourself at {1} ({2}). It stays on this device only, is in no backup and goes to {1} only when you start the function. {1} bills you directly.'), text(sprache, A.wofuer[0], A.wofuer[1]), A.name, A.seite);
}

/** Prüft einen Schlüssel beim Anbieter – nur auf Knopfdruck. Anthropic: eine kleinste Anfrage („Hi“, wenige Cent-Bruchteile);
 *  OpenAI und Mistral: die Liste der Modelle (kostenlos). Zurück: { ok, text }. Ein gültiger Schlüssel ohne Guthaben ist ok:true mit Hinweis. */
export async function pruefeSchluessel(a, wert, { hol = fetch, sprache = 'de' } = {}) {
  const A = ANBIETER[a], k = String(wert || '').trim();
  if (!A || !k) return { ok: false, text: text(sprache, 'Es ist kein Schlüssel eingetragen.', 'No key has been entered.') };
  let ant;
  try {
    if (a === 'anthropic') ant = await hol('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 16, messages: [{ role: 'user', content: 'Hi' }] }) });
    else ant = await hol(a === 'openai' ? 'https://api.openai.com/v1/models' : 'https://api.mistral.ai/v1/models', { headers: { Authorization: 'Bearer ' + k } });
  } catch { return { ok: false, text: fuelle(text(sprache, 'Keine Verbindung zu {0}. Besteht Internet?', 'No connection to {0}. Is there internet?'), A.name) }; }
  if (ant.ok) return { ok: true, text: text(sprache, 'Der Schlüssel funktioniert.', 'The key works.') };
  if (ant.status === 401 || ant.status === 403) return { ok: false, text: fuelle(text(sprache, '{0} lehnt diesen Schlüssel ab. Bitte vollständig neu kopieren.', '{0} rejects this key. Please copy it again in full.'), A.name) };
  if (ant.status === 402 || ant.status === 429) return { ok: true, text: fuelle(text(sprache, 'Der Schlüssel ist gültig, aber {0} meldet: kein Guthaben oder zu viele Anfragen.', 'The key is valid, but {0} reports: no credit or too many requests.'), A.name) };
  return { ok: false, text: fuelle(text(sprache, '{0} antwortet mit einem Fehler (HTTP {1}). Bitte später noch einmal.', '{0} answers with an error (HTTP {1}). Please try again later.'), A.name, ant.status) };
}
