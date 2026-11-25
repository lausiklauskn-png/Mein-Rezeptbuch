// Probe der neuen PWA: R5 (Klaus 25.11., Vorbild Muttis) – Rezeptkarte lange drücken und ziehen (umsortieren, auf Kategorie oder
// Event-Ordner fallen lassen) und Wischen zwischen den Bildschirmen am Handy. Echter Browser; der Finger über das Chrome-Protokoll
// (Input.dispatchTouchEvent), die Maus über Playwright. Aufruf: node tests/smoke_neu_ziehen.mjs · WURZEL=<Kopie>
import { createRequire } from 'node:module';
import { mitThemen } from './neu-hilfe.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join } from 'node:path';
const WURZEL = process.env.WURZEL || process.cwd();
const TYP = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer(async (q, a) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; try { const d = await readFile(join(WURZEL, p)); a.writeHead(200, { 'content-type': TYP[extname(p)] || 'application/octet-stream' }); a.end(d); } catch { a.writeHead(404); a.end(); } }).listen(0);
const ORT = `http://localhost:${srv.address().port}/neu/`, URL0 = ORT + '?leer';
let gruen = 0, rot = 0; const ok = (b, t, mehr = '') => { if (b) { gruen++; console.log('  ✓ ' + t); } else { rot++; console.log('  ✗ ROT: ' + t + (mehr ? ' — ' + mehr : '')); } };
process.on('unhandledRejection', (e) => { rot++; console.log('  ✗ ROT: Absturz — ' + String(e?.message || e).split('\n')[0]); });
const browser = await chromium.launch(); const fehler = [];
const R = (n, name, cat, extra = {}) => ({ uid: 'r-' + n, id: n, name, cat, servings: 4, ings: [{ amt: '1', unit: '', name: 'Salz', note: '' }], steps: [{ txt: 'Kochen.' }], created: '2026-11-01T10:00:00.000Z', modified: '2026-11-01T10:00:00.000Z', ...extra });
const BESTAND = [R(1, 'Apfelkuchen', 'backen'), R(2, 'Brot', 'backen'), R(3, 'Cremetorte', 'backen'), R(4, 'Dinkelbrötchen', 'backen'), R(5, 'Gulasch', 'fleisch'), R(6, 'Hühnersuppe', 'suppen', { folder: 'o1' })];
async function seite(breite = 390, handy = true) {
  const k = await browser.newContext({ viewport: { width: breite, height: 800 }, serviceWorkers: 'block', locale: 'de-DE', hasTouch: handy, isMobile: handy }), p = mitThemen(await k.newPage());
  p.on('pageerror', (e) => fehler.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && fehler.push(m.text()));
  await p.route(/^https?:\/\/(?!localhost)/, (r) => { fehler.push('Netz nach draußen: ' + r.request().url()); r.abort(); });
  await p.goto(ORT + 'app.css');
  await p.evaluate((rezepte) => new Promise((ja, nein) => { const a = indexedDB.open('KuechenKern-rezeptbuch', 1); a.onupgradeneeded = () => a.result.createObjectStore('zustand'); a.onerror = () => nein(a.error); a.onsuccess = () => { const t = a.result.transaction('zustand', 'readwrite'); t.objectStore('zustand').put({ fassung: 1, einstellungen: { ton: 'hell' }, zustand: { rezepte, ordner: [{ id: 'o1', name: 'Geburtstag' }], menu: [], kategorien: {}, plan: {} } }, 'alles'); t.oncomplete = () => { a.result.close(); ja(); }; }; }), BESTAND);
  await p.goto(URL0); await p.waitForSelector('.gruss'); return { p, k, cdp: handy ? await k.newCDPSession(p) : null };
}
const bestand = (p) => p.evaluate(() => new Promise((ja) => { const a = indexedDB.open('KuechenKern-rezeptbuch'); a.onsuccess = () => { const q = a.result.transaction('zustand').objectStore('zustand').get('alles'); q.onsuccess = () => { a.result.close(); ja(q.result.zustand); }; }; }));
const bestandWenn = async (p, pruef) => { let b = await bestand(p); for (let i = 0; i < 40 && !pruef(b); i++) { await p.waitForTimeout(100); b = await bestand(p); } return b; };
const folge = (z, cat) => z.rezepte.filter((r) => r.cat === cat).map((r) => r.name).join(',');
const mitte = (p, sel) => p.locator(sel).first().evaluate((e) => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, r: r.right, t: r.top, b: r.bottom }; });
const finger = (cdp, type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
/* Finger: aufsetzen, warten, in Schritten ziehen, loslassen. */
async function fingerZug(p, cdp, von, nach, warte = 450, schritt = 25) {
  await finger(cdp, 'touchStart', von.x, von.y); await p.waitForTimeout(warte);
  for (let i = 1; i <= 8; i++) { await finger(cdp, 'touchMove', von.x + (nach.x - von.x) * i / 8, von.y + (nach.y - von.y) * i / 8); await p.waitForTimeout(schritt); }
  await finger(cdp, 'touchEnd'); await p.waitForTimeout(150);
}
const toast = (p) => p.locator('#toast').innerText().catch(() => '');
const geh = async (p, z) => { await p.keyboard.press('Escape'); if (await p.locator(`.rail-n[data-zu=${z}]`).count()) { await p.click(`.rail-n[data-zu=${z}]`); return; } if (await p.locator('#leiste .fl-griff').count()) await p.click('#leiste .fl-griff'); await p.click(`#leiste [data-zu=${z}]`); };

try {
  console.log('1 · Finger: lange drücken und hinter eine andere Karte ziehen (390 px)');
  let { p, k, cdp } = await seite();
  await p.click('.fotokat [data-kat=backen]'); await p.waitForSelector('.gitter.eins .karte');
  const a = await mitte(p, '.karte[data-uid=r-1]'), c = await mitte(p, '.karte[data-uid=r-3]');
  const quer = (await p.locator('.gitter.eins .karte').first().evaluate((e) => e.getBoundingClientRect().width < e.parentElement.clientWidth * 0.6));
  await fingerZug(p, cdp, a, { x: quer ? c.r - 8 : c.x, y: quer ? c.y : c.b - 8 });
  let z = await bestandWenn(p, (b) => folge(b, 'backen') !== 'Apfelkuchen,Brot,Cremetorte,Dinkelbrötchen');
  ok(folge(z, 'backen') === 'Brot,Cremetorte,Apfelkuchen,Dinkelbrötchen', 'Apfelkuchen steht hinter der Cremetorte, gespeichert', folge(z, 'backen'));
  ok(await p.locator('.rezept-held').count() === 0, 'nach dem Ziehen öffnet sich das Rezept nicht');
  ok(/Reihenfolge geändert/.test(await toast(p)), 'die Meldung sagt es und bietet Rückgängig', await toast(p));
  ok(JSON.stringify(await p.locator('.gitter.eins .karte strong').allInnerTexts()) === JSON.stringify(['Brot', 'Cremetorte', 'Apfelkuchen', 'Dinkelbrötchen']), 'die Liste zeigt die neue Reihenfolge');
  await p.click('#toast [data-a=toast-tun]', { timeout: 3000 }).catch(() => {}); z = await bestandWenn(p, (b) => folge(b, 'backen') === 'Apfelkuchen,Brot,Cremetorte,Dinkelbrötchen');
  ok(folge(z, 'backen') === 'Apfelkuchen,Brot,Cremetorte,Dinkelbrötchen', 'Rückgängig stellt die Reihenfolge wieder her');

  console.log('2 · Finger: sofort bewegen = rollen, kein Ziehen; kurzer Tipp öffnet das Rezept');
  await p.waitForTimeout(500); const a2 = await mitte(p, '.karte[data-uid=r-1]'), c2 = await mitte(p, '.karte[data-uid=r-3]');
  await fingerZug(p, cdp, a2, { x: quer ? c2.r - 8 : c2.x, y: quer ? c2.y : c2.b - 8 }, 30, 90); await p.waitForTimeout(300);   /* 8 × 90 ms: der Finger ist noch unterwegs, wenn die 350 ms ablaufen */
  z = await bestand(p); ok(folge(z, 'backen') === 'Apfelkuchen,Brot,Cremetorte,Dinkelbrötchen' && await p.locator('.kz-zieht, .bz-geist').count() === 0, 'eine Bewegung vor dem Langdruck zieht nichts (die Seite rollt), auch nicht über eine andere Karte', folge(z, 'backen'));
  await p.waitForTimeout(500);
  const a3 = await mitte(p, '.karte[data-uid=r-2]'); await finger(cdp, 'touchStart', a3.x, a3.y); await p.waitForTimeout(60); await finger(cdp, 'touchEnd');   /* ein echter kurzer Fingertipp, kein Klick der Probe */
  await p.waitForSelector('.rezept-held h1', { timeout: 5000 }).catch(() => {});
  ok((await p.locator('.rezept-held h1').innerText().catch(() => '')) === 'Brot', 'ein kurzer Tipp öffnet das Rezept wie bisher');
  await geh(p, 'start');

  console.log('3 · Finger: auf ein Kategorie-Foto und auf einen Event-Ordner fallen lassen');
  await p.click('.fotokat [data-kat=backen]'); await p.waitForSelector('.gitter.eins .karte');
  await p.evaluate(() => scrollTo(0, 0));
  const d = await mitte(p, '.karte[data-uid=r-4]'), fz = await p.locator('.fotokat [data-kat=fleisch]').evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 20 }; });
  await fingerZug(p, cdp, d, fz);
  z = await bestandWenn(p, (b) => b.rezepte.find((r) => r.uid === 'r-4').cat === 'fleisch');
  ok(z.rezepte.find((r) => r.uid === 'r-4').cat === 'fleisch', 'Dinkelbrötchen liegt jetzt unter „Fleisch“', z.rezepte.find((r) => r.uid === 'r-4').cat);
  ok(/verschoben/.test(await toast(p)), 'die Meldung nennt das Ziel und bietet Rückgängig', await toast(p));
  await p.click('#toast [data-a=toast-tun]'); await bestandWenn(p, (b) => b.rezepte.find((r) => r.uid === 'r-4').cat === 'backen');
  await p.evaluate(() => scrollTo(0, 0));
  const b2 = await mitte(p, '.karte[data-uid=r-2]'), fo = await p.locator('.fotokat [data-kat="ordner:o1"]').evaluate((e) => { e.scrollIntoView({ inline: 'center', block: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 20 }; });
  await fingerZug(p, cdp, await mitte(p, '.karte[data-uid=r-2]'), fo);
  z = await bestandWenn(p, (b) => b.rezepte.find((r) => r.uid === 'r-2').folder === 'o1');
  ok(z.rezepte.find((r) => r.uid === 'r-2').folder === 'o1' && z.rezepte.find((r) => r.uid === 'r-2').cat === 'backen', 'auf den Event-Ordner: Brot liegt im Ordner, die Kategorie bleibt');

  console.log('4 · Alle: nur innerhalb derselben Kategorie umsortieren');
  await p.click('.fotokat [data-kat=alle]'); await p.waitForSelector('.gitter.alle .karte');
  const g = await mitte(p, '.gitter.alle .karte[data-uid=r-5]'), ap = await mitte(p, '.gitter.alle .karte[data-uid=r-1]');
  await fingerZug(p, cdp, g, ap);
  z = await bestand(p); ok(z.rezepte.map((r) => r.uid).indexOf('r-5') === 4 && z.rezepte.find((r) => r.uid === 'r-5').cat === 'fleisch', 'Gulasch auf eine Backen-Karte: nichts ändert sich (andere Gruppe)', z.rezepte.map((r) => r.uid).join(','));

  console.log('5 · Wischen zwischen den Bildschirmen (Handy)');
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);   /* 400 ms nach einem Ziehen zählt ein Wisch nicht (sonst wechselte das Loslassen den Bildschirm) */
  const w = async (dx) => { const y = 600; await finger(cdp, 'touchStart', 200, y); for (let i = 1; i <= 5; i++) { await finger(cdp, 'touchMove', 200 + dx * i / 5, y + 4); await p.waitForTimeout(16); } await finger(cdp, 'touchEnd'); await p.waitForTimeout(350); };
  const ansicht = () => p.evaluate(() => (document.querySelector('#baumfeld, .bz-baum') ? 'baum' : document.querySelector('.w-tag') ? 'plan' : document.querySelector('.fotokat') ? 'start' : '?'));
  await w(-140); ok(await ansicht() === 'baum', 'nach links wischen: Rezepte → Ordner', await ansicht());
  await w(-140); ok(await ansicht() === 'plan', 'noch einmal: → Planer', await ansicht());
  await w(140); ok(await ansicht() === 'baum', 'nach rechts wischen: zurück zum Ordner', await ansicht());
  await w(-30); ok(await ansicht() === 'baum', 'ein kurzer Wisch (30 px) wechselt nicht');
  await geh(p, 'start'); await p.waitForSelector('.fotokat');
  const fk = await p.locator('.fotokat').evaluate((e) => { const r = e.getBoundingClientRect(); return { y: r.top + r.height / 2, quer: e.scrollWidth > e.clientWidth }; });
  if (fk.quer) { await finger(cdp, 'touchStart', 300, fk.y); for (let i = 1; i <= 5; i++) await finger(cdp, 'touchMove', 300 - 30 * i, fk.y); await finger(cdp, 'touchEnd'); await p.waitForTimeout(350); ok(await ansicht() === 'start', 'auf der waagerecht rollenden Kategorie-Leiste wird nicht gewechselt'); }
  else ok(true, '(Kategorie-Leiste rollt hier nicht quer – nicht messbar)');
  await p.locator('.karte[data-uid=r-1]').click(); await p.waitForSelector('.rezept-held h1'); await w(-140);
  ok(await p.locator('.rezept-held h1').count() === 1, 'im offenen Rezept wechselt ein Wisch den Bildschirm nicht');
  await k.close();

  console.log('6 · Maus am breiten Schirm: ziehen ohne Langdruck; kein Wischen');
  ({ p, k } = await seite(1280, false));
  await p.click('.fotokat [data-kat=backen]'); await p.waitForSelector('.gitter.eins .karte');
  const m1 = await mitte(p, '.karte[data-uid=r-4]'), m2 = await mitte(p, '.karte[data-uid=r-1]'), rechtsVorher = await p.locator('.md-detail .rezept-held h1').innerText().catch(() => '');
  await p.mouse.move(m1.x, m1.y); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(m1.x + (m2.l + 10 - m1.x) * i / 8, m1.y + (m2.y - m1.y) * i / 8);
  ok(await p.locator('.karte.ziel-vor[data-uid=r-1]').count() === 1 && await p.locator('.bz-geist').count() === 1, 'während des Ziehens: Strich vor der Zielkarte, Schattenbild mit dem Namen');
  await p.mouse.up(); z = await bestandWenn(p, (b) => folge(b, 'backen') !== 'Apfelkuchen,Brot,Cremetorte,Dinkelbrötchen');
  ok(folge(z, 'backen') === 'Dinkelbrötchen,Apfelkuchen,Brot,Cremetorte', 'mit der Maus vor den Apfelkuchen gezogen', folge(z, 'backen'));
  ok(await p.locator('.kz-zieht, .bz-geist, .ziel-vor, .ziel-nach').count() === 0 && (await p.locator('.md-detail .rezept-held h1').innerText().catch(() => '')) === rechtsVorher, 'danach bleibt kein Strich und kein Schattenbild stehen, kein Rezept geht auf');
  await p.waitForTimeout(500);
  /* ein Zug, der nichts ändert (Dinkelbrötchen steht schon vor dem Apfelkuchen): kein Strich bleibt, keine Meldung */
  const n1 = await mitte(p, '.karte[data-uid=r-4]'), n2 = await mitte(p, '.karte[data-uid=r-1]');
  await p.mouse.move(n1.x, n1.y); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(n1.x + (n2.l + 10 - n1.x) * i / 8, n1.y + (n2.y - n1.y) * i / 8); await p.mouse.up(); await p.waitForTimeout(200);
  ok(await p.locator('.ziel-vor, .ziel-nach, .kz-zieht').count() === 0, 'ein Zug, der nichts ändert, lässt keinen Strich stehen');
  /* gezogen und auf derselben Karte losgelassen: der Browser schickt einen Klick, das Rezept geht trotzdem nicht auf */
  const vor2 = await p.locator('.md-detail .rezept-held h1').innerText().catch(() => ''), q = await mitte(p, '.karte[data-uid=r-3]');
  await p.mouse.move(q.x, q.y); await p.mouse.down(); await p.mouse.move(q.x + 40, q.y, { steps: 4 }); await p.mouse.move(q.x, q.y, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(250);
  ok((await p.locator('.md-detail .rezept-held h1').innerText().catch(() => '')) === vor2 && vor2 !== 'Cremetorte', 'gezogen und auf derselben Karte losgelassen: das Rezept geht nicht auf', vor2);
  await p.waitForTimeout(450); await p.locator('.karte[data-uid=r-2]').click(); await p.waitForTimeout(300);
  ok(/Brot/.test(await p.locator('.md-detail .rezept-held h1').innerText().catch(() => '')), 'ein Klick öffnet das Rezept rechts wie bisher');
  await k.close();
  ok(!fehler.length, 'keine Fehler im Browser', fehler.slice(0, 3).join(' | '));
} catch (f) { rot++; console.log('  ✗ ROT: Absturz — ' + String(f?.message || f).split('\n')[0]); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0;
