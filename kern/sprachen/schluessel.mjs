#!/usr/bin/env node
// Küchen-Kern · Schlüssel der Sprachtabellen (Werkzeug für Node, ohne Abhängigkeiten; die App lädt es nie).
// Der Kern spricht Deutsch und Englisch im Code: text(sprache, 'Deutsch', 'English'). Die übrigen sechs Sprachen stehen in
// kern/sprachen/<code>.mjs, mit dem DEUTSCHEN Text als Schlüssel. Dieses Werkzeug liest alle kern/**/*.mjs (ohne
// kern/sprachen/) und sammelt jedes Textpaar ein, das zur Laufzeit bei text() ankommt:
//   node kern/sprachen/schluessel.mjs            → { "Deutsch": "English", … }
//   node kern/sprachen/schluessel.mjs --pruefe   → je Sprache: was fehlt, was überzählig ist; dazu alles, was nicht lesbar war
//   node kern/sprachen/schluessel.mjs --wo       → jeder Schlüssel mit Datei:Zeile
// Gelesen wird der Quelltext, nichts wird ausgeführt. Die Formen, in denen ein Paar im Kern steht:
//   1. text(x, 'de', 'en') – das erste Argument beliebig, die Texte in '…', "…" oder `…` ohne ${}.
//   2. Hüllen: eine benannte Funktion, die zwei ihrer Parameter an text() weiterreicht (fehler(sprache, de, en), T(de, en)).
//   3. Tabellen: text(x, NAME[k][0], NAME[k][1]) · text(x, s[1], s[2]) · const [de, en] = TEXTE[…] · .map(([…, de, en]) => …).
//      Gelesen werden dann ALLE Paare der Tabelle (oberste const der Datei), auch über einen örtlichen Namen (const A = ANBIETER[a]).
//   4. Zwei Tabellen nebeneinander: text(x, TOENE[k], TOENE_EN[k]) – gleiche Kennung, links Deutsch, rechts Englisch.
//   5. Felder: jedes { de: '…', en: '…' } (Farben, Geräte). Trägt so ein Eintrag auch es/fr/it/pt/ru/zh, bringt er seine
//      Sprachen selbst mit und gehört NICHT in die Tabellen (Kategorien, Warengruppen); --pruefe nennt diese Stellen.
//   6. Paare, die erst die App durch text() schickt (HALT_JA, STUFEN …): die Liste AUSSEN unten.
// Damit nichts still durchrutscht: ein text()-Aufruf, den keine Form erklärt, ist „nicht lesbar“; eine Liste aus genau zwei
// Texten in einer obersten const, die keine Form gelesen hat und die nicht in KEIN_PAAR steht, ist „ungeklärt“ (ist das ein
// Textpaar für die App → AUSSEN; ist es keins → KEIN_PAAR). Beides macht --pruefe und die Probe rot.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SPRACHEN = ['es', 'fr', 'it', 'pt', 'ru', 'zh'];
const ALLE_FELDER = ['de', 'en', ...SPRACHEN];
/** Tabellen, deren Paare erst die App durch text() schickt (im Kern gibt es dafür keinen Aufruf). Datei → Namen. */
export const AUSSEN = {
  'ki/claude.mjs': ['STUFEN'],                    // name und dazu: Stufen-Knöpfe beim Scan
  'ki/reinigung.mjs': ['HALT_JA', 'HALT_TITEL'],  // Knopf und Titel des Halt-Fensters
  'pruefung/datei.mjs': ['PRUEF_ERKLAERUNG'],     // der Satz hinter dem „?“ bei „Datei prüfen“
};
/** Oberste Konstanten, deren Zwei-Text-Listen KEINE Textpaare sind (Kennungen, eigene Namen der Sprachen, Wörterlisten).
 *  'NAME' nimmt die ganze Konstante aus, 'NAME.feld' nur die Listen hinter diesem Feld. */
