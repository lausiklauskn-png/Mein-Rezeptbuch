#!/usr/bin/env node
// Sprach-Schlüssel der neuen PWA: liest alle Paare L('Deutsch', 'English') aus dem Quelltext.
// Der deutsche Text ist der Schlüssel der Tabellen neu/sprachen/<code>.mjs (export default { 'Deutsch': '…' }).
//
//   node tools/sprach-schluessel.mjs                    alle Paare als JSON ({ "Deutsch": "English", … }) nach stdout
//   node tools/sprach-schluessel.mjs --nach datei.json  dasselbe in eine Datei
//   node tools/sprach-schluessel.mjs --pruefe           je Sprache: welche Schlüssel in neu/sprachen/<code>.mjs fehlen oder überzählig sind
//   node tools/sprach-schluessel.mjs a.mjs b.mjs        andere Quelldateien (Vorgabe: alle .mjs direkt unter neu/)
//   … --ordner pfad                                     anderer Ordner der Tabellen (Vorgabe: neu/sprachen)
//
// Gelesen wird wie ein Leser von JavaScript: Kommentare, Zeichenketten und der Text von Vorlagen (`…`) zählen nicht,
// wohl aber, was in ${…} steht. Ein Aufruf zählt mit einfachen oder doppelten Anführungszeichen und mit `…` ohne ${},
// auch über Zeilen hinweg; maskierte Zeichen (\' \n ä) werden gelesen, wie JavaScript sie liest.
// Was das Werkzeug nicht lesen kann (L('a' + x, …), L(name, …), nur ein Argument), steht unter `unlesbar`.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

export const TABELLEN_SPRACHEN = ['es', 'fr', 'it', 'pt', 'ru', 'zh'];   // Deutsch und Englisch stehen im Code
const NAME = /[A-Za-z0-9_$]/;
const MASKE = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' };

/** Liest ab `i` (dem öffnenden Zeichen) eine Zeichenkette. Zurück: { wert, ende } oder null (keine wörtliche Zeichenkette, z. B. `…${x}…`). */
export function liesZeichenkette(q, i) {
  const auf = q[i]; if (auf !== "'" && auf !== '"' && auf !== '`') return null;
  let wert = '';
  for (let j = i + 1; j < q.length; j++) {
    const c = q[j];
    if (c === '\\') {
      const n = q[++j];
      if (n === 'u') { const m = /^u\{([0-9a-fA-F]+)\}|^u([0-9a-fA-F]{4})/.exec(q.slice(j, j + 10)); if (!m) return null; wert += String.fromCodePoint(parseInt(m[1] || m[2], 16)); j += m[0].length - 1; }
      else if (n === 'x') { wert += String.fromCharCode(parseInt(q.slice(j + 1, j + 3), 16)); j += 2; }
      else if (n === '\n') { /* Zeile im Quelltext fortgesetzt: kein Zeichen */ }
      else if (n === '\r') { if (q[j + 1] === '\n') j++; }
      else wert += n in MASKE ? MASKE[n] : n;
      continue;
    }
    if (c === auf) return { wert, ende: j + 1 };
    if (auf === '`' && c === '$' && q[j + 1] === '{') return null;
    if (auf !== '`' && c === '\n') return null;
    wert += c;
  }
  return null;
}

const leer = (q, i) => { for (;;) { while (i < q.length && /\s/.test(q[i])) i++; if (q.startsWith('//', i)) { while (i < q.length && q[i] !== '\n') i++; continue; } if (q.startsWith('/*', i)) { const e = q.indexOf('*/', i + 2); i = e < 0 ? q.length : e + 2; continue; } return i; } };
const zeileVon = (q, i) => { let n = 1; for (let j = 0; j < i; j++) if (q[j] === '\n') n++; return n; };

/** Liest einen Aufruf ab der öffnenden Klammer. Zurück: { de, en, ende } oder { grund }. */
function liesAufruf(q, i) {
  let j = leer(q, i + 1); const de = liesZeichenkette(q, j);
  if (!de) return { grund: 'erstes Argument ist kein wörtlicher Text' };
  j = leer(q, de.ende);
  if (q[j] === ')') return { grund: 'ohne englischen Text', de: de.wert };
  if (q[j] !== ',') return { grund: 'erstes Argument ist zusammengesetzt', de: de.wert };
  j = leer(q, j + 1); const en = liesZeichenkette(q, j);
  if (!en) return { grund: 'zweites Argument ist kein wörtlicher Text', de: de.wert };
  j = leer(q, en.ende); if (q[j] === ',') j = leer(q, j + 1);
  if (q[j] !== ')') return { grund: 'zweites Argument ist zusammengesetzt', de: de.wert };
  return { de: de.wert, en: en.wert, ende: j + 1 };
}

