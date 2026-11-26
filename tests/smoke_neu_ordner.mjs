// Probe der neuen PWA: Ordner (eigene Sammlungen neben den Kategorien). Echter Browser. Aufruf: node tests/smoke_neu_ordner.mjs
// WURZEL=<Pfad> misst eine Kopie (Gegenprobe).
import { createRequire } from 'node:module';
import { mitThemen, themenAuf } from './neu-hilfe.mjs';
const aeste = async (p) => { await p.waitForSelector('.bz-teilkopf'); for (let i = 0; i < 2; i++) { const b = p.locator('[data-a=baum-teil][aria-expanded=false]').first(); if (await b.count()) await b.click(); } };   /* Klaus 26.11.: die Ordner öffnen zugeklappt – die Probe klappt beide Äste auf */
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join } from 'node:path';
const WURZEL = process.env.WURZEL || process.cwd();
const TYP = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = http.createServer(async (q, a) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; try { const d = await readFile(join(WURZEL, p)); a.writeHead(200, { 'content-type': TYP[extname(p)] || 'application/octet-stream' }); a.end(d); } catch { a.writeHead(404); a.end(); } }).listen(0);
const URL0 = `http://localhost:${srv.address().port}/neu/?leer`;   /* ?leer: ohne die acht Startrezepte, die Proben stellen ihren Bestand selbst */
let gruen = 0, rot = 0; const ok = (b, t, mehr = '') => { if (b) { gruen++; console.log('  ✓ ' + t); } else { rot++; console.log('  ✗ ROT: ' + t + (mehr ? ' — ' + mehr : '')); } };
const browser = await chromium.launch(); const fehler = [];
async function seite(vorher, breite = 390) { const k = await browser.newContext({ locale: 'de-DE', viewport: { width: breite, height: 800 }, acceptDownloads: true }); const p = mitThemen(await k.newPage()); p.on('pageerror', (e) => fehler.push(e.message)); p.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
  await p.route(/^https?:\/\/(?!localhost)/, (r) => { fehler.push('Netz nach draußen: ' + r.request().url()); r.abort(); });
  if (vorher) { await p.goto(URL0.replace('?leer', '') + 'app.css'); await p.evaluate(vorher); } await p.goto(URL0); await p.waitForSelector('.gruss'); return { p, k }; }
const zurWerkstatt = async (p) => { await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=werkstatt]'); await p.waitForSelector('.gruppe'); };
const zumStart = async (p) => { await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=start]'); await p.waitForSelector('.fotokat'); };
const leiste = (p) => p.locator('.fotokat button').allInnerTexts().then((l) => l.map((t) => t.trim().replace(/\s+/g, ' ')));
const zustand = (p) => p.evaluate(() => new Promise((ja) => { const a = indexedDB.open('KuechenKern-rezeptbuch'); a.onsuccess = () => { const q = a.result.transaction('zustand').objectStore('zustand').get('alles'); q.onsuccess = () => ja(q.result.zustand); }; }));

