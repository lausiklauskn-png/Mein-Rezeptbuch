#!/usr/bin/env node
// Paket-Werkzeug · stellt für EINE Ausgabe und EIN Ziel alles zusammen, was die Hülle (Android: Capacitor, Windows: Electron) braucht.
// Gebaut wird hier nichts: kein Gradle, kein Installer, kein Netz. Dieselbe Datei liegt byte-gleich in Mein Rezeptbuch und Mein Mixarium;
// was die beiden Repos unterscheidet, steht in paket/ausgaben.json.
//
//   node paket/zusammenstellen.mjs --ausgabe rezeptbuch --ziel android
//   node paket/zusammenstellen.mjs --ausgabe mixarium-store --ziel windows --nach /tmp/probe --vendor ../Workflow-PDF/vendor
//   node paket/zusammenstellen.mjs --vendor-pin --vendor ../Workflow-PDF/vendor      (druckt vendor-pin.json neu, schreibt nichts)
//
// Ergebnis im Arbeitsordner (Vorgabe paket/aus/<ausgabe>-<ziel>/, steht in .gitignore):
//   www/                    der Web-Ordner: Startseite, neu/, kern/, assets/, eine ausgabe.json, die freigegebenen Beispiel-Pakete
//                           mit gekürztem Katalog, zwei sbkim-Bausteine, Zeichen, pdf.js und die Texterkennung, paket.json
//   android: capacitor.config.json, package.json, package-lock.json, assets/ (Zeichen für @capacitor/assets)
//   windows: haupt.cjs, pfad.cjs, paket-windows.json, builder.json, package.json, package-lock.json, zeichen/icon.png
//
// Das Werkzeug bricht ab (Rückgabewert 1), statt ein halbes oder falsches Paket zu hinterlassen, wenn
//   - die Prüfung des Küchen-Kerns (kern/ausgabe/ausgabe.mjs) etwas meldet: Paket nicht freigegeben, Alkohol in einer Ausgabe ohne
//     Alkohol oder für den Store, Prüfsumme falsch, Datei fehlt;
//   - das Ziel nicht in `ziele` steht oder die Lieferung für das Ziel nicht `im-paket` ist;
//   - kern/ nicht zu KERN.json passt, pdf.js oder die Texterkennung nicht zu paket/vendor-pin.json passen;
//   - die App die Ausgabe an anderer Stelle festlegt, als paket/ausgaben.json sagt (Weiche trifft nicht genau einmal);
//   - ein Verweis der App (../…) im Paket ins Leere ginge.
// Das Repo selbst wird nie verändert: geschrieben wird nur in den Arbeitsordner.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, lstatSync, readdirSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname, relative, sep, extname, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HIER = dirname(fileURLToPath(import.meta.url));
const ZIELE = ['android', 'windows'];
const MARKE = '.paket-arbeitsordner';
const BILD = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico']);
const ZEICHEN_DATEIEN = ['icon-only.png', 'icon-foreground.png', 'icon-background.png', 'splash.png', 'splash-dark.png'];

class Abbruch extends Error {}
const halt = (text) => { throw new Abbruch(text); };
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const lies = (p) => readFileSync(p);
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const px = (p) => p.split(sep).join('/');
const mb = (n) => (n / 1048576).toFixed(1).replace('.', ',') + ' MB';

