#!/usr/bin/env node
// Probe des Paket-Werkzeugs · gebaut wird nichts. Für jede Ausgabe beider Apps und beide Ziele (Android, Windows):
//   1. zusammenstellen (paket/zusammenstellen.mjs) in einen Wegwerf-Ordner; die Repos werden nur gelesen;
//   2. den Web-Ordner und die Einstellungen der Hülle auf der Platte prüfen;
//   3. den Web-Ordner so ausliefern, wie es die Hülle täte (Android: wie Capacitor, Windows: mit paket/windows/pfad.cjs), und im
//      echten Browser prüfen: Start OHNE Netz nach außen (jede fremde Anfrage wird gesperrt und gezählt), die richtige Ausgabe,
//      Beispiele aus dem Paket, pdf.js und die Texterkennung aus dem Paket.
// Dazu Gegenproben (das Werkzeug MUSS abbrechen) und – nur mit --electron – die Windows-Hülle selbst in Electron (unter dem
// Betriebssystem, auf dem die Probe läuft; das ist kein Bau und kein Windows-Lauf).
//
//   node paket/probe.mjs [--rezeptbuch <repo>] [--mixarium <repo>] [--vendor <Workflow-PDF/vendor>] [--electron <ordner mit dist/electron>]
//                        [--nur <ausgabe>,<ausgabe>] [--behalten]
// Ohne Angaben: das eigene Repo ist der Ordner über paket/, das andere liegt daneben (Mein-Rezeptbuch, Mein-Mixarium).
// Schlusszeile: „N grün · M ROT“. Rückgabewert 1 bei ROT. Ein Absturz der Probe ist ROT, kein stiller Abbruch.
import { createRequire } from 'node:module';
import { spawnSync, spawn } from 'node:child_process';
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync, rmSync, readdirSync, statSync, cpSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, extname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const HIER = dirname(fileURLToPath(import.meta.url));
let gruen = 0, rot = 0; const nichtGemessen = [], roteZeilen = [];
const ok = (b, t, mehr = '') => { if (b) { gruen++; console.log('  ✓ ' + t); } else { rot++; const z = t + (mehr ? ' — ' + mehr : ''); roteZeilen.push(z); console.log('  ✗ ROT: ' + z); } return !!b; };
let aufraeumen = () => {};
const schluss = () => { try { aufraeumen(); } catch { /* nichts */ } for (const n of nichtGemessen) console.log('  · nicht gemessen: ' + n); if (roteZeilen.length) { console.log('\nRote Punkte:'); for (const z of roteZeilen) console.log('  ✗ ' + z); } console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0; };
const absturz = (f) => { rot++; roteZeilen.push('Absturz der Probe: ' + ((f && f.message) || f)); console.log('  ✗ ROT: Absturz der Probe: ' + ((f && f.stack) || f)); schluss(); setTimeout(() => process.exit(1), 200); };
process.on('unhandledRejection', absturz); process.on('uncaughtException', absturz);

const arg = (name) => { const i = process.argv.indexOf('--' + name); return i < 0 ? null : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const sha = (b) => createHash('sha256').update(b).digest('hex');
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const laufe = (o, basis = o, aus = []) => { for (const n of readdirSync(o).sort()) { const p = join(o, n); if (statSync(p).isDirectory()) laufe(p, basis, aus); else aus.push(relative(basis, p).split(sep).join('/')); } return aus; };

/* ---------- Wo liegt was ---------- */
const eigen = resolve(HIER, '..'), eigenIstMix = existsSync(join(eigen, 'getraenke', 'index.mjs'));
const neben = (name) => resolve(eigen, '..', name);
const REPO = {
  rezeptbuch: resolve(arg('rezeptbuch') || (eigenIstMix ? neben('Mein-Rezeptbuch') : eigen)),
  mixarium: resolve(arg('mixarium') || (eigenIstMix ? eigen : neben('Mein-Mixarium'))),
};
const WERKZEUG = { rezeptbuch: resolve(arg('werkzeug-rezeptbuch') || join(REPO.rezeptbuch, 'paket')), mixarium: resolve(arg('werkzeug-mixarium') || join(REPO.mixarium, 'paket')) };
const VENDOR = [arg('vendor'), process.env.WFPDF_KLON && join(process.env.WFPDF_KLON, 'vendor'), neben('Workflow-PDF/vendor'), neben('workflow-pdf/vendor'), neben('lausiklauskn-png/workflow-pdf/vendor')].filter((p) => typeof p === 'string').map((p) => resolve(p)).find((p) => existsSync(join(p, 'pdfjs', 'pdf.min.js'))) || '';
const ELECTRON = typeof arg('electron') === 'string' ? resolve(arg('electron')) : '';
const NUR = typeof arg('nur') === 'string' ? arg('nur').split(',') : null;
const TMP = mkdtempSync(join(tmpdir(), 'paket-probe-'));
const ZIELE = ['android', 'windows'];
const stelle = (app, ausgabe, ziel, nach, mehr = [], wurzel = REPO[app], werkzeug = WERKZEUG[app]) => {
  const r = spawnSync(process.execPath, [join(werkzeug, 'zusammenstellen.mjs'), '--ausgabe', ausgabe, '--ziel', ziel, '--wurzel', wurzel, '--nach', nach, '--vendor', VENDOR, '--leise', ...mehr], { encoding: 'utf8' });
  return { rc: r.status, text: (r.stdout || '') + (r.stderr || '') };
};

/* ---------- Ausliefern wie die Hülle ---------- */
const ART = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };
function server(www, ziel, pfadModul) {
  const gefragt = [];
  const srv = http.createServer((q, a) => {
    const p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
    let datei = null, kopf = null;
    if (ziel === 'windows') { const z = pfadModul.aufloesen(www, p); if (z.datei) { datei = z.datei; kopf = pfadModul.kopf(datei); } }
    else {   // wie Capacitor 8.6.2 (WebViewLocalServer.handleLocalRequest): „/“ und jede Adresse, deren letztes Stück keinen Punkt hat,
      // führen auf die Startseite an der Wurzel; alles andere ist die Datei oder 404. .mjs und .js gehen als JavaScript hinaus.
      const letztes = p.split('/').filter(Boolean).pop() || '', f = join(www, p);
      if (p === '/' || !letztes.includes('.')) datei = join(www, 'index.html');
      else if (!p.split('/').includes('..') && existsSync(f) && statSync(f).isFile()) datei = f;
      if (datei) kopf = { 'content-type': ART[extname(datei)] || 'application/octet-stream' };
    }
    gefragt.push({ pfad: p, status: datei ? 200 : 404 });
    if (!datei) { a.writeHead(404); a.end(); return; }
    a.writeHead(200, kopf); a.end(readFileSync(datei));
  });
  return new Promise((ja) => srv.listen(0, '127.0.0.1', () => ja({ url: `http://localhost:${srv.address().port}/`, gefragt, zu: () => new Promise((r) => { srv.closeAllConnections?.(); srv.close(r); }) })));
}

