// Probe: Food-Zine legt BILD UND TEXT zusammen in die Zwischenablage.
//
// Anlass (Klaus 2026-10-12): „wenn ich aus einem Rezept ein Food-Zine-Bild
// machen will, wird nicht das Bild mit übernommen … sodass ich bei dem Klick
// auf ChatGPT sowohl das Bild als auch den Text einfügen kann." Kopiert wurde
// nur der Text. Gemessen wird, was WIRKLICH in der Zwischenablage liegt —
// gelesen mit navigator.clipboard.read(), nicht am Code.
//
//   node tests/smoke_foodzine_bild.mjs

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');

let chromium;
try { ({ chromium } = await import('playwright-core')); }
catch { console.log('⊘ NICHT LAUFFÄHIG: playwright-core fehlt'); process.exit(0); }

function chromiumPfad() {
  const basis = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(basis)) return null;
  for (const d of readdirSync(basis).filter(n => n.startsWith('chromium')).sort().reverse())
    for (const rel of ['chrome-linux/chrome', 'chrome-linux/headless_shell']) {
      const p = join(basis, d, rel);
      if (existsSync(p)) return p;
    }
  return null;
}
const exe = chromiumPfad();
if (!exe) { console.log('⊘ NICHT LAUFFÄHIG: kein Chromium gefunden'); process.exit(0); }

let gruen = 0; const rot = [];
const ok = (name, bed, zusatz = '') => {
  if (bed) { gruen++; console.log('  ✓ ' + name); }
  else { rot.push(name); console.log('  ✗ ROT: ' + name + (zusatz ? ' — ' + zusatz : '')); }
};

