// Probe im echten Browser: das ganze Buch als Dokument (kern/ausgabe/buch.mjs) – das Blätterbuch als Datei (file://) und das
// PDF-Buch über drucke(). Die Rezepte sind erfunden; nichts geht ins Netz. Aufruf: node tests/smoke_kern_buch.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'; import { extname, join, resolve } from 'node:path'; import { tmpdir } from 'node:os'; import { pathToFileURL } from 'node:url';
const WURZEL = resolve(process.env.WURZEL || process.cwd());
const { buchInhalt, buchPdf, buchBlaettern, buchGroesse, BLAETTER_SKRIPT } = await import(pathToFileURL(join(WURZEL, 'kern/ausgabe/buch.mjs')).href);
const TYP = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer(async (q, a) => { const p = decodeURIComponent(q.url.split('?')[0]); if (p === '/__leer.html') { a.writeHead(200, { 'content-type': TYP['.html'] }); a.end('<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>leer</title></head><body></body></html>'); return; }
  try { const d = await readFile(join(WURZEL, p)); a.writeHead(200, { 'content-type': TYP[extname(p)] || 'application/octet-stream' }); a.end(d); } catch { a.writeHead(404); a.end(); } }).listen(0);
const ORT = `http://localhost:${srv.address().port}/`;
let gruen = 0, rot = 0, fertig = false; const ok = (b, t, mehr = '') => { if (b) { gruen++; console.log('  ✓ ' + t); } else { rot++; console.log('  ✗ ROT: ' + t + (mehr ? ' — ' + mehr : '')); } };

/* Zwei kleine eingebettete Bilder (PNG, 1 Bildpunkt), acht erfundene Rezepte. Eines trägt <b> im Namen, eines versucht ein Skript,
   eines ist lang und hat ein Wort ohne Trennstelle, eines ist eine Leer-Karte. */
const PNG_A = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', PNG_B = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const LANG = 'Donaudampfschifffahrtsgesellschaftskapitaenskajuetenschluesselanhaengerbeschriftungsvorlage';
const REZEPTE = [
  { uid: 'p-apfel', name: 'Apfelkuchen', cat: 'kuchen', servings: 12, prepTime: 70, img: PNG_A, imgCrop: { x: 30, y: 40, scale: 1.5 }, ings: [{ amt: '4', unit: '', name: 'Äpfel' }, { amt: '250', unit: 'g', name: 'Mehl' }], steps: Array.from({ length: 10 }, (_, i) => ({ txt: `Handgriff ${i + 1} am Kuchen.` })) },
  { uid: 'p-brot', name: 'Brot <b>fett</b>', ings: [{ amt: '1', unit: 'kg', name: 'Mehl' }], steps: [{ txt: 'Kneten & backen.' }] },
  { uid: 'p-curry', name: 'Curry <script>window.__x=1</script>', cat: 'fleisch', flavors: ['"><img src=x onerror="window.__x=2">'], ings: [{ amt: '2', unit: 'EL', name: '<img src=x onerror=window.__x=3>', note: '</style><script>window.__x=4</script>' }], steps: [{ txt: '<svg onload=window.__x=5></svg> Anbraten.', note: '<iframe srcdoc="<script>parent.__x=6</script>"></iframe>' }], rating: { stars: 4, comment: '<a href="javascript:window.__x=7">gut</a>' } },
  { uid: 'p-donau', name: 'Donauwelle', cat: 'kuchen', img: PNG_B, ings: [{ amt: '200', unit: 'g', name: 'Butter' }], steps: [{ txt: 'Schichten.' }] },
  { uid: 'p-erbsen', name: 'Erbsensuppe', cat: 'suppe', servings: 4, prepTime: 45, ings: [{ amt: '500', unit: 'g', name: 'Erbsen' }, { amt: '1', unit: 'l', name: 'Brühe', note: 'kräftig' }], steps: [{ txt: 'Erbsen einweichen.' }, { txt: 'Kochen.', note: 'Deckel drauf' }] },
  { uid: 'p-fisch', name: 'Fischstäbchen', cat: 'fisch', ings: [{ amt: '10', unit: 'Stück', name: 'Fischstäbchen' }], steps: [{ txt: 'Braten.' }] },
  { uid: 'p-lang', name: 'Gulaschsuppe ' + LANG, cat: 'suppe', ings: [{ amt: '1250-1500', unit: 'Milliliter', name: LANG, note: LANG }, ...Array.from({ length: 14 }, (_, i) => ({ amt: String(i + 1), unit: 'EL', name: 'Zutat ' + (i + 1) }))], steps: Array.from({ length: 16 }, (_, i) => ({ txt: `Schritt ${i + 1}: ${LANG} und dann lange rühren, bis alles sämig ist und der Topf duftet.` })) },
  { uid: 'p-leer', name: '', blank: true, cat: 'suppe' },
];
const KATS = [{ id: 'suppe', name: 'Suppen' }, { id: 'kuchen', name: 'Kuchen' }, { id: 'fleisch', name: 'Fleisch' }, { id: 'fisch', name: 'Fisch' }];
const OPT = { titel: 'Probebuch', untertitel: 'Erfundene Rezepte', kategorien: KATS, datum: '23. November 2026' };
const B = buchInhalt(REZEPTE, OPT), N = B.anzahl + 2, folge = B.gruppen.flatMap((g) => g.rezepte);   /* Seiten: Deckblatt, Inhalt, je Rezept eine */
const seiteVon = (uid) => folge.find((e) => e.uid === uid).nr + 2;
const BLAETTER = buchBlaettern(REZEPTE, OPT), PDF = buchPdf(REZEPTE, OPT);
const ordner = await mkdtemp(join(tmpdir(), 'rb-buch-')), DATEI = pathToFileURL(join(ordner, 'blaetterbuch.html')).href;
await writeFile(join(ordner, 'blaetterbuch.html'), BLAETTER);
await writeFile(join(ordner, 'veraendert.html'), BLAETTER.replace(BLAETTER_SKRIPT, BLAETTER_SKRIPT + '\nwindow.__fremd=1;'));
const GERADE = REZEPTE.filter((x) => x.uid !== 'p-fisch'), NG = buchInhalt(GERADE, OPT).anzahl + 2;   /* ein Buch mit gerader Seitenzahl: die letzte Seite steht allein links */
await writeFile(join(ordner, 'gerade.html'), buchBlaettern(GERADE, OPT));