/* ---------- Was in der Seite geprüft wird (Browser und Electron gleich) ---------- */
const istFremd = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) && x.hostname !== 'localhost' && x.hostname !== '127.0.0.1'; } catch { return false; } };
async function seiteBeobachten(kontext, p) {
  const b = { fremd: [], fehler: [], fehlt: [] };
  await kontext.route((u) => istFremd(u.href), (r) => { b.fremd.push(r.request().url()); r.abort(); });
  p.on('pageerror', (e) => b.fehler.push('Fehler in der Seite: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') b.fehler.push('Konsole: ' + m.text() + ' @' + (m.location().url || '')); });
  p.on('response', (r) => { if (r.status() >= 400 && !istFremd(r.url())) b.fehlt.push(new URL(r.url()).pathname + ' → ' + r.status()); });
  return b;
}
async function inDerSeite(p, lage, b, vor) {
  const { ausgabe, katalog, art, zettel } = lage, erstes = katalog.pakete.find((x) => x.id === ausgabe.beispiele[0]);
  if (art === 'rezeptbuch') {
    await p.waitForSelector('.gruss', { timeout: 30000 });
    ok(true, vor + 'die App startet von der Startseite des Pakets aus');
    const gruss = (await p.locator('.gruss').innerText()).split('\n')[0].trim(), dbs = await p.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
    ok(gruss === ausgabe.begruessung.de && dbs.includes('KuechenKern-' + ausgabe.name) && dbs.filter((d) => d.startsWith('KuechenKern-')).length === 1, vor + `die Ausgabe „${ausgabe.name}“ ist am Werk (Begrüßung und Speicher)`, gruss + ' · ' + dbs.join(','));
    /* Die App beginnt mit Startrezepten (Klaus 23.11.: nicht leer anfangen); das Beispielbuch steht hinter dem Plus unter „Beispiele“. */
    await p.waitForSelector('.karte', { timeout: 30000 });
    ok(await p.locator('.karte').count() > 0, vor + 'die Startrezepte liegen im Paket: die App beginnt nicht leer');
    const imSpeicher = () => p.evaluate((name) => new Promise((ja, nein) => { const a = indexedDB.open('KuechenKern-' + name); a.onerror = () => nein(a.error); a.onsuccess = () => { try { const q = a.result.transaction('zustand').objectStore('zustand').get('alles'); q.onsuccess = () => { a.result.close(); ja(((q.result && q.result.zustand.rezepte) || []).filter((r) => r && r.name).length); }; q.onerror = () => nein(q.error); } catch (f) { nein(f); } }; }), ausgabe.name);
    await p.locator('[data-a=neu]:visible').first().click(); await p.click('[data-a=neu-tab][data-t=pakete]'); await p.click('[data-a=beispiel]');
    let n = await imSpeicher(); for (let i = 0; i < 300 && n < erstes.anzahl; i++) { await p.waitForTimeout(200); n = await imSpeicher(); }
    ok(n === erstes.anzahl, vor + `das Beispielbuch lädt aus dem Paket: ${erstes.anzahl} Rezepte im Speicher (die Startrezepte gehören dazu)`, String(n));
  } else {
    await p.waitForSelector('.mx', { timeout: 30000 });
    ok(true, vor + 'die App startet von der Startseite des Pakets aus');
    /* „Beispiele“ steht hinter dem Plus (Blatt „Neues Getränk“). */
    await p.locator('[data-a=neu]:visible').first().click(); await p.click('[data-a=beispiele]'); await p.waitForSelector('[data-paket], .leer', { timeout: 30000 });
    const angeboten = await p.locator('[data-paket]').evaluateAll((l) => l.map((x) => x.dataset.paket));
    ok(JSON.stringify(angeboten) === JSON.stringify(ausgabe.beispiele), vor + `die Ausgabe „${ausgabe.name}“ ist am Werk: angeboten wird genau [${ausgabe.beispiele.join(', ')}]`, angeboten.join(', '));
    if (!ausgabe.alkoholErlaubt) ok(!angeboten.some((id) => /alkohol-fuer|mit-alkohol/.test(id)) && !(await p.locator('#app').innerText()).includes('mit Alkohol'), vor + 'kein Paket mit Alkohol wird angeboten');
    await p.click(`[data-paket="${erstes.id}"]`); await p.waitForSelector('.karte', { timeout: 60000 });
    const n = await p.locator('.karte').count();
    ok(n === erstes.anzahl, vor + `das Startpaket lädt aus dem Paket: ${erstes.anzahl} Getränke`, String(n));
    if (ausgabe.alkoholErlaubt) {
      const mitAlk = katalog.pakete.find((x) => x.alkohol) || { datei: 'fehlt', anzahl: -1 };
      const da = await p.evaluate(async (d) => { const a = await fetch('../beispiele/' + d); if (!a.ok) return 0; return (JSON.parse(await a.text()).recipes || []).length; }, mitAlk.datei);
      ok(da === mitAlk.anzahl, vor + `das Paket mit Alkohol liegt im Paket und ist lesbar: ${mitAlk.anzahl} Getränke`, String(da));
    }
  }
  if (!ausgabe.alkoholErlaubt) {   // gefragt wird nach jedem Alkohol-Paket, das der Katalog im REPO kennt – der gekürzte Katalog im Paket nennt es ja gar nicht
    const st = await p.evaluate(async (ds) => Promise.all(ds.map(async (d) => (await fetch('../beispiele/' + d)).status)), lage.alkDateien);
    ok(lage.alkDateien.length > 0 && st.every((x) => x === 404), vor + `ein Paket mit Alkohol ist auch auf direkte Nachfrage nicht da (404): ${lage.alkDateien.join(', ')}`, st.join(','));
  }
  /* pdf.js und die Texterkennung: über den Kern, so wie die App sie lädt */
  const pdf = await p.evaluate(async (b64) => {
    try { const R = await import('../kern/ki/reinigung.mjs'), e = await R.pdfFuersNetz(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))); return { seiten: e.bilder.length, bild: String(e.bilder[0] || '').slice(0, 22), zugedeckt: e.liste.length, fassung: globalThis.pdfjsLib && globalThis.pdfjsLib.version, arbeiter: globalThis.pdfjsLib && globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc }; }
    catch (f) { return { fehler: String((f && f.message) || f) }; }
  }, lage.testPdf);
  ok(pdf.seiten >= 1 && pdf.bild === 'data:image/jpeg;base64' && pdf.zugedeckt >= 1 && String(pdf.arbeiter).includes('/' + zettel.vendor + '/pdfjs/'), vor + 'pdf.js kommt aus dem Paket: das Test-PDF wird zum Seitenbild, der unsichtbare Text ist zugedeckt', JSON.stringify(pdf));
  const ocr = await p.evaluate(async (b64) => {
    const D = await import('../kern/pruefung/datei.mjs'), e = await D.dateiPruefen('Testbild.png', Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    return { stand: e.stand, funde: e.funde.map((x) => x.kennung), hinweise: e.hinweise };
  }, lage.testBild);
  ok(ocr.stand === 'warnung' && ocr.funde.includes('BILD-KI-ANWEISUNG'), vor + `die Texterkennung kommt aus dem Paket (${zettel.ocrSprachen.join(', ')}): „Datei prüfen“ findet die Anweisung im Testbild`, JSON.stringify(ocr).slice(0, 300));
  const sw = await p.evaluate(async () => { if (!('serviceWorker' in navigator)) return 'gibt es hier nicht'; try { return (await navigator.serviceWorker.getRegistrations()).length; } catch (f) { return 'unter dieser Adresse nicht erlaubt: ' + f.name; } });
  ok(sw === 0 || typeof sw === 'string', vor + 'kein Service Worker ist angemeldet' + (typeof sw === 'string' ? ` (${sw})` : ''), String(sw));
  ok(b.fremd.length === 0, vor + 'keine Anfrage ging nach außen', b.fremd.slice(0, 5).join(' · '));
  const gefragtNachAlk = (x) => !ausgabe.alkoholErlaubt && lage.alkDateien.some((d) => x.includes('/beispiele/' + d));   // die Nachfrage oben
  const erwartet = (x) => /^\/neu\/sw\.js → 404$/.test(x) || gefragtNachAlk(x);
  const fehlt = b.fehlt.filter((x) => !erwartet(x)), fehler = b.fehler.filter((x) => !/\/neu\/sw\.js|bad HTTP response code \(404\)/.test(x) && !gefragtNachAlk(x));
  ok(fehlt.length === 0, vor + 'der App fehlt keine Datei im Paket' + (b.fehlt.some(erwartet) ? ` (erwartet und harmlos: ${[...new Set(b.fehlt.filter(erwartet))].join(', ')})` : ''), fehlt.slice(0, 6).join(' · '));
  ok(fehler.length === 0, vor + 'kein Fehler in der Seite', fehler.slice(0, 4).join(' · '));
}

