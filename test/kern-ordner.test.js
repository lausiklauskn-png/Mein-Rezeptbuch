// Proben: Ordner (kern/modell/ordner.mjs). Ein Ordner frisst die Kategorie nicht; ein Ordner, den es nicht gibt, ist keiner.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anlegen, umbenennen, zeichenSetzen, loeschen, legeIn, umsortieren, imOrdner, uebersicht, ohneOrdnerZiel, findeOrdner, ordnerName } from '../kern/modell/ordner.mjs';
import { normalisiere, katVonRezept } from '../kern/modell/rezept.mjs';

const R = (o) => normalisiere({ name: 'X', cat: 'fisch', ...o });
test('Ordner anlegen: eigene Kennung, gleicher Name wird nicht doppelt angelegt', () => {
  const a = anlegen([], '  Weihnachten ', '🎄'); assert.equal(a.neu, true); assert.equal(a.ordner[0].name, 'Weihnachten'); assert.equal(a.ordner[0].ico, '🎄'); assert.match(a.id, /^\d+$/);
  const b = anlegen(a.ordner, 'weihnachten'); assert.equal(b.neu, false); assert.equal(b.id, a.id); assert.equal(b.ordner, a.ordner);
  const c = anlegen(a.ordner, 'Sommer'), d = anlegen(c.ordner, 'Gäste'); assert.equal(new Set(d.ordner.map((o) => o.id)).size, 3, 'drei Kennungen, auch in derselben Millisekunde');
  assert.equal(anlegen(null, 'A').ordner.length, 1);
});
test('Umbenennen und Zeichen: die Kennung bleibt; alte Ordner mit Zahl als Kennung gehen genauso', () => {
  const alt = [{ id: 1700000000000, name: 'Alt', ico: '📁' }];
  assert.equal(umbenennen(alt, '1700000000000', ' Neu ')[0].name, 'Neu'); assert.equal(umbenennen(alt, '1700000000000', 'Neu')[0].id, 1700000000000);
  assert.equal(zeichenSetzen(alt, 1700000000000, '🎂')[0].ico, '🎂'); assert.ok(!('ico' in zeichenSetzen(alt, 1700000000000, '')[0]));
  assert.equal(ordnerName(findeOrdner(alt, '1700000000000')), 'Alt'); assert.equal(findeOrdner(alt, 'x'), null);
});
test('In einen Ordner legen: die Kategorie bleibt; ein Ordner, den es nicht gibt, nimmt nichts auf', () => {
  const o = anlegen([], 'Gäste'), rs = [R({ uid: 'a', cat: 'sushi' }), R({ uid: 'b' })];
  const drin = legeIn(rs, o.ordner, 'a', o.id);
  assert.equal(drin[0].folder, o.id); assert.equal(drin[0].cat, 'sushi'); assert.equal(katVonRezept(drin[0]), 'sushi', 'die Kategorie ist nicht gefressen'); assert.equal(drin[1].folder, '');
  assert.equal(legeIn(rs, o.ordner, 'a', 'gibtsnicht'), rs, 'unbekannter Ordner: nichts ändert sich');
  assert.equal(legeIn(drin, o.ordner, 'a', '')[0].folder, '', 'herausnehmen');
  assert.deepEqual(imOrdner(drin, o.ordner, o.id).map((r) => r.uid), ['a']);
});
test('Ordner löschen: die Rezepte bleiben mit ihrer Kategorie, nur der Ordner ist weg', () => {
  const o = anlegen([], 'Gäste'), o2 = anlegen(o.ordner, 'Sommer'), rs = [R({ uid: 'a', cat: 'sushi', folder: o.id }), R({ uid: 'b', folder: o2.id }), R({ uid: 'c' })];
  const l = loeschen(rs, o2.ordner, o.id);
  assert.equal(l.betroffen, 1); assert.equal(l.rezepte.length, 3); assert.equal(l.rezepte[0].folder, ''); assert.equal(l.rezepte[0].cat, 'sushi'); assert.equal(l.rezepte[1].folder, o2.id); assert.deepEqual(l.ordner.map((x) => x.name), ['Sommer']);
});
test('Ordnen, Übersicht mit Anzahl und Bild, verwaiste Ordner-Verweise', () => {
  let liste = anlegen([], 'A').ordner; liste = anlegen(liste, 'B').ordner; liste = anlegen(liste, 'C').ordner; const [a, b, c] = liste.map((o) => o.id);
  assert.deepEqual(umsortieren(liste, c, a).map((o) => o.name), ['C', 'A', 'B']); assert.deepEqual(umsortieren(liste, a, null).map((o) => o.name), ['B', 'C', 'A']); assert.deepEqual(umsortieren(liste, 'x', a).map((o) => o.name), ['A', 'B', 'C']);
  const rs = [R({ uid: '1', folder: a }), R({ uid: '2', folder: a, img: 'data:image/jpeg;base64,QQ' }), R({ uid: '3', folder: 'weg' }), R({ uid: '4', name: '', folder: a })];
  const u = uebersicht(rs, liste); assert.deepEqual(u.map((o) => [o.name, o.anzahl]), [['A', 2], ['B', 0], ['C', 0]]); assert.equal(u[0].bild, 'data:image/jpeg;base64,QQ'); assert.equal(u[1].bild, '');
  assert.equal(ohneOrdnerZiel(rs, liste), 1, 'ein Rezept zeigt auf einen Ordner, den es nicht gibt');
});
