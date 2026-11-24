// Küchen-Kern · Food-Zine: drei Magazin-Seiten zu einem Rezept (Titelseite, Schritt für Schritt, Gesundheit und Tipps).
// Übernommen ist der Zweck der alten App (buildZinePrompts, openFoodZine), nicht ihr Code. Rein, ohne DOM.
//  - Je Seite ein Auftrag für einen Bildgenerator. Er entsteht aus Rezepttext (Name, die ersten acht Zutaten, die ersten sechs
//    Schritte, Portionen, Zeit) und einem Stil. Der Auftrag ist Englisch; die Schrift auf der Seite soll in der Sprache der
//    Oberfläche stehen. Kopieren kostet nichts und braucht keinen Schlüssel.
//  - Die fertigen Seiten liegen am Rezept: `zine` = drei Einträge, je die data:-Adresse eines Bildes oder '' (modell/rezept.mjs,
//    zineFeld). Die alte App hielt Zine-Bilder nur bis zum Neuladen; deshalb gibt es kein altes Feld, das zu lesen wäre.
//    Die Form ist die der `seiten` im Beispielpaket „foodzine-beispiele“.
//  - Vor dem Senden an eine KI wird der Auftrag geprüft wie der Bildauftrag (ki/bild.mjs, pruefeBildAuftrag): steht in einem
//    Teil eine Anweisung an eine KI, wird die Stelle genannt, und es gibt ein Rezept ohne sie.
import { text } from '../oberflaeche/sprache.mjs';
import { zineFeld, ZINE_SEITEN } from '../modell/rezept.mjs';

export { ZINE_SEITEN };
export const ZINE_ZUTATEN = 8, ZINE_SCHRITTE = 6, ZINE_SCHRITT_LAENGE = 80;
/** Größe für kiBild: Hochformat des jeweiligen Modells. */
export const ZINE_GROESSE = 'hoch';
/** Kosten einer erzeugten Seite (dall-e-3, Hochformat, Standard: 0,08 $ laut Preisliste von OpenAI). */
export const ZINE_KOSTEN = { de: 'etwa 8 Cent', en: 'about 8 cents' };

const SEITEN = [['Titelseite', 'Cover'], ['Schritt für Schritt', 'Step by step'], ['Gesundheit und Tipps', 'Health and tips']];
export const seitenName = (i, sprache = 'de') => (SEITEN[i] ? text(sprache, SEITEN[i][0], SEITEN[i][1]) : '');

/* Stile: der erste ist der der alten App (buildZinePrompts). Die übrigen kommen aus ihren anderen Zine-Aufträgen
   (Design-Stil des Posters, Format „Zeitungsseite“, Extra „Vintage/Retro“, Trend-Poster). Eine Ausgabe hängt mit
   stilDazu() eigene an. Der `auftrag` ist Englisch und geht wörtlich an den Bildgenerator. */
export const ZINE_STILE = {
  collage: { de: 'Collage', en: 'Collage', auftrag: 'Handcrafted mixed-media food zine illustration, scrapbook collage style. Cream parchment paper texture background. Vivid appetizing colors, teal and orange-red accents, yellow sticky notes. Bold typography mixing ALL-CAPS print headlines, large flowing script titles and handwritten annotations. Decorative hand-drawn doodles: small arrows, hearts, stars, crown icons.' },
  aquarell: { de: 'Aquarell', en: 'Watercolour', auftrag: 'Warm, inviting food zine page in mixed media: soft watercolour textures, hand-drawn elements, modern typography. One calm colour palette and one font family across all pages. Plenty of white space.' },
  zeitung: { de: 'Zeitung', en: 'Newspaper', auftrag: 'Food zine page that looks like a real printed newspaper recipe page: realistic newsprint texture, calm classic two-column layout, serif headlines, subtle sepia tones. No bright colours, no stickers, no comic look.' },
  retro: { de: 'Retro', en: 'Retro', auftrag: 'Vintage retro food zine page: aged paper textures, old-fashioned typography, sepia and muted colours, the look of a cookbook page from the 1950s.' },
  modern: { de: 'Modern', en: 'Modern', auftrag: 'Modern, trendy food zine page with a social-media look: strong colours, fresh aesthetics, clean mixed media of photos, illustrations and graphic elements, bold sans-serif headlines.' },
};
export const ZINE_STIL_VORGABE = 'collage';
/** Die Kennung eines Stils, den es gibt; sonst die Vorgabe. */
export const zineStil = (id) => (Object.prototype.hasOwnProperty.call(ZINE_STILE, id) ? id : ZINE_STIL_VORGABE);
export const stilName = (id, sprache = 'de') => { const s = ZINE_STILE[zineStil(id)]; return text(sprache, s.de, s.en); };
/** Eigener Stil einer Ausgabe: stilDazu('bar', { de: 'Bar', en: 'Bar', auftrag: '…' }). */
export function stilDazu(id, stil) { if (id && stil && stil.de && stil.auftrag) ZINE_STILE[String(id)] = { de: String(stil.de), en: String(stil.en || stil.de), auftrag: String(stil.auftrag) }; }

