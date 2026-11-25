// Probe der neuen PWA: Explorer „Ordner“ (R3/R9) – alle Kategorien und Ordner als Baum, Ziehen, Mehrfachauswahl. Echter Browser.
// Aufruf: node tests/smoke_neu_baum.mjs · WURZEL=<Pfad> misst eine Kopie (Gegenprobe).
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
async function seite(vorher, breite = 390, hoehe = 800) { const k = await browser.newContext({ locale: 'de-DE', viewport: { width: breite, height: hoehe } }); const p = mitThemen(await k.newPage()); p.on('pageerror', (e) => fehler.push(e.message)); p.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
  await p.route(/^https?:\/\/(?!localhost)/, (r) => { fehler.push('Netz nach draußen: ' + r.request().url()); r.abort(); });
  if (vorher) { await p.goto(URL0.replace('?leer', '') + 'app.css'); await p.evaluate(vorher); } await p.goto(URL0); await p.waitForSelector('.gruss'); return { p, k }; }
const zustand = async (p) => { await p.waitForTimeout(350); return zustandJetzt(p); };   /* sichern() schreibt kurz verzögert */
const zustandJetzt = (p) => p.evaluate(() => new Promise((ja) => { const a = indexedDB.open('KuechenKern-rezeptbuch'); a.onsuccess = () => { const q = a.result.transaction('zustand').objectStore('zustand').get('alles'); q.onsuccess = () => ja(q.result.zustand); }; }));
const zumBaum = async (p) => { if (await p.locator('.rail-n[data-zu=baum]').count()) await p.click('.rail-n[data-zu=baum]'); else { await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=baum]'); } await p.waitForSelector('.bz-gruppe'); };
const gruppe = (p, name) => p.locator(`.bz-gruppe[data-name="${name}"]`);
const zahlIn = async (p, name) => +((await gruppe(p, name).first().locator('.bz-zahl').innerText()).match(/^(\d+)/) || [])[1];
/* Ziehen wie ein Finger: pointerdown (touch), Uhr abwarten, dann bewegen und loslassen; die Ereignisse gehen an das Element unter dem Punkt. */
async function fingerZieh(p, von, nach, warte = 420) {
  await von.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  const a = await von.boundingBox(), ax = a.x + a.width / 2, ay = a.y + a.height / 2, H = await p.evaluate(() => innerHeight);
  const zug = (typ, x, y) => p.evaluate(([t, x, y]) => { const ev = new PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'touch', pointerId: 7, isPrimary: true, button: 0 }); (t === 'pointerdown' ? document.elementFromPoint(x, y) : document).dispatchEvent(ev); }, [typ, x, y]);
  await zug('pointerdown', ax, ay); await p.waitForTimeout(warte); if (process.env.DBG) console.log('    dbg geist', await p.locator('.bz-geist').count(), await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.className, [ax, ay]));
  let b = await nach.boundingBox();
  /* liegt das Ziel außerhalb, hält der Finger am Rand: die Seite rollt von selbst, bis es im Bild ist */
  if (warte > 300 && (b.y < 0 || b.y + 20 > H)) { const rand = b.y < 0 ? 30 : H - 30; await zug('pointermove', ax, (ay + rand) / 2); for (let i = 0; i < 60; i++) { await zug('pointermove', ax, rand); await p.waitForTimeout(50); b = await nach.boundingBox(); if (b.y > 80 && b.y + 30 < H - 80) break; } }
  const bx = b.x + Math.min(60, b.width / 2), by = b.y + Math.min(24, b.height / 2);
  for (let i = 1; i <= 6; i++) await zug('pointermove', ax + (bx - ax) * i / 6, (b.y > 0 && b.y < H && i < 6 ? by : ay + (by - ay) * i / 6));
  await p.waitForTimeout(120); b = await nach.boundingBox(); await zug('pointermove', b.x + Math.min(60, b.width / 2), b.y + Math.min(24, b.height / 2)); if (process.env.DBG) console.log('    dbg vor up', await p.locator('.bz-geist').count(), await p.locator('.bz-ziel').count(), JSON.stringify(b), await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '#' + e.id + '.' + e.getAttribute('class') + ' < ' + e.parentElement?.tagName + '#' + e.parentElement?.id + '.' + e.parentElement?.getAttribute('class') : 'null'; }, [bx, by])); await zug('pointerup', b.x + Math.min(60, b.width / 2), b.y + Math.min(24, b.height / 2)); await p.waitForTimeout(150);
}
async function mausZieh(p, von, nach) {
  await von.evaluate((e) => e.scrollIntoView({ block: 'center' })); const a = await von.boundingBox(), H = await p.evaluate(() => innerHeight), ax = a.x + a.width / 2, ay = a.y + a.height / 2;
  await p.mouse.move(ax, ay); await p.mouse.down(); await p.mouse.move(ax + 10, ay + 10, { steps: 3 });
  let b = await nach.boundingBox();
  if (b.y < 0 || b.y + 20 > H) { const rand = b.y < 0 ? 30 : H - 30; await p.mouse.move(ax, rand, { steps: 4 }); for (let i = 0; i < 60; i++) { await p.mouse.move(ax + (i % 2), rand); await p.waitForTimeout(50); b = await nach.boundingBox(); if (b.y > 80 && b.y + 30 < H - 80) break; } }
  await p.mouse.move(b.x + Math.min(60, b.width / 2), Math.max(90, b.y + Math.min(24, b.height / 2)), { steps: 8 }); await p.waitForTimeout(120);
  /* wie ein Mensch: zuletzt auf das zielen, was jetzt dort steht */
  b = await nach.boundingBox(); await p.mouse.move(b.x + Math.min(60, b.width / 2) + 1, b.y + Math.min(24, b.height / 2)); await p.waitForTimeout(60);
  await p.mouse.up(); await p.waitForTimeout(150);
}

