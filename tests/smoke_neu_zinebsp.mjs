// Probe der neuen PWA: R22 (Klaus 25.11., seine Bilder) – ein Beispielbild je Food-Zine-Format: klein in der Kachel, groß bei Maus
// darauf oder langem Druck, erst dann geladen; ein Tipp wählt weiter das Format. Aufruf: node tests/smoke_neu_zinebsp.mjs · WURZEL=<Kopie>
import { createRequire } from 'node:module';
import { mitThemen } from './neu-hilfe.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join } from 'node:path';
const WURZEL = process.env.WURZEL || process.cwd();
const TYP = { '.webp': 'image/webp', '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
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

/* Ohne die Maus der Probe zu bewegen (dispatchEvent): sonst stünde ihr Zeiger nach dem Öffnen über einer Kachel, und das wäre ein echtes Darüberfahren. */
const zumZine = async (p) => { await p.keyboard.press('Escape'); for (const sel of ['.rail-n[data-zu=kreativ]', '#leiste .fl-griff', '#leiste [data-zu=kreativ]']) if (await p.locator(sel).count()) { await p.locator(sel).first().dispatchEvent('click'); if (sel !== '#leiste .fl-griff') break; await p.waitForTimeout(150); } await p.waitForSelector('.kr-teil [data-a=zine-auf]'); await p.locator('.kr-teil [data-a=zine-auf]').dispatchEvent('click'); await p.waitForSelector('#zine-ansicht'); };
try {
  for (const [breite, handy] of [[390, true], [1280, false]]) {
    console.log(`1 · Kacheln (${breite} px)`);
    const { p, k, cdp } = await seite(breite, handy), geholt = []; p.on('request', (r) => { if (/zine-beispiele/.test(r.url())) geholt.push(r.url().replace(/.*zine-beispiele\//, '').replace(/\?.*/, '')); });
    await zumZine(p); await p.locator('.zn-format').first().scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
    const kacheln = await p.locator('.zn-format').evaluateAll((l) => l.map((b) => { const i = b.querySelector('img.zn-bsp'); const r = i?.getBoundingClientRect(); return { f: b.dataset.f, ok: !!i && i.complete && i.naturalWidth > 0, h: r?.height || 0, w: r?.width || 0, bw: b.getBoundingClientRect().width }; }));
    ok(kacheln.length === 6 && kacheln.every((x) => x.ok), 'jede der sechs Kacheln zeigt ihr Beispielbild', JSON.stringify(kacheln.filter((x) => !x.ok).map((x) => x.f)));
    ok(kacheln.every((x) => x.h >= 60 && x.w <= x.bw), 'das Bild ist sichtbar groß und passt in die Kachel', JSON.stringify(kacheln.map((x) => [x.f, Math.round(x.w), Math.round(x.h)])));
    ok(!geholt.some((x) => /gross/.test(x)), 'die großen Bilder sind noch nicht geladen', geholt.join(','));
    ok(await p.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1), 'nichts läuft quer über');
    const vorher = await p.locator('.zn-format[aria-checked=true]').getAttribute('data-f');
    console.log('2 · groß ansehen');
    const kz = await p.locator('.zn-format[data-f=zeitung]').evaluate((e) => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (handy) { await finger(cdp, 'touchStart', kz.x, kz.y); await p.waitForTimeout(650); }
    else { await p.mouse.move(kz.x, kz.y); await p.waitForTimeout(300); }
    const gross = await p.locator('#zn-gross img').evaluate((i) => new Promise((ja) => { const fertig = () => { const r = i.getBoundingClientRect(); ja({ ok: i.naturalWidth > 1000, w: r.width, h: r.height, src: i.src }); }; i.complete ? fertig() : (i.onload = fertig, i.onerror = fertig); })).catch(() => null);
    ok(!!gross?.ok && /zeitung-gross/.test(gross.src), handy ? 'lange drücken: das große Zeitungs-Beispiel erscheint' : 'Maus darauf: das große Zeitungs-Beispiel erscheint', JSON.stringify(gross));
    ok(!!gross && gross.w <= breite && gross.w > breite * 0.5, 'groß heißt groß, aber im Bild', JSON.stringify(gross && [gross.w, gross.h]));
    if (handy) { await finger(cdp, 'touchEnd'); await p.waitForTimeout(250); } else { await p.mouse.move(5, 5); await p.waitForTimeout(150); }
    ok(await p.locator('#zn-gross').count() === 0, handy ? 'loslassen schließt es' : 'Maus weg schließt es');
    ok(await p.locator('.zn-format[aria-checked=true]').getAttribute('data-f') === vorher, 'das Ansehen wählt das Format nicht');
    await p.waitForTimeout(600);
    if (handy) { await finger(cdp, 'touchStart', kz.x, kz.y); await p.waitForTimeout(60); await finger(cdp, 'touchEnd'); } else await p.mouse.click(kz.x, kz.y);
    await p.waitForTimeout(250);
    ok(await p.locator('.zn-format[aria-checked=true]').getAttribute('data-f') === 'zeitung', 'ein kurzer Tipp wählt das Format wie bisher');
    ok(await p.locator('#zn-gross').count() === (handy ? 0 : 1), handy ? 'nach dem Tipp steht kein großes Bild' : '(Maus steht noch darauf: das Bild bleibt)');
    await k.close();
  }
  const sw = await readFile(join(WURZEL, 'neu/sw.js'), 'utf8');
  ok(['poster', 'a4', 'insta', 'zeitung', 'karte', 'panorama'].every((f) => sw.includes(`./zine-beispiele/${f}-klein.webp?v=1`)) && !/zine-beispiele\/[a-z0-9]+-gross/.test(sw), 'die kleinen Bilder liegen im Offline-Vorrat, die großen nicht');
  ok(!fehler.length, 'keine Fehler im Browser', fehler.slice(0, 3).join(' | '));
} catch (f) { rot++; console.log('  ✗ ROT: Absturz — ' + String(f?.message || f).split('\n')[0]); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0;
