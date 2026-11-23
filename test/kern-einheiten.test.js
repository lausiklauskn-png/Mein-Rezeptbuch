// Proben: Einheiten metrisch ↔ US (kern/modell/einheiten.mjs). Feste Beispiele, jedes von Hand nachgerechnet.
// Faktoren: 1 cup = 236,588 ml · 1 fl oz = 29,5735 ml · 1 tbsp = 14,7868 ml · 1 tsp = 4,92892 ml · 1 oz = 28,3495 g · 1 lb = 453,592 g · 1 Zoll = 2,54 cm.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYSTEME, einheitSystem, passtZuSystem, zuUs, zuMetrisch, temperaturenImText, laengenImText, rezeptIn, viertel } from '../kern/modell/einheiten.mjs';
import { skaliere } from '../kern/modell/mengen.mjs';

const us = (amt, unit, o) => { const r = zuUs({ amt, unit, name: 'x' }, o); return (r.amt + ' ' + r.unit).trim(); };
const metrisch = (amt, unit, o) => { const r = zuMetrisch({ amt, unit, name: 'x' }, o); return (r.amt + ' ' + r.unit).trim(); };

test('Einheiten · welche Einheit zu welchem System gehört; was kein festes Maß ist, gehört zu keinem', () => {
  assert.deepEqual(SYSTEME, ['metrisch', 'us']);
  for (const e of ['ml', 'ML', 'cl', 'dl', 'l', 'Liter', 'g', 'Gramm', 'kg', 'EL', 'TL', 'Esslöffel', 'Teelöffel', 'EL.', 'Pfund']) assert.equal(einheitSystem(e), 'metrisch', e);
  for (const e of ['cup', 'cups', 'Cup', 'oz', 'fl oz', 'fl. oz.', 'floz', 'lb', 'lbs', 'pound', 'tbsp', 'Tbsp.', 'tsp', 'tablespoons', 'pint', 'quart', 'gallon']) assert.equal(einheitSystem(e), 'us', e);
  for (const e of ['', null, undefined, 'Stück', 'Prise', 'Tasse', 'Glas', 'Becher', 'Bund', 'Dash', 'Barlöffel', 'Schuss', 'Dose', 'mg', 'stick']) assert.equal(einheitSystem(e), '', String(e));
  const deutsch = { ings: [{ amt: '500', unit: 'g', name: 'Mehl' }, { amt: '2', unit: 'EL', name: 'Öl' }, { amt: '1', unit: 'Prise', name: 'Salz' }, { amt: '', unit: '', name: 'Pfeffer' }] };
  assert.equal(passtZuSystem(deutsch, 'metrisch'), true); assert.equal(passtZuSystem(deutsch, 'us'), false);
  assert.equal(passtZuSystem({ ings: [{ amt: '2', unit: 'cups', name: 'flour' }, { amt: '1', unit: 'Stück', name: 'egg' }] }, 'us'), true);
  assert.equal(passtZuSystem({ ings: [{ amt: '1', unit: 'Prise', name: 'Salz' }] }, 'us'), true, 'nur neutrale Einheiten passen zu beiden'); assert.equal(passtZuSystem({}, 'us'), true); assert.equal(passtZuSystem(null, 'us'), true);
});