export const KEIN_PAAR = {
  'oberflaeche/sprache.mjs': ['SPRACHEN', 'ORT'], 'oberflaeche/diktat.mjs': ['SPRECH_SPRACHEN', 'BEFEHLE'], 'oberflaeche/geraete.mjs': ['GERAETE.worte'],
  'modell/einheiten.mjs': ['SYSTEME'], 'ausgabe/ausgabe.mjs': ['LIEFERUNG'], 'suche/bedeutung.mjs': ['BAUSTEINE', 'SYNONYME'],
};

/* ---------- Zerlegen: Quelltext → Zeichenfolge aus Namen, Texten, Zahlen, Mustern und Satzzeichen ---------- */
const VOR_MUSTER = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
const ZEICHEN = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**', '<<', '>>'];
const FLUCHT = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' };
const gekocht = (roh) => roh.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|\r?\n|[\s\S])/g, (_, c) => (c[0] === 'u' ? String.fromCodePoint(parseInt(c.replace(/[u{}]/g, ''), 16)) : c[0] === 'x' && c.length === 3 ? String.fromCharCode(parseInt(c.slice(1), 16)) : /^\r?\n$/.test(c) ? '' : c in FLUCHT ? FLUCHT[c] : c));

/** Zerlegt eine Datei. Zurück: [{ t: 'id'|'str'|'num'|'re'|'p'|'vo'|'vm'|'vz', v, zeile }] – 'vo' … 'vz' ist eine Vorlage mit ${}. */
export function zerlege(q) {
  const aus = [], vorlagen = []; let i = 0, zeile = 1, tiefe = 0;
  const gib = (t, v, z = zeile) => aus.push({ t, v, zeile: z });
  const stueck = () => {   /* liest ab i bis zum nächsten ${ oder ` */
    let roh = '';
    for (;;) {
      const c = q[i]; if (c === undefined) throw new Error('Vorlage nicht geschlossen (Zeile ' + zeile + ')');
      if (c === '\\') { roh += q.slice(i, i + 2); i += 2; continue; }
      if (c === '`') { i++; return [gekocht(roh), true]; }
      if (c === '$' && q[i + 1] === '{') { i += 2; return [gekocht(roh), false]; }
      if (c === '\n') zeile++;
      roh += c; i++;
    }
  };
  while (i < q.length) {
    const c = q[i], z0 = zeile;
    if (c === '\n') { zeile++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && q[i + 1] === '/') { while (i < q.length && q[i] !== '\n') i++; continue; }
    if (c === '/' && q[i + 1] === '*') { const e = q.indexOf('*/', i + 2), bis = e < 0 ? q.length : e + 2; zeile += q.slice(i, bis).split('\n').length - 1; i = bis; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1; while (j < q.length && q[j] !== c) { if (q[j] === '\n') throw new Error('Text nicht geschlossen (Zeile ' + zeile + ')'); j += q[j] === '\\' ? 2 : 1; }
      gib('str', gekocht(q.slice(i + 1, j))); i = j + 1; continue;
    }
    if (c === '`') { i++; const [v, zu] = stueck(); if (zu) gib('str', v, z0); else { gib('vo', v, z0); vorlagen.push(tiefe); } continue; }
    if (c === '}' && vorlagen.length && vorlagen[vorlagen.length - 1] === tiefe) { i++; const [v, zu] = stueck(); if (zu) { gib('vz', v, z0); vorlagen.pop(); } else gib('vm', v, z0); continue; }
    if (c === '/') {   /* Muster oder Teilen? Entscheidet, was davor steht. */
      const p = aus[aus.length - 1], muster = !p || p.t === 'vo' || p.t === 'vm' || (p.t === 'p' && ![')', ']', '}'].includes(p.v)) || (p.t === 'id' && VOR_MUSTER.has(p.v));
      if (muster) {
        let j = i + 1, klasse = false;
        for (; j < q.length; j++) { const d = q[j]; if (d === '\n') break; if (d === '\\') { j++; continue; } if (klasse) { if (d === ']') klasse = false; continue; } if (d === '[') klasse = true; else if (d === '/') break; }
        if (q[j] !== '/') throw new Error('Muster nicht geschlossen (Zeile ' + zeile + ')');
        j++; while (/[a-z]/i.test(q[j] || '')) j++;
        gib('re', q.slice(i, j)); i = j; continue;
      }
    }
    const zahl = /^(?:0[xXbBoO][0-9a-fA-F_]+|\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)n?/.exec(q.slice(i, i + 40));
    if (zahl) { gib('num', zahl[0]); i += zahl[0].length; continue; }
    const name = /^[\p{ID_Start}$_][\p{ID_Continue}$‌‍]*/u.exec(q.slice(i, i + 80));
    if (name) { gib('id', name[0]); i += name[0].length; continue; }
    const z = ZEICHEN.find((x) => q.startsWith(x, i)) || c;
    if (z === '{') tiefe++; else if (z === '}') tiefe--;
    gib('p', z); i += z.length;
  }
  return aus;
}

