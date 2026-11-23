// Küchen-Kern · Mengen umrechnen (Portionen). Rechnet jede Zahl in einer Mengenangabe um und lässt den Rest stehen.
const BRUCH = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
const SCHOEN = [[0.25, '¼'], [0.5, '½'], [0.75, '¾'], [1 / 3, '⅓'], [2 / 3, '⅔']];

export function zahlText(v) {
  if (!Number.isFinite(v)) return '';
  const ganz = Math.floor(v + 1e-9), rest = v - ganz;
  if (rest < 0.02) return String(ganz);
  if (v < 10) for (const [w, z] of SCHOEN) if (Math.abs(rest - w) < 0.04) return (ganz ? ganz + ' ' : '') + z;
  const r = v >= 100 ? Math.round(v) : v >= 10 ? Math.round(v * 2) / 2 : Math.round(v * 10) / 10;
  return String(r).replace('.', ',');
}
/** skaliere('1 ½', 2) → '3' · skaliere('400-500', 0.5) → '200-250' · skaliere('etwas', 2) → 'etwas' */
export function skaliere(menge, faktor) {
  const s = String(menge ?? '');
  if (!s || Math.abs(faktor - 1) < 1e-9) return s;
  return s.replace(/(\d+)\s+(\d+)\/(\d+)|(\d+)\/(\d+)|(\d+(?:[.,]\d+)?)(?:\s*([½¼¾⅓⅔⅛⅜⅝⅞]))?|([½¼¾⅓⅔⅛⅜⅝⅞])/g, (m, g1, g2, g3, b1, b2, z, zb, nurB) => {
    let v;
    if (g1) v = +g1 + +g2 / +g3; else if (b1) v = +b1 / +b2; else if (z) v = parseFloat(z.replace(',', '.')) + (zb ? BRUCH[zb] : 0); else v = BRUCH[nurB];
    return zahlText(v * faktor);
  });
}