test('Einheiten · zuUs: Flüssiges wird Löffel, fl oz oder cup – je nach Größe, auf Viertel gerundet', () => {
  assert.equal(us('5', 'ml'), '1 tsp', '5 / 4,929 = 1,01'); assert.equal(us('7,5', 'ml'), '1 ½ tsp'); assert.equal(us('10', 'ml'), '2 tsp', '10 / 4,929 = 2,03');
  assert.equal(us('15', 'ml'), '1 tbsp', '15 / 14,787 = 1,01'); assert.equal(us('30', 'ml'), '2 tbsp'); assert.equal(us('45', 'ml'), '3 tbsp'); assert.equal(us('20', 'ml'), '1 ¼ tbsp', '20 / 14,787 = 1,35');
  assert.equal(us('60', 'ml'), '¼ cup', '60 / 236,6 = 0,254; ¼ cup sind 59 ml'); assert.equal(us('125', 'ml'), '½ cup', '½ cup sind 118 ml, 5,4 % daneben'); assert.equal(us('180', 'ml'), '¾ cup');
  assert.equal(us('250', 'ml'), '1 cup', '250 / 236,6 = 1,06'); assert.equal(us('300', 'ml'), '1 ¼ cups'); assert.equal(us('500', 'ml'), '2 cups'); assert.equal(us('1', 'l'), '4 ¼ cups', '1000 / 236,6 = 4,23');
  assert.equal(us('1 ½', 'l'), '6 ¼ cups', '1500 / 236,6 = 6,34'); assert.equal(us('1,5', 'l'), '6 ¼ cups'); assert.equal(us('2', 'dl'), '6 ¾ fl oz'); assert.equal(us('4', 'cl'), '2 ¾ tbsp', '40 / 14,787 = 2,71');
  // Eine Tasse nur, wenn das Viertel höchstens 6 % danebenliegt; sonst Flüssig-Unzen.
  assert.equal(us('200', 'ml'), '6 ¾ fl oz', '¾ cup wären 177 ml (−11 %); 200 / 29,57 = 6,76'); assert.equal(us('100', 'ml'), '3 ½ fl oz', '100 / 29,57 = 3,38'); assert.equal(us('150', 'ml'), '5 fl oz'); assert.equal(us('80', 'ml'), '2 ¾ fl oz');
  assert.equal(us('400-500', 'ml'), '1 ¾-2 cups', 'ein Bereich bleibt ein Bereich, beide Zahlen in derselben Einheit'); assert.equal(us('ca. 250', 'ml'), 'ca. 1 cup', 'Text um die Zahl bleibt stehen');
});

test('Einheiten · zuUs: Gewicht wird oz, ab einem Pfund lb – aber nur, wenn das Viertel-Pfund passt', () => {
  assert.equal(us('100', 'g'), '3 ½ oz', '100 / 28,35 = 3,53'); assert.equal(us('150', 'g'), '5 ¼ oz', '5,29 – die alte Tabelle machte daraus ¼ lb (113 g)'); assert.equal(us('200', 'g'), '7 oz'); assert.equal(us('225', 'g'), '8 oz'); assert.equal(us('250', 'g'), '8 ¾ oz');
  assert.equal(us('340', 'g'), '12 oz'); assert.equal(us('450', 'g'), '1 lb', '450 / 453,6 = 0,99'); assert.equal(us('680', 'g'), '1 ½ lb'); assert.equal(us('750', 'g'), '1 ¾ lb', '1,65; 1 ¾ lb sind 794 g, 5,8 % daneben');
  assert.equal(us('500', 'g'), '17 ½ oz', '1 lb wären 454 g (−9 %); 500 / 28,35 = 17,64, ab 10 auf halbe'); assert.equal(us('1', 'Pfund'), '17 ½ oz', 'ein deutsches Pfund sind 500 g');
  assert.equal(us('1', 'kg'), '2 ¼ lb', '2,20'); assert.equal(us('1,5', 'kg'), '3 ¼ lb', '3,31'); assert.equal(us('2', 'kg'), '4 ½ lb', '4,41');
  assert.equal(us('7', 'g'), '¼ oz', 'ein Päckchen Trockenhefe: 7 / 28,35 = 0,247'); assert.equal(us('25', 'g'), '1 oz', '0,88');
});

