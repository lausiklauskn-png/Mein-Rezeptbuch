// Küchen-Kern · Kreativbuch, Teil 2: das eigene Buch aus Bildern und die Projekte. Rein, ohne DOM (das Verkleinern steht in
// oberflaeche/bild.mjs, bildGroessen). Übernommen ist der Zweck der alten App („Eigenes Kreativbuch“: kbkAddFiles, kbkResize,
// kbkSaveProject, kbkLoadProject, kbkExport), nicht ihr Code.
//  - Grenzen der alten App: höchstens 30 Bilder, je Datei höchstens 15 MB; jedes Bild zweimal verkleinert (lange Kante 1600 px fürs
//    Buch, 320 px für die Vorschau), JPEG 85 %. Die Bilder bleiben im Gerät; an eine KI geht hier nichts.
//  - Das Buch: ebBlaettern (EINE HTML-Datei zum Blättern, dieselbe Sicherheitslinie wie buchBlaettern) und ebPdf (zum Drucken,
//    je Bild ein Blatt). Deckblatt mit Titel, Seitenzahl und Datum, danach je Bild eine Seite.
//  - Projekte: ein angefangenes Kreativbuch (Auswahl, Stil, eigener Stil, Texte der Auswahl, eigene Bilder) liegt im Speicher des
//    Geräts (kbProjekte, wie der Tresor: eine Liste und je Projekt ein Eintrag). Als Datei: das Format der alten App
//    (.kreativbuch, { v:1, images:[{ name, thumbUrl, exportUrl }] }), dazu ein Block `kreativ`; die alte App liest davon die Bilder.
// Anders als die alte App:
//  - ihr Projekt war nur eine heruntergeladene Datei; hier liegt es im Gerät, die Datei gibt es zusätzlich;
//  - ihr Projekt trug nur die Bilder; hier auch Auswahl (die abgewählten Rezepte), Stil und Texte des Kreativbuchs;
//  - ein PDF ohne lesbare Seiten wurde ein Platzhalter („bitte separat drucken“); hier wird es gemeldet und bleibt draußen.
import { text, fuelle } from '../oberflaeche/sprache.mjs';
import { esc, druckBild, druckFarbe, druckDatum, DRUCK_RICHTLINIE } from './druck.mjs';
import { blatt, blaetterLeiste, BLAETTER_STIL, BLAETTER_RICHTLINIE } from './buch.mjs';
import { KB_STILE, kbStil, kbTexte, KB_EIGEN_MAX } from './kreativbuch.mjs';

export const EB_MAX = 30, EB_DATEI_MAX = 15 * 1024 * 1024, EB_KANTE = 1600, EB_KLEIN = 320, EB_GUETE = 0.85;
export const EB_ENDUNG = '.kreativbuch';
const NAME_MAX = 120;
const str = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());

/** Ein Bild des Buchs: { name, klein, gross } (klein: Vorschau, gross: fürs Buch). null, wenn das große Bild kein eingebettetes Bild ist. */
export function ebBild(b) {
  if (!b || typeof b !== 'object') return null;
  const gross = druckBild(b.gross), klein = druckBild(b.klein) || gross;
  return gross ? { name: str(b.name).slice(0, NAME_MAX), klein, gross } : null;
}

/** Hängt neue Bilder an, bis die Grenze erreicht ist. Zurück: { liste, dazu, uebrig } (uebrig: was keinen Platz mehr fand). */
export function ebDazu(liste, neue, max = EB_MAX) {
  const l = (liste || []).slice(), frei = Math.max(0, max - l.length), gut = (neue || []).map(ebBild).filter(Boolean);
  l.push(...gut.slice(0, frei));
  return { liste: l, dazu: Math.min(frei, gut.length), uebrig: Math.max(0, gut.length - frei) };
}
/** Verschiebt das Bild an Stelle `von` an Stelle `nach` (neue Liste). */
export function ebVerschiebe(liste, von, nach) {
  const l = (liste || []).slice(); if (!(von >= 0 && von < l.length)) return l;
  const z = Math.max(0, Math.min(l.length - 1, nach)); const [x] = l.splice(von, 1); l.splice(z, 0, x); return l;
}
/** Teilt gewählte Dateien: { gut, zuGross } – zu groß ist, was über EB_DATEI_MAX liegt (die Grenze der alten App). */
export const ebDateienTeilen = (dateien, max = EB_DATEI_MAX) => ({ gut: (dateien || []).filter((d) => d.size <= max), zuGross: (dateien || []).filter((d) => d.size > max) });