const browser = await chromium.launch(), fehler = [], fremd = [];
const ende = async () => { if (fertig) return; fertig = true; try { await browser.close(); } catch { /* schon zu */ } srv.close(); await rm(ordner, { recursive: true, force: true }); console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0; };
for (const art of ['unhandledRejection', 'uncaughtException']) process.on(art, async (e) => { rot++; console.log('  ✗ ROT: Probe abgestürzt — ' + String((e && e.message) || e).split('\n')[0]); await ende(); });
/** Ein Kontext mit einer Seite. Jede Anfrage, die ins Netz ginge (alles außer der Datei selbst, eingebetteten Adressen und dem
 *  Probe-Server), wird abgebrochen UND gezählt (`fremd`). Was schon die Richtlinie des Dokuments sperrt, erreicht diese Stelle
 *  gar nicht (gemessen: der Browser meldet die Anfrage als gescheitert, Grund „csp“); dafür meldet das Dokument den Verstoß. */
async function seite(breite, hoehe, mehr = {}) {
  const k = await browser.newContext({ viewport: { width: breite, height: hoehe }, serviceWorkers: 'block', locale: 'de-DE', ...mehr }), p = await k.newPage();
  p.on('pageerror', (e) => fehler.push(e.message));
  await k.route((u) => !/^(?:file:|data:|about:|blob:)/.test(u.href) && !u.href.startsWith(ORT), (r) => { fremd.push(r.request().url()); r.abort(); });
  return { k, p };
}
/* Was gerade zu sehen ist: die offenen Seiten (von links nach rechts), der Zähler, Querlaufen. */
const lage = (p) => p.evaluate(() => { const auf = [...document.querySelectorAll('.seite')].filter((s) => getComputedStyle(s).display !== 'none'); return { auf: auf.map((s) => s.id), kanten: auf.map((s) => { const r = s.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom)]; }),
  zaehler: document.getElementById('zaehler').textContent, quer: document.documentElement.scrollWidth - window.innerWidth, querInnen: Math.max(...auf.map((s) => s.scrollWidth - s.clientWidth)), hoch: document.documentElement.scrollHeight - window.innerHeight,
  zurueckAus: document.getElementById('zurueck').disabled, weiterAus: document.getElementById('weiter').disabled, leiste: getComputedStyle(document.getElementById('leiste')).display, fokus: document.activeElement && document.activeElement.id, marke: location.hash }; });
