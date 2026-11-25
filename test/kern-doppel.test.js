// Proben: Doppelungen erkennen (R6, Klaus 25.11.2026) und Merkmale einer Variante. Beispiele aus den echten Beispielbüchern.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vergleiche, findeDoppel, wendeAn, alkoholArt, sindVarianten, merkmalUmschalten, merkmaleVon, zutatenGleich, dHash, bildAbstand, grund } from '../kern/modell/doppel.mjs';
import { normalisiere } from '../kern/modell/rezept.mjs';

const buch = JSON.parse(readFileSync(new URL('../beispiele/beispielbuch-mein-rezeptbuch.json', import.meta.url))).recipes.map(normalisiere);
const nach = (n) => buch.find((r) => r.name === n);
const R = (o) => normalisiere({ name: 'X', ings: ['200 g Mehl'], steps: ['a'], ...o });

test('Lachs-Sushi-Rolle und Knusprige Sushi-Rolle: Name ähnlich, Zutaten verschieden → kein Doppel', () => {
  const v = vergleiche(nach('Lachs-Sushi-Rolle mit Avocado'), nach('Knusprige Sushi-Rolle mit Lachs und Avocado'));
  assert.equal(v.stufe, '');
});
test('gescanntes Gyoza mit anderem Namen und gleichen Zutaten → sicher', () => {
  const alt = nach('Gyoza (japanische gebratene Teigtaschen)');
  const neu = normalisiere({ ...alt, uid: 'scan-1', id: 999, name: 'Gyoza – japanische gebratene Teigtaschen', img: '' });
  assert.equal(vergleiche(neu, alt).stufe, 'sicher');
});
test('gleicher Name, andere Zutaten → vielleicht; ganz anderes Rezept → nichts', () => {
  const a = R({ name: 'Tomatensoße', ings: ['Tomaten', 'Zwiebel', 'Knoblauch', 'Olivenöl'] }), b = R({ name: 'Tomatensosse', ings: ['Passata', 'Sahne', 'Basilikum'] });
  assert.equal(vergleiche(a, b).stufe, 'vielleicht');
  assert.equal(vergleiche(a, R({ name: 'Apfelkuchen', ings: ['Äpfel', 'Mehl', 'Butter'] })).stufe, '');
});
test('gleiches Bild → mindestens vielleicht; mit gleichem Namen sicher', () => {
  const a = R({ name: 'Brot', img: 'data:image/jpeg;base64,AAA' }), b = R({ name: 'Mein Bauernbrot', img: 'data:image/jpeg;base64,BBB', ings: ['Roggen'] });
  assert.equal(vergleiche(a, b, { bildA: 'ffff0000ffff0000', bildB: 'ffff0000ffff0001' }).stufe, 'vielleicht');
  assert.equal(vergleiche(a, b, { bildA: 'ffff0000ffff0000', bildB: '0000ffff0000ffff' }).stufe, '');
  assert.equal(vergleiche(a, { ...a, uid: 'z' }).stufe, 'sicher');
});
test('mit Alkohol und alkoholfrei sind nie ein Doppel (Feld und Wort)', () => {
  const mit = R({ name: 'Mojito', ings: ['Rum', 'Minze', 'Limette', 'Zucker'], alcohol: true });
  assert.equal(vergleiche(mit, { ...mit, uid: 'v', name: 'Virgin Mojito', alcohol: false }).stufe, '');
  assert.equal(vergleiche(mit, { ...mit, uid: 'v', name: 'Mojito alkoholfrei', alcohol: undefined }).stufe, '');
  assert.equal(vergleiche(mit, { ...mit, uid: 'v' }).stufe, 'sicher');
  assert.equal(alkoholArt({ name: 'Bowle ohne Alkohol' }), 'ohne');
  assert.equal(alkoholArt({ name: 'Bowle', alcohol: true }), 'mit');
});
test('Merkmale: laktosefreie Variante bleibt eigenes Rezept; Umschalten', () => {
  const a = R({ name: 'Pfannkuchen', ings: ['Mehl', 'Milch', 'Eier', 'Salz'] });
  const b = merkmalUmschalten({ ...a, uid: 'b' }, 'laktosefrei');
  assert.deepEqual(merkmaleVon(b), ['laktosefrei']);
  assert.equal(sindVarianten(a, b), true);
  assert.equal(vergleiche(a, b).stufe, '');
  assert.equal('merkmale' in merkmalUmschalten(b, 'laktosefrei'), false);
  assert.deepEqual(merkmaleVon(merkmalUmschalten(merkmalUmschalten(a, 'glutenfrei'), 'vegan')), ['vegan', 'glutenfrei']);
  assert.equal(merkmalUmschalten(a, 'quatsch'), a);
});
test('findeDoppel: nur gegen den Bestand, sicher zuerst, eigenes uid nie', () => {
  const alt1 = R({ uid: 'a1', name: 'Gulasch', ings: ['Rind', 'Zwiebel', 'Paprika', 'Brühe'] });
  const alt2 = R({ uid: 'a2', name: 'Brot', img: 'x' });
  const n1 = R({ uid: 'n1', name: 'Gulasch', ings: ['Rind', 'Zwiebeln', 'Paprika', 'Brühe'] });
  const n2 = R({ uid: 'n2', name: 'Sonntagsbrot', img: 'y' });
  const n3 = R({ uid: 'n3', name: 'Gulasch', ings: ['Rind', 'Zwiebel', 'Paprika', 'Brühe'] });   // zweimal in derselben Datei: nur gegen den Bestand
  const d = findeDoppel([alt1, alt2, n1, n2, n3], ['n1', 'n2', 'n3'], { hash: new Map([['a2', '00ff00ff00ff00ff'], ['n2', '00ff00ff00ff00fe']]) });
  assert.deepEqual(d.map((x) => [x.neu, x.alt, x.stufe]), [['n1', 'a1', 'sicher'], ['n3', 'a1', 'sicher'], ['n2', 'a2', 'vielleicht']]);
});
test('wendeAn: Bild, Text, ganz, meins, beide', () => {
  const alt = R({ uid: 'a', id: 3, name: 'Alt', cat: 'suppen', folder: 'f1', img: 'I1', rating: { stars: 5 }, translations: { en: { name: 'Old' } }, merkmale: ['vegan'] });
  const neu = R({ uid: 'n', id: 9, name: 'Neu', cat: 'fleisch', img: 'I2', ings: ['Salz', 'Pfeffer'] });
  const b = wendeAn(alt, neu, 'bild');
  assert.equal(b.img, 'I2'); assert.equal(b.name, 'Alt'); assert.ok(b.translations);
  const t = wendeAn(alt, neu, 'text');
  assert.equal(t.name, 'Neu'); assert.equal(t.img, 'I1'); assert.equal(t.translations, undefined); assert.equal(t.ings.length, 2);
  const g = wendeAn(alt, neu, 'ganz');
  for (const [k, v] of [['uid', 'a'], ['id', 3], ['cat', 'suppen'], ['folder', 'f1'], ['img', 'I2'], ['name', 'Neu']]) assert.deepEqual(g[k], v, k);
  assert.equal(g.rating.stars, 5); assert.deepEqual(g.merkmale, ['vegan']);
  assert.equal(wendeAn(alt, neu, 'meins'), alt); assert.equal(wendeAn(alt, neu, 'beide'), null);
});
test('Hilfen: grund, zutatenGleich, dHash, bildAbstand', () => {
  assert.equal(grund('Crème brûlée (fein)!'), 'creme brulee fein');
  assert.equal(zutatenGleich([new Set(['nori', 'alge']), new Set(['reis'])], [new Set(['nori', 'algenblatter']), new Set(['reis'])]), 1);
  assert.equal(zutatenGleich([new Set(['zwiebel']), new Set(['ei'])], [new Set(['zwiebeln']), new Set(['eis'])]), 0.5, 'Wortform ab 4 Zeichen, „ei“ ≠ „eis“');
  const g = Array.from({ length: 72 }, (_, i) => i % 9);
  assert.equal(dHash(g), '0000000000000000'); assert.equal(dHash(g.map((x) => -x)), 'ffffffffffffffff');
  assert.equal(bildAbstand('00', '03'), 2); assert.equal(bildAbstand('', '00'), Infinity);
});
test('Beispielbuch: keine Doppel im Buch selbst (falsche Treffer)', () => {
  const d = findeDoppel(buch, buch.slice(25));
  assert.deepEqual(d.map((x) => [nach && buch.find((r) => r.uid === x.neu).name, buch.find((r) => r.uid === x.alt).name, x.stufe]), []);
});
test('Merkmale sind ein Hinweis, der mitreist: Wortsuche (de, en, Oberfläche), Bedeutungssuche, Druck, Teilen (Klaus 25.11.)', async () => {
  const { suche, suchtext } = await import('../kern/modell/suche.mjs');
  const { passage } = await import('../kern/suche/bedeutung.mjs');
  const { druckRezept } = await import('../kern/ausgabe/druck.mjs');
  const { teilDaten, teilLink, ausTeilLink } = await import('../kern/teilen/qr.mjs');
  const { ladeTabelle } = await import('../kern/oberflaeche/sprache.mjs');
  const a = R({ uid: 'a', name: 'Linsensuppe', ings: ['Linsen', 'Karotten'], merkmale: ['vegan', 'laktosefrei'] }), b = R({ uid: 'b', name: 'Gulasch', ings: ['Rind'] });
  const namen = (l) => l.map((r) => r.name);
  assert.deepEqual(namen(suche([a, b], 'vegan laktosefrei', {})), ['Linsensuppe']);
  assert.deepEqual(namen(suche([a, b], 'lactose-free', {})), ['Linsensuppe']);
  assert.deepEqual(namen(suche([a, b], 'glutenfrei', {})), []);
  await ladeTabelle('fr', [new URL('../kern/sprachen/fr.mjs', import.meta.url).href]);
  assert.deepEqual(namen(suche([a, b], 'sans lactose', {}, 'fr')), ['Linsensuppe']);
  assert.ok(passage(a).includes('vegan') && passage(a).includes('laktosefrei') && passage(a).includes('lactose-free'));
  assert.equal(passage(b), passage({ ...b, merkmale: [] }), 'ohne Merkmal bleibt der Text gleich (nichts wird neu eingelesen)');
  assert.ok(!suchtext(b).includes('vegan'));
  const html = druckRezept(a, { sprache: 'de' });
  assert.ok(/🌱 vegan/.test(html) && /🥛 laktosefrei/.test(html) && !/glutenfrei/.test(html), 'der Ausdruck zeigt die Merkmale');
  assert.deepEqual(teilDaten(a).mk, ['vegan', 'laktosefrei']); assert.equal('mk' in teilDaten(b), false);
  const zurueck = await ausTeilLink(await teilLink(a, 'https://x.example/neu/'));
  assert.deepEqual(zurueck.merkmale, ['vegan', 'laktosefrei'], 'über den Teil-Link kommen die Merkmale an');
});
test('R5 rezeptVerschieben: vor, hinter, unbekannt, auf sich selbst', async () => {
  const { rezeptVerschieben } = await import('../kern/modell/rezept.mjs');
  const l = ['a', 'b', 'c', 'd'].map((u) => ({ uid: u })), u = (x) => x.map((r) => r.uid).join('');
  assert.equal(u(rezeptVerschieben(l, 'd', 'b')), 'adbc'); assert.equal(u(rezeptVerschieben(l, 'a', 'c', true)), 'bcad');
  assert.equal(u(rezeptVerschieben(l, 'a', 'd', true)), 'bcda'); assert.equal(rezeptVerschieben(l, 'a', 'x'), l); assert.equal(rezeptVerschieben(l, 'b', 'b'), l);
  assert.equal(rezeptVerschieben(l, 'a', 'b'), l, 'steht schon davor: dieselbe Liste'); assert.equal(rezeptVerschieben(l, 'b', 'a', true), l);
  assert.equal(u(l), 'abcd', 'das Original bleibt unverändert');
});
