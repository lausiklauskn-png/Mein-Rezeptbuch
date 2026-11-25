// Probe der neuen PWA: Rezeptansicht am breiten Schirm (Klaus 25.11. abends) – Bild so hoch wie nötig, Knopf im Bild, „nur das Rezept“ im
// Vollbild, zweite Spalte nur wenn das Rezept sonst nicht passt. Echter Browser. WURZEL=<Pfad> misst eine Kopie.
import { createRequire } from 'node:module';
import { mitThemen } from './neu-hilfe.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join } from 'node:path';
const WURZEL = process.env.WURZEL || process.cwd();
const TYP = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer(async (q, a) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; try { const d = await readFile(join(WURZEL, p)); a.writeHead(200, { 'content-type': TYP[extname(p)] || 'application/octet-stream' }); a.end(d); } catch { a.writeHead(404); a.end(); } }).listen(0);
const URL0 = `http://localhost:${srv.address().port}/neu/?leer`;
let gruen = 0, rot = 0; const ok = (b, t, mehr = '') => { if (b) { gruen++; console.log('  ✓ ' + t); } else { rot++; console.log('  ✗ ROT: ' + t + (mehr ? ' — ' + mehr : '')); } };
process.on('unhandledRejection', (e) => { rot++; console.log('  ✗ ROT: Absturz — ' + String(e?.message || e).split('\n')[0]); });
const browser = await chromium.launch(); const fehler = [];
const zuRezept = async (p, name) => { await p.goto(URL0); await p.waitForSelector('.gruss'); await p.click('[data-a=beispiel]'); await p.waitForSelector('.karte', { timeout: 20000 }); await p.locator('.karte', { hasText: name }).first().click(); await p.waitForSelector('.rezept-held h1'); await p.waitForTimeout(700); };
const mass = (p) => p.evaluate(() => { const d = document.querySelector('.md-detail'), i = document.querySelector('.rezept-held>img'), k = document.querySelector('.held-voll'), h = document.querySelector('.rezept-held h1'); const ri = i.getBoundingClientRect(), rk = k.getBoundingClientRect(); return { spalten: d ? [...d.classList].filter((c) => c.startsWith('spalten')).join(' ') : '', ueber: d ? d.scrollHeight - d.clientHeight : 0, ih: ri.height, iw: ri.width, ratio: i.naturalWidth / i.naturalHeight, knopfImBild: rk.bottom <= ri.bottom + 1 && rk.top >= ri.top && rk.right <= ri.right + 1, titelUnter: h.getBoundingClientRect().top >= ri.bottom - 1, kopf: !!document.querySelector('.kopf')?.offsetWidth, liste: !!document.querySelector('.md-liste')?.offsetWidth }; });
try {
  console.log('1 · geteilter Schirm (1000 × 900): Bild so hoch wie nötig (unter der Obergrenze, sonst wäre es nicht zu unterscheiden)');
  let k = await browser.newContext({ locale: 'de-DE', viewport: { width: 1000, height: 900 }, serviceWorkers: 'block' }), p = await k.newPage(); p.on('pageerror', (e) => fehler.push(e.message));
  await zuRezept(p, 'Gyoza'); let m = await mass(p);
  ok(Math.abs(m.ih - Math.min(m.iw / m.ratio, 900 * 0.36)) <= 2, 'die Bildhöhe ist die des Bildes bei dieser Breite (keine leere Fläche darüber und darunter), höchstens ein gutes Drittel der Höhe', JSON.stringify(m));
  ok(m.knopfImBild && m.titelUnter, 'der Vollbild-Knopf sitzt im Bild, der Titel steht darunter');
  ok(m.spalten === '', 'im schmalen Teil keine zweite Spalte (zu schmal)'); await k.close();
  console.log('2 · 1280 × 720: „nur das Rezept“ und Spalten nur wenn nötig');
  k = await browser.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' }); p = await k.newPage(); p.on('pageerror', (e) => fehler.push(e.message));
  await zuRezept(p, 'Gyoza'); await p.click('.held-voll'); await p.waitForTimeout(700); m = await mass(p);
  ok(!m.kopf && !m.liste, 'nur das Rezept: Navi-Leiste und Liste sind weg');
  ok(/spalten/.test(m.spalten), 'Gyoza (13 Zutaten, 8 Schritte) passt nicht: Spalten werden genommen', m.spalten + ' · ' + m.ueber);
  const ohne = await p.evaluate(() => { const d = document.querySelector('.md-detail'), c = [...d.classList].filter((x) => x.startsWith('spalten')); d.classList.remove(...c); const u = d.scrollHeight - d.clientHeight; d.classList.add(...c); return u; });
  ok(m.ueber < ohne - 100, 'mit Spalten steht deutlich weniger über als ohne', `${m.ueber} statt ${ohne}`);
  await p.click('.held-voll'); await p.waitForTimeout(400); m = await mass(p); ok(m.kopf && m.liste && m.spalten === '', 'zurück: Leiste und Liste wieder da, im geteilten Schirm keine Spalten');
  await p.locator('.md-liste .karte', { hasText: 'Gurkensalat' }).first().click().catch(() => {}); await k.close();
  console.log('3 · ein kurzes Rezept bekommt keine Spalten; am Handy nie');
  k = await browser.newContext({ locale: 'de-DE', viewport: { width: 1920, height: 1080 }, serviceWorkers: 'block' }); p = await k.newPage(); p.on('pageerror', (e) => fehler.push(e.message));
  await zuRezept(p, 'Gyoza'); await p.click('.held-voll'); await p.waitForTimeout(700); m = await mass(p);
  const ohne2 = await p.evaluate(() => { const d = document.querySelector('.md-detail'), c = [...d.classList].filter((x) => x.startsWith('spalten')); d.classList.remove(...c); const u = d.scrollHeight - d.clientHeight; d.classList.add(...c); return u; });
  ok(m.spalten === '' ? ohne2 <= 4 : ohne2 > 4 && m.ueber <= 4, 'Spalten gibt es nur, wenn das Rezept ohne sie nicht passt – und mit ihnen passt es hier ganz', `${m.spalten || 'keine'} · ohne ${ohne2}, mit ${m.ueber}`);
  await p.click('.held-voll'); await p.waitForTimeout(300); await p.locator('.md-liste .karte').last().click(); await p.waitForTimeout(500); await p.click('.held-voll'); await p.waitForTimeout(700);
  const kurz = await p.evaluate(() => { const d = document.querySelector('.md-detail'), c = [...d.classList].filter((x) => x.startsWith('spalten')); d.classList.remove(...c); const u = d.scrollHeight - d.clientHeight; d.classList.add(...c); return { u, c: c.join(' '), n: d.querySelectorAll('.schritte li').length }; });
  ok(kurz.u > 4 || kurz.c === '', 'ein Rezept, das ohne Spalten passt, bekommt keine', JSON.stringify(kurz)); await k.close();
  k = await browser.newContext({ locale: 'de-DE', viewport: { width: 390, height: 800 }, serviceWorkers: 'block' }); p = await k.newPage(); p.on('pageerror', (e) => fehler.push(e.message));
  await zuRezept(p, 'Gyoza'); ok(await p.locator('.spalten').count() === 0, 'am Handy keine Spalten'); await k.close();
  ok(fehler.length === 0, 'keine Fehler in der Konsole', fehler.join(' · '));
} catch (e) { rot++; console.log('  ✗ ROT: Probe abgebrochen — ' + e.message.split('\n')[0]); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0;
