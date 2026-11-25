// Probe im echten Browser: Food-Zine als Poster-Auftrag der alten App (neu/zine.mjs, kern/ausgabe/zine.mjs, Fluss A) und die Sammlung
// „Meine Food-Zine-Bilder“; dazu im Kreativbuch die Einzelauswahl, das Auftragsfeld mit Claude/ChatGPT und die Antwort im alten Format.
// Gemessen: Einstieg am Rezept und im Kreativbuch, Auftrag je Format, Extras, Trend, alle Rezeptdaten, Bildwahl (Rezept, eigenes, ohne),
// Feld änderbar und nicht überschrieben, Kopieren (Text + PNG in einem Eintrag), Claude/ChatGPT öffnen die richtige Adresse, kein
// Erzeugen-Knopf und kein Aufruf einer KI, alte Seiten r.zine und Beispiel-Sätze landen einmal in der Sammlung, die Sammlung überlebt das
// Neuladen, Ordnen mit Finger (langer Druck) und Maus, Großansicht, Druck, Als Rezeptbild, Entfernen mit Rückgängig, Als Buch, 390 und 1280 px.
// Zwischenablage: die echte des Browsers (Rechte erteilt); window.open ist gestellt (zeichnet nur auf). Kein Netz nach draußen.
// Aufruf: node tests/smoke_neu_poster.mjs   (NUR_TEIL=3,4 fährt nur diese Abschnitte; WURZEL=<Kopie> prüft eine Kopie)
// Die Erwartungen (Aufträge) kommen aus dem Kern NEBEN dieser Datei, nicht aus WURZEL.
import { createRequire } from 'node:module';
import { deflateSync } from 'node:zlib';
import { mitThemen } from './neu-hilfe.mjs';
import { zinePoster, zineTrend, zineFotoHinweis, ZINE_FORMATE } from '../kern/ausgabe/zine.mjs';
import { kbSammelAuftrag } from '../kern/ausgabe/kreativbuch.mjs';
import frApp from '../neu/sprachen/fr.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join } from 'node:path';
const WURZEL = process.env.WURZEL || process.cwd();
const TYP = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer(async (q, a) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; try { const d = await readFile(join(WURZEL, p)); a.writeHead(200, { 'content-type': TYP[extname(p)] || 'application/octet-stream' }); a.end(d); } catch { a.writeHead(404); a.end(); } }).listen(0);
const HERKUNFT = `http://localhost:${srv.address().port}`, ORT = HERKUNFT + '/neu/', URL0 = ORT + '?leer';
let gruen = 0, rot = 0; const ok = (b, t, mehr = '') => { if (b) { gruen++; console.log('  ✓ ' + t); } else { rot++; console.log('  ✗ ROT: ' + t + (mehr ? ' — ' + mehr : '')); } };
const browser = await chromium.launch(); const fehler = [];
/* Ein einfarbiges PNG in gewünschter Größe (klein auf der Leitung, groß auf der Leinwand). */
function png(b, h, [r, g, bl] = [200, 120, 60]) {
  const zeile = Buffer.alloc(b * 3 + 1); for (let i = 0; i < b; i++) { zeile[1 + i * 3] = r; zeile[2 + i * 3] = g; zeile[3 + i * 3] = bl; }
  const roh = Buffer.concat(Array.from({ length: h }, () => zeile));
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const block = (typ, daten) => { const l = Buffer.alloc(4); l.writeUInt32BE(daten.length); const td = Buffer.concat([Buffer.from(typ), daten]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(b, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), block('IHDR', ihdr), block('IDAT', deflateSync(roh)), block('IEND', Buffer.alloc(0))]);
}
const DATA = (b, h, farbe) => 'data:image/png;base64,' + png(b, h, farbe).toString('base64');
const FOTO = DATA(2400, 1600, [240, 200, 40]), S1 = DATA(50, 70, [220, 60, 60]), S2 = DATA(50, 70, [60, 160, 60]), S3 = DATA(50, 70, [60, 60, 220]);
const Z = (n, name, extra = {}) => ({ uid: 'r-' + n, id: n, name, cat: 'fleisch', servings: 4, ings: [{ id: 1, amt: '500', unit: 'g', name: 'Rind', note: '', ck: false }, { id: 2, amt: '2', unit: '', name: 'Zwiebeln', note: '', ck: false }, { id: 3, amt: '1', unit: 'EL', name: 'Paprika', note: '', ck: false }],
  steps: [{ id: 1, txt: 'Fleisch anbraten.', note: '' }, { id: 2, txt: 'Zwiebeln dazu.', note: '' }, { id: 3, txt: 'Zwei Stunden schmoren.', note: '' }], created: '2026-11-01T10:00:00.000Z', modified: '2026-11-01T10:00:00.000Z', ...extra });
const GUL = Z(1, 'Rindergulasch', { img: FOTO, prepTime: 120, nutrition: { kcal: 540, fat: 24, carbs: 12, protein: 52, fiber: 3, sugar: 6, sodium: 900 }, flavors: ['würzig'] });
const BESTAND = () => [GUL, Z(2, 'Hefezopf', { cat: 'brot', yieldText: '1 Zopf' }), Z(3, 'Braten', { folder: 'o-1' })];
const KAT = { id: 'fleisch', name: 'Fleisch', symbol: '🍲' };
const soll = (r, o = {}) => zinePoster(r, { kategorie: KAT, sprache: 'de', ...o });

