// Probe der neuen PWA (neu/): echter Browser, gebaut wird nichts. Aufruf: node tests/smoke_neu.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');   // global eingerichtet (require findet es, import nicht)
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join } from 'node:path';
const TYP = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = http.createServer(async (q, a) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; try { const d = await readFile(join(process.cwd(), p)); a.writeHead(200, { 'content-type': TYP[extname(p)] || 'application/octet-stream' }); a.end(d); } catch { a.writeHead(404); a.end(); } }).listen(0);
const URL0 = `http://localhost:${srv.address().port}/neu/`;
let gruen = 0, rot = 0; const ok = (b, t, mehr = '') => { if (b) { gruen++; console.log('  ✓ ' + t); } else { rot++; console.log('  ✗ ROT: ' + t + (mehr ? ' — ' + mehr : '')); } };
const browser = await chromium.launch(); const fehler = [];
async function seite(vorher) { const k = await browser.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true }); const p = await k.newPage(); p.on('pageerror', (e) => fehler.push(e.message)); p.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
  await p.route(/^https?:\/\/(?!localhost)/, (r) => { fehler.push('Netz nach draußen: ' + r.request().url()); r.abort(); });
  if (vorher) { await p.goto(URL0 + 'app.css'); await p.evaluate(vorher); } await p.goto(URL0); await p.waitForSelector('.gruss'); return { p, k }; }