// Eigener Server auf einem FREIEN Port — eine feste Nummer trifft irgendwann
// einen Server aus einem abgebrochenen Lauf, der ein anderes Verzeichnis
// ausliefert.
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
               '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
               '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const pfad = normalize(join(WURZEL, decodeURIComponent(req.url.split('?')[0])));
  if (!pfad.startsWith(WURZEL)) { res.writeHead(403).end(); return; }
  try {
    const buf = await readFile(pfad);
    res.writeHead(200, { 'Content-Type': MIME[pfad.slice(pfad.lastIndexOf('.'))] || 'application/octet-stream' }).end(buf);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

import { deflateSync } from 'node:zlib';
function png(b, hh) {
  const roh = Buffer.alloc((b * 3 + 1) * hh);
  for (let i = 0; i < roh.length; i++) roh[i] = (i % (b * 3 + 1)) === 0 ? 0 : (i * 2654435761 >>> 24) & 255;
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const block = (typ, daten) => { const l = Buffer.alloc(4); l.writeUInt32BE(daten.length);
    const td = Buffer.concat([Buffer.from(typ), daten]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(b, 0); ihdr.writeUInt32BE(hh, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), block('IHDR', ihdr), block('IDAT', deflateSync(roh)), block('IEND', Buffer.alloc(0))]);
}
const PNG = png(64, 48);

const browser = await chromium.launch({ executablePath: exe });

try {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://127.0.0.1:${PORT}` });
  const seite = await ctx.newPage();
  const fehler = [], popups = [];
  seite.on('pageerror', e => fehler.push(String(e).slice(0, 200)));
  // ⚠ Fremde Seiten werden abgebrochen; die Adresse des Popups wäre dann die
  // Chrome-Fehlerseite. Gelesen wird die ANGEFRAGTE Adresse.
  ctx.on('request', q => { if (/chatgpt\.com/.test(q.url())) popups.push(q.url()); });
  ctx.on('page', p => { p.close().catch(() => {}); });
  await ctx.route('**/*', r => r.request().url().startsWith(`http://127.0.0.1:${PORT}/`) ? r.continue() : r.abort());
  await seite.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
  await seite.waitForFunction(() => typeof openFzgAsAiBook === 'function' && typeof R !== 'undefined', null, { timeout: 20000 });
  const bild = 'data:image/png;base64,' + PNG.toString('base64');
  await seite.evaluate(b => {
    R.unshift({ id: 987101, name: 'Zwetschgenkuchen', cat: 'kuchen', img: b, ings: [{ id: 1, amt: '1', unit: 'kg', name: 'Zwetschgen' }], steps: [{ id: 1, txt: 'Backen.' }], rating: { stars: 0, comment: '', imps: [] } });
    R.unshift({ id: 987102, name: 'Ohne Foto', cat: 'kuchen', img: '', ings: [], steps: [], rating: { stars: 0, comment: '', imps: [] } });
    openFzgAsAiBook(987101);
  }, bild);
  const lies = () => seite.evaluate(async () => {
    const it = (await navigator.clipboard.read())[0];
    const typen = [...it.types];
    const text = typen.includes('text/plain') ? await (await it.getType('text/plain')).text() : '';
    const bildGr = typen.includes('image/png') ? (await it.getType('image/png')).size : 0;
    return { typen, text, bildGr };
  });
  const bereit = () => seite.waitForFunction(() => !!_fzBild.png, null, { timeout: 10000 });
  const leeren = () => seite.evaluate(() => navigator.clipboard.writeText('LEER'));

  ok('keine Seitenfehler', fehler.length === 0, fehler[0]);
  const wahl = await seite.evaluate(() => [...document.querySelectorAll('#fzBildWahl [data-fzwahl]')].map(b => b.dataset.fzwahl + (b.classList.contains('on') ? '*' : '')));
  ok('die Wahl steht da: Bild aus Rezept (gewählt) · eigenes Bild · ohne', JSON.stringify(wahl) === '["rezept*","eigen","ohne"]', JSON.stringify(wahl));
  ok('die Vorschau zeigt das Rezeptbild', await seite.evaluate(() => !!document.querySelector('#fzBildVorschau img')));

  // ── 1 · Bild aus Rezept: Kopieren legt beides ab ──
  await bereit(); await leeren();
  await seite.click('#aiBookCopyBtn');
  await seite.waitForFunction(async () => (await navigator.clipboard.read())[0].types.includes('image/png'), null, { timeout: 5000 }).catch(() => {});
  let z = await lies();
  ok('Kopieren legt ein BILD in die Zwischenablage', z.bildGr > 500, JSON.stringify({ typen: z.typen, bildGr: z.bildGr }));
  ok('… und den TEXT dazu, im selben Eintrag', /Zwetschgenkuchen/.test(z.text), z.text.slice(0, 80));
  ok('… mit dem Hinweis, das Foto als Vorlage zu nehmen', z.text.includes(await seite.evaluate(() => T('fzBildHinweis'))));

  // ── 2 · ChatGPT: kopiert UND öffnet ──
  await leeren();
  await seite.click('#aiBookGptBtn', { noWaitAfter: true });
  await seite.waitForTimeout(400);
  z = await lies();
  ok('der ChatGPT-Knopf kopiert ebenfalls Bild und Text', z.bildGr > 500 && /Zwetschgenkuchen/.test(z.text), JSON.stringify(z.typen));
  ok('… und öffnet ChatGPT mit dem Bild-Hinweis (hints=image)', popups.some(u => /chatgpt\.com\/\?hints=image/.test(u)), popups.join(','));

  // ── 3 · Ohne Bild: nur Text ──
  await seite.evaluate(() => _fzBildWahl('ohne')); await leeren();
  await seite.click('#aiBookCopyBtn'); await seite.waitForTimeout(300);
  z = await lies();
  ok('„Ohne Bild“: nur Text, kein Bild', z.bildGr === 0 && /Zwetschgenkuchen/.test(z.text), JSON.stringify(z.typen));

  // ── 4 · Eigenes Bild ──
  await seite.evaluate(() => { _fzBild.wahl = 'eigen'; });
  await seite.setInputFiles('#fzEigenIn', { name: 'eigen.png', mimeType: 'image/png', buffer: png(64, 64) });
  await seite.waitForFunction(() => _fzBild.wahl === 'eigen' && !!_fzBild.eigen && !!_fzBild.png && _fzBild.quelle === _fzBild.eigen, null, { timeout: 10000 });
  ok('ein eigenes Bild erscheint in der Vorschau', await seite.evaluate(() => document.querySelector('#fzBildVorschau img')?.getAttribute('src') === _fzBild.eigen));
  await leeren(); await seite.click('#aiBookCopyBtn');
  await seite.waitForTimeout(300);
  z = await lies();
  ok('… und geht mit dem Text in die Zwischenablage', z.bildGr > 500 && /Zwetschgenkuchen/.test(z.text), JSON.stringify(z.typen));

  // ── 5 · Rezept ohne Foto: sagt es, kopiert den Text ──
  await seite.evaluate(() => { _fzBildWahl('rezept'); const s = document.getElementById('aiBookZineRec'); s.value = '987102'; s.onchange(); });
  ok('ein Rezept ohne Foto sagt es, statt still nichts zu tun', await seite.evaluate(() => document.getElementById('fzBildVorschau').textContent === T('fzBildKeins')));
  await leeren(); await seite.click('#aiBookCopyBtn'); await seite.waitForTimeout(300);
  z = await lies();
  ok('… und kopiert den Text ohne Bild', z.bildGr === 0 && /Ohne Foto/.test(z.text), JSON.stringify(z.typen));

  // ── 6 · Die anderen Kreativbuch-Stile bleiben unberührt ──
  await seite.evaluate(() => { _kbCpStyle = 'classic'; });
  await leeren(); await seite.click('#aiBookCopyBtn'); await seite.waitForTimeout(300);
  z = await lies();
  ok('außerhalb von Food-Zine bleibt Kopieren reiner Text', z.bildGr === 0, JSON.stringify(z.typen));

  // ── 7 · 8 Sprachen ──
  const fehlt = await seite.evaluate(() => ['de','en','ru','zh','es','fr','it','pt'].flatMap(l => ['fzBildLbl','fzBildRezept','fzBildEigen','fzBildOhne','fzBildAndere','fzBildKeins','fzBildHinweis','fzBildKopiert','fzBildNurText'].filter(k => !LANGS[l][k]).map(k => l + '.' + k)));
  ok('die neuen Texte stehen in allen 8 Sprachen', fehlt.length === 0, fehlt.join(','));
  await ctx.close();
} catch (e) {
  rot.push('ABSTURZ: ' + String(e).slice(0, 300));
  console.log('  ✗ ROT: ABSTURZ — ' + String(e).slice(0, 300));
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${gruen} grün · ${rot.length} ROT`);
if (rot.length) { console.log('Rote Zeilen:'); rot.forEach(r => console.log('  - ' + r)); }
process.exitCode = rot.length ? 1 : 0;