test('Einheiten · zuUs: Löffel wechseln nur den Namen; was auf kein Viertel passt oder kein festes Maß ist, bleibt stehen', () => {
  assert.equal(us('2', 'EL'), '2 tbsp'); assert.equal(us('1 ½', 'TL'), '1 ½ tsp'); assert.equal(us('1/2', 'Teelöffel'), '1/2 tsp'); assert.equal(us('', 'EL'), 'tbsp'); assert.equal(us('etwas', 'TL'), 'etwas tsp');
  for (const [amt, unit, warum] of [['5', 'g', '¼ oz wären 7 g (+42 %)'], ['10', 'g', '¼ oz sind 7 g, ½ oz 14 g'], ['2', 'ml', '½ tsp wären 2,5 ml (+23 %)'], ['0,2', 'ml', 'weniger als ein Viertel Teelöffel'], ['etwas', 'ml', 'keine Zahl'], ['', 'g', 'keine Zahl'],
    ['3', 'Stück', 'kein Maß'], ['1', 'Tasse', 'eine Tasse ist kein festes Maß'], ['1', 'Prise', 'kein Maß'], ['2', 'cups', 'schon US'], ['8', 'oz', 'schon US'], ['1', '', 'keine Einheit'], ['5', 'mg', 'nicht in der Tabelle']]) {
    const z = { amt, unit, name: 'x', note: 'n', id: 7 }; assert.equal(zuUs(z), z, `${amt} ${unit}: ${warum} – dieselbe Zutat zurück`);
  }
  const z = { id: 3, amt: '250', unit: 'ml', name: 'Milch', note: 'kalt', ck: true }, r = zuUs(z);
  assert.deepEqual(r, { id: 3, amt: '1', unit: 'cup', name: 'Milch', note: 'kalt', ck: true }, 'alle anderen Felder bleiben'); assert.deepEqual(z, { id: 3, amt: '250', unit: 'ml', name: 'Milch', note: 'kalt', ck: true }, 'das Original bleibt unverändert');
  assert.equal(zuUs(null), null); assert.equal(zuUs('Salz'), 'Salz');
});

test('Einheiten · zuMetrisch: cup, fl oz, pint, quart, gallon → ml oder Liter; oz und lb → g oder kg; ganze Zahlen', () => {
  assert.equal(metrisch('1', 'cup'), '237 ml', '236,588'); assert.equal(metrisch('½', 'cup'), '118 ml'); assert.equal(metrisch('1/4', 'cup'), '59 ml'); assert.equal(metrisch('1 1/2', 'cups'), '355 ml', '1,5 × 236,588 = 354,9');
  assert.equal(metrisch('2', 'cups'), '473 ml'); assert.equal(metrisch('5', 'cups'), '1,2 l', '1183 ml: ab 1000 ml Liter'); assert.equal(metrisch('2-3', 'cups'), '473-710 ml');
  assert.equal(metrisch('1', 'fl oz'), '30 ml', '29,57'); assert.equal(metrisch('8', 'fl. oz.'), '237 ml'); assert.equal(metrisch('1', 'pint'), '473 ml'); assert.equal(metrisch('1', 'quart'), '946 ml'); assert.equal(metrisch('1', 'gallon'), '3 ¾ l', '3,785 l');
  assert.equal(metrisch('1', 'oz'), '28 g', '28,35'); assert.equal(metrisch('¼', 'oz'), '7 g'); assert.equal(metrisch('8', 'oz'), '227 g', '226,8'); assert.equal(metrisch('16', 'oz'), '454 g');
  assert.equal(metrisch('1', 'lb'), '454 g', '453,6'); assert.equal(metrisch('2 ½', 'lbs'), '1,1 kg', '1134 g: ab 1000 g Kilogramm'); assert.equal(metrisch('1', 'pound'), '454 g');
  assert.equal(metrisch('2', 'tbsp'), '2 EL'); assert.equal(metrisch('1/2', 'tsp'), '1/2 TL'); assert.equal(metrisch('1', 'Tablespoon'), '1 EL');
  for (const [amt, unit] of [['500', 'g'], ['1', 'Dash'], ['1', 'stick'], ['2', 'EL'], ['some', 'cups'], ['1', 'Tasse']]) { const z = { amt, unit, name: 'x' }; assert.equal(zuMetrisch(z), z, `${amt} ${unit} bleibt`); }
});

test('Einheiten · an der Bar ist „oz“ ein Volumen, in beide Richtungen, wie im alten Mixarium', () => {
  assert.equal(metrisch('1', 'oz', { bar: true }), '30 ml', '29,57 ml statt 28 g'); assert.equal(metrisch('8', 'oz', { bar: true }), '237 ml'); assert.equal(metrisch('1 ½', 'oz', { bar: true }), '44 ml', '44,36'); assert.equal(metrisch('1', 'lb', { bar: true }), '454 g', 'ein Pfund bleibt ein Gewicht');
  assert.equal(us('40', 'ml', { bar: true }), '1 ¼ oz', '40 / 29,57 = 1,35'); assert.equal(us('4', 'cl', { bar: true }), '1 ¼ oz'); assert.equal(us('60', 'ml', { bar: true }), '2 oz', 'nicht ¼ cup'); assert.equal(us('15', 'ml', { bar: true }), '½ oz', 'kein Esslöffel');
  assert.equal(us('2', 'cl', { bar: true }), '¾ oz', '20 / 29,57 = 0,68'); assert.equal(us('5', 'ml', { bar: true }), '1 tsp', 'ein Barlöffel voll'); assert.equal(us('250', 'ml', { bar: true }), '1 cup', 'ab 200 ml Tassen'); assert.equal(us('150', 'ml', { bar: true }), '5 oz');
  assert.equal(us('1', 'Barlöffel', { bar: true }), '1 Barlöffel'); assert.equal(us('2', 'Dash', { bar: true }), '2 Dash');
});