/* Eine Seite mit Bestand. opt: { rezepte, einstellungen, ort, breite, ordner } */
async function seite({ rezepte = BESTAND(), einstellungen = {}, ort = 'de-DE', breite = 390, ordner = [{ id: 'o-1', name: 'Feste' }], kontext = null } = {}) {
  const k = kontext || await browser.newContext({ viewport: { width: breite, height: 860 }, serviceWorkers: 'block', locale: ort, acceptDownloads: true }), p = mitThemen(await k.newPage());
  if (!kontext) {
    await k.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: HERKUNFT });
    await k.addInitScript(() => { window.__offen = []; window.open = (u, ziel, art) => { window.__offen.push([String(u), ziel, art]); return null; }; });
  }
  p.setDefaultTimeout(8000);
  /* „focus-without-user-activation“: meldet Chromium, wenn drucke() (kern/ausgabe/druck.mjs) im Druckrahmen w.focus() ruft, ohne dass ein Mensch
     getippt hat; gleiche Meldung in smoke_neu_kreativbuch (dort als bekannt geführt). Sie kommt aus der Probe, nicht aus dem Food-Zine. */
  const fremd = (t) => /Failed to load resource|context is sandboxed and lacks the 'allow-same-origin'|focus-without-user-activation/.test(t);
  p.on('pageerror', (e) => !fremd(e.message) && fehler.push(e.message)); p.on('console', (m) => m.type() === 'error' && !fremd(m.text()) && fehler.push(m.text()));
  await p.route(/^https?:\/\/(?!localhost)/, (r) => { fehler.push('Netz nach draußen: ' + r.request().url()); r.abort(); });
  if (!kontext) {
    await p.goto(ORT + 'app.css');
    await p.evaluate(({ rezepte, einstellungen, ordner }) => new Promise((ja, nein) => { const a = indexedDB.open('KuechenKern-rezeptbuch', 1); a.onupgradeneeded = () => a.result.createObjectStore('zustand'); a.onerror = () => nein(a.error); a.onsuccess = () => { try { const t = a.result.transaction('zustand', 'readwrite'), l = t.objectStore('zustand');
      l.put({ fassung: 1, einstellungen: { ton: 'hell', ...einstellungen }, zustand: { rezepte, ordner, menu: [], kategorien: { eigene: [], namen: {}, ausgeblendet: [], folge: [] } } }, 'alles'); t.oncomplete = () => { a.result.close(); ja(); }; } catch (f) { nein(f); } }; }), { rezepte, einstellungen, ordner });
  }
  await p.goto(URL0); await p.waitForSelector('.gruss'); return { p, k };
}
const geh = async (p, z) => { await p.keyboard.press('Escape'); if (await p.locator('#leiste .fl-griff').count()) await p.click('#leiste .fl-griff'); await p.click(`#leiste [data-zu=${z}]`); };
const toast = (p) => p.locator('#toast').innerText().catch(() => '');
const wennToast = (p, muster) => p.waitForFunction((m) => new RegExp(m).test(document.querySelector('#toast')?.textContent || ''), muster, { timeout: 12000 }).then(() => true, () => false);
const lagerHol = (p, schluessel) => p.evaluate((k) => new Promise((ja) => { const a = indexedDB.open('KuechenKern-rezeptbuch'); a.onsuccess = () => { const q = a.result.transaction('zustand').objectStore('zustand').get(k); q.onsuccess = () => { a.result.close(); ja(q.result ?? null); }; }; }), schluessel);
const lagerSetz = (p, schluessel, wert) => p.evaluate(([k, w]) => new Promise((ja) => { const a = indexedDB.open('KuechenKern-rezeptbuch'); a.onsuccess = () => { const t = a.result.transaction('zustand', 'readwrite'); t.objectStore('zustand').put(w, k); t.oncomplete = () => { a.result.close(); ja(); }; }; }), [schluessel, wert]);
const bestandWenn = async (p, pruef) => { let b = await lagerHol(p, 'alles'); for (let i = 0; i < 60 && !pruef(b); i++) { await p.waitForTimeout(100); b = await lagerHol(p, 'alles'); } return b; };
const sammlungWenn = async (p, pruef) => { let s = await lagerHol(p, 'zine-sammlung'); for (let i = 0; i < 80 && !pruef(s); i++) { await p.waitForTimeout(100); s = await lagerHol(p, 'zine-sammlung'); } return s; };
const namen = (s) => (s?.folge || []).map((e) => e.name);
const zumRezept = async (p, name) => { await geh(p, 'start'); await p.locator('.karte', { hasText: name }).first().click(); await p.waitForSelector('.rezept-held h1'); };
const zumZine = async (p, name) => { await zumRezept(p, name); if (!(await p.locator('.rwerk').count())) await p.click('[data-a=rleiste]'); await p.click('.rwerk [data-a=rmenue]'); await p.waitForSelector('#rmenue'); await p.click('#rmenue [data-a=zine]'); await p.waitForSelector('#zine-ansicht'); };
const zumZineAusKreativ = async (p) => { await geh(p, 'kreativ'); await p.click('.kr-teil [data-a=zine-auf]'); await p.waitForSelector('#zine-ansicht'); };
const feld = (p) => p.inputValue('#zn-auftrag');
const ablage = (p) => p.evaluate(async () => { for (let n = 0; ; n++) { try { const it = (await navigator.clipboard.read())[0], typen = [...it.types]; let masse = null; if (typen.includes('image/png')) { const b = await createImageBitmap(await it.getType('image/png')); masse = [b.width, b.height]; } return { typen, text: typen.includes('text/plain') ? await (await it.getType('text/plain')).text() : '', masse }; } catch (f) { if (n >= 9 || !/has changed/.test(String(f))) throw f; await new Promise((w) => setTimeout(w, 150)); } } });
const leeren = (p) => p.evaluate(() => navigator.clipboard.writeText('LEER'));
const offen = (p) => p.evaluate(() => window.__offen.slice());
const quer = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const kacheln = (p) => p.locator('#zs-gitter .zs-kachel[data-id] img').evaluateAll((l) => l.map((i) => i.getAttribute('alt')));   /* nicht `title`: die Hinweis-Blasen nehmen ihn beim Überfahren weg */
const druckStellen = (p) => p.evaluate(() => { window.__gedruckt = 0; window.__druck = ''; const alt = HTMLIFrameElement.prototype.__lookupGetter__('contentWindow'); Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', { configurable: true, get() { const w = alt.call(this); if (w && this.hasAttribute('data-kern-druck')) { window.__druck = this.srcdoc; w.print = () => { window.__gedruckt++; }; } return w; } }); });
/* Bilddateien, im Browser erzeugt (verschiedene Farben, damit sich die Kacheln unterscheiden). */
const bildDatei = (p, b, h, farbe) => p.evaluate(async ([b, h, farbe]) => { const c = document.createElement('canvas'); c.width = b; c.height = h; const x = c.getContext('2d'); x.fillStyle = farbe; x.fillRect(0, 0, b, h); x.fillStyle = '#000'; x.fillRect(0, 0, b / 4, h / 4);
  const u = new Uint8Array(await (await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9))).arrayBuffer()); let t = ''; for (let i = 0; i < u.length; i += 0x8000) t += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(t); }, [b, h, farbe]).then((b64) => Buffer.from(b64, 'base64'));
const dazu = async (p, dateien) => { const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-a=zs-dazu]')]); await fc.setFiles(dateien); };
/* Ziehen mit dem Finger: PointerEvents vom Typ touch, erst lange halten, dann über das Ziel, dann los. */
const finger = (p, von, nach, halten = 600) => p.evaluate(async ([von, nach, halten]) => {
  const k = [...document.querySelectorAll('#zs-gitter .zs-kachel[data-id]')], a = k[von], b = k[nach], ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
  const P = (typ, x, y) => a.dispatchEvent(new PointerEvent(typ, { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 7, isPrimary: true, button: 0, clientX: x, clientY: y }));
  const x0 = ra.x + ra.width / 2, y0 = ra.y + ra.height / 2, x1 = rb.x + rb.width / 2, y1 = rb.y + rb.height / 2;
  P('pointerdown', x0, y0); await new Promise((w) => setTimeout(w, halten));
  for (let i = 1; i <= 8; i++) { P('pointermove', x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8); await new Promise((w) => setTimeout(w, 16)); }
  P('pointerup', x1, y1); a.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x1, clientY: y1 }));
}, [von, nach, halten]);
const maus = async (p, von, nach) => { const k = p.locator('#zs-gitter .zs-kachel[data-id]'), a = await k.nth(von).boundingBox(), b = await k.nth(nach).boundingBox(); await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 }); await p.mouse.up(); };

