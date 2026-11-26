// Küchen-Kern · Doppelungen erkennen (R6, Klaus 25.11.2026) und Merkmale einer Variante (vegan, laktosefrei, glutenfrei).
// Klaus' Entscheidungen: verglichen wird nach INHALT (Name, Zutaten) und BILD; je Doppel wählt der Nutzer „Meins behalten“,
// „Bild vom neuen“, „Text vom neuen“, „Ganz das neue“ oder „Beide behalten“. Gezeigt werden „sicher“ und „vielleicht“, markiert.
// „Mit Alkohol“ und „alkoholfrei“ sind NIE ein Doppel, auch wenn sich nur dieses Wort unterscheidet; ebenso zwei Rezepte mit
// verschiedenen Merkmalen (die laktosefreie Variante bleibt neben dem Original stehen, Klaus 25.11.).
// Das Bild wird hier nicht gelesen: die App gibt je Rezept einen kleinen Bild-Fingerabdruck (64 Bit als Hex, dHash 9×8) mit.
import { istInhalt, sicht } from './rezept.mjs';
import { text } from '../oberflaeche/sprache.mjs';

/** Merkmale einer Variante, in dieser Reihenfolge an der Leiste. */
export const MERKMALE = ['vegan', 'laktosefrei', 'glutenfrei'];
/** Name eines Merkmals in einer Sprache (Druck, Teilen, Suche). Klaus 25.11.: ein Hinweis am Rezept, kein Filter. */
export function merkmalName(m, sprache = 'de') {
  return m === 'vegan' ? text(sprache, 'vegan', 'vegan') : m === 'laktosefrei' ? text(sprache, 'laktosefrei', 'lactose-free') : m === 'glutenfrei' ? text(sprache, 'glutenfrei', 'gluten-free') : '';
}
export const MERKMAL_ZEICHEN = { vegan: '🌱', laktosefrei: '🥛', glutenfrei: '🌾' };
/** Wörter, unter denen die Suche ein Merkmal findet: Deutsch, Englisch und die Sprache der Oberfläche. */
export const merkmalWorte = (r, sprache = 'de') => merkmaleVon(r).flatMap((m) => [m, merkmalName(m, 'en'), merkmalName(m, sprache)]);
export const merkmaleVon = (r) => (Array.isArray(r?.merkmale) ? MERKMALE.filter((m) => r.merkmale.includes(m)) : []);
/** Schaltet ein Merkmal um; gibt ein neues Rezept zurück (ohne Feld, wenn keins mehr gesetzt ist). */
export function merkmalUmschalten(r, m) {
  if (!MERKMALE.includes(m)) return r;
  const jetzt = merkmaleVon(r), neu = jetzt.includes(m) ? jetzt.filter((x) => x !== m) : MERKMALE.filter((x) => x === m || jetzt.includes(x));
  const { merkmale, ...rest } = r; return neu.length ? { ...rest, merkmale: neu } : rest;
}

export const SCHWELLE = { sicherZutaten: 0.7, vielleichtZutaten: 0.6, nameAehnlich: 0.75, nameVielleicht: 0.5, nurZutaten: 0.9, bildAbstand: 6, mengen: 0.8 };

