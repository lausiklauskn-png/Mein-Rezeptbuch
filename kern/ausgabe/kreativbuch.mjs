// Küchen-Kern · Kreativbuch: aus Rezepten ein gestaltetes Buch, je Rezept bis zu drei Seiten; die Texte dazu schreibt Claude in einem
// wählbaren Stil. Übernommen ist der Zweck der alten App (startKreativbuch, _kbRun, _kbBuildHtml und das KI-Kreativbuch mit
// _AIBK_STYLES, _kbBuildCpPrompt, _kbCpGenerate), nicht ihr Code. Rein, ohne DOM.
//  - Je Rezept sechs kurze Texte, die Felder der alten App: Einleitung, Geschmack, Kochtipp, Servier-Idee, Gesundheit, Ökologie.
//  - Zwei Wege zu denselben Feldern: mit eigenem Anthropic-Schlüssel ein Aufruf je Rezept (kbAuftrag, kbLauf), oder ohne Schlüssel
//    EIN Auftrag für alle zum Kopieren in einen Chat; dessen Antwort wird eingesetzt (kbSammelAuftrag, kbAntwortLesen).
//  - Acht Stile, die des KI-Kreativbuchs der alten App; eine Ausgabe hängt mit kbStilDazu() eigene an.
//  - Vor dem Senden wird geprüft wie beim Bildauftrag: steht in Name, Kategorie, Zutat oder Schritt eine Anweisung an eine KI, nennt
//    pruefeKbAuftrag die Stelle und liefert das Rezept ohne sie.
//  - Das Buch: kreativBlaettern (EINE HTML-Datei zum Blättern; dieselbe Sicherheitslinie wie buchBlaettern: genau ein Skript, über
//    seine Prüfsumme erlaubt) und kreativPdf (dieselben Seiten zum Drucken, ohne Skript). Je Rezept: 1 Kategorie, Name, Rezeptbild,
//    Einleitung, Zutaten · 2 Zubereitung mit Tipps · 3 Gesundheit und Ökologie (nur mit Text dafür). Deckblatt im Stil, Inhalt, Schluss.
// Anders als die alte App:
//  - ihr Fortschritt zeigte „Bild 1/3 … 3/3“, ohne ein Bild zu erzeugen; hier steht nur, was wirklich geschieht;
//  - ihr Kopier-Weg schrieb nur Einleitung, Tipp und Servier-Idee; hier schreiben beide Wege dieselben sechs Texte (eine Antwort im
//    alten Format wird trotzdem ganz gelesen: tip → Kochtipp, serve → Servier-Idee);
//  - die Kosten rechnen mit den Preisen aus ki/helfer.mjs statt mit einer festen Zahl je Rezept.
import { text, fuelle, gebiet } from '../oberflaeche/sprache.mjs';
import { normalisiere, sicht } from '../modell/rezept.mjs';
import { frageClaude, jsonAusAntwort, stufe as stufeVon } from '../ki/claude.mjs';
import { SICHER, PREISE, zielName } from '../ki/helfer.mjs';
import { esc, druckBild, druckFarbe, druckDatum, ausschnittStil, DRUCK_RICHTLINIE } from './druck.mjs';
import { buchInhalt, blatt, deckblatt, blaetterLeiste, BLAETTER_STIL, BLAETTER_RICHTLINIE } from './buch.mjs';

export const KB_ZUTATEN = 18, KB_SCHRITTE = 6, KB_SCHRITT_LAENGE = 300, KB_TEXT_MAX = 700, KB_EIGEN_MAX = 300;
/** Die Stufe der Aufrufe (Haiku, wie in der alten App). */
export const KB_STUFE = 'schnell';
/** Geschätzte Antwort je Rezept in Token (sechs kurze Texte samt JSON und Denken des Modells). */
export const KB_TOKEN_AUS = 600;

/* Stile: Name, Hinweis an die KI (Englisch, wörtlich in den Auftrag), Farbverlauf des Deckblatts, Grundfarbe der Seiten.
   Die Hinweise sind die der alten App, übersetzt. „eigen“ nimmt den Text, den der Mensch selbst schreibt. */
