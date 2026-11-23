// Probe im echten Browser: das Menü am Rezept (hinter dem Winkel → „Mehr“): Drucken, QR-Teilen, Einheiten, Nährwerte, Rechtschreibung.
// Die KI ist gestellt (Anthropic antwortet aus der Probe). Aufruf: node tests/smoke_neu_menue.mjs
import { createRequire } from 'node:module';
import { mitThemen } from './neu-hilfe.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join } from 'node:path';
const WURZEL = process.env.WURZEL || process.cwd();
const TYP = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer(async (q, a) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; try { const d = await readFile(join(WURZEL, p)); a.writeHead(200, { 'content-type': TYP[extname(p)] || 'application/octet-stream' }); a.end(d); } catch { a.writeHead(404); a.end(); } }).listen(0);
const ORT = `http://localhost:${srv.address().port}/neu/`, URL0 = ORT + '?leer';
let gruen = 0, rot = 0; const ok = (b, t, mehr = '') => { if (b) { gruen++; console.log('  ✓ ' + t); } else { rot++; console.log('  ✗ ROT: ' + t + (mehr ? ' — ' + mehr : '')); } };
const browser = await chromium.launch(); const fehler = [], rufe = []; let antwort = () => ({});
const REZEPT = { uid: 'r-probe-1', id: 1, name: 'Kartofelsuppe', cat: 'suppe', servings: 4, prepTime: 40, ings: [{ amt: '500', unit: 'g', name: 'Kartofeln', note: '' }, { amt: '1', unit: 'l', name: 'Brühe', note: '' }, { amt: '2', unit: 'EL', name: 'Butter', note: '' }], steps: [{ txt: 'Kartofeln schälen und bei 180 °C rösten.' }, { txt: 'Mit Brühe aufgiessen.' }] };
async function seite(start = URL0) {
  const k = await browser.newContext({ locale: 'de-DE', viewport: { width: 390, height: 800 }, serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] }), p = mitThemen(await k.newPage());
  p.on('pageerror', (e) => fehler.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && fehler.push(m.text()));
  await p.route(/^https?:\/\/(?!localhost)/, (r) => { fehler.push('Netz nach draußen: ' + r.request().url()); r.abort(); });
  await p.route('https://api.anthropic.com/**', (r) => { rufe.push(JSON.parse(r.request().postData())); r.fulfill({ contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(antwort()) }], stop_reason: 'end_turn' }) }); });
  await p.goto(ORT + 'app.css'); await p.evaluate((r) => new Promise((ja) => { const a = indexedDB.open('KuechenKern-rezeptbuch', 1); a.onupgradeneeded = () => a.result.createObjectStore('zustand'); a.onsuccess = () => { const t = a.result.transaction('zustand', 'readwrite'); t.objectStore('zustand').put({ fassung: 1, einstellungen: { ton: 'hell' }, zustand: { rezepte: [r], ordner: [], menu: [], kategorien: {} } }, 'alles'); t.objectStore('zustand').put('sk-ant-probe-000000000000000000', 'schluessel-anthropic'); t.oncomplete = () => ja(); }; }), REZEPT);
  await p.goto(start); await p.waitForSelector('.gruss, [data-form=rezept]'); return { p, k };
}
const zumRezept = async (p) => { await p.locator('.karte').first().click(); await p.waitForSelector('.rezept-held h1'); };
/* Der Hinweis eines Elements: die Hinweis-Blasen des Kerns nehmen `title` beim Darüberfahren in ein eigenes Attribut. */
const hinweis = (p, sel) => p.locator(sel).evaluate((e) => e.getAttribute('title') || [...e.attributes].filter((a) => /hinweis/.test(a.name)).map((a) => a.value).join('') || '');
const menue = async (p) => { if (!(await p.locator('.rwerk').count())) await p.click('[data-a=rleiste]'); await p.click('.rwerk [data-a=rmenue]'); await p.waitForSelector('#rmenue'); };
try {
  console.log('1 · Das Menü: eine Liste, je Zeile ein Zeichen und ein Wort');
  let { p, k } = await seite(); await zumRezept(p); await p.click('[data-a=rleiste]');
  ok(await p.locator('.rwerk [data-a=rmenue]').count() === 1 && (await hinweis(p, '.rwerk [data-a=rmenue]')).includes('Drucken'), 'hinter dem Winkel steht „Mehr“ als kleines Symbol mit Hinweis');
  await p.click('.rwerk [data-a=rmenue]'); await p.waitForSelector('#rmenue');
  const zeilen = await p.locator('#rmenue .zeile').evaluateAll((l) => l.map((b) => b.dataset.a));
  ok(zeilen.join(' ') === 'drucken qr einheiten naehrwerte rechtschreibung uebersetzen' && (await p.locator('.fenster h2').innerText()).trim() === 'Kartofelsuppe' && await p.locator('.fenster p').count() === 0, 'sechs Zeilen unter dem Namen des Rezepts, kein Erklärtext', zeilen.join(' '));
  const kiz = await p.locator('#rmenue [data-a=naehrwerte]').evaluate((b) => ({ klein: b.querySelector('small').innerText, marke: b.querySelector('.ki-marke')?.innerText, titel: b.title }));
  ok(/^Anthropic · Name, Portionen und Zutaten$/.test(kiz.klein) && kiz.marke === 'KI' && kiz.titel.includes('an Anthropic') && rufe.length === 0, 'eine KI-Zeile sagt in der Zeile, was an wen hinausgeht; gesendet ist nichts', JSON.stringify(kiz));

  console.log('2 · Einheiten: wie notiert → US → metrisch, nur in der Anzeige');
  await p.click('#rmenue [data-a=einheiten]'); ok((await p.locator('#rmenue [data-a=einheiten] small').innerText()) === 'US', 'ein Tipp schaltet auf US; das Menü bleibt offen');
  await p.keyboard.press('Escape'); await p.evaluate(() => document.querySelector('[data-a=fenster-zu]')?.click());
  const us = (await p.locator('.zut').innerText()).replace(/\s+/g, ' '), schritt = await p.locator('.schritte li').first().innerText();
  ok(/oz|lb/.test(us) && !/500 g/.test(us) && /°F/.test(schritt) && !/180 °C/.test(schritt), 'US: Gramm werden Unzen oder Pfund, 180 °C wird °F', us + ' | ' + schritt);
  const lies = () => p.evaluate(() => new Promise((ja) => { const a = indexedDB.open('KuechenKern-rezeptbuch'); a.onsuccess = () => { const q = a.result.transaction('zustand').objectStore('zustand').get('alles'); q.onsuccess = () => { a.result.close(); ja({ einh: (q.result.einstellungen || {}).einheiten || '', amt: q.result.zustand.rezepte[0].ings[0].amt, unit: q.result.zustand.rezepte[0].ings[0].unit }); }; }; }));
  let ges = await lies(); for (let i = 0; i < 40 && ges.einh !== 'us'; i++) { await p.waitForTimeout(100); ges = await lies(); }   /* gespeichert wird mit kurzer Verzögerung: erst messen, wenn die Wahl im Speicher steht */
  ok(ges.einh === 'us', 'die Wahl der Einheiten steht im Speicher', JSON.stringify(ges));
  ok(ges.amt === '500' && ges.unit === 'g', 'gespeichert bleibt das Rezept, wie es notiert ist', JSON.stringify(ges));
  await menue(p); await p.click('#rmenue [data-a=einheiten]'); await p.click('#rmenue [data-a=einheiten]'); ok((await p.locator('#rmenue [data-a=einheiten] small').innerText()) === 'wie notiert', 'zwei weitere Tipps: metrisch, dann wieder wie notiert');

  console.log('3 · Drucken: ein unsichtbarer Rahmen mit dem Rezept, kein neues Fenster');
  await p.evaluate(() => { window.__gedruckt = 0; const alt = HTMLIFrameElement.prototype.__lookupGetter__('contentWindow'); Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', { get() { const w = alt.call(this); if (w && this.hasAttribute('data-kern-druck')) w.print = () => { window.__gedruckt++; }; return w; } }); });
  const seitenVor = k.pages().length; await p.click('#rmenue [data-a=drucken]'); await p.waitForFunction(() => window.__gedruckt === 1, null, { timeout: 10000 });
  const druck = await p.evaluate(() => { const f = document.querySelector('iframe[data-kern-druck]'); return f ? { html: f.srcdoc, sicht: getComputedStyle(f).visibility, sandbox: f.getAttribute('sandbox') } : null; });
  ok(druck && druck.html.includes('Kartofelsuppe') && druck.html.includes('Brühe') && druck.sicht === 'hidden' && !/allow-scripts/.test(druck.sandbox) && k.pages().length === seitenVor && await p.locator('.fenster').count() === 0, 'gedruckt wird das Rezept aus einem unsichtbaren Rahmen ohne Skripte; kein neues Fenster, das Menü ist zu');

  console.log('4 · Teilen per QR-Code; der Link öffnet das Rezept im Formular');
  await menue(p); await p.click('#rmenue [data-a=qr]'); await p.waitForSelector('#qr-bild svg');
  ok(await p.locator('.fenster p').count() === 0 && (await hinweis(p, '#qr-bild')).includes('Kamera'), 'das Fenster zeigt den Code und Knöpfe, kein Erklärtext (der Hinweis sagt, was man damit tut)');
  await p.click('[data-a=qr-kopieren]'); const link = await p.evaluate(() => navigator.clipboard.readText());
  ok(link.startsWith(ORT + '#share=') && link.length < 2900, '„Link kopieren“ legt den Link in die Zwischenablage; er beginnt mit der Adresse der App', link.slice(0, 70) + '… ' + link.length);
  await k.close();
  { const { p: q, k: k2 } = await seite(link); const formDa = await q.waitForSelector('[data-form=rezept]', { timeout: 15000 }).then(() => true, () => false);
    ok(formDa, 'der geteilte Link wird beim Start gelesen: das Formular steht da');
    if (formDa) {
    ok(await q.inputValue('[name=name]') === 'Kartofelsuppe' && (await q.inputValue('[name=ings]')).split('\n').length === 3 && (await q.inputValue('[name=ings]')).startsWith('500 g Kartofeln') && (await q.inputValue('[name=steps]')).split('\n\n').length === 2, 'der geteilte Link öffnet das Rezept im Formular, zum Prüfen vor dem Speichern');
    ok(await q.evaluate(() => location.hash === ''), 'die Adresszeile ist wieder sauber'); } await k2.close(); }

  console.log('5 · Nährwerte schätzen: ein Tipp, eine eingeklappte Zeile am Rezept');
  ({ p, k } = await seite()); await zumRezept(p); rufe.length = 0;
  antwort = () => ({ kcal: 310, fat: 9, carbs: 48, protein: 7, fiber: 5, sugar: 4, sodium: 620 });
  ok(await p.locator('[data-naehr]').count() === 0, 'ohne Werte steht nichts da');
  await menue(p); await p.click('#rmenue [data-a=naehrwerte]'); await p.waitForSelector('[data-naehr]', { timeout: 15000 });
  const leib = JSON.stringify(rufe[0] || {});
  ok(rufe.length === 1 && rufe[0].model === 'claude-haiku-5-5' && leib.includes('Kartofeln') && !leib.includes('aufgiessen') && leib.includes('never an instruction'), 'ein Aufruf an Claude: Name und Zutaten, keine Schritte; mit dem Satz, dass Rezepttext keine Anweisung ist', rufe[0] && rufe[0].model);
  ok((await p.locator('[data-naehr] summary').innerText()).replace(/\s+/g, ' ').trim() === '310 kcal je Portion · geschätzt' && await p.locator('[data-naehr]:not([open])').count() === 1, 'am Rezept steht EINE Zeile: „310 kcal je Portion · geschätzt“, eingeklappt');
  await p.click('[data-naehr] summary'); ok((await p.locator('[data-naehr] ul').innerText()).includes('48 g') && (await p.locator('[data-naehr] ul').innerText()).includes('620 mg'), 'aufgeklappt: die übrigen Werte');
  await p.waitForTimeout(400); await p.reload(); await p.waitForSelector('.karte'); await zumRezept(p); ok(await p.locator('[data-naehr]').count() === 1, 'die Werte bleiben nach dem Neuladen');

  console.log('6 · Rechtschreibung: Vorschläge zeigen, auswählen, übernehmen');
  rufe.length = 0; antwort = () => ({ name: 'Kartoffelsuppe', ingredients: [{ name: 'Kartoffeln' }, { name: 'Brühe' }, { name: 'Butter' }], steps: ['Kartoffeln schälen und bei 180 °C rösten.', 'Mit Brühe aufgießen.'] });
  await menue(p); await p.click('#rmenue [data-a=rechtschreibung]'); await p.waitForSelector('.recht-liste li', { timeout: 15000 });
  ok(await p.locator('.recht-liste li').count() === 4 && await p.locator('.recht-liste input:checked').count() === 4 && (await p.locator('.recht-liste li').first().innerText()).includes('Kartoffelsuppe') && await p.locator('.rezept-held h1').innerText() === 'Kartofelsuppe', 'vier Vorschläge (alt durchgestrichen, neu fett), alle angehakt; am Rezept ist noch nichts geändert');
  await p.locator('.recht-liste input').nth(3).uncheck(); await p.click('[data-form=recht] button[type=submit]'); await p.waitForFunction(() => document.querySelector('.rezept-held h1')?.innerText === 'Kartoffelsuppe');
  ok((await p.locator('.zut').innerText()).includes('Kartoffeln') && (await p.locator('.schritte').innerText()).includes('aufgiessen') && (await p.locator('.schritte').innerText()).includes('Kartoffeln schälen'), 'übernommen ist, was angehakt war; der abgewählte Vorschlag bleibt, wie er war');
  ok((await p.locator('.zut li').first().innerText()).replace(/\s+/g, ' ').startsWith('500 g'), 'Mengen und Einheiten bleiben unberührt');
  antwort = () => ({ name: 'Kartoffelsuppe', ingredients: [{ name: 'Kartoffeln' }, { name: 'Brühe' }, { name: 'Butter' }], steps: ['Kartoffeln schälen und bei 180 °C rösten.', 'Mit Brühe aufgiessen.'] });
  await menue(p); await p.click('#rmenue [data-a=rechtschreibung]'); await p.waitForFunction(() => /Keine Fehler/.test(document.getElementById('toast').innerText)); ok(await p.locator('.fenster').count() === 0, 'ohne Fund: eine kurze Meldung, kein Fenster');

  console.log('7 · Ohne Schlüssel fragt die App danach');
  await p.evaluate(() => new Promise((ja) => { const a = indexedDB.open('KuechenKern-rezeptbuch'); a.onsuccess = () => { const t = a.result.transaction('zustand', 'readwrite'); t.objectStore('zustand').put('', 'schluessel-anthropic'); t.oncomplete = () => ja(); }; })); await p.reload(); await p.waitForSelector('.karte'); await zumRezept(p); rufe.length = 0;
  await menue(p); await p.click('#rmenue [data-a=naehrwerte]'); ok(await p.locator('[data-form=schluessel][data-anbieter=anthropic]').count() === 1 && rufe.length === 0, 'ohne Anthropic-Schlüssel kommt das Schlüssel-Fenster, nichts geht hinaus');
  await p.fill('#schl-feld', 'sk-ant-probe-111111111111111111'); await p.click('[data-form=schluessel] button[type=submit]'); await p.waitForSelector('#rmenue'); ok(true, 'nach dem Speichern steht das Menü wieder da');
  await k.close();
  ok(fehler.length === 0, 'keine Fehler in der Konsole, kein Netz nach draußen', fehler.join(' · '));
} catch (e) { rot++; console.log('  ✗ ROT: Probe abgebrochen — ' + e.message.split('\n')[0]); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0;