const FUELL = new Set(['mit', 'und', 'der', 'die', 'das', 'den', 'dem', 'von', 'vom', 'im', 'in', 'auf', 'aus', 'nach', 'art', 'a', 'an', 'the', 'and', 'with', 'of', 'la', 'le', 'les', 'al', 'alla', 'con', 'de', 'del', 'et', 'e', 'y', 'com', 'ein', 'eine']);
const ZUT_FUELL = new Set(['frisch', 'frische', 'frischer', 'frisches', 'gehackt', 'gehackte', 'klein', 'kleine', 'grosse', 'gross', 'etwas', 'fein', 'feine', 'gemahlen', 'gemahlener', 'zum', 'fuer', 'nach', 'belieben', 'optional']);
/** Text ohne Akzente, klein, ß → ss, nur Buchstaben und Ziffern. */
export function grund(t) {
  return String(t ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();   // Buchstaben jeder Schrift: ein russischer Name ist kein leerer Name (26.11.)
}
const woerter = (t, fuell) => grund(t).split(' ').filter((w) => w.length > 1 && !fuell.has(w));
const jaccard = (a, b) => { if (!a.size && !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n); };

const OHNE = /\b(alkoholfrei\w*|alkohol frei\w*|ohne alkohol|virgin|mocktail\w*|non alcoholic|alcohol free|sans alcool|analcolic\w*|sin alcohol|sem alcool|bezalkogol\w*)\b/;
/** 'mit' | 'ohne' | '' (unbekannt). Das Feld `alcohol` (Mixarium) gilt vor den Wörtern im Namen. */
export function alkoholArt(r) {
  const t = grund([r?.name, ...(Array.isArray(r?.tags) ? r.tags : [])].join(' '));
  if (OHNE.test(t)) return 'ohne';
  if (r?.alcohol === true) return 'mit';
  if (r?.alcohol === false) return 'ohne';
  return /\b(mit alkohol|with alcohol|spiked)\b/.test(t) ? 'mit' : '';
}
/** Trennen zwei Rezepte sich als Varianten (Alkohol oder Merkmale verschieden), sind sie nie ein Doppel. */
export function sindVarianten(a, b) {
  const x = alkoholArt(a), y = alkoholArt(b);
  if ((x === 'ohne') !== (y === 'ohne') && (x || y)) return true;
  return merkmaleVon(a).join() !== merkmaleVon(b).join();
}

function merkmal(r) {
  const zut = (r.ings || []).map((z) => new Set(woerter(z.name, ZUT_FUELL))).filter((s) => s.size);
  return { uid: r.uid, schluessel: grund(r.name), name: new Set(woerter(r.name, FUELL)), zut };
}
/** Zwei Wörter einer Zutat sind gleich, wenn sie gleich sind oder eins mit dem anderen beginnt (ab 4 Zeichen): „Zwiebel“ ↔ „Zwiebeln“. */
const wortGleich = (a, b) => a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));
/** Anteil gleicher Zutaten: zwei Zutaten gelten als gleich, wenn sie ein Wort teilen („Nori-Alge“ ↔ „Nori-Algenblätter“). */
export function zutatenGleich(a, b) {
  const A = a.zut || a, B = b.zut || b;
  if (A.length < 2 || B.length < 2) return 0;
  const frei = B.map(() => true); let n = 0;
  for (const z of A) { const i = B.findIndex((y, j) => frei[j] && [...z].some((w) => [...y].some((v) => wortGleich(w, v)))); if (i >= 0) { frei[i] = false; n++; } }
  return n / Math.max(A.length, B.length);
}
/** Hamming-Abstand zweier Bild-Fingerabdrücke (Hex gleicher Länge); Infinity, wenn einer fehlt. */
export function bildAbstand(h1, h2) {
  if (!h1 || !h2 || h1.length !== h2.length) return Infinity;
  let d = 0; for (let i = 0; i < h1.length; i++) { let x = parseInt(h1[i], 16) ^ parseInt(h2[i], 16); while (x) { d += x & 1; x >>= 1; } }
  return d;
}
/** dHash aus Graustufen 9×8 (72 Werte, zeilenweise): je Zeile 8 Vergleiche „links heller als rechts“. */
export function dHash(grau) {
  let hex = '', nib = 0, n = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { nib = (nib << 1) | (grau[y * 9 + x] > grau[y * 9 + x + 1] ? 1 : 0); if (++n % 4 === 0) { hex += nib.toString(16); nib = 0; } }
  return hex;
}

/** Anteil gleicher Mengen an gleicher Stelle (200 · 2 · 1 …), unabhängig von der Sprache. 0, wenn eins weniger als 4 Mengen hat.
 *  Ebenfalls 0, wenn eins weniger als drei verschiedene Mengen hat (überall „2“ wäre sonst immer gleich).
 *  Klaus 26.11.: ein Rezept liegt einmal deutsch, einmal englisch im Buch – Namen und Zutaten teilen kaum ein Wort, die Mengen schon. */