const aufSeite = (p, text) => p.waitForFunction((t) => document.getElementById('zaehler').textContent === t, text, { timeout: 5000 }).then(() => true, () => false);
const einzel = (i) => `Seite ${i} von ${N}`, doppel = (i) => `Seiten ${i}–${i + 1} von ${N}`;
const seitenImPdf = (pdf) => (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;

try {
  console.log('1 · Handy (390 px): eine Seite, vor und zurück per Knopf, der Zähler zählt, nichts läuft quer');
  let { k, p } = await seite(390, 800, { hasTouch: true });
  await p.goto(DATEI); const laeuft = await p.waitForSelector('html.blaettern', { timeout: 10000 }).then(() => true, () => false);
  ok(laeuft, 'das Skript des Buchs läuft in der Datei (die Richtlinie lässt genau dieses eine zu)');
  let l = await lage(p);
  ok(l.auf.join() === 's1' && l.zaehler === einzel(1) && l.zurueckAus && !l.weiterAus && l.leiste !== 'none', 'Start: das Deckblatt, „Seite 1 von N“, zurück ist aus', JSON.stringify(l));
  ok(await p.locator('#s1 h1').innerText() === 'Probebuch' && (await p.locator('#s1 .stand').innerText()) === `${B.anzahl} Rezepte · 23. November 2026` && await p.locator('#s1 .raster img').count() === 2, 'Deckblatt: Titel, Anzahl und Datum, die zwei Rezeptbilder');
  ok(await p.locator('#s1 .raster img').evaluateAll((b) => b.every((i) => i.complete && i.naturalWidth > 0)), 'die eingebetteten Bilder sind geladen (Selbst-Riegel: die Probe-Bilder sind echte Bilder)');
  const gesehen = ['s1']; let schief = [];
  for (let i = 2; i <= N; i++) {
    await p.click('#weiter'); const da = await aufSeite(p, einzel(i)); l = await lage(p); gesehen.push(l.auf.join());
    if (!da || l.auf.join() !== 's' + i || l.quer > 0 || l.querInnen > 0 || l.hoch > 0) schief.push(`Seite ${i}: ${JSON.stringify(l)}`);
  }
  ok(schief.length === 0, '„Weiter“ zeigt Seite für Seite genau eine; nirgends läuft etwas quer, auch nicht bei einem Wort ohne Trennstelle', schief.join(' | '));
  ok(new Set(gesehen).size === N && gesehen.length === N, 'jede Seite des Buchs war genau einmal zu sehen', gesehen.join(' '));
  l = await lage(p); ok(l.weiterAus && !l.zurueckAus && l.zaehler === einzel(N), 'auf der letzten Seite ist „Weiter“ aus');
  await p.click('#zurueck'); ok(await aufSeite(p, einzel(N - 1)) && (await lage(p)).auf.join() === 's' + (N - 1), '„Zurück“ geht eine Seite zurück');

  console.log('2 · Pfeiltasten, Anfang und Ende');
  await p.keyboard.press('Home'); ok(await aufSeite(p, einzel(1)), 'Pos1: das Deckblatt');
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); ok(await aufSeite(p, einzel(3)) && (await lage(p)).auf.join() === 's3', 'zweimal Pfeil rechts: Seite 3');
  await p.keyboard.press('ArrowLeft'); ok(await aufSeite(p, einzel(2)) && (await lage(p)).auf.join() === 's2', 'Pfeil links: Seite 2');
  await p.keyboard.press('End'); ok(await aufSeite(p, einzel(N)), 'Ende: die letzte Seite'); await p.keyboard.press('ArrowRight'); ok((await lage(p)).zaehler === einzel(N), 'Pfeil rechts auf der letzten Seite: es bleibt dabei');
  await p.keyboard.press('Home'); await aufSeite(p, einzel(1)); await p.keyboard.press('ArrowLeft'); ok((await lage(p)).zaehler === einzel(1), 'Pfeil links auf dem Deckblatt: es bleibt dabei');

  console.log('3 · Sprung aus dem Inhaltsverzeichnis');
  await p.click('#zum-inhalt'); ok(await aufSeite(p, einzel(2)) && (await lage(p)).auf.join() === 's2' && await p.locator('#s2 h2').textContent() === 'Inhalt', 'der Knopf „Inhalt“ zeigt das Verzeichnis');
  const zeilen = await p.locator('#s2 .iv a').evaluateAll((a) => a.map((x) => [x.querySelector('.it').textContent, x.querySelector('.in').textContent]));
  ok(JSON.stringify(zeilen) === JSON.stringify(folge.map((e) => [e.name, String(e.nr + 2)])), 'das Verzeichnis nennt jedes Rezept in der Folge des Buchs mit seiner Seite', JSON.stringify(zeilen));
  ok(JSON.stringify(await p.locator('#s2 .ik').allTextContents()) === JSON.stringify(B.gruppen.map((g) => g.name)) && B.gruppen.at(-1).name === 'Ohne Kategorie', 'gegliedert nach Kategorie, „Ohne Kategorie“ am Ende');
  const zielSeite = seiteVon('p-donau'); await p.locator('#s2 .iv a', { hasText: 'Donauwelle' }).click();
  ok(await aufSeite(p, einzel(zielSeite)) && (await lage(p)).auf.join() === 's' + zielSeite && await p.locator('.seite.auf h2').innerText() === 'Donauwelle', 'ein Tipp auf „Donauwelle“ landet auf der Seite mit diesem Rezept', JSON.stringify(await lage(p)));
  ok(await p.locator('.seite.auf .snr').innerText() === String(zielSeite) && await p.locator('.seite.auf .kat').innerText() === 'Kuchen', 'die Seite trägt ihre Zahl und das Schild ihrer Kategorie');
  ok((await lage(p)).marke === '#s' + zielSeite, 'die Adresse merkt sich die Seite', (await lage(p)).marke);
  await p.reload(); await p.waitForSelector('html.blaettern'); ok(await aufSeite(p, einzel(zielSeite)), 'nach dem Neuladen steht dieselbe Seite da');
  await p.evaluate(() => { location.hash = '#s3'; }); ok(await aufSeite(p, einzel(3)), 'eine Sprungmarke in der Adresse (#s3) schlägt diese Seite auf');
  await p.evaluate((z) => { location.hash = '#s' + z; }, zielSeite); await aufSeite(p, einzel(zielSeite));

  console.log('4 · Wischen; eine lange Seite rollt in sich');
  const cdp = await k.newCDPSession(p);
  const wisch = async (x0, y0, x1, y1) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] }); for (let i = 1; i <= 4; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / 4, y: y0 + ((y1 - y0) * i) / 4 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  await wisch(320, 300, 60, 310); ok(await aufSeite(p, einzel(zielSeite + 1)), 'nach links wischen: die nächste Seite', (await lage(p)).zaehler);
  await wisch(60, 300, 320, 290); ok(await aufSeite(p, einzel(zielSeite)), 'nach rechts wischen: die Seite davor', (await lage(p)).zaehler);
  await wisch(200, 300, 230, 310); ok((await lage(p)).zaehler === einzel(zielSeite), 'ein kurzer Wisch blättert nicht');
  const langSeite = seiteVon('p-lang'); await p.click('#zum-inhalt'); await aufSeite(p, einzel(2)); await p.locator('#s2 .iv a', { hasText: 'Gulaschsuppe' }).click(); await aufSeite(p, einzel(langSeite));
  const rollt = await p.locator('.seite.auf').evaluate((s) => s.scrollHeight - s.clientHeight);
  ok(rollt > 200, 'Vorbedingung: die lange Seite ist höher als der Schirm', String(rollt));
  await wisch(200, 600, 210, 200); const gerollt = await p.waitForFunction(() => document.querySelector('.seite.auf').scrollTop > 50, null, { timeout: 5000 }).then(() => true, () => false);
  ok(gerollt && (await lage(p)).zaehler === einzel(langSeite), 'nach oben wischen rollt die Seite und blättert nicht', JSON.stringify(await lage(p)));
  ok((await lage(p)).fokus === 's' + langSeite, 'die offene Seite hat den Fokus (Pfeil nach unten rollt sie)', (await lage(p)).fokus);
  const vorTaste = await p.locator('.seite.auf').evaluate((s) => s.scrollTop); await p.keyboard.press('ArrowDown');
  ok(await p.waitForFunction((v) => document.querySelector('.seite.auf').scrollTop > v, vorTaste, { timeout: 5000 }).then(() => true, () => false), 'Pfeil nach unten rollt die lange Seite weiter');
  await p.keyboard.press('ArrowRight'); await aufSeite(p, einzel(langSeite + 1)); await p.keyboard.press('ArrowLeft'); await aufSeite(p, einzel(langSeite));
  ok(await p.locator('.seite.auf').evaluate((s) => s.scrollTop) === 0, 'wer zurückblättert, beginnt die Seite wieder oben');
  await p.evaluate((z) => { location.hash = '#s' + z; }, seiteVon('p-apfel')); await aufSeite(p, einzel(seiteVon('p-apfel')));
  const bildLage = await p.locator('.seite.auf').evaluate((s) => { const b = s.querySelector('.bild').getBoundingClientRect(), i = s.querySelector('.bild img'); return { ueber: s.scrollHeight - s.clientHeight, breit: b.width, hoch: b.height, lage: getComputedStyle(i).objectPosition, zoom: getComputedStyle(i).transform }; });
  ok(bildLage.ueber > 0 && Math.abs(bildLage.breit / bildLage.hoch - 16 / 9) < 0.05 && bildLage.hoch > 100, 'auch auf einer Seite, die länger ist als der Schirm, behält das Bild seine Form (es wird nicht zusammengedrückt)', JSON.stringify(bildLage));
  ok(bildLage.lage === '30% 40%' && /matrix\(1\.5, 0, 0, 1\.5/.test(bildLage.zoom), 'der Bildausschnitt des Rezepts gilt für sein Bild', JSON.stringify(bildLage));

  console.log('5 · Text aus Rezepten bleibt Text; kein Skript aus Rezepttext läuft');
  const brot = seiteVon('p-brot'), curry = seiteVon('p-curry');
  ok(await p.locator(`#s${brot} h2`).evaluate((h) => h.textContent) === 'Brot <b>fett</b>' && await p.locator(`#s${brot} b`).count() === 0, 'ein Rezeptname mit <b> steht wörtlich da, nichts wird fett');
  ok(await p.locator('#s2 .iv a .it').evaluateAll((l) => l.map((x) => x.textContent)).then((t) => t.includes('Brot <b>fett</b>') && t.includes('Curry <script>window.__x=1</script>')), 'auch im Verzeichnis');
  const fremdes = await p.evaluate((nr) => { const s = document.getElementById('s' + nr); return { x: typeof window.__x, skripte: document.querySelectorAll('script').length, img: s.querySelectorAll('img').length, svg: s.querySelectorAll('svg').length, iframe: document.querySelectorAll('iframe').length, a: s.querySelectorAll('a').length, text: s.textContent }; }, curry);
  ok(fremdes.x === 'undefined', 'window.__x bleibt undefiniert: kein Skript, kein onerror, kein onload aus Rezepttext lief', fremdes.x);
  ok(fremdes.skripte === 1 && fremdes.img === 0 && fremdes.svg === 0 && fremdes.iframe === 0 && fremdes.a === 0, 'aus dem Rezepttext entsteht kein Element (kein Bild, kein Rahmen, kein Verweis); im Dokument steht ein Skript, das des Buchs', JSON.stringify({ ...fremdes, text: '' }));
  ok(fremdes.text.includes('<img src=x onerror=window.__x=3>') && fremdes.text.includes('</style><script>window.__x=4</script>') && fremdes.text.includes('<a href="javascript:window.__x=7">gut</a>'), 'der Text selbst ist vollständig zu lesen');
  const riegel = await p.evaluate(() => new Promise((ja) => { const verstoss = []; document.addEventListener('securitypolicyviolation', (e) => verstoss.push(e.violatedDirective)); const s = document.createElement('script'); s.textContent = 'window.__y=1'; document.body.appendChild(s); const d = document.createElement('div'); d.setAttribute('onclick', 'window.__z=1'); document.body.appendChild(d); d.click();
    const i = new Image(); let aus = 'offen'; i.onload = () => { aus = 'geladen'; }; i.onerror = () => { aus = 'gesperrt'; }; i.src = 'https://bild.example.invalid/zaehlpixel.png'; const fertig = () => verstoss.length >= 3 && aus !== 'offen'; let n = 0; const uhr = setInterval(() => { if (fertig() || ++n > 60) { clearInterval(uhr); ja({ y: typeof window.__y, z: typeof window.__z, bild: aus, verstoss: verstoss.sort().join(' ') }); } }, 50); }));
  ok(riegel.y === 'undefined' && riegel.z === 'undefined' && /script-src-elem/.test(riegel.verstoss) && /script-src-attr/.test(riegel.verstoss), 'die Richtlinie der Datei sperrt jedes andere Skript und jedes on…-Attribut – auch wenn irgendwo eine Entschärfung fehlte', JSON.stringify(riegel));
  ok(riegel.bild === 'gesperrt' && /img-src/.test(riegel.verstoss) && fremd.length === 0, 'ein Bild mit Adresse im Netz sperrt die Richtlinie, bevor die Anfrage hinausgeht', JSON.stringify(riegel) + ' · hinaus: ' + fremd.join(' '));

  console.log('6 · Hell und dunkel folgen dem Gerät');
  const farben = () => p.evaluate(() => { const hell = (c) => { const m = c.match(/[\d.]+/g).map(Number), f = /^color\(/.test(c) ? 255 : 1; return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) * f; }, s = document.querySelector('.seite.auf'), g = getComputedStyle(s); return { blatt: hell(g.backgroundColor), schrift: hell(g.color), tisch: hell(getComputedStyle(document.body).backgroundColor), titel: hell(getComputedStyle(s.querySelector('h2')).color) }; });
  await p.emulateMedia({ colorScheme: 'light' }); const tag = await farben(); await p.emulateMedia({ colorScheme: 'dark' }); const nacht = await farben();
  ok(tag.blatt > 200 && tag.schrift < 80 && tag.blatt - tag.titel > 90, 'hell: helles Blatt, dunkle Schrift', JSON.stringify(tag));
  ok(nacht.blatt < 60 && nacht.schrift > 190 && nacht.tisch < 40 && nacht.titel - nacht.blatt > 90, 'dunkel: dunkles Blatt, helle Schrift, auch der Rezeptname ist zu lesen', JSON.stringify(nacht));
  await p.emulateMedia({ colorScheme: 'light' });

  console.log('7 · Drucken: alle Seiten untereinander, ohne die Leiste');
  await p.emulateMedia({ media: 'print' });
  const druck = await p.evaluate(() => ({ offen: [...document.querySelectorAll('.seite')].filter((s) => getComputedStyle(s).display !== 'none').length, leiste: getComputedStyle(document.getElementById('leiste')).display, kasten: getComputedStyle(document.querySelector('.rezept td.k')).display, blatt: getComputedStyle(document.querySelector('.seite')).backgroundColor }));
  ok(druck.offen === N && druck.leiste === 'none', 'im Druck sind alle Seiten da und die Leiste ist weg', JSON.stringify(druck));
  ok(druck.kasten === 'table-cell' && /255, 255, 255/.test(druck.blatt), 'gedruckt wird hell, mit Kästchen zum Abhaken', JSON.stringify(druck));
  await p.emulateMedia({ media: null }); const blPdf = seitenImPdf(await p.pdf({ preferCSSPageSize: true, printBackground: true }));
  ok(blPdf >= N, 'das gedruckte Blätterbuch hat mindestens so viele Blätter wie Seiten', `${blPdf} Blätter, ${N} Seiten`);
  await k.close();

  console.log('8 · Breiter Schirm (1280 px): zwei Seiten nebeneinander wie ein aufgeschlagenes Buch');
  ({ k, p } = await seite(1280, 800)); await p.goto(DATEI); await p.waitForSelector('html.blaettern');
  l = await lage(p); ok(l.auf.join() === 's1' && l.zaehler === einzel(1) && Math.abs((l.kanten[0][0] + l.kanten[0][1]) / 2 - 640) <= 2, 'das Deckblatt steht allein in der Mitte', JSON.stringify(l));
  const paare = []; schief = [];
  for (let i = 2; i <= N; i += 2) {
    await p.click('#weiter'); const zu = i + 1 <= N ? doppel(i) : einzel(i), da = await aufSeite(p, zu); l = await lage(p); paare.push(l.auf.join('+'));
    const soll = i + 1 <= N ? [`s${i}`, `s${i + 1}`] : [`s${i}`], neben = l.kanten.length < 2 || (l.kanten[0][1] <= l.kanten[1][0] + 1 && l.kanten[0][2] === l.kanten[1][2] && l.kanten[0][1] - l.kanten[0][0] === l.kanten[1][1] - l.kanten[1][0]);
    if (!da || l.auf.join() !== soll.join() || !neben || l.quer > 0 || l.querInnen > 0 || l.kanten[0][0] >= 640) schief.push(`${zu}: ${JSON.stringify(l)}`);
  }
  ok(schief.length === 0 && paare.length >= 2, 'jeder Schritt zeigt zwei Seiten nebeneinander, gleich breit, die linke links der Mitte; der Zähler nennt beide', schief.join(' | ') + ' ' + paare.join(' '));
  ok(paare.join('+').split('+').length === N - 1 && new Set(paare.join('+').split('+')).size === N - 1, 'jede Seite nach dem Deckblatt war genau einmal zu sehen', paare.join(' '));
  ok((await lage(p)).weiterAus, 'am Ende ist „Weiter“ aus');
  await p.click('#zum-inhalt'); await aufSeite(p, doppel(2)); const rechts = folge.find((e) => (e.nr + 2) % 2 === 1 && e.nr > 1), ziel2 = rechts.nr + 2; await p.locator('#s2 .iv a').nth(rechts.nr - 1).click();
  ok(await aufSeite(p, doppel(ziel2 - 1)) && (await lage(p)).auf.includes('s' + ziel2), 'ein Sprung auf eine rechte Seite schlägt das Paar auf, in dem sie liegt', JSON.stringify(await lage(p)));
  await p.keyboard.press('ArrowLeft'); ok(await aufSeite(p, doppel(ziel2 - 3)), 'Pfeil links blättert ein Paar zurück', (await lage(p)).zaehler);
  { const { k: k2, p: q } = await seite(1280, 800); await q.goto(pathToFileURL(join(ordner, 'gerade.html')).href); await q.waitForSelector('html.blaettern'); await q.keyboard.press('End');
    const amEnde = await q.waitForFunction((t) => document.getElementById('zaehler').textContent === t, `Seite ${NG} von ${NG}`, { timeout: 5000 }).then(() => true, () => false), allein = await lage(q);
    await q.click('#zurueck'); await q.waitForFunction((t) => document.getElementById('zaehler').textContent === t, `Seiten ${NG - 2}–${NG - 1} von ${NG}`, { timeout: 5000 }).catch(() => 0); const davor = await lage(q);
    ok(NG % 2 === 0 && amEnde && allein.auf.join() === 's' + NG && davor.kanten.length === 2 && allein.kanten[0][0] === davor.kanten[0][0] && allein.kanten[0][1] === davor.kanten[0][1], 'bei gerader Seitenzahl steht die letzte Seite allein auf der linken Hälfte, wo linke Seiten stehen', JSON.stringify([allein.kanten, davor.kanten]));
    await k2.close(); }
  await p.setViewportSize({ width: 390, height: 800 }); const schmal = await p.waitForFunction(() => [...document.querySelectorAll('.seite')].filter((s) => getComputedStyle(s).display !== 'none').length === 1 && /^Seite \d+ von/.test(document.getElementById('zaehler').textContent), null, { timeout: 5000 }).then(() => true, () => false);
  ok(schmal && (await lage(p)).quer <= 0, 'wird das Fenster schmal, bleibt eine Seite – ohne Querlaufen', JSON.stringify(await lage(p)));
  await k.close();

  console.log('9 · Ohne Skript und mit veränderter Datei bleibt das Buch lesbar');
  ({ k, p } = await seite(390, 800, { javaScriptEnabled: false })); await p.goto(DATEI);
  ok(await p.locator('.seite').count() === N && await p.locator('.seite:visible').count() === N && !(await p.locator('#leiste').isVisible()), 'ohne Skript: alle Seiten untereinander, keine Leiste');
  await k.close(); ({ k, p } = await seite(390, 800)); await p.goto(pathToFileURL(join(ordner, 'veraendert.html')).href); await p.waitForSelector('.seite');
  const veraendert = await p.evaluate(() => new Promise((ja) => setTimeout(() => ja({ fremd: typeof window.__fremd, blaettern: document.documentElement.classList.contains('blaettern'), offen: [...document.querySelectorAll('.seite')].filter((s) => getComputedStyle(s).display !== 'none').length }), 200)));
  ok(veraendert.fremd === 'undefined' && !veraendert.blaettern && veraendert.offen === N, 'ein verändertes Skript läuft nicht (die Prüfsumme passt nicht); die Seiten stehen untereinander', JSON.stringify(veraendert));
  await k.close();

  console.log('10 · PDF-Buch: im Browser gebaut, über drucke() aus einem unsichtbaren Rahmen ohne Skripte');
  ({ k, p } = await seite(1000, 800)); await p.goto(ORT + '__leer.html');
  const imBrowser = await p.evaluate(async ({ rezepte, opt }) => { const m = await import('/kern/ausgabe/buch.mjs'); return { pdf: m.buchPdf(rezepte, opt), bl: m.buchBlaettern(rezepte, opt), bytes: m.buchGroesse(m.buchPdf(rezepte, opt)) }; }, { rezepte: REZEPTE, opt: OPT });
  ok(imBrowser.pdf === PDF && imBrowser.bl === BLAETTER && imBrowser.bytes === buchGroesse(PDF) && imBrowser.bytes === Buffer.byteLength(PDF), 'das Modul läuft im Browser und baut dort dieselben Dokumente wie in Node, Zeichen für Zeichen');
  await p.evaluate(() => { window.__gedruckt = 0; window.__rahmen = null; const alt = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow').get;
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', { get() { const w = alt.call(this), f = this; if (w && f.hasAttribute('data-kern-druck')) w.print = () => { const d = f.contentDocument;
      window.__rahmen = { html: f.srcdoc, sicht: getComputedStyle(f).visibility, sandbox: f.getAttribute('sandbox'), titel: d.querySelector('h1').textContent, rezepte: d.querySelectorAll('article.rezept').length, kapitel: [...d.querySelectorAll('.kapitel > h2')].map((h) => h.textContent), verzeichnis: d.querySelectorAll('.inhalt .iv a').length,
        bilder: [...d.querySelectorAll('img')].map((i) => i.complete && i.naturalWidth > 0), skripte: d.querySelectorAll('script').length, x: typeof w.__x, b: d.querySelectorAll('article b').length, namen: [...d.querySelectorAll('article h3')].map((h) => h.textContent) };
      window.__gedruckt++; w.dispatchEvent(new Event('afterprint')); }; return w; } }); });
  const seitenVor = k.pages().length;
  const gedruckt = await p.evaluate(async (html) => { const { drucke } = await import('/kern/ausgabe/druck.mjs'); await drucke(html, { nachlauf: 0 }); return { mal: window.__gedruckt, rahmen: window.__rahmen, uebrig: document.querySelectorAll('iframe').length, x: typeof window.__x }; }, PDF);
  const r = gedruckt.rahmen || {};
  ok(gedruckt.mal === 1 && r.html === PDF && r.sicht === 'hidden' && !/allow-scripts/.test(r.sandbox || '') && k.pages().length === seitenVor, 'print() wird einmal gerufen; der unsichtbare Rahmen trägt das Dokument, ohne Skript-Erlaubnis, kein neues Fenster', JSON.stringify({ mal: gedruckt.mal, sicht: r.sicht, sandbox: r.sandbox }));
  ok(r.titel === 'Probebuch' && r.rezepte === B.anzahl && r.verzeichnis === B.anzahl && JSON.stringify(r.kapitel) === JSON.stringify(B.gruppen.map((g) => g.name)), 'im Rahmen stehen Deckblatt, Verzeichnis, je Kategorie ein Zwischentitel und je Rezept eine Rezeptseite', JSON.stringify({ ...r, html: '' }));
  ok(JSON.stringify(r.namen) === JSON.stringify(folge.map((e) => e.name)) && r.b === 0, 'die Rezepte stehen in der Folge des Buchs; der Name mit <b> steht wörtlich da');
  ok(r.bilder && r.bilder.length === 4 && r.bilder.every(Boolean), 'die eingebetteten Bilder sind im Rahmen geladen (zwei Rezepte, dieselben auf dem Deckblatt)', JSON.stringify(r.bilder));
  ok(r.skripte === 0 && r.x === 'undefined' && gedruckt.x === 'undefined', 'im Rahmen läuft kein Skript; window.__x bleibt undefiniert');
  ok(gedruckt.uebrig === 0, 'nach dem Druck ist der Rahmen wieder weg');

  console.log('11 · Als PDF: Deckblatt, Inhalt und je Rezept eine neue Seite');
  const alsPdf = async (html) => { await p.setContent(html); return seitenImPdf(await p.pdf({ preferCSSPageSize: true, printBackground: true })); };
  const kurz = REZEPTE.filter((x) => x.uid !== 'p-lang'), nKurz = buchInhalt(kurz, OPT).anzahl, sGanz = await alsPdf(PDF), sKurz = await alsPdf(buchPdf(kurz, OPT));
  ok(sGanz >= 2 + B.anzahl, 'mindestens Deckblatt + Inhalt + je Rezept eine Seite', `${sGanz} Seiten bei ${B.anzahl} Rezepten`);
  ok(sKurz === 2 + nKurz, 'passt jedes Rezept auf ein Blatt, sind es genau Deckblatt + Inhalt + je Rezept eine Seite', `${sKurz} Seiten bei ${nKurz} Rezepten`);
  const sMehr = await alsPdf(buchPdf([...kurz, { uid: 'p-neu', name: 'Zimtschnecken', cat: 'kuchen', ings: [{ amt: '1', unit: 'TL', name: 'Zimt' }], steps: [{ txt: 'Rollen.' }] }], OPT));
  ok(sMehr === sKurz + 1, 'ein Rezept mehr in einer vorhandenen Kategorie ist genau eine Seite mehr', `${sKurz} → ${sMehr}`);
  const groesse = await p.evaluate(() => { const b = document.body.getBoundingClientRect(), a = document.querySelector('article.rezept h3'), h = document.querySelector('.kapitel > h2'); return { breit: Math.round(b.width), name: getComputedStyle(a).fontSize, kapitel: getComputedStyle(h).textAlign }; });
  ok(Math.abs(parseFloat(groesse.name) - 20 * 96 / 72) < 0.01 && groesse.kapitel === 'center', 'der Rezeptname ist so groß wie auf dem einzelnen Rezeptblatt (20 pt); der Zwischentitel steht mittig darüber', JSON.stringify(groesse));
  await k.close();

  console.log('12 · Nichts ging nach draußen');
  ok(fremd.length === 0, 'keine einzige fremde Anfrage in der ganzen Probe', fremd.join(' '));
  ok(fehler.length === 0, 'keine Fehler auf den Seiten', fehler.join(' · '));
  ({ k, p } = await seite(390, 800)); await p.goto(ORT + '__leer.html'); await p.evaluate(() => fetch('https://zaehler.example.invalid/da').catch(() => 0));
  ok(fremd.length === 1 && fremd[0].includes('zaehler.example.invalid'), 'Selbst-Riegel: der Zähler sieht eine fremde Anfrage, wenn es eine gibt', fremd.join(' '));
  await k.close();
} catch (e) { rot++; console.log('  ✗ ROT: Probe abgebrochen — ' + e.message.split('\n')[0]); }
await ende();
