// Küchen-Kern · Sprache der Oberfläche. Acht Sprachen wie in den alten Apps; die erste Wahl folgt dem Gerät.
// Deutsch ist die Quelle, Englisch steht im Code daneben: text(sprache, 'Speichern', 'Save').
// Die übrigen sechs Sprachen kommen aus Tabellen, die den DEUTSCHEN Text als Schlüssel tragen
// (tabelle('fr', { 'Speichern': 'Enregistrer' })). Fehlt ein Eintrag, steht Englisch da – nie ein Schlüsselname.
// Sätze mit Zahlen oder Namen laufen über fuelle(): text(s, '{0} Rezepte dazu', '{0} recipes added') → fuelle(…, 3).
export const SPRACHEN = [['de', 'Deutsch'], ['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['it', 'Italiano'], ['pt', 'Português'], ['ru', 'Русский'], ['zh', '中文']];
const TAB = {};

export const kennt = (code) => SPRACHEN.some(([c]) => c === code);
export const sprachName = (code) => (SPRACHEN.find(([c]) => c === code) || [])[1] || code;

/** Die Sprache des Geräts, wenn die App sie kann; sonst Englisch. */
export function geraeteSprache(nav = globalThis.navigator) {
  const wunsch = [...((nav && nav.languages) || []), nav && nav.language].filter(Boolean);
  for (const l of wunsch) { const c = String(l).slice(0, 2).toLowerCase(); if (kennt(c)) return c; }
  return wunsch.length ? 'en' : 'de';
}
/** Gewählte Sprache oder die des Geräts. `gewaehlt` leer/null heißt „wie das Gerät“. */
export const sprache = (gewaehlt, nav) => (kennt(gewaehlt) ? gewaehlt : geraeteSprache(nav));

/** Trägt Übersetzungen für eine Sprache ein (mehrfach möglich, spätere Einträge gewinnen). */
export function tabelle(code, eintraege) { if (!kennt(code) || !eintraege) return; TAB[code] = Object.assign(TAB[code] || {}, eintraege); }
export const tabelleVon = (code) => TAB[code] || {};

/** Der Text in der Sprache: Deutsch, Englisch oder aus der Tabelle; ohne Eintrag Englisch, ohne Englisch Deutsch. */
export function text(code, de, en) {
  if (code === 'de') return de;
  if (code === 'en') return en ?? de;
  const t = TAB[code]; return (t && Object.prototype.hasOwnProperty.call(t, de) ? t[de] : null) ?? en ?? de;
}
/** Setzt {0}, {1} … ein. */
export const fuelle = (muster, ...werte) => String(muster).replace(/\{(\d)\}/g, (_, i) => (werte[+i] == null ? '' : String(werte[+i])));

/** Gebietsschema für Datum und Zahlen. */
const ORT = { de: 'de-DE', en: 'en-GB', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', pt: 'pt-PT', ru: 'ru-RU', zh: 'zh-CN' };
export const gebiet = (code) => ORT[code] || 'en-GB';

/** Lädt die Tabelle einer Sprache nach (ES-Modul mit `export default {…}`); Deutsch und Englisch brauchen keine. */
export async function ladeTabelle(code, adressen = []) {
  if (code === 'de' || code === 'en' || !kennt(code)) return false;
  let da = false;
  for (const a of adressen) { try { const m = await import(a); tabelle(code, m.default || m.tabelle || {}); da = true; } catch { /* fehlt: Englisch bleibt stehen */ } }
  return da;
}
