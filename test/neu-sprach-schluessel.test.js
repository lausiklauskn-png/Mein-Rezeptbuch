// Proben: tools/sprach-schluessel.mjs liest die Paare L('Deutsch', 'English') der neuen PWA; der deutsche Text ist der Schlüssel der Tabellen.
// Dazu: in neu/app.mjs steht kein L( mit zusammengesetztem Schlüssel, und keine Variable verdeckt den Helfer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { liesZeichenkette, leseAufrufe, sammle, vergleiche, pruefBericht, lesePaare, quellDateien, TABELLEN_SPRACHEN } from '../tools/sprach-schluessel.mjs';

const paare = (q) => Object.fromEntries(leseAufrufe(q).stellen.map((x) => [x.de, x.en]));

test('Zeichenketten: einfache und doppelte Anführungszeichen, Vorlagen ohne ${}, maskierte Zeichen wie in JavaScript', () => {
  assert.deepEqual(liesZeichenkette(`'Speichern' rest`, 0), { wert: 'Speichern', ende: 11 });
  assert.equal(liesZeichenkette(String.raw`'Klaus\' Buch'`, 0).wert, "Klaus' Buch");
  assert.equal(liesZeichenkette(String.raw`'Zeile 1\nZeile 2\tEnde \\ ä \u{1F372} \x41'`, 0).wert, 'Zeile 1\nZeile 2\tEnde \\ ä 🍲 A');
  assert.equal(liesZeichenkette('"mit \'einfachen\' darin"', 0).wert, "mit 'einfachen' darin");
  assert.equal(liesZeichenkette('`über\nzwei Zeilen`', 0).wert, 'über\nzwei Zeilen');
  assert.equal(liesZeichenkette('`mit ${x}`', 0), null, 'eine Vorlage mit ${} ist kein wörtlicher Text');
  assert.equal(liesZeichenkette("'bricht\nab'", 0), null); assert.equal(liesZeichenkette('name', 0), null); assert.equal(liesZeichenkette("'ohne Ende", 0), null);
});

test('Aufrufe: jede Schreibweise, auch über Zeilen und tief in Vorlagen; Kommentare, Zeichenketten und Vorlagentext zählen nicht', () => {
  const q = [
    "const a = L('Speichern', 'Save');",
    'const b = L("Abbrechen", "Cancel");',
    'const c = L(`Schließen`, `Close`);',
    "const d = L(",
    "  'Über zwei Zeilen',   // der deutsche Text",
    "  'Across two lines',",
    ");",
    String.raw`const e = L('Klaus\' Buch\n', 'Klaus\'s book\n');`,
    "const f = `<button title=\"${L('Zurück', 'Back')}\">${n ? `<b>${L('{0} Rezepte', '{0} recipes')}</b>` : ''} L('im Text', 'in text')</button>`;",
    "// L('im Kommentar', 'in a comment')",
    "/* L('im Block', 'in a block') */",
    "const g = \"L('in der Zeichenkette', 'in a string')\";",
    "const h = t.replace(/[&<>\"']/g, (c) => c) + L('nach dem Ausdruck', 'after the regex');",
    "const i = x / 2 + y / L('geteilt', 'divided').length;",
    "const j = Lk(de, en) + obj.L('Methode', 'method') + xL('anderer Name', 'other name') + L ('mit Abstand', 'with a space');",
    "const k = { L: 1 }; function L(de, en) { return de; }",
  ].join('\n');
  const { stellen, unlesbar } = leseAufrufe(q);
  assert.deepEqual(stellen.map((x) => x.de), ['Speichern', 'Abbrechen', 'Schließen', 'Über zwei Zeilen', "Klaus' Buch\n", 'Zurück', '{0} Rezepte', 'nach dem Ausdruck', 'geteilt', 'mit Abstand']);
  assert.deepEqual(unlesbar, []);
  assert.equal(paare(q)['Über zwei Zeilen'], 'Across two lines'); assert.equal(paare(q)["Klaus' Buch\n"], "Klaus's book\n");
  assert.equal(stellen.find((x) => x.de === 'Über zwei Zeilen').zeile, 4, 'die Zeile, in der der Aufruf beginnt');
  assert.equal(stellen.find((x) => x.de === 'nach dem Ausdruck').zeile, 13);
});

