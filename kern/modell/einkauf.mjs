// Küchen-Kern · Einkaufsliste: aus mehreren Rezepten zusammengezählt, nach Warengruppen, Einheiten vereinheitlicht.
import { WARENGRUPPEN } from './warengruppen.mjs';
import { skaliere } from './mengen.mjs';

const falten = (s) => String(s || '').toLowerCase().trim();
const EINHEIT = { tl: ['tl', 1], teelöffel: ['tl', 1], el: ['tl', 3], esslöffel: ['tl', 3], ml: ['ml', 1], cl: ['ml', 10], dl: ['ml', 100], l: ['ml', 1000], liter: ['ml', 1000], g: ['g', 1], gramm: ['g', 1], kg: ['g', 1000] };
const BRUCH = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };

/** Zahl aus einer Mengenangabe: '1 ½' → 1.5, '400-500' → 500 (lieber zu viel als zu wenig), 'etwas' → null */
export function zahlAus(menge) {
  const s = String(menge ?? '').trim(); if (!s) return null;
  const teil = (t) => { let v = 0, gefunden = false;
    for (const m of t.matchAll(/(\d+)\/(\d+)|(\d+(?:[.,]\d+)?)|([½¼¾⅓⅔⅛])/g)) { gefunden = true; v += m[1] ? +m[1] / +m[2] : m[3] ? parseFloat(m[3].replace(',', '.')) : BRUCH[m[4]]; }
    return gefunden ? v : null; };
  const bereich = s.split(/\s*(?:–|-|bis)\s*/).map(teil).filter((x) => x != null);
  return bereich.length ? Math.max(...bereich) : null;
}
export function warengruppe(name) {
  const n = ' ' + falten(name) + ' ';
  for (const g of WARENGRUPPEN) if (g.worte.some((w) => n.includes(w))) return g.id;
  return 'sonstiges';
}
function schoen(basis, v) {
  if (basis === 'tl') return v >= 3 ? [Math.round(v / 3 * 10) / 10, 'EL'] : [Math.round(v * 10) / 10, 'TL'];
  if (basis === 'ml') return v >= 1000 ? [Math.round(v / 100) / 10, 'l'] : [Math.round(v), 'ml'];
  if (basis === 'g') return v >= 1000 ? [Math.round(v / 100) / 10, 'kg'] : [Math.round(v), 'g'];
  return [Math.round(v * 100) / 100, basis];
}
const zahlDe = (v) => String(v).replace('.', ',');

/** Schlüssel einer Zutat: Einzahl und Mehrzahl fallen zusammen („Zwiebel“/„Zwiebeln“, „Knoblauchzehe“/„Knoblauchzehen“). */
export function stamm(name) { const k = falten(name).replace(/\s*\([^)]*\)\s*$/, ''); return k.length >= 6 ? k.replace(/(en|n|e|s)$/, '') : k; }

/** posten: [{rezept, portionen}] → [{schluessel, name, menge, gruppe, aus: [Rezeptnamen]}], sortiert nach Name.
 *  Gleiche Zutat (gleicher Name) wird zusammengezählt; verschiedene Einheiten stehen mit „+“ nebeneinander. */
export function einkaufsliste(posten) {
  const map = new Map();
  for (const { rezept: r, portionen } of posten) {
    const f = (portionen || r.servings) / (r.servings || 1);
    for (const z of r.ings || []) {
      const k = stamm(z.name); if (!k) continue;
      let e = map.get(k); if (!e) { e = { schluessel: k, name: z.name, basen: new Map(), ohne: false, aus: [], gruppe: warengruppe(z.name) }; map.set(k, e); }
      if (!e.aus.includes(r.name)) e.aus.push(r.name);
      if (z.name.length > e.name.length) e.name = z.name;   // „Knoblauchzehen“ statt „Knoblauchzehe“
      const n = zahlAus(skaliere(z.amt, f));
      if (n == null) { e.ohne = true; continue; }
      const u = EINHEIT[falten(z.unit)] || [z.unit || '', 1];
      e.basen.set(u[0], (e.basen.get(u[0]) || 0) + n * u[1]);
    }
  }
  return [...map.values()].map((e) => ({ schluessel: e.schluessel, name: e.name, gruppe: e.gruppe, aus: e.aus,
    menge: [...e.basen].map(([b, v]) => { const [w, u] = schoen(b, v); return (zahlDe(w) + ' ' + u).trim(); }).join(' + ') })).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
/** Gruppen in der Reihenfolge eines Ladens (folge: Kennungen); fehlende Gruppen hinten in der Vorgabe-Reihenfolge. */
export function gruppenFolge(folge = []) {
  const alle = WARENGRUPPEN.map((g) => g.id), vorn = folge.filter((id) => alle.includes(id));
  return [...vorn, ...alle.filter((id) => !vorn.includes(id))];
}
export function gruppeVerschieben(folge, id, vorId) {
  const ids = gruppenFolge(folge).filter((x) => x !== id), i = vorId == null ? ids.length : ids.indexOf(vorId);
  ids.splice(i < 0 ? ids.length : i, 0, id); return ids;
}
export { WARENGRUPPEN };
