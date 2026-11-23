// Proben: das ganze Buch als Dokument (kern/ausgabe/buch.mjs) – Gliederung, PDF-Buch, Blätterbuch. Die Dokumente sind Text;
// im echten Browser prüft tests/smoke_kern_buch.mjs das Blättern und den Druck.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buchInhalt, buchPdf, buchBlaettern, buchGroesse, buchGroesseText, BLAETTER_SKRIPT, BLAETTER_PRUEFSUMME, BLAETTER_RICHTLINIE } from '../kern/ausgabe/buch.mjs';
import { druckRezept, DRUCK_RICHTLINIE, DRUCK_FARBE } from '../kern/ausgabe/druck.mjs';
import { KAT_OHNE } from '../kern/modell/rezept.mjs';

const BILD = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==', BILD2 = 'data:image/png;base64,iVBORw0KGgo=';
const KATS = [{ id: 'suppe', name: 'Suppen' }, { id: 'kuchen', name: 'Kuchen' }, { id: 'fleisch', name: 'Fleisch' }, { id: 'fisch', name: 'Fisch' }];
const ORDNER = [{ id: 'f1', name: 'Weihnachten' }, { id: 'f2', name: 'Für Gäste' }];
const REZEPTE = [
  { uid: 'r-zwiebel', name: 'Zwiebelsuppe', cat: 'suppe', servings: 2, prepTime: 30, ings: [{ amt: '500', unit: 'g', name: 'Zwiebeln' }, { amt: '1', unit: 'l', name: 'Brühe', note: 'kräftig' }], steps: [{ txt: 'Zwiebeln schneiden.' }, { txt: 'In der Brühe kochen.', note: 'Deckel drauf' }] },
  { uid: 'r-gulasch', name: 'Gulasch', cat: 'fleisch', folder: 'f1', img: BILD, imgCrop: { x: 20, y: 80, scale: 2 }, ings: [{ amt: '800', unit: 'g', name: 'Rindfleisch' }], steps: [{ txt: 'Schmoren.' }], rating: { stars: 5, comment: 'Sonntagsessen' } },
  { uid: 'r-apfel', name: 'Apfelkuchen', cat: 'kuchen', folder: 'f1', img: BILD2, ings: [{ amt: '4', unit: '', name: 'Äpfel' }], steps: [{ txt: 'Backen.' }] },
  { uid: 'r-kartoffel', name: 'Kartoffelsuppe', cat: ' suppe ', servings: 4, img: BILD, ings: [{ amt: '500', unit: 'g', name: 'Kartoffeln' }], steps: [{ txt: 'Kochen.' }],
    translations: { en: { name: 'Potato soup', ingredients: ['potatoes'], steps: ['Boil.'] } } },
  { uid: 'r-sushi', name: 'Sushi', cat: 'sushi', ings: [{ amt: '200', unit: 'g', name: 'Reis' }], steps: [{ txt: 'Rollen.' }] },
  { uid: 'r-tee', name: 'Tee', ingredients: ['Wasser'], steps: ['Aufgießen.'] },
  { uid: 'r-alt', name: 'Brot', cat: 'fld_f2', ings: [{ amt: '1', unit: 'kg', name: 'Mehl' }], steps: [{ txt: 'Backen.' }] },
  { uid: 'r-leer', name: '', blank: true, cat: 'suppe' }, { uid: 'r-leer2', name: '   ', cat: 'kuchen' }, null,
];
const FEST = { titel: 'Mein Rezeptbuch', untertitel: 'Familie Probe', kategorien: KATS, ordner: ORDNER, datum: '23. November 2026' };
const namen = (b) => b.gruppen.map((g) => [g.name, g.rezepte.map((e) => e.name)]);

// ───────────── Die Gliederung ─────────────

test('Buch · Gliederung: Kategorien in der übergebenen Reihenfolge, in der Gruppe nach Name; „Ohne Kategorie“ am Ende', () => {
  const vorher = JSON.stringify(REZEPTE), b = buchInhalt(REZEPTE, { kategorien: KATS });
  assert.deepEqual(namen(b), [['Suppen', ['Kartoffelsuppe', 'Zwiebelsuppe']], ['Kuchen', ['Apfelkuchen']], ['Fleisch', ['Gulasch']], ['Ohne Kategorie', ['Brot', 'Sushi', 'Tee']]]);
  assert.equal(b.gruppen.at(-1).id, KAT_OHNE, 'ohne Kategorie, unbekannte Kategorie und ein altes cat: "fld_…" stehen in EINER Gruppe am Ende');
  assert.ok(!b.gruppen.some((g) => g.name === 'Fisch'), 'eine Kategorie ohne Rezept erscheint nicht');
  assert.equal(b.anzahl, 7, 'Leer-Karten (kein Name, nur Leerzeichen) und null bleiben draußen'); assert.deepEqual(b.gruppen.flatMap((g) => g.rezepte.map((e) => e.nr)), [1, 2, 3, 4, 5, 6, 7], 'die Nummer läuft durch das ganze Buch');
  assert.equal(JSON.stringify(REZEPTE), vorher, 'die Rezepte selbst bleiben unverändert');
  assert.deepEqual(namen(buchInhalt(REZEPTE, { kategorien: [...KATS].reverse() })).map((g) => g[0]), ['Fleisch', 'Kuchen', 'Suppen', 'Ohne Kategorie'], 'andere Reihenfolge der Liste, andere Reihenfolge im Buch');
  assert.deepEqual(namen(buchInhalt(REZEPTE)), [['Ohne Kategorie', ['Apfelkuchen', 'Brot', 'Gulasch', 'Kartoffelsuppe', 'Sushi', 'Tee', 'Zwiebelsuppe']]], 'ohne Liste: eine Gruppe');
  assert.deepEqual(namen(buchInhalt([{ uid: 'x', name: 'Mit Namen', blank: true, cat: 'suppe' }], { kategorien: KATS })), [['Suppen', ['Mit Namen']]], 'ein Rezept mit Namen ist Inhalt, auch wenn blank dransteht');
  for (const unsinn of [null, undefined, 'x', 5, {}, [null, 5, 'x', []]]) assert.deepEqual(buchInhalt(unsinn, { kategorien: KATS }), { gruppen: [], anzahl: 0 }, 'kein Feld, kein Rezept: leere Gliederung');
});