/* ---------- Ablauf ---------- */
async function probe() {
  const { chromium, _electron } = require('playwright');
  console.log('0 · Vorbedingungen');
  for (const app of ['rezeptbuch', 'mixarium']) ok(existsSync(join(REPO[app], 'kern', 'ausgabe', 'ausgabe.mjs')) && existsSync(join(WERKZEUG[app], 'zusammenstellen.mjs')), `${app}: Repo (${REPO[app]}) und Werkzeug (${WERKZEUG[app]}) sind da`);
  if (!ok(!!VENDOR, 'der Ordner vendor aus Workflow PDF ist da (pdf.js, Texterkennung)', '--vendor <ordner> oder WFPDF_KLON setzen')) return;
  const testOrdner = join(VENDOR, '..', 'beispiele'), tb = join(testOrdner, 'Testbild-versteckte-Anweisung.png'), tp = join(testOrdner, 'Testdatei-unsichtbarer-Text.pdf');
  if (!ok(existsSync(tb) && existsSync(tp), 'die Testdateien aus Workflow PDF sind da (Testbild mit versteckter Anweisung, PDF mit unsichtbarem Text)', testOrdner)) return;
  const testBild = readFileSync(tb).toString('base64'), testPdf = readFileSync(tp).toString('base64');
  const GLEICH = ['zusammenstellen.mjs', 'release-fassung.mjs', 'probe.mjs', 'vendor-pin.json', 'package.json', 'android/package.json', 'android/package-lock.json', 'android/capacitor.vorlage.json', 'android/nachbessern.mjs', 'windows/package.json', 'windows/package-lock.json', 'windows/haupt.cjs', 'windows/pfad.cjs', 'windows/builder.vorlage.json'];
  const ungleich = GLEICH.filter((d) => !existsSync(join(WERKZEUG.rezeptbuch, d)) || !existsSync(join(WERKZEUG.mixarium, d)) || sha(readFileSync(join(WERKZEUG.rezeptbuch, d))) !== sha(readFileSync(join(WERKZEUG.mixarium, d))));
  ok(ungleich.length === 0, `ein Werkzeug für beide Apps: ${GLEICH.length} Dateien liegen in beiden Repos byte-gleich`, ungleich.join(', '));
  const pfadModul = require(join(WERKZEUG.rezeptbuch, 'windows', 'pfad.cjs'));

  const browser = await chromium.launch(); const laeufe = [];
  aufraeumen = () => { if (!arg('behalten')) rmSync(TMP, { recursive: true, force: true }); else console.log('  behalten: ' + TMP); };

  for (const app of ['rezeptbuch', 'mixarium']) {
    const EIN = json(join(WERKZEUG[app], 'ausgaben.json')), K = await import(pathToFileURL(join(REPO[app], 'kern', 'ausgabe', 'ausgabe.mjs')).href);
    for (const name of Object.keys(EIN.ausgaben)) for (const ziel of ZIELE) {
      if (NUR && !NUR.includes(name)) continue;
      console.log(`\n${name} · ${ziel}`);
      const nach = join(TMP, `${name}-${ziel}`), www = join(nach, 'www'), vor = '', quelle = json(join(REPO[app], 'ausgaben', name, 'ausgabe.json'));
      if (!quelle.ziele.includes(ziel)) { const r = stelle(app, name, ziel, nach); ok(r.rc === 1 && !existsSync(www), `${ziel} steht nicht in den Zielen der Ausgabe: das Werkzeug bricht ab und schreibt nichts`, r.text.trim()); continue; }
      const r = stelle(app, name, ziel, nach);
      if (!ok(r.rc === 0 && existsSync(join(www, 'paket.json')), 'zusammengestellt (Rückgabewert 0)', r.text.trim().slice(0, 600))) continue;
      const zettel = json(join(www, 'paket.json')), ausgabe = json(join(www, 'ausgaben', name, 'ausgabe.json')), katalog = json(join(www, 'beispiele', 'KATALOG.json')), da = laufe(www);
      ok(zettel.ausgabe === name && zettel.ziel === ziel && zettel.lieferung === 'im-paket' && zettel.store === !!ausgabe.store, 'der Paketzettel nennt Ausgabe, Ziel und Lieferung „im-paket“', JSON.stringify({ a: zettel.ausgabe, z: zettel.ziel, l: zettel.lieferung }));
      const start = readFileSync(join(www, 'index.html'), 'utf8');
      ok(start.includes("location.replace('neu/index.html')") && existsSync(join(www, 'neu', 'index.html')) && existsSync(join(www, 'neu', 'app.mjs')), 'an der Wurzel liegt eine Startseite, die nach neu/index.html führt');
      ok(JSON.stringify(readdirSync(join(www, 'ausgaben'))) === JSON.stringify([name]) && sha(readFileSync(join(www, 'ausgaben', name, 'ausgabe.json'))) === sha(readFileSync(join(REPO[app], 'ausgaben', name, 'ausgabe.json'))), 'im Paket liegt genau eine ausgabe.json, unverändert', readdirSync(join(www, 'ausgaben')).join(','));
      const soll = ['KATALOG.json', ...katalog.pakete.map((p) => p.datei)].sort(), ist = readdirSync(join(www, 'beispiele')).sort();
      ok(JSON.stringify(katalog.pakete.map((p) => p.id)) === JSON.stringify(ausgabe.beispiele) && JSON.stringify(soll) === JSON.stringify(ist) && katalog.pakete.every((p) => sha(readFileSync(join(www, 'beispiele', p.datei))) === p.sha256 && (!p.fuer || p.fuer.includes(name))), `Beispiele im Paket = „beispiele“ der Ausgabe, Katalog gekürzt, Prüfsummen stimmen [${ausgabe.beispiele.join(', ')}]`, ist.join(', '));
      const alk = []; for (const p of katalog.pakete.filter((x) => x.art === 'rezepte')) for (const rz of json(join(www, 'beispiele', p.datei)).recipes || []) if (rz.alcohol || K.istAlkoholischesGetraenk(rz)) alk.push(rz.name);
      if (ausgabe.alkoholErlaubt) ok(alk.length > 0 && katalog.pakete.some((p) => p.alkohol), `Gegenrichtung: in dieser Ausgabe findet dieselbe Suche Alkohol (${alk.length} Getränke) – sie ist nicht blind`, String(alk.length));
      else ok(alk.length === 0 && !katalog.pakete.some((p) => p.alkohol) && !da.some((d) => /alkohol-fuer|mit-alkohol/.test(d)), `kein Paket mit Alkohol im Paket${ausgabe.store ? ' (Store-Ausgabe)' : ''}: weder Datei noch Katalog-Eintrag noch ein alkoholisches Getränk`, alk.join(', '));
      const pin = json(join(WERKZEUG[app], 'vendor-pin.json')), vFalsch = Object.entries(pin.dateien).filter(([d, e]) => !existsSync(join(www, zettel.vendor, d)) || sha(readFileSync(join(www, zettel.vendor, d))) !== e.sha256).map(([d]) => d);
      ok(vFalsch.length === 0 && zettel.ocrSprachen.length > 0 && zettel.ocrSprachen.every((s) => existsSync(join(www, zettel.vendor, 'tesseract', 'lang', s + '.traineddata'))), `pdf.js und die Texterkennung liegen unter ${zettel.vendor}/ mit den Sprachdaten ${zettel.ocrSprachen.join(', ')} (${Object.keys(pin.dateien).length} Dateien, Prüfsummen wie im Pin)`, vFalsch.join(', '));
      const zFalsch = da.filter((d) => d !== 'paket.json' && zettel.dateien[d] !== sha(readFileSync(join(www, d)))), zFehlt = Object.keys(zettel.dateien).filter((d) => !da.includes(d));
      ok(zFalsch.length === 0 && zFehlt.length === 0, `der Paketzettel stimmt mit der Platte überein (${da.length} Dateien)`, [...zFalsch, ...zFehlt].slice(0, 5).join(', '));
      const fremdes = da.filter((d) => d === 'neu/sw.js' || (d.endsWith('.md') && d !== 'THIRD_PARTY.md') || (d.endsWith('.mjs') && /\bfrom\s+['"]node:/.test(readFileSync(join(www, d), 'utf8'))) || /(^|\/)(tests?|docs|node_modules|\.git)\//.test(d) || /\.py$/.test(d));
      ok(fremdes.length === 0, 'nichts Fremdes im Paket: kein Service Worker, keine Werkzeuge für Node, keine Proben, keine Unterlagen', fremdes.join(', '));
      if (ziel === 'android') {
        const c = json(join(nach, 'capacitor.config.json')), pk = json(join(nach, 'package.json')), zf = ['icon-only.png', 'icon-foreground.png', 'icon-background.png', 'splash.png', 'splash-dark.png'];
        ok(c.appId === EIN.ausgaben[name].appId && c.appName === EIN.ausgaben[name].appName && c.webDir === 'www' && c.server.androidScheme === 'https' && c.server.hostname === 'localhost' && c.plugins.CapacitorHttp.enabled === false && !JSON.stringify(c).includes('{'.concat('app')), `Android-Hülle: capacitor.config.json (${c.appId}, „${c.appName}“, https://localhost)`, JSON.stringify(c));
        ok(/^\d+\.\d+\.\d+$/.test(pk.dependencies['@capacitor/core']) && pk.dependencies['@capacitor/core'] === pk.dependencies['@capacitor/android'] && pk.dependencies['@capacitor/core'] === pk.devDependencies['@capacitor/cli'] && existsSync(join(nach, 'package-lock.json')) && zf.every((d) => existsSync(join(nach, 'assets', d))), `Android-Hülle: feste Fassungen (Capacitor ${pk.dependencies['@capacitor/core']}), Sperrdatei, fünf Zeichen-Dateien${zettel.zeichen === 'platzhalter' ? ' (Platzhalter)' : ''}`);
      } else {
        const bj = json(join(nach, 'builder.json')), pw = json(join(nach, 'paket-windows.json')), pk = json(join(nach, 'package.json'));
        const syn = ['haupt.cjs', 'pfad.cjs'].map((d) => spawnSync(process.execPath, ['--check', join(nach, d)]).status);
        ok(bj.appId === EIN.ausgaben[name].appId && bj.productName === EIN.ausgaben[name].appName && bj.publish === null && bj.extraMetadata.version === zettel.app.fassung && pw.datenOrdner === EIN.ausgaben[name].appId && syn.every((s) => s === 0) && existsSync(join(nach, 'zeichen', 'icon.png')) && !JSON.stringify(bj).includes('{'.concat('app')), `Windows-Hülle: builder.json (${bj.appId}, „${bj.productName}“, Fassung ${bj.extraMetadata.version}, veröffentlicht nichts), haupt.cjs und pfad.cjs lesbar, eigener Datenordner`, JSON.stringify(bj).slice(0, 200));
        ok(/^\d+\.\d+\.\d+$/.test(pk.devDependencies.electron) && /^\d+\.\d+\.\d+$/.test(pk.devDependencies['electron-builder']) && pk.main === 'haupt.cjs' && existsSync(join(nach, 'package-lock.json')), `Windows-Hülle: feste Fassungen (Electron ${pk.devDependencies.electron}, electron-builder ${pk.devDependencies['electron-builder']}), Sperrdatei`);
      }
      const alkDateien = json(join(REPO[app], 'beispiele', 'KATALOG.json')).pakete.filter((x) => x.alkohol).map((x) => x.datei);
      const lage = { ausgabe, katalog, art: EIN.probe.art, zettel, testBild, testPdf, name, ziel, nach, alkDateien, appName: EIN.ausgaben[name].appName, appId: EIN.ausgaben[name].appId };
      const s = await server(www, ziel, pfadModul), kontext = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'de-DE' }), p = await kontext.newPage();
      try {
        const b = await seiteBeobachten(kontext, p);
        await p.goto(s.url);
        await inDerSeite(p, lage, b, vor);
        const s404 = [...new Set(s.gefragt.filter((g) => g.status !== 200).map((g) => g.pfad))], darf = (x) => x === '/neu/sw.js' || (!ausgabe.alkoholErlaubt && alkDateien.some((d) => x === '/beispiele/' + d));
        ok(p.url() === s.url + 'neu/index.html' && s.gefragt.some((g) => g.pfad === '/' && g.status === 200) && s404.every(darf), `ausgeliefert wie ${ziel === 'android' ? 'von Capacitor (Startseite an der Wurzel, 404 für fehlende Dateien)' : 'von der Windows-Hülle (paket/windows/pfad.cjs)'}: ${s.gefragt.length} Anfragen; nicht im Paket war nur Erwartetes${s404.filter(darf).length ? ' (' + s404.filter(darf).join(', ') + ')' : ''}`, p.url() + ' · unerwartet 404: ' + s404.filter((x) => !darf(x)).join(', '));
      } catch (f) { ok(false, 'der Lauf im Browser kam nicht durch', String((f && f.message) || f).split('\n')[0]); }
      finally { await kontext.close(); await s.zu(); }
      laeufe.push(lage);
    }
  }

  console.log('\nSelbst-Riegel');
  { const k = await browser.newContext(), p = await k.newPage(), b = await seiteBeobachten(k, p); await p.goto('data:text/html,<p>x</p>'); await p.evaluate(() => fetch('https://beispiel.invalid/x').catch(() => {})); await p.waitForTimeout(200);
    ok(b.fremd.length === 1, 'die Sperre zählt: eine absichtliche Anfrage nach außen wird gesperrt und gezählt', b.fremd.join(',')); await k.close(); }
  await browser.close();

  console.log('\nWindows-Hülle: Adressen → Dateien (paket/windows/pfad.cjs)');
  const ein = laeufe.find((l) => l.ziel === 'windows');
  if (ein) {
    const www = join(ein.nach, 'www'), a = (p) => pfadModul.aufloesen(www, p);
    ok(a('/').datei === join(www, 'index.html') && a('/neu/').datei === join(www, 'neu', 'index.html') && a('/neu/app.mjs').datei === join(www, 'neu', 'app.mjs'), '„/“ und ein Ordner führen auf index.html, eine Datei auf sich selbst');
    ok(a('/' + ein.zettel.vendor + '/pdfjs/pdf.min.js').datei && pfadModul.kopf('x.mjs')['content-type'].startsWith('text/javascript') && pfadModul.kopf('x.wasm')['content-type'] === 'application/wasm', 'die Vendor-Adresse des Kerns trifft; Module gehen als JavaScript hinaus');
    const boese = ['/../paket-windows.json', '/neu/../../haupt.cjs', '/%2e%2e/haupt.cjs', '/neu/..%2f..%2fhaupt.cjs', '/..\\haupt.cjs', '/C:/Windows/win.ini', '/neu/app.mjs%00.png', '/%E0%A4%A'];
    const durch = boese.filter((x) => a(x).datei);
    ok(durch.length === 0 && a('/gibt-es-nicht').status === 404 && a('/models/x/config.json').status === 404, `nichts außerhalb des Web-Ordners (${boese.length} Versuche), Fehlendes ist 404 ohne Rückfall auf die Startseite`, durch.join(' '));
  } else nichtGemessen.push('pfad.cjs (kein Windows-Lauf in dieser Auswahl)');

  console.log('\nGegenproben: das Werkzeug muss abbrechen und darf nichts hinterlassen');
  if (!NUR || NUR.some((n) => n.startsWith('mixarium'))) {
    const Q = join(TMP, 'quelle-mix'), frisch = () => { rmSync(Q, { recursive: true, force: true }); cpSync(REPO.mixarium, Q, { recursive: true, filter: (s) => { const rel = relative(REPO.mixarium, s).split(sep).join('/'); return !/^(\.git|\.github|node_modules|paket|tests|docs|tools)(\/|$)/.test(rel) && !/\.(pdf|mp4|webm)$/.test(rel) && !/^(QC_Mixarium|index\.html$)/.test(rel); } }); };   // nur was das Werkzeug liest
    const fall = (titel, aendern, muss, ausgabe = 'mixarium-store', mehr = [], ziel = 'android') => {
      frisch(); const v = aendern(Q) || {}; const nach = v.nach || join(TMP, 'gp-' + Math.random().toString(36).slice(2));
      const r = spawnSync(process.execPath, [join(WERKZEUG.mixarium, 'zusammenstellen.mjs'), '--ausgabe', ausgabe, '--ziel', ziel, '--wurzel', Q, '--nach', nach, '--vendor', v.vendor || VENDOR, '--leise', ...mehr], { encoding: 'utf8' }), text = (r.stdout || '') + (r.stderr || '');
      ok(r.status === 1 && muss.test(text) && !existsSync(join(nach, 'www')), titel, `Rückgabewert ${r.status} · ${text.trim().split('\n')[0].slice(0, 220)}${existsSync(join(nach, 'www')) ? ' · www/ wurde geschrieben' : ''}`);
    };
    const aendere = (p, f) => { const d = json(p); f(d); writeFileSync(p, JSON.stringify(d, null, 1) + '\n'); };
    const ALK = 'getraenke-mit-alkohol-fuer-mixarium';
    { frisch(); const r = stelle('mixarium', 'mixarium-store', 'android', join(TMP, 'gp-heil'), [], Q); ok(r.rc === 0, 'Selbst-Riegel: die unveränderte Kopie lässt sich zusammenstellen (sonst wären die Gegenproben aus falschem Grund rot)', r.text.trim().slice(0, 300)); }
    fall('Store-Ausgabe nennt das Alkohol-Paket → Abbruch', (q) => aendere(join(q, 'ausgaben/mixarium-store/ausgabe.json'), (a) => a.beispiele.push(ALK)), /nicht für mixarium-store freigegeben|enthält Alkohol/);
    fall('… auch wenn der Katalog es für den Store freigibt → Abbruch wegen Alkohol', (q) => { aendere(join(q, 'ausgaben/mixarium-store/ausgabe.json'), (a) => a.beispiele.push(ALK)); aendere(join(q, 'beispiele/KATALOG.json'), (k) => k.pakete.find((p) => p.id === ALK).fuer.push('mixarium-store')); }, /enthält Alkohol|darf .* \(Alkohol\)/);
    fall('… auch wenn sich das Paket als alkoholfrei ausgibt → der Inhalt verrät es', (q) => { aendere(join(q, 'ausgaben/mixarium-store/ausgabe.json'), (a) => a.beispiele.push(ALK)); aendere(join(q, 'beispiele/KATALOG.json'), (k) => { const p = k.pakete.find((x) => x.id === ALK); p.fuer.push('mixarium-store'); p.alkohol = false; }); }, /als alkoholfrei markiert|Alkohol in/);
    fall('ein Beispiel-Paket ist verändert (Prüfsumme) → Abbruch', (q) => { const p = join(q, 'beispiele/getraenke-ohne-alkohol-start.json'); writeFileSync(p, readFileSync(p, 'utf8').replace('Mango-Lassi', 'Mango-Lasso')); }, /Prüfsumme stimmt nicht/);
    fall('eine Datei des Küchen-Kerns ist verändert (Pin) → Abbruch', (q) => writeFileSync(join(q, 'kern/modell/suche.mjs'), readFileSync(join(q, 'kern/modell/suche.mjs'), 'utf8') + '\n/* fremd */\n'), /passt nicht zu KERN\.json/);
    fall('pdf.js ist verändert (Vendor-Pin) → Abbruch', (q) => { const v = join(TMP, 'vendor-falsch'); rmSync(v, { recursive: true, force: true }); for (const d of Object.keys(json(join(WERKZEUG.mixarium, 'vendor-pin.json')).dateien)) { mkdirSync(dirname(join(v, d)), { recursive: true }); copyFileSync(join(VENDOR, d), join(v, d)); } writeFileSync(join(v, 'pdfjs/pdf.min.js'), readFileSync(join(v, 'pdfjs/pdf.min.js'), 'utf8') + '\n/* fremd */\n'); return { vendor: v }; }, /weichen von paket\/vendor-pin\.json ab/);
    fall('die App legt ihre Ausgabe anders fest als erwartet (Weiche) → Abbruch statt falscher Ausgabe', (q) => writeFileSync(join(q, 'neu/app.mjs'), readFileSync(join(q, 'neu/app.mjs'), 'utf8').replace("const AUSGABE = 'mixarium-voll';", "const AUSGABE = \"mixarium-voll\";")), /Weiche trifft 0-mal/);
    fall('Lieferung „auf-tippen“ für ein Paket → Abbruch', (q) => aendere(join(q, 'ausgaben/mixarium-store/ausgabe.json'), (a) => { a.lieferung.android = 'auf-tippen'; }), /nur „im-paket“ geht/);
    fall('die App verweist auf eine Datei, die nicht ins Paket käme → Abbruch', (q) => writeFileSync(join(q, 'neu/app.css'), readFileSync(join(q, 'neu/app.css'), 'utf8') + '\n.x{background:url(../gibt-es-nicht/bild.css)}\n'), /gehen im Paket ins Leere/);
    fall('der Arbeitsordner wäre das Repo selbst → Abbruch', (q) => ({ nach: q }), /darf das Repo nicht enthalten|nur unter paket\/aus/);
    fall('der Arbeitsordner ist ein fremder, nicht leerer Ordner → nichts wird überschrieben', () => { const n = join(TMP, 'fremd'); mkdirSync(n, { recursive: true }); writeFileSync(join(n, 'wichtig.txt'), 'x'); return { nach: n }; }, /nicht leer und stammt nicht von diesem Werkzeug/);
  } else nichtGemessen.push('Gegenproben (laufen an einer Kopie des Mixariums; mit --nur ohne Mixarium ausgelassen)');

  console.log('\nWindows-Hülle in Electron (dieses Betriebssystem, kein Bau)');
  const prog = ELECTRON && [join(ELECTRON, 'dist', 'electron'), join(ELECTRON, 'dist', 'electron.exe'), join(ELECTRON, 'node_modules', 'electron', 'dist', 'electron'), join(ELECTRON, 'node_modules', 'electron', 'dist', 'electron.exe')].find((x) => existsSync(x));
  if (!prog) nichtGemessen.push('die Windows-Hülle in Electron (haupt.cjs). Mit --electron <ordner von node_modules/electron> läuft sie hier mit.');
  else if (process.platform !== 'linux') nichtGemessen.push('die Windows-Hülle in Electron: die Probe startet sie nur unter Linux (dort lässt sich der Datenordner in den Wegwerf-Ordner legen)');
  else {
    let xvfb = null; const umg = { ...process.env, XDG_CONFIG_HOME: join(TMP, 'konfig') };   // dorthin legt Electron unter Linux den Datenordner
    if (!process.env.DISPLAY) { const nr = ':' + (90 + (process.pid % 9)); xvfb = spawn('Xvfb', [nr, '-screen', '0', '1280x900x24'], { stdio: 'ignore' }); xvfb.on('error', () => { xvfb = null; }); await new Promise((r) => setTimeout(r, 900)); umg.DISPLAY = nr; }
    for (const lage of laeufe.filter((l) => l.ziel === 'windows')) {
      const vor = `${lage.name}: `; let app = null;
      try {
        app = await _electron.launch({ executablePath: prog, args: [lage.nach, ...(process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : [])], env: umg, timeout: 60000 });
        const p = await app.firstWindow(), b = await seiteBeobachten(app.context(), p);
        await inDerSeite(p, lage, b, vor);
        const titel = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getTitle()), daten = await app.evaluate(({ app }) => app.getPath('userData')), fassung = await app.evaluate(() => process.versions.electron);
        ok(p.url() === 'app://paket/neu/index.html' && titel === lage.appName && daten.endsWith(lage.appId) && daten.startsWith(TMP), vor + `Electron ${fassung}: eigene Adresse app://paket/, Fenstertitel „${lage.appName}“, Datenordner …/${lage.appId}`, [p.url(), titel, daten].join(' · '));
        const zu = await p.evaluate(() => { try { return String(window.open('about:blank', '_blank')); } catch (f) { return 'Fehler'; } });
        ok(zu === 'null' && (await app.windows()).length === 1, vor + 'ein zweites Fenster gibt es nicht (window.open wird abgelehnt)', zu);
      } catch (f) { ok(false, vor + 'die Hülle kam in Electron nicht durch', String((f && f.message) || f).split('\n')[0]); }
      finally { if (app) await app.close().catch(() => {}); }
    }
    if (xvfb) xvfb.kill();
  }
}

await probe();
schluss();
