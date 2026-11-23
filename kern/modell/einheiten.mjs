// Küchen-Kern · Einheiten metrisch ↔ US. mengen.mjs rechnet nur Portionen um; hier wechselt die Einheit.
// Die alte Rezeptbuch-App hatte dafür nichts (dort wurden Einheiten nur ÜBERSETZT: „cup“ hieß auf Deutsch „Tasse“, die Zahl
// blieb). Das alte Mixarium trug eine Tabelle convertAmtUnitLocal (Viertel-Schritte, oz/cup/lb ↔ ml/g, EL ↔ tbsp, TL ↔ tsp),
// die aber nirgends aufgerufen wurde: umgerechnet hat dort die KI beim Übersetzen, je nach Sprache. Übernommen sind die
// Faktoren und das Runden auf Viertel. Anders ist:
//  - Mengen mit Bruch oder Bereich („1 ½“, „400-500“) werden umgerechnet; die alte Tabelle ließ sie stehen.
//  - Tasse und Pfund nur, wenn die Viertel-Stufe höchstens 6 % danebenliegt (250 ml → 1 cup, aber 200 ml → 6 ¾ fl oz statt
//    ¾ cup; 500 g → 17 ½ oz statt 1 lb). Die alte Tabelle machte ab 100 g Viertel-Pfund daraus: 150 g wurden ¼ lb (−24 %).
//  - Kleine Mengen werden Löffel statt „0 oz“: unter 15 ml Teelöffel, unter 60 ml Esslöffel. Läge die Viertel-Stufe mehr als
//    15 % daneben (5 g wären „¼ oz“ = 7 g), bleibt die Angabe metrisch stehen: lieber eine genaue fremde Einheit als eine falsche Zahl.
//  - „oz“ ist in der Küche ein Gewicht (28,35 g), „fl oz“ ein Volumen. Mit { bar: true } ist „oz“ ein Volumen (29,57 ml)
//    wie im alten Mixarium, in beide Richtungen.
//  - Temperaturen (°C ↔ °F) und Längen (cm ↔ Zoll) in Schritttexten sind neu; das hatte keine der alten Apps.
// Nicht umgerechnet wird, was kein festes Maß ist (Tasse, Glas, Becher, Prise, Stück, Barlöffel, Dash …), und eine Tasse
// Mehl wird nicht zu Gramm: dafür müsste der Kern die Dichte jeder Zutat kennen.
import { zahlText } from './mengen.mjs';

/** Die zwei Systeme. */
export const SYSTEME = ['metrisch', 'us'];

const ML_JE = { tsp: 4.92892, tbsp: 14.7868, floz: 29.5735, cup: 236.588 }, G_JE = { oz: 28.3495, lb: 453.592 };
// Kennung (klein, ohne Punkt) → [System, Basis, Faktor zur Basis]. Basis: ml, g, el, tl, oz (Unze: Gewicht oder, an der Bar, Volumen).
const EINHEIT = {};
const trage = (namen, wert) => { for (const n of namen.split('|')) EINHEIT[n] = wert; };
trage('ml|milliliter', ['metrisch', 'ml', 1]); trage('cl', ['metrisch', 'ml', 10]); trage('dl', ['metrisch', 'ml', 100]); trage('l|liter', ['metrisch', 'ml', 1000]);
trage('g|gr|gramm', ['metrisch', 'g', 1]); trage('kg|kilo|kilogramm', ['metrisch', 'g', 1000]); trage('pfund', ['metrisch', 'g', 500]);
trage('el|essl|esslöffel', ['metrisch', 'el', 1]); trage('tl|teel|teelöffel', ['metrisch', 'tl', 1]);
trage('fl oz|floz|fluid ounce|fluid ounces', ['us', 'ml', ML_JE.floz]); trage('cup|cups', ['us', 'ml', ML_JE.cup]);
trage('pint|pints|pt', ['us', 'ml', 473.176]); trage('quart|quarts|qt', ['us', 'ml', 946.353]); trage('gallon|gallons|gal', ['us', 'ml', 3785.41]);
trage('oz|ounce|ounces|unze|unzen', ['us', 'oz', 1]); trage('lb|lbs|pound|pounds', ['us', 'g', G_JE.lb]);
trage('tbsp|tbs|tablespoon|tablespoons', ['us', 'el', 1]); trage('tsp|teaspoon|teaspoons', ['us', 'tl', 1]);
const kennung = (einheit) => String(einheit ?? '').toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();

