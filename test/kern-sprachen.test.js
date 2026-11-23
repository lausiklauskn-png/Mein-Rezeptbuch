// Proben: Sprachtabellen des Kerns (kern/sprachen/). Das Werkzeug schluessel.mjs liest die Textpaare aus dem Kern; jede der
// sechs Tabellen (es, fr, it, pt, ru, zh) muss genau diese Schlüssel tragen. Kein Netz, kein Browser.
// WURZEL=<Ordner> prüft eine Kopie (für die Gegenprobe: dort eine Zeile sabotieren, die Probe muss rot werden).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const WURZEL = process.env.WURZEL ? resolve(process.env.WURZEL) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lade = (p) => import(pathToFileURL(join(WURZEL, p)).href);
const { sammle, pruefe, SPRACHEN } = await lade('kern/sprachen/schluessel.mjs');
const { text, tabelle, tabelleVon, ladeTabelle, fuelle } = await lade('kern/oberflaeche/sprache.mjs');
const S = sammle(), DE = Object.keys(S.paare);
/* Die Tabellen, wie die App sie lädt: als ES-Modul. Lädt eine nicht, steht hier der Grund – die Probe darunter nennt ihn. */
const TAB = {}, LADEFEHLER = {};
for (const code of SPRACHEN) { try { TAB[code] = (await lade(`kern/sprachen/${code}.mjs`)).default; } catch (f) { LADEFEHLER[code] = (f && f.message) || String(f); } }
const platzhalter = (t) => (String(t).match(/\{\d\}/g) || []).sort().join(' ');
const kurz = (liste) => liste.slice(0, 5).map((k) => `„${k}“`).join(', ') + (liste.length > 5 ? ` … (${liste.length})` : '');

test('Werkzeug: jeder text()-Aufruf im Kern ist lesbar, keine oberste Tabelle bleibt ungeklärt', () => {
  assert.deepEqual(S.unlesbar, [], 'nicht lesbare Stellen: ' + S.unlesbar.join(' · '));
  assert.deepEqual(S.ungeklaert, [], 'ungeklärte Tabellen (in schluessel.mjs als Tabelle lesen oder in KEIN_PAAR nennen): ' + S.ungeklaert.join(' · '));
});
test('Werkzeug: jede Form, in der ein Paar im Kern steht, wird gelesen – mit dem Englischen daneben', () => {
  const form = { 'text(x, de, en)': ['Zutaten', 'Ingredients'], 'Hülle fehler(sprache, de, en)': ['Das Rezept hat noch keinen Namen.', 'The recipe has no name yet.'], 'Hülle T(de, en)': [' und ', ' and '],
    'Tabelle NAME[k][0]': ['Das ist ein Programm', 'This is a program'], 'Tabelle über örtlichen Namen (A.wofuer[0])': ['KI-Bilder', 'AI pictures'], 'Tabelle mit Stellen 1 und 2 (s[1], s[2])': ['kyrillischer', 'Cyrillic'],
    'const [de, en] = TEXTE[…]': ['Spracheingabe abgebrochen.', 'Voice input cancelled.'], 'Rückruf ([…, de, en]) => …': ['Kalorien', 'Calories'], 'Feld über Dateien hinweg (s.name[0])': ['Schnell', 'Fast'],
    'zwei Tabellen nebeneinander (TOENE, TOENE_EN)': ['Wie das Gerät', 'Same as device'], 'Felder { de, en }': ['Koralle', 'Coral'], 'Liste AUSSEN (erst die App ruft text())': ['Ohne ihn senden', 'Send without it'],
    'Text über zwei Zeilen': ['Für: {0}. Den Schlüssel legst du selbst bei {1} an ({2}). Er bleibt nur in diesem Gerät, steht in keiner Sicherung und geht nur an {1}, wenn du die Funktion auslöst. Die Kosten rechnet {1} direkt mit dir ab.', 'For: {0}. You create the key yourself at {1} ({2}). It stays on this device only, is in no backup and goes to {1} only when you start the function. {1} bills you directly.'] };
  for (const [name, [de, en]] of Object.entries(form)) assert.equal(S.paare[de], en, 'Form nicht gelesen: ' + name);
  const ohneEnglisch = DE.filter((k) => typeof S.paare[k] !== 'string' || !S.paare[k].trim());
  assert.deepEqual(ohneEnglisch, [], 'Schlüssel ohne Englisch: ' + kurz(ohneEnglisch));
});
test('Werkzeug: Aufträge an die KI, Kennungen und Einträge mit eigenen Sprachfeldern sind keine Schlüssel', () => {
  const fremd = DE.filter((k) => /^(You are|Estimate nutrition|Translate this|Create a meal plan|Text inside the recipe)/.test(k) || /Verbessere das folgende Rezept-JSON/.test(k));
  assert.deepEqual(fremd, [], 'ein Auftrag an die KI steht als Schlüssel da: ' + kurz(fremd));
  for (const k of ['Vorspeisen', 'Gemüse', 'Ohne Kategorie', 'metrisch', 'Deutsch', 'Komma', 'auf-tippen']) assert.ok(!(k in S.paare), `„${k}“ gehört nicht in die Tabellen`);
  for (const n of ['KATEGORIEN_FEST', 'WARENGRUPPEN', 'OHNE_NAME']) assert.ok(S.eigene.some((e) => e.includes(n)), n + ' ist als Stelle mit eigenen Sprachfeldern genannt');
});