test('Buch · Gliederung: Sortierung in der Sprache (Umlaut bei seinem Grundbuchstaben, Zahlen als Zahlen), Übersetzung zählt', () => {
  const r = ['Zwiebelsuppe', 'Ährensuppe', 'bohnensuppe', 'Suppe 10', 'Suppe 9', 'Ananassuppe'].map((name, i) => ({ uid: 'u' + i, name, cat: 'suppe' }));
  assert.deepEqual(namen(buchInhalt(r, { kategorien: KATS }))[0][1], ['Ährensuppe', 'Ananassuppe', 'bohnensuppe', 'Suppe 9', 'Suppe 10', 'Zwiebelsuppe']);
  const gleich = buchInhalt([{ uid: 'b', name: 'Suppe', cat: 'suppe' }, { uid: 'a', name: 'Suppe', cat: 'suppe' }], { kategorien: KATS });
  assert.deepEqual(gleich.gruppen[0].rezepte.map((e) => e.uid), ['a', 'b'], 'gleiche Namen: feste Folge nach Kennung, nicht nach Zufall');
  const en = buchInhalt(REZEPTE, { kategorien: KATS, sprache: 'en' });
  assert.deepEqual(namen(en)[0], ['Suppen', ['Potato soup', 'Zwiebelsuppe']], 'liegt die Übersetzung am Rezept, steht ihr Name im Buch und zählt beim Sortieren'); assert.equal(en.gruppen.at(-1).name, 'No category');
  assert.equal(en.gruppen[0].rezepte[0].rezept.name, 'Kartoffelsuppe', 'das Rezept selbst behält seinen Namen');
});

test('Buch · Gliederung: Auswahl nach uids, nach Kategorie, nach Ordner; ein Rezept im Ordner behält seine Kategorie', () => {
  assert.deepEqual(namen(buchInhalt(REZEPTE, { kategorien: KATS, auswahl: ['r-gulasch', 'r-zwiebel', 'gibt-es-nicht'] })), [['Suppen', ['Zwiebelsuppe']], ['Fleisch', ['Gulasch']]]);
  assert.deepEqual(namen(buchInhalt(REZEPTE, { kategorien: KATS, auswahl: [] })), [], 'eine leere Auswahl ist ein leeres Buch, nicht „alle“');
  assert.deepEqual(namen(buchInhalt(REZEPTE, { kategorien: KATS, auswahl: { kat: 'suppe' } })), [['Suppen', ['Kartoffelsuppe', 'Zwiebelsuppe']]], 'auch die Kennung mit Leerzeichen („ suppe “) gehört dazu');
  assert.deepEqual(namen(buchInhalt(REZEPTE, { kategorien: KATS, auswahl: { kat: ['kuchen', 'fleisch'] } })), [['Kuchen', ['Apfelkuchen']], ['Fleisch', ['Gulasch']]]);
  assert.deepEqual(namen(buchInhalt(REZEPTE, { kategorien: KATS, auswahl: { kat: '' } })), [['Ohne Kategorie', ['Brot', 'Tee']]], '„ohne Kategorie“ als Auswahl');
  assert.deepEqual(namen(buchInhalt(REZEPTE, { kategorien: KATS, auswahl: { kat: KAT_OHNE } })), [['Ohne Kategorie', ['Brot', 'Tee']]]);
  const f1 = buchInhalt(REZEPTE, { kategorien: KATS, ordner: ORDNER, auswahl: { ordner: 'f1' } });
  assert.deepEqual(namen(f1), [['Kuchen', ['Apfelkuchen']], ['Fleisch', ['Gulasch']]], 'der Ordner wählt aus, gegliedert wird weiter nach Kategorie');
  assert.deepEqual(namen(buchInhalt(REZEPTE, { kategorien: KATS, ordner: ORDNER, auswahl: { ordner: 'f2' } })), [['Ohne Kategorie', ['Brot']]], 'ein altes cat: "fld_f2" liegt im Ordner f2 und hat keine Kategorie');
  assert.deepEqual(namen(buchInhalt(REZEPTE, { kategorien: KATS, auswahl: { ordner: 'f1' } })), namen(f1), 'ohne Ordner-Liste gilt der gewählte Ordner als vorhanden');
  assert.deepEqual(buchInhalt(REZEPTE, { kategorien: KATS, ordner: [ORDNER[1]], auswahl: { ordner: 'f1' } }), { gruppen: [], anzahl: 0 }, 'ein Ordner, den es nicht gibt, ist kein Ordner');
  assert.deepEqual(namen(buchInhalt(REZEPTE, { kategorien: KATS, ordner: ORDNER, auswahl: { ordner: 'f1', kat: 'kuchen' } })), [['Kuchen', ['Apfelkuchen']]], 'Ordner und Kategorie zusammen: beides muss stimmen');
});

test('Buch · Gliederung: jede Kennung einmal; der Sammel-Eimer trägt seinen eigenen Namen und steht, wo die Liste ihn nennt', () => {
  const doppelt = buchInhalt(REZEPTE, { kategorien: [{ id: 'suppe', name: 'Suppen' }, { id: 'suppe', name: 'Zweite Suppen' }, { id: ' kuchen ', name: 'Kuchen' }, { id: '', name: 'Leer' }, null, { id: 'fleisch' }] });
  assert.deepEqual(namen(doppelt).map((g) => g[0]), ['Suppen', 'Kuchen', 'fleisch', 'Ohne Kategorie'], 'die erste gewinnt; ohne Namen bleibt die Kennung stehen, statt einen Namen zu raten');
  const eimer = buchInhalt(REZEPTE, { kategorien: [{ id: KAT_OHNE, name: 'Allerlei' }, ...KATS] });
  assert.deepEqual(namen(eimer)[0], ['Allerlei', ['Brot', 'Sushi', 'Tee']], 'steht der Sammel-Eimer in der Liste, steht die Gruppe dort und heißt wie er'); assert.equal(eimer.gruppen.length, 4);
  assert.equal(buchInhalt(REZEPTE, { kategorien: [{ id: KAT_OHNE }, ...KATS] }).gruppen[0].name, 'Ohne Kategorie', 'ohne eigenen Namen der übliche');
});

