// Proben: Rezeptmodell, Kategorien, Suche, Sicherung, Übernahme (kern/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalisiere, istInhalt, katVonRezept, ordnerVonRezept, KAT_OHNE } from '../kern/modell/rezept.mjs';
import { alleKategorien, gruppiere, beschriftung, anlegen, umbenennen, loeschen, umsortieren, leereKategorien, anzahl } from '../kern/modell/kategorien.mjs';
import { suche } from '../kern/modell/suche.mjs';
import { lies, schreibe, fuehreZusammen, hinweise, FASSUNG } from '../kern/sicherung/sicherung.mjs';
import { ausAltemSpeicher } from '../kern/speicher/uebernahme.mjs';
import { leererZustand } from '../kern/modell/zustand.mjs';

const R = (o) => normalisiere({ id: 1, name: 'Test', cat: 'fisch', ings: [{ name: 'Reis' }], steps: [{ txt: 'kochen' }], ...o });
const buch = () => lies(readFileSync('beispiele/beispielbuch-mein-rezeptbuch.json', 'utf8'));

test('blank gilt nur ohne Namen: ein Rezept mit Namen und blank:true ist Inhalt', () => {
  const r = R({ blank: true });
  assert.equal(r.blank, false); assert.ok(istInhalt(r));
  assert.equal(normalisiere({ id: 2, name: '  ', blank: false }).blank, true);
});

test('Kategorie-Kennung wird getrimmt, fld_ zieht in den Ordner um', () => {
  assert.equal(R({ cat: 'sushi ' }).cat, 'sushi');
  assert.equal(katVonRezept({ name: 'roh', cat: ' sushi ' }), 'sushi', 'auch ein nicht normalisiertes Rezept');
  const r = R({ cat: 'fld_77', folder: '' });
  assert.equal(r.cat, ''); assert.equal(r.folder, '77'); assert.equal(katVonRezept(r), KAT_OHNE);
  assert.equal(ordnerVonRezept(r, []), ''); assert.equal(ordnerVonRezept(r, [{ id: '77' }]), '77');
});

test('uid: gleiche alte Nummer ergibt dieselbe Kennung, vorhandene bleibt', () => {
  assert.equal(R({ id: 42 }).uid, R({ id: 42 }).uid);
  assert.equal(R({ uid: 'mrb-abc' }).uid, 'mrb-abc');
});

test('Jede Kennung genau einmal; unbekannte wird gezeigt, nicht geraten; „Ohne Kategorie“ nur bei Bedarf', () => {
  const rz = [R({ id: 1, cat: 'fisch' }), R({ id: 2, cat: 'xyz' }), R({ id: 3, cat: '' })];
  const k = alleKategorien(rz), ids = k.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(k.find((c) => c.id === 'xyz').art, 'unbekannt'); assert.equal(k.find((c) => c.id === 'xyz').de, 'xyz');
  assert.ok(ids.includes(KAT_OHNE));
  assert.ok(!alleKategorien([R({})]).some((c) => c.id === KAT_OHNE));
});

test('Wächter: alles, was die Suche findet, steht in genau einer Gruppe von „Alle“', () => {
  const e = buch(); const rz = [...e.rezepte, R({ id: 9001, name: 'Sushi blank', blank: true, cat: 'eig_1789556014817' }), R({ id: 9002, name: 'Sushi Leerzeichen', cat: 'eig_1789556014817 ' }), R({ id: 9003, name: 'Sushi Ordnerrest', cat: 'fld_5' })];
  const gruppen = gruppiere(rz, e.kategorien);
  const inAlle = gruppen.flatMap((g) => g.rezepte.map((r) => r.uid));
  assert.equal(new Set(inAlle).size, inAlle.length, 'kein Rezept doppelt');
  for (const r of suche(rz, '', e.kategorien)) assert.ok(inAlle.includes(r.uid), r.name);
  const treffer = suche(rz, 'sushi', e.kategorien);
  assert.ok(treffer.length >= 9);
  for (const r of treffer) assert.ok(inAlle.includes(r.uid), `nur die Suche findet: ${r.name}`);
});

test('Klaus\' Sushi: die Kategorie heißt nach dem Einlesen „Sushi“, nicht eig_…', () => {
  const e = buch(); const k = alleKategorien(e.rezepte, e.kategorien).find((c) => c.id === 'eig_1789556014817');
  assert.ok(k); assert.equal(k.art, 'eigen'); assert.equal(beschriftung(k, 'de', e.kategorien), 'Sushi');
  assert.equal(anzahl(e.rezepte, 'eig_1789556014817'), 7);
  assert.equal(suche(e.rezepte, 'Sushi', e.kategorien).filter((r) => r.cat === 'eig_1789556014817').length, 7, 'Suche nach dem Kategorienamen findet alle sieben');
});

