// Küchen-Kern · „Paket prüfen“: die mitgelieferten Beispiele müssen wenigstens fehlerfrei sein (Klaus 23.11.2026,
// Abgleich Mixarium Runde 3 Punkt 11). Gibt eine Liste von Befunden zurück; leer heißt bestanden.
// Je Ausgabe einstellbar: bekannte Kategorien, Mindestzahlen, eigene Mengen-Prüfung.
// Wortgrenzen von Hand: \b kennt keine Umlaute („andünsten“ würde sonst als „and“ gelesen).
export const ENGLISCH = /(?<![\p{L}])(juice|wine|with|glass|pour|together|garnish|lime|milk|peel|fresh|sprig|cubes|soda water|to fill|until|untill|add|mix|chopped|sliced|tablespoons?|teaspoons?|cups?)(?![\p{L}])/iu;
export const SIEZEN = /(?<![\p{L}])(Geben|Füllen|Fügen|Rühren|Gießen|Lassen|Schneiden|Nehmen|Stellen|Legen) Sie(?![\p{L}])/u;
// Sammelwörter: ein Schritt darf „das Gemüse“, „die Kräuter“, „würzen“ sagen, ohne jede Zutat einzeln zu nennen.
const SAMMEL = /gemüse|kräuter|gewürz|würzen|abschmecken|zutaten|fleisch|fisch|belag|belegen|füllung|teig|soße|sauce|dressing|marinade|(?<![\p{L}])öl(?![\p{L}])/iu;
const mengeGut = (a) => a === '' || a == null || /^[\d\s.,/½¼¾⅓⅔⅛–-]+$/.test(String(a)) || (/^[a-zäöüß .]+$/i.test(String(a)) && !ENGLISCH.test(String(a)));

export function pruefePaket(rezepte, { kategorien = null, minZutaten = 2, minSchritte = 1, menge = mengeGut, zutatImSchritt = true } = {}) {
  const b = [], uids = new Set(), sag = (r, t) => b.push(`${r.name || '(ohne Namen)'}: ${t}`);
  for (const r of rezepte) {
    if (!r.uid || !String(r.name || '').trim()) sag(r, 'ohne Kennung oder Namen');
    if (uids.has(r.uid)) sag(r, 'Kennung doppelt'); uids.add(r.uid);
    if (kategorien && !kategorien.has(String(r.cat || '').trim())) sag(r, `unbekannte Kategorie „${r.cat}“`);
    if (!(Number(r.servings) >= 1)) sag(r, 'Portionen fehlen');
    const ings = r.ings || [], steps = r.steps || [];
    if (ings.length < minZutaten) sag(r, `nur ${ings.length} Zutaten`);
    if (steps.length < minSchritte) sag(r, `nur ${steps.length} Schritte`);
    for (const z of ings) { if (!String(z.name || '').trim()) sag(r, 'leere Zutat'); if (!menge(z.amt)) sag(r, `Menge „${z.amt}“ ist weder Zahl noch deutscher Text`); }
    for (const s of steps) if (!String(s.txt || '').trim()) sag(r, 'leerer Schritt');
    for (const t of [r.name, ...ings.map((z) => z.name), ...steps.map((s) => s.txt)]) { if (ENGLISCH.test(String(t))) sag(r, `englisch: ${String(t).slice(0, 70)}`); if (SIEZEN.test(String(t))) sag(r, `Sie-Anrede: ${String(t).slice(0, 70)}`); }
    if (zutatImSchritt && steps.length) {
      const text = steps.map((s) => s.txt).join(' ').toLowerCase();
      if (!/alle[n]? (zutaten|übrigen|liköre)/.test(text) && !SAMMEL.test(text)) { const sw = text.split(/[^\p{L}]+/u).filter((x) => x.length >= 3);
        for (const z of ings) { const w = String(z.name).toLowerCase().split(/[^\p{L}]+/u).filter((x) => x.length >= 3);
          if (w.length && !w.some((x) => text.includes(x.slice(0, 5)) || sw.some((y) => y.length >= 4 && x.includes(y.slice(0, 5))))) sag(r, `Zutat „${z.name}“ kommt in keinem Schritt vor`); } }
    }
  }
  return b;
}