test('Einheiten · hin und zurück landet in der Nähe des Anfangs (höchstens 6 % daneben)', () => {
  for (const [amt, unit] of [['250', 'ml'], ['500', 'ml'], ['100', 'ml'], ['30', 'ml'], ['1', 'l'], ['100', 'g'], ['250', 'g'], ['500', 'g'], ['1', 'kg']]) {
    const hin = zuUs({ amt, unit, name: 'x' }), rueck = zuMetrisch(hin), basis = { ml: 1, l: 1000, g: 1, kg: 1000, EL: 14.79 };
    const zahl = (z) => parseFloat(skaliere(z.amt, 1).replace(',', '.').replace(' ¾', '.75').replace(' ¼', '.25').replace(' ½', '.5')) * basis[z.unit];
    const vorher = parseFloat(amt.replace(',', '.')) * basis[unit], nachher = zahl(rueck);
    assert.ok(Math.abs(nachher - vorher) / vorher <= 0.06, `${amt} ${unit} → ${hin.amt} ${hin.unit} → ${rueck.amt} ${rueck.unit}`);
  }
});

test('Einheiten · viertel(): US-Schreibweise mit Bruchzeichen, nie ein Komma', () => {
  assert.deepEqual([0, 0.1, 0.13, 0.25, 0.5, 0.75, 1, 1.24, 1.5, 2.9, 9.9, 10.2, 17.64, 99.8, 123.4].map(viertel), ['0', '0', '¼', '¼', '½', '¾', '1', '1 ¼', '1 ½', '3', '10', '10', '17 ½', '100', '123']);
});

test('Einheiten · Temperaturen im Text: °C → °F, Backofen auf 25 °F, alles darunter aufs Grad', () => {
  const f = (t) => temperaturenImText(t, 'us');
  assert.equal(f('Den Backofen auf 180 °C (Umluft 160°C) vorheizen.'), 'Den Backofen auf 350 °F (Umluft 325°F) vorheizen.', '356 → 350, 320 → 325; die Schreibweise mit oder ohne Lücke bleibt');
  assert.equal(f('Bei 160–180 °C 20-25 Minuten backen.'), 'Bei 325–350 °F 20-25 Minuten backen.', 'Bereich; die Minuten bleiben');
  assert.equal(f('200 °C'), '400 °F', '392'); assert.equal(f('220 °C'), '425 °F', '428'); assert.equal(f('250 °C'), '475 °F', '482'); assert.equal(f('150 °C'), '300 °F', '302'); assert.equal(f('140 °C'), '275 °F', '284');
  assert.equal(f('Auf 100 °C erhitzen, dann auf 37 °C abkühlen; Zucker bis 116 °C kochen.'), 'Auf 212 °F erhitzen, dann auf 99 °F abkühlen; Zucker bis 241 °F kochen.', 'unter 140 °C genau: Wasser kocht bei 212 °F');
  assert.equal(f('Bei -18 °C lagern (−20 bis −18 °C).'), 'Bei 0 °F lagern (-4 bis 0 °F).', 'Minusgrade: −0,4 → 0, −4'); assert.equal(f('37,5 °C'), '100 °F', '99,5');
  assert.equal(f('bei 200 Grad Celsius backen'), 'bei 400 Grad Fahrenheit backen'); assert.equal(f('220℃'), '425℉'); assert.equal(f('250 ° C'), '475 ° F'); assert.equal(f('180 degrees Celsius'), '350 degrees Fahrenheit'); assert.equal(f('180 °c'), '350 °F');
  assert.equal(f('Um 180 Grad drehen.'), 'Um 180 Grad drehen.', 'ohne Skala kann es ein Winkel sein: bleibt'); assert.equal(f('Stufe 3 bis 200 °C'), 'Stufe 3 bis 400 °F', '3 und 200 sind kein Bereich: nur die Temperatur wird umgerechnet');
  assert.equal(f('Heat to 350 °F.'), 'Heat to 350 °F.', 'schon im Zielsystem'); assert.equal(f('20 Minuten, 3 Eier, 500 g'), '20 Minuten, 3 Eier, 500 g'); assert.equal(f(''), ''); assert.equal(f(null), '');
});