test('Sicherung: schreiben und wieder lesen ergibt dasselbe, samt eigener Kategorien', () => {
  const e = buch(); const z = { rezepte: e.rezepte, menu: e.menu, ordner: [{ id: '5', name: 'Feste' }], kategorien: umbenennen(e.kategorien, 'fisch', 'Fisch & Meer') };
  const s = schreibe(z, { jetzt: new Date('2026-11-23T12:00:00Z') });
  assert.equal(s.version, FASSUNG);
  const zurueck = lies(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(zurueck.rezepte, z.rezepte); assert.deepEqual(zurueck.kategorien, z.kategorien); assert.deepEqual(zurueck.ordner, z.ordner);
  assert.ok(!JSON.stringify(s).match(/claudeKey|openaiKey|mistralKey/), 'keine Schlüssel in der Sicherung');
});

test('Zusammenführen: zweimal dieselbe Datei ergibt keine Doppelten; umbenanntes Rezept wird an der Kennung erkannt', () => {
  const e = buch(); let z = fuehreZusammen(leererZustand(), e).zustand;
  assert.equal(z.rezepte.length, e.rezepte.length);
  z = { ...z, rezepte: z.rezepte.map((r, i) => (i === 0 ? { ...r, name: 'Ganz anderer Name' } : r)) };
  const m = fuehreZusammen(z, buch());
  assert.equal(m.neu, 0); assert.equal(m.doppelt, e.rezepte.length); assert.equal(m.zustand.rezepte.length, e.rezepte.length);
});

test('Zusammenführen: zwei verschiedene Rezepte mit gleichem Namen landen beide (Fassung 10+)', () => {
  const z = fuehreZusammen(leererZustand(), lies({ version: 10, recipes: [{ id: 1, uid: 'a', name: 'Gulasch', cat: 'fleisch' }] })).zustand;
  const m = fuehreZusammen(z, lies({ version: 10, recipes: [{ id: 7, uid: 'b', name: 'Gulasch', cat: 'fleisch' }] }));
  assert.equal(m.neu, 1); assert.equal(m.zustand.rezepte.length, 2);
});

test('Zusammenführen: Ordner kommen mit, vorhandene Ordner und Namen werden nicht überschrieben', () => {
  const z0 = { ...leererZustand(), ordner: [{ id: '5', name: 'Meiner' }], kategorien: { ...leereKategorien(), namen: { fisch: { name: 'Mein Fisch' } } } };
  const ein = lies({ version: 11, recipes: [{ id: 1, uid: 'x', name: 'A', cat: 'fisch', folder: '6' }], folders: [{ id: 5, name: 'Fremd' }, { id: 6, name: 'Neu' }], kategorien: { namen: { fisch: { name: 'Fremder Fisch' } } } });
  const z = fuehreZusammen(z0, ein).zustand;
  assert.deepEqual(z.ordner.map((o) => o.name), ['Meiner', 'Neu']);
  assert.equal(z.kategorien.namen.fisch.name, 'Mein Fisch');
  assert.equal(ordnerVonRezept(z.rezepte[0], z.ordner), '6');
});

test('Alte Sicherung Fassung 9 (Klaus\' Form): Platzhalter fallen weg, Hinweise stimmen', () => {
  const e = lies({ version: 9, recipes: [{ id: 1, name: '', blank: true, cat: 'fisch' }, { id: 2, name: 'Suppe', cat: 'suppe', blank: false, img: '' }, { id: 3, name: 'Lose', cat: '' }], menu: [], folders: [] });
  assert.equal(e.rezepte.length, 2);
  assert.deepEqual(hinweise(e), { ohneKategorie: 1, ohneBild: 2, ordnerFehlt: 0, eigeneKategorien: 0 });
  assert.throws(() => lies('kein json'), /keine gültige Sicherung/); assert.throws(() => lies({ foo: 1 }), /keine Rezepte/);
});

test('Kategorien: anlegen, umbenennen, löschen mit Ziel, umsortieren', () => {
  let rz = [R({ id: 1, cat: 'fisch' }), R({ id: 2, cat: 'fisch' })]; let k = leereKategorien();
  const a = anlegen(k, 'Sushi', 'fisch'); k = a.kat; rz = rz.map((r) => (r.id === 1 ? { ...r, cat: a.id } : r));
  assert.equal(beschriftung(alleKategorien(rz, k).find((c) => c.id === a.id), 'en', k), 'Sushi');
  assert.throws(() => loeschen(rz, k, a.id, null), /Ziel nötig/);
  const l = loeschen(rz, k, a.id, 'fisch'); assert.equal(l.verschoben, 1); assert.equal(anzahl(l.rezepte, 'fisch'), 2);
  assert.ok(!alleKategorien(l.rezepte, l.kat).some((c) => c.id === a.id));
  const fest = loeschen([R({ cat: 'suppe' })], leereKategorien(), 'fisch', null);
  assert.ok(!alleKategorien(fest.rezepte, fest.kat).some((c) => c.id === 'fisch'), 'leere feste Kategorie ist ausgeblendet');
  assert.ok(alleKategorien([R({ cat: 'fisch' })], fest.kat).some((c) => c.id === 'fisch'), 'mit Inhalt ist sie von selbst zurück');
  const s = umsortieren(rz, leereKategorien(), 'kuchen', 'vorsp');
  assert.equal(alleKategorien(rz, s)[0].id, 'kuchen');
});

test('Übernahme: liest nur die Schlüssel der eigenen Ausgabe, eigene Kategorie mit Namen kommt mit', () => {
  const daten = { mrz9m: JSON.stringify([{ id: 1, name: 'Dragon Roll', cat: 'eig_1', blank: false }, { id: 2, name: '', blank: true, cat: 'fisch' }]),
    mrzcatsneu9m: JSON.stringify([{ id: 'eig_1', ico: '🏷', de: 'Neue Kategorie', eigen: true }]), mrzcats9m: JSON.stringify({ eig_1: { name: 'Sushi', ico: '🍣' } }),
    mfd9m: JSON.stringify([{ id: 5, name: 'Feste' }]), mlang9m: 'de', mrz9: JSON.stringify([{ id: 9, name: 'Muttis Braten', cat: 'fleisch' }]) };
  const gelesen = []; const sp = { getItem: (k) => { gelesen.push(k); return k in daten ? daten[k] : null; } };
  const z = ausAltemSpeicher(sp, '9m');
  assert.equal(z.rezepte.length, 1); assert.equal(z.rezepte[0].name, 'Dragon Roll');
  assert.equal(beschriftung(alleKategorien(z.rezepte, z.kategorien).find((c) => c.id === 'eig_1'), 'de', z.kategorien), 'Sushi');
  assert.ok(gelesen.every((k) => k.endsWith('9m')), 'kein Schlüssel der anderen Ausgabe gelesen: ' + gelesen.join(','));
  const m = ausAltemSpeicher({ getItem: (k) => (k in daten ? daten[k] : null) }, '9');
  assert.deepEqual(m.rezepte.map((r) => r.name), ['Muttis Braten']);
  assert.equal(ausAltemSpeicher({ getItem: () => null }, '9m'), null);
});

import { zutatenFuerSchritt, zeitImSchritt, stichworte } from '../kern/modell/kochen.mjs';
import { erkenne } from '../kern/oberflaeche/geraete.mjs';
test('Kochansicht: Zutaten je Schritt, Zeit im Schritt, Geräte aus dem Text', () => {
  const r = normalisiere({ id: 1, name: 'Bowl', cat: 'fisch', ings: [{ name: 'Sushi-Reis' }, { name: 'Reisessig' }, { name: 'frischer Lachs' }, { name: 'Zwiebel' }, { name: 'Honig oder Ahornsirup' }],
    steps: [{ txt: 'Reis kochen und mit Reisessig würzen.' }, { txt: 'Den Lachs in Würfel schneiden, Zwiebeln hacken und 8–10 Minuten braten.' }, { txt: 'Mit Honig abschmecken und 2 Stunden kalt stellen.' }] });
  assert.deepEqual(zutatenFuerSchritt(r, 0).map((z) => z.name), ['Sushi-Reis', 'Reisessig']);
  assert.deepEqual(zutatenFuerSchritt(r, 1).map((z) => z.name), ['frischer Lachs', 'Zwiebel']);
  assert.deepEqual(zutatenFuerSchritt(r, 2).map((z) => z.name), ['Honig oder Ahornsirup']);
  assert.deepEqual(stichworte('frischer Lachs (ohne Haut)'), ['lachs']);
  const g = normalisiere({ id: 2, name: 'Gulasch', ings: [{ name: 'Knoblauchzehen' }, { name: 'Fleischbrühe' }, { name: 'Lachs' }], steps: [{ txt: 'Fleisch anbraten, Knoblauch zugeben, Lachswürfel dazu.' }] });
  assert.deepEqual(zutatenFuerSchritt(g, 0).map((z) => z.name), ['Knoblauchzehen', 'Lachs'], '„Fleisch“ im Text ist nicht „Fleischbrühe“');
  assert.equal(zeitImSchritt(r.steps[1].txt), 10); assert.equal(zeitImSchritt(r.steps[2].txt), 120); assert.equal(zeitImSchritt('Gut umrühren.'), 0); assert.equal(zeitImSchritt('5 Min. andünsten'), 5);
  assert.deepEqual(erkenne(r.steps[1].txt), ['messer', 'brett', 'pfanne']); assert.deepEqual(erkenne('Servieren.'), []);
});

import { einkaufsliste, zahlAus, warengruppe, gruppenFolge, gruppeVerschieben } from '../kern/modell/einkauf.mjs';
import { woche, planen, entplanen, ausAltemMenu, tagIso } from '../kern/modell/plan.mjs';
test('Einkaufsliste: zusammenzählen, Einheiten, Portionen, Warengruppen, Reihenfolge je Laden', () => {
  const a = normalisiere({ id: 1, name: 'A', servings: 2, ings: [{ amt: '200', unit: 'g', name: 'Reis' }, { amt: '1', unit: 'EL', name: 'Sesam' }, { amt: '', unit: '', name: 'Salz' }, { amt: '1', unit: 'Stück', name: 'Gurke' }] });
  const b = normalisiere({ id: 2, name: 'B', servings: 4, ings: [{ amt: '1', unit: 'kg', name: 'reis' }, { amt: '2', unit: 'TL', name: 'Sesam' }, { amt: '½', unit: 'Stück', name: 'Gurke' }] });
  const l = einkaufsliste([{ rezept: a, portionen: 4 }, { rezept: b, portionen: 4 }]), von = (n) => l.find((x) => x.name.toLowerCase() === n);
  assert.equal(von('reis').menge, '1,4 kg'); assert.deepEqual(von('reis').aus, ['A', 'B']);
  assert.equal(von('sesam').menge, '2,7 EL'); assert.equal(von('gurke').menge, '2,5 Stück'); assert.equal(von('salz').menge, '');
  const m = einkaufsliste([{ rezept: normalisiere({ id: 3, name: 'C', ings: [{ amt: '1', name: 'Knoblauchzehe' }, { amt: '1', name: 'Zwiebel' }] }) }, { rezept: normalisiere({ id: 4, name: 'D', ings: [{ amt: '2', name: 'Knoblauchzehen' }, { amt: '2', name: 'Zwiebeln' }] }) }]);
  assert.deepEqual(m.map((x) => [x.name, x.menge]), [['Knoblauchzehen', '3'], ['Zwiebeln', '3']], 'Einzahl und Mehrzahl werden zusammengezählt');
  assert.equal(warengruppe('frischer Lachs'), 'fleisch'); assert.equal(warengruppe('Gurke'), 'gemuese'); assert.equal(warengruppe('Einhornstaub'), 'sonstiges');
  assert.equal(zahlAus('1 ½'), 1.5); assert.equal(zahlAus('400-500'), 500); assert.equal(zahlAus('etwas'), null);
  const f = gruppeVerschieben([], 'obst', 'gemuese'); assert.equal(f[0], 'obst'); assert.equal(f.length, gruppenFolge([]).length); assert.equal(new Set(f).size, f.length);
});
test('Wochenplan: Woche Mo–So mit Kalenderwoche, planen, entplanen, altes Menü', () => {
  const w = woche(new Date(2026, 10, 25)); assert.equal(tagIso(w.tage[0]), '2026-11-23'); assert.equal(tagIso(w.tage[6]), '2026-11-29'); assert.equal(w.kw, 48);
  assert.equal(woche(new Date(2027, 0, 1)).kw, 53); assert.equal(woche(new Date(2026, 0, 1)).kw, 1);
  let p = planen({}, '2026-11-23', 'a'); p = planen(p, '2026-11-23', 'a'); p = planen(p, '2026-11-23', 'b'); assert.deepEqual(p['2026-11-23'], ['a', 'b']);
  p = entplanen(entplanen(p, '2026-11-23', 'a'), '2026-11-23', 'b'); assert.deepEqual(p, {});
  assert.deepEqual(ausAltemMenu([{ rid: 7, date: '2026-04-20' }, { rid: 0, date: '2026-04-21' }], [{ id: 7, uid: 'x' }]), { '2026-04-20': ['x'] });
});

import { rezeptAusText, zutatAusZeile } from '../kern/import/text.mjs';
test('Text-Import ohne KI: Überschriften, Portionen, Zeit, Zutaten, nummerierte Schritte', () => {
  const r = rezeptAusText(`Kartoffelsuppe\n\nFür 4 Personen · Zubereitungszeit: 35 Minuten\n\nZutaten:\n500 g Kartoffeln (mehlig)\n1 ½ l Gemüsebrühe\n2 EL Butter\n1 Zwiebel\nSalz und Pfeffer\n\nZubereitung\n1. Kartoffeln schälen und würfeln.\n2. Zwiebel in Butter andünsten,\nKartoffeln zugeben.\n3. Mit Brühe 20 Minuten kochen.\n\nGuten Appetit!`);
  assert.equal(r.name, 'Kartoffelsuppe'); assert.equal(r.servings, 4); assert.equal(r.prepTime, 35); assert.equal(r.sicher, true);
  assert.deepEqual(r.ings.map((z) => [z.amt, z.unit, z.name, z.note]), [['500', 'g', 'Kartoffeln', 'mehlig'], ['1 ½', 'l', 'Gemüsebrühe', ''], ['2', 'EL', 'Butter', ''], ['1', '', 'Zwiebel', ''], ['', '', 'Salz und Pfeffer', '']]);
  assert.deepEqual(r.steps.map((s) => s.txt), ['Kartoffeln schälen und würfeln.', 'Zwiebel in Butter andünsten, Kartoffeln zugeben.', 'Mit Brühe 20 Minuten kochen.']);
});
test('Text-Import ohne Überschriften: Zutatenzeilen oben, Absätze unten, als unsicher markiert; leerer Text ergibt nichts', () => {
  const r = rezeptAusText(`Pfannkuchen\n250 g Mehl\n3 Eier\n500 ml Milch\n\nAlles zu einem glatten Teig verrühren.\n\nIn der Pfanne goldbraun backen.`);
  assert.equal(r.sicher, false); assert.equal(r.ings.length, 3); assert.equal(r.steps.length, 2); assert.equal(r.ings[1].name, 'Eier');
  assert.equal(rezeptAusText('  \n '), null);
  assert.deepEqual(zutatAusZeile('- 400-500 g Hähnchenbrust'), { amt: '400-500', unit: 'g', name: 'Hähnchenbrust', note: '' });
  assert.deepEqual(zutatAusZeile('etwas Petersilie'), { amt: '', unit: '', name: 'etwas Petersilie', note: '' });
});

import { kiBild, gratisBild, bildAuftrag } from '../kern/ki/bild.mjs';
import { tresor, MAX_AUTO } from '../kern/speicher/tresor.mjs';
test('KI-Bild: zweites Modell bei 400, b64 wird data:-URL, 401 mit Klartext, kein response_format', async () => {
  const rufe = []; const ant = (ok, status, body) => ({ ok, status, json: async () => body });
  const hol = async (url, opt) => { const b = JSON.parse(opt.body); rufe.push(b); return b.model === 'dall-e-3' ? ant(false, 400, { error: { message: 'Unknown parameter' } }) : ant(true, 200, { data: [{ b64_json: 'QUJD' }] }); };
  const r = { name: 'Gulasch', ings: [{ name: 'Rind' }], steps: [{ txt: 'Schmoren.' }] };
  assert.equal(await kiBild('sk-x', r, { hol }), 'data:image/png;base64,QUJD');
  assert.deepEqual(rufe.map((b) => b.model), ['dall-e-3', 'gpt-image-1']); assert.ok(rufe.every((b) => !('response_format' in b)));
  assert.ok(bildAuftrag(r).includes('"Gulasch"') && bildAuftrag(r).includes('Rind'));
  await assert.rejects(kiBild('sk-x', r, { hol: async () => ant(false, 401, {}) }), /Schlüssel wurde abgelehnt/);
  await assert.rejects(kiBild('', r), /Kein OpenAI-Schlüssel/);
  await assert.rejects(gratisBild(r, { hol: async () => ({ ok: false, status: 502 }) }), /antwortet nicht/);
});
test('Tresor: höchstens fünf automatische, die älteste fällt heraus; benannte bleiben; holen und löschen', async () => {
  const m = new Map(); const lager = { hol: async (k) => m.get(k) ?? null, setz: async (k, v) => { m.set(k, v); }, weg: async (k) => { m.delete(k); } };
  const t = tresor(lager); const b = await t.ablegen({ recipes: [1, 2] }, 'benannt', 'Vor dem Umbau');
  for (let i = 0; i < MAX_AUTO + 2; i++) await t.ablegen({ recipes: [i] }, 'auto');
  const l = await t.liste(); assert.equal(l.filter((x) => x.art === 'auto').length, MAX_AUTO); assert.equal(l.filter((x) => x.art === 'benannt').length, 1);
  assert.equal(m.size, 1 + MAX_AUTO + 1, 'herausgefallene Sicherungen sind auch aus dem Speicher weg');
  assert.deepEqual((await t.hol(b)).recipes, [1, 2]); assert.equal(l.find((x) => x.id === b).name, 'Vor dem Umbau');
  await t.loeschen(b); assert.equal(await t.hol(b), null); assert.equal((await t.liste()).length, MAX_AUTO);
});

// ---- Kern 0.11: Wünsche aus dem Mixarium (Übergabe 23.11.2026) ----
import { BILD_ARTEN, KOSTEN, KOSTEN_TEXT } from '../kern/ki/bild.mjs';
import { GERAETE as KG, erweitern as gErweitern, geraetSvg as gSvg } from '../kern/oberflaeche/geraete.mjs';
import { FARBEN as KF, TOENE as KT, farbName, tonName } from '../kern/oberflaeche/farben.mjs';
import { schriftRegler as sRegler } from '../kern/oberflaeche/schrift.mjs';
test('KI-Bild je Ausgabe: Getränke bekommen einen Getränke-Auftrag, Essen bleibt wie es war', async () => {
  const r = { name: 'Virgin Mojito', ings: [{ name: 'Minze' }, { name: 'Limette' }], steps: [{ txt: 'Minze andrücken.' }] };
  assert.ok(bildAuftrag(r).startsWith('Food photography: a beautifully plated "Virgin Mojito"'), 'ohne Angabe bleibt der alte Auftrag');
  const g = bildAuftrag(r, 'getraenk');
  assert.ok(g.includes('"Virgin Mojito"') && g.includes('Minze') && /glass/i.test(g) && !/plated|food/i.test(g), g);
  const rufe = []; const hol = async (url, opt) => { rufe.push(JSON.parse(opt.body).prompt); return { ok: true, status: 200, json: async () => ({ data: [{ b64_json: 'QUJD' }] }) }; };
  await kiBild('sk-x', r, { hol, art: 'getraenk' }); assert.equal(rufe[0], g, 'kiBild schickt den Auftrag der gewählten Art');
  await kiBild('sk-x', r, { hol, auftrag: () => 'eigener Auftrag' }); assert.equal(rufe[1], 'eigener Auftrag', 'eine Ausgabe kann den Auftrag ganz ersetzen');
  const urls = []; const holG = async (u) => { urls.push(decodeURIComponent(u)); return { ok: true, blob: async () => new Blob(['x']) }; };
  globalThis.FileReader ??= class { readAsDataURL() { this.result = 'data:x'; this.onload(); } };
  await gratisBild(r, { hol: holG, art: 'getraenk' }); await gratisBild(r, { hol: holG });
  assert.ok(/drink/i.test(urls[0]) && !/food/i.test(urls[0]), urls[0]); assert.ok(/food/i.test(urls[1]), urls[1]);
  assert.ok(BILD_ARTEN.essen && BILD_ARTEN.getraenk); assert.ok(KOSTEN.de && KOSTEN.en && KOSTEN.de === KOSTEN_TEXT);
});
test('Geräte: „schütteln“ und „Shaker“ sind kein Küchenmixer; Ausgaben hängen eigene Geräte mit eigenem Raster an', () => {
  assert.deepEqual(erkenne('Alles im Shaker kräftig schütteln.'), []);
  assert.deepEqual(erkenne('Im Mixer pürieren.'), ['mixer']);
  assert.ok(Object.values(KG).every((g) => g.de && g.en), 'jedes Kern-Gerät hat einen englischen Namen');
  gErweitern({ shaker: { de: 'Shaker', en: 'Shaker', worte: ['shaker', 'schuttel'], vb: '0 0 64 64', svg: '<path d="M1 1"/>' } });
  assert.deepEqual(erkenne('Alles im Shaker kräftig schütteln.'), ['shaker']);
  assert.ok(gSvg('shaker').includes('viewBox="0 0 64 64"') && gSvg('topf').includes('viewBox="0 0 256 256"'));
  delete KG.shaker;
});
test('Farben, Ton und Schrift-Regler tragen englische Namen', () => {
  assert.ok(Object.values(KF).every((f) => f.de && f.en), 'jede Farbe hat de und en');
  assert.equal(farbName('koralle', 'en'), 'Coral'); assert.equal(farbName('koralle'), 'Koralle'); assert.equal(farbName('gibtsnicht', 'en'), KF.braun.en);
  assert.equal(tonName('geraet', 'en'), 'Same as device'); assert.equal(tonName('dunkel'), KT.dunkel);
  assert.ok(sRegler(100, 'en').includes('aria-label="Text size in percent"') && sRegler(100).includes('aria-label="Schriftgröße in Prozent"'));
});

// ---- Kern 0.12: Kategorien, Warengruppen und Einheiten je Ausgabe (Wunsch aus dem Mixarium) ----
import { kategorienMit, KATEGORIEN_FEST } from '../kern/modell/kategorien.mjs';
import { einkaufMit } from '../kern/modell/einkauf.mjs';
import { skaliere } from '../kern/modell/mengen.mjs';
test('Kategorien je Ausgabe: eigene feste Liste; ohne Angabe bleibt es das Rezeptbuch', () => {
  const FEST = [{ id: 'mock', symbol: 'glas', de: 'Mocktails', en: 'Mocktails' }, { id: 'limo', symbol: 'glas', de: 'Limonaden', en: 'Lemonades' }];
  const K = kategorienMit(FEST), rz = [{ uid: 'a', name: 'Virgin Mojito', cat: 'mock' }, { uid: 'b', name: 'Suppe', cat: 'suppe' }];
  const ids = K.alleKategorien(rz, leereKategorien()).map((c) => c.id);
  assert.deepEqual(ids, ['mock', 'limo', 'suppe'], 'die festen kommen aus der Ausgabe; eine fremde Kennung bleibt sichtbar');
  assert.equal(K.alleKategorien(rz, leereKategorien()).find((c) => c.id === 'suppe').art, 'unbekannt', 'im Mixarium ist „suppe“ fremd');
  assert.equal(alleKategorien(rz).find((c) => c.id === 'suppe').art, 'fest', 'im Rezeptbuch ist „suppe“ fest');
  assert.ok(alleKategorien(rz).some((c) => c.id === 'vorsp') && !K.alleKategorien(rz).some((c) => c.id === 'vorsp'), 'Vorgabe bleibt die Rezeptbuch-Liste');
  const l = K.loeschen(rz, leereKategorien(), 'limo', null); assert.deepEqual(l.kat.ausgeblendet, ['limo'], 'eine feste Kategorie der AUSGABE wird ausgeblendet, nicht gelöscht');
  assert.deepEqual(K.umsortieren(rz, leereKategorien(), 'limo', 'mock').folge, ['limo', 'mock', 'suppe']);
  assert.deepEqual(K.gruppiere(rz).map((g) => g.kategorie.id), ['mock', 'suppe']);
  assert.equal(K.FEST, FEST);
});
test('Einkauf je Ausgabe: eigene Warengruppen und Einheiten (oz, cl); ohne Angabe wie bisher', () => {
  const GR = [{ id: 'saft', de: 'Säfte', worte: [' saft', 'saft '] }, { id: 'sirup', de: 'Sirup', worte: ['sirup'] }, { id: 'sonstiges', de: 'Sonstiges', worte: [] }];
  const E_ = einkaufMit({ gruppen: GR, einheiten: { oz: ['ml', 30] } });
  const r = { name: 'Limo', servings: 1, ings: [{ name: 'Orangensaft', amt: '4', unit: 'cl' }, { name: 'Orangensaft', amt: '1', unit: 'oz' }, { name: 'Grenadine-Sirup', amt: '1 ½', unit: 'cl' }] };
  const l = E_.einkaufsliste([{ rezept: r, portionen: 2 }]);
  assert.equal(l.find((x) => x.name === 'Orangensaft').menge, '140 ml', '4 cl + 1 oz (30 ml), doppelt');
  assert.equal(l.find((x) => x.name === 'Orangensaft').gruppe, 'saft'); assert.equal(E_.warengruppe('Grenadine-Sirup'), 'sirup');
  assert.deepEqual(E_.gruppenFolge(['sirup']), ['sirup', 'saft', 'sonstiges']); assert.deepEqual(E_.gruppeVerschieben([], 'sonstiges', 'saft'), ['sonstiges', 'saft', 'sirup']);
  assert.equal(warengruppe('Orangensaft') !== 'saft', true, 'Vorgabe bleibt die Rezeptbuch-Liste'); assert.equal(einkaufsliste([{ rezept: r, portionen: 1 }]).find((x) => x.name === 'Orangensaft').menge, '40 ml + 1 oz', 'ohne Angabe kennt der Kern oz nicht und zählt nichts falsch zusammen');
});
test('Mengen: Achtel-Brüche und die zwei Rechenfehler der alten Mixarium-App', () => {
  assert.equal(skaliere('⅜', 2), '¾'); assert.equal(skaliere('1 ⅞', 2), '3 ¾'); assert.equal(skaliere('10,5', 2), '21'); assert.equal(skaliere('1 ½', 2), '3');
  assert.equal(zahlAus('⅝'), 0.625); assert.equal(zahlAus('2 ⅞'), 2.875);
});
test('Kategorien je Ausgabe: eine mitgebrachte Kennung trägt ihren Familien-Namen, nie die rohe Kennung', () => {
  const FEST = [{ id: 'mock', symbol: 'glas', de: 'Mocktails', en: 'Mocktails' }];
  const K = kategorienMit(FEST, { familie: KATEGORIEN_FEST });
  const rz = [{ uid: 'a', name: 'Bruschetta', cat: 'vorsp' }, { uid: 'b', name: 'X', cat: 'gibtsnicht' }];
  const l = K.alleKategorien(rz, leereKategorien()), v = l.find((c) => c.id === 'vorsp'), u = l.find((c) => c.id === 'gibtsnicht');
  assert.equal(v.art, 'fremd'); assert.equal(beschriftung(v, 'de'), 'Vorspeisen'); assert.equal(beschriftung(v, 'en'), 'Starters');
  assert.equal(u.art, 'unbekannt'); assert.equal(beschriftung(u, 'de'), 'gibtsnicht', 'eine unbekannte Kennung wird nicht erfunden');
  assert.ok(!l.some((c) => c.id === 'suppe'), 'die Familie macht keine Reiter auf, sie benennt nur');
  assert.equal(K.loeschen(rz, leereKategorien(), 'vorsp', '').kat.ausgeblendet.length, 0, 'eine fremde Kategorie wird nicht ausgeblendet, sie verschwindet mit ihren Rezepten');
});
test('Sticker-Bild je Kategorie: gewähltes Rezeptbild, sonst das erste mit Bild; ein weggefallenes fällt still zurück', async () => {
  const { katBild, bildWaehlen } = await import('../kern/modell/kategorien.mjs');
  const rz = [{ uid: 'a', name: 'A', cat: 'mock' }, { uid: 'b', name: 'B', cat: 'mock', img: 'data:b' }, { uid: 'c', name: 'C', cat: 'mock', img: 'data:c' }, { uid: 'd', name: 'D', cat: 'limo', img: 'data:d' }, { uid: 'e', name: '', cat: 'mock', img: 'data:e', blank: true }];
  let k = leereKategorien();
  assert.equal(katBild(rz, k, 'mock')?.uid, 'b', 'Vorgabe: das erste Rezept der Kategorie mit Bild');
  assert.equal(katBild(rz, k, 'sirup'), null, 'ohne Bild: nichts (dann gilt das Zeichen)');
  k = bildWaehlen(k, 'mock', 'c'); assert.equal(katBild(rz, k, 'mock')?.uid, 'c', 'gewählt');
  assert.deepEqual(k.namen.mock, { bild: 'c' }, 'gespeichert wird nur die Kennung des Rezepts, nicht das Bild');
  assert.equal(katBild(rz, bildWaehlen(k, 'mock', 'd'), 'mock')?.uid, 'b', 'ein Rezept aus einer ANDEREN Kategorie gilt nicht');
  assert.equal(katBild(rz.filter((r) => r.uid !== 'c'), k, 'mock')?.uid, 'b', 'gelöschtes Rezept → zurück zur Vorgabe');
  assert.equal(katBild(rz, k, 'alle')?.uid, 'b', '„alle“ nimmt das erste Rezept mit Bild überhaupt');
  k = bildWaehlen(k, 'mock', null); assert.equal(k.namen.mock, undefined, 'zurück auf Vorgabe räumt auf');
  assert.equal(katBild(rz, umbenennen(bildWaehlen(k, 'mock', 'c'), 'mock', 'Neu'), 'mock')?.uid, 'c', 'Umbenennen lässt das Bild stehen');
});
test('Text-Import: Bar- und US-Einheiten (oz, fl oz, Barlöffel, Dash, Schuss, Beutel, cup) – Wunsch aus dem Mixarium', () => {
  const f = (l) => { const z = zutatAusZeile(l); return [z.amt, z.unit, z.name].join('|'); };
  assert.equal(f('2 oz Rotwein'), '2|oz|Rotwein'); assert.equal(f('1 ½ oz Rum'), '1 ½|oz|Rum'); assert.equal(f('3/4 oz Kahlúa'), '3/4|oz|Kahlúa');
  assert.equal(f('2 fl oz Saft'), '2|fl oz|Saft'); assert.equal(f('1 Barlöffel Zucker'), '1|Barlöffel|Zucker');
  assert.equal(f('2 Dashes Angostura'), '2|Dashes|Angostura'); assert.equal(f('1 Dash Angostura'), '1|Dash|Angostura');
  assert.equal(f('1 Schuss Sahne'), '1|Schuss|Sahne'); assert.equal(f('2 Beutel schwarzer Tee'), '2|Beutel|schwarzer Tee'); assert.equal(f('2 cups Mehl'), '2|cups|Mehl');
  assert.equal(f('4 cl weißer Rum'), '4|cl|weißer Rum'); assert.equal(f('200 g Gin-Gurken'), '200|g|Gin-Gurken', '„g“ vor „Gin“ bleibt Gramm');
  assert.equal(f('2 Ozeanfische'), '2||Ozeanfische', '„oz“ nur als ganzes Wort'); assert.equal(f('20 Dolden Holunderblüten'), '20|Dolden|Holunderblüten');
});