try {
  console.log('1 · Ordner anlegen und benennen');
  let { p, k } = await seite();
  await p.click('[data-a=beispiel]'); await p.waitForSelector('.karte', { timeout: 20000 });
  ok(await p.locator('.fotokat .ord').count() === 0, 'ohne Ordner steht in der Leiste kein Ordner');
  await zurWerkstatt(p); ok(await p.locator('.zeile[data-zu=ordner]').count() === 0 && await p.locator('.zeile[data-zu=baum]').count() === 1, 'Einstellungen → Ordnung führt in den Baum (die alte Ordner-Liste ist weg, Klaus 25.11.)');
  await p.click('.zeile[data-zu=baum]'); await aeste(p); await p.waitForSelector('#bz-ord-leer'); ok(await p.locator('.ueber .frag').count() === 1, 'ohne Ordner sagt der Baum „Noch kein Ordner“, Erklärung hinter „?“');
  await p.click('[data-a=baum-ordner-neu]'); ok(await p.evaluate(() => document.activeElement?.name === 'n'), 'ein neuer Ordner: der Zeiger steht gleich im Namensfeld');
  await p.keyboard.type('Für Gäste'); await p.keyboard.press('Enter');
  await p.click('[data-a=baum-ordner-neu]'); await p.keyboard.type('Sommer <b>'); await p.keyboard.press('Enter');
  ok(await p.locator('.bz-gruppe[data-art=ord]').count() === 2 && await p.locator('.bz-gruppe[data-art=ord]').first().getAttribute('data-name') === 'Sommer <b>' &&   /* Klaus 26.11.: der neue steht oben */ (await p.locator('.bz-gruppe[data-art=ord]').locator('.bz-zahl').allInnerTexts()).every((t) => t.startsWith('0 ')), 'zwei Ordner, noch leer');

  console.log('2 · Rezept in einen Ordner legen: die Kategorie bleibt');
  await zumStart(p); const vorSushi = (await leiste(p)).find((t) => t.startsWith('Sushi'));
  await p.locator('.fotokat button', { hasText: 'Sushi' }).click(); await p.locator('.karte', { hasText: 'Dragon Roll' }).click(); await p.waitForSelector('.rezept-held h1');
  await p.click('[data-a=rleiste]'); ok(await p.locator('.rwerk [data-a=einordnen]').count() === 1 && await p.locator('.rwerk [data-a=ordner-zuordnen], .rwerk [data-a=kat-zuordnen]').count() === 0, 'Werkzeuge am Rezept: EIN Knopf „Einordnen“ für Kategorie und Ordner (Klaus 25.11.)');
  await p.click('.rwerk [data-a=einordnen]');
  ok(await p.locator('#ein-kat .zeile').count() > 5 && await p.locator('#ein-ord .zeile').count() === 2 && (await p.locator('#ein-ord').innerText()).includes('Sommer <b>'), 'das Fenster zeigt oben die Kategorien, darunter die Ordner (Name als Text, nicht als HTML)');
  await p.locator('#ein-ord .zeile', { hasText: 'Für Gäste' }).click(); await p.waitForTimeout(150);
  ok(await p.locator('#ein-ord .zeile[aria-pressed=true]', { hasText: 'Für Gäste' }).count() === 1, 'ein Tipp setzt sofort; das Fenster bleibt offen und zeigt den Haken'); await p.keyboard.press('Escape');
  ok((await p.locator('#toast').innerText()).includes('Für Gäste') && (await p.locator('.rezept-held .im-ordner').innerText()).includes('Für Gäste'), 'das Rezept liegt im Ordner; er steht am Rezept');
  ok((await p.locator('.rezept-held .meta').innerText()).includes('Sushi'), 'die Kategorie steht weiter am Rezept');
  await p.goBack(); await p.waitForSelector('.fotokat');
  let l = await leiste(p); ok(l.find((t) => t.startsWith('Sushi')) === vorSushi, 'die Kategorie zählt wie vorher (ein Ordner frisst die Kategorie nicht)', vorSushi);
  ok(l.includes('Für Gäste 1') && !l.some((t) => t.startsWith('Sommer')), 'in der Leiste steht der Ordner mit Inhalt; ein leerer Ordner steht dort nicht', l.slice(-3).join(' | '));
  const summe = l.filter((t, i) => i > 0 && !/^Für Gäste/.test(t)).reduce((n, t) => n + +t.match(/(\d+)$/)[1], 0); ok(summe === 42 && l[0] === 'Alle 42', 'Summe der Kategorien = Alle (Ordner zählen nicht doppelt)', String(summe));

  console.log('3 · Neuen Ordner aus dem Rezept heraus anlegen; Ordner ansehen');
  await p.locator('.karte:not(:has-text("Dragon Roll"))').first().click(); await p.waitForSelector('.rezept-held h1'); const zweites = await p.locator('.rezept-held h1').innerText();   /* ein ANDERES Rezept als das erste */
  ok(!zweites.includes('Dragon Roll') && await p.locator('.rwerk').count() === 0, 'Selbst-Riegel: es ist ein anderes Rezept; es beginnt mit eingeklappten Werkzeugen', zweites); await p.click('[data-a=rleiste]'); await p.click('.rwerk [data-a=einordnen]'); await p.fill('[data-form=ein-ord-neu] input', 'Weihnachten'); await p.keyboard.press('Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
  ok((await p.locator('.rezept-held .im-ordner').innerText()).includes('Weihnachten'), 'neuer Ordner angelegt und das Rezept gleich hineingelegt');
  ok(await p.locator('.rwerk').count() === 1, 'die Werkzeuge bleiben nach der Wahl offen (wie bei der Kategorie)'); await p.click('.rwerk [data-a=einordnen]');
  ok(await p.locator('#ein-ord .zeile[aria-pressed=true]').count() === 1 && (await p.locator('#ein-ord .zeile[aria-pressed=true]').innerText()).includes('Weihnachten') && await p.locator('#ein-ord .ein-ozeile:has(.zeile[aria-pressed=true]) .ein-ox').count() === 1 && await p.locator('#ein-ord .zeile', { hasText: 'aus dem Ordner nehmen' }).count() === 0, 'im Fenster ist der jetzige Ordner markiert; ✕ steht in derselben Zeile, keine eigene Zeile „aus dem Ordner nehmen“ (Klaus 25.11.)');
  await p.click('#ein-ord .ein-ox'); await p.waitForTimeout(150);
  ok(await p.locator('#ein-ord .zeile[aria-pressed=true]').count() === 0 && await p.locator('#ein-ord .ein-ox').count() === 0 && await p.locator('.fenster').count() === 1, 'ein Tipp auf ✕ nimmt es heraus; das Fenster bleibt offen');
  await p.locator('#ein-ord .zeile', { hasText: 'Weihnachten' }).click(); await p.waitForTimeout(150); await p.locator('#ein-ord .zeile', { hasText: 'Weihnachten' }).click(); await p.waitForTimeout(150);
  ok(await p.locator('#ein-ord .zeile[aria-pressed=true]').count() === 0, 'ein zweiter Tipp auf den angehakten Ordner nimmt den Haken wieder weg');
  await p.locator('#ein-ord .zeile', { hasText: 'Weihnachten' }).click(); await p.waitForTimeout(150);
  /* Klaus 25.11. (Tablet): „Neue Kategorie anlegen funktioniert nicht, ist kein Haken“ – die Tastatur zeigte „Weiter“ und sprang ins Ordner-Feld */
  ok(await p.locator('[data-form=ein-kat-neu] input[enterkeyhint=done]').count() === 1 && await p.locator('[data-form=ein-ord-neu] input[enterkeyhint=done]').count() === 1, 'beide Felder sagen der Tastatur „Fertig“, nicht „Weiter“');
  await p.fill('[data-form=ein-kat-neu] input', 'Festtagsküche'); await p.click('[data-form=ein-kat-neu] .ein-ok'); await p.waitForTimeout(250);
  const neuK = p.locator('#ein-kat .zeile[aria-pressed=true]');
  ok(await neuK.count() === 1 && (await neuK.innerText()).includes('Festtagsküche') && await neuK.evaluate((e) => { const b = e.getBoundingClientRect(), f = e.closest('.fenster').getBoundingClientRect(); return b.top >= f.top && b.bottom <= f.bottom; }), 'der ✓-Knopf legt die Kategorie an, hakt sie an und rollt sie ins Bild');
  ok((await p.locator('#ein-ord .ein-ox').getAttribute('aria-label')).startsWith('Rezept aus „') && (await p.locator('.fenster .ein-ord').innerText()).startsWith('EVENT-ORDNER') || (await p.locator('.fenster .ein-ord').innerText()).startsWith('Event-Ordner'), 'der ✕ sagt, dass das REZEPT herausgenommen wird; der Abschnitt heißt „Event-Ordner“ (Klaus 25.11.)', await p.locator('#ein-ord .ein-ox').getAttribute('aria-label'));
  /* Klaus 25.11.: Bild oder Zeichen einer Kategorie auch im Fenster „Einordnen“ ändern */
  const kz = p.locator('#ein-kat .ein-kzeile', { has: p.locator('.zeile', { hasText: 'Festtagsküche' }) });
  ok(await p.locator('#ein-kat .ein-kbild[data-a=ein-bild]').count() > 5 && await kz.locator('.ein-kbild').count() === 1, 'jede Kategorie hat links ihr Bild als eigenen Knopf');
  await kz.locator('.ein-kbild').click(); await p.waitForSelector('[data-a=kat-emoji-setzen]');
  await p.locator('[data-a=kat-emoji-setzen][data-e="🎂"]').first().click(); await p.waitForSelector('#ein-kat', { timeout: 5000 }).catch(() => {});
  ok(await p.locator('#ein-kat').count() === 1 && (await kz.locator('.ein-kbild').innerText()).includes('🎂') && await p.locator('#ein-kat .zeile[aria-pressed=true]', { hasText: 'Festtagsküche' }).count() === 1, 'gewählt: zurück in „Einordnen“, die Kategorie trägt das neue Zeichen, die Wahl bleibt', [await p.locator('#ein-kat').count(), await kz.locator('.ein-kbild').innerHTML().catch(() => '–'), await p.locator('#ein-kat .zeile[aria-pressed=true]').innerText().catch(() => '–')].join(' · ').slice(0, 300));
  await kz.locator('.ein-kbild').click(); await p.waitForSelector('[data-a=kat-emoji-setzen]'); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  ok(await p.locator('#ein-kat').count() === 1, 'abgebrochen: auch dann zurück in „Einordnen“');
  await p.keyboard.press('Escape'); await p.goBack(); await p.waitForSelector('.fotokat');
  await p.locator('.fotokat .ord', { hasText: 'Weihnachten' }).click();
  ok(await p.locator('.karte').count() === 1 && (await p.locator('.karte strong').innerText()) === zweites && await p.locator('#start-rest .ueber h2').count() === 0 && await p.locator('.fotokat .ord[aria-pressed=true]', { hasText: 'Weihnachten' }).count() === 1, 'Tipp auf den Ordner zeigt sein Rezept; der Ordner ist in der Leiste gewählt, keine zweite Überschrift');
  ok(await p.locator('.karte small').count() === 0 || !(await p.locator('.karte small').innerText()).includes('Sushi'), 'auf der Karte steht nur der Name, die Kategorie wird nicht wiederholt');

  console.log('4 · Neues Rezept aus dem Ordner heraus; Formular mit Ordner-Wahl');
  await p.click('[data-a=neu]'); await p.click('[data-a=neu-form]');
  ok(await p.locator('[name=folder]').count() === 1 && (await p.locator('[name=folder] option:checked').innerText()) === 'Weihnachten' && await p.inputValue('[name=cat]') === '', 'das Formular hat ein Feld „Ordner“, der offene Ordner ist vorgewählt; die Kategorie bleibt frei');
  await p.fill('[name=name]', 'Zimtsterne'); await p.fill('[name=ings]', '200 g Mandeln'); await p.fill('[name=steps]', 'Backen.'); await p.selectOption('[name=cat]', 'kuchen'); await p.click('button[type=submit]'); await p.waitForSelector('.rezept-held h1');
  ok((await p.locator('.rezept-held .im-ordner').innerText()).includes('Weihnachten') && /Kuchen|Gebäck/.test(await p.locator('.rezept-held .meta').innerText()), 'gespeichert: im Ordner UND in der Kategorie');
  await p.click('[data-a=rleiste]'); await p.click('[data-a=bearbeiten]'); await p.selectOption('[name=folder]', { label: 'Für Gäste' }); await p.click('button[type=submit]'); await p.waitForSelector('.rezept-held h1');
  ok((await p.locator('.rezept-held .im-ordner').innerText()).includes('Für Gäste'), 'beim Bearbeiten lässt sich der Ordner wechseln');
  await p.click('[data-a=rleiste]'); await p.click('.rwerk [data-a=einordnen]'); await p.click('#ein-ord .ein-ox'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
  ok(await p.locator('.rezept-held .im-ordner').count() === 0 && (await p.locator('#toast').innerText()).includes('Rezept aus dem Event-Ordner genommen'), '✕ in der Zeile nimmt das Rezept heraus; die Meldung sagt „Rezept“ (Klaus 25.11.)');

  console.log('5 · Umbenennen, ordnen, Neuladen, Sicherung');
  await zurWerkstatt(p); await p.click('.zeile[data-zu=baum]'); await aeste(p); await p.waitForSelector('.bz-gruppe[data-art=ord]');
  const zahlO = (await p.locator('.bz-gruppe[data-art=ord]').locator('.bz-zahl').allInnerTexts()).map((t) => t.match(/^(\d+)/)[1]).join(',');
  ok(zahlO === '1,0,1' && await p.locator('.bz-gruppe[data-art=ord]').locator('.bz-kopf .sticker').count() === 2, 'Baum: Anzahl je Ordner, Bild aus dem Ordner', zahlO);
  await p.locator('.bz-gruppe[data-art=ord][data-name="Für Gäste"]').locator('.ord-name').fill('Für liebe Gäste'); await p.keyboard.press('Tab');
  await p.locator('.bz-gruppe[data-art=ord]').nth(2).locator('.bz-ggriff').scrollIntoViewIfNeeded(); const g = await p.locator('.bz-gruppe[data-art=ord]').nth(2).locator('.bz-ggriff').boundingBox(), z = await p.locator('.bz-gruppe[data-art=ord]').first().boundingBox();
  await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await p.mouse.down(); await p.mouse.move(g.x + g.width / 2, g.y - 20, { steps: 4 }); await p.mouse.move(g.x + g.width / 2, z.y + 8, { steps: 8 }); await p.waitForTimeout(100); await p.mouse.up(); await p.waitForTimeout(150);
  const folge = await p.locator('.bz-gruppe[data-art=ord] .ord-name').evaluateAll((l) => l.map((x) => x.value)); ok(folge.join('|') === 'Für liebe Gäste|Weihnachten|Sommer <b>', 'ziehen am Griff ordnet die Ordner um (neue Ordner stehen oben, Klaus 26.11.; gezogen wird der unterste nach oben)', folge.join('|'));
  await p.waitForTimeout(350); await p.reload(); await p.waitForSelector('.gruss'); l = await leiste(p);
  ok(l.indexOf('Für liebe Gäste 1') > 0 && l.indexOf('Für liebe Gäste 1') < l.indexOf('Weihnachten 1'), 'nach dem Neuladen: neuer Name, neue Reihenfolge in der Leiste', l.slice(-3).join(' | '));
  await zurWerkstatt(p); const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-a=sichern]')]); const sich = JSON.parse(await readFile(await dl.path(), 'utf8'));
  ok(sich.folders.length === 3 && sich.folders.some((o) => o.name === 'Für liebe Gäste') && sich.recipes.filter((r) => r.folder).length === 2 && sich.recipes.find((r) => r.name.startsWith('Dragon Roll')).cat, 'die Sicherung trägt die Ordner und die Zuordnung; die Kategorie steht daneben');

  console.log('6 · Ordner löschen: die Rezepte bleiben');
  await p.click('.zeile[data-zu=baum]'); await aeste(p); await p.waitForSelector('.bz-gruppe[data-art=ord]'); const vor = (await zustand(p)).rezepte.length;
  await p.locator('.bz-gruppe[data-art=ord][data-name="Weihnachten"] [data-a=ordner-weg]').click();
  ok(await p.locator('.bz-gruppe[data-art=ord]').count() === 2 && (await p.locator('#toast').innerText()).includes('1 Rezepte bleiben'), 'gelöscht: der Ordner ist weg, die Meldung sagt, dass das Rezept bleibt');
  await p.waitForTimeout(350); let z2 = await zustand(p); ok(z2.rezepte.length === vor && z2.rezepte.find((r) => r.name === zweites).folder === '' && z2.rezepte.find((r) => r.name === zweites).cat, 'das Rezept ist noch da, mit seiner Kategorie, ohne Ordner');
  await p.click('#toast [data-a=toast-tun]'); await p.waitForTimeout(350); z2 = await zustand(p); ok(z2.ordner.length === 3 && z2.rezepte.find((r) => r.name === zweites).folder, 'Rückgängig holt Ordner und Zuordnung zurück');
  await zumStart(p); await p.locator('.fotokat .ord').first().click(); ok(await p.locator('.karte').count() === 1 && await p.locator('.fotokat .ord[aria-pressed=true]').count() === 1, 'der Ordner in der Leiste der Startseite zeigt sein Rezept');
  await k.close();

  console.log('7 · Übernahme aus der alten App; ein Ordner, den es nicht gibt');
  ({ p, k } = await seite(() => { localStorage.setItem('mrz9m', JSON.stringify([{ id: 1, name: 'Im Ordner', cat: 'fisch', folder: 77 }, { id: 2, name: 'Alter Weg', cat: 'fld_77' }, { id: 3, name: 'Verwaist', cat: 'fleisch', folder: 99 }, { id: 4, name: 'Frei', cat: 'fleisch' }])); localStorage.setItem('mfd9m', JSON.stringify([{ id: 77, name: 'Omas Küche', ico: '👵' }])); }));
  await p.waitForSelector('.karte'); l = await leiste(p);
  ok(l.some((t) => t.endsWith('Omas Küche 2') && t.includes('👵')) && l[0] === 'Alle 4', 'der Ordner der alten App ist da, mit beiden Rezepten (auch dem über den alten Weg cat: fld_…)', l.join(' | '));
  ok(l.some((t) => /^Ohne Kategorie 1$/.test(t)), 'das Rezept vom alten Weg hat keine Kategorie und steht unter „Ohne Kategorie“ (nichts wird geraten)');
  await p.locator('.karte', { hasText: 'Verwaist' }).click(); await p.waitForSelector('.rezept-held h1'); ok(await p.locator('.rezept-held .im-ordner').count() === 0, 'ein Ordner, den es nicht gibt, ist kein Ordner: am Rezept steht keiner');
  await k.close();
  ok(fehler.length === 0, 'keine Fehler in der Konsole, kein Netz nach draußen', fehler.join(' · '));
} catch (e) { rot++; console.log('  ✗ ROT: Probe abgebrochen — ' + e.message.split('\n')[0]); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0;