test('Was das Werkzeug nicht lesen kann, steht mit Zeile und Grund da', () => {
  const q = ["L('a' + x, 'b');", "L(name, 'b');", "L('nur deutsch');", "L(`a ${x}`, 'b');", "L('a', en);", "L('a', 'b' + c);", "L('gut', 'good');"].join('\n');
  const { stellen, unlesbar } = leseAufrufe(q);
  assert.deepEqual(stellen.map((x) => x.de), ['gut']);
  assert.deepEqual(unlesbar.map((u) => u.zeile), [1, 2, 3, 4, 5, 6]);
  assert.match(unlesbar[0].grund, /zusammengesetzt/); assert.match(unlesbar[1].grund, /kein wörtlicher Text/); assert.match(unlesbar[2].grund, /ohne englischen Text/);
  assert.match(unlesbar[3].grund, /kein wörtlicher Text/); assert.match(unlesbar[4].grund, /zweites Argument/); assert.match(unlesbar[5].grund, /zweites Argument/);
});

test('Sammeln über mehrere Dateien: jeder Schlüssel einmal, zwei englische Fassungen fallen auf', () => {
  const s = sammle([['a.mjs', "L('Ordner', 'Folder'); L('Speichern', 'Save');"], ['b.mjs', "L('Speichern', 'Save'); L('Ordner', 'Folders'); L(x, 'y');"]]);
  assert.deepEqual(s.paare, { Ordner: 'Folder', Speichern: 'Save' });
  assert.deepEqual(s.widerspruch, [{ de: 'Ordner', en: ['Folder', 'Folders'] }]);
  assert.deepEqual(s.unlesbar.map((u) => [u.datei, u.zeile]), [['b.mjs', 1]]);
});

test('Vergleich mit einer Tabelle: fehlende und überzählige Schlüssel; ohne Datei fehlen alle; ein leerer Eintrag fehlt', () => {
  const p = { Speichern: 'Save', Abbrechen: 'Cancel', Schließen: 'Close' };
  assert.deepEqual(vergleiche(p, { Speichern: 'Enregistrer', Schließen: '', Alt: 'Vieux' }), { da: true, fehlt: ['Abbrechen', 'Schließen'], ueberzaehlig: ['Alt'] });
  assert.deepEqual(vergleiche(p, null), { da: false, fehlt: ['Speichern', 'Abbrechen', 'Schließen'], ueberzaehlig: [] });
  assert.deepEqual(vergleiche(p, { Speichern: 'a', Abbrechen: 'b', Schließen: 'c' }), { da: true, fehlt: [], ueberzaehlig: [] });
});

