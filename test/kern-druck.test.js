// Proben: Drucken (kern/ausgabe/druck.mjs). Die Dokumente sind Text; drucke() läuft hier gegen ein gestelltes Dokument.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { druckRezept, druckListe, drucke, esc, druckBild, DRUCK_RICHTLINIE, DRUCK_FARBE } from '../kern/ausgabe/druck.mjs';

const BILD = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';
const REZEPT = { id: 3, uid: 'r-probe', name: 'Kartoffelsuppe', cat: 'suppe', servings: 4, prepTime: 45, img: BILD, imgCrop: { x: 30, y: 0, scale: 1.5 }, flavors: ['herzhaft', 'cremig'],
  ings: [{ amt: '500', unit: 'g', name: 'Kartoffeln', note: 'mehlig kochend' }, { amt: '1 ½', unit: 'l', name: 'Brühe' }, { amt: '400-500', unit: 'ml', name: 'Sahne' }, { amt: 'etwas', unit: '', name: 'Muskat' }, { amt: '', unit: '', name: 'Salz' }],
  steps: [{ txt: 'Kartoffeln schälen und würfeln.' }, { txt: 'In der Brühe 20 Minuten kochen.', note: 'Deckel drauf' }, { txt: 'Pürieren und abschmecken.' }],
  rating: { stars: 4, comment: 'Wie bei Oma', imps: [] },
  translations: { en: { name: 'Potato soup', ingredients: ['potatoes', 'stock', 'cream', 'nutmeg', 'salt'], steps: ['Peel and dice the potatoes.', 'Boil in the stock for 20 minutes.', 'Purée and season.'] } } };
const FEST = { datum: '23. November 2026', fuss: 'Mein Rezeptbuch' };
const rumpf = (html) => html.slice(html.indexOf('<body>'));
const ELEMENTE = new Set(['html', 'head', 'meta', 'title', 'style', 'body', 'h1', 'h2', 'p', 'div', 'span', 'img', 'table', 'tr', 'td', 's', 'ol', 'ul', 'li', 'section']);
const ATTRIBUTE = new Set(['lang', 'charset', 'http-equiv', 'content', 'class', 'src', 'alt']);
/** Das Dokument trägt kein Skript und keine Adresse im Netz: JEDES „<…>“ außerhalb des Stils ist ein bekanntes Element in fester
 *  Form mit bekannten Attributen, jedes src ist ein eingebettetes Bild, und der Stil lädt nichts nach. Text bleibt Text. */