test('Einheiten · Temperaturen im Text: °F → °C, Backofen auf 10 °C, alles darunter aufs Grad', () => {
  const c = (t) => temperaturenImText(t, 'metrisch');
  assert.equal(c('Preheat the oven to 350 °F (325°F fan).'), 'Preheat the oven to 180 °C (160°C fan).', '176,7 → 180; 162,8 → 160');
  assert.equal(c('Bake at 375-400 degrees F for 20 minutes.'), 'Bake at 190-200 degrees C for 20 minutes.'); assert.equal(c('425 °F'), '220 °C', '218,3'); assert.equal(c('450 °F'), '230 °C'); assert.equal(c('300 °F'), '150 °C'); assert.equal(c('275 °F'), '140 °C', '135 → 140');
  assert.equal(c('Heat to 212 °F, cook sugar to 240 °F, chill to 40 °F.'), 'Heat to 100 °C, cook sugar to 116 °C, chill to 4 °C.'); assert.equal(c('Store at 0 °F.'), 'Store at -18 °C.', '−17,8'); assert.equal(c('32 °F'), '0 °C');
  assert.equal(c('Roast at 425 degrees Fahrenheit.'), 'Roast at 220 degrees Celsius.'); assert.equal(c('165℉'), '74℃'); assert.equal(c('Turn 90 degrees.'), 'Turn 90 degrees.'); assert.equal(c('180 °C'), '180 °C');
  for (const t of [180, 200, 220, 160, 150, 190, 230]) assert.equal(c(temperaturenImText(t + ' °C', 'us')), t + ' °C', `${t} °C hin und zurück`);
  assert.equal(temperaturenImText('180 °C', 'quatsch'), '180 °C', 'ein unbekanntes System ändert nichts'); assert.equal(temperaturenImText('180 °C'), '180 °C');
});

test('Einheiten · Längen im Text: cm ↔ Zoll, auch Maße mit „x“, Bereiche und „26-cm-Springform“', () => {
  const z = (t, o) => laengenImText(t, 'us', o), cm = (t) => laengenImText(t, 'metrisch');
  assert.equal(z('In eine 26-cm-Springform füllen.'), 'In eine 10-Zoll-Springform füllen.', '26 / 2,54 = 10,2'); assert.equal(z('In 2 cm große Würfel schneiden.'), 'In ¾ Zoll große Würfel schneiden.', '0,79');
  assert.equal(z('Blech 30 x 40 cm, Teig 0,5 cm dick, 2-3 cm Rand.'), 'Blech 12 x 15 ½ Zoll, Teig ¼ Zoll dick, ¾-1 ¼ Zoll Rand.', '11,8 · 15,7 · 0,2 · 0,79–1,18');
  assert.equal(z('Blech 30 x 40 cm, 1 cm dick', { sprache: 'en' }), 'Blech 12 x 15 ½ inches, ½ inch dick'); assert.equal(z('a 26-cm tin', { sprache: 'en' }), 'a 10-inch tin'); assert.equal(z('28 Zentimeter'), '11 Zoll');
  assert.equal(z('0,1 cm'), '0,1 cm', 'weniger als ein Achtel Zoll: bleibt'); assert.equal(z('500 g Mehl, 20 Minuten'), '500 g Mehl, 20 Minuten');
  assert.equal(cm('Use a 9-inch pan.'), 'Use a 23-cm pan.', '22,86'); assert.equal(cm('A 9 x 13 inch dish.'), 'A 23 x 33 cm dish.'); assert.equal(cm('Cut into 1/2 inch cubes, 1 ½ inches apart.'), 'Cut into 1,3 cm cubes, 4 cm apart.', '1,27 · 3,81');
  assert.equal(cm('10 Zoll Pfanne'), '25 cm Pfanne', '25,4'); assert.equal(cm('¼ inch'), '0,6 cm'); assert.equal(cm('3 inches'), '7,5 cm', '7,62 auf halbe'); assert.equal(cm('12 inches'), '30 cm', '30,48');
  assert.equal(cm('Add 2 "heaped" spoons and 3" of love'), 'Add 2 "heaped" spoons and 3" of love', 'das Zeichen " ist meist ein Anführungszeichen und wird nicht als Zoll gelesen, auch nicht hinter einer Zahl'); assert.equal(cm('26 cm'), '26 cm'); assert.equal(laengenImText('26 cm', 'quatsch'), '26 cm'); assert.equal(z(null), '');
});