export function mengenGleich(a, b) {
  const m = (r) => (r.ings || []).map((z) => String(z.amt ?? '').replace(',', '.').replace(/[^0-9./½¼¾⅓⅔-]/g, '')).filter(Boolean);
  const A = m(a), B = m(b); if (A.length < 4 || B.length < 4) return 0;
  if (new Set(A).size < 3 || new Set(B).size < 3) return 0;   // „2 · 2 · 2 · 2“ sagt nichts: eine Folge trägt erst mit mindestens drei verschiedenen Mengen
  let n = 0; for (let i = 0; i < Math.min(A.length, B.length); i++) if (A[i] === B[i]) n++;
  return n / Math.max(A.length, B.length);
}
function vergleicheEinfach(a, b, bildA, bildB) {
  const ma = merkmal(a), mb = merkmal(b);
  const nameGleich = !!ma.schluessel && ma.schluessel === mb.schluessel, name = jaccard(ma.name, mb.name), zut = zutatenGleich(ma, mb);
  const bild = !!(a.img && b.img && (a.img === b.img || bildAbstand(bildA, bildB) <= SCHWELLE.bildAbstand));
  const unterschied = { name: nameGleich ? 1 : name, zutaten: zut, bild };
  if ((nameGleich || name >= SCHWELLE.nameAehnlich) && (zut >= SCHWELLE.sicherZutaten || bild)) return { stufe: 'sicher', ...unterschied };
  if (bild || nameGleich || (name >= SCHWELLE.nameVielleicht && zut >= SCHWELLE.vielleichtZutaten) || zut >= SCHWELLE.nurZutaten) return { stufe: 'vielleicht', ...unterschied };
  /* gleiche Mengen in gleicher Folge, gleich viele Zutaten und fast gleich viele Schritte: dasselbe Rezept in einer anderen Sprache */
  const mg = mengenGleich(a, b), gleichGebaut = (a.ings || []).length === (b.ings || []).length && Math.abs((a.steps || []).length - (b.steps || []).length) <= 1;
  if (mg >= SCHWELLE.mengen && gleichGebaut) return { stufe: name > 0 || bild ? 'sicher' : 'vielleicht', ...unterschied, mengen: mg };
  return { stufe: '' };
}
const RANG = { sicher: 2, vielleicht: 1, '': 0 };
/** Vergleicht zwei Rezepte. bild: gleiches Bild (gleiche Adresse oder kleiner Abstand der Fingerabdrücke). Ergebnis 'sicher' | 'vielleicht' | ''.
 *  Liegt an einem der beiden eine Übersetzung, wird auch sie verglichen (die deutsche Fassung eines englischen Rezepts ist ein Doppel). */
export function vergleiche(a, b, { bildA = '', bildB = '' } = {}) {
  if (!istInhalt(a) || !istInhalt(b) || sindVarianten(a, b)) return { stufe: '' };
  let best = vergleicheEinfach(a, b, bildA, bildB);
  const spr = new Set([...Object.keys(a.translations || {}), ...Object.keys(b.translations || {})]);
  for (const l of spr) {
    if (best.stufe === 'sicher') break;
    for (const [x, y] of [[sicht(a, l), b], [a, sicht(b, l)], [sicht(a, l), sicht(b, l)]]) { const v = vergleicheEinfach(x, y, bildA, bildB); if (RANG[v.stufe] > RANG[best.stufe]) best = { ...v, uebersetzt: l }; }
  }
  return best;
}

/** Sucht zu jedem der `neue` (Rezepte oder uids aus `alle`) das ähnlichste andere Rezept unter `alle`, das nicht selbst neu ist.
 *  hash: Map oder Objekt uid → Bild-Fingerabdruck. Ergebnis: [{ neu, alt, stufe, name, zutaten, bild }], „sicher“ zuerst. */