// ───────────── Die Dokumente ─────────────

const GRUND_ELEMENTE = ['html', 'head', 'meta', 'title', 'style', 'body', 'header', 'nav', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'p', 'div', 'span', 'img', 'table', 'tr', 'td', 's', 'ol', 'ul', 'li', 'a'];
const ELEMENTE = { pdf: new Set(GRUND_ELEMENTE), blaettern: new Set([...GRUND_ELEMENTE, 'main', 'button', 'svg', 'path', 'script']) };
const ATTRIBUTE = new Set(['lang', 'charset', 'http-equiv', 'content', 'name', 'class', 'id', 'src', 'alt', 'href', 'tabindex', 'hidden', 'type', 'title', 'aria-label', 'aria-hidden', 'aria-live', 'data-einzel', 'data-doppel', 'viewBox', 'd']);
const BILD_FORM = /^data:image\/(?:jpeg|jpg|png|webp|gif|avif|bmp);base64,[A-Za-z0-9+/]+=*$/;
/** Das Dokument holt nichts aus dem Netz und führt nichts aus, was aus Rezepten kommt: JEDES „<…>“ außerhalb von Stil und
 *  (beim Blätterbuch) dem einen festen Skript ist ein bekanntes Element in fester Form mit bekannten Attributen; jedes Bild ist
 *  eingebettet, jeder Verweis zeigt auf eine Stelle im selben Dokument, die es genau einmal gibt; der Stil lädt nichts nach. */