export const KB_STILE = {
  auto: { de: 'KI entscheidet', en: 'AI decides', hinweis: '', deck: 'linear-gradient(160deg,#7a5840,#5c3d2e)', farbe: '#7a5840' },
  mediterran: { de: 'Mediterran', en: 'Mediterranean', hinweis: 'Write like a Mediterranean cookbook: warm, sunny, fragrant with herbs, lemon and olive oil. Sensual, inviting language with images of the south.', deck: 'linear-gradient(160deg,#b06030,#7a3810)', farbe: '#b06030' },
  nordisch: { de: 'Nordisch', en: 'Nordic', hinweis: 'Nordic and minimalist: calm, clear, close to nature. Short, precise sentences. Stress freshness, quality of the ingredients and simplicity.', deck: 'linear-gradient(160deg,#3a7a5a,#1a4030)', farbe: '#3a7a5a' },
  rustikal: { de: 'Rustikal', en: 'Rustic', hinweis: 'Rustic and nostalgic like a handwritten family cookbook: cosy, warm-hearted, with a touch of memory. As if explaining the recipe to a friend.', deck: 'linear-gradient(160deg,#8b5e30,#4a2a10)', farbe: '#8b5e30' },
  bunt: { de: 'Bunt und kreativ', en: 'Colourful and creative', hinweis: 'Lively like a food blogger: personal joy in food, small exclamations, enthusiasm. Colourful language.', deck: 'linear-gradient(160deg,#c0403a,#7a1a20)', farbe: '#c0403a' },
  elegant: { de: 'Elegant', en: 'Elegant', hinweis: 'Like an upscale cookbook: refined, precise, with culinary vocabulary. Elegant and cultivated, as if served in a gourmet restaurant.', deck: 'linear-gradient(160deg,#2a1a08,#1a0e04)', farbe: '#8a6a30' },
  zine: { de: 'Food-Zine', en: 'Food zine', hinweis: 'Food zine style: brief, lively, addressing the reader directly. Gripping sentences like in a food magazine. Evocative, bold, no clichés. Short paragraphs, a strong opening.', deck: 'linear-gradient(135deg,#1a1a2e,#e94560)', farbe: '#c2334d' },
  eigen: { de: 'Eigener Stil', en: 'Own style', hinweis: '', deck: 'linear-gradient(160deg,#3a5050,#1a3030)', farbe: '#508080' },
};
export const KB_STIL_VORGABE = 'auto';
/** Die Kennung eines Stils, den es gibt; sonst die Vorgabe. */
export const kbStil = (id) => (Object.prototype.hasOwnProperty.call(KB_STILE, id) ? id : KB_STIL_VORGABE);
export const kbStilName = (id, sprache = 'de') => { const s = KB_STILE[kbStil(id)]; return text(sprache, s.de, s.en); };
/** Eigener Stil einer Ausgabe: kbStilDazu('bar', { de: 'Bar', en: 'Bar', hinweis: '…', deck: 'linear-gradient(…)', farbe: '#rrggbb' }).
 *  Der Verlauf kommt nur an, wenn er aus Farben und Winkeln besteht (er steht im Stil des Dokuments). */