/** Alle Aufrufe von `name(` im Quelltext, außerhalb von Kommentaren, Zeichenketten und Vorlagentext.
 *  Zurück: { stellen: [{ zeile, de, en }], unlesbar: [{ zeile, grund, de? }] }. */
export function leseAufrufe(q, name = 'L') {
  const stellen = [], unlesbar = [], stapel = [];   // stapel: je offener Vorlage die Klammertiefe ihres ${…}; oben steht, wo wir gerade sind
  let i = 0, tiefe = 0, davor = '';   // davor: das letzte bedeutsame Zeichen im Code (für die Frage: Teilung oder regulärer Ausdruck?)
  const imText = () => stapel.length && stapel[stapel.length - 1] === -1;
  while (i < q.length) {
    const c = q[i];
    if (imText()) {   // Text einer Vorlage: bis ` oder ${
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { stapel.pop(); davor = '`'; i++; continue; }
      if (c === '$' && q[i + 1] === '{') { stapel[stapel.length - 1] = tiefe; tiefe = 0; i += 2; davor = '{'; continue; }
      i++; continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && q[i + 1] === '/') { while (i < q.length && q[i] !== '\n') i++; continue; }
    if (c === '/' && q[i + 1] === '*') { const e = q.indexOf('*/', i + 2); i = e < 0 ? q.length : e + 2; continue; }
    if (c === "'" || c === '"') { let j = i + 1; while (j < q.length && q[j] !== c && q[j] !== '\n') j += q[j] === '\\' ? 2 : 1; i = j + 1; davor = c; continue; }
    if (c === '`') { stapel.push(-1); i++; continue; }
    if (c === '/') {   // regulärer Ausdruck, wenn davor kein Wert stehen kann
      const wort = /(?:^|[^A-Za-z0-9_$.])(return|typeof|case|in|of|do|else|void|delete|throw|new)$/.test(q.slice(Math.max(0, i - 12), i).trimEnd());
      if (wort || !davor || '(,=:[!&|?{};+-*%<>~^'.includes(davor)) {
        let j = i + 1, klasse = false;
        for (; j < q.length && q[j] !== '\n'; j++) { if (q[j] === '\\') { j++; continue; } if (q[j] === '[') klasse = true; else if (q[j] === ']') klasse = false; else if (q[j] === '/' && !klasse) break; }
        j++; while (j < q.length && /[a-z]/.test(q[j])) j++;
        i = j; davor = '/'; continue;
      }
    }
    if (c === '{') tiefe++;
    else if (c === '}') { if (tiefe === 0 && stapel.length) { tiefe = stapel[stapel.length - 1]; stapel[stapel.length - 1] = -1; i++; continue; } tiefe--; }
    if (q.startsWith(name, i) && !NAME.test(q[i - 1] || '') && q[i - 1] !== '.' && !NAME.test(q[i + name.length] || '')) {
      const k = leer(q, i + name.length);
      if (q[k] === '(' && !/(?:function|const|let|var)\s*$/.test(q.slice(Math.max(0, i - 12), i))) {
        const a = liesAufruf(q, k), zeile = zeileVon(q, i);
        if (a.grund) unlesbar.push({ zeile, grund: a.grund, ...(a.de != null ? { de: a.de } : {}) }); else stellen.push({ zeile, de: a.de, en: a.en });
        if (a.ende) { i = a.ende; davor = ')'; continue; }
      }
      i += name.length; davor = 'a'; continue;
    }
    davor = c; i++;
  }
  return { stellen, unlesbar };
}

