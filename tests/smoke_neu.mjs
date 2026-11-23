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
  await p.click('[data-a=neu]'); ok(await p.locator('.imp-tabs button').count() === 4, 'das Plus öffnet das Blatt mit allen Wegen'); await p.click('[data-a=neu-form]'); await p.fill('[name=name]', 'Probe <b>Suppe</b>'); await p.fill('[name=katneu]', 'Eintöpfe');
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
    ok(await q.locator('#leiste').isHidden() && await q.locator('.rail-n').count() === 5, 'Leiste steht links, kein Griff am Rand');
    await q.locator('.md-liste').evaluate((e) => { e.scrollTop = 600; }); await q.locator('.md-liste .karte', { has: q.getByText('Ebi Tempura', { exact: true }) }).click();
    ok((await q.locator('.md-detail h1').innerText()) === 'Ebi Tempura' && await q.locator('.md-liste').evaluate((e) => e.scrollTop) > 300, 'Tipp links wechselt das Rezept rechts, die Liste bleibt an ihrer Stelle', (await q.locator('.md-detail h1').innerText()) + ' / ' + await q.locator('.md-liste').evaluate((e) => e.scrollTop));
    ok(await q.locator('.rezept-held .rund').count() === 0 && await q.locator('.rezept-held .wk-pf:visible').count() === 1, 'es gibt nur den kleinen Pfeil in der Namenszeile');
    { const lage = await q.evaluate(() => { const b = document.querySelector('.md-detail .rezept-held>img').getBoundingClientRect(), w = document.querySelector('.md-detail [data-a=rleiste]').getBoundingClientRect(), h = document.querySelector('.md-detail h1').getBoundingClientRect(); return { winkel: w.top >= b.bottom - 1, name: h.top >= b.bottom - 1 }; });
      ok(lage.winkel && lage.name, 'Monitor: Name und Winkel stehen unter dem Bild, nicht darauf (Klaus 23.11.)', JSON.stringify(lage)); }
    await q.click('.md-detail h1'); ok(await q.locator('.vollbild').count() === 0, 'Monitor: ein Tipp auf den Namen öffnet kein Vollbild');
    await q.click('[data-a=rleiste]'); await q.waitForTimeout(250);
    ok(await q.evaluate(() => { const b = document.querySelector('.md-detail .rezept-held>img').getBoundingClientRect(); return [...document.querySelectorAll('.rwerk .chip')].filter((c) => c.offsetHeight).every((c) => c.getBoundingClientRect().top >= b.bottom - 1); }), 'Monitor: die aufgeklappten Werkzeuge liegen unter dem Bild, keins darauf');
    await q.click('[data-a=nurdies]'); ok(await q.locator('.md-liste').isHidden() && await q.locator('.kopf').isHidden(), '„Nur dieses Rezept“ blendet Liste und Leiste aus'); await q.click('[data-a=nurdies]'); ok(await q.locator('.md-liste').isVisible(), 'derselbe Knopf holt sie zurück');
    await q.click('[data-a=rail]'); await q.waitForTimeout(350); ok(await q.locator('.kopf.zu').count() === 1 && (await q.locator('.kopf').boundingBox()).width < 70, 'Leiste klappt auf Symbole zusammen');
    ok(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'kein seitliches Verrutschen bei 1280 px'); await kk.close(); }

  console.log('10 · Einkaufsliste und Wochenplan');
  ({ p, k } = await seite()); await p.click('[data-a=beispiel]'); await p.waitForSelector('.karte', { timeout: 20000 });
  const auf = async (name) => { await p.click('#leiste .fl-griff').catch(() => {}); await p.click('#leiste [data-zu=start]').catch(() => {}); await p.fill('#suchfeld', name); await p.locator('.karte').first().click(); await p.waitForSelector('.rezept-held h1'); };
  await auf('Gebratener Reis'); await p.click('[data-a=auf-liste]'); await auf('Linsen-Curry'); await p.click('[data-a=portion][data-d="1"]'); await p.click('[data-a=auf-liste]');
  await p.click('#leiste .fl-griff'); ok((await p.locator('#leiste [data-zu=einkauf] .zahl').innerText()) !== '', 'die Leiste zeigt die Zahl der offenen Posten'); await p.click('#leiste [data-zu=einkauf]'); await p.waitForSelector('.ek-gruppe');
  const knob = p.locator('.ek-zeile', { has: p.getByText('Knoblauchzehe', { exact: false }) }).first(); const kt = await knob.innerText();
  ok(/Gebratener Reis, Linsen-Curry|Linsen-Curry, Gebratener Reis/.test(kt), 'gleiche Zutat aus zwei Rezepten steht einmal, mit beiden Rezepten', kt.replace(/\n/g, ' / '));
  const gruppen = async () => p.locator('.ek-gruppe').evaluateAll((g) => g.map((x) => x.dataset.g));
  const vorG = await gruppen(); ok(vorG[0] === 'gemuese', 'Vorgabe: Gemüse zuerst', vorG.join(','));
  const offen0 = +(await p.locator('.ueber small').innerText()).match(/\d+/)[0]; await knob.click(); const offen1 = +(await p.locator('.ueber small').innerText()).match(/\d+/)[0];
  ok(offen1 === offen0 - 1 && await p.locator('.ek-zeile.ok').count() === 1, 'Abhaken zählt herunter und streicht durch');
  await p.evaluate(() => scrollTo(0, 0)); const hb = await p.locator('.ek-gruppe').nth(1).locator('h3').boundingBox(), zweite = vorG[1], zb = await p.locator('.ek-gruppe').first().boundingBox();
  await p.mouse.move(hb.x + 40, hb.y + 8); await p.mouse.down(); await p.waitForTimeout(400); await p.mouse.move(hb.x + 40, zb.y + 4, { steps: 8 }); await p.mouse.up();
  const nachG = await gruppen(); ok(nachG[0] === zweite && nachG[1] === 'gemuese' && nachG.length === vorG.length, 'Gruppe ziehen: die zweite Gruppe steht jetzt oben', nachG.join(','));
  await p.click('[data-a=ek-laden-neu]'); await p.fill('[data-form=laden] input', 'Wochenmarkt'); await p.click('[data-form=laden] button[type=submit]');
  ok((await gruppen())[0] === zweite && await p.locator('.laeden [aria-pressed=true]').innerText() === 'Wochenmarkt', 'neuer Laden übernimmt die Reihenfolge und ist gewählt');
  await p.locator('.laeden .chip', { hasText: 'Supermarkt' }).click(); await p.fill('[data-form=ek-eigen] input', 'Küchenrolle'); await p.keyboard.press('Enter');
  ok(await p.locator('.ek-zeile', { hasText: 'Küchenrolle' }).count() === 1, 'eigener Posten steht auf der Liste');
  await p.waitForTimeout(350); await p.reload(); await p.waitForSelector('.gruss'); await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=einkauf]'); await p.waitForSelector('.ek-gruppe');
  ok((await gruppen())[0] === zweite && await p.locator('.ek-zeile.ok').count() === 1 && await p.locator('.ek-zeile', { hasText: 'Küchenrolle' }).count() === 1, 'nach Neuladen: Reihenfolge, Haken und eigener Posten sind da');
  await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=plan]'); await p.waitForSelector('.w-tag');
  ok(await p.locator('.w-tag').count() === 7 && await p.locator('.w-tag.heute').count() === 1, 'Wochenplan: sieben Tage, heute hervorgehoben');
  await p.locator('.w-tag').nth(2).locator('[data-a=plan-waehlen]').click(); await p.locator('.wahl-liste .zeile', { hasText: 'Ratatouille' }).click();
  ok((await p.locator('.w-tag').nth(2).locator('.w-slot').innerText()).includes('Ratatouille'), 'Gericht an einem Tag geplant');
  await p.click('[data-a=plan-einkauf]'); await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=einkauf]'); await p.waitForSelector('.ek-gruppe');
  ok(await p.locator('.quelle-chip', { hasText: 'Ratatouille' }).count() === 1, '„Einkaufsliste für die Woche“ nimmt das geplante Gericht auf');
  await p.click('[data-a=werkzeug]'); await p.click('.werkzeuge [data-zu=werkstatt]'); const [d2] = await Promise.all([p.waitForEvent('download'), p.click('[data-a=sichern]')]); const s2 = JSON.parse(await readFile(await d2.path(), 'utf8'));
  ok(s2.einkauf?.posten?.length === 3 && Object.keys(s2.plan || {}).length === 1, 'Einkaufsliste und Wochenplan stehen in der Sicherung');
  await k.close();

  console.log('11 · Kategorien verwalten, Bilder, Bildausschnitt');
  ({ p, k } = await seite()); await p.click('[data-a=beispiel]'); await p.waitForSelector('.karte', { timeout: 20000 });
  const zuWerk = async (zu) => { await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=werkstatt]'); await p.click(`.zeile[data-zu=${zu}]`); };
  const leiste = async () => { await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=start]'); await p.waitForSelector('.fotokat'); return p.locator('.fotokat button').allInnerTexts(); };
  await zuWerk('kategorien'); await p.waitForSelector('.kat-zeile');
  const fisch = p.locator('.kat-name[data-kid=fisch]'); await fisch.fill('Fisch & Meer'); await fisch.blur();
  await p.click('.kat-zeile[data-kid=fisch] [data-a=kat-emoji]'); await p.locator('.emoji-raster button', { hasText: '🍣' }).click();
  let lt = await leiste(); ok(lt.some((t) => /Fisch & Meer\s+2$/.test(t.trim())), 'umbenannt: „Fisch & Meer“ steht in der Leiste', lt.join(' | '));
  await zuWerk('kategorien'); ok(await p.locator('.kat-zeile[data-kid=fisch] .kat-zeichen img.sticker').count() === 1, 'Fisch hat Rezepte mit Bild: dort steht ein Mini-Foto, kein Zeichen (Klaus 23.11.: „Bilder sprechen mehr“)');
  { const ohneBild = await p.evaluate(() => [...document.querySelectorAll('.kat-zeile')].find((z) => !z.querySelector('img.sticker') && z.querySelector('.kat-name'))?.dataset.kid);
    if (ohneBild) { await p.click(`.kat-zeile[data-kid="${ohneBild}"] [data-a=kat-emoji]`); ok((await p.locator('.fenster').innerText()).includes('noch kein Rezept ein Bild'), 'ohne Bild sagt das Fenster, dass das Zeichen steht'); await p.locator('.emoji-raster button', { hasText: '🎂' }).click(); ok((await p.locator(`.kat-zeile[data-kid="${ohneBild}"] .kat-zeichen`).innerText()) === '🎂', 'ohne Bild bleibt das gewählte Zeichen'); }
    else ok(false, 'die Probe braucht eine Kategorie ohne Bild'); }
  await p.click('.kat-zeile[data-kid=fisch] [data-a=kat-emoji]'); const stk = p.locator('.sticker-raster button');
  const nFisch = await p.evaluate(() => document.querySelectorAll('.sticker-raster button').length);
  ok(nFisch >= 1 && await p.locator('.sticker-raster button[aria-pressed=true]').count() === 1, 'Bild wählen: die Fotos der Kategorie stehen als runde Sticker zur Wahl, das jetzige ist markiert', String(nFisch));
  const wahl = await stk.nth(nFisch - 1).locator('img').getAttribute('src'); await stk.nth(nFisch - 1).click();
  ok((await p.locator('.kat-zeile[data-kid=fisch] .kat-zeichen img').getAttribute('src')) === wahl, 'das gewählte Foto steht in der Liste');
  lt = await leiste(); ok((await p.locator('.fotokat button[data-kat=fisch] img').getAttribute('src')) === wahl && lt.some((t) => /Fisch & Meer/.test(t)), 'und als Sticker auf der Startseite, der Name steht darunter', lt.join(' | '));
  await zuWerk('kategorien'); await p.waitForSelector('.kat-zeile');
  const kid = async () => p.locator('.kat-zeile').evaluateAll((z) => z.map((x) => x.dataset.kid)); const vorK = await kid();
  const gb = await p.locator('.kat-zeile').nth(2).locator('.griff').boundingBox(), eb = await p.locator('.kat-zeile').first().boundingBox();
  await p.mouse.move(gb.x + 10, gb.y + 15); await p.mouse.down(); await p.waitForTimeout(400); await p.mouse.move(gb.x + 10, eb.y + 3, { steps: 8 }); await p.mouse.up();
  const nachK = await kid(); ok(nachK[0] === vorK[2] && nachK.length === vorK.length && new Set(nachK).size === nachK.length, 'Kategorie ziehen: die dritte steht jetzt oben, keine geht verloren', nachK.slice(0, 4).join(','));
  await p.click('.kat-zeile[data-kid=suppe] [data-a=kat-weg]'); await p.locator('.wahl-liste .zeile', { hasText: 'Vegetarisch' }).click();
  ok(await p.locator('.kat-zeile[data-kid=suppe]').count() === 0 && (await p.locator('.kat-zeile[data-kid=vegi] small').innerText()) === '10', 'Löschen mit Ziel: Suppen weg, Vegetarisch hat 8 + 2 = 10');
  ok(await p.locator('[data-a=kat-zurueck][data-kid=suppe]').count() === 1, 'die gelöschte feste Kategorie lässt sich zurückholen');
  await p.click('[data-a=kat-neu]'); await p.keyboard.type('Sonntagsessen'); await p.keyboard.press('Tab');
  await p.waitForTimeout(350); await p.reload(); await p.waitForSelector('.gruss'); lt = await p.locator('.fotokat button').allInnerTexts();
  ok(lt[1].includes(nachK[0] === 'fleisch' ? 'Fleisch' : '') && lt.some((t) => /Fisch & Meer/.test(t)) && !lt.some((t) => /Suppen/.test(t)), 'nach Neuladen: Reihenfolge, Name und Löschung sind da', lt.join(' | '));
  await p.fill('#suchfeld', 'Ratatouille'); await p.locator('.karte').first().click(); await p.click('[data-a=rleiste]'); await p.click('[data-a=kat-zuordnen]'); await p.fill('[data-form=kat-neu-zu] input', 'Sommerküche'); await p.keyboard.press('Enter');
  ok((await p.locator('.rezept-held .meta').innerText()).includes('Sommerküche'), 'aus dem Rezept: neue Kategorie anlegen und zuordnen in einem Griff');

  await zuWerk('bilder'); await p.waitForSelector('.bildkachel'); const nB = await p.locator('.bildkachel').count(); ok(nB === 30, 'Bilder-Ordner zeigt alle 30 Bilder', String(nB));
  await p.click('[data-a=bilder-gross]'); ok(await p.locator('.bildgitter.gross').count() === 1, 'große Vorschau per Tipp');
  await p.locator('.bildkachel').nth(0).click(); await p.locator('.bildkachel').nth(1).click(); await p.click('[data-a=bilder-weg]');
  ok(await p.locator('.bildkachel').count() === 28 && await p.locator('[data-a=bild-dazu]').count() === 14, 'zwei Bilder gelöscht, die Rezepte stehen jetzt unter „ohne Bild“');
  await p.click('[data-a=toast-tun]'); ok(await p.locator('.bildkachel').count() === 30, 'Rückgängig holt die Bilder zurück');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64');
  await p.locator('[data-a=bild-dazu]').first().click().catch(() => {}); await p.setInputFiles('#datei-bild', { name: 'foto.png', mimeType: 'image/png', buffer: png }); await p.waitForFunction(() => document.querySelectorAll('.bildkachel').length === 31);
  ok(true, 'Bild einfügen bei einem Rezept ohne Bild');
  await p.click('[data-a=bilder-alle-weg]'); await p.click('[data-a=ja]'); ok(await p.locator('.bildkachel').count() === 0, '„Alle Bilder löschen“ mit Rückfrage'); await p.click('[data-a=toast-tun]');
  await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=start]'); await p.fill('#suchfeld', ''); await p.locator('.fotokat button').first().click(); ok(await p.locator('.karte').count() === 42, 'alle 42 Rezepte sind noch da');
  await p.fill('#suchfeld', 'Dragon'); await p.locator('.karte').first().click(); await p.click('.rezept-held');
  const vb = await p.locator('.vollbild').evaluate((e) => { const r = e.getBoundingClientRect(), i = e.querySelector('img'); return [Math.round(r.width), Math.round(r.height), innerWidth, innerHeight, getComputedStyle(i).objectFit].join(','); });
  ok(vb === '390,800,390,800,contain', 'Tipp aufs Bild: Vollbild so groß wie das Fenster, ganzes Bild', vb);
  await p.keyboard.press('Escape'); ok(await p.locator('.vollbild').count() === 0 && await p.locator('.rezept-held h1').count() === 1, 'Esc schließt das Vollbild, das Rezept steht noch da');
  await p.click('.rezept-held'); await p.goBack(); ok(await p.locator('.vollbild').count() === 0 && (await p.locator('.rezept-held h1').innerText()).includes('Dragon'), 'die Zurück-Taste schließt das Vollbild und bleibt im Rezept');
  await p.click('.rezept-held'); ok(await p.locator('.vollbild [data-a=voll-werk]').count() === 1, 'im Vollbild steht „Bild bearbeiten“ (Klaus 23.11.: Tipp aufs Bild öffnet Vollbild und Bild-Blatt)');
  await p.click('.vollbild [data-a=voll-werk]'); await p.waitForTimeout(250);
  ok(await p.locator('.vollbild').count() === 0 && await p.locator('.fenster [data-a=ki-bild]').count() === 1, '„Bild bearbeiten“ schließt das Vollbild und öffnet das Bild-Blatt');
  ok(await p.evaluate(() => !history.state?.voll), 'danach steht kein Vollbild-Schritt mehr in der Geschichte');
  await p.locator('.schleier').click({ position: { x: 5, y: 5 } }); ok(await p.locator('.fenster').count() === 0 && (await p.locator('.rezept-held h1').innerText()).includes('Dragon'), 'Bild-Blatt zu, das Rezept steht noch da');
  if (!(await p.locator('.rwerk').count())) await p.click('[data-a=rleiste]'); await p.click('.rwerk [data-a=bild-blatt]'); await p.click('[data-a=zuschnitt]'); await p.locator('[data-a=zs-lage]', { hasText: 'Oben' }).click();
  await p.locator('#zs-zoom').evaluate((e) => { e.value = 200; e.dispatchEvent(new Event('input', { bubbles: true })); }); await p.click('[data-a=zs-ok]');
  const stil = await p.locator('.rezept-held > img').getAttribute('style'); ok(/object-position:50% 0%/.test(stil) && /scale\(2\)/.test(stil), 'Bildausschnitt: Lage oben und Zoom 2 sind am Kopfbild', stil);
  await p.waitForTimeout(350); await p.reload(); await p.waitForSelector('.gruss'); await p.fill('#suchfeld', 'Dragon'); ok(/scale\(2\)/.test(await p.locator('.karte img').first().getAttribute('style') || ''), 'der Ausschnitt gilt auch auf der Karte und nach dem Neuladen');
  await k.close();

  console.log('11b · Bild-Blatt, KI-Bild mit nachgestellter Antwort, Tresor');
  ({ p, k } = await seite());
  await p.click('[data-a=beispiel]'); await p.waitForSelector('.karte', { timeout: 20000 });
  await p.fill('#suchfeld', 'Ratatouille'); await p.locator('.karte').first().click(); await p.waitForSelector('.rezept-held h1');
  const hoehe = () => p.locator('.rezept-held').evaluate((e) => e.getBoundingClientRect().height + ':' + e.getBoundingClientRect().top); const h0 = await hoehe();
  ok(await p.locator('.rezept-held .rund').count() === 0 && await p.locator('.rwerk').count() === 0 && await p.locator('.rleiste').count() === 0, 'Rezept: kein runder Knopf auf dem Bild, keine eigene Zeile, Werkzeuge eingeklappt');
  await p.click('[data-a=rleiste]'); ok(await p.locator('.rwerk .chip:visible').count() >= 4, 'Pfeil klappt auf: Bearbeiten, Kategorie, Bild, Rezept löschen'); ok(await hoehe() === h0, 'das Aufklappen verschiebt nichts', h0 + ' → ' + await hoehe()); await p.click('[data-a=rleiste]');
  { // Falle aus dem Mixarium: bei einem langen Namen lag „Rezept löschen“ über dem Winkel
    const alt = await p.locator('.rezept-held h1').innerText();
    const werkzeuge = async (soll) => { if ((await p.locator('.rwerk').count() > 0) !== soll) await p.click('.rezept-held [data-a=rleiste]'); await p.waitForTimeout(300); };   // das Aufklappen ist eine kurze Bewegung; gemessen wird danach
    const umbenennen = async (n) => { await werkzeuge(true); await p.click('.rwerk [data-a=bearbeiten]'); await p.fill('[name=name]', n); await p.click('button[type=submit]'); await p.waitForSelector('.rezept-held h1'); };
    await umbenennen('Sehr langer Rezeptname über vier Zeilen: Ofengemüse mit Kräutern, gerösteten Pinienkernen, Feta und Zitronen-Joghurt');
    await werkzeuge(true);
    const lage = await p.evaluate(() => { const w = document.querySelector('.rezept-held [data-a=rleiste]').getBoundingClientRect(); const oben = document.elementFromPoint(w.x + w.width / 2, w.y + w.height / 2); const chips = [...document.querySelectorAll('.rwerk .chip')].map((c) => c.getBoundingClientRect()).filter((c) => c.height > 0); if (chips.length < 4) return { zuwenig: chips.length }; return { oben: !!oben?.closest('[data-a=rleiste]'), ueber: chips.every((c) => c.bottom <= w.top + 1), sichtbar: chips.every((c) => c.top >= document.querySelector('.rezept-held').getBoundingClientRect().top) }; });
    ok(lage.oben && lage.ueber, 'langer Name: der Winkel bleibt obenauf, kein Werkzeug reicht unter seine Oberkante', JSON.stringify(lage));
    ok(lage.sichtbar, 'langer Name: alle Werkzeuge liegen im Bild', JSON.stringify(lage));
    if (lage.oben) { await p.click('.rezept-held [data-a=rleiste]'); ok(await p.locator('.rwerk').count() === 0, 'langer Name: der Winkel klappt wieder zu'); } else ok(false, 'langer Name: der Winkel klappt wieder zu', 'Winkel verdeckt');
    await umbenennen(alt); await werkzeuge(false);
  }
  await p.click('.rezept-held'); ok(await p.locator('.fenster [data-a=ki-bild]').count() === 1 && await p.locator('.fenster [data-a=gratis-bild]').count() === 1 && await p.locator('.fenster [data-a=bild-dazu]').count() === 1, 'Tipp aufs Bild öffnet das Bild-Blatt: einfügen, KI-Bild, Gratis-Foto');
  ok(!(await p.locator('.fenster').innerText()).match(/Bild löschen/), 'im Bild-Blatt steht kein „Bild löschen“');
  await p.click('.fenster [data-a=ki-bild]'); ok(await p.locator('#schl-openai').count() === 1, 'ohne Schlüssel fragt die App zuerst nach dem Schlüssel');
  const rufe = []; await p.route('https://api.openai.com/**', (r) => { rufe.push({ kopf: r.request().headers().authorization, leib: JSON.parse(r.request().postData()) }); r.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [{ b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }] }) }); });
  await p.fill('#schl-openai', 'sk-probe'); await p.click('[data-form=schluessel] button[type=submit]');
  ok((await p.locator('.fenster').innerText()).includes('gehen an OpenAI') && rufe.length === 0, 'vor dem Senden steht, was hinausgeht und was es kostet; gesendet ist noch nichts');
  await p.click('[data-a=ja]'); await p.waitForSelector('.rezept-held > img');
  ok(rufe.length === 1 && rufe[0].kopf === 'Bearer sk-probe' && rufe[0].leib.prompt.includes('Ratatouille') && !('response_format' in rufe[0].leib), 'ein Aufruf an OpenAI, mit dem Schlüssel und dem Rezeptnamen');
  ok((await p.locator('.rezept-held > img').getAttribute('src')).startsWith('data:image/jpeg'), 'das Bild liegt als data:-Adresse im Rezept');
  ok(await p.evaluate(() => localStorage.getItem('openaiImgKey9m') === 'sk-probe' && !localStorage.getItem('openaiImgKey9')), 'der Schlüssel liegt unter dem Namen der bisherigen App, Muttis bleibt leer');
  await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=werkstatt]'); const [lad] = await Promise.all([p.waitForEvent('download'), p.click('[data-a=sichern]')]);
  ok(!(await readFile(await lad.path(), 'utf8')).includes('sk-probe'), 'der Schlüssel steht nicht in der Sicherung');
  await p.click('[data-a=tresor]'); await p.fill('[data-form=tresor] input', 'Vor dem Aufräumen'); await p.click('[data-form=tresor] button[type=submit]'); await p.waitForSelector('.tr-liste .zeile');
  ok((await p.locator('.tr-liste .zeile').first().innerText()).includes('Vor dem Aufräumen') && (await p.locator('.tr-liste .zeile').first().innerText()).includes('42 Rezepte'), 'Tresor: benannter Stand mit 42 Rezepten'); await p.click('.fenster [data-a=fenster-zu]');
  await p.click('[data-a=alles-weg]'); await p.click('[data-a=ja]'); await p.waitForSelector('.leer'); await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=werkstatt]'); await p.click('[data-a=tresor]'); await p.waitForSelector('.tr-liste .zeile');
  ok(await p.locator('.tr-liste .zeile').count() === 2, 'vor „Alle löschen“ kam der Stand automatisch in den Tresor', String(await p.locator('.tr-liste .zeile').count()));
  await p.locator('.tr-liste .zeile', { hasText: 'Vor dem Aufräumen' }).locator('[data-a=tresor-holen]').click(); await p.click('[data-a=ja]'); await p.waitForSelector('.karte');
  ok(await p.locator('.karte').count() === 42 && (await p.locator('.fotokat button').allInnerTexts()).some((t) => /^Sushi\s+7$/.test(t.trim())), 'zurückgeholt: 42 Rezepte, Sushi zählt 7');
  await p.waitForTimeout(350); await p.reload(); await p.waitForSelector('.karte'); ok(await p.locator('.karte').count() === 42, 'auch nach dem Neuladen');
  await k.close();

  console.log('11c · Abgleich Mixarium Runde 3: Kopf eine Zeile, Dunkel je Farbe, Schrift-Regler');
  ({ p, k } = await seite());
  await p.click('[data-a=beispiel]'); await p.waitForSelector('.karte', { timeout: 20000 });
  const kh = () => p.locator('#kopf').evaluate((e) => Math.round(e.getBoundingClientRect().height)); const kh0 = await kh(); await p.click('[data-a=werkzeug]');
  const tops = await p.locator('#kopf button:visible').evaluateAll((l) => l.map((b) => { const r = b.getBoundingClientRect(); return Math.round(r.top + r.height / 2); }));
  ok(await kh() === kh0 && Math.max(...tops) - Math.min(...tops) <= 2 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Kopf aufgeklappt: gleiche Höhe, alle Knöpfe auf einer Linie, kein Überlauf', `${kh0} → ${await kh()} · ${tops.join(',')}`);
  await p.click('#kopf [data-a=schrift]'); const fs = () => p.locator('.karte b, .karte strong, .karte').first().evaluate((e) => e.getBoundingClientRect().width);
  const b0 = await fs(); await p.locator('#schriftregler').evaluate((e) => { e.value = 130; e.dispatchEvent(new Event('input', { bubbles: true })); });
  ok(await p.locator('#schriftregler').count() === 1 && (await p.locator('#schriftzahl').innerText()) === '130 %' && await fs() > b0 * 1.2, 'Schrift-Regler: die Seite wächst beim Schieben, der Regler bleibt stehen, die Zahl steht daneben', `${b0} → ${await fs()}`);
  await p.click('.fenster [data-a=fenster-zu]'); await p.waitForTimeout(350); await p.reload(); await p.waitForSelector('.karte');
  ok(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--z').trim()) === '1.3', 'die Schriftgröße bleibt nach dem Neuladen');
  await p.click('[data-a=werkzeug]'); await p.click('#kopf [data-a=schrift]'); await p.click('[data-a=schrift-100]'); await p.click('.fenster [data-a=fenster-zu]');
  const grund = async (farbe) => { await p.click('#kopf [data-a=farbe]'); await p.click(`[data-a=farbe-wahl][data-farbe=${farbe}]`); return p.evaluate(() => getComputedStyle(document.body).backgroundColor + '|' + getComputedStyle(document.querySelector('.karte')).backgroundColor); };
  await p.click('#kopf [data-a=farbe]'); await p.click('[data-a=ton][data-ton=dunkel]'); await p.click('.schleier', { position: { x: 5, y: 5 } });
  const dunkle = []; for (const f of ['braun', 'blau', 'gruen', 'gelb', 'koralle', 'see', 'flieder']) dunkle.push(await grund(f));
  ok(new Set(dunkle).size === 7, 'Dunkel gilt für jede Farbe: sieben Farben geben sieben verschiedene Grund- und Kartenfarben', String(new Set(dunkle).size));
  const hellig = (c) => { const [r, g, b] = c.match(/[\d.]+/g).map(Number); return c.startsWith('color(') ? (r + g + b) / 3 * 255 : (r + g + b) / 3; };
  const fill = await p.evaluate(() => [...document.querySelectorAll('#kopf .ic, .fotokat .ic, .karte .ic')].slice(0, 6).map((e) => getComputedStyle(e).fill));
  ok(fill.length > 0 && fill.every((c) => hellig(c) > 150) && hellig(dunkle[0].split('|')[0]) < 60, 'im Dunkeln sind die Strichsymbole hell und der Grund dunkel', fill.join(' ') + ' · ' + dunkle[0]);
  await p.click('#kopf [data-a=farbe]'); await p.click('[data-a=ton][data-ton=hell]'); ok(await p.evaluate(() => document.documentElement.dataset.hell) === 'hell', 'zurück auf Hell');
  await k.close();
  const kd = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'dark' }); const pd = await kd.newPage(); await pd.goto(URL0); await pd.waitForSelector('.gruss');
  ok(await pd.evaluate(() => document.documentElement.dataset.hell) === 'dunkel', 'ohne eigene Wahl folgt die App dem Gerät (dunkel)'); await kd.close();

  console.log('11d · Sinn-Suche: Modul 04 echt, Modul 03 (Sprachmodell) nachgestellt');
  k = await browser.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' }); p = await k.newPage(); p.on('pageerror', (e) => fehler.push(e.message));   // ohne Service Worker, sonst greift die Nachstellung von Modul 03 nicht
  await p.route(/^https?:\/\/(?!localhost)/, (r) => { fehler.push('Netz nach draußen: ' + r.request().url()); r.abort(); }); await p.goto(URL0); await p.waitForSelector('.gruss');
  const geladen = []; p.on('request', (q) => { if (q.url().includes('/sbkim/')) geladen.push(q.url().split('/sbkim/')[1].split('?')[0]); });
  // Nachgestelltes Modell: „eintopf“ liegt bei „Gulasch“; alles andere ist ein Buchstaben-Vektor. Modul 04 rechnet echt.
  await p.route('**/sbkim/03_embedding.js', (r) => r.fulfill({ contentType: 'text/javascript', body: `(function(){const v=(t)=>{const a=new Float32Array(384);const s=/eintopf/i.test(t)||/gulasch/i.test(t)?'gulasch':String(t).toLowerCase();for(const c of s)a[c.charCodeAt(0)%384]+=1;let n=0;for(const x of a)n+=x*x;n=Math.sqrt(n)||1;return a.map((x)=>x/n)};window.SbkimEmbedding={init:async()=>{},isReady:()=>true,embedQuery:async(t)=>v(t),embedPassage:async(t)=>v(t),embedQueryBatch:async(a)=>a.map(v),embedPassageBatch:async(a)=>a.map(v)};})();` }));
  await p.click('[data-a=beispiel]'); await p.waitForSelector('.karte', { timeout: 20000 });
  ok(geladen.length === 0 && await p.evaluate(() => !window.SbkimMatch && !window.SbkimEmbedding), 'ohne Sinn-Suche wird kein SBKIM-Baustein ausgeführt');
  await p.fill('#suchfeld', 'eintopf'); const ohne = await p.locator('.karte').count();
  await p.click('[data-a=sinn]'); ok((await p.locator('.fenster').innerText()).includes('120 MB'), 'vor dem Einschalten steht, was geladen wird'); await p.click('[data-a=ja]');
  await p.waitForSelector('#sinn-treffer .karte', { timeout: 15000 });
  const sinnNamen = await p.locator('#sinn-treffer .karte').allInnerTexts();
  ok(ohne === 0 && sinnNamen.some((t) => /Gulasch/.test(t)), 'die Wortsuche findet „eintopf“ nicht, die Sinn-Suche findet das Gulasch', `${ohne} · ${sinnNamen.map((t) => t.split('\n')[0]).join(' | ')}`);
  ok([...new Set(geladen)].sort().join(',') === '03_embedding.js,04_match.js', 'geladen sind genau Modul 03 und 04, kein Siegel, kein Widget, keine Spore', [...new Set(geladen)].join(','));
  ok(await p.evaluate(() => !window.SbkimSiegel && !window.SbkimSpore && !window.SbkimWidget && !document.querySelector('[id^=sbkim],[class^=sbkim]')), 'nichts von SBKIM ist zu sehen');
  ok(await p.evaluate(() => document.activeElement?.id !== 'x') && (await p.inputValue('#suchfeld')) === 'eintopf', 'das Suchfeld behält die Eingabe');
  await p.fill('#suchfeld', 'gulasch'); await p.waitForTimeout(900); ok(await p.locator('.karte').count() >= 1 && await p.locator('#sinn-treffer .karte', { hasText: 'Szegediner' }).count() === 0, 'ein Worttreffer steht nicht doppelt unter „Nach Bedeutung“');
  await p.click('[data-a=sinn]'); ok(await p.locator('[data-a=sinn][aria-pressed=true]').count() === 0 && await p.locator('#sinn-status').count() === 0, 'ausschalten: Schalter aus, Statuszeile weg');
  await k.close();

  console.log('11e · Übersetzung am Rezept, ein Zeichen je Bedeutung');
  ({ p, k } = await seite());
  await p.evaluate(async () => { const d = await new Promise((g) => { const q = indexedDB.open('KuechenKern-rezeptbuch'); q.onsuccess = () => g(q.result); }); const z = { fassung: 1, einstellungen: {}, zustand: { rezepte: [{ uid: 'u1', name: 'Queen Charlotte', cat: 'suppen', servings: 1, ings: [{ name: 'Red wine', amt: '2', unit: 'oz' }], steps: [{ txt: 'Pour.' }], translations: { de: { name: 'Königin Charlotte', ingredients: ['Rotwein'], steps: ['Eingießen.'] } } }], menu: [], ordner: [], kategorien: { eigene: [], namen: {}, ausgeblendet: [], folge: [] } } }; await new Promise((g) => { const t = d.transaction('zustand', 'readwrite'); t.objectStore('zustand').put(z, 'alles'); t.oncomplete = g; }); });
  await p.reload(); await p.waitForSelector('.karte'); ok((await p.locator('.karte').innerText()).includes('Königin Charlotte'), 'liegt translations.de am Rezept, zeigt die Karte Deutsch');
  await p.locator('.karte').click(); await p.waitForSelector('.rezept-held h1'); ok((await p.locator('.zut').innerText()).includes('Rotwein') && (await p.locator('.schritte').innerText()).includes('Eingießen') && !(await p.locator('main').innerText()).includes('Red wine'), 'auch Zutaten und Schritte');
  await p.click('[data-a=rleiste]'); await p.click('[data-a=bearbeiten]'); ok(await p.inputValue('[name=name]') === 'Queen Charlotte', 'bearbeitet wird das Original');
  await k.close();
  const { SYMBOLE } = await import('../kern/oberflaeche/symbole.mjs'); const zeichen = ['buch', 'koch', 'karte', 'plan', 'einkauf', 'funken'].map((n) => SYMBOLE[n]);
  ok(new Set(zeichen).size === zeichen.length, 'Rezepte, Kochen, Kategorie, Planer, Einkauf und Werkstatt tragen sechs verschiedene Zeichen');

  console.log('12 · Text-Import ohne KI, ohne Netz');
  ({ p, k } = await seite());
  await p.click('[data-a=neu]'); await p.click('[data-a=neu-tab][data-t=text]');
  await p.fill('#imp-text', 'Kartoffelsuppe\n\nFür 4 Personen · Zubereitungszeit: 35 Minuten\n\nZutaten:\n500 g Kartoffeln (mehlig)\n1 ½ l Gemüsebrühe\nSalz\n\nZubereitung\n1. Kartoffeln schälen.\n2. Mit Brühe 20 Minuten kochen.');
  await p.click('[data-a=imp-text]'); await p.waitForSelector('[data-form=rezept]');
  ok(await p.inputValue('[name=name]') === 'Kartoffelsuppe' && await p.inputValue('[name=servings]') === '4' && await p.inputValue('[name=prepTime]') === '35', 'Text aufgeteilt: Name, Portionen und Zeit stehen im Formular');
  ok((await p.inputValue('[name=ings]')).split('\n').length === 3 && (await p.inputValue('[name=steps]')).split('\n\n').length === 2, 'drei Zutaten, zwei Schritte, zum Prüfen vor dem Speichern');
  await p.click('button[type=submit]'); await p.waitForSelector('.rezept-held h1'); ok((await p.locator('.zut li').first().innerText()).startsWith('500 g'), 'gespeichert, Menge und Einheit getrennt');
  const bereit = await p.evaluate(async () => { if (!('serviceWorker' in navigator)) return false; await navigator.serviceWorker.ready; for (let i = 0; i < 40 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 100)); return !!navigator.serviceWorker.controller; });
  ok(bereit, 'der Offline-Vorrat ist angelegt (Service Worker aktiv)');
  const vorOffline = fehler.length; await p.waitForTimeout(300); await k.setOffline(true); await p.reload(); await p.waitForSelector('.gruss', { timeout: 10000 }).catch(() => {});
  ok(await p.locator('.karte', { hasText: 'Kartoffelsuppe' }).count() === 1, 'ohne Netz neu geladen: die App startet und zeigt das Rezept');
  await p.locator('.karte').first().click(); await p.click('[data-a=kochen]'); ok(await p.locator('.koch').count() === 1, 'ohne Netz: Kochansicht geht'); await k.setOffline(false); fehler.length = vorOffline;   // nur die erwarteten Netzfehler der Offline-Strecke fallen weg
  await k.close();
  ok(fehler.length === 0, 'keine Fehler in der Konsole, kein Netz nach draußen', fehler.join(' · '));
} catch (e) { rot++; console.log('  ✗ ROT: Probe abgebrochen — ' + e.message.split('\n')[0]); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0;