/** Zu welchem System eine Einheit gehört: 'metrisch', 'us' oder '' (kein festes Maß: Stück, Prise, Tasse, Dash …). */
export const einheitSystem = (einheit) => (EINHEIT[kennung(einheit)] || [''])[0];

/** Passt ein Rezept schon zum System? Wahr, wenn keine Zutat eine Einheit des ANDEREN Systems trägt. */
export function passtZuSystem(rezept, system) {
  return ((rezept && (rezept.ings || rezept.ingredients)) || []).every((z) => { const s = einheitSystem(z && z.unit); return !s || s === system; });
}

// Zahlen in einer Mengenangabe, dieselbe Schreibweise wie in mengen.mjs: „1 1/2“, „1/2“, „1,5“, „1 ½“, „½“.
const BRUCH = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
const ZAHL = /(\d+)\s+(\d+)\/(\d+)|(\d+)\/(\d+)|(\d+(?:[.,]\d+)?)(?:\s*([½¼¾⅓⅔⅛⅜⅝⅞]))?|([½¼¾⅓⅔⅛⅜⅝⅞])/g;
const wertAus = (g1, g2, g3, b1, b2, z, zb, nurB) => (g1 ? +g1 + +g2 / +g3 : b1 ? +b1 / +b2 : z ? parseFloat(z.replace(',', '.')) + (zb ? BRUCH[zb] : 0) : BRUCH[nurB]);
const zahlenIn = (menge) => [...String(menge ?? '').matchAll(ZAHL)].map((m) => wertAus(...m.slice(1))).filter(Number.isFinite);
const jedeZahl = (menge, fn) => String(menge ?? '').replace(ZAHL, (m, ...g) => fn(wertAus(...g)));

/** US-Schreibweise einer Zahl: Viertel-Schritte mit Bruchzeichen („1 ½“, „¾“), ab 10 halbe, ab 100 ganze. Nie ein Komma. */
export function viertel(v) {
  const r = v >= 100 ? Math.round(v) : v >= 10 ? Math.round(v * 2) / 2 : Math.round(v * 4) / 4, ganz = Math.floor(r + 1e-9), rest = r - ganz;
  return (ganz || !rest ? String(ganz) : '') + (rest ? (ganz ? ' ' : '') + { 0.25: '¼', 0.5: '½', 0.75: '¾' }[rest] : '');
}
const gerundet = (v) => (v >= 100 ? Math.round(v) : v >= 10 ? Math.round(v * 2) / 2 : Math.round(v * 4) / 4);
const nah = (v, je, toleranz = 0.06) => { const r = gerundet(v / je); return r > 0 && Math.abs(r * je - v) / v <= toleranz; };
const ganze = (v) => (Math.round(v) >= 1 ? String(Math.round(v)) : zahlText(v));

function umgerechnet(zutat, nach, bar) {
  if (!zutat || typeof zutat !== 'object') return zutat;
  const e = EINHEIT[kennung(zutat.unit)];
  if (!e || e[0] === nach) return zutat;
  const [, basis, faktor] = e, mit = (amt, unit) => ({ ...zutat, amt, unit });
  if (basis === 'el') return mit(zutat.amt, nach === 'us' ? 'tbsp' : 'EL');          /* Löffel sind in beiden Systemen gleich groß: nur der Name wechselt */
  if (basis === 'tl') return mit(zutat.amt, nach === 'us' ? 'tsp' : 'TL');
  const zahlen = zahlenIn(zutat.amt); if (!zahlen.length) return zutat;               /* „etwas“ ml bleibt „etwas“ ml */
  const groesste = Math.max(...zahlen);
  if (nach === 'metrisch') {
    const [b, f] = basis === 'oz' ? (bar ? ['ml', ML_JE.floz] : ['g', G_JE.oz]) : [basis, faktor], v = groesste * f;
    if (v >= 1000) return mit(jedeZahl(zutat.amt, (x) => zahlText(x * f / 1000)), b === 'ml' ? 'l' : 'kg');
    return mit(jedeZahl(zutat.amt, (x) => ganze(x * f)), b);
  }
  const v = groesste * faktor; let je, name;
  if (basis === 'ml') {
    if (v < 15) [je, name] = [ML_JE.tsp, 'tsp'];
    else if (v >= (bar ? 200 : 50) && nah(v, ML_JE.cup)) [je, name] = [ML_JE.cup, 'cup'];   /* an der Bar erst ab 200 ml, wie im alten Mixarium */
    else if (bar) [je, name] = [ML_JE.floz, 'oz'];
    else if (v < 60) [je, name] = [ML_JE.tbsp, 'tbsp'];
    else [je, name] = [ML_JE.floz, 'fl oz'];
  } else if (gerundet(v / G_JE.lb) >= 1 && nah(v, G_JE.lb)) [je, name] = [G_JE.lb, 'lb'];
  else [je, name] = [G_JE.oz, 'oz'];
  if (zahlen.some((x) => { const genau = x * faktor / je, r = gerundet(genau); return !(r > 0) || Math.abs(r - genau) / genau > 0.15; })) return zutat;   /* läge das Viertel mehr als 15 % daneben (5 g wären „¼ oz“ = 7 g), bleibt die Angabe metrisch stehen */
  return mit(jedeZahl(zutat.amt, (x) => viertel(x * faktor / je)), name === 'cup' && gerundet(v / je) > 1 ? 'cups' : name);
}