export function kbStilDazu(id, stil) {
  if (!id || !stil || !stil.de) return;
  const deck = /^linear-gradient\([0-9a-z#.,% ]+\)$/i.test(String(stil.deck || '')) ? String(stil.deck) : KB_STILE.auto.deck;
  KB_STILE[String(id)] = { de: String(stil.de), en: String(stil.en || stil.de), hinweis: String(stil.hinweis || ''), deck, farbe: druckFarbe(stil.farbe) };
}
/** Der Hinweis an die KI: beim eigenen Stil der selbst geschriebene Text (gekürzt), sonst der des Stils. */
export const kbHinweis = (stil, eigen = '') => (kbStil(stil) === 'eigen' ? String(eigen || '').replace(/\s+/g, ' ').trim().slice(0, KB_EIGEN_MAX) : KB_STILE[kbStil(stil)].hinweis);

/* Die sechs Felder und was die KI hineinschreiben soll (wie in der alten App). */
export const KB_FELDER = ['intro', 'flavorNote', 'cookTip', 'servingIdea', 'health', 'eco'];
const FELD_AUFTRAG = { intro: '2–3 sentences personal introduction to the recipe', flavorNote: '1 sentence about taste and aroma', cookTip: '1 short cooking tip', servingIdea: '1 short serving idea',
  health: '2–3 sentences about nutrition, healthy aspects or special ingredients of this recipe', eco: '1–2 sentences about seasonality, regionality or ecological aspects of the main ingredients' };
const muster = (mitNr) => '{' + (mitNr ? '"nr":1,"name":"recipe name",' : '') + KB_FELDER.map((f) => `"${f}":"${FELD_AUFTRAG[f]}"`).join(',') + '}';

const str = (v) => (v == null ? '' : String(v).trim());
export const kbZutat = (z) => (z ? [z.amt, z.unit, z.name].map(str).filter(Boolean).join(' ') : '');
export const kbSchritt = (s) => str((s && (s.txt ?? s.text)) ?? (typeof s === 'string' ? s : '')).slice(0, KB_SCHRITT_LAENGE);
/** Was aus einem Rezept in den Auftrag geht: Name, Kategorie, die ersten 18 Zutaten, die ersten sechs Schritte (gekürzt). */
function rezeptBlock(r, kategorie, einzug = '') {
  const zut = (r.ings || []).map(kbZutat).filter(Boolean).slice(0, KB_ZUTATEN).join(', ');
  const st = (r.steps || []).map(kbSchritt).filter(Boolean).slice(0, KB_SCHRITTE).map((t, i) => `${i + 1}. ${t}`).join(' ');
  return [`${str(r.name) || 'Recipe'}`, kategorie ? `${einzug}Category: ${kategorie}` : '', zut ? `${einzug}Ingredients: ${zut}` : '', st ? `${einzug}Preparation: ${st}` : ''].filter(Boolean).join('\n');
}
const stilZeile = (stil, eigen) => { const h = kbHinweis(stil, eigen); return h ? `Writing style: ${h}\n` : ''; };

/** Der Auftrag für EIN Rezept (Weg mit Schlüssel). kategorie: Name der Kategorie oder ''. */
export function kbAuftrag(rezept, { stil = KB_STIL_VORGABE, eigen = '', sprache = 'de', kategorie = '' } = {}) {
  return `You are a creative cookbook author. Write all texts in ${zielName(sprache)}. Reply ONLY with this JSON (no text before or after):
${muster(false)}
${stilZeile(stil, eigen)}${SICHER}

Recipe: ${rezeptBlock(rezept || {}, kategorie)}`;
}
/** Der Auftrag für ALLE Rezepte auf einmal, zum Kopieren in einen Chat (Weg ohne Schlüssel). Die Nummer im Auftrag ist die Stelle in
 *  `rezepte`; kbAntwortLesen ordnet über sie zu. kategorie: Funktion rezept → Name der Kategorie. */
export function kbSammelAuftrag(rezepte, { stil = KB_STIL_VORGABE, eigen = '', sprache = 'de', kategorie = () => '' } = {}) {
  const liste = (rezepte || []).map((r, i) => `${i + 1}. ${rezeptBlock(r, kategorie(r), '   ')}`).join('\n');
  return `You are a creative cookbook author. For each recipe below write short texts for a personal cookbook. Write all texts in ${zielName(sprache)}.
${stilZeile(stil, eigen)}Reply ONLY with this JSON (no text before or after), one entry per recipe, with its number:
{"kreativbuch":[${muster(true)}]}
${SICHER}

Recipes:
${liste}`;
}

/* Felder der alten App (KI-Kreativbuch · Prompt: {"kreativbuch":[{name,intro,tip,serve}]}) und wohin sie gehören. */
const ALTE_FELDER = { tip: 'cookTip', serve: 'servingIdea' };
/** Die sechs Texte aus einer Antwort, bereinigt: nur Text, gekürzt. null, wenn keiner da ist.
 *  Eine Antwort im Format der alten App wird ganz gelesen: `tip` wird der Kochtipp, `serve` die Servier-Idee (ein neues Feld gewinnt). */
export function kbTexte(o) {
  if (!o || typeof o !== 'object') return null;
  const t = {}, lies = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, KB_TEXT_MAX) : '');
  for (const f of KB_FELDER) { const v = lies(o[f]); if (v) t[f] = v; }
  for (const [alt, f] of Object.entries(ALTE_FELDER)) { const v = lies(o[alt]); if (v && !t[f]) t[f] = v; }
  return Object.keys(t).length ? t : null;
}
const nameGleich = (a, b) => str(a).toLowerCase() === str(b).toLowerCase() && !!str(a);
/** Liest die eingefügte Antwort des Kopier-Wegs. rezepte: dieselbe Liste in derselben Reihenfolge wie beim Kopieren.
 *  Zuordnung: über die Nummer, sonst über den Namen, sonst (wenn genau so viele Einträge wie Rezepte da sind) über die Stelle.
 *  Zurück: { texte: { uid: {…} }, zugeordnet, ohne } (ohne: Einträge, die zu keinem Rezept passten). Wirft, wenn nichts zu lesen ist. */