try {
  console.log('1 · Der Explorer steht in der Leiste und zeigt alle Kategorien');
  let { p, k } = await seite();
  await p.click('[data-a=beispiel]'); await p.waitForSelector('.karte', { timeout: 20000 });
  await p.click('#leiste .fl-griff'); ok(await p.locator('#leiste [data-zu=baum]').count() === 1 && (await p.locator('#leiste [role=menuitem]').allInnerTexts()).map((t) => t.trim()).slice(0, 2).join('|') === 'Rezepte|Ordner', 'fliegende Leiste: „Ordner“ steht direkt unter „Rezepte“');
  await p.click('#leiste [data-zu=baum]'); await p.waitForSelector('.bz-gruppe');
  let z = await zustand(p); const nRez = z.rezepte.filter((r) => r.name && !r.blank).length;
  const zahlen = await p.locator('.bz-baum[data-teil=kat] .bz-zahl').allInnerTexts(), summe = zahlen.reduce((n, t) => n + +t.match(/^(\d+)/)[1], 0);
  ok(summe === nRez && zahlen.length >= 5 && zahlen.every((t) => !/^0 /.test(t)), 'jede Kategorie mit Rezepten steht als Gruppe da; zusammen zählen sie alle Rezepte', `${summe} von ${nRez}, ${zahlen.length} Gruppen`);
  const leerN = +((await p.locator('[data-a=baum-leere]').innerText()).match(/(\d+)/) || [])[1];
  ok(leerN > 0 && await p.locator('.bz-baum[data-teil=kat] .bz-zahl', { hasText: /^0 Rezepte/ }).count() === 0, 'leere Kategorien stehen eingeklappt hinter „+ N leere Kategorien“ (Klaus 25.11.)', String(leerN));
  await p.click('[data-a=baum-leere]'); ok(await p.locator('.bz-baum[data-teil=kat] .bz-zahl', { hasText: /^0 Rezepte/ }).count() === leerN, 'ein Tipp zeigt sie (zum Hineinziehen)'); await p.click('[data-a=baum-leere]');
  ok(await p.locator('.bz-rezepte').count() === 0 && await p.locator('#bz-ord-leer').count() === 1, 'zu Beginn eingeklappt; unter „Ordner“ steht „Noch kein Ordner“');
  ok(await p.locator('.bz-knoepfe [data-a=baum-ordner-neu]').count() === 1 && await p.locator('.bz-knoepfe [data-zu=kategorien]').count() === 1 && await p.locator('.bz-knoepfe [data-a=baum-alle]').count() === 1 && await p.locator('#baumfeld').count() === 1, 'Kopf wie „Meine Ordner“: Suche, Neuer Ordner, Kategorien umbenennen, Alle aufklappen');
  const sushiN = await zahlIn(p, 'Sushi'), sushiId = await gruppe(p, 'Sushi').getAttribute('data-id');
  await gruppe(p, 'Sushi').locator('.bz-auf').click();
  ok(await gruppe(p, 'Sushi').locator('.bz-zeile').count() === sushiN && sushiN > 1, 'aufgeklappt: die Rezepte der Kategorie, jedes mit Bild oder Zeichen und Griff', String(sushiN));
  ok(await gruppe(p, 'Sushi').locator('.bz-auf[aria-expanded=true]').count() === 1 && await gruppe(p, 'Sushi').locator('input.kat-name').count() === 1 && await gruppe(p, 'Sushi').locator('button.kat-zeichen[data-a=kat-emoji]').count() === 1 && await gruppe(p, 'Sushi').locator('[data-a=kat-alle]').count() === 0 && await gruppe(p, 'Sushi').locator('[data-a=kat-weg]').count() === 1 && await p.locator('[data-a=baum-stift]').count() === 0, 'an der Kategorie direkt (Klaus): Namensfeld, Bild-Knopf, Papierkorb – kein Zwischenfenster, kein Pfeilkreuz (nur „Ohne Kategorie“ hat „Alle zuordnen →“)');
  const erstes = (await gruppe(p, 'Sushi').locator('.bz-rname').first().innerText()).trim();
  await gruppe(p, 'Sushi').locator('.bz-r').first().click(); await p.waitForSelector('.rezept-held h1');
  ok((await p.locator('.rezept-held h1').innerText()).trim() === erstes, 'ein Tipp auf das Rezept öffnet es', erstes);
  await p.goBack(); await p.waitForSelector('.bz-gruppe');
  ok(await gruppe(p, 'Sushi').locator('.bz-zeile').count() === sushiN, 'Zurück führt in den Baum, die Gruppe ist noch offen');

  console.log('2 · Ordner anlegen und Rezepte hineinziehen (Finger)');
  await p.click('[data-a=baum-ordner-neu]'); await p.fill('#fensterort input[name=n]', 'Für Gäste'); await p.keyboard.press('Enter');
  await p.waitForSelector('.bz-gruppe[data-art=ord]'); ok((await gruppe(p, 'Für Gäste').locator('.bz-zahl').innerText()).includes('0 Rezepte') && await gruppe(p, 'Für Gäste').locator('.bz-leer').count() === 1, 'der neue Ordner steht da, offen, leer, mit „Zieh eines hierher“');
  await fingerZieh(p, gruppe(p, 'Sushi').locator('.bz-rgriff').first(), gruppe(p, 'Für Gäste').locator('.bz-kopf'));
  z = await zustand(p); const o1 = z.ordner.find((o) => o.name === 'Für Gäste'), r1 = z.rezepte.find((r) => r.name === erstes);
  ok(r1 && String(r1.folder) === String(o1.id) && r1.cat === sushiId, 'langer Druck und ziehen: das Rezept liegt im Ordner und behält seine Kategorie', JSON.stringify({ f: r1?.folder, c: r1?.cat }));
  ok(await zahlIn(p, 'Sushi') === sushiN - 1 && (await gruppe(p, 'Sushi').locator('.bz-zahl').innerText()).includes('+1 in Event-Ordnern') && await zahlIn(p, 'Für Gäste') === 1, 'der Baum zeigt es nur beim Ordner; die Kategorie sagt „+1 in Event-Ordnern“ (Klaus 25.11.: Event-Ordner)', await gruppe(p, 'Sushi').locator('.bz-zahl').innerText());
  ok((await p.locator('#toast').innerText()).includes('Für Gäste') && await p.locator('#toast [data-a=toast-tun]').count() === 1, 'die Meldung nennt das Ziel und bietet Rückgängig');
  await p.click('#toast [data-a=toast-tun]'); await p.waitForTimeout(300); z = await zustand(p); ok(!z.rezepte.find((r) => r.name === erstes).folder, 'Rückgängig nimmt es wieder heraus');
  /* Selbst-Riegel: ein Finger, der sich vor Ablauf der Uhr bewegt, scrollt; er zieht nicht */
  await fingerZieh(p, gruppe(p, 'Sushi').locator('.bz-rgriff').first(), gruppe(p, 'Für Gäste').locator('.bz-kopf'), 60);
  z = await zustand(p); ok(!z.rezepte.find((r) => r.name === erstes).folder, 'ein kurzer Wisch (vor dem langen Druck) verschiebt nichts');
  await fingerZieh(p, gruppe(p, 'Sushi').locator('.bz-rgriff').first(), gruppe(p, 'Für Gäste').locator('.bz-kopf'));

  console.log('3 · Aus dem Ordner auf eine Kategorie ziehen (Maus)');
  const zielKat = 'Fisch', fischVor = await zahlIn(p, zielKat);
  await mausZieh(p, gruppe(p, 'Für Gäste').locator('.bz-rgriff').first(), gruppe(p, zielKat).locator('.bz-kopf'));
  z = await zustand(p); let r2 = z.rezepte.find((r) => r.name === erstes);
  ok(r2.cat !== sushiId && !r2.folder && await zahlIn(p, zielKat) === fischVor + 1 && await zahlIn(p, 'Für Gäste') === 0, 'auf eine Kategorie gelegt: neue Kategorie, raus aus dem Ordner', JSON.stringify({ c: r2.cat, f: r2.folder }));
  ok(await gruppe(p, zielKat).locator('.bz-zeile', { hasText: erstes }).count() === 1, 'die Ziel-Kategorie klappt auf und zeigt es');

  console.log('4 · Mehrere auf einmal');
  await p.click('[data-a=baum-wahl]'); ok(await p.locator('.bz-wahl').count() === 1 && await p.locator('.bz-wahl [data-a=baum-verschieben]:disabled').count() === 1, '„Auswählen“: unten die Leiste, „Verschieben“ erst mit Haken');
  const zwei = (await gruppe(p, 'Sushi').locator('.bz-rname').allInnerTexts()).slice(0, 2).map((t) => t.trim());
  await gruppe(p, 'Sushi').locator('.bz-haken').nth(0).click(); await gruppe(p, 'Sushi').locator('.bz-r').nth(1).click();
  ok((await p.locator('#bz-wahl-zahl').innerText()).includes('2 gewählt') && await p.locator('.rezept-held').count() === 0, 'Haken und Tipp auf die Zeile wählen (öffnen nicht)');
  await p.click('[data-a=baum-verschieben]'); await p.locator('#fensterort [data-a=baum-ziel][data-art=ord]', { hasText: 'Für Gäste' }).click();
  z = await zustand(p); ok(zwei.every((n) => String(z.rezepte.find((r) => r.name === n).folder) === String(o1.id)) && await zahlIn(p, 'Für Gäste') === 2, 'beide liegen im Ordner', zwei.join(', ') + ' ' + JSON.stringify(zwei.map((n) => z.rezepte.filter((r) => r.name === n).map((r) => r.folder))) + ' ' + o1.id + ' ' + await zahlIn(p, 'Für Gäste'));
  ok((await p.locator('#bz-wahl-zahl').innerText()).includes('0 gewählt'), 'danach ist die Auswahl leer, der Modus bleibt');
  await p.click('.bz-wahl [data-a=baum-wahl]'); ok(await p.locator('.bz-wahl').count() === 0 && await p.locator('.bz-haken').count() === 0, 'das × beendet die Auswahl');

  console.log('5 · Kategorien umsortieren, umbenennen, suchen');
  const erste = await p.locator('.bz-baum[data-teil=kat] .bz-gruppe').first().getAttribute('data-name');
  await mausZieh(p, gruppe(p, 'Sushi').locator('.bz-ggriff'), p.locator('.bz-baum[data-teil=kat] .bz-gruppe').first().locator('.bz-kopf'));
  let folge = await p.locator('.bz-baum[data-teil=kat] .bz-gruppe').evaluateAll((l) => l.map((e) => e.dataset.name));
  ok(folge[0] === 'Sushi' && folge[1] === erste, 'die Kopfzeile am Griff gezogen: Sushi steht jetzt vorn', folge.slice(0, 3).join('|'));
  await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=start]'); await p.waitForSelector('.fotokat');
  const leiste = (await p.locator('.fotokat button').allInnerTexts()).map((t) => t.trim()); ok(leiste[1].startsWith('Sushi'), 'die Reihenfolge gilt auch in der Leiste der Startseite', leiste.slice(0, 3).join('|'));
  await zumBaum(p);
  await gruppe(p, 'Sushi').locator('input.kat-name').fill('Rollen'); await p.keyboard.press('Tab');
  await zumBaum(p); ok(await gruppe(p, 'Rollen').count() === 1 && await gruppe(p, 'Sushi').count() === 0, 'ins Namensfeld tippen benennt die Kategorie gleich um');
  z = await zustand(p); ok((z.kategorien.namen?.[sushiId]?.name === 'Rollen' || z.kategorien.eigene.find((c) => c.id === sushiId)?.de === 'Rollen') && z.rezepte.filter((r) => r.cat === sushiId).length > 0, 'gespeichert wird nur die Beschriftung, die Kennung bleibt', JSON.stringify({ n: z.kategorien.namen?.[sushiId], e: z.kategorien.eigene.find((c) => c.id === sushiId), id: sushiId }));
  await gruppe(p, 'Für Gäste').locator('input.ord-name').fill('Für liebe Gäste'); await p.keyboard.press('Tab');
  await zumBaum(p); ok(await gruppe(p, 'Für liebe Gäste').count() === 1, 'den Ordner ebenso: gleich im Feld');
  await gruppe(p, 'Rollen').locator('button.kat-zeichen').click(); await p.waitForSelector('#fensterort .sticker-raster, #fensterort [data-a=kat-emoji-setzen]');
  ok(await p.locator('#fensterort [data-a=kat-emoji-setzen]').count() > 10, 'ein Tipp aufs Bild der Kategorie öffnet gleich die Bild-/Zeichenwahl'); await p.keyboard.press('Escape');
  await p.fill('#baumfeld', zwei[0].slice(0, 5)); await p.waitForTimeout(100);
  const treffer = await p.locator('.bz-rname').allInnerTexts();
  ok(treffer.length >= 1 && treffer.every((t) => t.toLowerCase().includes(zwei[0].slice(0, 5).toLowerCase())) && await p.locator('.bz-gruppe').count() < 6 && await p.evaluate(() => document.activeElement?.id === 'baumfeld'), 'die Suche zeigt nur passende Rezepte, aufgeklappt, das Feld behält den Zeiger', treffer.join(', '));
  await p.click('[data-a=baum-suche-leer]'); ok(await p.locator('.bz-baum[data-teil=kat] .bz-gruppe').count() === zahlen.length, 'leeren: alle Gruppen wieder da');
  await p.click('[data-a=baum-alle]'); ok(await p.locator('.bz-auf[aria-expanded=false]').count() === 0 && (await p.locator('[data-a=baum-alle]').innerText()).includes('einklappen'), '„Alle aufklappen“ klappt alle auf'); await p.click('[data-a=baum-alle]'); ok(await p.locator('.bz-rezepte').count() === 0, '… und wieder zu');
  /* 390 px: nichts läuft quer */
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'bei 390 px läuft nichts quer');
  await k.close();

  console.log('6 · Breiter Schirm: Baum links, Rezept rechts; ohne Kategorie');
  ({ p, k } = await seite(() => { localStorage.setItem('mrz9m', JSON.stringify([{ id: 1, name: 'Ohne alles', cat: '' }, { id: 2, name: 'Braten', cat: 'fleisch' }, { id: 3, name: 'Fremdes', cat: 'xyz' }])); }, 1280));
  await p.waitForSelector('.karte'); await zumBaum(p);
  ok(await p.locator('.rail-n[data-zu=baum][aria-current=page]').count() === 1 && await p.locator('.md .md-liste .bz-gruppe').count() >= 3 && await p.locator('.md-detail .bz-hier').count() === 1, 'Leiste links: „Ordner“; der Baum steht links, rechts ein Hinweis');
  await gruppe(p, 'Ohne Kategorie').locator('.bz-auf').click(); ok(await gruppe(p, 'Ohne Kategorie').locator('[data-a=kat-weg]').count() === 0 && await gruppe(p, 'Ohne Kategorie').locator('input').count() === 0 && (await gruppe(p, 'Ohne Kategorie').locator('[data-a=kat-alle]').innerText()).includes('Alle zuordnen') && (await gruppe(p, 'Xyz').locator('[data-a=kat-alle]').count() + await p.locator('.bz-gruppe[data-id=xyz] [data-a=kat-alle]').count()) >= 1, '„Ohne Kategorie“: nicht löschbar, aber „alle zuordnen“');
  await gruppe(p, 'Ohne Kategorie').locator('.bz-r').click(); await p.waitForSelector('.md-detail h1');
  ok((await p.locator('.md-detail h1').innerText()).trim() === 'Ohne alles' && await p.locator('.md-liste .bz-gruppe').count() >= 3 && await p.locator('.bz-zeile[aria-current=true]').count() === 1, 'ein Tipp zeigt das Rezept rechts, der Baum bleibt links, die Zeile ist markiert');
  await mausZieh(p, gruppe(p, 'Ohne Kategorie').locator('.bz-rgriff'), gruppe(p, 'Fleisch').locator('.bz-kopf'));
  z = await zustand(p); ok(z.rezepte.find((r) => r.name === 'Ohne alles').cat === 'fleisch' && await gruppe(p, 'Ohne Kategorie').count() === 0, 'aus „Ohne Kategorie“ auf Fleisch gezogen: zugeordnet; der leere Sammel-Eimer verschwindet');
  ok((await p.locator('.md-detail .meta').innerText()).includes('Fleisch'), 'das offene Rezept rechts zeigt die neue Kategorie gleich');
  await k.close();

  console.log('7 · Einstellungen zeigen auf den Explorer');
  ({ p, k } = await seite());
  await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=werkstatt]'); ok(await p.locator('.zeile[data-zu=baum]').count() === 1 && await p.locator('.zeile[data-zu=ordner]').count() === 0, 'Einstellungen → Ordnung: „Alle Ordner und Kategorien als Baum“; die alte Ordner-Liste ist weg (Klaus 25.11.)');
  await p.click('.zeile[data-zu=baum]'); await p.waitForSelector('#baumfeld'); ok(await p.locator('.bz-baum').count() === 2, 'führt in den Explorer');
  console.log('8 · R12: Kreativbuch als eigener Bereich in der Leiste');
  await p.click('#leiste .fl-griff'); const punkte = (await p.locator('#leiste [role=menuitem]').allInnerTexts()).map((t) => t.trim());
  ok(punkte.indexOf('Kreativbuch') > punkte.indexOf('Einkauf') && punkte.indexOf('Kreativbuch') < punkte.indexOf('Einstellungen'), 'fliegende Leiste: „Kreativbuch“ zwischen Einkauf und Einstellungen', punkte.join('|'));
  await p.click('#leiste [data-zu=kreativ]'); await p.waitForSelector('.kr-teil');
  ok(await p.locator('.kr-teil [data-a=kreativ]').count() === 1 && await p.locator('.kr-teil [data-a=eb-auf]').count() === 1 && await p.locator('.kr-teil [data-a=kbp-auf]').count() === 1 && await p.locator('.kr-teil [data-a=buch]').count() === 2 && await p.locator('.kr-teil [data-a=kreativ-zine]').count() === 1, 'der Bereich hat Kreativbuch, Buch aus Bildern, Projekte, PDF, Blättern und die Food-Zine-Bilder');
  await p.click('[data-a=kreativ-zine]'); await p.waitForSelector('#zs-gitter'); ok(await p.locator('#zine-ansicht #zs').count() === 1, '„Meine Food-Zine-Bilder“ öffnet die Sammlung (seit 0.16 eine eigene, nicht mehr der Bilder-Filter)');
  await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=werkstatt]'); ok(await p.locator('.gruppe[data-g=buch]').count() === 0, 'in den Einstellungen steht kein Buch mehr');
  await k.close();
  ok(fehler.length === 0, 'keine Fehler in der Konsole, kein Netz nach draußen', fehler.join(' · '));
} catch (e) { rot++; console.log('  ✗ ROT: Probe abgebrochen — ' + e.message.split('\n')[0]); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0;