/** Paare aus mehreren Quelltexten: { paare: { de: en }, widerspruch: [{ de, en: [..] }], unlesbar: [{ datei, zeile, grund }] }. */
export function sammle(quellen, name = 'L') {
  const paare = {}, mehr = new Map(), unlesbar = [];
  for (const [datei, text] of quellen) {
    const { stellen, unlesbar: u } = leseAufrufe(text, name);
    for (const x of u) unlesbar.push({ datei, ...x });
    for (const { de, en } of stellen) {
      if (!Object.prototype.hasOwnProperty.call(paare, de)) { paare[de] = en; continue; }
      if (paare[de] !== en) { if (!mehr.has(de)) mehr.set(de, new Set([paare[de]])); mehr.get(de).add(en); }
    }
  }
  return { paare, widerspruch: [...mehr].map(([de, en]) => ({ de, en: [...en] })), unlesbar };
}

/** Vergleicht die Paare mit einer Tabelle (Objekt oder null, wenn die Datei fehlt). */
export function vergleiche(paare, tabelle) {
  const soll = Object.keys(paare);
  if (!tabelle) return { da: false, fehlt: soll, ueberzaehlig: [] };
  const ist = new Set(Object.keys(tabelle)), sollMenge = new Set(soll);
  return { da: true, fehlt: soll.filter((k) => !ist.has(k) || typeof tabelle[k] !== 'string' || !tabelle[k]), ueberzaehlig: [...ist].filter((k) => !sollMenge.has(k)) };
}

export const quellDateien = (ordner = 'neu') => readdirSync(ordner).filter((d) => d.endsWith('.mjs')).sort().map((d) => join(ordner, d));
export const lesePaare = (dateien = quellDateien()) => sammle(dateien.map((d) => [d, readFileSync(d, 'utf8')]));

async function tabelleVon(ordner, code) {
  const p = join(ordner, code + '.mjs'); if (!existsSync(p)) return null;
  const m = await import(pathToFileURL(resolve(p)).href + '?t=' + Date.now()); return m.default || m.tabelle || {};
}

/** Bericht für --pruefe als Zeilen. */
export async function pruefBericht(paare, ordner = join('neu', 'sprachen'), sprachen = TABELLEN_SPRACHEN) {
  const zeilen = [], n = Object.keys(paare).length;
  for (const code of sprachen) {
    let t = null, kaputt = ''; try { t = await tabelleVon(ordner, code); } catch (f) { kaputt = String(f.message || f).split('\n')[0]; }
    if (kaputt) { zeilen.push(`${code}: Tabelle nicht lesbar (${kaputt}) – alle ${n} fehlen`); continue; }
    const v = vergleiche(paare, t);
    if (!v.da) { zeilen.push(`${code}: keine Tabelle (${join(ordner, code + '.mjs')}) – alle ${n} fehlen`); continue; }
    zeilen.push(`${code}: ${v.fehlt.length} fehlen · ${v.ueberzaehlig.length} überzählig · ${n - v.fehlt.length} von ${n} da`);
    for (const k of v.fehlt) zeilen.push(`  fehlt: ${JSON.stringify(k)}`);
    for (const k of v.ueberzaehlig) zeilen.push(`  überzählig: ${JSON.stringify(k)}`);
  }
  return zeilen;
}

async function haupt(arg) {
  const wert = (n) => { const i = arg.indexOf(n); return i >= 0 ? arg[i + 1] : null; };
  const nach = wert('--nach'), ordner = wert('--ordner') || join('neu', 'sprachen');
  const dateien = arg.filter((a, i) => !a.startsWith('--') && !['--nach', '--ordner'].includes(arg[i - 1]));
  const { paare, widerspruch, unlesbar } = lesePaare(dateien.length ? dateien : quellDateien());
  for (const u of unlesbar) console.error(`unlesbar ${u.datei}:${u.zeile} – ${u.grund}${u.de != null ? ': ' + JSON.stringify(u.de) : ''}`);
  for (const w of widerspruch) console.error(`zwei englische Fassungen für ${JSON.stringify(w.de)}: ${w.en.map((e) => JSON.stringify(e)).join(' / ')}`);
  if (arg.includes('--pruefe')) { console.log((await pruefBericht(paare, ordner)).join('\n')); return; }   // nur Bericht, Rückgabewert 0
  const json = JSON.stringify(paare, null, 1) + '\n';
  if (nach) { writeFileSync(nach, json); console.error(`${Object.keys(paare).length} Schlüssel nach ${nach}`); } else process.stdout.write(json);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await haupt(process.argv.slice(2));
