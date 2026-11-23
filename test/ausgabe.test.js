// Probe: Ausgaben-Schalter des Küchen-Kerns (kern/ausgabe/ausgabe.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lesen, pruefen, beispieleFuer, istAlkoholischesGetraenk } from '../kern/ausgabe/ausgabe.mjs';

const katalog = lesen('beispiele/KATALOG.json');

for (const name of ['rezeptbuch', 'muttis']) {
  test(`Ausgabe ${name} ist in Ordnung (Felder, Katalog, Prüfsummen, kein Alkohol)`, () => {
    assert.deepEqual(pruefen(lesen(`ausgaben/${name}/ausgabe.json`), katalog, 'beispiele'), []);
  });
}

test('Mein Rezeptbuch und Muttis lesen verschiedene Speicher-Schlüssel', () => {
  const r = lesen('ausgaben/rezeptbuch/ausgabe.json'), m = lesen('ausgaben/muttis/ausgabe.json');
  assert.equal(r.speicher.endung, '9m'); assert.equal(m.speicher.endung, '9');
  assert.notEqual(r.speicher.indexedDb, m.speicher.indexedDb);
  assert.ok(r.speicher.schluesselAlt.every((k) => k.endsWith('9m')));
  assert.ok(m.speicher.schluesselAlt.every((k) => k.endsWith('9') && !k.endsWith('9m')));
});

test('Web lädt Beispiele auf Tippen, Android und Windows haben sie im Paket', () => {
  const r = lesen('ausgaben/rezeptbuch/ausgabe.json');
  assert.equal(beispieleFuer(r, katalog, 'web').imPaket.length, 0);
  assert.ok(beispieleFuer(r, katalog, 'web').angeboten.length > 0);
  assert.ok(beispieleFuer(r, katalog, 'android').imPaket.length > 0);
  assert.equal(beispieleFuer(r, katalog, 'windows').angeboten.length, 0);
});

// Gegenproben: der Schalter muss die verbotenen Fälle wirklich fangen.
test('Gegenprobe: Store-Ausgabe mit Alkohol-Paket wird abgelehnt', () => {
  const a = { ...lesen('ausgaben/rezeptbuch/ausgabe.json'), beispiele: ['getraenke-mit-alkohol-fuer-mixarium'] };
  const f = pruefen(a, katalog, 'beispiele');
  assert.ok(f.some((x) => x.includes('Alkohol')), f.join('\n'));
});

test('Gegenprobe: Paket nicht im Katalog wird gemeldet', () => {
  const a = { ...lesen('ausgaben/muttis/ausgabe.json'), beispiele: ['gibt-es-nicht'] };
  assert.ok(pruefen(a, katalog).some((x) => x.includes('nicht im Katalog')));
});

test('Gegenprobe: falsche Prüfsumme wird gemeldet', () => {
  const k = structuredClone(katalog); k.pakete[0].sha256 = '0'.repeat(64);
  assert.ok(pruefen(lesen('ausgaben/rezeptbuch/ausgabe.json'), k, 'beispiele').some((x) => x.includes('Prüfsumme')));
});

test('Alkohol-Erkennung: Ginger Beer ist kein Gin, Wein in einer Soße zählt nicht', () => {
  assert.equal(istAlkoholischesGetraenk({ cat: 'afckt', ings: [{ name: 'Ginger Beer' }, { name: 'Birnensaft' }] }), false);
  assert.equal(istAlkoholischesGetraenk({ cat: 'mock', ings: [{ name: 'Ginger' }] }), false);
  assert.equal(istAlkoholischesGetraenk({ cat: 'fleisch', ings: [{ name: 'trockener Rotwein' }] }), false);
  assert.equal(istAlkoholischesGetraenk({ cat: 'ckt', ings: [{ name: 'weißer Rum' }] }), true);
  assert.equal(istAlkoholischesGetraenk({ cat: 'bowle', ings: [{ name: 'Prosecco oder trockener Sekt' }] }), true);
});

test('Alkohol-Paket enthält wirklich Alkohol, das Beispielbuch keinen', () => {
  const alk = lesen('beispiele/getraenke-mit-alkohol-fuer-mixarium.json').recipes;
  const buch = lesen('beispiele/beispielbuch-mein-rezeptbuch.json').recipes;
  assert.ok(alk.filter(istAlkoholischesGetraenk).length >= 6);
  assert.deepEqual(buch.filter(istAlkoholischesGetraenk).map((r) => r.name), []);
});

import { stand } from '../kern/kern-stand.mjs';
test('KERN.json passt zum Stand von kern/ (sonst: node kern/kern-stand.mjs)', () => {
  assert.deepEqual(lesen('KERN.json'), stand());
});
