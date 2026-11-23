// Proben: Sprachtabellen der neuen PWA (neu/sprachen/<code>.mjs). Das Werkzeug tools/sprach-schluessel.mjs liest die Paare
// L('Deutsch', 'English') aus neu/*.mjs; jede der sechs Tabellen (es, fr, it, pt, ru, zh) muss genau diese deutschen Schlüssel tragen.
// Fehlt eine Tabelle noch oder lädt sie nicht, ist das EINE rote Zeile mit dem Grund; die übrigen Proben dieser Sprache sind dann
// übersprungen (sie könnten nichts messen und sähen sonst grün aus). Kein Netz, kein Browser.
// WURZEL=<Ordner> prüft eine Kopie (für die Gegenprobe: dort eine Zeile sabotieren, die Probe muss rot werden).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const WURZEL = process.env.WURZEL ? resolve(process.env.WURZEL) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lade = (p) => import(pathToFileURL(join(WURZEL, p)).href);
const { lesePaare, quellDateien, vergleiche, pruefBericht, TABELLEN_SPRACHEN } = await lade('tools/sprach-schluessel.mjs');
const { text, ladeTabelle, tabelleVon, fuelle } = await lade('kern/oberflaeche/sprache.mjs');
const SPRACHEN = ['es', 'fr', 'it', 'pt', 'ru', 'zh'];
const ORDNER = 'neu/sprachen';
/* Die Schlüssel kommen aus dem Code, wie das Werkzeug sie liest – nicht aus einer abgelegten Liste. */
const S = lesePaare(quellDateien(join(WURZEL, 'neu'))), DE = Object.keys(S.paare);
const hat = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* Die Tabellen, wie die App sie lädt: als ES-Modul. Fehlt eine oder lädt sie nicht, steht hier der Grund. */
const TAB = {}, GRUND = {};
for (const code of SPRACHEN) {
  const p = `${ORDNER}/${code}.mjs`;
  if (!existsSync(join(WURZEL, p))) { GRUND[code] = `${p} fehlt: die Tabelle ist noch nicht geschrieben`; continue; }
  try {
    const m = await lade(p);
    if (!hat(m, 'default')) GRUND[code] = `${p} hat kein export default`;
    else if (!m.default || typeof m.default !== 'object' || Array.isArray(m.default)) GRUND[code] = `${p}: export default ist kein Objekt { 'Deutsch': '…' }`;
    else TAB[code] = m.default;
  } catch (f) { GRUND[code] = `${p} lädt nicht (kein gültiges ES-Modul): ${String((f && f.message) || f).split('\n')[0]}`; }
}
const platzhalter = (t) => (String(t).match(/\{\d\}/g) || []).sort().join(' ');
const kurz = (liste) => liste.slice(0, 5).map((k) => `„${k}“`).join(', ') + (liste.length > 5 ? ` … (${liste.length})` : '');
/* Namen, die in jeder Sprache stehen bleiben. */
const NAMEN = ['Anthropic', 'Claude', 'OpenAI', 'Mistral', 'Pollinations', 'PDF', 'QR', 'Muttis Rezeptbuch', 'Mixarium'];

test('Werkzeug: liest die Paare aus neu/*.mjs, und die Probe kennt dieselben sechs Sprachen', () => {
  assert.deepEqual([...TABELLEN_SPRACHEN].sort(), [...SPRACHEN].sort(), 'tools/sprach-schluessel.mjs nennt andere Tabellen-Sprachen als diese Probe');
  /* Selbst-Riegel: läse das Werkzeug nichts, wäre „kein Schlüssel fehlt“ für jede Tabelle wahr. */
  assert.ok(DE.length > 100, `nur ${DE.length} Schlüssel gelesen – das Werkzeug findet den Code nicht`);
  assert.equal(S.paare.Speichern, 'Save', 'das Paar L(„Speichern“, „Save“) wird nicht gelesen');
  const ohneEnglisch = DE.filter((k) => typeof S.paare[k] !== 'string' || !S.paare[k].trim());
  assert.deepEqual(ohneEnglisch, [], 'Schlüssel ohne Englisch: ' + kurz(ohneEnglisch));
});