function argumente(liste) {
  const o = {}, schalter = new Set(['mit-sw', 'vendor-pin', 'hilfe', 'leise']);
  for (let i = 0; i < liste.length; i++) {
    const a = liste[i]; if (!a.startsWith('--')) halt(`Unbekanntes Argument: ${a}`);
    const [k, w] = a.slice(2).split('=');
    if (schalter.has(k)) o[k] = true; else { const v = w ?? liste[++i]; if (v === undefined || v.startsWith('--')) halt(`--${k} braucht einen Wert`); o[k] = v; }
  }
  return o;
}
const HILFE = `Aufruf: node paket/zusammenstellen.mjs --ausgabe <name> --ziel android|windows [--nach <arbeitsordner>] [--vendor <ordner>]
  --ausgabe   eine Ausgabe aus paket/ausgaben.json
  --ziel      android (Capacitor) oder windows (Electron)
  --nach      Arbeitsordner; Vorgabe paket/aus/<ausgabe>-<ziel>/ (im Repo ist nur paket/aus/ erlaubt)
  --vendor    Ordner „vendor“ aus Workflow PDF (pdf.js, Texterkennung); sonst WFPDF_KLON oder ein Klon neben dem Repo
  --wurzel    Repo-Wurzel, aus der gelesen wird; Vorgabe: der Ordner über paket/
  --mit-sw    den Service Worker der Web-App mit ins Paket legen (Vorgabe: nicht, siehe docs/BAU_APK_WINDOWS.md)
  --vendor-pin  druckt die Prüfsummen der Vendor-Dateien (für paket/vendor-pin.json) und endet`;

