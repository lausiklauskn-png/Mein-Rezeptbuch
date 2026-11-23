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