const will = (n) => !process.env.NUR_TEIL || process.env.NUR_TEIL.split(',').includes(String(n));
let p, k;
try {
  if (will(1)) {
  console.log('1 · Einstieg: am Rezept („Mehr“, Bild-Blatt) mit diesem Rezept, im Kreativbuch; eine Ansicht ohne Erzeugen, 390 px');
  ({ p, k } = await seite());
  await zumZine(p, 'Rindergulasch');
  ok(await p.inputValue('#zn-rezept') === 'r-1', '„Mehr“ → Food-Zine öffnet die Ansicht mit diesem Rezept');
  ok(await feld(p) === soll(GUL), 'das Auftragsfeld trägt den Poster-Auftrag der alten App zu diesem Rezept', (await feld(p)).slice(0, 160));
  const gruppen = await p.locator('#zn-rezept optgroup').evaluateAll((l) => l.map((g) => [g.label, [...g.querySelectorAll('option')].map((o) => o.textContent)]));
  ok(gruppen.some(([l, o]) => /Fleisch$/.test(l) && o.join() === 'Rindergulasch') && gruppen.some(([l, o]) => /brot$/i.test(l) && o.join() === 'Hefezopf') && gruppen.some(([l, o]) => l === '📁 Feste' && o.join() === 'Braten') && (await p.locator('#zn-rezept option').first().innerText()) === '– Kein Lieblingsrezept –',
    '„Wähle ein Lieblingsrezept“: gruppiert nach Kategorie und Ordner, ein Rezept im Ordner steht nur dort', JSON.stringify(gruppen));
  const z = await p.evaluate(() => ({ formate: [...document.querySelectorAll('.zn-format')].map((b) => b.dataset.f), an: document.querySelector('.zn-format[aria-checked=true]')?.dataset.f, extras: [...document.querySelectorAll('.zn-extras input')].map((x) => [x.dataset.extra, x.checked]), bild: document.querySelector('[data-a=zn-bild][aria-checked=true]')?.dataset.w, trend: document.querySelector('.zn-trend')?.textContent.trim() }));
  ok(z.formate.join() === ZINE_FORMATE.join() && z.an === 'poster', 'sechs Formate, Vorgabe Poster', JSON.stringify(z.formate));
  ok(z.extras.length === 5 && z.extras.every(([, c]) => !c), 'fünf Extras als Haken, alle aus');
  ok(z.bild === 'rezept' && await p.locator('#zn-vorschau img.zn-mini').getAttribute('src') === FOTO, 'Bild für die KI: Vorgabe „Bild aus Rezept“, mit Miniatur');
  ok(z.trend === '🔥 KI-Überraschung: Trendrezepte entdecken!', 'der Trend-Knopf der alten App steht da', z.trend);
  const knoepfe = await p.locator('#zine-ansicht [data-a]').evaluateAll((l) => l.map((b) => b.dataset.a));
  ok(!knoepfe.some((a) => /erzeug|zine-los|ki-bild/.test(a)) && !/Erzeugen|Cent/.test(await p.locator('#zine-ansicht').innerText()) && await p.locator('.zine-seite').count() === 0, 'kein „Erzeugen“, keine Kosten, keine leeren Seiten-Kästen mehr', knoepfe.join(' '));
  ok(['zn-kopieren', 'zn-claude', 'zn-chatgpt'].every((a) => knoepfe.includes(a)) && await p.locator('#zn-neu').isHidden(), 'Kopieren · Claude · ChatGPT; „Auftrag neu bauen“ erst nach einer eigenen Änderung');
  ok(await quer(p) <= 0, 'am Handy (390 px) läuft nichts quer', String(await quer(p)));
  await zumRezept(p, 'Hefezopf'); await p.click('.rezept-held'); await p.waitForSelector('.fenster [data-a=zine]');
  ok(/Poster-Auftrag/.test(await p.locator('.fenster [data-a=zine]').innerText()), 'das Bild-Blatt hat die Zeile „Food-Zine“ mit Unterzeile');
  await p.click('.fenster [data-a=zine]'); await p.waitForSelector('#zine-ansicht');
  ok(await p.inputValue('#zn-rezept') === 'r-2' && (await feld(p)).includes('👥 Ergibt: 1 Zopf'), 'vom Bild-Blatt: dieses Rezept; „Ergibt“ statt Portionen');
  ok(await p.locator('#zn-vorschau').innerText() === 'Dieses Rezept hat noch kein Bild.', 'ohne Rezeptbild sagt die Vorschau es');
  await geh(p, 'kreativ');
  ok(await p.locator('.kr-teil[data-g=zine] [data-a=zine-auf]').count() === 1 && await p.locator('.kr-teil[data-g=zine] [data-a=kreativ-zine]').count() === 1, 'im Kreativbuch: „Food-Zine“ und „Meine Food-Zine-Bilder“');
  await p.click('.kr-teil [data-a=zine-auf]'); await p.waitForSelector('#zine-ansicht');
  ok(await p.inputValue('#zn-rezept') === 'r-2', 'aus dem Kreativbuch: das zuletzt gewählte Rezept bleibt');
  await geh(p, 'werkstatt'); await p.click('[data-zu=bilder]').catch(async () => { await p.click('[data-a=werk-auf][data-g=ordnung]'); await p.click('[data-zu=bilder]'); }); await p.waitForSelector('.bildgitter');
  ok(await p.locator('[data-a=bilder-filter][data-f=zine]').count() === 0, 'im Bilder-Ordner gibt es den Filter „Food-Zine“ nicht mehr');
  await k.close();
  }

  if (will(2)) {
  console.log('2 · Der Auftrag: je Format, Extras, Trend; ein anderes Rezept; ohne Rezept leer');
  ({ p, k } = await seite());
  await zumZine(p, 'Rindergulasch');
  for (const f of ZINE_FORMATE) { await p.click(`.zn-format[data-f=${f}]`); ok(await feld(p) === soll(GUL, { format: f }) && await p.locator(`.zn-format[data-f=${f}]`).getAttribute('aria-checked') === 'true', `Format ${f}: der Auftrag der alten App`, (await feld(p)).slice(0, 90)); }
  const z = await feld(p);
  ok(z.startsWith('Erstelle ein einziges großes, farbiges Food-Zine-Poster im Mixed-Media-Stil als Breitformat-Panorama 16:9.') && z.includes('🍲 Kategorie: Fleisch') && z.includes('⏱️ Zubereitungszeit: 120 Minuten') && z.includes('Nährwerte pro Portion: 540 kcal') && z.includes('Aromen/Stil: würzig') && z.includes('• 1 EL Paprika') && z.includes('3. Zwei Stunden schmoren.'), 'Panorama mit allen Rezeptdaten: Kategorie mit Zeichen, Zeit, Nährwerte, Aromen, alle Zutaten und Schritte');
  await p.click('.zn-format[data-f=a4]');
  await p.check('.zn-extras input[data-extra=nutr]'); await p.check('.zn-extras input[data-extra=qr]');
  ok(await feld(p) === soll(GUL, { format: 'a4', extras: ['nutr', 'qr'] }) && (await feld(p)).includes('➕ EXTRA-ANFORDERUNGEN:'), 'Extras: je Haken ein Satz unter „EXTRA-ANFORDERUNGEN“');
  await p.uncheck('.zn-extras input[data-extra=qr]');
  ok(await feld(p) === soll(GUL, { format: 'a4', extras: ['nutr'] }), 'ein Haken weg: sein Satz ist weg');
  await p.click('.zn-trend');
  ok(await feld(p) === zineTrend('de'), '„KI-Überraschung“ setzt den Trend-Auftrag der alten App (ohne Rezept)');
  await p.click('.zn-format[data-f=insta]');
  ok(await feld(p) === soll(GUL, { format: 'insta', extras: ['nutr'] }), 'die nächste Einstellung baut wieder den Rezept-Auftrag (wie alt)');
  await p.selectOption('#zn-rezept', 'r-3');
  ok(await feld(p) === soll(BESTAND()[2], { format: 'insta', extras: ['nutr'] }), 'ein anderes Lieblingsrezept: sein Auftrag');
  await p.selectOption('#zn-rezept', '');
  ok(await feld(p) === '' && (await p.getAttribute('#zn-auftrag', 'placeholder')).includes('Lieblingsrezept'), 'ohne Lieblingsrezept ist das Feld leer (wie alt), der Platzhalter sagt, was zu tun ist');
  await p.click('[data-a=zn-kopieren]'); ok(await wennToast(p, 'Wähle zuerst'), 'Kopieren ohne Auftrag sagt es', await toast(p));
  await k.close();
  }

  if (will(3)) {
  console.log('3 · Das Feld ist änderbar und wird nicht überschrieben; „Auftrag neu bauen“');
  ({ p, k } = await seite());
  await zumZine(p, 'Rindergulasch');
  await p.fill('#zn-auftrag', 'Mein eigener Auftrag: ein Poster mit viel Paprika.');
  ok(await p.locator('#zn-neu').isVisible(), 'nach einer eigenen Änderung steht „Auftrag neu bauen“ da');
  await p.click('.zn-format[data-f=karte]'); await p.check('.zn-extras input[data-extra=shop]');
  ok(await feld(p) === 'Mein eigener Auftrag: ein Poster mit viel Paprika.' && await p.locator('.zn-format[data-f=karte]').getAttribute('aria-checked') === 'true', 'Format und Extras ändern überschreiben den eigenen Text nicht');
  await p.click('.zn-trend');
  ok(await feld(p) === zineTrend('de') && await p.locator('#zn-neu').isHidden(), 'der Trend-Knopf ist eine ausdrückliche Wahl: er setzt seinen Auftrag');
  await p.fill('#zn-auftrag', 'Noch einmal eigen.'); await p.selectOption('#zn-rezept', 'r-2');
  ok(await feld(p) === 'Noch einmal eigen.', 'auch ein anderes Rezept überschreibt den eigenen Text nicht');
  await leeren(p); await p.click('[data-a=zn-kopieren]'); await wennToast(p, 'kopiert');
  ok((await ablage(p)).text === 'Noch einmal eigen.', 'kopiert wird, was im Feld steht', (await ablage(p)).text.slice(0, 80));
  await p.click('#zn-neu');
  const brot = { id: 'brot', name: (await p.locator('#zn-rezept optgroup', { has: p.locator('option[value=r-2]') }).getAttribute('label')).trim(), symbol: '' };   /* „Brot“ ist hier eine mitgebrachte Kategorie ohne Zeichen */
  const sollBrot = zinePoster(BESTAND()[1], { format: 'karte', extras: ['shop'], kategorie: brot, sprache: 'de' });
  ok(await feld(p) === sollBrot && sollBrot.includes('🍽️ Kategorie: ' + brot.name) && await p.locator('#zn-neu').isHidden(), '„Auftrag neu bauen“ baut aus den Einstellungen', (await feld(p)).slice(0, 200));
  await p.fill('#zn-auftrag', sollBrot);
  ok(await p.locator('#zn-neu').isHidden(), 'steht wieder genau der gebaute Auftrag da, ist der Knopf weg');
  await k.close();
  }

  if (will(4)) {
  console.log('4 · Bild für die KI und Kopieren: Text und PNG (≤ 1600 px) in einem Eintrag; eigenes Bild (1200 px); ohne Bild nur Text');
  ({ p, k } = await seite());
  await zumZine(p, 'Rindergulasch'); await p.waitForTimeout(400);
  await leeren(p); await p.click('[data-a=zn-kopieren]'); await wennToast(p, 'Text und Bild kopiert');
  let a = await ablage(p);
  ok(a.typen.includes('image/png') && a.typen.includes('text/plain') && a.text === soll(GUL) + '\n\n' + zineFotoHinweis('de'), 'mit Rezeptbild: Auftrag samt Satz zum Foto UND Bild in einem Eintrag', JSON.stringify(a.typen));
  ok(a.masse && Math.max(...a.masse) === 1600 && Math.abs(a.masse[0] / a.masse[1] - 1.5) < 0.01, 'das PNG ist auf 1600 px lange Kante umgerechnet (Seitenverhältnis bleibt)', JSON.stringify(a.masse));
  const gross = await bildDatei(p, 3000, 2000, '#3a8');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-a=zn-bild][data-w=eigen]')]); await fc.setFiles({ name: 'eigen.jpg', mimeType: 'image/jpeg', buffer: gross });
  await p.waitForFunction(() => document.querySelector('#zn-vorschau img.zn-mini') && document.querySelector('[data-a=zn-bild][data-w=eigen]')?.getAttribute('aria-checked') === 'true', null, { timeout: 8000 }).catch(() => {});
  const eigen = await p.locator('#zn-vorschau img.zn-mini').getAttribute('src').catch(() => '');
  const em = eigen ? await p.evaluate(async (s) => { const b = await createImageBitmap(await (await fetch(s)).blob()); return [b.width, b.height]; }, eigen) : null;
  ok(/^data:image\/jpeg/.test(eigen) && em && Math.max(...em) === 1200, '„Eigenes Bild“: per Datei, lange Kante 1200 px, mit Miniatur', JSON.stringify(em));
  ok(await p.locator('#zn-vorschau [data-a=zn-eigen]').count() === 1, 'daneben „Anderes Bild …“');
  await p.waitForTimeout(400); await leeren(p); await p.evaluate(() => { document.querySelector('#toast').innerHTML = ''; }); await p.click('[data-a=zn-kopieren]'); await wennToast(p, 'Text und Bild kopiert');
  a = await ablage(p);
  ok(a.typen.includes('image/png') && a.masse && Math.max(...a.masse) === 1200, 'kopiert wird das eigene Bild', JSON.stringify(a.masse));
  await p.click('[data-a=zn-bild][data-w=ohne]'); await leeren(p); await p.click('[data-a=zn-kopieren]'); await wennToast(p, 'Auftrag kopiert');
  a = await ablage(p);
  ok(!a.typen.includes('image/png') && a.text === soll(GUL) && /^Auftrag kopiert$/.test((await toast(p)).trim()), '„Ohne Bild“: nur der Text, die Meldung sagt „Auftrag kopiert“', JSON.stringify(a.typen));
  ok(await p.locator('#zn-vorschau img').count() === 0, '„Ohne Bild“: keine Miniatur');
  await p.click('[data-a=zn-bild][data-w=rezept]'); await p.waitForTimeout(300);
  await p.evaluate(() => { window.ClipboardItem = undefined; });
  await leeren(p); await p.click('[data-a=zn-kopieren]');
  ok(await wennToast(p, 'Nur der Text ist kopiert') && (await ablage(p)).text === soll(GUL), 'ein Browser ohne Bild in der Zwischenablage: nur der Text, und die Meldung sagt es', await toast(p));
  await p.click('.zn-trend'); await k.close();
  ({ p, k } = await seite()); await zumZine(p, 'Rindergulasch'); await p.click('.zn-trend'); await p.waitForTimeout(300); await leeren(p); await p.click('[data-a=zn-kopieren]'); await wennToast(p, 'kopiert');
  a = await ablage(p); ok(a.text === zineTrend('de') && !a.typen.includes('image/png'), 'der Trend-Auftrag geht ohne Rezeptbild hinaus (er gehört zu keinem Rezept)', JSON.stringify(a.typen));
  await k.close();
  }

  if (will(5)) {
  console.log('5 · Claude und ChatGPT: kopieren und die Adresse in einem neuen Tab öffnen; kein Schlüssel, kein Aufruf der App');
  ({ p, k } = await seite());
  await zumZine(p, 'Rindergulasch'); await p.click('[data-a=zn-bild][data-w=ohne]');
  await leeren(p); await p.click('[data-a=zn-claude]'); await wennToast(p, 'kopiert');
  let o = await offen(p);
  ok(o.length === 1 && o[0][0] === 'https://claude.ai/new' && o[0][1] === '_blank', '„Claude“ öffnet https://claude.ai/new in einem neuen Tab', JSON.stringify(o));
  ok((await ablage(p)).text === soll(GUL), 'und der Auftrag liegt in der Zwischenablage');
  await p.fill('#zn-auftrag', 'Bitte ein Poster.'); await leeren(p); await p.click('[data-a=zn-chatgpt]'); await wennToast(p, 'kopiert');
  o = await offen(p);
  ok(o.length === 2 && o[1][0] === 'https://chatgpt.com/' && o[1][1] === '_blank' && (await ablage(p)).text === 'Bitte ein Poster.', '„ChatGPT“ öffnet https://chatgpt.com/ und kopiert das geänderte Feld', JSON.stringify(o));
  ok(!o.some(([u]) => u.includes('Bitte') || u.includes('Gulasch')), 'der Auftrag steht nicht in der Adresse');
  ok(await p.locator('[data-form=schluessel]').count() === 0, 'kein Schlüssel-Fenster');
  const quelle = await readFile(join(WURZEL, 'neu/zine.mjs'), 'utf8');
  ok(!/kiBild|api\.openai|SK\.openai|frageClaude/.test(quelle), 'neu/zine.mjs ruft keine KI auf (kein kiBild, kein Schlüssel)');
  await k.close();
  }

  if (will(6)) {
  console.log('6 · Alte Seiten am Rezept (r.zine) wandern einmal in die Sammlung; nichts geht verloren, nichts doppelt');
  ({ p, k } = await seite({ rezepte: [{ ...GUL, zine: [S1, S2, S3] }, Z(2, 'Hefezopf', { cat: 'brot', zine: ['', S1, ''] })] }));
  const s = await sammlungWenn(p, (x) => (x?.folge || []).length >= 3);
  ok(namen(s).join('|') === 'Rindergulasch · 1|Rindergulasch · 2|Rindergulasch · 3', 'die drei Seiten liegen in der Sammlung, die doppelte Seite des Hefezopfs nur einmal', namen(s).join('|'));
  const b = await bestandWenn(p, (x) => x && !x.zustand.rezepte.some((r) => 'zine' in r));
  ok(!b.zustand.rezepte.some((r) => 'zine' in r) && b.zustand.rezepte.find((r) => r.uid === 'r-1').img === FOTO, 'danach tragen die Rezepte kein Feld `zine` mehr; das Rezeptbild bleibt');
  const gross = await Promise.all((s?.folge || []).map((e) => lagerHol(p, 'zine-bild:' + e.id)));
  ok(gross.map((x) => x?.gross).join() === [S1, S2, S3].join(), 'die Bilder sind unverändert abgelegt');
  ok(await wennToast(p, '3 Food-Zine-Seiten liegen jetzt unter „Meine Food-Zine-Bilder“'), 'die Meldung sagt, wohin sie gewandert sind', await toast(p));
  /* eine alte Sicherung mit denselben Seiten wird noch einmal eingelesen: es kommt nichts doppelt */
  const alles = await lagerHol(p, 'alles'); alles.zustand.rezepte = alles.zustand.rezepte.map((r) => (r.uid === 'r-1' ? { ...r, zine: [S1, S2, S3] } : r)); await lagerSetz(p, 'alles', alles);
  await p.reload(); await p.waitForSelector('.gruss'); await bestandWenn(p, (x) => x && !x.zustand.rezepte.some((r) => 'zine' in r)); await p.waitForTimeout(500);
  ok(namen(await lagerHol(p, 'zine-sammlung')).length === 3, 'dieselben Seiten noch einmal (alte Sicherung): kein Doppel', namen(await lagerHol(p, 'zine-sammlung')).join('|'));
  await geh(p, 'kreativ'); ok((await p.locator('.kr-teil [data-a=kreativ-zine] small').innerText()) === '3', 'im Kreativbuch steht die Zahl der Bilder');
  await p.click('.kr-teil [data-a=kreativ-zine]'); await p.waitForSelector('#zs-gitter');
  ok((await kacheln(p)).length === 3, '„Meine Food-Zine-Bilder“ führt zur Sammlung');
  await k.close();
  console.log('6b · Beispiel-Sätze aus dem Paket kommen in die Sammlung');
  ({ p, k } = await seite());
  await geh(p, 'werkstatt'); await p.waitForSelector('[data-a=werk-auf][data-g=beispiele]'); if (!(await p.locator('.gruppe.auf[data-g=beispiele]').count())) await p.click('[data-a=werk-auf][data-g=beispiele]'); await p.waitForSelector('.gruppe.auf[data-g=beispiele] [data-a=zine-beispiele]', { timeout: 10000 }).catch(() => {});
  if (await p.locator('[data-a=zine-beispiele]').count()) {
    await p.click('[data-a=zine-beispiele]'); ok(await wennToast(p, '\\+\\d+ Food-Zine-Bilder'), 'das Beispielpaket legt seine Bilder in die Sammlung', await toast(p));
    const n = namen(await lagerHol(p, 'zine-sammlung')).length; await p.click('[data-a=zine-beispiele]'); await wennToast(p, 'schon da');
    ok(n >= 3 && namen(await lagerHol(p, 'zine-sammlung')).length === n && /schon da/.test(await toast(p)), 'noch einmal geladen: kein Doppel', `${n} · ${await toast(p)}`);
  } else ok(false, 'die Zeile „Food-Zine-Beispiele laden“ fehlt', (await p.locator('.themen').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300));
  await k.close();
  }

  if (will(7)) {
  console.log('7 · Sammlung: hinzufügen, überlebt das Neuladen, ordnen mit Finger (langer Druck) und Maus');
  ({ p, k } = await seite());
  await geh(p, 'kreativ'); await p.click('.kr-teil [data-a=kreativ-zine]'); await p.waitForSelector('#zs-gitter');
  ok((await kacheln(p)).length === 0 && await p.locator('#zs-buch').count() === 0, 'leer: nur die Kachel zum Hinzufügen');
  const farben = ['#d33', '#3a3', '#33d', '#dd3'], dateien = [];
  for (let i = 0; i < 4; i++) dateien.push({ name: 'Poster ' + (i + 1) + '.jpg', mimeType: 'image/jpeg', buffer: await bildDatei(p, 1800 + i * 100, 2400, farben[i]) });
  await dazu(p, dateien); await wennToast(p, '\\+4 Bilder');
  ok((await kacheln(p)).join('|') === 'Poster 1|Poster 2|Poster 3|Poster 4', 'vier eigene Bilder auf einmal hinzugefügt', (await kacheln(p)).join('|'));
  const s = await lagerHol(p, 'zine-sammlung'), b0 = await lagerHol(p, 'zine-bild:' + s.folge[0].id);
  const m = await p.evaluate(async ([g, kl, id]) => { const a = await createImageBitmap(await (await fetch(g)).blob()), b = await createImageBitmap(await (await fetch(kl)).blob());
    const orig = await new Promise((ja) => { const o = indexedDB.open('KuechenKern-rezeptbuch'); o.onsuccess = () => { const q = o.result.transaction('zustand').objectStore('zustand').get('zine-bild:' + id); q.onsuccess = () => { o.result.close(); ja(q.result?.orig); }; }; });
    const ob = orig instanceof Blob ? await createImageBitmap(orig) : null; return [a.width, a.height, b.width, b.height, ob ? ob.width : 0, ob ? ob.height : 0]; }, [b0.gross, s.folge[0].klein, s.folge[0].id]);
  ok(Math.max(m[0], m[1]) === 1600 && Math.max(m[2], m[3]) === 320 && m[4] === 1800 && m[5] === 2400, 'im Gerät: Buchbild 1600 px, Vorschau 320 px, das Original (1800 × 2400) daneben', JSON.stringify(m));
  await p.reload(); await p.waitForSelector('.gruss'); await geh(p, 'kreativ'); await p.click('.kr-teil [data-a=kreativ-zine]'); await p.waitForSelector('#zs-gitter .zs-kachel[data-id]');
  ok((await kacheln(p)).length === 4, 'die Sammlung überlebt das Neuladen');
  await finger(p, 0, 2);
  await p.waitForFunction(() => document.querySelector('#zs-gitter .zs-kachel[data-id]')?.getAttribute('title') === 'Poster 2', null, { timeout: 4000 }).catch(() => {});
  ok((await kacheln(p)).join('|') === 'Poster 2|Poster 3|Poster 1|Poster 4', 'Finger: lange drücken und ziehen ordnet (1 an die Stelle von 3)', (await kacheln(p)).join('|'));
  ok(await p.locator('.zs-voll').count() === 0, 'nach dem Ziehen öffnet keine Großansicht');
  await finger(p, 3, 0, 120);
  ok((await kacheln(p)).join('|') === 'Poster 2|Poster 3|Poster 1|Poster 4', 'ein kurzer Druck mit Wischen ordnet nicht (die Seite rollt)', (await kacheln(p)).join('|'));
  await p.keyboard.press('Escape');
  await maus(p, 3, 0); await p.waitForTimeout(300);
  ok((await kacheln(p)).join('|') === 'Poster 4|Poster 2|Poster 3|Poster 1', 'Maus: ziehen ordnet', (await kacheln(p)).join('|'));
  ok(await p.locator('.zs-voll').count() === 0, 'nach dem Ziehen mit der Maus öffnet keine Großansicht');
  await p.waitForTimeout(300); await p.reload(); await p.waitForSelector('.gruss'); await geh(p, 'kreativ'); await p.click('.kr-teil [data-a=kreativ-zine]'); await p.waitForSelector('#zs-gitter .zs-kachel[data-id]');
  ok((await kacheln(p)).join('|') === 'Poster 4|Poster 2|Poster 3|Poster 1', 'die Reihenfolge überlebt das Neuladen', (await kacheln(p)).join('|'));
  ok(await quer(p) <= 0, '390 px: die Sammlung läuft nicht quer');
  await k.close();
  }

  if (will(8)) {
  console.log('8 · Großansicht (Original), Drucken/PDF, Als Rezeptbild, Entfernen mit Rückgängig, Als Buch');
  ({ p, k } = await seite());
  await geh(p, 'kreativ'); await p.click('.kr-teil [data-a=kreativ-zine]'); await p.waitForSelector('#zs-gitter');
  await dazu(p, [{ name: 'Erstes.jpg', mimeType: 'image/jpeg', buffer: await bildDatei(p, 2000, 3000, '#c63') }, { name: 'Zweites.jpg', mimeType: 'image/jpeg', buffer: await bildDatei(p, 900, 600, '#36c') }]); await wennToast(p, '\\+2 Bilder');
  await p.click('#zs-gitter .zs-kachel[data-id] >> nth=0'); await p.waitForSelector('.zs-voll img');
  const src = await p.locator('.zs-voll img').getAttribute('src');
  const om = await p.evaluate(async (s) => { const b = await createImageBitmap(await (await fetch(s)).blob()); return [b.width, b.height]; }, src);
  ok(/^blob:/.test(src) && om.join() === '2000,3000', 'Tippen zeigt das Bild groß, als Original (2000 × 3000)', src.slice(0, 30) + ' ' + om);
  ok(await p.locator('.zs-voll [data-a=zs-druck]').count() === 1 && await p.locator('.zs-voll [data-a=zs-rezeptbild]').count() === 1 && await p.locator('.zs-voll [data-a=zs-weg-voll]').count() === 1, 'darunter Drucken / PDF, Als Rezeptbild, Entfernen');
  await druckStellen(p); await p.click('.zs-voll [data-a=zs-druck]'); await p.waitForFunction(() => window.__gedruckt === 1, null, { timeout: 10000 }).catch(() => {});
  const d = await p.evaluate(() => window.__druck);
  ok(await p.evaluate(() => window.__gedruckt) === 1 && /<img src="data:image\/jpeg;base64,/.test(d) && !d.includes('<script') && d.includes('@page{size:auto;margin:0}'), 'Drucken / PDF: eine Seite mit dem Bild an den Druck des Browsers, ohne Skript');
  await p.click('.zs-voll [data-a=zs-rezeptbild]'); await p.waitForSelector('#zs-rezept'); await p.selectOption('#zs-rezept', 'r-2'); await p.click('[data-a=zs-rezeptbild-los]');
  ok(await wennToast(p, 'Rezeptbild · Hefezopf'), '„Als Rezeptbild“ wählt ein Rezept und setzt das Bild', await toast(p));
  const b = await bestandWenn(p, (x) => /^data:image\/jpeg/.test(x?.zustand?.rezepte.find((r) => r.uid === 'r-2')?.img || ''));
  const s = await lagerHol(p, 'zine-sammlung'), g0 = await lagerHol(p, 'zine-bild:' + s.folge[0].id);
  ok(b.zustand.rezepte.find((r) => r.uid === 'r-2').img === g0.gross, 'das Rezept trägt das Buchbild (1600 px) der Sammlung');
  await p.click('[data-a=toast-tun]'); await bestandWenn(p, (x) => !x?.zustand?.rezepte.find((r) => r.uid === 'r-2')?.img);
  ok(!(await lagerHol(p, 'alles')).zustand.rezepte.find((r) => r.uid === 'r-2').img, '„Rückgängig“ nimmt das Rezeptbild zurück');
  await p.click('#zs-gitter .zs-kachel[data-id] >> nth=1'); await p.waitForSelector('.zs-voll'); await p.click('.zs-voll [data-a=zs-weg-voll]');
  await wennToast(p, 'Bild entfernt'); await p.waitForTimeout(200);
  ok((await kacheln(p)).join('|') === 'Erstes' && namen(await lagerHol(p, 'zine-sammlung')).join() === 'Erstes', 'Entfernen nimmt das Bild aus der Sammlung (auch im Gerät)', (await kacheln(p)).join('|'));
  await p.click('[data-a=toast-tun]'); await p.waitForFunction(() => document.querySelectorAll('#zs-gitter .zs-kachel[data-id]').length === 2, null, { timeout: 4000 }).catch(() => {});
  ok((await kacheln(p)).join('|') === 'Erstes|Zweites', '„Rückgängig“ legt es an seine Stelle zurück', (await kacheln(p)).join('|'));
  await p.click('#zs-gitter .zs-kachel[data-id] >> nth=0 >> .zs-x'); await wennToast(p, 'Bild entfernt');
  ok((await kacheln(p)).join('|') === 'Zweites', 'das × an der Kachel entfernt direkt dort');
  await p.click('[data-a=toast-tun]'); await p.waitForFunction(() => document.querySelectorAll('#zs-gitter .zs-kachel[data-id]').length === 2, null, { timeout: 4000 }).catch(() => {});
  await p.click('[data-a=zs-blaettern]'); await p.waitForSelector('#zs-rahmen');
  const r = await p.locator('#zs-rahmen').evaluate((f) => ({ sb: f.getAttribute('sandbox'), html: f.srcdoc }));
  ok(r.sb === 'allow-scripts' && (r.html.match(/class="seite eb-seite"/g) || []).length === 2 && r.html.includes('Meine Food-Zine-Bilder'), '„Als Buch“ → Blättern: die ganze Sammlung als Buch, je Bild eine Seite', String((r.html.match(/eb-seite/g) || []).length));
  await p.click('.kb-vorschau [data-a=fenster-zu]');
  await druckStellen(p); await p.click('[data-a=zs-pdf]'); await p.waitForFunction(() => window.__gedruckt === 1, null, { timeout: 10000 }).catch(() => {});
  ok(await p.evaluate(() => window.__gedruckt) === 1 && ((await p.evaluate(() => window.__druck)).match(/eb-seite/g) || []).length === 2, '„Als Buch“ → PDF: dieselben Seiten an den Druck');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('[data-a=zs-html]')]);
  const html = await readFile(await dl.path(), 'utf8');
  ok(/\.html$/.test(dl.suggestedFilename()) && (html.match(/eb-seite/g) || []).length >= 2 && (html.match(/<script>/g) || []).length === 1, '„Als Buch“ → HTML: eine Datei zum Blättern', dl.suggestedFilename());
  await k.close();
  }

  if (will(9)) {
  console.log('9 · Kreativbuch: Rezepte einzeln an- und abwählen, Schnellwahl, Auftragsfeld mit Claude/ChatGPT, Antwort im alten Format');
  ({ p, k } = await seite());
  await geh(p, 'kreativ'); await p.click('.gruppe[data-g=buch] [data-a=kreativ]'); await p.waitForSelector('#kb-liste');
  const zeilen = () => p.locator('#kb-liste .kb-r').evaluateAll((l) => l.map((b) => [b.dataset.uid, b.getAttribute('aria-checked')]));
  let z = await zeilen();
  ok(z.length === 3 && z.every(([, c]) => c === 'true') && (await p.locator('#kb-zahl').innerText()) === '3 / 3 gewählt', 'eine Liste mit Häkchen, Vorgabe alle, Zähler „3 / 3 gewählt“', JSON.stringify(z));
  const grp = await p.locator('#kb-liste .kb-grp').allInnerTexts();
  ok(grp.some((t) => /Fleisch/i.test(t)) && grp.some((t) => /Brot/i.test(t)) && grp.some((t) => /Feste/i.test(t)), 'gruppiert nach Kategorie und Ordner', grp.join(' | '));
  const vorher = await p.inputValue('#kb-auftrag');
  await p.click('#kb-liste .kb-r[data-uid=r-3]');
  z = await zeilen();
  ok(z.find(([u]) => u === 'r-3')[1] === 'false' && (await p.locator('#kb-zahl').innerText()) === '2 / 3 gewählt' && (await p.locator('#kb-stand').innerText()).trim() === '0 von 2 mit Text', 'ein Tipp wählt ein Rezept ab; Zähler und Stand folgen');
  const auf = await p.inputValue('#kb-auftrag');
  ok(auf !== vorher && auf.includes('Rindergulasch') && auf.includes('Hefezopf') && !auf.includes('Braten'), 'das Auftragsfeld trägt nur die gewählten Rezepte', auf.slice(0, 120));
  ok(await p.locator('#kb-wahl').inputValue() === '' && /Eigene Auswahl · 2/.test(await p.locator('#kb-wahl option:checked').innerText()), 'die Schnellwahl zeigt „Eigene Auswahl“');
  await p.waitForTimeout(300); await p.reload(); await p.waitForSelector('.gruss'); await geh(p, 'kreativ'); await p.click('.gruppe[data-g=buch] [data-a=kreativ]'); await p.waitForSelector('#kb-liste');
  ok((await zeilen()).find(([u]) => u === 'r-3')[1] === 'false', 'die Auswahl bleibt nach dem Neuladen');
  const brot = await p.locator('#kb-wahl option', { hasText: ' · 1' }).first().getAttribute('value'); await p.selectOption('#kb-wahl', brot);
  z = await zeilen();
  ok(z.filter(([, c]) => c === 'true').map(([u]) => u).join() === 'r-2' && await p.inputValue('#kb-wahl') === brot, 'die Schnellwahl (eine Kategorie) setzt die Häkchen', JSON.stringify(z));
  await p.click('[data-a=kb-alle]'); z = await zeilen();
  ok(z.every(([, c]) => c === 'true') && await p.inputValue('#kb-wahl') === 'alle', '„Alle wählen“ hakt alle an');
  await p.click('[data-a=kb-alle]'); z = await zeilen();
  ok(z.every(([, c]) => c === 'false') && await p.locator('[data-a=kb-kopieren]').isDisabled(), '„Alle abwählen“: nichts gewählt, Kopieren geht nicht');
  await p.click('[data-a=kb-alle]');
  await p.fill('#kb-auftrag', 'Eigener Buchauftrag');
  await p.click('#kb-stile [data-stil=nordisch]'); await p.waitForSelector('#kb-stile [data-stil=nordisch][aria-checked=true]');
  ok(await p.inputValue('#kb-auftrag') === 'Eigener Buchauftrag' && await p.locator('#kb-neu').isVisible(), 'ein anderer Stil überschreibt den eigenen Auftrag nicht; „Auftrag neu bauen“ steht da');
  await leeren(p); await p.click('[data-a=kb-claude]'); await wennToast(p, 'Auftrag kopiert');
  const o = await offen(p);
  ok(o.length === 1 && o[0][0] === 'https://claude.ai/new' && (await ablage(p)).text === 'Eigener Buchauftrag', '„Claude“ kopiert das Feld und öffnet https://claude.ai/new', JSON.stringify(o));
  await p.click('#kb-neu');
  const katNamen = { fleisch: 'Fleisch', brot: 'brot' };   /* „brot“ ist hier eine mitgebrachte Kategorie: die App zeigt die Kennung */
  const folge = await p.locator('#kb-liste .kb-r').evaluateAll((l) => l.map((b) => b.dataset.uid));
  const rs = BESTAND().filter((r) => folge.includes(r.uid));
  const gebaut = await p.inputValue('#kb-auftrag');
  ok(rs.every((r) => gebaut.includes(r.name)) && gebaut.includes('Nordic and minimalist') && await p.locator('#kb-neu').isHidden(), '„Auftrag neu bauen“: der Auftrag aus Auswahl und Stil', gebaut.slice(0, 100));
  const kern = kbSammelAuftrag(gebaut.split('\n').filter((l) => /^\d+\. /.test(l)).map((l) => BESTAND().find((r) => l.endsWith(r.name))), { stil: 'nordisch', sprache: 'de', kategorie: (r) => katNamen[r.cat] });
  const ab = [...gebaut].findIndex((c, i) => c !== kern[i]);
  ok(gebaut === kern, 'derselbe Auftrag wie der Kern ihn baut', ab < 0 ? '' : JSON.stringify([gebaut.slice(ab - 30, ab + 40), kern.slice(ab - 30, ab + 40)]));
  await leeren(p); await p.click('[data-a=kb-chatgpt]'); await wennToast(p, 'Auftrag kopiert');
  ok((await offen(p))[1]?.[0] === 'https://chatgpt.com/', '„ChatGPT“ öffnet https://chatgpt.com/');
  await p.click('[data-a=kb-einsetzen]'); await p.waitForSelector('#kb-antwort');
  const alt = '{"kreativbuch":[\n  {"name":"Rindergulasch","intro":"Ein deftiger Klassiker.","tip":"Fleisch trocken tupfen.","serve":"Mit Spätzle."},\n  {"name":"Hefezopf","intro":"Für den Sonntag.","tip":"Teig gut gehen lassen.","serve":"Mit Butter und Marmelade."},\n  {"name":"Braten","intro":"Festlich.","tip":"Ruhen lassen.","serve":"Mit Rotkohl."}\n]}';
  await p.fill('#kb-antwort', alt); await p.click('[data-a=kb-einsetzen-los]');
  ok(await wennToast(p, '\\+3 Texte'), 'eine Antwort im alten Format (name, intro, tip, serve) wird eingesetzt', await toast(p));
  const e = await bestandWenn(p, (x) => Object.keys(x?.einstellungen?.kreativ?.texte || {}).length === 3), t = e.einstellungen.kreativ.texte;
  ok(t['r-1']?.nordisch?.cookTip === 'Fleisch trocken tupfen.' && t['r-1'].nordisch.servingIdea === 'Mit Spätzle.' && t['r-2'].nordisch.intro === 'Für den Sonntag.', 'tip wird Küchentipp, serve Serviervorschlag, intro die Einleitung', JSON.stringify(t['r-1']));
  ok(await quer(p) <= 0 && await p.evaluate(() => { const f = document.querySelector('.fenster'); return f.scrollWidth - f.clientWidth; }) <= 0, '390 px: das Kreativbuch-Fenster läuft nicht quer');
  await k.close();
  }

  if (will(10)) {
  console.log('10 · Breiter Schirm (1280 px), Französisch');
  ({ p, k } = await seite({ breite: 1280 }));
  await p.click('#kopf [data-zu=kreativ]'); await p.waitForSelector('.kr-teil'); await p.click('.kr-teil [data-a=zine-auf]'); await p.waitForSelector('#zine-ansicht');
  ok(await quer(p) <= 0 && await p.locator('#kopf [data-zu=kreativ][aria-current=page]').count() === 1, '1280 px: nichts läuft quer; in der Leiste ist „Kreativbuch“ markiert');
  const fm = await p.locator('.zn-format').evaluateAll((l) => l.map((b) => Math.round(b.getBoundingClientRect().top)));
  ok(new Set(fm).size === 2, 'die sechs Formate stehen in zwei Reihen', JSON.stringify(fm));
  await k.close();
  ({ p, k } = await seite({ ort: 'fr-FR' }));
  await zumZine(p, 'Rindergulasch');
  ok((await p.locator('[data-g=format] h3').innerText()).trim().toLowerCase() === frApp['Format wählen'].toLowerCase() && (await p.locator('.zn-trend').innerText()).trim() === frApp['🔥 KI-Überraschung: Trendrezepte entdecken!'], 'auf Französisch kommen die Texte aus der Tabelle der App');
  ok(await feld(p) === zinePoster(GUL, { kategorie: { ...KAT, name: 'Viande' }, sprache: 'fr' }) && (await feld(p)).endsWith('in French.'), 'der Auftrag ist Englisch, mit dem Satz, die Beschriftung auf Französisch zu setzen', (await feld(p)).slice(-80));
  await k.close();
  }

  ok(fehler.length === 0, 'keine Fehler in der Konsole, kein Netz nach draußen', fehler.join(' · '));
} catch (e) { rot++; console.log('  ✗ ROT: Probe abgebrochen — ' + e.message.split('\n')[0]); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0;