test('Einheiten · rezeptIn: das ganze Rezept für die Anzeige, das Original bleibt', () => {
  const r = { uid: 'r-1', name: 'Rührkuchen', servings: 12, img: 'data:image/jpeg;base64,AAAA', ings: [{ id: 1, amt: '250', unit: 'g', name: 'Butter', note: '', ck: false }, { id: 2, amt: '250', unit: 'ml', name: 'Milch' }, { id: 3, amt: '2', unit: 'TL', name: 'Backpulver' }, { id: 4, amt: '4', unit: '', name: 'Eier' }, { id: 5, amt: '1', unit: 'Prise', name: 'Salz' }],
    steps: [{ id: 1, txt: 'Ofen auf 180 °C vorheizen, eine 26-cm-Form fetten.', note: 'Umluft' }, { id: 2, txt: '45 Minuten backen.' }] };
  const kopie = JSON.parse(JSON.stringify(r)), usa = rezeptIn(r, 'us');
  assert.deepEqual(usa.ings.map((z) => [z.amt, z.unit, z.name].filter(Boolean).join(' ')), ['8 ¾ oz Butter', '1 cup Milch', '2 tsp Backpulver', '4 Eier', '1 Prise Salz']);
  assert.deepEqual(usa.steps, [{ id: 1, txt: 'Ofen auf 350 °F vorheizen, eine 10-Zoll-Form fetten.', note: 'Umluft' }, { id: 2, txt: '45 Minuten backen.' }]);
  assert.equal(usa.name, 'Rührkuchen'); assert.equal(usa.uid, 'r-1'); assert.equal(usa.img, r.img); assert.deepEqual(r, kopie, 'das Rezept selbst ist unverändert');
  assert.equal(rezeptIn(r, 'us', { sprache: 'en' }).steps[0].txt, 'Ofen auf 350 °F vorheizen, eine 10-inch-Form fetten.');
  assert.deepEqual(rezeptIn(r, 'metrisch').ings, r.ings, 'ein metrisches Rezept bleibt metrisch'); assert.equal(rezeptIn(r, 'metrisch').steps[0].txt, r.steps[0].txt);
  const amerikanisch = { name: 'Pancakes', ings: [{ amt: '1 1/2', unit: 'cups', name: 'flour' }, { amt: '2', unit: 'tbsp', name: 'sugar' }, { amt: '4', unit: 'oz', name: 'butter' }], steps: ['Heat the griddle to 375 °F.', { txt: 'Use an 8-inch pan.' }] };
  const eu = rezeptIn(amerikanisch, 'metrisch');
  assert.deepEqual(eu.ings.map((z) => `${z.amt} ${z.unit} ${z.name}`), ['355 ml flour', '2 EL sugar', '113 g butter']); assert.deepEqual(eu.steps, ['Heat the griddle to 190 °C.', { txt: 'Use an 20-cm pan.' }]);
  assert.equal(rezeptIn(amerikanisch, 'metrisch', { bar: true }).ings[2].unit, 'ml', 'an der Bar sind 4 oz Flüssigkeit');
  assert.equal(rezeptIn(r, 'imperial'), r, 'ein unbekanntes System gibt das Rezept unverändert zurück'); assert.equal(rezeptIn(null, 'us'), null); assert.deepEqual(rezeptIn({ name: 'leer' }, 'us'), { name: 'leer', ings: [], steps: [] });
});