/** Eine Zutat in US-Einheiten: ml/cl/dl/l → tsp, tbsp, fl oz oder cup · g/kg → oz oder lb · EL → tbsp · TL → tsp.
 *  Gerundet auf Viertel. Zurück kommt eine neue Zutat; ist nichts umzurechnen, oder passt die Menge auf kein Viertel
 *  (mehr als 15 % daneben), dieselbe (zuUs(z) === z).
 *  bar: true für Getränke – dann heißt die Flüssig-Unze „oz“ und es gibt keine Esslöffel. */
export const zuUs = (zutat, { bar = false } = {}) => umgerechnet(zutat, 'us', bar);

/** Eine Zutat in metrischen Einheiten: cup, fl oz, pint, quart, gallon → ml (ab 1000 ml Liter) · oz, lb → g (ab 1000 g kg) ·
 *  tbsp → EL · tsp → TL. Gerundet auf ganze ml und g. Zurück kommt eine neue Zutat; ist nichts umzurechnen, dieselbe.
 *  bar: true für Getränke – dann ist „oz“ die Flüssig-Unze (29,57 ml) statt des Gewichts (28,35 g). */
export const zuMetrisch = (zutat, { bar = false } = {}) => umgerechnet(zutat, 'metrisch', bar);

// ───────────────────────── Temperaturen im Text ─────────────────────────
const cNachF = (c) => { const f = c * 9 / 5 + 32; return (c >= 140 ? Math.round(f / 25) * 25 : Math.round(f)) || 0; };   /* Backofen: auf 25 °F, wie die Regler dort; darunter aufs Grad */
const fNachC = (f) => { const c = (f - 32) * 5 / 9; return (f >= 275 ? Math.round(c / 10) * 10 : Math.round(c)) || 0; };   /* Backofen: auf 10 °C; darunter aufs Grad */
const T_ZAHL = '(?:(?<![\\p{L}\\d°)])[-−])?\\d+(?:[.,]\\d+)?', T_BIS = '\\s*(?:-|–|—|bis|to|oder|or)\\s*';
const T_C = '(?:Grad\\s+Celsius|degrees?\\s+Celsius|°\\s?Celsius|°\\s?C\\b|℃)', T_F = '(?:Grad\\s+Fahrenheit|degrees?\\s+Fahrenheit|°\\s?Fahrenheit|degrees?\\s+F\\b|°\\s?F\\b|℉)';
const tMuster = (einheit) => new RegExp(`(?:(${T_ZAHL})(${T_BIS}))?(${T_ZAHL})(\\s*)(${einheit})`, 'giu');
const tZahl = (s) => parseFloat(s.replace('−', '-').replace(',', '.'));
const tEinheit = (e, nachF) => (e === '℃' || e === '℉' ? (nachF ? '℉' : '℃') : /celsius|fahrenheit/i.test(e) ? e.replace(/celsius|fahrenheit/i, nachF ? 'Fahrenheit' : 'Celsius') : e.slice(0, -1) + (nachF ? 'F' : 'C'));