/* ---------- Dateien einsammeln ---------- */
function laufe(ordner, basis = ordner, aus = []) {
  for (const n of readdirSync(ordner).sort()) {
    if (n.startsWith('.')) continue;
    const p = join(ordner, n), st = lstatSync(p);
    if (st.isSymbolicLink()) halt(`Verknüpfung im Quell-Ordner, wird nicht kopiert: ${p}`);
    if (st.isDirectory()) laufe(p, basis, aus); else if (st.isFile()) aus.push(px(relative(basis, p)));
  }
  return aus;
}
const nurNode = (text) => /\bfrom\s+['"]node:/.test(text);

/** Der Plan: Pfad im Web-Ordner → { bytes, woher }. Erst wenn alles geprüft ist, wird geschrieben. */
function planer() {
  const plan = new Map();
  return {
    plan,
    datei(nach, von, woher) { if (plan.has(nach)) halt(`Zwei Quellen für dieselbe Datei im Paket: ${nach}`); plan.set(nach, { bytes: lies(von), woher }); },
    inhalt(nach, text, woher) { if (plan.has(nach)) halt(`Zwei Quellen für dieselbe Datei im Paket: ${nach}`); plan.set(nach, { bytes: Buffer.from(text, 'utf8'), woher }); },
    hat(pfad) { if (plan.has(pfad)) return true; const o = pfad.endsWith('/') ? pfad : pfad + '/'; for (const k of plan.keys()) if (k.startsWith(o)) return true; return pfad === ''; },
  };
}

/* ---------- Vendor: pdf.js und Texterkennung ---------- */
function ocrSprachen(prueferText) {
  const m = prueferText.match(/OCR_SPRACHEN\s*=\s*\[([^\]]*)\]/); if (!m) halt('OCR_SPRACHEN steht nicht mehr in assets/pruefer-anhang.js – welche Sprachdaten braucht die Texterkennung?');
  const s = [...m[1].matchAll(/["']([a-z_]{3,12})["']/g)].map((x) => x[1]); if (!s.length) halt('OCR_SPRACHEN ist leer oder nicht lesbar');
  return s;
}
const vendorListe = (sprachen) => ['pdfjs/pdf.min.js', 'pdfjs/pdf.worker.min.js', 'tesseract/tesseract.min.js', 'tesseract/worker.min.js',
  'tesseract/tesseract-core-lstm.wasm.js', 'tesseract/tesseract-core-simd-lstm.wasm.js', 'tesseract/tesseract-core-relaxedsimd-lstm.wasm.js',
  'tesseract/LICENSE-Apache-2.0.txt', 'tesseract/tesseract.min.js.LICENSE.txt', 'tesseract/worker.min.js.LICENSE.txt',
  ...sprachen.map((s) => `tesseract/lang/${s}.traineddata`)];
function vendorFinden(wunsch, wurzel) {
  const k = [wunsch, process.env.WFPDF_KLON && join(process.env.WFPDF_KLON, 'vendor'), join(wurzel, '..', 'Workflow-PDF', 'vendor'), join(wurzel, '..', 'workflow-pdf', 'vendor'), join(wurzel, '..', 'lausiklauskn-png', 'workflow-pdf', 'vendor')].filter(Boolean).map((p) => resolve(p));
  const da = k.find((p) => existsSync(join(p, 'pdfjs', 'pdf.min.js')));
  if (!da) halt(`pdf.js und die Texterkennung fehlen. Gesucht in: ${k.join(' · ')}. Mit --vendor <ordner> den Ordner „vendor“ aus Workflow PDF nennen.`);
  return da;
}
function vendorPin(ordner, sprachen) {
  const dateien = {};
  for (const d of vendorListe(sprachen)) { const p = join(ordner, d); if (!existsSync(p)) halt(`Vendor-Datei fehlt: ${d} (in ${ordner})`); const b = lies(p); dateien[d] = { bytes: b.length, sha256: sha(b) }; }
  return { hinweis: 'Prüfsummen von pdf.js und der Texterkennung (Tesseract) aus Workflow PDF, Ordner vendor/. Neu schreiben: node paket/zusammenstellen.mjs --vendor-pin --vendor <ordner> > paket/vendor-pin.json', sprachen, dateien };
}

/* ---------- Verweise der App prüfen ---------- */
const VERWEIS = /(['"`(=])(\.\.?\/[^'"`()\s?#$<>{},;]*)/g;
function verweise(text) { const aus = new Set(); for (const m of text.matchAll(VERWEIS)) aus.add(m[2]); return [...aus]; }
function zielVon(datei, verweis) {
  const z = posix.normalize(posix.join(posix.dirname(datei), verweis)).replace(/\/$/, '');
  return z === '.' ? '' : z;
}

/* ---------- Arbeitsordner ---------- */
function arbeitsordner(wunsch, name, ziel, wurzel) {
  const nach = resolve(wunsch || join(HIER, 'aus', `${name}-${ziel}`)), aus = resolve(HIER, 'aus');
  const drin = (innen, aussen) => innen === aussen || innen.startsWith(aussen + sep);
  if (drin(wurzel, nach) || drin(HIER, nach)) halt(`Der Arbeitsordner darf das Repo nicht enthalten: ${nach}`);
  if (drin(nach, wurzel) && !(drin(nach, aus) && nach !== aus)) halt(`Im Repo wird nur unter paket/aus/ geschrieben, nicht nach ${nach}`);
  if (existsSync(nach)) {
    if (!lstatSync(nach).isDirectory()) halt(`Der Arbeitsordner ist keine Mappe: ${nach}`);
    if (readdirSync(nach).length && !existsSync(join(nach, MARKE))) halt(`Der Ordner ${nach} ist nicht leer und stammt nicht von diesem Werkzeug (die Datei ${MARKE} fehlt). Es wird nichts überschrieben.`);
  }
  return nach;
}
const gitStand = (wurzel) => {
  try {
    const r = (a) => execFileSync('git', ['--no-optional-locks', '-C', wurzel, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();   // nur lesen, auch den Index nicht auffrischen
    return { commit: r(['rev-parse', 'HEAD']), geaendert: r(['status', '--porcelain', '--untracked-files=no']) !== '' };
  } catch { return { commit: null, geaendert: null }; }
};
const fuelle = (vorlage, werte) => JSON.parse(JSON.stringify(vorlage).replace(/\{(\w+)\}/g, (g, k) => (k in werte ? String(werte[k]).replace(/[\\"]/g, '\\$&') : g)));

async function haupt() {
  const o = argumente(process.argv.slice(2));
  if (o.hilfe) { console.log(HILFE); return; }
  const WURZEL = resolve(o.wurzel || join(HIER, '..'));
  const sag = (...t) => { if (!o.leise) console.log(...t); };
  if (!existsSync(join(WURZEL, 'kern', 'ausgabe', 'ausgabe.mjs'))) halt(`Hier liegt kein Küchen-Kern: ${WURZEL} (kern/ausgabe/ausgabe.mjs fehlt)`);
  const prueferPfad = join(WURZEL, 'assets', 'pruefer-anhang.js');
  if (!existsSync(prueferPfad)) halt('assets/pruefer-anhang.js fehlt');
  const sprachen = ocrSprachen(readFileSync(prueferPfad, 'utf8'));

  if (o['vendor-pin']) { console.log(JSON.stringify(vendorPin(vendorFinden(o.vendor, WURZEL), sprachen), null, 1)); return; }

  const EIN = json(o.einstellung || join(HIER, 'ausgaben.json'));
  const name = o.ausgabe, ziel = o.ziel;
  if (!name || !ziel) halt(HILFE);
  if (!ZIELE.includes(ziel)) halt(`Ziel unbekannt: ${ziel} (möglich: ${ZIELE.join(', ')})`);
  const E = EIN.ausgaben?.[name];
  if (!E) halt(`Die Ausgabe „${name}“ steht nicht in paket/ausgaben.json dieses Repos (hier: ${Object.keys(EIN.ausgaben || {}).join(', ')})`);
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(E.appId || '')) halt(`App-Kennung ungültig: ${E.appId} (klein, Punkte, je Teil mit einem Buchstaben beginnend, kein Bindestrich)`);

  /* 1 · Ausgabe und Beispiele: die Prüfung des Küchen-Kerns entscheidet */
  const K = await import(pathToFileURL(join(WURZEL, 'kern', 'ausgabe', 'ausgabe.mjs')).href);
  for (const f of ['lesen', 'pruefen', 'beispieleFuer', 'istAlkoholischesGetraenk']) if (typeof K[f] !== 'function') halt(`kern/ausgabe/ausgabe.mjs kennt ${f}() nicht mehr`);
  const ausgabePfad = join(WURZEL, 'ausgaben', name, 'ausgabe.json');
  if (!existsSync(ausgabePfad)) halt(`ausgaben/${name}/ausgabe.json fehlt`);
  const ausgabe = K.lesen(ausgabePfad), katalog = K.lesen(join(WURZEL, 'beispiele', 'KATALOG.json')), beispielOrdner = join(WURZEL, 'beispiele');
  if (ausgabe.name !== name) halt(`ausgaben/${name}/ausgabe.json nennt sich „${ausgabe.name}“`);
  const fehler = K.pruefen(ausgabe, katalog, beispielOrdner);
  if (fehler.length) halt(`Die Ausgabe ${name} besteht die Prüfung des Küchen-Kerns nicht:\n` + fehler.map((x) => '    · ' + x).join('\n'));
  if (!ausgabe.ziele.includes(ziel)) halt(`Die Ausgabe ${name} ist nicht für ${ziel} vorgesehen (ziele: ${ausgabe.ziele.join(', ')})`);
  if (ausgabe.lieferung[ziel] !== 'im-paket') halt(`Lieferung für ${ziel} ist „${ausgabe.lieferung[ziel]}“. Ein Paket hat keinen Server daneben: nur „im-paket“ geht.`);
  const { imPaket } = K.beispieleFuer(ausgabe, katalog, ziel);
  for (const p of imPaket) {   // zweiter Riegel, unabhängig von pruefen()
    if (p.alkohol && (ausgabe.store || !ausgabe.alkoholErlaubt)) halt(`Paket ${p.id} enthält Alkohol und darf nicht in ${name}`);
    if (p.fuer && !p.fuer.includes(name)) halt(`Paket ${p.id} ist nicht für ${name} freigegeben`);
    if (posix.basename(p.datei) !== p.datei) halt(`Paket ${p.id}: Dateiname mit Pfad (${p.datei})`);
  }

  /* 2 · Kern gegen den Pin */
  const pin = json(join(WURZEL, 'KERN.json')), kernDa = laufe(join(WURZEL, 'kern')).map((d) => 'kern/' + d), kernSoll = Object.keys(pin.dateien || {});
  const kernFalsch = [...kernDa.filter((d) => pin.dateien[d] !== sha(lies(join(WURZEL, d)))), ...kernSoll.filter((d) => !kernDa.includes(d)).map((d) => d + ' (fehlt)')];
  if (kernFalsch.length) halt(`kern/ passt nicht zu KERN.json (Fassung ${pin.fassung}): ${kernFalsch.join(', ')}. Erst den Kern-Stand in Ordnung bringen, dann packen.`);

  /* 3 · Plan: was ins Paket kommt */
  const P = planer(), nichtKopiert = [];
  const sw = EIN.dienstarbeiter || null;
  for (const e of EIN.inhalt || []) {
    if (e.datei) { if (!existsSync(join(WURZEL, e.datei))) halt(`Datei fehlt: ${e.datei}`); P.datei(e.datei, join(WURZEL, e.datei), 'repo'); continue; }
    const ordner = join(WURZEL, e.ordner); if (!existsSync(ordner)) halt(`Ordner fehlt: ${e.ordner}/`);
    for (const d of laufe(ordner)) {
      const rel = e.ordner + '/' + d;
      if ((e.ohne || []).includes(d)) continue;
      if (e.nur && !e.nur.includes(extname(d).toLowerCase())) continue;
      if (rel === sw && !o['mit-sw']) continue;
      if (extname(d) === '.mjs' && nurNode(readFileSync(join(ordner, d), 'utf8'))) { nichtKopiert.push(rel); continue; }   // Werkzeug für Node, kein Teil der App
      P.datei(rel, join(ordner, d), 'repo');
    }
  }
  P.datei(`ausgaben/${name}/ausgabe.json`, ausgabePfad, 'repo');
  P.inhalt('beispiele/KATALOG.json', JSON.stringify({ ...katalog, pakete: imPaket }, null, 1) + '\n', 'erzeugt');
  for (const p of imPaket) P.datei('beispiele/' + p.datei, join(beispielOrdner, p.datei), 'repo');

  /* 4 · Weiche: die App legt ihre Ausgabe heute fest im Code fest. Im Paket muss dort genau diese Ausgabe stehen. */
  const W = EIN.weiche; let weiche = null;
  if (W) {
    const e = P.plan.get(W.datei); if (!e) halt(`Weiche: ${W.datei} ist nicht im Paket`);
    const text = e.bytes.toString('utf8'), fest = W.muster.replace('{ausgabe}', W.fest), soll = W.muster.replace('{ausgabe}', name), n = text.split(fest).length - 1;
    if (n !== 1) halt(`Weiche trifft ${n}-mal statt einmal: „${fest}“ in ${W.datei}. Die App legt ihre Ausgabe anders fest als paket/ausgaben.json sagt – dort nachziehen.`);
    if (soll !== fest) e.bytes = Buffer.from(text.replace(fest, soll), 'utf8');
    const danach = e.bytes.toString('utf8');
    for (const fremd of Object.keys(EIN.ausgaben).filter((a) => a !== name)) if (danach.includes(W.muster.replace('{ausgabe}', fremd))) halt(`Weiche: ${W.datei} nennt noch die Ausgabe ${fremd}`);
    if (danach.split(soll).length - 1 !== 1) halt(`Weiche: „${soll}“ steht nicht genau einmal in ${W.datei}`);
    weiche = { datei: W.datei, von: W.fest, nach: name, geaendert: soll !== fest };
  }

  /* 5 · pdf.js und Texterkennung, an der Adresse, unter der der Kern sie sucht */
  const reinigung = P.plan.get('kern/ki/reinigung.mjs'); if (!reinigung) halt('kern/ki/reinigung.mjs ist nicht im Paket');
  const ort = reinigung.bytes.toString('utf8').match(/vendor:\s*'(\/[^']+\/)'/); if (!ort) halt('kern/ki/reinigung.mjs nennt keinen Ort mehr für vendor (erwartet: vendor: \'/…/\')');
  const vendorNach = ort[1].replace(/^\/|\/$/g, ''), vendorVon = vendorFinden(o.vendor, WURZEL);
  const pinV = json(join(HIER, 'vendor-pin.json')), ist = vendorPin(vendorVon, sprachen), sollListe = vendorListe(sprachen);
  const pinFehlt = sollListe.filter((d) => !pinV.dateien?.[d]), pinZuviel = Object.keys(pinV.dateien || {}).filter((d) => !sollListe.includes(d));
  if (pinFehlt.length || pinZuviel.length) halt(`paket/vendor-pin.json passt nicht zur Liste (Sprachen der Texterkennung: ${sprachen.join(', ')}). Fehlt: ${pinFehlt.join(', ') || '–'} · zu viel: ${pinZuviel.join(', ') || '–'}`);
  const vFalsch = sollListe.filter((d) => ist.dateien[d].sha256 !== pinV.dateien[d].sha256);
  if (vFalsch.length) halt(`pdf.js/Texterkennung in ${vendorVon} weichen von paket/vendor-pin.json ab: ${vFalsch.join(', ')}. Ist das gewollt, den Pin neu schreiben (--vendor-pin).`);
  for (const d of sollListe) P.datei(`${vendorNach}/${d}`, join(vendorVon, d), 'vendor');

  /* 6 · Verweise der App: Zeichen nachziehen, nichts darf ins Leere gehen */
  const ohneZiel = EIN.verweiseOhneZiel || {}, leer = [], zeichenApp = [], SEITE = 'neu/index.html';
  for (const [datei, e] of [...P.plan]) {
    if (e.woher !== 'repo' || !['.html', '.mjs', '.css', '.webmanifest'].includes(extname(datei)) || datei.startsWith('sbkim/')) continue;
    for (const v of verweise(e.bytes.toString('utf8'))) {
      const z = zielVon(datei, v), vonSeite = zielVon(SEITE, v);            // ein Baustein nennt Orte auch von der Seite aus (new URL(p, location.href))
      if (z.startsWith('..') && vonSeite.startsWith('..')) { leer.push(`${datei} → ${v} (zeigt aus dem Paket hinaus)`); continue; }
      if (z === 'index.html' || P.hat(z)) continue;                       // index.html an der Wurzel wird unten erzeugt
      if (!datei.startsWith('neu/') && P.hat(vonSeite)) continue;
      if (z === sw && !o['mit-sw']) continue;                             // der Service Worker bleibt mit Absicht draußen
      const quelle = join(WURZEL, z);
      if (BILD.has(extname(z).toLowerCase()) && existsSync(quelle) && lstatSync(quelle).isFile()) { P.datei(z, quelle, 'repo'); zeichenApp.push(z); continue; }
      if (ohneZiel[z]) continue;
      leer.push(`${datei} → ${v}`);
    }
  }
  if (leer.length) halt('Verweise der App gehen im Paket ins Leere:\n' + leer.map((x) => '    · ' + x).join('\n') + '\n  Entweder die Datei in paket/ausgaben.json unter „inhalt“ aufnehmen oder unter „verweiseOhneZiel“ mit Grund eintragen.');

  /* 7 · Startseite und Paketzettel */
  const neuApp = P.plan.get('neu/app.mjs'); if (!neuApp || !P.plan.has('neu/index.html')) halt('neu/index.html oder neu/app.mjs fehlt');
  const fassung = (neuApp.bytes.toString('utf8').match(/\bconst FASSUNG = '([^']+)'/) || [])[1]; if (!fassung) halt('neu/app.mjs nennt keine FASSUNG');
  const titel = String(E.appName).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  P.inhalt('index.html', `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>${titel}</title>
<link rel="icon" href="data:,">
<!-- Startseite des Pakets (erzeugt von paket/zusammenstellen.mjs). Die App liegt unter neu/, weil sie mit ../kern/… arbeitet. -->
<script>location.replace('neu/index.html');</script>
<meta http-equiv="refresh" content="1; url=neu/index.html">
</head>
<body><noscript><p><a href="neu/index.html">${titel} öffnen</a></p></noscript></body>
</html>
`, 'erzeugt');
  const zeichenOrdner = [join(HIER, 'zeichen', name), join(HIER, 'zeichen', 'platzhalter')].find((p) => ZEICHEN_DATEIEN.every((d) => existsSync(join(p, d))));
  if (!zeichenOrdner) halt(`Zeichen fehlen: weder paket/zeichen/${name}/ noch paket/zeichen/platzhalter/ hat alle fünf Dateien (${ZEICHEN_DATEIEN.join(', ')})`);
  const platzhalter = zeichenOrdner.endsWith(join('zeichen', 'platzhalter'));
  const dateien = {}; let bytes = 0;
  for (const [d, e] of [...P.plan].sort((a, b) => (a[0] < b[0] ? -1 : 1))) { dateien[d] = sha(e.bytes); bytes += e.bytes.length; }
  const zettel = {
    paket: 1, ausgabe: name, ziel, titel: E.appName, appId: E.appId, store: !!ausgabe.store, alkoholErlaubt: !!ausgabe.alkoholErlaubt, lieferung: ausgabe.lieferung[ziel],
    app: { fassung }, kern: { fassung: pin.fassung }, quelle: gitStand(WURZEL), beispiele: imPaket.map((p) => p.id),
    dienstarbeiter: !!(o['mit-sw'] && sw), weiche, zeichen: platzhalter ? 'platzhalter' : 'geliefert', vendor: vendorNach, ocrSprachen: sprachen, bytes, dateien,
  };
  P.inhalt('paket.json', JSON.stringify(zettel, null, 1) + '\n', 'erzeugt');

  /* 8 · Schreiben. Bis hierher ist nichts angefasst. */
  const NACH = arbeitsordner(o.nach, name, ziel, WURZEL), WWW = join(NACH, 'www');
  mkdirSync(NACH, { recursive: true }); writeFileSync(join(NACH, MARKE), 'Erzeugt von paket/zusammenstellen.mjs. Dieser Ordner wird bei jedem Lauf neu gefüllt; nichts von Hand hineinlegen.\n');
  rmSync(WWW, { recursive: true, force: true });
  for (const [d, e] of P.plan) { const z = join(WWW, ...d.split('/')); mkdirSync(dirname(z), { recursive: true }); writeFileSync(z, e.bytes); }
  const da = laufe(WWW);   // Gegenkontrolle auf der Platte: genau der Plan, und unter beispiele/ nur das Freigegebene
  if (da.length !== P.plan.size || da.some((d) => !P.plan.has(d))) halt('Der Web-Ordner entspricht nicht dem Plan (fremde oder fehlende Dateien)');
  const erlaubt = new Set(['KATALOG.json', ...imPaket.map((p) => p.datei)]);
  for (const d of readdirSync(join(WWW, 'beispiele'))) if (!erlaubt.has(d)) halt(`Fremde Datei unter beispiele/: ${d}`);
  if (ausgabe.store || !ausgabe.alkoholErlaubt) for (const p of imPaket.filter((x) => x.art === 'rezepte')) {
    const alk = (json(join(WWW, 'beispiele', p.datei)).recipes || []).filter((r) => r.alcohol || K.istAlkoholischesGetraenk(r));
    if (alk.length) halt(`Alkohol im Paket ${p.id} für ${name}: ${alk.map((r) => r.name).join(', ')}`);
  }

  /* 9 · Einstellungen der Hülle */
  const werte = { appId: E.appId, appName: E.appName, name, version: fassung, grund: E.grund || '#2a1a10' };
  const kopie = (von, nach) => { mkdirSync(dirname(join(NACH, nach)), { recursive: true }); copyFileSync(join(HIER, von), join(NACH, nach)); };
  if (ziel === 'android') {
    writeFileSync(join(NACH, 'capacitor.config.json'), JSON.stringify(fuelle(json(join(HIER, 'android', 'capacitor.vorlage.json')), werte), null, 2) + '\n');
    kopie('android/package.json', 'package.json'); kopie('android/package-lock.json', 'package-lock.json');
    rmSync(join(NACH, 'assets'), { recursive: true, force: true }); mkdirSync(join(NACH, 'assets'));
    for (const d of ZEICHEN_DATEIEN) copyFileSync(join(zeichenOrdner, d), join(NACH, 'assets', d));
  } else {
    for (const d of ['haupt.cjs', 'pfad.cjs', 'package.json', 'package-lock.json']) kopie('windows/' + d, d);
    writeFileSync(join(NACH, 'builder.json'), JSON.stringify(fuelle(json(join(HIER, 'windows', 'builder.vorlage.json')), werte), null, 2) + '\n');
    writeFileSync(join(NACH, 'paket-windows.json'), JSON.stringify({ ausgabe: name, titel: E.appName, appId: E.appId, datenOrdner: E.appId, grund: werte.grund }, null, 1) + '\n');
    mkdirSync(join(NACH, 'zeichen'), { recursive: true }); copyFileSync(join(zeichenOrdner, 'icon-only.png'), join(NACH, 'zeichen', 'icon.png'));
  }

  /* 10 · Bericht */
  const gruppe = (vor) => { let n = 0, b = 0; for (const [d, e] of P.plan) if (d.startsWith(vor)) { n++; b += e.bytes.length; } return `${String(n).padStart(3)} Dateien, ${mb(b).padStart(8)}`; };
  sag(`${E.appName} · Ausgabe ${name} · Ziel ${ziel} · App ${fassung} · Kern ${pin.fassung}${zettel.quelle.commit ? ' · Commit ' + zettel.quelle.commit.slice(0, 7) + (zettel.quelle.geaendert ? ' + ungespeicherte Änderungen' : '') : ''}`);
  for (const [vor, was] of [['neu/', 'App'], ['kern/', 'Küchen-Kern'], ['getraenke/', 'Getränke-Schicht'], ['assets/', 'Prüf-Bausteine'], ['sbkim/', 'Sprachmodell-Bausteine'], ['beispiele/', 'Beispiele'], [vendorNach + '/', 'pdf.js, Texterkennung']]) if ([...P.plan.keys()].some((d) => d.startsWith(vor))) sag(`  ${(vor).padEnd(22)} ${gruppe(vor)}  ${was}`);
  sag(`  Beispiele im Paket:    ${imPaket.map((p) => `${p.id}${p.alkohol ? ' (mit Alkohol)' : ''}`).join(', ') || 'keine'}`);
  if (zeichenApp.length) sag(`  Zeichen der App:       ${zeichenApp.join(', ')}`);
  if (weiche) sag(`  Weiche:                ${weiche.datei} ${weiche.geaendert ? `von „${weiche.von}“ auf „${weiche.nach}“ gestellt (nur in der Kopie)` : 'unverändert'}`);
  if (nichtKopiert.length) sag(`  Nicht im Paket (nur für Node): ${nichtKopiert.join(', ')}`);
  if (!zettel.dienstarbeiter && sw) sag(`  Nicht im Paket: ${sw} (im Paket liegt alles schon im Gerät)`);
  if (platzhalter) sag('  ⚠ PLATZHALTER-ZEICHEN: paket/zeichen/' + name + '/ fehlt noch.');
  sag(`✓ zusammengestellt: ${P.plan.size} Dateien, ${mb(bytes)} → ${NACH}`);
}

haupt().catch((f) => { if (f instanceof Abbruch) { console.error('✗ ' + f.message); process.exitCode = 1; } else { console.error('✗ Absturz: ' + (f && f.stack || f)); process.exitCode = 3; } });
