// Küchen-Kern · Kategorien
// Eine Liste, eine Wahrheit: Leiste, Ordner-Baum, Zähler, Sicherung lesen alle `alleKategorien()`.
// Eigene Kategorien (Name, Symbol), Umbenennungen, Ausblendungen und die Reihenfolge gehören zum Zustand
// und damit IN DIE SICHERUNG. Die alte App hielt sie nur im Browser; nach einem Import hieß „Sushi“ dann „eig_1789…“.
import { KATEGORIEN_FEST } from './kategorien-fest.mjs';
import { KAT_OHNE, katVonRezept, istInhalt } from './rezept.mjs';

export { KATEGORIEN_FEST, KAT_OHNE };
export const SPRACHEN = ['de', 'en', 'ru', 'zh', 'es', 'fr', 'it', 'pt'];
const OHNE_NAME = { de: 'Ohne Kategorie', en: 'No category', ru: 'Без категории', zh: '未分类', es: 'Sin categoría', fr: 'Sans catégorie', it: 'Senza categoria', pt: 'Sem categoria' };

/** Leerer Kategorie-Zustand. eigene: [{id, de, …, symbol}], namen: {id: {name, symbol}}, ausgeblendet: [id], folge: [id] */
export const leereKategorien = () => ({ eigene: [], namen: {}, ausgeblendet: [], folge: [] });

export function anzahl(rezepte, id) { return rezepte.filter((r) => istInhalt(r) && katVonRezept(r) === id).length; }

/** Alle Kategorien in Anzeige-Reihenfolge. Jede Kennung genau einmal. Ausgeblendet wird nur, was leer ist. */
export function alleKategorien(rezepte, kat = leereKategorien(), fest = KATEGORIEN_FEST) {
  const aus = new Set((kat.ausgeblendet || []).map(String).filter((id) => anzahl(rezepte, id) === 0));
  const liste = [], gesehen = new Set();
  const nimm = (c) => { const id = String(c.id); if (!id || gesehen.has(id) || aus.has(id)) return; gesehen.add(id); liste.push({ ...c, id }); };
  fest.forEach((c) => nimm({ ...c, art: 'fest' }));
  (kat.eigene || []).forEach((c) => nimm({ ...c, art: 'eigen' }));
  let ohne = 0;
  for (const r of rezepte) {
    if (!istInhalt(r)) continue;
    const id = katVonRezept(r);
    if (id === KAT_OHNE) { ohne++; continue; }
    if (!gesehen.has(id)) nimm({ id, de: id, symbol: 'paket', art: 'unbekannt' });   // nie einen Namen raten
  }
  if (ohne > 0) nimm({ id: KAT_OHNE, ...OHNE_NAME, symbol: 'frage', art: 'ohne' });
  const folge = (kat.folge || []).map(String);
  if (folge.length) {
    const pos = new Map(folge.map((id, i) => [id, i])), platz = new Map(liste.map((c, i) => [c.id, i]));
    liste.sort((a, b) => (pos.has(a.id) ? pos.get(a.id) : folge.length + platz.get(a.id)) - (pos.has(b.id) ? pos.get(b.id) : folge.length + platz.get(b.id)));
  }
  return liste;
}

/** Angezeigter Name: eigener Name gewinnt (gilt in allen Sprachen), sonst die Sprache, sonst Deutsch, sonst die Kennung. */
export function beschriftung(c, sprache = 'de', kat = leereKategorien()) {
  const eigen = kat.namen?.[c.id]?.name;
  return (eigen && String(eigen).trim()) || c[sprache] || c.de || c.id;
}
export function symbol(c, kat = leereKategorien()) { return kat.namen?.[c.id]?.symbol || c.symbol || 'karte'; }

/** Gruppen für „Alle“: jede Kategorie mit ihren Rezepten, leere fallen weg. Jedes Rezept mit Namen steht in genau einer Gruppe. */
export function gruppiere(rezepte, kat = leereKategorien(), fest = KATEGORIEN_FEST) {
  return alleKategorien(rezepte, kat, fest).map((c) => ({ kategorie: c, rezepte: rezepte.filter((r) => istInhalt(r) && katVonRezept(r) === c.id) })).filter((g) => g.rezepte.length);
}

export function anlegen(kat, name, symbolName = 'karte') {
  const id = 'eig_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return { kat: { ...kat, eigene: [...(kat.eigene || []), { id, de: String(name || '').trim() || 'Neue Kategorie', symbol: symbolName }] }, id };
}
export function umbenennen(kat, id, name, symbolName) {
  const namen = { ...(kat.namen || {}) }; const e = { ...(namen[id] || {}) };
  if (name !== undefined) { if (String(name).trim()) e.name = String(name).trim(); else delete e.name; }
  if (symbolName !== undefined) { if (symbolName) e.symbol = symbolName; else delete e.symbol; }
  if (Object.keys(e).length) namen[id] = e; else delete namen[id];
  return { ...kat, namen };
}
/** Löschen heißt umhängen. ziel: Kennung, '' (ausdrücklich ohne Kategorie) oder null (nichts zu verschieben). */
export function loeschen(rezepte, kat, id, ziel, festListe = KATEGORIEN_FEST) {
  const betroffen = rezepte.filter((r) => katVonRezept(r) === id && istInhalt(r));
  if (betroffen.length && ziel == null) throw new Error('Kategorie hat Rezepte: Ziel nötig');
  const neu = rezepte.map((r) => (katVonRezept(r) === id ? { ...r, cat: ziel || '' } : r));
  const eigene = (kat.eigene || []).filter((c) => String(c.id) !== String(id));
  const fest = festListe.some((c) => c.id === id);
  const namen = { ...(kat.namen || {}) }; delete namen[id];
  return { rezepte: neu, kat: { ...kat, eigene, namen, ausgeblendet: fest ? [...new Set([...(kat.ausgeblendet || []), id])] : (kat.ausgeblendet || []), folge: (kat.folge || []).filter((x) => String(x) !== String(id)) }, verschoben: betroffen.length };
}
/** Reihenfolge: die ganze Liste wird neu geschrieben, nie nur ergänzt. */
export function umsortieren(rezepte, kat, id, vorId, fest = KATEGORIEN_FEST) {
  const ids = alleKategorien(rezepte, kat, fest).map((c) => c.id).filter((x) => x !== id);
  const i = vorId == null ? ids.length : ids.indexOf(vorId);
  ids.splice(i < 0 ? ids.length : i, 0, id);
  return { ...kat, folge: ids };
}

/** Dieselben Werkzeuge mit den festen Kategorien einer anderen Ausgabe (Mixarium: Getränke statt Essen).
 *  Ohne diesen Weg gilt überall die Liste des Rezeptbuchs. Zustand, Namen, Reihenfolge und Löschen arbeiten gleich. */
export function kategorienMit(fest) {
  return {
    FEST: fest,
    alleKategorien: (rezepte, kat) => alleKategorien(rezepte, kat, fest),
    gruppiere: (rezepte, kat) => gruppiere(rezepte, kat, fest),
    loeschen: (rezepte, kat, id, ziel) => loeschen(rezepte, kat, id, ziel, fest),
    umsortieren: (rezepte, kat, id, vorId) => umsortieren(rezepte, kat, id, vorId, fest),
    beschriftung, symbol, anlegen, umbenennen, anzahl,
  };
}