test('--pruefe: Bericht je Sprache, Rückgabewert 0; die Ausgabe ohne Schalter ist das JSON der Paare, --nach schreibt es in eine Datei', async () => {
  const ort = mkdtempSync(join(tmpdir(), 'rb-sprache-'));
  try {
    mkdirSync(join(ort, 'sprachen'));
    writeFileSync(join(ort, 'quelle.mjs'), "const t = `${L('Speichern', 'Save')} ${L('Abbrechen', 'Cancel')}`;\n");
    writeFileSync(join(ort, 'sprachen', 'fr.mjs'), "export default { 'Speichern': 'Enregistrer', 'Alt': 'Vieux' };\n");
    writeFileSync(join(ort, 'sprachen', 'it.mjs'), 'export default {\n');   // kaputt
    const zeilen = await pruefBericht({ Speichern: 'Save', Abbrechen: 'Cancel' }, join(ort, 'sprachen'));
    assert.equal(zeilen.filter((z) => !z.startsWith('  ')).length, TABELLEN_SPRACHEN.length, 'eine Zeile je Sprache');
    assert.match(zeilen.find((z) => z.startsWith('fr:')), /1 fehlen · 1 überzählig · 1 von 2 da/);
    assert.ok(zeilen.includes('  fehlt: "Abbrechen"') && zeilen.includes('  überzählig: "Alt"'));
    assert.match(zeilen.find((z) => z.startsWith('es:')), /keine Tabelle .* alle 2 fehlen/); assert.match(zeilen.find((z) => z.startsWith('it:')), /nicht lesbar .* alle 2 fehlen/);
    const werkzeug = join(import.meta.dirname, '..', 'tools', 'sprach-schluessel.mjs'), lauf = (...a) => spawnSync(process.execPath, [werkzeug, ...a], { encoding: 'utf8' });
    const pruef = lauf(join(ort, 'quelle.mjs'), '--pruefe', '--ordner', join(ort, 'sprachen'));
    assert.equal(pruef.status, 0, 'nur Bericht'); assert.match(pruef.stdout, /fr: 1 fehlen · 1 überzählig/); assert.match(pruef.stdout, /ru: keine Tabelle/);
    const aus = lauf(join(ort, 'quelle.mjs')); assert.equal(aus.status, 0); assert.deepEqual(JSON.parse(aus.stdout), { Speichern: 'Save', Abbrechen: 'Cancel' });
    const nach = lauf(join(ort, 'quelle.mjs'), '--nach', join(ort, 'paare.json')); assert.equal(nach.status, 0); assert.equal(nach.stdout, '');
    assert.deepEqual(JSON.parse(readFileSync(join(ort, 'paare.json'), 'utf8')), { Speichern: 'Save', Abbrechen: 'Cancel' });
  } finally { rmSync(ort, { recursive: true, force: true }); }
});

test('Die neue PWA: jeder Aufruf von L( ist lesbar (kein zusammengesetzter Schlüssel), und der Leser übersieht keinen', () => {
  const dateien = quellDateien('neu'), { paare: alle, unlesbar } = lesePaare(dateien);
  assert.ok(dateien.includes(join('neu', 'app.mjs')));
  assert.deepEqual(unlesbar, [], 'L( mit nicht-wörtlichem Text: ' + unlesbar.map((u) => `${u.datei}:${u.zeile} ${u.grund}`).join(' · '));
  const q = readFileSync('neu/app.mjs', 'utf8'), einfach = /(?<![\w$.])L\(\s*'((?:[^'\\\n]|\\.)*)'\s*,\s*'((?:[^'\\\n]|\\.)*)'\s*\)/g;
  const naiv = [...q.matchAll(einfach)].map((m) => liesZeichenkette(`'${m[1]}'`, 0).wert);
  assert.ok(naiv.length > 0, 'die einfache Suche findet Aufrufe');
  assert.deepEqual(naiv.filter((k) => !(k in alle)), [], 'jedes Paar, das eine einfache Suche findet, steht auch im Ergebnis (L( in einem Kommentar anders schreiben)');
});

test('Die neue PWA: Platzhalter stimmen in beiden Sprachen überein, kein Text ist leer, und L ist genau einmal erklärt', () => {
  const { paare: alle } = lesePaare(quellDateien('neu')), platz = (t) => [...new Set(String(t).match(/\{\d\}/g) || [])].sort().join('');
  for (const [de, en] of Object.entries(alle)) { assert.ok(de.trim() && en.trim(), `leerer Text bei ${JSON.stringify(de)}`); assert.equal(platz(en), platz(de), `Platzhalter bei ${JSON.stringify(de)}`); }
  const q = readFileSync('neu/app.mjs', 'utf8');
  assert.equal((q.match(/\b(?:const|let|var|function)\s+L\b/g) || []).length, 1, 'L wird genau einmal erklärt');
  assert.deepEqual(q.match(/[(,]\s*L\s*(?:[,)]|=(?!=))|\[\s*L\s*[,\]]/g) || [], [], 'kein Parameter und keine Zerlegung namens L (sie würde den Helfer verdecken)');
});