/* ---------- Hilfen auf der Zeichenfolge ---------- */
const ist = (k, v) => !!k && k.t === 'p' && k.v === v;
const auf = (k) => !!k && ((k.t === 'p' && '([{'.includes(k.v) && k.v.length === 1) || k.t === 'vo');
const zu = (k) => !!k && ((k.t === 'p' && ')]}'.includes(k.v) && k.v.length === 1) || k.t === 'vz');
/** Zu jeder öffnenden Klammer die schließende und umgekehrt. */
function partner(tok) {
  const p = new Array(tok.length).fill(-1), stapel = [];
  tok.forEach((k, i) => { if (auf(k)) stapel.push(i); else if (zu(k)) { const a = stapel.pop(); if (a === undefined) throw new Error('Klammer ohne Anfang (Zeile ' + k.zeile + ')'); p[a] = i; p[i] = a; } });
  if (stapel.length) throw new Error('Klammer nicht geschlossen (Zeile ' + tok[stapel[stapel.length - 1]].zeile + ')');
  return p;
}
/** Die Stücke zwischen den Kommas einer Klammer: [[von, bis), …] */
function stuecke(d, iAuf) {
  const ende = d.p[iAuf], aus = []; let von = iAuf + 1;
  for (let i = iAuf + 1; i < ende; i++) { if (auf(d.tok[i])) { i = d.p[i]; continue; } if (ist(d.tok[i], ',')) { aus.push([von, i]); von = i + 1; } }
  if (von < ende) aus.push([von, ende]);
  return aus;
}
const einText = (d, [a, b]) => (b - a === 1 && d.tok[a].t === 'str' ? d.tok[a].v : null);
const einName = (d, [a, b]) => (b - a === 1 && d.tok[a].t === 'id' ? d.tok[a].v : null);
const gleich = (d, [a, b], [c, e]) => b - a === e - c && d.tok.slice(a, b).every((k, i) => k.t === d.tok[c + i].t && k.v === d.tok[c + i].v);

