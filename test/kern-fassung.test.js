// Proben: bearbeitete Fassungen und Übersetzen im Gerät (kern/ki/helfer.mjs, Klaus 25.11.). Kein Netz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalisiere, sicht } from '../kern/modell/rezept.mjs';
import { uebersetzeMit, rateSprache, alsUebersetzung, alsHauptfassung, uebersetzungAnRezept, uebersetzungPasst } from '../kern/ki/helfer.mjs';

const fest = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object') fest(v); return Object.freeze(o); };
const GYOZA = fest(normalisiere({ uid: 'r-g', name: 'Gyoza', cat: 'asia', servings: 4,
  ings: [{ amt: '200', unit: 'g', name: 'minced pork' }, { amt: '1', unit: 'tbsp', name: 'soy sauce' }],
  steps: [{ txt: 'Mix the filling and fold the dumplings.', note: 'kühl halten' }, { txt: 'Fry them in a pan for 3 minutes, then add water.' }],
  translations: { de: { name: 'Gyoza (Teigtaschen)', ingredients: ['Schweinehack', 'Sojasauce'], steps: ['Füllung mischen und die Taschen falten.', 'In der Pfanne 3 Minuten braten, dann Wasser dazu.'] },
    fr: { name: 'Gyoza', ingredients: ['porc haché', 'sauce soja'], steps: ['Mélanger.', 'Faire frire.'] } } }));

test('Übersetzen im Gerät: jeder Text einzeln an den Übersetzer, Form wie uebersetze(); legt sich wie eine Claude-Fassung ans Rezept', async () => {
  const gerufen = []; const t = await uebersetzeMit(GYOZA, 'it', async (x) => { gerufen.push(x); return '[it] ' + x; });
  assert.equal(gerufen.length, 1 + 2 + 2); assert.equal(t.name, '[it] Gyoza'); assert.deepEqual(t.ingredients, ['[it] minced pork', '[it] soy sauce']); assert.equal(t.weg, 'geraet');
  assert.ok(uebersetzungPasst(GYOZA, t)); const s = sicht(uebersetzungAnRezept(GYOZA, 'it', t), 'it'); assert.equal(s.steps[1].txt, '[it] Fry them in a pan for 3 minutes, then add water.'); assert.equal(s.ings[0].amt, '200');
  await assert.rejects(uebersetzeMit(GYOZA, '', async (x) => x), /Keine Zielsprache/); await assert.rejects(uebersetzeMit(GYOZA, 'it', null), /Kein Übersetzer/);
  const leer = await uebersetzeMit(GYOZA, 'it', async () => ''); assert.equal(leer.name, 'Gyoza', 'gibt der Übersetzer nichts zurück, bleibt der Text');
});

test('Sprache raten: eindeutig oder leer', () => {
  assert.equal(rateSprache(GYOZA), 'en');
  assert.equal(rateSprache(normalisiere({ name: 'Kartoffelsuppe', ings: [{ name: 'Kartoffeln' }], steps: [{ txt: 'Die Kartoffeln schälen und mit der Brühe in den Topf, dann 20 Minuten kochen.' }] })), 'de');
  assert.equal(rateSprache(normalisiere({ name: 'Борщ', ings: [{ name: 'свёкла' }], steps: [{ txt: 'Варить суп.' }] })), 'ru');
  assert.equal(rateSprache(normalisiere({ name: '饺子', steps: [{ txt: '包饺子' }] })), 'zh');
  assert.equal(rateSprache(normalisiere({ name: 'Sushi', ings: [{ name: 'Reis' }] })), '', 'zu wenig Text: nicht raten');
});

test('Nur als Übersetzung: Text des Originals bleibt, Fassung und Mengen kommen aus dem Formular; ungleiche Zahl → passtNicht', () => {
  const neu = { ...sicht(GYOZA, 'de'), servings: 6 }; neu.ings = neu.ings.map((z, i) => (i === 0 ? { ...z, amt: '250', name: 'Schweinehackfleisch' } : z));
  const r = alsUebersetzung(GYOZA, 'de', neu);
  assert.equal(r.name, 'Gyoza'); assert.equal(r.ings[0].name, 'minced pork'); assert.equal(r.ings[0].amt, '250'); assert.equal(r.servings, 6); assert.equal(r.steps[0].note, 'kühl halten');
  assert.equal(r.translations.de.ingredients[0], 'Schweinehackfleisch'); assert.ok(r.translations.fr, 'andere Übersetzungen bleiben'); assert.equal(sicht(r, 'de').ings[0].name, 'Schweinehackfleisch');
  assert.throws(() => alsUebersetzung(GYOZA, 'de', { ...neu, steps: [...neu.steps, { txt: 'Servieren.' }] }), (f) => f.passtNicht === true && /2 und 2/.test(f.message));
  assert.ok(Object.isFrozen(GYOZA.translations.de), 'das Original bleibt unverändert');
});

test('Als Hauptfassung: der bearbeitete Text wird das Rezept, das Original wandert als Übersetzung in seine Sprache, nichts geht verloren', () => {
  const neu = { ...sicht(GYOZA, 'de'), name: 'Gyoza – japanische Teigtaschen' };
  const r = alsHauptfassung(GYOZA, 'de', neu, 'en');
  assert.equal(r.name, 'Gyoza – japanische Teigtaschen'); assert.equal(r.sprache, 'de'); assert.equal(r.ings[1].name, 'Sojasauce'); assert.equal(r.ings[1].unit, 'tbsp');
  assert.equal(r.translations.de, undefined, 'die eigene Sprache steht nicht mehr als Übersetzung da');
  assert.deepEqual(r.translations.en, { name: 'Gyoza', ingredients: ['minced pork', 'soy sauce'], steps: GYOZA.steps.map((x) => x.txt), amounts: [{ unit: 'g' }, { unit: 'tbsp' }], original: true });
  assert.ok(r.translations.fr); assert.equal(sicht(r, 'en').name, 'Gyoza'); assert.equal(sicht(r, 'de').name, r.name);
  assert.throws(() => alsHauptfassung(GYOZA, 'de', neu, 'de'), /dieselbe Sprache/); assert.throws(() => alsHauptfassung(GYOZA, 'de', neu, ''), /Zielsprache/);
});