export function kbAntwortLesen(roh, rezepte, sprache = 'de') {
  const t = String(roh || ''), liste = rezepte || [];
  let eintraege = null;
  try { const o = jsonAusAntwort(t, sprache); eintraege = Array.isArray(o.kreativbuch) ? o.kreativbuch : Array.isArray(o.recipes) ? o.recipes : KB_FELDER.some((f) => f in o) ? [o] : null; } catch { /* vielleicht eine bloße Liste */ }
  if (!eintraege) { const a = t.indexOf('['), e = t.lastIndexOf(']'); try { const l = a >= 0 && e > a ? JSON.parse(t.slice(a, e + 1)) : null; if (Array.isArray(l)) eintraege = l; } catch { /* unten */ } }
  if (!eintraege || !eintraege.length) throw new Error(text(sprache, 'In der Antwort steht kein Kreativbuch. Bitte die ganze Antwort einfügen.', 'The answer contains no creative book. Please paste the whole answer.'));
  const texte = {}, frei = new Set(liste.map((_, i) => i)); let ohne = 0;
  eintraege.forEach((x, i) => {
    const tx = kbTexte(x); if (!tx) { ohne++; return; }
    const nr = parseInt(x && x.nr, 10) - 1;
    let k = Number.isInteger(nr) && frei.has(nr) && (!x.name || nameGleich(x.name, liste[nr].name) || !liste.some((r) => nameGleich(x.name, r.name))) ? nr : -1;
    if (k < 0 && x && x.name) k = liste.findIndex((r, j) => frei.has(j) && nameGleich(x.name, r.name));
    if (k < 0 && eintraege.length === liste.length && frei.has(i)) k = i;
    if (k < 0) { ohne++; return; }
    frei.delete(k); texte[liste[k].uid] = tx;
  });
  return { texte, zugeordnet: Object.keys(texte).length, ohne };
}

/** Prüft die Teile, aus denen der Auftrag entsteht (Name, Kategorie, Zutaten, Schritte – genau in der Form, die kbAuftrag liest).
 *  Zurück: { stellen:[{ teil, text }], sauber, kategorie } – `sauber` ist das Rezept ohne die Teile mit Fund, `kategorie` der Name der
 *  Kategorie oder '' (mit Fund). pruefe: Text → Liste der Funde (kiAnweisungen aus pruefung/datei.mjs). */
export async function pruefeKbAuftrag(rezept, pruefe, kategorie = '') {
  const stellen = [], fund = async (t) => !!t && (await pruefe(String(t))).length > 0;
  let name = str(rezept.name); if (await fund(name)) { stellen.push({ teil: 'name', text: name }); name = ''; }
  let kat = str(kategorie); if (await fund(kat)) { stellen.push({ teil: 'kategorie', text: kat }); kat = ''; }
  const ings = []; for (const z of rezept.ings || []) { if (ings.length >= KB_ZUTATEN) break; const t = kbZutat(z); if (!t) continue; if (await fund(t)) stellen.push({ teil: 'zutat', text: t }); else ings.push(z); }
  const steps = []; for (const s of rezept.steps || []) { if (steps.length >= KB_SCHRITTE) break; const t = kbSchritt(s); if (!t) continue; if (await fund(t)) stellen.push({ teil: 'schritt', text: t }); else steps.push(s); }
  return { stellen, sauber: { ...rezept, name, ings, steps }, kategorie: kat };
}