for (const code of SPRACHEN) {
  const p = `${ORDNER}/${code}.mjs`, t = TAB[code] || {}, werte = Object.entries(t);
  /* Ohne Tabelle misst keine der folgenden Proben etwas: übersprungen, die rote Zeile ist die erste. */
  const nur = { skip: TAB[code] ? false : `keine Tabelle: ${GRUND[code]}` };

  test(`Tabelle ${code}: ${p} ist da und ein gültiges ES-Modul mit export default, nur Texte`, () => {
    assert.equal(GRUND[code], undefined, GRUND[code]);
    const keinText = werte.filter(([, v]) => typeof v !== 'string').map(([k]) => k);
    assert.deepEqual(keinText, [], `Wert ist kein Text in ${code}: ` + kurz(keinText));
  });
  test(`Tabelle ${code}: kein Schlüssel aus dem Code fehlt`, nur, () => {
    const fehlt = DE.filter((k) => !hat(t, k));
    assert.deepEqual(fehlt, [], `fehlt in ${code} (${fehlt.length} von ${DE.length}): ` + kurz(fehlt));
  });
  test(`Tabelle ${code}: kein Schlüssel ist überzählig`, nur, () => {
    const zuviel = Object.keys(t).filter((k) => !hat(S.paare, k));
    assert.deepEqual(zuviel, [], `überzählig in ${code} (im Code gibt es den deutschen Text nicht mehr): ` + kurz(zuviel));
  });
  test(`Tabelle ${code}: kein leerer Wert`, nur, () => {
    const leer = werte.filter(([, v]) => typeof v !== 'string' || !v.trim()).map(([k]) => k);
    assert.deepEqual(leer, [], `leer in ${code}: ` + kurz(leer));
  });
  test(`Tabelle ${code}: dieselben Platzhalter {0}, {1} … wie der deutsche Schlüssel`, nur, () => {
    const anders = werte.filter(([k, v]) => platzhalter(v) !== platzhalter(k)).map(([k, v]) => `${k} → ${v}`);
    assert.deepEqual(anders, [], `Platzhalter weichen ab in ${code}: ` + kurz(anders));
  });
  test(`Tabelle ${code}: kein < > und kein gerades Anführungszeichen (manche Texte stehen in Attributen)`, nur, () => {
    const roh = werte.filter(([, v]) => /[<>"]/.test(String(v))).map(([k]) => k);
    assert.deepEqual(roh, [], `Zeichen, das HTML bricht, in ${code}: ` + kurz(roh));
  });
  test(`Tabelle ${code}: Namen bleiben stehen (${NAMEN.join(', ')})`, nur, () => {
    const fehlt = [];
    for (const [k, v] of werte) for (const n of NAMEN) if (k.includes(n) && !String(v).includes(n)) fehlt.push(`${n} in „${k}“`);
    assert.deepEqual(fehlt, [], `Name fehlt in ${code}: ` + fehlt.slice(0, 5).join(', '));
  });
  /* Chinesisch trennt nicht mit Leerzeichen; in den anderen fünf hängt ein Satzteil sonst am nächsten. */
  if (code !== 'zh') test(`Tabelle ${code}: Leerzeichen am Rand wie im deutschen Schlüssel`, nur, () => {
    const rand = (s) => [/^\s*/.exec(s)[0], /\s*$/.exec(s)[0]].join('|');
    const anders = werte.filter(([k, v]) => rand(String(v)) !== rand(k)).map(([k]) => JSON.stringify(k));
    assert.deepEqual(anders, [], `Rand weicht ab in ${code}: ` + anders.slice(0, 5).join(', '));
  });
  test(`Tabelle ${code}: das Werkzeug (--pruefe) meldet nichts Fehlendes und nichts Überzähliges`, nur, async () => {
    const v = vergleiche(S.paare, TAB[code]);
    assert.deepEqual([v.da, v.fehlt, v.ueberzaehlig], [true, [], []], `vergleiche() meldet für ${code}: fehlt ${kurz(v.fehlt)} · überzählig ${kurz(v.ueberzaehlig)}`);
    const zeilen = await pruefBericht(S.paare, join(WURZEL, ORDNER), [code]);
    assert.deepEqual(zeilen, [`${code}: 0 fehlen · 0 überzählig · ${DE.length} von ${DE.length} da`], 'Bericht von --pruefe: ' + zeilen.slice(0, 4).join(' / '));
  });
  test(`Laufzeit ${code}: nach ladeTabelle() liefert text() den Eintrag der Tabelle, ohne Eintrag Englisch`, nur, async () => {
    const adressen = [`kern/sprachen/${code}.mjs`, p].map((d) => pathToFileURL(join(WURZEL, d)).href);   /* wie neu/app.mjs: erst der Kern, dann die App */
    assert.equal(await ladeTabelle(code, adressen), true, `ladeTabelle(${code}) lädt nichts`);
    const falsch = DE.filter((de) => text(code, de, S.paare[de]) !== t[de]);
    assert.deepEqual(falsch, [], `text(${code}, …) liefert nicht den Eintrag der Tabelle: ` + kurz(falsch));
    assert.ok(Object.keys(tabelleVon(code)).length >= werte.length, 'die geladene Tabelle ist kleiner als die Datei');
    assert.equal(text(code, 'Diesen Satz gibt es nicht.', 'There is no such sentence.'), 'There is no such sentence.', 'ohne Eintrag steht Englisch da');
    const mitZahl = DE.find((k) => /\{0\}/.test(k) && !/\{[1-9]\}/.test(k));
    if (mitZahl) assert.ok(fuelle(text(code, mitZahl, S.paare[mitZahl]), 7).includes('7'), `fuelle() setzt die Zahl nicht ein: „${mitZahl}“`);
  });
}

test('Laufzeit: Deutsch und Englisch brauchen keine Tabelle', async () => {
  assert.equal(text('de', 'Speichern', 'Save'), 'Speichern'); assert.equal(text('en', 'Speichern', 'Save'), 'Save');
  assert.equal(await ladeTabelle('de', ['nirgends.mjs']), false); assert.equal(await ladeTabelle('en', ['nirgends.mjs']), false);
});