/** Liest eine Datei ein: Zeichenfolge, Klammern, der Name von text(), oberste Konstanten, Funktionen. */
function einlesen(pfad, kurz) {
  const tok = zerlege(readFileSync(pfad, 'utf8')), d = { pfad, kurz, tok, p: null, text: null, konst: new Map(), funktionen: [] };
  d.p = partner(tok);
  for (let i = 0; i < tok.length; i++) {   /* import { text as X } from '…/sprache.mjs' */
    if (!(tok[i].t === 'id' && tok[i].v === 'import' && ist(tok[i + 1], '{'))) continue;
    const e = d.p[i + 1], von = tok[e + 2];
    if (!(tok[e + 1] && tok[e + 1].v === 'from' && von && von.t === 'str' && /(^|\/)sprache\.mjs$/.test(von.v))) continue;
    for (const [a, b] of stuecke(d, i + 1)) if (tok[a].v === 'text') d.text = b - a === 3 ? tok[a + 2].v : 'text';
  }
  for (let i = 0, t = 0; i < tok.length; i++) {   /* oberste const/let: Name → Bereich des Anfangswerts */
    if (auf(tok[i])) t++; else if (zu(tok[i])) t--;
    if (t !== 0 || tok[i].t !== 'id' || !['const', 'let', 'var'].includes(tok[i].v)) continue;
    let j = i + 1;
    while (j < tok.length && tok[j].t === 'id' && ist(tok[j + 1], '=')) {
      const name = tok[j].v; let e = j + 2; while (e < tok.length && !ist(tok[e], ',') && !ist(tok[e], ';')) e = auf(tok[e]) ? d.p[e] + 1 : e + 1;
      d.konst.set(name, { von: j + 2, bis: e, zeile: tok[j].zeile, liste: auf(tok[j + 2]) && d.p[j + 2] === e - 1 });
      if (!ist(tok[e], ',')) break; j = e + 1;
    }
  }
  const param = ([a, b]) => { let k = a; if (ist(tok[k], '...')) k++; if (tok[k] && tok[k].t === 'id') return { name: tok[k].v }; if (ist(tok[k], '[')) return { muster: stuecke(d, k).map((s) => einName(d, s)) }; return {}; };
  const rumpf = (k) => { if (ist(tok[k], '{')) return [k, d.p[k]]; let e = k; while (e < tok.length && !ist(tok[e], ',') && !ist(tok[e], ';') && !zu(tok[e])) e = auf(tok[e]) ? d.p[e] + 1 : e + 1; return [k, e - 1]; };
  for (let i = 0; i < tok.length; i++) {
    if (ist(tok[i], '=>')) {   /* Pfeilfunktion, benannt (NAME = (…) => …) oder namenlos */
      const klammer = ist(tok[i - 1], ')'), a = klammer ? d.p[i - 1] : i - 1; let vor = a - 1; if (tok[vor] && tok[vor].t === 'id' && tok[vor].v === 'async') vor--;
      d.funktionen.push({ name: ist(tok[vor], '=') && tok[vor - 1] && tok[vor - 1].t === 'id' ? tok[vor - 1].v : null, params: klammer ? stuecke(d, a).map(param) : [param([a, i])], rumpf: rumpf(i + 1), kopf: a });
    } else if (tok[i].t === 'id' && tok[i].v === 'function') {
      let k = i + 1; if (ist(tok[k], '*')) k++; const name = tok[k] && tok[k].t === 'id' ? tok[k++].v : null;
      if (ist(tok[k], '(') && ist(tok[d.p[k] + 1], '{')) d.funktionen.push({ name, params: stuecke(d, k).map(param), rumpf: [d.p[k] + 1, d.p[d.p[k] + 1]], kopf: i });
    }
  }
  return d;
}

/* ---------- Sammeln ---------- */
/** Alle .mjs unter einem Ordner, ohne den Ordner der Tabellen. */
function dateienIn(ordner, ohne) {
  const aus = []; const geh = (o) => { for (const n of readdirSync(o).sort()) { const p = join(o, n); if (statSync(p).isDirectory()) { if (p !== ohne) geh(p); } else if (n.endsWith('.mjs')) aus.push(p); } }; geh(ordner);
  return aus;
}
const KERN = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, ''), HIER = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, '');

/** Sammelt die Textpaare eines Ordners (Vorgabe: der Kern). Zurück:
 *  { paare: { de: en }, wo: { de: ['datei:zeile', …] }, doppelt: [{ de, en: [verschiedene] }], unlesbar: ['datei:zeile …'],
 *    ungeklaert: ['datei: NAME'], eigene: ['datei: NAME (n Einträge)'], dateien: Zahl } */
