// Probe der neuen PWA: R6 Doppelungen (Klaus 25.11.) – nach dem Einlesen die Liste der Paare mit Wahl je Paar, der Hinweis im
// Formular beim einzelnen Anlegen, und die Merkmale einer Variante (vegan, laktosefrei, glutenfrei). Echter Browser, echte Bilder
// (Verlauf als JPEG in zwei Qualitäten = dasselbe Bild, gespiegelter Verlauf = ein anderes). Aufruf: node tests/smoke_neu_doppel.mjs
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
const Z = (...n) => n.map((name) => ({ amt: '', unit: '', name, note: '' }));
const R = (n, name, extra = {}) => ({ uid: 'r-' + n, id: n, name, cat: 'fleisch', servings: 4, ings: Z('Rind', 'Zwiebeln', 'Paprika', 'Brühe'), steps: [{ txt: 'Alles schmoren.' }], created: '2026-11-01T10:00:00.000Z', modified: '2026-11-01T10:00:00.000Z', ...extra });

async function seite(rezepte, breite = 390) {
  const k = await browser.newContext({ viewport: { width: breite, height: 860 }, serviceWorkers: 'block', locale: 'de-DE' }), p = mitThemen(await k.newPage());
  p.on('pageerror', (e) => fehler.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && fehler.push(m.text()));
  await p.route(/^https?:\/\/(?!localhost)/, (r) => { fehler.push('Netz nach draußen: ' + r.request().url()); r.abort(); });
  await p.goto(ORT + 'app.css');
  await p.evaluate((rezepte) => new Promise((ja, nein) => { const a = indexedDB.open('KuechenKern-rezeptbuch', 1); a.onupgradeneeded = () => a.result.createObjectStore('zustand'); a.onerror = () => nein(a.error); a.onsuccess = () => { const t = a.result.transaction('zustand', 'readwrite'); t.objectStore('zustand').put({ fassung: 1, einstellungen: { ton: 'hell' }, zustand: { rezepte, ordner: [], menu: [], kategorien: {}, plan: {} } }, 'alles'); t.oncomplete = () => { a.result.close(); ja(); }; }; }), rezepte);
  await p.goto(URL0); await p.waitForSelector('.gruss'); return { p, k };
}
const bestand = (p) => p.evaluate(() => new Promise((ja) => { const a = indexedDB.open('KuechenKern-rezeptbuch'); a.onsuccess = () => { const q = a.result.transaction('zustand').objectStore('zustand').get('alles'); q.onsuccess = () => { a.result.close(); ja(q.result.zustand); }; }; }));
const bestandWenn = async (p, pruef) => { let b = await bestand(p); for (let i = 0; i < 40 && !pruef(b); i++) { await p.waitForTimeout(100); b = await bestand(p); } return b; };
const geh = async (p, z) => { await p.keyboard.press('Escape'); if (await p.locator(`.rail-n[data-zu=${z}]`).count()) { await p.click(`.rail-n[data-zu=${z}]`); return; } if (await p.locator('#leiste .fl-griff').count()) await p.click('#leiste .fl-griff'); await p.click(`#leiste [data-zu=${z}]`); };
const einlesen = async (p, rezepte) => { await geh(p, 'werkstatt'); await p.setInputFiles('#datei-sicherung', { name: 'neu.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 11, recipes: rezepte, menu: [], folders: [] })) }); await p.waitForSelector('[data-a=datei-dazu]'); await p.click('[data-a=datei-dazu]'); };
const toast = (p) => p.locator('#toast').innerText().catch(() => '');

/* Bilder: ein Verlauf als JPEG 0.92 und 0.4 (dasselbe Bild, andere Bytes) und der gespiegelte Verlauf (ein anderes Bild). */
const bk = await browser.newContext(), bp = await bk.newPage(); await bp.goto(ORT + 'app.css');
const [G1, G1b, G2] = await bp.evaluate(() => { const mal = (spiegel, q) => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d'); const v = g.createLinearGradient(0, 0, 320, 240); v.addColorStop(spiegel ? 1 : 0, '#c0392b'); v.addColorStop(0.5, '#f1c40f'); v.addColorStop(spiegel ? 0 : 1, '#2c3e50'); g.fillStyle = v; g.fillRect(0, 0, 320, 240); g.fillStyle = '#fff'; g.fillRect(spiegel ? 40 : 230, 60, 50, 120); return c.toDataURL('image/jpeg', q); }; return [mal(false, 0.92), mal(false, 0.4), mal(true, 0.92)]; });
await bk.close();
ok(G1 !== G1b && G1 !== G2, 'Selbst-Riegel: die drei Bilder sind verschiedene Dateien');

const BESTAND = [R(1, 'Gulasch'), R(2, 'Bauernbrot', { cat: 'backen', ings: Z('Roggenmehl', 'Sauerteig', 'Salz'), img: G1 }), R(3, 'Mojito', { cat: 'getraenke', ings: Z('Rum', 'Minze', 'Limette', 'Rohrzucker'), alcohol: true }), R(4, 'Pfannkuchen', { cat: 'dessert', ings: Z('Mehl', 'Milch', 'Eier', 'Salz') })];
const DATEI = [R(11, 'Gulasch', { ings: Z('Rindfleisch', 'Zwiebel', 'Paprika', 'Brühe', 'Kümmel'), steps: [{ txt: 'Anbraten.' }, { txt: 'Zwei Stunden schmoren.' }], cat: 'eintopf' }),
  R(12, 'Sonntagsbrot', { cat: 'backen', ings: Z('Dinkelmehl', 'Hefe', 'Wasser'), img: G1b }),
  R(13, 'Virgin Mojito', { cat: 'getraenke', ings: Z('Minze', 'Limette', 'Rohrzucker', 'Soda'), alcohol: false }),
  R(14, 'Pfannkuchen', { cat: 'dessert', ings: Z('Mehl', 'Haferdrink', 'Eier', 'Salz'), merkmale: ['laktosefrei'] }),
  R(15, 'Helles Brot', { cat: 'backen', ings: Z('Weizenmehl', 'Hefe', 'Milch'), img: G2 }),
  R(16, 'Apfelkuchen', { cat: 'backen', ings: Z('Äpfel', 'Mehl', 'Butter', 'Zucker') })];

try {
  for (const breite of [390, 1280]) {
    console.log(`1 · Einlesen mit Doppeln (${breite} px)`);
    const { p, k } = await seite(BESTAND, breite);
    await einlesen(p, DATEI); await p.waitForSelector('#doppel-liste', { timeout: 15000 });
    let z = await bestandWenn(p, (b) => b.rezepte.length === 10);
    ok(z.rezepte.length === 10, 'alles kommt zuerst herein (4 + 6), nichts geht verloren, solange nicht gewählt ist', String(z.rezepte.length));
    const paare = await p.locator('.dp').evaluateAll((l) => l.map((e) => [e.dataset.neu, e.querySelector('.dp-stufe').className.split(' ')[1], e.querySelector('[aria-pressed=true]')?.dataset.w]));
    ok(JSON.stringify(paare) === JSON.stringify([['r-11', 'sicher', 'meins'], ['r-12', 'vielleicht', 'beide']]), 'genau zwei Paare: Gulasch sicher (Vorgabe „Meins behalten“), Sonntagsbrot über das gleiche Bild vielleicht (Vorgabe „Beide“)', JSON.stringify(paare));
    ok(!paare.some(([u]) => ['r-13', 'r-14', 'r-15', 'r-16'].includes(u)), 'kein Doppel: Virgin Mojito (alkoholfrei), laktosefreie Pfannkuchen (Merkmal), Helles Brot (anderes Bild), Apfelkuchen');
    ok(/gleiches Bild/.test(await p.locator('.dp[data-neu="r-12"] .dp-kopf').innerText()) && /Name gleich/.test(await p.locator('.dp[data-neu="r-11"] .dp-kopf').innerText()), 'je Paar steht der Grund da (Name gleich · Zutaten … · gleiches Bild)');
    ok(await p.locator('.dp[data-neu="r-11"] [data-w=bild]').count() === 0 && await p.locator('.dp[data-neu="r-12"] [data-w=bild]').count() === 1, '„Bild vom neuen“ nur, wenn das neue ein Bild hat');
    const quer = await p.locator('.fenster').evaluate((f) => f.scrollWidth <= f.clientWidth + 1 && [...f.querySelectorAll('.dp-wahl .chip')].every((b) => { const r = b.getBoundingClientRect(), q = f.getBoundingClientRect(); return r.right <= q.right + 1 && r.height >= 32; }));
    ok(quer, 'das Fenster läuft nicht quer über, jeder Knopf ist groß genug für den Finger');
    await p.click('.dp[data-neu="r-11"] [data-w=ganz]'); await p.click('.dp[data-neu="r-12"] [data-w=bild]');
    ok(await p.locator('.dp[data-neu="r-11"] [aria-pressed=true]').getAttribute('data-w') === 'ganz' && await p.locator('.dp[data-neu="r-11"] [aria-pressed=true]').count() === 1, 'je Paar ist genau eine Wahl gedrückt');
    await p.click('[data-a=dp-fertig]');
    z = await bestandWenn(p, (b) => b.rezepte.length === 8);
    const g = z.rezepte.find((r) => r.uid === 'r-1'), b = z.rezepte.find((r) => r.uid === 'r-2');
    ok(z.rezepte.length === 8 && !z.rezepte.some((r) => r.uid === 'r-11' || r.uid === 'r-12'), 'die beiden neuen sind nach der Wahl weg, alle anderen bleiben', String(z.rezepte.length));
    ok(g.ings.length === 5 && g.steps.length === 2 && g.cat === 'fleisch' && g.id === 1, '„Ganz das neue“: Zutaten und Schritte vom neuen, Kategorie und Platz von meinem', JSON.stringify([g.ings.length, g.steps.length, g.cat, g.id]));
    ok(b.img === G1b && b.name === 'Bauernbrot' && b.ings.length === 3, '„Bild vom neuen“: nur das Bild wechselt, Name und Zutaten bleiben');
    ok(/2 Doppel zusammengeführt/.test(await toast(p)), 'die Meldung sagt es und bietet Rückgängig', await toast(p));
    await p.click('#toast [data-a=toast-tun]'); z = await bestandWenn(p, (x) => x.rezepte.length === 10);
    ok(z.rezepte.length === 10 && z.rezepte.find((r) => r.uid === 'r-1').ings.length === 4, 'Rückgängig: beide wieder da, mein Gulasch wie vorher');
    await k.close();
  }

  console.log('2 · „Später“ behält beide; ein zweites Einlesen derselben Datei fragt nicht (gleiche Kennungen)');
  { const { p, k } = await seite(BESTAND);
    await einlesen(p, DATEI); await p.waitForSelector('#doppel-liste', { timeout: 15000 });
    await p.click('.fenster [data-a=fenster-zu]'); let z = await bestandWenn(p, (b) => b.rezepte.length === 10); await p.waitForTimeout(300);
    ok(z.rezepte.length === 10 && await p.locator('.fenster').count() === 0, '„Später“ schließt, beide bleiben');
    await einlesen(p, DATEI); await p.waitForTimeout(1500);
    ok(await p.locator('#doppel-liste').count() === 0 && /6 schon da/.test(await toast(p)), 'dieselbe Datei noch einmal: „6 schon da“, kein Doppel-Fenster', await toast(p));
    await k.close(); }

  console.log('3 · Hinweis im Formular beim einzelnen Anlegen');
  { const { p, k } = await seite(BESTAND);
    const neuForm = async (name, zutaten) => { await p.locator('[data-a=neu]:visible').first().click(); await p.click('[data-a=neu-form]'); await p.waitForSelector('[data-form=rezept]'); await p.fill('[name=name]', name); await p.fill('[name=ings]', zutaten); await p.fill('[name=steps]', 'Kochen.'); await p.click('[data-form=rezept] button[type=submit]'); };
    await neuForm('Gulasch nach Omas Art', '500 g Rind\n2 Zwiebeln\nPaprika\nBrühe');
    await p.waitForSelector('#form-doppel', { timeout: 8000 }).catch(() => {});
    let z = await bestand(p);
    ok(await p.locator('#form-doppel').count() === 1 && z.rezepte.length === 4, 'ähnliches Rezept: ein Band im Formular statt Speichern, kein Zwischenfenster', String(z.rezepte.length));
    ok(/Gulasch/.test(await p.locator('#form-doppel').innerText()) && await p.locator('#form-doppel [data-w=bild]').count() === 0, 'das Band nennt das vorhandene Rezept; ohne Foto kein „Nur das Bild“');
    ok(await p.inputValue('[name=name]') === 'Gulasch nach Omas Art', 'die Eingaben bleiben im Formular stehen');
    await p.click('#form-doppel [data-w=text]'); await p.waitForSelector('.rezept-held h1');
    z = await bestandWenn(p, (b) => b.rezepte.find((r) => r.uid === 'r-1').name !== 'Gulasch');
    ok(z.rezepte.length === 4 && z.rezepte.find((r) => r.uid === 'r-1').name === 'Gulasch nach Omas Art', '„Nur den Text übernehmen“: kein neues Rezept, mein Gulasch trägt den neuen Text', JSON.stringify(z.rezepte.map((r) => r.name)));
    ok(/übernommen/.test(await toast(p)), 'die Meldung sagt es', await toast(p));
    await neuForm('Mojito', 'Rum\nMinze\nLimette\nRohrzucker'); await p.waitForSelector('#form-doppel', { timeout: 8000 });
    await p.click('#form-doppel [data-w=eigen]'); await p.waitForSelector('.rezept-held h1');
    z = await bestandWenn(p, (b) => b.rezepte.length === 5); ok(z.rezepte.length === 5, '„Als eigenes Rezept speichern“ legt es an');
    await neuForm('Linsensuppe', 'Linsen\nKarotten\nSpeck'); await p.waitForSelector('.rezept-held h1', { timeout: 8000 });
    z = await bestandWenn(p, (b) => b.rezepte.length === 6); ok(z.rezepte.length === 6, 'ohne Ähnliches wird sofort gespeichert, ohne Band');

    console.log('4 · Merkmale einer Variante');
    ok(await p.locator('.merkmale .merk').count() === 3 && await p.locator('.merkmale [aria-pressed=true]').count() === 0, 'drei Merkmale an der Leiste, keins gesetzt');
    await p.click('.merkmale [data-m=laktosefrei]'); z = await bestandWenn(p, (b) => b.rezepte.find((r) => r.name === 'Linsensuppe').merkmale);
    ok(JSON.stringify(z.rezepte.find((r) => r.name === 'Linsensuppe').merkmale) === '["laktosefrei"]' && await p.locator('.merkmale [data-m=laktosefrei][aria-pressed=true]').count() === 1, 'ein Tipp setzt „laktosefrei“, direkt, ohne Fenster');
    await p.click('.merkmale [data-m=vegan]'); z = await bestandWenn(p, (b) => (b.rezepte.find((r) => r.name === 'Linsensuppe').merkmale || []).length === 2);
    ok(JSON.stringify(z.rezepte.find((r) => r.name === 'Linsensuppe').merkmale) === '["vegan","laktosefrei"]', 'zwei Merkmale, in fester Reihenfolge');
    await geh(p, 'start'); ok(/🌱🥛/.test(await p.locator('.karte', { hasText: 'Linsensuppe' }).first().innerText()), 'die Karte in der Liste zeigt die Merkmale');
    await p.locator('.karte', { hasText: 'Linsensuppe' }).first().click(); await p.waitForSelector('.merkmale');
    await p.click('.merkmale [data-m=vegan]'); await p.click('.merkmale [data-m=laktosefrei]'); z = await bestandWenn(p, (b) => !b.rezepte.find((r) => r.name === 'Linsensuppe').merkmale);
    ok(!('merkmale' in z.rezepte.find((r) => r.name === 'Linsensuppe')), 'ein zweiter Tipp nimmt es wieder weg, ohne Rest im Rezept');
    await k.close(); }

  ok(!fehler.length, 'keine Fehler im Browser', fehler.slice(0, 3).join(' | '));
} catch (f) { rot++; console.log('  ✗ ROT: Absturz — ' + String(f?.message || f).split('\n')[0]); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0;