try {
  console.log('1 · Leerer Start, Beispielbuch');
  let { p, k } = await seite();
  ok(await p.locator('.leer').count() === 1, 'leeres Buch zeigt die Begrüßung mit drei Wegen');
  ok((await p.locator('header.kopf button').count()) === 2, 'Kopf eingeklappt: nur + und Pfeil');
  await p.click('[data-a=beispiel]'); await p.waitForSelector('.karte', { timeout: 20000 });
  const karten = await p.locator('.karte').count(); ok(karten === 42, 'Beispielbuch: 42 Rezepte als Karten', String(karten));
  const kats = await p.locator('.fotokat button').allInnerTexts();
  ok(kats.some((t) => /^Sushi\s+7$/.test(t.trim())), 'Kategorie heißt „Sushi“ und zählt 7', kats.join(' | '));
  ok(!kats.some((t) => t.includes('eig_')), 'keine nackte Kennung in der Leiste');
  const summe = kats.slice(1).reduce((n, t) => n + +t.trim().match(/(\d+)$/)[1], 0); ok(summe === 42, 'Summe der Kategorien = Alle', String(summe));

  console.log('2 · Suche');
  await p.fill('#suchfeld', 'sushi'); const tr = await p.locator('.karte').count(); ok(tr === 7, 'Suche „sushi“ findet 7', String(tr));
  ok(await p.evaluate(() => document.activeElement?.id === 'suchfeld'), 'das Suchfeld behält den Fokus beim Tippen');
  await p.fill('#suchfeld', 'gibtesnicht'); ok(await p.locator('.karte').count() === 0 && (await p.locator('.leer').innerText()).includes('Nichts gefunden'), 'kein Treffer wird gesagt');
  await p.click('#suche-x'); ok(await p.locator('.karte').count() === 42, 'X leert die Suche');

  console.log('3 · Kategorie, Rezept, Portionen');
  await p.locator('.fotokat button', { hasText: 'Sushi' }).click(); ok(await p.locator('.karte').count() === 7, 'Tipp auf Sushi zeigt 7');
  await p.locator('.karte', { hasText: 'Dragon Roll' }).click(); await p.waitForSelector('.rezept-held h1');
  ok((await p.locator('h1').innerText()).includes('Dragon Roll'), 'Rezept öffnet');
  const vor = await p.locator('.zut li b').first().innerText(); await p.click('[data-a=portion][data-d="1"]'); await p.click('[data-a=portion][data-d="1"]');
  const nach = await p.locator('.zut li b').first().innerText(); ok(vor === '200 g' && nach === '400 g' && (await p.locator('#portionen').innerText()) === '4', 'Portionen 2 → 4 verdoppelt die Menge', `${vor} → ${nach}`);
  await p.goBack(); await p.waitForSelector('.fotokat'); ok(await p.locator('.karte').count() === 7, 'Zurück-Taste führt in die Kategorie zurück');

  console.log('4 · Anlegen, neue Kategorie, Neuladen');
  await p.click('[data-a=neu]'); await p.fill('[name=name]', 'Probe <b>Suppe</b>'); await p.fill('[name=katneu]', 'Eintöpfe');
  await p.fill('[name=ings]', '500 g Kartoffeln (mehlig)\n1 ½ l Brühe\nSalz'); await p.fill('[name=steps]', 'Schälen.\n\nKochen.'); await p.click('button[type=submit]');
  await p.waitForSelector('.rezept-held h1'); ok((await p.locator('h1').innerText()) === 'Probe <b>Suppe</b>', 'Name wird als Text gezeigt, nicht als HTML');
  const zl = await p.locator('.zut li').allInnerTexts(); ok(zl.length === 3 && zl[0].startsWith('500 g') && zl[0].includes('mehlig') && zl[1].startsWith('1 ½ l'), 'Zutaten: Menge, Einheit, Name, Notiz getrennt', zl.join(' | '));
  await p.waitForTimeout(400); await p.reload(); await p.waitForSelector('.fotokat');
  ok(await p.locator('.karte').count() === 43, 'nach Neuladen sind 43 Rezepte da'); ok((await p.locator('.fotokat button').allInnerTexts()).some((t) => /^Eintöpfe\s+1$/.test(t.trim())), 'die neue Kategorie ist da');

  console.log('5 · Sicherung hin und zurück, Beispiele entfernen');
  await p.click('[data-a=werkzeug]'); await p.click('.werkzeuge [data-zu=werkstatt]');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-a=sichern]')]); const pfad = await dl.path();
  const datei = JSON.parse(await readFile(pfad, 'utf8')); ok(datei.version === 11 && datei.recipes.length === 43 && datei.kategorien.eigene.length === 2, 'Sicherung: Fassung 11, 43 Rezepte, 2 eigene Kategorien');
  await p.click('[data-a=beispiele-weg]'); await p.click('[data-a=ja]'); await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=start]'); await p.waitForSelector('.karte');
  ok(await p.locator('.karte').count() === 1, 'Beispiele entfernt, das eigene Rezept bleibt');
  await p.setInputFiles('#datei-sicherung', pfad); await p.waitForFunction(() => document.querySelectorAll('.karte').length === 43);
  ok(true, 'Sicherung eingelesen: wieder 43, das eigene nicht doppelt'); ok((await p.locator('.fotokat button').allInnerTexts()).some((t) => /^Sushi\s+7$/.test(t.trim())), 'Sushi heißt nach dem Einlesen wieder Sushi');
  await k.close();

  console.log('6 · Übernahme aus der alten App');
  ({ p, k } = await seite(() => { localStorage.setItem('mrz9m', JSON.stringify([{ id: 1, name: 'Altes Rezept', cat: 'eig_1', blank: true, ings: [{ amt: '2', unit: 'EL', name: 'Öl' }], steps: [{ txt: 'braten' }] }, { id: 2, name: '', blank: true, cat: 'fisch' }])); localStorage.setItem('mrzcatsneu9m', JSON.stringify([{ id: 'eig_1', de: 'Neue Kategorie' }])); localStorage.setItem('mrzcats9m', JSON.stringify({ eig_1: { name: 'Pfanne', ico: '🍳' } })); localStorage.setItem('mrz9', JSON.stringify([{ id: 9, name: 'Muttis Braten', cat: 'fleisch' }])); }));
  await p.waitForSelector('.karte'); const namen = await p.locator('.karte strong').allInnerTexts();
  ok(namen.length === 1 && namen[0] === 'Altes Rezept', 'nur die Rezepte der eigenen Ausgabe, auch mit blank:true und Namen', namen.join(','));
  ok((await p.locator('.fotokat button').allInnerTexts()).some((t) => /Pfanne\s+1$/.test(t.trim()) && t.includes("🍳")), "eigene Kategorie kommt mit Namen und ihrem Zeichen");
  ok(await p.evaluate(() => localStorage.getItem('mrz9m') !== null && localStorage.getItem('mrz9') !== null), 'im alten Speicher ist nichts gelöscht');
  await k.close();

  console.log('7 · Leiste, Farbe, Breite');
  ({ p, k } = await seite());
  const g = await p.locator('#leiste .fl-griff').boundingBox(); await p.mouse.move(g.x + 5, g.y + 30); await p.mouse.down(); await p.waitForTimeout(500); await p.mouse.move(30, 300, { steps: 6 }); await p.mouse.up();
  ok(await p.locator('#leiste.l').count() === 1, 'Leiste rastet links ein'); await p.waitForTimeout(350); await p.reload(); await p.waitForSelector('.gruss'); ok(await p.locator('#leiste.l').count() === 1, 'die Lage ist gemerkt');
  await p.click('[data-a=werkzeug]'); await p.click('.werkzeuge .farbknopf'); await p.click('[data-farbe=dunkel]'); ok(await p.evaluate(() => document.documentElement.dataset.hell === 'dunkel'), 'Farbe Dunkelbraun gewählt');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'kein seitliches Verrutschen bei 390 px');
  await k.close();

  console.log('8 · Kochansicht');
  ({ p, k } = await seite()); await p.click('[data-a=beispiel]'); await p.waitForSelector('.karte', { timeout: 20000 });
  await p.fill('#suchfeld', 'Szegediner'); await p.locator('.karte').first().click(); await p.waitForSelector('[data-a=kochen]'); await p.click('[data-a=kochen]'); await p.waitForSelector('.koch');
  ok((await p.locator('.k-nr').innerText()).toUpperCase() === 'SCHRITT 1 VON 5', 'Kochansicht öffnet bei Schritt 1 von 5', await p.locator('.k-nr').innerText());
  const zt = await p.locator('.k-nurschmal .k-zut span').allInnerTexts(); ok(zt.some((t) => t.includes('Knoblauch')) && zt.some((t) => t.includes('Zwiebeln')) && !zt.some((t) => t.includes('Sauerkraut')), 'nur die Zutaten dieses Schritts', zt.join(' | '));
  ok((await p.locator('.k-nurschmal .gr-k').allInnerTexts()).join().includes('Messer'), 'Geräte des Schritts als Kacheln');
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
  ok((await p.locator('.k-nr').innerText()).includes('4'), 'Pfeiltaste blättert'); ok(await p.locator('.k-nurschmal .k-timer').count() === 1 && (await p.locator('#k-zeit').first().innerText()).includes('120'), 'Zeit im Schritt (90–120 Minuten) gibt einen Wecker', await p.locator('#k-zeit').first().innerText().catch(() => 'kein Wecker'));
  await p.locator('.k-nurschmal .k-timer').click(); await p.waitForTimeout(1200); ok(/^119:5\d$/.test(await p.locator('#k-zeit').first().innerText()), 'der Wecker läuft', await p.locator('#k-zeit').first().innerText());
  await p.click('[data-a=k-kopf]'); ok(await p.locator('.k-kopf').count() === 0 && await p.locator('.k-kopf-zu .k-balken').count() === 1, 'Kopf klappt auf die Fortschrittslinie zusammen');
  await p.keyboard.press('Escape'); await p.waitForSelector('.koch', { state: 'detached' }); ok(await p.locator('.rezept-held h1').count() === 1, 'Esc schließt und führt zum Rezept zurück');
  await k.close();

  console.log('9 · Monitor: Leiste links, Liste, Rezept');
  { const kk = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const q = await kk.newPage(); q.on('pageerror', (e) => fehler.push(e.message));
    await q.goto(URL0); await q.waitForSelector('.gruss'); await q.click('[data-a=beispiel]'); await q.waitForSelector('.md-detail h1', { timeout: 20000 });
    ok(await q.locator('.md-liste .karte').count() === 42 && await q.locator('.md-detail h1').count() === 1, 'Liste links, Rezept rechts');
    ok(await q.locator('#leiste').isHidden() && await q.locator('.rail-n').count() === 3, 'Leiste steht links, kein Griff am Rand');
    await q.locator('.md-liste').evaluate((e) => { e.scrollTop = 600; }); await q.locator('.md-liste .karte', { has: q.getByText('Ebi Tempura', { exact: true }) }).click();
    ok((await q.locator('.md-detail h1').innerText()) === 'Ebi Tempura' && await q.locator('.md-liste').evaluate((e) => e.scrollTop) > 300, 'Tipp links wechselt das Rezept rechts, die Liste bleibt an ihrer Stelle', (await q.locator('.md-detail h1').innerText()) + ' / ' + await q.locator('.md-liste').evaluate((e) => e.scrollTop));
    await q.click('[data-a=nurdies]'); ok(await q.locator('.md-liste').isHidden() && await q.locator('.kopf').isHidden(), '„Nur dieses Rezept“ blendet Liste und Leiste aus'); await q.click('[data-a=nurdies]'); ok(await q.locator('.md-liste').isVisible(), 'derselbe Knopf holt sie zurück');
    await q.click('[data-a=rail]'); await q.waitForTimeout(350); ok(await q.locator('.kopf.zu').count() === 1 && (await q.locator('.kopf').boundingBox()).width < 70, 'Leiste klappt auf Symbole zusammen');
    ok(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'kein seitliches Verrutschen bei 1280 px'); await kk.close(); }
  ok(fehler.length === 0, 'keine Fehler in der Konsole, kein Netz nach draußen', fehler.join(' · '));
} catch (e) { rot++; console.log('  ✗ ROT: Probe abgebrochen — ' + e.message.split('\n')[0]); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0;