function ohneNetzUndFremdes(html, wo, art) {
  assert.ok(html.startsWith('<!DOCTYPE html>\n<html lang="'), wo + ': ganzes Dokument'); assert.ok(html.trimEnd().endsWith('</body>\n</html>'), wo + ': bis zum Ende');
  assert.ok(html.includes(`<meta http-equiv="Content-Security-Policy" content="${art === 'pdf' ? DRUCK_RICHTLINIE : BLAETTER_RICHTLINIE}">`), wo + ': Inhalts-Richtlinie'); assert.ok(html.includes('<meta charset="utf-8">'));
  assert.equal(html.split('<style>').length, 2, wo + ': genau ein Stil-Block'); assert.equal(html.split('</style>').length, 2, wo + ': er wird genau einmal geschlossen');
  const von = html.indexOf('<style>') + 7, bis = html.indexOf('</style>'), stil = html.slice(von, bis); let rest = html.slice(0, von) + html.slice(bis);
  assert.ok(!stil.includes('<'), wo + ': im Stil steht kein <'); assert.ok(!/@import|url\(|@font-face|expression\(|https?:|\/\/|\\/i.test(stil), wo + ': der Stil lädt nichts nach, keine Schrift aus dem Netz');
  assert.match(stil, /@page\{size:A4;margin:2cm 2cm 2\.2cm\}/, wo + ': A4 mit Rand');
  assert.equal((html.match(/<script/gi) || []).length, art === 'pdf' ? 0 : 1, wo + (art === 'pdf' ? ': kein Skript' : ': genau ein Skript'));
  if (art !== 'pdf') { assert.equal(html.split('</script>').length, 2, wo + ': das Skript wird genau einmal geschlossen'); const a = rest.indexOf('<script>') + 8, e = rest.indexOf('</script>'); assert.equal(rest.slice(a, e), BLAETTER_SKRIPT, wo + ': das eine Skript ist der feste Text des Moduls'); rest = rest.slice(0, a) + rest.slice(e); }
  const marken = [...rest.matchAll(/<[^>]*>/g)].map((m) => m[0]), ids = [], ziele = [];
  assert.equal(marken.length, (rest.match(/</g) || []).length, wo + ': kein einzelnes <'); assert.equal(marken.length, (rest.match(/>/g) || []).length, wo + ': kein einzelnes >');
  for (const marke of marken) {
    if (marke === '<!DOCTYPE html>') continue;
    const m = marke.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s[a-zA-Z-]+="[^"]*")*)>$/);
    assert.ok(m, `${wo}: Element in fester Form erwartet, gefunden ${marke.slice(0, 90)}`); assert.ok(ELEMENTE[art].has(m[1]), `${wo}: unerwartetes Element <${m[1]}>`);
    for (const [, name, wert] of m[2].matchAll(/\s([a-zA-Z-]+)="([^"]*)"/g)) {
      assert.ok(ATTRIBUTE.has(name), `${wo}: unerwartetes Attribut ${name}`);
      if (name === 'src') assert.match(wert, BILD_FORM, wo + ': jedes Bild ist eingebettet');
      if (name === 'href') { assert.match(wert, /^#[rs]\d+$/, wo + ': jeder Verweis bleibt im Dokument'); ziele.push(wert.slice(1)); }
      if (name === 'id') { assert.match(wert, /^(?:[rskd]\d+|buch|leiste|zaehler|zurueck|weiter|zum-inhalt)$/, wo + ': jede Kennung ist eine des Moduls'); ids.push(wert); }
      if (name === 'class') assert.match(wert, /^[a-z0-9 -]+$/, wo + ': Klassen sind feste Wörter');
    }
  }
  assert.equal(new Set(ids).size, ids.length, wo + ': jede Kennung steht einmal da'); for (const z of ziele) assert.ok(ids.includes(z), `${wo}: der Verweis #${z} hat ein Ziel`);
  return stil;
}
const teil = (html, von, bis) => { const a = html.indexOf(von); assert.ok(a >= 0, 'da: ' + von); const e = html.indexOf(bis, a); return html.slice(a, e < 0 ? undefined : e); };

test('Buch · PDF: Deckblatt, Inhaltsverzeichnis, je Kategorie ein Zwischentitel, je Rezept eine Seite – alles da, in dieser Folge', () => {
  const h = buchPdf(REZEPTE, FEST), b = buchInhalt(REZEPTE, FEST), stil = ohneNetzUndFremdes(h, 'PDF', 'pdf');
  assert.ok(h.includes('<title>Mein Rezeptbuch</title>')); assert.ok(h.includes('<html lang="de">'));
  const deck = teil(h, '<header class="deck">', '</header>');
  assert.ok(deck.includes('<h1>Mein Rezeptbuch</h1>')); assert.ok(deck.includes('<p class="unter">Familie Probe</p>')); assert.ok(deck.includes('<p class="stand">7 Rezepte · 23. November 2026</p>'), 'Anzahl und Datum');
  assert.deepEqual([...deck.matchAll(/<div id="d(\d)"><img src="([^"]*)" alt="([^"]*)"><\/div>/g)].map((m) => m[1] + ' ' + m[3]), ['1 Kartoffelsuppe', '2 Apfelkuchen', '3 Gulasch'], 'Bilder des Deckblatts: reihum aus jeder Kategorie das erste Rezept mit Bild');
  assert.ok(deck.includes('<div class="raster n3">')); assert.ok(stil.includes('#d3 img{object-position:20% 80%;transform:scale(2);transform-origin:20% 80%}'), 'Bildausschnitt auch auf dem Deckblatt');
  const inhalt = teil(h, '<nav class="inhalt">', '</nav>');
  assert.ok(inhalt.includes('<h2>Inhalt</h2>')); assert.deepEqual([...inhalt.matchAll(/<span class="ik">([^<]*)<\/span>/g)].map((m) => m[1]), ['Suppen', 'Kuchen', 'Fleisch', 'Ohne Kategorie']);
  const zeilen = [...inhalt.matchAll(/<li><span class="in">(\d+)<\/span><a href="#r(\d+)">([^<]*)<\/a><\/li>/g)].map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(zeilen, b.gruppen.flatMap((g) => g.rezepte.map((e) => [String(e.nr), String(e.nr), e.name])), 'das Verzeichnis nennt jedes Rezept mit seiner laufenden Nummer und zeigt auf dessen Seite');
  const seiten = [...h.matchAll(/<article class="rezept" id="r(\d+)">\n<p class="rnr">(\d+)<\/p>\n<h3>([^<]*)<\/h3>/g)].map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(seiten, zeilen, 'jede Rezeptseite trägt dieselbe Nummer und denselben Namen wie ihre Zeile im Verzeichnis');
  assert.equal((h.match(/<article /g) || []).length, b.anzahl, 'Anzahl der Rezeptseiten = Anzahl der Rezepte'); assert.equal((h.match(/<\/article>/g) || []).length, b.anzahl);
  assert.deepEqual([...h.matchAll(/<section class="kapitel" id="k\d+">\n<h2>([^<]*)<\/h2>\n<article class="rezept" id="r(\d+)">/g)].map((m) => m[1] + ' ' + m[2]), ['Suppen 1', 'Kuchen 3', 'Fleisch 4', 'Ohne Kategorie 5'], 'je Kategorie ein Zwischentitel über ihrem ersten Rezept');
  const ort = ['<header class="deck">', '<nav class="inhalt">', 'id="k1"', 'id="r1"', 'id="r2"', 'id="k2"', 'id="r3"', 'id="r7"'].map((s) => h.indexOf(s));
  assert.ok(ort.every((p) => p > 0)); assert.deepEqual(ort, [...ort].sort((a, b) => a - b), 'Folge: Deckblatt, Inhalt, Kategorie, ihre Rezepte, nächste Kategorie');
  const zwiebel = teil(h, 'id="r2"', '</article>');
  for (const s of ['<h3>Zwiebelsuppe</h3>', '<span class="port">2 Portionen</span>', '<span class="zeit">30 Min</span>', '<h4>Zutaten</h4>', '<td class="m">500 <span class="e">g</span></td><td>Zwiebeln</td>', '<td>Brühe<div class="notiz">kräftig</div></td>', '<h4>Zubereitung</h4>', '<span class="nr">2</span><div class="st">In der Brühe kochen.<div class="notiz">Deckel drauf</div></div>']) assert.ok(zwiebel.includes(s), 'Rezeptseite: ' + s);
  assert.ok(!zwiebel.includes('class="kat"'), 'kein Kategorie-Schild auf der Seite: der Zwischentitel sagt es schon'); assert.ok(!zwiebel.includes('<img'), 'ein Rezept ohne Bild hat keines');
  const gulasch = teil(h, 'id="r4"', '</article>');
  assert.ok(gulasch.includes(`<div class="bild"><img src="${BILD}" alt="Gulasch"></div>`)); assert.ok(gulasch.includes('<span class="sterne">★★★★★</span>')); assert.ok(gulasch.includes('<div class="wort">„Sonntagsessen“</div>'), 'die Notiz am Rezept steht da');
  assert.ok(stil.includes('#r4 .bild img{object-position:20% 80%;transform:scale(2);transform-origin:20% 80%}'), 'der Bildausschnitt gilt je Rezept, nicht für alle');
  assert.ok(!stil.includes('\n.bild img{object-position'), 'kein Ausschnitt, der jedes Bild träfe');
  for (const regel of ['.deck{', '.kapitel{break-before:page', '.rezept+.rezept{break-before:page', 'table,tr,.bild{break-inside:avoid', 'ol li{display:flex;gap:10pt;margin-bottom:10pt;break-inside:avoid']) assert.ok(stil.includes(regel), 'Seitenumbruch: ' + regel);
  assert.ok(!/target-counter|counter\(page/.test(stil), 'keine Seitenzahl, die der Druck nicht ehrlich setzen kann');
});

test('Buch · PDF: die Rezeptseite sieht aus wie das einzelne Rezeptblatt – dieselben Stil-Regeln, nur zwei Überschriften tiefer', () => {
  const blattStil = (x) => x.slice(x.indexOf('<style>') + 7, x.indexOf('</style>')), einzeln = blattStil(druckRezept(REZEPTE[0], { datum: null })).split('\n').filter(Boolean), buch = blattStil(buchPdf(REZEPTE, FEST)).split('\n');
  assert.ok(einzeln.length > 25, 'Vorbedingung: das Rezeptblatt hat seine Regeln'); let gleich = 0;
  for (const regel of einzeln) { const imBuch = regel.replace(/^h1\{/, 'h3{').replace(/^h2\{/, 'h4{'); assert.ok(buch.includes(imBuch), 'im Buch fehlt die Regel des Rezeptblatts: ' + regel.slice(0, 60)); gleich++; }
  assert.equal(gleich, einzeln.length); assert.ok(einzeln.some((r) => r.startsWith('h1{')) && einzeln.some((r) => r.startsWith('h2{')), 'Vorbedingung: Name und Abschnitt haben eigene Regeln');
});

test('Buch · Sonderzeichen sind entschärft: <script>, "><img onerror=…>, </title> bleiben in JEDEM Feld Text – in beiden Dokumenten', () => {
  const B = '<script>window.__x=1</script>', A = '"><img src=x onerror=window.__x=2>', C = "'</style></title><script>x</script>";
  const boese = [{ uid: 'u1' + A, name: 'Suppe ' + B + A, cat: 'suppe', servings: 4, prepTime: 30, flavors: [A, C], img: BILD, imgCrop: { x: '50%;}</style><script>1</script>', y: -7, scale: 'quatsch' },
    ings: [{ amt: B, unit: A, name: 'Mehl ' + B, note: C }], steps: [{ txt: 'Rühren ' + B + ' & kochen ' + C, note: A }], rating: { stars: 5, comment: C }, translations: { de: { name: 'Übersetzt ' + B + C, ingredients: ['Mehl ' + A], steps: ['Schritt ' + C] } } },
  { uid: 'u2', name: C, cat: B, ings: [A], steps: [B] }];
  const opt = { titel: 'Buch ' + B + C, untertitel: A, kategorien: [{ id: 'suppe', name: A + B }, { id: B, name: C }], datum: C, farbe: 'red;}</style><script>1</script>', sprache: 'xx"><', anzahlText: () => B, portionen: { u2: A } };
  for (const [wo, art, h] of [['PDF', 'pdf', buchPdf(boese, opt)], ['Blätterbuch', 'blaettern', buchBlaettern(boese, opt)], ['PDF, Kategorie ohne Namen', 'pdf', buchPdf(boese, { ...opt, kategorien: [{ id: A + B }] })], ['Blätterbuch ohne Liste', 'blaettern', buchBlaettern(boese, { ...opt, kategorien: undefined, auswahl: { kat: B } })]]) {
    const stil = ohneNetzUndFremdes(h, wo, art);
    assert.ok(!h.includes('<img src=x'), wo + ': kein eingeschleustes Bild');
    assert.ok(h.includes('&lt;script&gt;window.__x=1&lt;/script&gt;'), wo + ': der Text steht entschärft da'); assert.ok(h.includes('&quot;&gt;&lt;img src=x onerror=window.__x=2&gt;'), wo + ': auch Anführungszeichen');
    assert.ok(h.includes('&#39;&lt;/style&gt;&lt;/title&gt;'), wo + ': </style> und </title> schließen nichts'); assert.equal(h.split('</title>').length, 2, wo + ': der Titel wird genau einmal geschlossen');
    assert.ok(stil.includes(`:root{--f:${DRUCK_FARBE}}`), wo + ': eine Farbe, die keine ist, wird nicht übernommen'); assert.ok(h.includes('<html lang="de">'), wo + ': eine unbekannte Sprache kommt nicht ins Dokument');
    assert.ok(!/quatsch|50%;\}/.test(stil), wo + ': aus dem Bildausschnitt kommen nur Zahlen in den Stil');
    if (art === 'pdf') assert.deepEqual([...h.matchAll(/<a href="#r\d+">([^<]*)<\/a>/g)].map((m) => m[1]), [...h.matchAll(/<h3>([^<]*)<\/h3>/g)].map((m) => m[1]), wo + ': Verzeichnis und Rezeptseite nennen denselben Namen – auch bei einer Sprache, die es nicht gibt');
  }
  const pdf = buchPdf(boese, { ...opt, sprache: 'de' }), bl = buchBlaettern(boese, { ...opt, sprache: 'de' });   /* Deutsch: die Übersetzung am Rezept (translations.de) steht im Buch */
  assert.ok(pdf.includes('<title>Buch &lt;script&gt;window.__x=1&lt;/script&gt;&#39;&lt;/style&gt;&lt;/title&gt;&lt;script&gt;x&lt;/script&gt;</title>'), 'der Titel des Dokuments');
  assert.ok(pdf.includes('alt="Übersetzt &lt;script&gt;window.__x=1&lt;/script&gt;&#39;&lt;/style&gt;&lt;/title&gt;&lt;script&gt;x&lt;/script&gt;"'), 'auch im Attribut');
  assert.ok(pdf.includes('<p class="unter">&quot;&gt;&lt;img src=x onerror=window.__x=2&gt;</p>')); assert.ok(pdf.includes('<p class="stand">&lt;script&gt;window.__x=1&lt;/script&gt; · &#39;&lt;/style&gt;'), 'auch was die Ausgabe als Anzahl-Text liefert');
  assert.ok(pdf.includes('<span class="ik">&quot;&gt;&lt;img src=x onerror=window.__x=2&gt;&lt;script&gt;window.__x=1&lt;/script&gt;</span>'), 'der Name der Kategorie im Verzeichnis'); assert.ok(bl.includes('<span class="kat">&quot;&gt;&lt;img'), 'und im Schild des Blätterbuchs');
  assert.equal((pdf.match(/<img/g) || []).length, 2, 'nur das eingebettete Bild: einmal auf dem Deckblatt, einmal am Rezept'); assert.equal((bl.match(/<img/g) || []).length, 2);
});

test('Buch · Bilder: ohne Bilder kein <img>; eine Adresse im Netz, javascript: oder SVG kommt nie ins Dokument', () => {
  for (const [wo, art, bau] of [['PDF', 'pdf', buchPdf], ['Blätterbuch', 'blaettern', buchBlaettern]]) {
    assert.equal((bau(REZEPTE, FEST).match(/<img /g) || []).length, 6, wo + ': drei Rezeptbilder, dieselben drei auf dem Deckblatt');
    const ohne = bau(REZEPTE, { ...FEST, mitBildern: false }); ohneNetzUndFremdes(ohne, wo + ' ohne Bilder', art);
    assert.ok(!ohne.includes('<img'), wo + ': mitBildern: false'); assert.ok(!ohne.includes('class="raster') && !ohne.includes('class="bild"') && !ohne.includes('data:image'), wo + ': auch kein leerer Bildrahmen'); assert.ok(!/#[drs]\d+ (?:\.bild )?img\{/.test(ohne), wo + ': kein Ausschnitt ohne Bild');
    for (const fremd of ['https://boese.example/zaehlpixel.png', 'http://192.168.0.1/x.jpg', '//cdn.example/x.png', 'bilder/suppe.jpg', 'blob:https://x/1', 'javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,AAAA" onload="x', 'data:image/png,roh']) {
      const h = bau(REZEPTE.map((r) => (r && r.img ? { ...r, img: fremd } : r)), FEST); ohneNetzUndFremdes(h, wo + ' ' + fremd, art);
      assert.ok(!h.includes('<img'), wo + ': kein Bild für ' + fremd); assert.ok(!h.includes(fremd.slice(0, 18)), wo + ': die Adresse steht nirgends im Dokument – ' + fremd);
    }
    const eins = bau(REZEPTE.filter((r) => r && r.uid !== 'r-apfel' && r.uid !== 'r-kartoffel'), FEST); assert.ok(eins.includes('<div class="raster n1">'), wo + ': ein Bild, ein Feld');
    const viele = bau([...REZEPTE, ...[1, 2, 3].map((i) => ({ uid: 'z' + i, name: 'Zusatz ' + i, cat: 'suppe', img: BILD2 }))], FEST);
    assert.deepEqual([...teil(viele, 'class="raster n4"', '</div>\n</div>').matchAll(/alt="([^"]*)"/g)].map((m) => m[1]), ['Kartoffelsuppe', 'Apfelkuchen', 'Gulasch', 'Zusatz 1'], wo + ': höchstens vier, erst aus jeder Kategorie eines');
  }
});

test('Buch · Portionen je Rezept, Anzahl-Text der Ausgabe, Farbe, Datum', () => {
  const h = buchPdf(REZEPTE, { ...FEST, portionen: { 'r-zwiebel': 6 }, anzahlText: (n) => n + ' Getränke', farbe: '#2D6070' });   /* 6: für KEIN Rezept der Probe die eigene Portionenzahl – sonst sähe „für alle umgerechnet“ gleich aus */
  assert.ok(teil(h, 'id="r2"', '</article>').includes('<td class="m"><span class="neu">1500</span><s>500</s> <span class="e">g</span></td>') && teil(h, 'id="r2"', '</article>').includes('<span class="port neu">6 Portionen</span>'), 'das eine Rezept ist umgerechnet');
  assert.ok(teil(h, 'id="r1"', '</article>').includes('<td class="m">500 <span class="e">g</span></td>') && !/<s>|class="port neu"/.test(h.replace(teil(h, 'id="r2"', '</article>'), '')), 'die anderen nicht');
  assert.ok(teil(buchBlaettern(REZEPTE, { ...FEST, portionen: { 'r-zwiebel': 6 } }), 'id="s4"', '</section>').includes('<span class="neu">1500</span><s>500</s>'), 'im Blätterbuch genauso');
  assert.ok(h.includes('<p class="stand">7 Getränke · 23. November 2026</p>')); assert.ok(h.includes(':root{--f:#2D6070}'));
  assert.ok(buchPdf([REZEPTE[0]], FEST).includes('<p class="stand">1 Rezept · 23. November 2026</p>'), 'Einzahl');
  assert.ok(buchPdf(REZEPTE, { ...FEST, datum: null }).includes('<p class="stand">7 Rezepte</p>'), 'datum: null – kein Datum'); assert.match(buchPdf(REZEPTE, { kategorien: KATS }), /<p class="stand">7 Rezepte · \d{1,2}\. \p{L}+ \d{4}<\/p>/u, 'ohne Angabe das heutige Datum');
  assert.ok(buchPdf(REZEPTE, { kategorien: KATS, datum: null }).includes('<h1>Rezeptbuch</h1>'), 'ohne Titel heißt das Buch „Rezeptbuch“'); assert.ok(!buchPdf(REZEPTE, { kategorien: KATS, datum: null }).includes('class="unter"'), 'ohne Untertitel keine leere Zeile');
});

test('Buch · leeres Buch: wirft nicht und sagt es – ein Deckblatt, kein Verzeichnis, keine Rezeptseite', () => {
  for (const [wo, art, bau] of [['PDF', 'pdf', buchPdf], ['Blätterbuch', 'blaettern', buchBlaettern]]) for (const leer of [[], null, undefined, [{ name: '' }, null], REZEPTE]) {
    const h = leer === REZEPTE ? bau(leer, { ...FEST, auswahl: [] }) : bau(leer, FEST); ohneNetzUndFremdes(h, wo + ' leer', art);
    assert.ok(h.includes('<h1>Mein Rezeptbuch</h1>')); assert.ok(h.includes('<p class="leer">Das Buch ist leer.</p>'), wo + ': es steht da'); assert.ok(h.includes('<p class="stand">23. November 2026</p>'), wo + ': keine „0 Rezepte“');
    assert.ok(!h.includes('class="inhalt"') && !h.includes('class="iv"') && !/class="(?:seite )?rezept"/.test(h) && !h.includes('<img'), wo + ': sonst nichts');
  }
  assert.doesNotThrow(() => { buchPdf(); buchBlaettern(); buchPdf(REZEPTE); buchBlaettern(REZEPTE, {}); });
  assert.equal((buchBlaettern([], FEST).match(/<section class="seite/g) || []).length, 1, 'das leere Blätterbuch hat eine Seite');
});

test('Buch · Englisch: Beschriftung englisch, die Übersetzung am Rezept steht da, der ursprüngliche Name klein darunter', () => {
  const opt = { ...FEST, sprache: 'en', titel: 'My recipes', kategorien: [{ id: 'suppe', name: 'Soups' }], datum: new Date(2026, 10, 23) }, h = buchPdf(REZEPTE, opt), bl = buchBlaettern(REZEPTE, opt);
  ohneNetzUndFremdes(h, 'PDF en', 'pdf'); ohneNetzUndFremdes(bl, 'Blätterbuch en', 'blaettern');
  assert.ok(h.includes('<html lang="en">')); assert.ok(h.includes('<p class="stand">7 recipes · 23 November 2026</p>'), 'Datum im Gebietsschema der Sprache'); assert.ok(h.includes('<h2>Contents</h2>'));
  assert.ok(h.includes('<span class="ik">No category</span>')); assert.ok(h.includes('<li><span class="in">1</span><a href="#r1">Potato soup</a></li>'), 'das Verzeichnis nennt den übersetzten Namen');
  const suppe = teil(h, 'id="r1"', '</article>');
  for (const s of ['<h3>Potato soup</h3>', '<p class="urname">Kartoffelsuppe</p>', '<h4>Ingredients</h4>', '<td>potatoes</td>', '<h4>Preparation</h4>', '<div class="st">Boil.</div>', '<span class="port">4 servings</span>']) assert.ok(suppe.includes(s), 'en: ' + s);
  assert.ok(teil(h, 'id="r2"', '</article>').includes('<h3>Zwiebelsuppe</h3>'), 'ein Rezept ohne Übersetzung bleibt, wie es ist'); assert.ok(!buchPdf(REZEPTE, FEST).includes('class="urname"'), 'deutsch: kein zweiter Name');
  assert.ok(bl.includes('data-einzel="Page {0} of {1}" data-doppel="Pages {0}–{1} of {2}"')); assert.ok(bl.includes('title="Next" aria-label="Next"') && bl.includes('title="Back" aria-label="Back"') && bl.includes('title="Contents" aria-label="Contents"'));
  assert.ok(bl.includes('<h2>Potato soup</h2>')); assert.ok(buchPdf([], { sprache: 'en', datum: null }).includes('<p class="leer">The book is empty.</p>')); assert.ok(buchPdf([], { sprache: 'en', datum: null }).includes('<h1>Recipe book</h1>'));
});

test('Buch · Blätterbuch: Deckblatt, Inhalt mit Seitenzahlen, je Rezept eine Seite; die Leiste zum Blättern; hell, dunkel, Druck', () => {
  const h = buchBlaettern(REZEPTE, FEST), b = buchInhalt(REZEPTE, FEST), stil = ohneNetzUndFremdes(h, 'Blätterbuch', 'blaettern');
  assert.ok(h.includes('<meta name="viewport" content="width=device-width, initial-scale=1">')); assert.ok(h.includes('<meta name="color-scheme" content="light dark">')); assert.ok(h.includes('<title>Mein Rezeptbuch</title>'));
  const seiten = [...h.matchAll(/<section class="seite ([a-z]+)" id="s(\d+)" tabindex="-1">/g)].map((m) => m[1] + ' ' + m[2]);
  assert.deepEqual(seiten, ['deck 1', 'inhalt 2', ...b.gruppen.flatMap((g) => g.rezepte.map((e) => 'rezept ' + (e.nr + 2)))], 'Seite 1 Deckblatt, Seite 2 Inhalt, dann je Rezept eine Seite');
  assert.equal(seiten.filter((s) => s.startsWith('rezept')).length, b.anzahl, 'Anzahl der Rezeptseiten = Anzahl der Rezepte');
  const deck = teil(h, 'id="s1"', '</section>'); assert.ok(deck.includes('<h1>Mein Rezeptbuch</h1>') && deck.includes('<p class="unter">Familie Probe</p>') && deck.includes('<p class="stand">7 Rezepte · 23. November 2026</p>') && deck.includes('<div class="raster n3">'));
  const inhalt = teil(h, 'id="s2"', '</section>'), zeilen = [...inhalt.matchAll(/<li><a href="#s(\d+)"><span class="it">([^<]*)<\/span><span class="in">(\d+)<\/span><\/a><\/li>/g)].map((m) => [m[1], m[2], m[3]]);
  assert.ok(inhalt.includes('<h2>Inhalt</h2>')); assert.deepEqual([...inhalt.matchAll(/<span class="ik">([^<]*)<\/span>/g)].map((m) => m[1]), ['Suppen', 'Kuchen', 'Fleisch', 'Ohne Kategorie']);
  assert.equal(zeilen.length, b.anzahl); for (const [ziel, name, zahl] of zeilen) { assert.equal(ziel, zahl, 'die Zahl im Verzeichnis ist die Seite, auf die die Zeile zeigt'); const s = teil(h, `id="s${ziel}"`, '</section>'); assert.ok(s.includes(`<h2>${name}</h2>`), `Seite ${ziel} trägt ${name}`); assert.ok(s.includes(`<p class="snr">${zahl}</p>`), 'und dieselbe Zahl am Fuß'); }
  const gulasch = teil(h, 'id="s6"', '</section>');
  for (const s of ['<h2>Gulasch</h2>', '<span class="kat">Fleisch</span>', `<div class="bild"><img src="${BILD}" alt="Gulasch"></div>`, '<h3>Zutaten</h3>', '<td>Rindfleisch</td>', '<h3>Zubereitung</h3>', '<div class="st">Schmoren.</div>', '<div class="wort">„Sonntagsessen“</div>']) assert.ok(gulasch.includes(s), 'Rezeptseite: ' + s);
  assert.ok(stil.includes('#s6 .bild img{object-position:20% 80%;transform:scale(2);transform-origin:20% 80%}'));
  assert.ok(h.includes('<nav id="leiste" hidden="" aria-label="Blättern" data-einzel="Seite {0} von {1}" data-doppel="Seiten {0}–{1} von {2}">'), 'die Leiste ist ohne Skript verborgen und trägt die Texte des Zählers');
  assert.deepEqual([...h.matchAll(/<button type="button" id="([a-z-]+)" title="([^"]*)" aria-label="([^"]*)">/g)].map((m) => `${m[1]} ${m[2]} ${m[3]}`), ['zum-inhalt Inhalt Inhalt', 'zurueck Zurück Zurück', 'weiter Weiter Weiter'], 'drei Knöpfe, jeder mit Namen als Hinweis');
  assert.ok(h.includes('<span id="zaehler" aria-live="polite"></span>')); assert.ok(h.indexOf('<script>') > h.indexOf('</nav>') && h.indexOf('</main>') < h.indexOf('<nav id="leiste"'), 'das Skript steht nach dem Inhalt, auf den es zugreift');
  assert.match(stil, /@media \(prefers-color-scheme:dark\)\{:root\{[^}]*--blatt:#[0-9a-f]{6}/, 'dunkel folgt dem Gerät'); assert.match(stil, /@media print\{:root\{[^}]*--blatt:#fff/, 'gedruckt wird hell');
  assert.match(stil, /@media print\{\n(?:[^\n]*\n)*?#leiste\{display:none\}\n\.seite\{break-before:page/, 'beim Drucken: keine Leiste, jede Seite auf einem neuen Blatt');
  assert.ok(/@media screen\{\n(?:[^\n]*\n)*?\.blaettern \.seite\{display:none/.test(stil) && !/^\.(?:blaettern )?\.?seite\{[^}]*display:none/m.test(stil.replace(/@media screen\{[\s\S]*?\n\}\n/, '')), 'verborgen werden Seiten nur am Bildschirm und nur, wenn das Skript läuft');
});

test('Buch · Blätterbuch: das Skript ist fester Text; die Richtlinie erlaubt genau dieses eine über seine Prüfsumme', () => {
  const soll = 'sha256-' + createHash('sha256').update(BLAETTER_SKRIPT, 'utf8').digest('base64');
  assert.equal(BLAETTER_PRUEFSUMME, soll, `BLAETTER_PRUEFSUMME passt nicht zum Skript – neu eintragen: '${soll}'`);
  assert.equal(BLAETTER_RICHTLINIE, `default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src '${soll}'; base-uri 'none'; form-action 'none'`);
  assert.ok(!/script-src[^;]*unsafe-inline|script-src[^;]*unsafe-eval|script-src[^;]*(?:https?:|\*)/.test(BLAETTER_RICHTLINIE), 'kein unsafe-inline für Skripte, keine Quelle im Netz');
  assert.ok(!/[^\x20-\x7e\n]/.test(BLAETTER_SKRIPT), 'nur ASCII – die Prüfsumme bleibt auf jedem Weg dieselbe'); assert.ok(!/[\\`]/.test(BLAETTER_SKRIPT) && !BLAETTER_SKRIPT.includes('${'), 'kein Rückstrich, nichts Eingesetztes');
  assert.ok(!/<\/script|<!--|-->/i.test(BLAETTER_SKRIPT), 'nichts, was das Skript-Element vorzeitig schließt');
  assert.ok(!/fetch|XMLHttpRequest|WebSocket|sendBeacon|EventSource|import\s*\(|\.src\s*=|new Image|eval|Function\s*\(|innerHTML|outerHTML|insertAdjacent|document\.write|createElement|setAttribute|https?:|localStorage|cookie/.test(BLAETTER_SKRIPT), 'keine Verbindung nach außen, kein HTML aus Text, kein Speicher');
  const a = buchBlaettern(REZEPTE, FEST), b = buchBlaettern([{ name: '<script>x</script>', cat: '`${1}' }], { titel: '\\', sprache: 'en' });
  for (const h of [a, b]) assert.equal(h.slice(h.indexOf('<script>') + 8, h.indexOf('</script>')), BLAETTER_SKRIPT, 'in jedem Buch steht dasselbe Skript, Zeichen für Zeichen');
  assert.ok(!buchPdf(REZEPTE, FEST).includes(BLAETTER_PRUEFSUMME) && !/<script|<button|<main/.test(buchPdf(REZEPTE, FEST)), 'das PDF-Buch trägt kein Skript und keine Knöpfe');
});

test('Buch · Größe: Bytes der gespeicherten Datei, und zum Vorzeigen „640 KB“, „1,4 MB“, „12 MB“', () => {
  assert.equal(buchGroesse('abc'), 3); assert.equal(buchGroesse('ä€😀'), 9, 'UTF-8: 2 + 3 + 4'); assert.equal(buchGroesse(''), 0); assert.equal(buchGroesse(null), 0);
  for (const h of [buchPdf(REZEPTE, FEST), buchBlaettern(REZEPTE, FEST)]) { assert.equal(buchGroesse(h), Buffer.byteLength(h, 'utf8')); assert.ok(buchGroesse(h) > h.length, 'Umlaute zählen doppelt: mehr Bytes als Zeichen'); }
  const gross = buchGroesse(buchPdf(REZEPTE, FEST)), klein = buchGroesse(buchPdf(REZEPTE, { ...FEST, mitBildern: false })); assert.ok(klein < gross, 'ohne Bilder ist das Buch kleiner');
  assert.deepEqual([0, 1, 500, 1024, 655360, 1022976, 1024000, 1048575, 1048576, 1468006, 10380902, 10485760, 12897485].map((b) => buchGroesseText(b)), ['0 KB', '1 KB', '1 KB', '1 KB', '640 KB', '999 KB', '1 MB', '1 MB', '1 MB', '1,4 MB', '9,9 MB', '10 MB', '12 MB'], 'ab 1000 KB in MB, unter 10 MB mit einer Stelle');
  assert.equal(buchGroesseText(1468006, 'en'), '1.4 MB'); assert.equal(buchGroesseText(-5), '0 KB'); assert.equal(buchGroesseText('viel'), '0 KB');
});