function ohneNetzUndSkript(html, wo) {
  assert.ok(html.startsWith('<!DOCTYPE html>\n<html lang="'), wo + ': ganzes Dokument'); assert.ok(html.trimEnd().endsWith('</body>\n</html>'), wo + ': bis zum Ende');
  assert.ok(html.includes(`<meta http-equiv="Content-Security-Policy" content="${DRUCK_RICHTLINIE}">`), wo + ': Inhalts-Richtlinie'); assert.ok(html.includes('<meta charset="utf-8">'));
  assert.equal(html.split('<style>').length, 2, wo + ': genau ein Stil-Block'); assert.equal(html.split('</style>').length, 2, wo + ': er wird genau einmal geschlossen');
  const von = html.indexOf('<style>') + 7, bis = html.indexOf('</style>'), stil = html.slice(von, bis), rest = html.slice(0, von) + html.slice(bis);
  assert.ok(!/[<>]/.test(stil), wo + ': im Stil steht kein < und kein >'); assert.ok(!/@import|url\(|@font-face|expression\(|https?:|\/\/|\\/i.test(stil), wo + ': der Stil lädt nichts nach, keine Schrift aus dem Netz');
  assert.match(stil, /@page\{size:A4;margin:2cm 2cm 2\.2cm\}/, wo + ': A4 mit Rand');
  const marken = [...rest.matchAll(/<[^>]*>/g)].map((m) => m[0]);
  assert.equal(marken.length, (rest.match(/</g) || []).length, wo + ': kein einzelnes <'); assert.equal(marken.length, (rest.match(/>/g) || []).length, wo + ': kein einzelnes >');
  for (const marke of marken) {
    if (marke === '<!DOCTYPE html>') continue;
    const m = marke.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s[a-zA-Z-]+="[^"]*")*)>$/);
    assert.ok(m, `${wo}: Element in fester Form erwartet, gefunden ${marke.slice(0, 90)}`); assert.ok(ELEMENTE.has(m[1]), `${wo}: unerwartetes Element <${m[1]}>`);
    for (const [, name, wert] of m[2].matchAll(/\s([a-zA-Z-]+)="([^"]*)"/g)) { assert.ok(ATTRIBUTE.has(name), `${wo}: unerwartetes Attribut ${name}`); if (name === 'src') assert.match(wert, /^data:image\/(?:jpeg|jpg|png|webp|gif|avif|bmp);base64,[A-Za-z0-9+/]+=*$/, wo + ': jedes Bild ist eingebettet'); }
  }
}

test('Druck · Rezept: Name, Bild, Portionen und Zeit, Zutaten, nummerierte Schritte – alles da und in dieser Reihenfolge', () => {
  const h = druckRezept(REZEPT, { sprache: 'de', kategorieName: 'Suppen', ...FEST });
  ohneNetzUndSkript(h, 'Rezept');
  assert.ok(h.includes('<title>Kartoffelsuppe</title>')); assert.ok(h.includes('<html lang="de">')); assert.ok(h.includes('<h1>Kartoffelsuppe</h1>'));
  for (const z of ['Kartoffeln', 'Brühe', 'Sahne', 'Muskat', 'Salz', 'mehlig kochend']) assert.ok(rumpf(h).includes(z), 'Zutat ' + z);
  assert.ok(h.includes('<td class="m">500 <span class="e">g</span></td><td>Kartoffeln<div class="notiz">mehlig kochend</div></td>')); assert.ok(h.includes('<td class="m">etwas</td><td>Muskat</td>')); assert.ok(h.includes('<td class="m"></td><td>Salz</td>'));
  assert.equal((h.match(/<tr>/g) || []).length, 5); assert.equal((h.match(/<span class="kasten">/g) || []).length, 5, 'je Zutat ein Kästchen zum Abhaken');
  assert.deepEqual([...h.matchAll(/<li><span class="nr">(\d+)<\/span><div class="st">([^<]*)/g)].map((m) => m[1] + ' ' + m[2]), ['1 Kartoffeln schälen und würfeln.', '2 In der Brühe 20 Minuten kochen.', '3 Pürieren und abschmecken.']);
  assert.ok(h.includes('<div class="notiz">Deckel drauf</div>'));
  assert.ok(h.includes('<span class="kat">Suppen</span>')); assert.ok(h.includes('<span class="port">4 Portionen</span>')); assert.ok(h.includes('<span class="zeit">45 Min</span>'));
  assert.ok(h.includes('<span class="chip">herzhaft</span>')); assert.ok(h.includes('<span class="chip">cremig</span>')); assert.ok(h.includes('<span class="sterne">★★★★☆</span>')); assert.ok(h.includes('<div class="wort">„Wie bei Oma“</div>'));
  assert.ok(h.includes(`<div class="bild"><img src="${BILD}" alt="Kartoffelsuppe"></div>`));
  assert.ok(h.includes('<div class="fuss"><span>Mein Rezeptbuch</span><span>23. November 2026</span></div>'));
  const ort = ['<h1>', 'class="meta"', 'class="bild"', '<h2>Zutaten</h2>', '<table>', '<h2>Zubereitung</h2>', '<ol>', 'class="wort"', 'class="fuss"'].map((s) => h.indexOf(s));
  assert.ok(ort.every((p) => p > 0), 'jeder Teil ist da'); assert.deepEqual(ort, [...ort].sort((a, b) => a - b), 'Reihenfolge: Name, Zeile, Bild, Zutaten, Schritte, Kommentar, Fuß');
  assert.ok(h.includes('.bild img{object-position:30% 0%;transform:scale(1.5);transform-origin:30% 0%}'), 'Bildausschnitt wie in der App');
  assert.ok(!h.includes('line-through') && !h.includes('<s>'), 'ohne andere Portionen ist nichts durchgestrichen');
});

test('Druck · Mengen sind für die gewählten Portionen umgerechnet; die ursprüngliche steht durchgestrichen daneben', () => {
  const h = druckRezept(REZEPT, { portionen: 8, ...FEST });
  assert.ok(h.includes('<td class="m"><span class="neu">1000</span><s>500</s> <span class="e">g</span></td>'), '500 g × 2');
  assert.ok(h.includes('<span class="neu">3</span><s>1 ½</s> <span class="e">l</span>'), '1 ½ l × 2'); assert.ok(h.includes('<span class="neu">800-1000</span><s>400-500</s>'), 'Bereich');
  assert.ok(h.includes('<td class="m">etwas</td>'), '„etwas“ bleibt stehen'); assert.ok(h.includes('<td class="m"></td><td>Salz</td>'));
  assert.ok(h.includes('<span class="port neu">8 Portionen</span><span>(Rezept für 4)</span>'));
  const halb = druckRezept(REZEPT, { portionen: 2, ...FEST });
  assert.ok(halb.includes('<span class="neu">250</span><s>500</s>')); assert.ok(halb.includes('<span class="neu">¾</span><s>1 ½</s>')); assert.ok(halb.includes('<span class="port neu">2 Portionen</span>'));
  assert.ok(druckRezept(REZEPT, { portionen: 1, ...FEST }).includes('<span class="port neu">1 Portion</span>'));
  for (const unsinn of [0, -3, 'viele', null, undefined, NaN, '']) { const u = druckRezept(REZEPT, { portionen: unsinn, ...FEST }); assert.ok(u.includes('<span class="port">4 Portionen</span>') && u.includes('<td class="m">500 <span class="e">g</span></td>'), 'unbrauchbare Portionen: es bleibt beim Rezept – ' + String(unsinn)); }
  assert.ok(druckRezept(REZEPT, { portionen: '6', ...FEST }).includes('<span class="neu">750</span><s>500</s>'), 'eine Zahl als Text gilt');
});

test('Druck · Sonderzeichen sind entschärft: <script> im Namen und in jedem anderen Feld bleibt Text', () => {
  const B = '<script>alert(1)</script>', A = '"><img src=x onerror=alert(2)>', C = "'</style><script>x</script>";
  const boese = { name: 'Suppe ' + B, servings: 4, prepTime: 30, flavors: [A], img: BILD, cat: B,
    ings: [{ amt: B, unit: A, name: 'Mehl ' + B, note: C }], steps: [{ txt: 'Rühren ' + B + ' & kochen', note: A }], rating: { stars: 5, comment: C },
    translations: { de: { name: 'Übersetzt ' + B, ingredients: ['Mehl ' + A], steps: ['Schritt ' + C] } } };
  for (const [wo, h] of [['Rezept', druckRezept(boese, { kategorieName: A + B, fuss: B, datum: C, farbe: 'red;}</style><script>1</script>' })], ['Rezept ohne Übersetzung', druckRezept({ ...boese, translations: undefined }, { portionen: 8, kategorieName: C, fuss: A, datum: B })],
    ['Liste', druckListe('Einkauf ' + B, [{ text: 'Mehl ' + B, gruppe: A, menge: C }, B, { text: A }], { fuss: C, datum: B })]]) {
    ohneNetzUndSkript(h, wo);
    assert.ok(!/<script/i.test(h), wo + ': kein <script>'); assert.ok(!h.includes('<img src=x'), wo + ': kein eingeschleustes Bild');
    assert.ok(h.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), wo + ': der Text steht entschärft da');
    assert.equal((h.match(/<img/g) || []).length, wo === 'Liste' ? 0 : 1, wo + ': nur das eine eingebettete Bild');
  }
  const h = druckRezept(boese, { kategorieName: 'K' });
  assert.ok(h.includes('<title>Übersetzt &lt;script&gt;alert(1)&lt;/script&gt;</title>')); assert.ok(h.includes('alt="Übersetzt &lt;script&gt;alert(1)&lt;/script&gt;"'), 'auch im Attribut');
  assert.ok(h.includes('&quot;&gt;&lt;img src=x onerror=alert(2)&gt;')); assert.ok(h.includes('&#39;&lt;/style&gt;'));
  assert.ok(h.includes(`:root{--f:${DRUCK_FARBE}}`)); assert.ok(druckRezept(boese, { farbe: 'red;}</style>' }).includes(`:root{--f:${DRUCK_FARBE}}`), 'eine Farbe, die keine ist, wird nicht übernommen'); assert.ok(druckRezept(boese, { farbe: '#2D6070' }).includes(':root{--f:#2D6070}'));
  assert.equal(esc(`<a href="x" title='y'>&</a>`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;'); assert.equal(esc(null), ''); assert.equal(esc(5), '5');
});

test('Druck · ohne Bild kein <img>; ein Bild mit Adresse im Netz wird weggelassen, nie abgerufen', () => {
  assert.ok(druckRezept(REZEPT, FEST).includes('<img ')); assert.ok(!druckRezept(REZEPT, { mitBild: false, ...FEST }).includes('<img'), 'mitBild: false');
  assert.ok(!druckRezept({ ...REZEPT, img: '' }, FEST).includes('<img'), 'Rezept ohne Bild'); assert.ok(!druckRezept({ ...REZEPT, img: '' }, FEST).includes('class="bild"'));
  for (const fremd of ['https://boese.example/zaehlpixel.png', 'http://192.168.0.1/x.jpg', '//cdn.example/x.png', 'bilder/suppe.jpg', 'blob:https://x/1', 'javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,AAAA" onload="x', 'data:image/png,roh']) {
    const h = druckRezept({ ...REZEPT, img: fremd }, FEST); assert.ok(!h.includes('<img'), 'kein Bild für ' + fremd); ohneNetzUndSkript(h, fremd); assert.equal(druckBild(fremd), '');
  }
  assert.equal(druckBild(BILD), BILD); assert.equal(druckBild('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo='); assert.equal(druckBild(undefined), '');
  const schief = druckRezept({ ...REZEPT, imgCrop: { x: '50%;}</style><script>1</script>', y: -7, scale: -4 } }, FEST); ohneNetzUndSkript(schief, 'schiefer Ausschnitt'); assert.ok(schief.includes('.bild img{object-position:50% 0%}\n'), 'Text statt Zahl wird zur Mitte, Vergrößerung unter 1 entfällt');
  assert.ok(druckRezept({ ...REZEPT, imgCrop: { x: 'quatsch', y: 9999, scale: 44 } }, FEST).includes('.bild img{object-position:50% 100%;transform:scale(3);transform-origin:50% 100%}'), 'Ausschnitt: nur Zahlen, in ihren Grenzen');
});

test('Druck · Sprache: Beschriftung englisch, die Übersetzung am Rezept steht da, der ursprüngliche Name klein darunter', () => {
  const h = druckRezept(REZEPT, { sprache: 'en', portionen: 8, kategorieName: 'Soups', datum: new Date(2026, 10, 23), fuss: 'My recipe book' });
  ohneNetzUndSkript(h, 'en');
  assert.ok(h.includes('<html lang="en">')); assert.ok(h.includes('<h1>Potato soup</h1>')); assert.ok(h.includes('<p class="urname">Kartoffelsuppe</p>'));
  assert.ok(h.includes('<h2>Ingredients</h2>')); assert.ok(h.includes('<h2>Preparation</h2>')); assert.ok(h.includes('<td>potatoes<div class="notiz">mehlig kochend</div></td>')); assert.ok(h.includes('<div class="st">Peel and dice the potatoes.</div>'));
  assert.ok(h.includes('<span class="port neu">8 servings</span><span>(recipe for 4)</span>')); assert.ok(h.includes('<span class="zeit">45 min</span>')); assert.ok(h.includes('<span>23 November 2026</span>'), 'Datum im Gebietsschema der Sprache');
  assert.ok(!druckRezept(REZEPT, FEST).includes('class="urname"'), 'ohne Übersetzung kein zweiter Name');
  assert.ok(druckRezept(REZEPT, { sprache: 'xx<', ...FEST }).includes('<html lang="de">'), 'eine unbekannte Sprache kommt nicht ins Dokument');
  assert.match(druckRezept(REZEPT, { fuss: 'Mein Rezeptbuch' }), /<div class="fuss"><span>Mein Rezeptbuch<\/span><span>\d{1,2}\. \p{L}+ \d{4}<\/span><\/div>/u, 'ohne Angabe steht das heutige Datum da');
  assert.ok(!druckRezept(REZEPT, { datum: null }).includes('class="fuss"'), 'datum: null und kein Fußtext: keine Fußzeile');
});

test('Druck · karges Rezept: nur ein Name, Zutaten als Text, fehlende Felder – es entsteht trotzdem ein ganzes Blatt', () => {
  const h = druckRezept({ name: 'Tee', ingredients: ['Wasser', '1 Beutel Tee'], steps: ['Aufgießen.'] }, FEST);
  ohneNetzUndSkript(h, 'karg'); assert.ok(h.includes('<h1>Tee</h1>')); assert.ok(h.includes('<td>Wasser</td>')); assert.ok(h.includes('<span class="nr">1</span><div class="st">Aufgießen.</div>')); assert.ok(h.includes('4 Portionen'));
  assert.ok(!h.includes('class="kat"') && !h.includes('class="zeit"') && !h.includes('class="sterne"') && !h.includes('class="wort"') && !h.includes('<img'));
  const leer = druckRezept({}, FEST); ohneNetzUndSkript(leer, 'leer'); assert.ok(leer.includes('<h1>Rezept</h1>')); assert.ok(!leer.includes('<table>') && !leer.includes('<ol>'));
  ohneNetzUndSkript(druckRezept(null, { sprache: 'en', ...FEST }), 'null'); assert.ok(druckRezept(null, { sprache: 'en', ...FEST }).includes('<h1>Recipe</h1>'));
});

test('Druck · Liste: Titel, Gruppen in der Reihenfolge ihres ersten Vorkommens, jede Zeile mit Kästchen, Menge fett davor', () => {
  const zeilen = [{ text: 'Kartoffeln', gruppe: 'Gemüse', menge: '1 kg' }, { text: 'Sahne', gruppe: 'Milch & Käse', menge: '400 ml' }, { text: 'Zwiebeln', gruppe: 'Gemüse', menge: '3' }, { text: 'Salz' }, 'Küchenrolle', { text: '', gruppe: 'Leer' }, null];
  const h = druckListe('Einkaufsliste', zeilen, { sprache: 'de', ...FEST });
  ohneNetzUndSkript(h, 'Liste');
  assert.ok(h.includes('<title>Einkaufsliste</title>')); assert.ok(h.includes('<h1>Einkaufsliste</h1>')); assert.ok(h.includes('<p class="datum">23. November 2026</p>'));
  assert.deepEqual([...h.matchAll(/<h2>([^<]*)<\/h2>/g)].map((m) => m[1]), ['Gemüse', 'Milch &amp; Käse'], 'Gruppen in der Reihenfolge des ersten Vorkommens; eine Gruppe ohne Zeile erscheint nicht');
  const gruppen = [...h.matchAll(/<section>\n(?:<h2>([^<]*)<\/h2>\n)?<ul>\n([\s\S]*?)\n<\/ul>/g)].map((m) => [m[1] || '', [...m[2].matchAll(/<span class="lt">([^<]*)<\/span>/g)].map((x) => x[1])]);
  assert.deepEqual(gruppen, [['Gemüse', ['Kartoffeln', 'Zwiebeln']], ['Milch &amp; Käse', ['Sahne']], ['', ['Salz', 'Küchenrolle']]]);
  assert.ok(h.includes('<li><span class="kasten"></span><span class="lm">1 kg</span><span class="lt">Kartoffeln</span></li>')); assert.ok(h.includes('<li><span class="kasten"></span><span class="lt">Salz</span></li>'));
  assert.equal((h.match(/<span class="kasten">/g) || []).length, 5); assert.ok(h.includes('<div class="fuss"><span>Mein Rezeptbuch</span><span></span></div>'));
  const en = druckListe('', [], { sprache: 'en', datum: null }); ohneNetzUndSkript(en, 'leere Liste'); assert.ok(en.includes('<h1>List</h1>')); assert.ok(en.includes('<p>The list is empty.</p>')); assert.ok(!en.includes('class="datum"'));
  assert.ok(druckListe('L', 'kein Feld', FEST).includes('Die Liste ist leer.'));
});

// ───────────── drucke(): gegen ein gestelltes Dokument ─────────────

function gestellt({ printWirft = false, ohneAfterprint = false } = {}) {
  const protokoll = [], rahmen = [];
  const dok = { activeElement: { focus: () => protokoll.push('fokus zurück') }, querySelectorAll: (s) => { protokoll.push('suche ' + s); return rahmen.filter((r) => r.da); },
    createElement: (tag) => { const hoerer = {}, fenster = { hoerer: {}, addEventListener: (n, f) => { fenster.hoerer[n] = f; }, focus: () => protokoll.push('fokus Rahmen'),
        print: () => { protokoll.push('print'); if (printWirft) throw new Error('Drucker brennt'); if (!ohneAfterprint) setTimeout(() => fenster.hoerer.afterprint && fenster.hoerer.afterprint(), 0); } };
      const r = { tag, attr: {}, da: false, srcdoc: null, contentWindow: fenster, setAttribute: (k, v) => { r.attr[k] = v; }, addEventListener: (n, f) => { hoerer[n] = f; }, remove: () => { r.da = false; protokoll.push('Rahmen weg'); }, lade: () => hoerer.load && hoerer.load() };
      rahmen.push(r); return r; },
    body: { appendChild: (r) => { r.da = true; protokoll.push('Rahmen da'); setTimeout(() => r.lade(), 0); } } };
  return { dok, protokoll, rahmen };
}

test('Druck · drucke(): unsichtbarer Rahmen ohne Skript-Erlaubnis, print() einmal, danach ist der Rahmen weg; kein neues Fenster', async () => {
  const { dok, protokoll, rahmen } = gestellt(), html = druckRezept(REZEPT, FEST);
  let fensterAuf = 0; const altOpen = globalThis.open; globalThis.open = () => { fensterAuf++; };
  try { await drucke(html, { dokument: dok, nachlauf: 0 }); } finally { if (altOpen === undefined) delete globalThis.open; else globalThis.open = altOpen; }
  assert.equal(fensterAuf, 0, 'kein window.open'); assert.equal(rahmen.length, 1); const r = rahmen[0];
  assert.equal(r.tag, 'iframe'); assert.equal(r.srcdoc, html, 'das Dokument steht unverändert im Rahmen');
  assert.equal(r.attr.sandbox, 'allow-same-origin allow-modals', 'ohne allow-scripts'); assert.equal(r.attr['aria-hidden'], 'true'); assert.equal(r.attr.tabindex, '-1');
  assert.match(r.attr.style, /visibility:hidden/); assert.match(r.attr.style, /width:0;height:0;border:0/); assert.ok(!/display:\s*none/.test(r.attr.style), 'nicht display:none – so ein Rahmen druckt in manchen Browsern leer');
  assert.deepEqual(protokoll, ['suche iframe[data-kern-druck]', 'Rahmen da', 'fokus Rahmen', 'print', 'Rahmen weg', 'fokus zurück']); assert.equal(r.da, false);
});

test('Druck · drucke(): Nachlauf, liegengebliebener Rahmen, Fehler von print(), kein Browser, Frist ohne afterprint', async () => {
  const a = gestellt(); const lauf = drucke('<p>x</p>', { dokument: a.dok, nachlauf: 30 }); await lauf;
  assert.equal(a.rahmen[0].da, true, 'direkt nach dem Dialog steht der Rahmen noch (Nachlauf)'); await new Promise((r) => setTimeout(r, 60)); assert.equal(a.rahmen[0].da, false, 'nach dem Nachlauf ist er weg');
  const b = gestellt({ ohneAfterprint: true }); const erster = drucke('<p>1</p>', { dokument: b.dok, nachlauf: 0, frist: 20 });
  await new Promise((r) => setTimeout(r, 5)); assert.equal(b.rahmen[0].da, true); await erster; assert.equal(b.rahmen[0].da, false, 'ohne afterprint räumt die Frist auf');
  const c = gestellt({ ohneAfterprint: true }), haengt = drucke('<p>1</p>', { dokument: c.dok, nachlauf: 0, frist: 150 }); await new Promise((r) => setTimeout(r, 5)); assert.equal(c.rahmen[0].da, true, 'der erste Rahmen steht noch (kein afterprint, Frist läuft)');
  const zweiter = drucke('<p>2</p>', { dokument: c.dok, nachlauf: 0, frist: 10 }); assert.equal(c.rahmen[0].da, false, 'der zweite Druck räumt den Rahmen des ersten weg'); await zweiter; await haengt; assert.equal(c.rahmen.filter((r) => r.da).length, 0);
  const d = gestellt({ printWirft: true }); await assert.rejects(drucke('<p>x</p>', { dokument: d.dok }), /Drucker brennt/); assert.equal(d.rahmen[0].da, false, 'auch nach einem Fehler ist der Rahmen weg');
  await assert.rejects(drucke('<p>x</p>', { dokument: null }), /nur im Browser/); await assert.rejects(drucke('<p>x</p>', { dokument: {} }), /nur im Browser/);
  await assert.rejects(drucke('<p>x</p>'), /nur im Browser/, 'in Node gibt es kein Dokument'); await assert.rejects(drucke('<p>x</p>', { sprache: 'en' }), /only works in the browser/);
});

test('Notizen zum ganzen Rezept stehen im Druck, entschärft und mit ihren Zeilenumbrüchen; ohne Notizen gibt es keinen Abschnitt', () => {
  const mit = druckRezept({ uid: 'x', name: 'Mojito', ings: [{ amt: '4', unit: 'cl', name: 'Rum' }], steps: [{ txt: 'Rühren.' }], notes: 'Mit Eis servieren.\n<b>Nicht</b> schütteln.' });
  assert.ok(mit.includes('>Notizen<') && mit.includes('Mit Eis servieren.') && mit.includes('&lt;b&gt;Nicht&lt;/b&gt; schütteln.') && !mit.includes('<b>Nicht</b>'));
  assert.ok(druckRezept({ uid: 'x', name: 'Mojito', ings: [], steps: [{ txt: 'Rühren.' }], notes: 'x' }, { sprache: 'en' }).includes('>Notes<'));
  assert.ok(!druckRezept({ uid: 'y', name: 'Ohne', ings: [], steps: [{ txt: 'Rühren.' }] }).includes('>Notizen<'));
  assert.ok(!druckRezept({ uid: 'z', name: 'Leer', ings: [], steps: [{ txt: 'Rühren.' }], notes: '   ' }).includes('>Notizen<'));
});