/* ───────────── Projekte ───────────── */

/** Texte aus fremder Hand (Datei): { uid: { stil: {…} } }, nur bekannte Stile, jeder Text bereinigt wie eine Antwort der KI. */
function texteLesen(t) {
  const aus = {}; if (!t || typeof t !== 'object') return aus;
  for (const [uid, je] of Object.entries(t)) {
    if (!je || typeof je !== 'object' || !uid || uid.length > 80) continue;
    for (const [stil, o] of Object.entries(je)) { if (kbStil(stil) !== stil) continue; const x = kbTexte(o); if (x) (aus[uid] ||= {})[stil] = x; }
  }
  return aus;
}
/** Die abgewählten Rezepte (Kennungen) einer Auswahl aus fremder Hand: nur kurze Texte, ohne Doppel, höchstens 5000. */
export const kbAbgewaehlt = (v) => [...new Set((Array.isArray(v) ? v : []).filter((u) => typeof u === 'string' && u && u.length <= 80))].slice(0, 5000);
/** Bringt ein Projekt in Form (auch eines aus einer Datei): { id, name, stand, wahl, ab, stil, eigen, texte, bilder }.
 *  `ab`: die abgewählten Rezepte (Vorgabe: alle gewählt); `wahl` (k:/o:) ist die Auswahl älterer Projekte. */
export function kbProjekt(o = {}, { jetzt = new Date() } = {}) {
  const id = /^[a-z0-9-]{4,60}$/.test(String(o.id || '')) ? String(o.id) : 'p-' + jetzt.getTime().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  const wahl = /^[ko]:[^\n]{1,120}$/.test(String(o.wahl || '')) ? String(o.wahl) : '';
  return { id, name: str(o.name).slice(0, NAME_MAX), stand: typeof o.stand === 'string' && !Number.isNaN(Date.parse(o.stand)) ? o.stand : jetzt.toISOString(), wahl, ab: kbAbgewaehlt(o.ab), stil: kbStil(o.stil),
    eigen: str(o.eigen).slice(0, KB_EIGEN_MAX), texte: texteLesen(o.texte), bilder: ebDazu([], o.bilder).liste };
}
/** Wie viele Rezepte Texte tragen und wie viele Bilder es sind: für die Zeile in der Liste. */
export const kbProjektZahlen = (p) => ({ bilder: (p.bilder || []).length, texte: Object.keys(p.texte || {}).length });

/** Das Projekt als Datei (.kreativbuch): das Format der alten App, dazu `kreativ`. */
export function kbProjektDatei(p) {
  const { name, stand, wahl, ab, stil, eigen, texte } = kbProjekt(p);
  return JSON.stringify({ v: 1, images: (p.bilder || []).map(ebBild).filter(Boolean).map((b) => ({ name: b.name, thumbUrl: b.klein, exportUrl: b.gross })), kreativ: { name, stand, wahl, ab, stil, eigen, texte } });
}
/** Liest eine .kreativbuch-Datei (alte App oder diese). Wirft mit Klartext, wenn nichts zu lesen ist. Die Kennung ist immer neu. */
export function kbProjektAusDatei(roh, { sprache = 'de', name = '', jetzt = new Date() } = {}) {
  let d = null; try { d = JSON.parse(String(roh || '')); } catch { /* unten */ }
  if (!d || typeof d !== 'object' || (!Array.isArray(d.images) && !d.kreativ)) throw new Error(text(sprache, 'Die Datei ist kein Kreativbuch.', 'The file is not a creative book.'));
  const k = d.kreativ && typeof d.kreativ === 'object' ? d.kreativ : {};
  const bilder = (Array.isArray(d.images) ? d.images : []).filter((b) => b && !b.isPdf).map((b) => ({ name: b.name, klein: b.thumbUrl, gross: b.exportUrl || b.thumbUrl }));
  return kbProjekt({ ...k, id: '', name: str(k.name) || name, stand: k.stand, bilder }, { jetzt });
}

/** Die Projekte im Speicher des Geräts. lager: { hol(k), setz(k, w), weg(k) } (speicher/speicher.mjs). Wie der Tresor: eine kleine
 *  Liste, je Projekt ein eigener Eintrag (die Bilder lesen sich nur, wenn ein Projekt geöffnet wird). */
