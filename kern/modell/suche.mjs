// Küchen-Kern · Wortsuche. Jedes Wort der Anfrage muss irgendwo im Rezept vorkommen (Name, Zutaten, Geschmack, Schritte, Kategorie).
// Die Suche stellt dieselbe Frage wie alle anderen Ansichten: istInhalt(). Was sie findet, steht auch in „Alle“.
import { istInhalt, katVonRezept } from './rezept.mjs';
import { alleKategorien, beschriftung } from './kategorien.mjs';
import { merkmalWorte } from './doppel.mjs';

const falten = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

export function suchtext(r, katName = '', sprache = 'de') {
  return falten([r.name, katName, ...(r.flavors || []), ...(r.ings || []).map((z) => z.name), ...(r.steps || []).map((s) => s.txt), ...(r.tags || []), ...merkmalWorte(r, sprache)].join(' '));   // Merkmale (vegan, laktosefrei, glutenfrei) sind ein Hinweis, die Suche findet sie
}
export function suche(rezepte, anfrage, kat, sprache = 'de') {
  const worte = falten(anfrage).split(/\s+/).filter(Boolean);
  if (!worte.length) return rezepte.filter(istInhalt);
  const namen = new Map(alleKategorien(rezepte, kat).map((c) => [c.id, beschriftung(c, sprache, kat)]));
  return rezepte.filter((r) => { if (!istInhalt(r)) return false; const t = suchtext(r, namen.get(katVonRezept(r)), sprache); return worte.every((w) => t.includes(w)); });
}