/** Rechnet Temperaturen in einem Text um: system 'us' macht aus °C → °F, 'metrisch' aus °F → °C. Erkannt wird nur, was
 *  seine Skala nennt („180 °C“, „180°C“, „350 degrees F“, „Grad Celsius“), auch als Bereich („160–180 °C“). Ein bloßes
 *  „180 Grad“ bleibt stehen: es kann auch ein Winkel sein. Backofen-Temperaturen (ab 140 °C / 275 °F) werden auf die
 *  üblichen Stufen gerundet (25 °F, 10 °C), alles darunter aufs Grad (100 °C → 212 °F). Der übrige Text bleibt, wie er ist. */
export function temperaturenImText(text, system) {
  if (system !== 'us' && system !== 'metrisch') return String(text ?? '');
  const nachF = system === 'us', rechne = nachF ? cNachF : fNachC;
  return String(text ?? '').replace(tMuster(nachF ? T_C : T_F), (alles, von, bis, zahl, luecke, einheit) => {
    const b = tZahl(zahl), a = von == null ? null : tZahl(von), bereich = a != null && a <= b && b - a <= (nachF ? 100 : 200);
    return (bereich ? rechne(a) + bis : von == null ? '' : von + bis) + rechne(b) + luecke + tEinheit(einheit, nachF);
  });
}

// ───────────────────────── Längen im Text ─────────────────────────
const L_ZAHL = '\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?(?:\\s*[½¼¾])?|[½¼¾]', L_BIS = '\\s*(?:-|–|—|bis|to|x|×)\\s*';
const L_CM = '(?:cm\\b|Zentimeter\\b|centimet(?:er|re)s?\\b)', L_ZOLL = '(?:inch(?:es)?\\b|Zoll\\b|″)';
const lMuster = (einheit) => new RegExp(`(?<![\\p{L}\\d.,/])(?:(${L_ZAHL})(${L_BIS}))?(${L_ZAHL})(\\s*|-)(${einheit})`, 'giu');
const lZahl = (s) => zahlenIn(s)[0];

/** Rechnet Längen in einem Text um: system 'us' macht aus cm → Zoll (Viertel-Schritte, ab 10 halbe), 'metrisch' aus
 *  Zoll/inch → cm (ab 10 ganze, ab 2 halbe, darunter Zehntel). Auch „20 x 30 cm“, „26-cm-Springform“ und Bereiche. Das Zeichen " wird
 *  nicht als Zoll gelesen (es ist meist ein Anführungszeichen). sprache 'de' schreibt „Zoll“, jede andere „inch“/„inches“. */
export function laengenImText(text, system, { sprache = 'de' } = {}) {
  if (system !== 'us' && system !== 'metrisch') return String(text ?? '');
  const nachZoll = system === 'us', cm = (c) => String(c >= 10 ? Math.round(c) : c >= 2 ? Math.round(c * 2) / 2 : Math.round(c * 10) / 10).replace('.', ','), rechne = (v) => (nachZoll ? viertel(v / 2.54) : cm(v * 2.54));
  return String(text ?? '').replace(lMuster(nachZoll ? L_CM : L_ZOLL), (alles, von, bis, zahl, luecke) => {
    const b = lZahl(zahl), a = von == null ? null : lZahl(von), neuB = rechne(b), neuA = a == null ? '' : rechne(a);
    if (neuB === '0' || neuA === '0' || !Number.isFinite(b)) return alles;
    const wort = !nachZoll ? 'cm' : sprache === 'de' ? 'Zoll' : luecke === '-' || b / 2.54 <= 1.125 ? 'inch' : 'inches';
    return (a == null ? '' : neuA + bis) + neuB + (luecke === '-' ? '-' : ' ') + wort;
  });
}

/** Ein ganzes Rezept in einem System: jede Zutat (zuUs / zuMetrisch) und in jedem Schritt die Temperaturen und Längen.
 *  Das Rezept selbst bleibt unverändert; zurück kommt eine Kopie für die Anzeige. system: 'metrisch' | 'us'.
 *  bar und sprache wie oben. Ein unbekanntes System gibt das Rezept unverändert zurück. */
export function rezeptIn(rezept, system, { bar = false, sprache = 'de' } = {}) {
  if (!rezept || (system !== 'us' && system !== 'metrisch')) return rezept;
  const imText = (t) => laengenImText(temperaturenImText(t, system), system, { sprache });
  return { ...rezept, ings: (rezept.ings || []).map((z) => umgerechnet(z, system, bar)), steps: (rezept.steps || []).map((s) => (typeof s === 'string' ? imText(s) : s && typeof s === 'object' ? { ...s, txt: imText(s.txt) } : s)) };
}