const LISTE = 'kreativ-projekte', eintrag = (id) => 'kreativ-projekt:' + id;
export function kbProjekte(lager) {
  const liste = async () => (await lager.hol(LISTE)) || [];
  return {
    liste: async () => (await liste()).slice().sort((a, b) => String(b.stand).localeCompare(String(a.stand))),
    hol: async (id) => { const p = await lager.hol(eintrag(id)); return p ? kbProjekt(p) : null; },
    /** Legt ab oder ersetzt (gleiche Kennung). Zurück: das abgelegte Projekt. */
    async ablegen(projekt) {
      const p = kbProjekt(projekt), l = (await liste()).filter((x) => x.id !== p.id);
      await lager.setz(eintrag(p.id), p);
      l.push({ id: p.id, name: p.name, stand: p.stand, ...kbProjektZahlen(p) }); await lager.setz(LISTE, l); return p;
    },
    /** Löscht und gibt das Projekt zurück (für „Rückgängig“: ablegen(zurück)). */
    async loeschen(id) { const p = await lager.hol(eintrag(id)), l = await liste(); await lager.weg(eintrag(id)); await lager.setz(LISTE, l.filter((x) => x.id !== id)); return p ? kbProjekt(p) : null; },
  };
}

/* ───────────── das Buch aus Bildern ───────────── */

/* Was das Bilderbuch zum Stil des Blätterbuchs braucht. Der Knopf „Inhalt“ der Leiste bleibt verborgen: dieses Buch hat kein Inhaltsverzeichnis
   (das Skript braucht den Knopf, also wird er versteckt statt weggelassen). */
const EB_STIL = `#zum-inhalt{display:none}
.eb-bild{flex:1;display:flex;align-items:center;justify-content:center;min-height:0}
.eb-bild img{display:block;max-width:100%;max-height:75vh;object-fit:contain;border-radius:.3rem}
@media print{.eb-bild img{max-height:24cm;border-radius:0}}
`;
function ebSeiten(bilder, { titel, sprache, datum }) {
  const gut = (bilder || []).map(ebBild).filter(Boolean), kopf = str(titel) || text(sprache, 'Kreativbuch', 'Creative book');
  const seite = (n, art, html) => `<section class="seite ${art}" id="s${n}" tabindex="-1">\n${html}\n</section>`;
  const stand = [gut.length === 1 ? text(sprache, '1 Bild', '1 picture') : fuelle(text(sprache, '{0} Bilder', '{0} pictures'), gut.length), druckDatum(datum, sprache)].filter(Boolean).join(' · ');
  const deck = [`<h1>${esc(kopf)}</h1>`, gut.length ? '' : `<p class="leer">${esc(text(sprache, 'Das Buch ist leer.', 'The book is empty.'))}</p>`, `<p class="stand">${esc(stand)}</p>`].filter(Boolean).join('\n');
  const rumpf = [`<main id="buch">`, seite(1, 'deck', deck), ...gut.map((b, i) => seite(i + 2, 'eb-seite', `<div class="eb-bild"><img src="${esc(b.gross)}" alt="${esc(b.name)}"></div>\n<p class="snr">${i + 2}</p>`)), `</main>`];
  return { kopf, rumpf };
}
/** Das Buch aus Bildern als EINE HTML-Datei zum Blättern (wie kreativBlaettern: keine Verbindung nach außen, genau ein Skript).
 *  bilder: [{ name, klein, gross }]. titel, sprache, datum (Date, Text oder null), farbe ('#rrggbb'). */
export function ebBlaettern(bilder, { titel = '', sprache = 'de', datum = new Date(), farbe } = {}) {
  const e = ebSeiten(bilder, { titel, sprache, datum });
  return blatt(e.kopf, sprache, BLAETTER_RICHTLINIE, '<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="color-scheme" content="light dark">\n', `:root{--f:${druckFarbe(farbe || KB_STILE.auto.farbe)}}\n${BLAETTER_STIL}${EB_STIL}`, [...e.rumpf, ...blaetterLeiste(sprache)].join('\n'));
}
/** Dieselben Seiten zum Drucken (drucke() aus druck.mjs): ohne Skript, je Bild ein Blatt. Angaben wie ebBlaettern. */
export function ebPdf(bilder, { titel = '', sprache = 'de', datum = new Date(), farbe } = {}) {
  const e = ebSeiten(bilder, { titel, sprache, datum });
  return blatt(e.kopf, sprache, DRUCK_RICHTLINIE, '', `:root{--f:${druckFarbe(farbe || KB_STILE.auto.farbe)}}\n${BLAETTER_STIL}${EB_STIL}`, e.rumpf.join('\n'));
}