export function sammle(ordner = KERN, { ohne = HIER, aussen = AUSSEN, keinPaar = KEIN_PAAR } = {}) {
  const ds = dateienIn(ordner, ohne).map((p) => einlesen(p, relative(ordner, p).split(sep).join('/')));
  const funde = new Map(), unlesbar = [], gelesen = new Set(), eigene = new Map();   /* funde: de → { en: [in der Reihenfolge des Fundes], orte: [[Datei-Nr., Zeile, 'datei:zeile']] } */
  const nimm = (d, de, en, zeile, liste = null) => {   /* liste: Stelle der Liste [de, en], damit der Wächter unten sie als gelesen kennt */
    if (liste != null) gelesen.add(d.kurz + '#' + liste);
    if (typeof de !== 'string' || !de) return;
    const f = funde.get(de) || { en: [], orte: [] }; funde.set(de, f);
    if (en != null && !f.en.includes(en)) f.en.push(en);
    if (!f.orte.some((o) => o[2] === d.kurz + ':' + zeile)) f.orte.push([ds.indexOf(d), zeile, d.kurz + ':' + zeile]);
  };
  /* Alle Listen in einem Bereich, die an den Stellen i und j einen Text tragen. `feld`: nur Listen hinter diesem Feldnamen. */
  const listenIn = (d, [a, b], i, j, feld = null) => {
    const aus = [];
    for (let k = a; k < b; k++) {
      if (!ist(d.tok[k], '[')) continue;
      if (feld && !(ist(d.tok[k - 1], ':') && d.tok[k - 2] && d.tok[k - 2].v === feld)) continue;
      const s = stuecke(d, k), de = s[i] && einText(d, s[i]), en = s[j] && einText(d, s[j]);
      if (de != null && en != null && (i || j !== 1 || s.length === 2)) aus.push([de, en, d.tok[k].zeile, k]);   /* ein Paar [de, en] hat genau zwei Einträge */
    }
    return aus;
  };
  const tabelle = (d, name, i, j) => { const c = d.konst.get(name); if (!c || !c.liste) return 0; const l = listenIn(d, [c.von, c.bis], i, j); l.forEach((x) => nimm(d, ...x)); return l.length; };
  /* Der Tabellen-Name hinter einem Ausdruck: die oberste const selbst, oder über einen örtlichen Namen (const A = ANBIETER[a]). */
  const wurzel = (d, name, vor) => {
    if (d.konst.has(name) && d.konst.get(name).liste) return name;
    for (let k = vor; k > 0; k--) if (d.tok[k].t === 'id' && d.tok[k].v === name && ist(d.tok[k + 1], '=') && !ist(d.tok[k - 1], '.')) { const n = d.tok[k + 2]; return n && n.t === 'id' && d.konst.has(n.v) && d.konst.get(n.v).liste ? n.v : null; }
    return null;
  };
  /* Rückwärts über eine Kette X.filter(…).map( bis zum ersten Namen: von dort stammen die Elemente einer Rückruf-Funktion. */
  const kettenAnfang = (d, k) => {
    for (;;) { if (ist(d.tok[k], ')') || ist(d.tok[k], ']')) { k = d.p[k] - 1; continue; } if (d.tok[k] && d.tok[k].t === 'id') { if (ist(d.tok[k - 1], '.') || ist(d.tok[k - 1], '?.')) { k -= 2; continue; } return d.tok[k].v; } return null; }
  };
  const heim = (d, k) => ([...d.konst].find(([, c]) => c.von <= k && k < c.bis) || [])[0] || null;   /* die oberste const, in der eine Stelle steht */
  const innen = (d, k) => d.funktionen.filter((f) => f.rumpf[0] <= k && k <= f.rumpf[1]).sort((x, y) => y.rumpf[0] - x.rumpf[0]);

  for (const d of ds) {
    const huellen = new Map(d.text ? [[d.text, [1, 2]]] : []), offen = [...huellen.keys()], fertig = new Set();
    while (offen.length) {
      const fn = offen.pop(), [pd, pe] = huellen.get(fn); if (fertig.has(fn)) continue; fertig.add(fn);
      for (let k = 0; k < d.tok.length; k++) {
        const t = d.tok[k];
        if (!(t.t === 'id' && t.v === fn && ist(d.tok[k + 1], '(')) || ist(d.tok[k - 1], '.') || ist(d.tok[k - 1], '?.') || (d.tok[k - 1] && d.tok[k - 1].v === 'function')) continue;
        const arg = stuecke(d, k + 1), A = arg[pd], B = arg[pe], stelle = `${d.kurz}:${t.zeile} ${fn}(…)`;
        if (!A) continue;                                                     /* kein Aufruf mit Text (ein anderes text() mit einem Argument) */
        const de = einText(d, A), en = B ? einText(d, B) : null;
        if (de != null && (en != null || !B)) { nimm(d, de, en, t.zeile); continue; }   /* Form 1 */
        if (!B) { unlesbar.push(stelle); continue; }
        const na = einName(d, A), nb = einName(d, B);
        if (na && nb) {
          const f = innen(d, k).find((x) => x.params.some((q) => q.name === na || (q.muster && q.muster.includes(na))));
          if (f && f.name && f.params.some((q) => q.name === na) && f.params.some((q) => q.name === nb)) {   /* Form 2: Hülle */
            if (!huellen.has(f.name)) { huellen.set(f.name, [f.params.findIndex((q) => q.name === na), f.params.findIndex((q) => q.name === nb)]); offen.push(f.name); }
            continue;
          }
          const m = f && f.params.find((q) => q.muster && q.muster.includes(na) && q.muster.includes(nb));
          if (m) {   /* Form 3: ([…, de, en]) => … als Rückruf an einer Tabelle */
            const w = ist(d.tok[f.kopf - 1], '(') ? kettenAnfang(d, f.kopf - 2) : null, name = w && wurzel(d, w, f.kopf);
            if (name && tabelle(d, name, m.muster.indexOf(na), m.muster.indexOf(nb))) continue;
            unlesbar.push(stelle); continue;
          }
          let gefunden = false;   /* Form 3: const [de, en] = TABELLE[…] */
          for (let q = k; q > 0 && !gefunden; q--) {
            if (!(ist(d.tok[q], ']') && ist(d.tok[q + 1], '='))) continue;
            const namen = stuecke(d, d.p[q]).map((s) => einName(d, s)); if (!namen.includes(na) || !namen.includes(nb)) continue;
            const w = d.tok[q + 2], name = w && w.t === 'id' ? wurzel(d, w.v, d.p[q]) : null;
            gefunden = !!(name && tabelle(d, name, namen.indexOf(na), namen.indexOf(nb))); break;
          }
          if (!gefunden) unlesbar.push(stelle);
          continue;
        }
        const zahlHinten = ([a, b]) => (b - a >= 4 && ist(d.tok[b - 1], ']') && d.tok[b - 2].t === 'num' && ist(d.tok[b - 3], '[') ? +d.tok[b - 2].v : null), ia = zahlHinten(A), ib = zahlHinten(B);
        if (ia != null && ib != null && gleich(d, [A[0], A[1] - 3], [B[0], B[1] - 3])) {   /* Form 3: X[i], X[j] */
          const erst = d.tok[A[0]], name = erst.t === 'id' ? wurzel(d, erst.v, k) : null;
          if (name && tabelle(d, name, ia, ib)) continue;
          const feld = ist(d.tok[A[1] - 5], '.') && d.tok[A[1] - 4].t === 'id' ? d.tok[A[1] - 4].v : null;   /* s.name[0]: das Feld „name“, wo immer es steht */
          let n = 0; if (feld) for (const e of ds) { const l = listenIn(e, [0, e.tok.length], ia, ib, feld); l.forEach((x) => nimm(e, ...x)); n += l.length; }
          if (!n) unlesbar.push(stelle);
          continue;
        }
        const feldEnde = ([a, b], f) => b - a >= 3 && ist(d.tok[b - 2], '.') && d.tok[b - 1].v === f;
        if (feldEnde(A, 'de') && feldEnde(B, 'en') && gleich(d, [A[0], A[1] - 1], [B[0], B[1] - 1])) continue;   /* Form 5: x.de, x.en – die Felder liest der Durchgang unten */
        const na0 = d.tok[A[0]], nb0 = d.tok[B[0]];
        if (na0.t === 'id' && nb0.t === 'id' && na0.v !== nb0.v && ist(d.tok[A[0] + 1], '[') && d.p[A[0] + 1] === A[1] - 1 && gleich(d, [A[0] + 1, A[1]], [B[0] + 1, B[1]])) {   /* Form 4: zwei Tabellen */
          const ca = d.konst.get(na0.v), cb = d.konst.get(nb0.v), felder = (c) => { const m = new Map(); if (c && c.liste && ist(d.tok[c.von], '{')) for (const [a, b] of stuecke(d, c.von)) if (b - a === 3 && ist(d.tok[a + 1], ':') && d.tok[a + 2].t === 'str') m.set(d.tok[a].v, d.tok[a + 2]); return m; };
          const fa = felder(ca), fb = felder(cb); let n = 0;
          for (const [kennung, x] of fa) if (fb.has(kennung)) { nimm(d, x.v, fb.get(kennung).v, x.zeile); n++; }
          if (n) continue;
        }
        unlesbar.push(stelle);
      }
    }
    /* Form 5: jedes { de: '…', en: '…' }. Mit weiteren Sprachfeldern bringt der Eintrag seine Sprachen selbst mit. */
    for (let k = 0; k < d.tok.length; k++) {
      if (!ist(d.tok[k], '{')) continue;
      const feld = {}; for (const [a, b] of stuecke(d, k)) if (b - a === 3 && ist(d.tok[a + 1], ':') && d.tok[a + 2].t === 'str' && ALLE_FELDER.includes(d.tok[a].v)) feld[d.tok[a].v] = d.tok[a + 2].v;
      if (feld.de == null || feld.en == null) continue;
      const name = d.kurz + ': ' + (heim(d, k) || 'Zeile ' + d.tok[k].zeile);
      if ((keinPaar[d.kurz] || []).includes(heim(d, k))) continue;
      if (SPRACHEN.some((s) => s in feld)) eigene.set(name, (eigene.get(name) || 0) + 1); else nimm(d, feld.de, feld.en, d.tok[k].zeile);
    }
    for (const name of aussen[d.kurz] || []) if (d.konst.has(name) && !tabelle(d, name, 0, 1)) unlesbar.push(`${d.kurz}: ${name} (in AUSSEN genannt, aber kein Paar gefunden)`);   /* Form 6 */
  }
  /* Wächter: eine Liste aus genau zwei Texten in einer obersten const, die keine Form gelesen hat. */
  const ungeklaert = [];
  for (const d of ds) {
    const aus = keinPaar[d.kurz] || [];
    for (const [name, c] of d.konst) {
      if (!c.liste || eigene.has(d.kurz + ': ' + name) || aus.includes(name)) continue;
      for (let k = c.von; k < c.bis; k++) {
        if (!ist(d.tok[k], '[') || gelesen.has(d.kurz + '#' + k)) continue;
        const s = stuecke(d, k), feld = ist(d.tok[k - 1], ':') ? d.tok[k - 2].v : '';
        if (s.length === 2 && s.every((x) => /\p{L}{2}/u.test(einText(d, x) ?? '')) && !aus.includes(name + '.' + feld)) ungeklaert.push(`${d.kurz}:${d.tok[k].zeile} ${name}${feld ? '.' + feld : ''} [„${einText(d, s[0])}“, „${einText(d, s[1])}“]`);
      }
    }
  }
  /* Eine Liste, die etwas nennt, das es nicht mehr gibt, ist selbst ein Fehler (sonst bleibt ein toter Eintrag stehen). */
  for (const [liste, wie] of [[aussen, 'AUSSEN'], [keinPaar, 'KEIN_PAAR']]) for (const [datei, namen] of Object.entries(liste)) {
    const d = ds.find((x) => x.kurz === datei);
    for (const n of namen) if (!d || !d.konst.has(n.split('.')[0])) unlesbar.push(`${datei}: ${n} (in ${wie} genannt, gibt es aber nicht)`);
  }
  /* Reihenfolge: nach Datei und Zeile der ersten Fundstelle – so stehen die Tabellen wie der Kern. Gilt für einen Schlüssel
     verschiedenes Englisch (Groß/klein), zählt das der ersten Stelle; `doppelt` nennt diese Schlüssel. */
  const paare = {}, wo = {}, vorn = (f) => f.orte.reduce((a, o) => (o[0] < a[0] || (o[0] === a[0] && o[1] < a[1]) ? o : a));
  for (const f of funde.values()) f.orte.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [de, f] of [...funde].sort((a, b) => vorn(a[1])[0] - vorn(b[1])[0] || vorn(a[1])[1] - vorn(b[1])[1])) { paare[de] = f.en.length ? f.en[0] : null; wo[de] = f.orte.map((o) => o[2]); }
  const doppelt = [...funde].filter(([, f]) => f.en.length > 1).map(([de, f]) => ({ de, en: f.en }));
  return { paare, wo, doppelt, unlesbar, ungeklaert, eigene: [...eigene].map(([n, z]) => `${n} (${z})`), dateien: ds.length };
}