/* Feste Wörter auf der Seite: Deutsch wie in der alten App, Englisch daneben. Jede andere Sprache bekommt die englischen
   Wörter mit dem Auftrag, sie zu übersetzen (der Bildgenerator schreibt die Seite, nicht die App). */
const SPRACHE_EN = { de: 'German', en: 'English', es: 'Spanish', fr: 'French', it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese' };
const WORTE = {
  de: { rezept: 'Rezept', kopf: 'TRENDKÜCHE', fuer: 'Für {0} Personen', zeit: 'ca. {0} Min.', fuss1: 'Seite 2: Step-by-Step →  Seite 3: Gesundheit & Öko', s2: 'SEITE 2', kopf2: 'STEP-BY-STEP', so: 'So machst du {0}', zeitplan: 'ZEIT-PLAN', tipp: 'PROFI-TIPP', tausch: 'SWAP', fuss2: '→ Weiter zu Seite 3: Gesundheit & Öko',
    s3: 'SEITE 3', kopf3: 'GESUNDHEIT & ÖKO', was: 'Was steckt in {0}?', naehr: 'Protein, Omega-3, Kohlenhydrate, Gemüse & Frische', warum: 'WARUM GUT?', klima: 'KLIMAFREUNDLICHER KOCHEN', deins: 'MACH ES ZU DEINEM GERICHT', ende: 'Fertig. Jetzt essen.' },
  en: { rezept: 'recipe', kopf: 'TREND KITCHEN', fuer: 'Serves {0}', zeit: 'approx. {0} min', fuss1: 'Page 2: Step by step →  Page 3: Health & eco', s2: 'PAGE 2', kopf2: 'STEP BY STEP', so: 'How to make {0}', zeitplan: 'TIME PLAN', tipp: 'PRO TIP', tausch: 'SWAP', fuss2: '→ On to page 3: Health & eco',
    s3: 'PAGE 3', kopf3: 'HEALTH & ECO', was: 'What is in {0}?', naehr: 'protein, omega-3, carbohydrates, vegetables & freshness', warum: 'WHY IS IT GOOD?', klima: 'CLIMATE-FRIENDLY COOKING', deins: 'MAKE IT YOUR DISH', ende: 'Done. Now eat.' },
};
const setz = (muster, wert) => muster.replace('{0}', wert);
export const zutatText = (z) => (z ? [z.amt, z.unit, z.name].map((x) => String(x ?? '').trim()).filter(Boolean).join(' ') : '');
export const schrittKurz = (s) => String((s && (s.txt ?? s.text)) ?? (typeof s === 'string' ? s : '')).trim().slice(0, ZINE_SCHRITT_LAENGE);

/** Die drei Aufträge zu einem Rezept: [Titelseite, Schritt für Schritt, Gesundheit und Tipps]. */
export function zineAuftraege(rezept, { stil = ZINE_STIL_VORGABE, sprache = 'de' } = {}) {
  const r = rezept || {}, w = WORTE[sprache] || WORTE.en, S = ZINE_STILE[zineStil(stil)], lang = SPRACHE_EN[sprache] || 'English';
  const name = String(r.name || '').trim() || w.rezept;
  const zut = (r.ings || []).map(zutatText).filter(Boolean).slice(0, ZINE_ZUTATEN).join(', ') || 'assorted ingredients';
  const st = (r.steps || []).map(schrittKurz).filter(Boolean).slice(0, ZINE_SCHRITTE);
  const schritte = st.map((t, i) => `${i + 1}. ${t}`).join(' | ') || 'follow the preparation';
  const karten = Math.max(st.length, 4), portionen = parseInt(r.servings, 10) > 0 ? parseInt(r.servings, 10) : 4, min = parseInt(r.prepTime, 10);
  const zeit = setz(w.zeit, min > 0 ? String(min) : 'X');
  const schrift = WORTE[sprache] ? `All text labels in ${lang} only.` : `All text labels in ${lang} only; translate the quoted English labels into ${lang}.`;
  const basis = `${S.auftrag} A4 portrait format. ${schrift} No watermarks, no outer borders. Print-quality illustration.`;
  return [
    `${basis} PAGE 1 – COVER. Top third: large vibrant appetizing hero food picture of the dish "${name}". Middle section: bold chunky ALL-CAPS headline "${w.kopf}", below it the large recipe name "${name}" in display lettering, a short italic tagline underneath. Left column: a short intro paragraph with two highlighted keywords. Right column: three star-bullet reasons to cook this dish, plus a small note card with a heat or cooking tip. Bottom strip: a row of 6 individual ingredient cut-outs with a name label below each (ingredients: ${zut}), a badge "${setz(w.fuer, String(portionen))}" and a clock badge "${zeit}". Navigation footer text "${w.fuss1}".`,
    `${basis} PAGE 2 – STEP-BY-STEP. Small "${w.s2}" circle badge top-left. Bold ALL-CAPS headline "${w.kopf2}", large subtitle "${setz(w.so, name)}". Main grid: ${karten} numbered cooking-step cards arranged in a 2-column grid. Each card contains: a bold circled step number, a bold step title, a small round food picture inset and 2 short lines of instruction text. Steps: ${schritte}. Bottom info strip with three boxes side by side: a "${w.zeitplan}" box showing prep time, cook time and serve time; a "${w.tipp}" box with a gold star and a single pro tip; a "${w.tausch}" box listing ingredient alternatives. Arrow navigation footer "${w.fuss2}".`,
    `${basis} PAGE 3 – HEALTH & ECO. Small "${w.s3}" circle badge top-left. Bold ALL-CAPS headline "${w.kopf3}", subtitle "${setz(w.was, name)}". Left side: circular hero food picture cut-out of the finished dish. Right side: colourful pie or donut chart with 4 nutrition segments labelled ${w.naehr}, with percentage values. Section "${w.warum}" with 4 numbered health benefit bullet points. A tinted box titled "${w.klima}" listing 3 ecological cooking tips. One note card highlighting a key ingredient. Bottom section: "${w.deins}" showing 3 serving variation mini-cards. Closing hand-lettered text "${w.ende}" with a heart doodle.`,
  ];
}
/** Der Satz, der an den Auftrag kommt, wenn das Rezeptfoto mitkopiert wird (wie in der alten App, hier Englisch wie der Auftrag). */
export const ZINE_FOTO_HINWEIS = 'The attached photo shows the real dish – use it as the reference for the picture.';

/* ── Seiten am Rezept: lesen, setzen, entfernen. Das Rezept selbst wird nie verändert; zurück kommt ein neues. ── */
/** Immer drei Einträge: die data:-Adresse der Seite oder ''. */
export const zineSeiten = (rezept) => zineFeld(rezept && rezept.zine) || Array.from({ length: ZINE_SEITEN }, () => '');
export const zineAnzahl = (rezept) => zineSeiten(rezept).filter(Boolean).length;
export const hatAlleSeiten = (rezept) => zineAnzahl(rezept) === ZINE_SEITEN;
function mitSeiten(rezept, seiten) { const { zine, ...rest } = rezept; const s = zineFeld(seiten); return s ? { ...rest, zine: s } : rest; }
/** Setzt Seite i (0 bis 2). Ein Bild, das keine data:-Adresse ist, wird nicht angenommen (das Rezept kommt unverändert zurück). */
export function setzeSeite(rezept, i, bild) {
  if (!(i >= 0 && i < ZINE_SEITEN) || !zineFeld([bild])) return rezept;
  const s = zineSeiten(rezept); s[i] = bild; return mitSeiten(rezept, s);
}
/** Entfernt Seite i. War es die letzte, trägt das Rezept kein Feld `zine` mehr. */
export function entferneSeite(rezept, i) { const s = zineSeiten(rezept); if (!s[i]) return rezept; s[i] = ''; return mitSeiten(rezept, s); }

/** Alle Seiten aller Rezepte, für die Galerie: [{ uid, name, seite, bild, beispiel }]. */
export function zineGalerie(rezepte) {
  const aus = [];
  for (const r of rezepte || []) { if (!r || !String(r.name || '').trim()) continue; zineSeiten(r).forEach((bild, seite) => { if (bild) aus.push({ uid: r.uid, name: r.name, seite, bild, beispiel: !!r.beispiel }); }); }
  return aus;
}

/* Was der Auftrag einer Seite aus dem Rezept liest: die Titelseite Name und Zutaten, Seite 2 Name und Schritte, Seite 3 nur den Namen. */
const SEITE_LIEST = [{ zutat: true }, { schritt: true }, {}];   /* der Name steht in jedem Auftrag */
const SEITE_LIEST_TEXT = [['Name und Zutaten', 'name and ingredients'], ['Name und Schritte', 'name and steps'], ['Name', 'name']];
/** Für die kurze Zeile vor dem Senden: was der Auftrag von Seite i aus dem Rezept mitnimmt („Name und Zutaten“). */
export const zineLiest = (i, sprache = 'de') => (SEITE_LIEST_TEXT[i] ? text(sprache, SEITE_LIEST_TEXT[i][0], SEITE_LIEST_TEXT[i][1]) : '');
/** Prüft die Teile, aus denen der Auftrag entsteht. Zurück: { stellen:[{ teil:'name'|'zutat'|'schritt', text }], sauber }.
 *  `seite` (0 bis 2): nur was DIESE Seite liest – eine Anweisung in einer Zutat hält Seite 2 nicht an, sie stünde gar nicht im
 *  Auftrag. Ohne `seite`: alles, was die drei Aufträge zusammen lesen.
 *  `sauber` ist das Rezept ohne die Teile mit Fund; es trägt nur geprüfte Teile (es rückt nichts Ungeprüftes nach, und was die
 *  Seite nicht liest, ist nicht dabei). `pruefe`: Text → Liste der Funde (kiAnweisungen aus pruefung/datei.mjs). Geprüft wird
 *  genau das, was zineAuftraege liest: die Zutat mit Menge und Einheit, der Schritt in seiner gekürzten Form. */
export async function pruefeZineAuftrag(rezept, pruefe, seite = null) {
  const liest = SEITE_LIEST[seite] || { zutat: true, schritt: true };
  const stellen = [], fund = async (t) => !!t && (await pruefe(String(t))).length > 0;
  let name = String(rezept.name || ''); if (await fund(name)) { stellen.push({ teil: 'name', text: name }); name = ''; }
  const ings = []; if (liest.zutat) for (const z of rezept.ings || []) { if (ings.length >= ZINE_ZUTATEN) break; const t = zutatText(z); if (!t) continue; if (await fund(t)) stellen.push({ teil: 'zutat', text: t }); else ings.push(z); }
  const steps = []; if (liest.schritt) for (const s of rezept.steps || []) { if (steps.length >= ZINE_SCHRITTE) break; const kurz = schrittKurz(s); if (!kurz) continue; if (await fund(kurz)) stellen.push({ teil: 'schritt', text: kurz }); else steps.push(s); }
  return { stellen, sauber: { ...rezept, name, ings, steps } };
}

/** Beispielpaket „foodzine-beispiele“: { saetze:[{ titel, rezeptUid, seiten:[drei data:-Adressen] }] }.
 *  Nur vollständige Sätze (drei Seiten) kommen an, und nur an ein Rezept, das es gibt (an `rezeptUid`). Seiten, die schon am
 *  Rezept liegen, werden nicht überschrieben. Zurück: { rezepte, dazu, ohneRezept, schonDa, unvollstaendig }. */
export function zineSaetzeEinlesen(rezepte, paket) {
  const saetze = paket && Array.isArray(paket.saetze) ? paket.saetze : [], neu = new Map(), aus = { dazu: 0, ohneRezept: 0, schonDa: 0, unvollstaendig: 0 };
  for (const s of saetze) {
    const seiten = zineFeld(s && s.seiten);
    if (!seiten || !seiten.every(Boolean)) { aus.unvollstaendig++; continue; }
    const r = s.rezeptUid == null ? null : (rezepte || []).find((x) => x.uid === String(s.rezeptUid));
    if (!r) { aus.ohneRezept++; continue; }
    if (zineAnzahl(r) || neu.has(r.uid)) { aus.schonDa++; continue; }
    neu.set(r.uid, seiten); aus.dazu++;
  }
  return { ...aus, rezepte: aus.dazu ? rezepte.map((r) => (neu.has(r.uid) ? { ...r, zine: neu.get(r.uid) } : r)) : rezepte };
}