/** Kosten vorab für n Aufrufe mit diesen Rezepten. Zurück: { n, usd, preis, text } – preis: „etwa 0,02 $“, text: „12 Rezepte · etwa 0,02 $ · Anthropic“. */
export function kbKosten(rezepte, { stil = KB_STIL_VORGABE, eigen = '', sprache = 'de', kategorie = () => '' } = {}) {
  const rs = rezepte || [], p = PREISE[stufeVon(KB_STUFE).modell];
  const ein = rs.reduce((n, r) => n + Math.ceil(kbAuftrag(r, { stil, eigen, sprache, kategorie: kategorie(r) }).length / 4), 0), aus = rs.length * KB_TOKEN_AUS;
  const usd = p ? (ein * p[0] + aus * p[1]) / 1e6 : null, n = rs.length;
  const preis = usd == null ? '' : usd < 0.01 ? text(sprache, 'unter 0,01 $', 'under $0.01') : fuelle(text(sprache, 'etwa {0} $', 'about ${0}'), usd.toLocaleString(gebiet(sprache), { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  return { n, usd, preis, text: [n === 1 ? text(sprache, '1 Rezept', '1 recipe') : fuelle(text(sprache, '{0} Rezepte', '{0} recipes'), n), preis, 'Anthropic'].filter(Boolean).join(' · ') };
}

/** Weg mit Schlüssel: ein Aufruf je Rezept, eins nach dem anderen. rezepte: schon geprüft (wie sie hinausgehen dürfen).
 *  je(rezept, texte): die App legt die Texte ab. abbruch(): true = nach dem laufenden Rezept aufhören. fortschritt(i, n, rezept).
 *  kategorie(rezept): Name der Kategorie. Ein abgelehnter Schlüssel, fehlendes Guthaben oder ein Limit beendet den Lauf; sonst hält
 *  ein Fehlschlag den Rest nicht auf. Zurück: { fertig, fehler:[{ uid, name, text }], offen, abgebrochen, grund }. */
export async function kbLauf(rezepte, { schluessel, stil = KB_STIL_VORGABE, eigen = '', sprache = 'de', kategorie = () => '', je, hol = fetch, fortschritt = () => {}, abbruch = () => false } = {}) {
  const liste = rezepte || [], aus = { fertig: 0, fehler: [], offen: 0, abgebrochen: false, grund: '' };
  if (!schluessel) { aus.offen = liste.length; aus.grund = 'kein-schluessel'; return aus; }
  for (let i = 0; i < liste.length; i++) {
    if (abbruch()) { aus.abgebrochen = true; aus.offen = liste.length - i; break; }
    const r = liste[i]; fortschritt(i, liste.length, r);
    try {
      const roh = await frageClaude(schluessel, kbAuftrag(r, { stil, eigen, sprache, kategorie: kategorie(r) }), { stufe: KB_STUFE, maxTokens: 4000, hol, sprache });
      const t = kbTexte(jsonAusAntwort(roh, sprache)); if (!t) throw new Error(text(sprache, 'Die KI hat keinen Text geschrieben.', 'The AI wrote no text.'));
      await je(r, t); aus.fertig++;
    } catch (f) {
      aus.fehler.push({ uid: r.uid, name: r.name, text: (f && f.message) || String(f) });
      if (f && (f.schluesselAbgelehnt || f.status === 401 || f.status === 402 || f.status === 429)) { aus.grund = f.schluesselAbgelehnt || f.status === 401 ? 'schluessel' : 'limit'; aus.offen = liste.length - i - 1; break; }
    }
  }
  return aus;
}

/* ───────────── das Buch ───────────── */

/* Was das Kreativbuch zum Stil des Blätterbuchs (buch.mjs, BLAETTER_STIL) dazu braucht. Farben über die Variablen von dort, damit
   hell, dunkel und Druck mitgehen. --kbg ist der Verlauf des Stils (fester Text aus KB_STILE, nie Text aus fremder Hand). */
const KB_STIL = `.kb-deck,.kb-ende{background:var(--kbg);color:#fff;text-align:center}
.kb-deck h1,.kb-ende h1,.kb-deck .unter,.kb-deck .stand,.kb-ende p{color:#fff}
.kb-deck .stand{border-top-color:rgba(255,255,255,.4)}
.kb-deck .raster div{background:rgba(255,255,255,.12)}
.kb-stilname{font-size:.75rem;letter-spacing:.16em;text-transform:uppercase;opacity:.85;margin:0 0 .6rem}
.kb-ende{justify-content:center}
.kb-kat{font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--leise);margin:0 0 .2rem}
.kb-kopf{font-weight:700;color:var(--ft);margin:0 0 .25rem}
.kb-intro{font-style:italic;background:var(--feld);border-left:3px solid var(--ft);border-radius:0 .4rem .4rem 0;padding:.5rem .75rem;margin:0 0 1rem;line-height:1.55}
.kb-tipp{background:var(--feld);border-left:3px solid var(--ft);border-radius:0 .4rem .4rem 0;padding:.45rem .75rem;margin:.6rem 0 0;line-height:1.5}
.kb-tipp b{display:block;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--leise)}
.kb-tipp.koch{border-left-color:#3a8a76}.kb-tipp.servier{border-left-color:#d05820}.kb-tipp.geschmack{border-left-color:#c0902a}
.kb-kasten{background:var(--feld);border-radius:.6rem;padding:.2rem .9rem .8rem;margin:0 0 1rem;line-height:1.55}
.kb-kasten.gesund{border-left:3px solid #2e7d32}.kb-kasten.oeko{border-left:3px solid #558b2f}
.kb-kasten p{margin:0}
`;

/** Die Seiten eines Rezepts im Buch: [Seite 1, Seite 2, Seite 3?] (Rumpf je Seite) und der Ausschnitt des Bildes. */
function rezeptSeiten(rezept, t, { sprache, kategorieName, mitBildern }) {
  const r = sicht(normalisiere(rezept || {}), sprache), name = r.name || text(sprache, 'Rezept', 'Recipe'), bild = mitBildern ? druckBild(r.img) : '', x = t || {};
  const zutaten = r.ings.map((z) => `<tr><td class="m">${esc(z.amt)}${z.unit ? ` <span class="e">${esc(z.unit)}</span>` : ''}</td><td>${esc(z.name)}${z.note ? `<div class="notiz">${esc(z.note)}</div>` : ''}</td></tr>`).join('\n');
  const schritte = r.steps.map((s, i) => `<li><span class="nr">${i + 1}</span><div class="st">${esc(s.txt)}</div></li>`).join('\n');
  const tipp = (art, de, en, wert) => (wert ? `<div class="kb-tipp ${art}"><b>${esc(text(sprache, de, en))}</b>${esc(wert)}</div>` : '');
  const kasten = (art, de, en, wert) => (wert ? `<div class="kb-kasten ${art}"><h3>${esc(text(sprache, de, en))}</h3><p>${esc(wert)}</p></div>` : '');
  const eins = [kategorieName ? `<p class="kb-kat">${esc(kategorieName)}</p>` : '', `<h2>${esc(name)}</h2>`, bild ? `<div class="bild"><img src="${esc(bild)}" alt="${esc(name)}"></div>` : '',
    x.intro ? `<p class="kb-intro">${esc(x.intro)}</p>` : '', zutaten ? `<h3>${esc(text(sprache, 'Zutaten', 'Ingredients'))}</h3>\n<table>\n${zutaten}\n</table>` : ''];
  const zwei = [`<p class="kb-kopf">${esc(name)}</p>`, schritte ? `<h3>${esc(text(sprache, 'Zubereitung', 'Preparation'))}</h3>\n<ol>\n${schritte}\n</ol>` : '',
    tipp('koch', 'Kochtipp', 'Cooking tip', x.cookTip), tipp('servier', 'Servier-Idee', 'Serving idea', x.servingIdea), tipp('geschmack', 'Geschmack und Aroma', 'Taste and aroma', x.flavorNote)];
  const drei = x.health || x.eco ? [`<p class="kb-kopf">${esc(name)}</p>`, kasten('gesund', 'Gesundheit', 'Health', x.health), kasten('oeko', 'Ökologie und Saison', 'Ecology and season', x.eco)] : null;
  return { seiten: [eins, zwei, drei].filter(Boolean).map((l) => l.filter(Boolean).join('\n')), ausschnitt: bild ? ausschnittStil(r.imgCrop) : '' };
}

/** Das Buch als Seiten. Zurück: { kopf, rumpf: [Zeilen von <main>…</main>], stil, anzahl }. */
function kreativSeiten(rezepte, { texte = {}, stil = KB_STIL_VORGABE, titel, kategorien, auswahl, ordner, sprache = 'de', mitBildern = true, datum = new Date(), anzahlText }) {
  const b = buchInhalt(rezepte, { kategorien, auswahl, ordner, sprache }), S = KB_STILE[kbStil(stil)];
  const deck = deckblatt(b, { titel, untertitel: '', sprache, mitBildern, datum, anzahlText });
  let ausschnitte = deck.stil, nr = 2;   /* Seite 1: Deckblatt, Seite 2: Inhalt */
  const seite = (n, art, html) => `<section class="seite ${art}" id="s${n}" tabindex="-1">\n${html}\n</section>`;
  const iv = [], blaetter = [];
  for (const g of b.gruppen) {
    const li = [];
    for (const e of g.rezepte) {
      const t = rezeptSeiten(e.rezept, texte[e.uid], { sprache, kategorieName: g.name, mitBildern }), erste = nr + 1;
      if (t.ausschnitt) ausschnitte += `#s${erste} .bild img{${t.ausschnitt}}\n`;
      t.seiten.forEach((html) => { nr++; blaetter.push(seite(nr, 'rezept', `${html}\n<p class="snr">${nr}</p>`)); });
      li.push(`<li><a href="#s${erste}"><span class="it">${esc(e.name)}</span><span class="in">${erste}</span></a></li>`);
    }
    iv.push(`<li><span class="ik">${esc(g.name)}</span>\n<ul>\n${li.join('\n')}\n</ul>\n</li>`);
  }
  const deckHtml = `<p class="kb-stilname">${esc(text(sprache, S.de, S.en))}</p>\n${deck.html}`;
  const ende = b.anzahl ? seite(nr + 1, 'kb-ende', `<h1>${esc(text(sprache, 'Guten Appetit!', 'Enjoy your meal!'))}</h1>\n<p>${esc([deck.kopf, druckDatum(datum, sprache)].filter(Boolean).join(' · '))}</p>`) : '';
  const rumpf = [`<main id="buch">`, seite(1, 'deck kb-deck', deckHtml),
    b.anzahl ? seite(2, 'inhalt', `<h2>${esc(text(sprache, 'Inhalt', 'Contents'))}</h2>\n<ul class="iv">\n${iv.join('\n')}\n</ul>\n<p class="snr">2</p>`) : '', ...blaetter, ende, `</main>`].filter(Boolean);
  return { kopf: deck.kopf, rumpf, stil: `:root{--f:${druckFarbe(S.farbe)};--kbg:${S.deck}}\n${BLAETTER_STIL}${KB_STIL}${ausschnitte}`, anzahl: b.anzahl };
}

/** Das Kreativbuch als EINE HTML-Datei zum Blättern und Weitergeben (wie buchBlaettern: eine Seite, am breiten Schirm zwei,
 *  hell oder dunkel wie das Gerät, keine Verbindung nach außen; ohne Skript stehen alle Seiten untereinander).
 *  texte: { uid: { intro, flavorNote, cookTip, servingIdea, health, eco } }. stil: Kennung aus KB_STILE.
 *  titel, kategorien, auswahl, ordner, sprache, mitBildern, datum, anzahlText wie bei buchBlaettern. */
export function kreativBlaettern(rezepte, opt = {}) {
  const sp = opt.sprache || 'de', k = kreativSeiten(rezepte, { ...opt, sprache: sp });
  return blatt(k.kopf, sp, BLAETTER_RICHTLINIE, '<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="color-scheme" content="light dark">\n', k.stil, [...k.rumpf, ...blaetterLeiste(sp)].join('\n'));
}
/** Dieselben Seiten zum Drucken (drucke() aus druck.mjs): ohne Skript, jede Seite auf einem eigenen Blatt. Angaben wie kreativBlaettern. */
export function kreativPdf(rezepte, opt = {}) {
  const sp = opt.sprache || 'de', k = kreativSeiten(rezepte, { ...opt, sprache: sp });
  return blatt(k.kopf, sp, DRUCK_RICHTLINIE, '', k.stil, k.rumpf.join('\n'));
}
/** Wie viele Rezepte der Auswahl Texte tragen: { anzahl, mitText }. */
export function kbStand(rezepte, texte, { kategorien, auswahl, ordner, sprache = 'de' } = {}) {
  const b = buchInhalt(rezepte, { kategorien, auswahl, ordner, sprache }), t = texte || {};
  return { anzahl: b.anzahl, mitText: b.gruppen.reduce((n, g) => n + g.rezepte.filter((e) => t[e.uid]).length, 0) };
}
/** Die Rezepte der Auswahl in der Reihenfolge des Buchs (so gehen sie in den Kopier-Auftrag). */
export const kbRezepte = (rezepte, { kategorien, auswahl, ordner, sprache = 'de' } = {}) => buchInhalt(rezepte, { kategorien, auswahl, ordner, sprache }).gruppen.flatMap((g) => g.rezepte.map((e) => e.rezept));