export function findeDoppel(alle, neue, { hash = {} } = {}) {
  const h = (u) => (hash instanceof Map ? hash.get(u) : hash[u]) || '';
  const neuUids = new Set(neue.map((x) => (typeof x === 'string' ? x : x.uid)));
  const neuR = neue.map((x) => (typeof x === 'string' ? alle.find((r) => r.uid === x) : x)).filter(istInhalt);
  const bestand = alle.filter((r) => istInhalt(r) && !neuUids.has(r.uid));
  const aus = [];
  for (const n of neuR) {
    let best = null;
    for (const b of bestand) {
      const v = vergleiche(n, b, { bildA: h(n.uid), bildB: h(b.uid) }); if (!v.stufe) continue;
      const w = (v.stufe === 'sicher' ? 10 : 0) + v.name + v.zutaten + (v.bild ? 1 : 0);
      if (!best || w > best.w) best = { w, neu: n.uid, alt: b.uid, ...v };
    }
    if (best) { const { w, ...rest } = best; aus.push(rest); }
  }
  return aus.sort((x, y) => (x.stufe === y.stufe ? 0 : x.stufe === 'sicher' ? -1 : 1));
}

/** Das ganze Buch gegen sich selbst (Klaus 26.11.: „Wo kann ich Rezeptdoppelungen entfernen?“). Jedes Rezept steht in höchstens einem Paar;
 *  „neu“ ist das, das später im Buch steht (meist später dazugekommen), „alt“ das frühere. Stärkste Paare zuerst. */
export function findeDoppelImBuch(alle, { hash = {} } = {}) {
  const h = (u) => (hash instanceof Map ? hash.get(u) : hash[u]) || '';
  const r = (alle || []).filter(istInhalt), kand = [];
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
    const v = vergleiche(r[i], r[j], { bildA: h(r[i].uid), bildB: h(r[j].uid) }); if (!v.stufe) continue;
    kand.push({ w: (v.stufe === 'sicher' ? 10 : 0) + v.name + v.zutaten + (v.bild ? 1 : 0) + (v.mengen || 0), neu: r[j].uid, alt: r[i].uid, ...v });
  }
  const belegt = new Set(), aus = [];
  for (const k of kand.sort((x, y) => y.w - x.w)) { if (belegt.has(k.neu) || belegt.has(k.alt)) continue; belegt.add(k.neu); belegt.add(k.alt); const { w, ...rest } = k; aus.push(rest); }
  return aus.sort((x, y) => (x.stufe === y.stufe ? 0 : x.stufe === 'sicher' ? -1 : 1));
}

export const WAHL = ['meins', 'bild', 'text', 'ganz', 'beide'];
const BILD_FELDER = ['img', 'imgCrop'];
const TEXT_FELDER = ['name', 'ings', 'steps', 'servings', 'prepTime', 'flavors', 'notes', 'source', 'tags', 'glass', 'temp', 'alcohol', 'difficulty', 'nutrition', 'allergens', 'sprache'];
/** Übernimmt aus `neu` in `alt`, was gewählt ist. Kennung, Platz, Kategorie, Event-Ordner, Bewertung und Merkmale bleiben die von `alt`.
 *  Wechselt der Text, fallen die Übersetzungen weg (die App übersetzt neu, R30). Gibt null für „beide“ (nichts zu ändern) zurück. */
export function wendeAn(alt, neu, wahl, jetzt = new Date()) {
  if (wahl === 'meins') return alt;
  if (wahl === 'beide' || !WAHL.includes(wahl)) return null;
  const r = { ...alt };
  if (wahl === 'bild' || wahl === 'ganz') for (const k of BILD_FELDER) { if (neu[k] !== undefined) r[k] = neu[k]; else delete r[k]; }
  if (wahl === 'text' || wahl === 'ganz') {
    for (const k of TEXT_FELDER) if (neu[k] !== undefined) r[k] = neu[k];
    if (neu.translations) r.translations = neu.translations; else delete r.translations;
  }
  r.modified = jetzt.toISOString();
  return r;
}