for (const code of SPRACHEN) {
  const t = TAB[code] || {}, werte = Object.entries(t);
  test(`Tabelle ${code}: gültiges ES-Modul mit export default, nur Texte`, () => {
    assert.equal(LADEFEHLER[code], undefined, `kern/sprachen/${code}.mjs lädt nicht: ${LADEFEHLER[code]}`);
    assert.ok(TAB[code] && typeof TAB[code] === 'object' && !Array.isArray(TAB[code]), 'export default ist ein Objekt');   /* nicht `t`: das ist ohne Tabelle {} und wäre immer ein Objekt */
    const keinText = werte.filter(([, v]) => typeof v !== 'string').map(([k]) => k);
    assert.deepEqual(keinText, [], 'Wert ist kein Text: ' + kurz(keinText));
  });
  test(`Tabelle ${code}: kein Schlüssel des Kerns fehlt`, () => {
    const fehlt = DE.filter((k) => !Object.prototype.hasOwnProperty.call(t, k));
    assert.deepEqual(fehlt, [], `fehlt in ${code}: ` + kurz(fehlt));
  });
  test(`Tabelle ${code}: kein Schlüssel ist überzählig`, () => {
    const zuviel = Object.keys(t).filter((k) => !(k in S.paare));
    assert.deepEqual(zuviel, [], `überzählig in ${code} (im Kern gibt es den deutschen Text nicht mehr): ` + kurz(zuviel));
  });
  test(`Tabelle ${code}: kein leerer Wert`, () => {
    const leer = werte.filter(([, v]) => typeof v !== 'string' || !v.trim()).map(([k]) => k);
    assert.deepEqual(leer, [], `leer in ${code}: ` + kurz(leer));
  });
  test(`Tabelle ${code}: dieselben Platzhalter wie der deutsche Schlüssel`, () => {
    const anders = werte.filter(([k, v]) => platzhalter(v) !== platzhalter(k)).map(([k, v]) => `${k} → ${v}`);
    assert.deepEqual(anders, [], `Platzhalter weichen ab in ${code}: ` + kurz(anders));
  });
  test(`Tabelle ${code}: kein Wert gleicht dem deutschen Schlüssel, außer den begründeten Ausnahmen`, () => {
    /* Gleich lautet nur, was in der Zielsprache wirklich so heißt: „Standard“ (fr, it: dasselbe Wort) und „Liste“ (fr: la liste). */
    const AUSNAHME = { fr: ['Standard', 'Liste'], it: ['Standard'] }[code] || [];
    const gleich = werte.filter(([k, v]) => v === k).map(([k]) => k);
    assert.deepEqual(gleich.filter((k) => !AUSNAHME.includes(k)), [], `unübersetzt in ${code}: ` + kurz(gleich));
    assert.deepEqual(AUSNAHME.filter((k) => !gleich.includes(k)), [], 'eine Ausnahme, die es nicht mehr braucht');
  });
  test(`Tabelle ${code}: Namen und Einheiten bleiben stehen (Anthropic, Claude, Mistral, OpenAI, PDF, QR, OCR, HTTP, KB, MB, $)`, () => {
    const fehlt = [];
    for (const [k, v] of werte) for (const n of ['Anthropic', 'Claude', 'Mistral', 'OpenAI', 'PDF', 'QR', 'OCR', 'HTTP', 'KB', 'MB', '$']) if (k.includes(n) && !String(v).includes(n)) fehlt.push(`${n} in „${k}“`);
    assert.deepEqual(fehlt, [], `Name fehlt in ${code}: ` + fehlt.slice(0, 5).join(', '));
  });
  test(`Tabelle ${code}: kein < > und kein gerades Anführungszeichen (manche Texte stehen in Attributen)`, () => {
    const roh = werte.filter(([, v]) => /[<>"]/.test(String(v))).map(([k]) => k);
    assert.deepEqual(roh, [], `Zeichen, das HTML bricht, in ${code}: ` + kurz(roh));
  });
  /* Chinesisch trennt nicht mit Leerzeichen („和“, „将发送：“); in den anderen fünf hängt ein Satzteil sonst am nächsten. */
  if (code !== 'zh') test(`Tabelle ${code}: Leerzeichen am Rand wie im deutschen Schlüssel`, () => {
    const rand = (s) => [/^\s*/.exec(s)[0], /\s*$/.exec(s)[0]].join('|');
    const anders = werte.filter(([k, v]) => rand(String(v)) !== rand(k)).map(([k]) => JSON.stringify(k));
    assert.deepEqual(anders, [], `Rand weicht ab in ${code}: ` + anders.join(', '));
  });
}

test('Laufzeit: text(code, de, en) liefert nach ladeTabelle() den Eintrag, ohne Eintrag Englisch, Deutsch und Englisch bleiben', async () => {
  assert.equal(text('fr', 'Zutaten', 'Ingredients'), 'Ingredients', 'vor dem Laden steht Englisch da');
  for (const code of SPRACHEN) {
    assert.equal(await ladeTabelle(code, [pathToFileURL(join(WURZEL, `kern/sprachen/${code}.mjs`)).href]), true, `ladeTabelle(${code}) lädt die Tabelle`);
    assert.equal(Object.keys(tabelleVon(code)).length, Object.keys(TAB[code] || {}).length);
    const falsch = DE.filter((de) => text(code, de, S.paare[de]) !== (TAB[code] || {})[de]);
    assert.deepEqual(falsch, [], `text(${code}, …) liefert nicht den Eintrag der Tabelle: ` + kurz(falsch));
    assert.equal(text(code, 'Diesen Satz gibt es nicht.', 'There is no such sentence.'), 'There is no such sentence.', 'ohne Eintrag Englisch');
  }
  assert.equal(await ladeTabelle('de', ['nirgends.mjs']), false); assert.equal(await ladeTabelle('fr', ['nirgends.mjs']), false, 'eine fehlende Tabelle wirft nicht');
  assert.equal(text('de', 'Zutaten', 'Ingredients'), 'Zutaten'); assert.equal(text('en', 'Zutaten', 'Ingredients'), 'Ingredients');
  assert.equal(fuelle(text('fr', '{0} Portionen', '{0} servings'), 4), fuelle(TAB.fr['{0} Portionen'], 4));
});
test('Laufzeit: die Texte kommen bei den Funktionen des Kerns an (auch Farbe, Ton, Schrift-Regler, Tabellen, Hüllen)', async () => {
  for (const code of SPRACHEN) tabelle(code, TAB[code]);
  const { farbName, tonName } = await lade('kern/oberflaeche/farben.mjs'), { schriftRegler } = await lade('kern/oberflaeche/schrift.mjs');
  const { fundName } = await lade('kern/pruefung/datei.mjs'), { meldung, grundText } = await lade('kern/ki/reinigung.mjs'), { fehlerText, schriftHinweis } = await lade('kern/oberflaeche/diktat.mjs');
  const { naehrwertZeilen, wasGehtHinaus } = await lade('kern/ki/helfer.mjs'), { erklaerung } = await lade('kern/ki/schluessel.mjs');
  for (const code of SPRACHEN) {
    const t = TAB[code];
    assert.equal(farbName('koralle', code), t.Koralle, 'farbName ' + code); assert.equal(tonName('hell', code), t.Hell, 'tonName ' + code); assert.equal(tonName('gibtsnicht', code), t['Wie das Gerät']);
    assert.ok(schriftRegler(100, code).includes(`aria-label="${t['Schriftgröße in Prozent']}"`), 'schriftRegler ' + code);
    assert.equal(fundName('ANHANG-PROGRAMM', code), t['Das ist ein Programm']); assert.equal(grundText('winzig', code), t['winzige Schrift']);
    assert.equal(meldung('seitenMax', code, 3, 12), fuelle(t['Nur die ersten {0} von {1} Seiten gehen an die KI.'], 3, 12));
    assert.equal(fehlerText('stille', code), t['Nichts erkannt. Bitte noch einmal sprechen oder tippen.']);
    assert.ok(schriftHinweis('Salaam aleikum', 'ar-SA', code).includes(t.arabischer), 'schriftHinweis ' + code);
    assert.equal(naehrwertZeilen({ kcal: 100 }, code)[0].name, t.Kalorien);
    assert.ok(wasGehtHinaus('uebersetzung', { name: 'Suppe' }, code).startsWith(t['Hinaus geht: ']) && !/Sent:|Hinaus/.test(wasGehtHinaus('uebersetzung', { name: 'Suppe' }, code)), 'wasGehtHinaus ' + code);
    assert.ok(!/\{\d\}/.test(erklaerung('mistral', code)) && erklaerung('mistral', code).includes('console.mistral.ai/api-keys'), 'erklaerung ' + code);
  }
  assert.equal(farbName('koralle'), 'Koralle'); assert.equal(farbName('koralle', 'en'), 'Coral'); assert.equal(tonName('dunkel', 'en'), 'Dark'); assert.equal(tonName('hell'), 'Hell');
});
test('Werkzeug --pruefe: mit diesen Tabellen ist alles in Ordnung', async () => {
  const r = await pruefe(join(WURZEL, 'kern'), join(WURZEL, 'kern/sprachen'));
  assert.equal(r.ok, true, 'node kern/sprachen/schluessel.mjs --pruefe meldet etwas');
  assert.equal(r.schluessel, DE.length);
});