const platzhalter = (t) => (String(t).match(/\{\d\}/g) || []).sort().join('');
/** Lädt die sechs Tabellen und vergleicht sie mit den Schlüsseln. Zurück: { ok, schluessel, sprachen: { code: { fehlt, zuviel, leer, platzhalter } }, … wie sammle() } */
export async function pruefe(ordner = KERN, tabellen = HIER) {
  const s = sammle(ordner, { ohne: tabellen }), namen = Object.keys(s.paare), sprachen = {};
  for (const code of SPRACHEN) {
    let t = null, grund = ''; try { t = (await import(pathToFileURL(join(tabellen, code + '.mjs')).href)).default; } catch (f) { grund = (f && f.message) || String(f); }
    if (!t || typeof t !== 'object') { sprachen[code] = { fehlt: namen, zuviel: [], leer: [], platzhalter: [], laedtNicht: grund || 'kein export default' }; continue; }
    sprachen[code] = { fehlt: namen.filter((k) => !Object.prototype.hasOwnProperty.call(t, k)), zuviel: Object.keys(t).filter((k) => !(k in s.paare)),
      leer: namen.filter((k) => k in t && !(typeof t[k] === 'string' && t[k].trim())), platzhalter: namen.filter((k) => typeof t[k] === 'string' && platzhalter(t[k]) !== platzhalter(k)) };
  }
  const ok = !s.unlesbar.length && !s.ungeklaert.length && Object.values(sprachen).every((x) => !x.laedtNicht && !x.fehlt.length && !x.zuviel.length && !x.leer.length && !x.platzhalter.length);
  return { ok, schluessel: namen.length, sprachen, ...s };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv.slice(2), sag = (t) => process.stdout.write(t + '\n');
  if (arg.includes('--pruefe')) {
    const r = await pruefe(), kurz = (k) => `„${k}“` + (r.wo[k] ? ' (' + r.wo[k][0] + ')' : '');
    sag(`${r.schluessel} Schlüssel aus ${r.dateien} Dateien`);
    for (const [code, x] of Object.entries(r.sprachen)) {
      sag(`${code}: ` + (x.laedtNicht ? 'Tabelle lädt nicht – ' + x.laedtNicht : [x.fehlt.length ? x.fehlt.length + ' fehlen' : '', x.zuviel.length ? x.zuviel.length + ' überzählig' : '', x.leer.length ? x.leer.length + ' leer' : '', x.platzhalter.length ? x.platzhalter.length + ' mit anderen Platzhaltern' : ''].filter(Boolean).join(', ') || 'vollständig'));
      if (x.laedtNicht) continue;
      for (const k of x.fehlt) sag('  fehlt: ' + kurz(k) + ' → “' + r.paare[k] + '”'); for (const k of x.zuviel) sag('  überzählig: ' + kurz(k)); for (const k of x.leer) sag('  leer: ' + kurz(k)); for (const k of x.platzhalter) sag('  Platzhalter: ' + kurz(k));
    }
    for (const u of r.unlesbar) sag('nicht lesbar: ' + u);
    for (const u of r.ungeklaert) sag('ungeklärt (Textpaar → AUSSEN, sonst → KEIN_PAAR): ' + u);
    for (const x of r.doppelt) sag(`ein Schlüssel, verschiedenes Englisch: „${x.de}“ → ${x.en.map((e) => `“${e}”`).join(' / ')}`);
    for (const e of r.eigene) sag('eigene Sprachfelder, nicht in den Tabellen: ' + e);
    process.exitCode = r.ok ? 0 : 1;
  } else if (arg.includes('--wo')) { const r = sammle(); for (const [de, orte] of Object.entries(r.wo)) sag(JSON.stringify(de) + '  ' + orte.join(' ')); }
  else sag(JSON.stringify(sammle().paare, null, 1));
}
