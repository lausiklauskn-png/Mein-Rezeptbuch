// Probe der neuen PWA 0.16.1: Bedienung am Rezept (Klaus 25.11.). Echter Browser, kein Netz nach draußen; Claude, Chromes Translator-API und
// das Vollbild des Browsers sind gestellt. Gemessen bei 360, 390, 1000, 1100 und 1280 px.
//  1 Werkzeuge hinter dem Winkel: „Bearbeiten“ steht (sichtbar) direkt vor „Löschen“, „Übersetzen“ dabei, „Nur dieses Rezept“ nicht mehr
//  2 Vollbild-Knopf unten rechts im Rezeptbild: ganze App (documentElement), zweiter Tipp und Ende über das System
//  3 Stift an „Zutaten“ und „Zubereitung“: an Ort und Stelle, Nummern nur Anzeige
//  4 Übersetzung bearbeiten: nur Übersetzung / als Hauptfassung (das Original bleibt als Übersetzung), Sprache fragen, wenn unklar
//  5 Bearbeiten am breiten Schirm rechts (aus „Rezepte“ und aus „Ordner“)
//  6 Übersetzen im Gerät nur, wenn der Browser es kann; Ladeanzeige; Claude als zweiter Weg
//  7 Bild: Tipp → „Bild anpassen“ im Vollbild, Werkzeuge unten rechts am Bild, Vorschau aus echten Maßen, entfernen mit Rückgängig
//  8 Seitenleiste links/rechts einrasten, nach Neuladen noch rechts
//  9 Zwei Spalten nach der Breite des Rezeptbereichs (Container): die Zubereitung liegt ganz im Bild (Rezepte und Ordner, Leiste auf/zu, links/rechts)
// Aufruf: node tests/smoke_neu_bedienung.mjs · WURZEL=<Pfad> misst eine Kopie.
import { createRequire } from 'node:module';
import { mitThemen } from './neu-hilfe.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join } from 'node:path';
const WURZEL = process.env.WURZEL || process.cwd();
const TYP = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer(async (q, a) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; try { const d = await readFile(join(WURZEL, p)); a.writeHead(200, { 'content-type': TYP[extname(p)] || 'application/octet-stream' }); a.end(d); } catch { a.writeHead(404); a.end(); } }).listen(0);
const ORT = `http://localhost:${srv.address().port}/neu/`, URL0 = ORT + '?leer';
let gruen = 0, rot = 0; const ok = (b, t, mehr = '') => { if (b) { gruen++; console.log('  ✓ ' + t); } else { rot++; console.log('  ✗ ROT: ' + t + (mehr ? ' — ' + mehr : '')); } };
process.on('unhandledRejection', (e) => { rot++; console.log('  ✗ ROT: Absturz — ' + String(e?.message || e).split('\n')[0]); });
const browser = await chromium.launch(); const fehler = [], rufe = [];

/* Ein Bild 4:3, damit Karte und Kopfbild etwas zu zeigen haben */
const BILD = await (async () => { const k = await browser.newContext(), p = await k.newPage(); const u = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 400; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#c84'; g.fillRect(0, 0, 400, 300); g.fillStyle = '#284'; g.fillRect(100, 60, 200, 180); return c.toDataURL('image/jpeg', 0.8); }); await k.close(); return u; })();
const SCHRITTE_LANG = ['Die Kartoffeln schälen, waschen und in gleich große Würfel schneiden, damit sie gleichmäßig garen.', 'Die Zwiebel fein hacken und in Butter glasig dünsten, dann die Kartoffeln dazugeben und kurz mitrösten.', 'Mit der Brühe aufgießen, aufkochen und alles zusammen etwa zwanzig Minuten leise köcheln lassen.'];
const REZEPTE = [
  { uid: 'r-suppe', id: 1, name: 'Kartoffelsuppe', cat: 'suppe', servings: 4, prepTime: 40, img: BILD, ings: [{ amt: '500', unit: 'g', name: 'Kartoffeln' }, { amt: '1', unit: 'l', name: 'Brühe' }, { amt: '1', unit: '', name: 'Zwiebel' }], steps: SCHRITTE_LANG.map((txt) => ({ txt })) },
  { uid: 'r-gyoza', id: 2, name: 'Gyoza', cat: 'fleisch', servings: 4, img: BILD, ings: [{ amt: '200', unit: 'g', name: 'minced pork' }, { amt: '1', unit: 'tbsp', name: 'soy sauce' }],
    steps: [{ txt: 'Mix the filling and fold the dumplings.' }, { txt: 'Fry them in a pan for 3 minutes, then add water and cover.' }],
    translations: { de: { name: 'Gyoza (Teigtaschen)', ingredients: ['Schweinehack', 'Sojasauce'], steps: ['Füllung mischen und die Taschen falten.', 'In der Pfanne 3 Minuten braten, dann Wasser dazu und zudecken.'] } } },
  { uid: 'r-pho', id: 3, name: 'Pho', cat: 'suppe', servings: 2, ings: [{ amt: '', unit: '', name: 'Pho' }], steps: [{ txt: 'Pho.' }], translations: { de: { name: 'Pho-Suppe', ingredients: ['Reisnudeln'], steps: ['Kochen.'] } } },
];
/* Gestellt: Chromes Translator-API (nur mit ?geraet), das Vollbild des Browsers (immer). */
const STELLEN = () => {
  let voll = null; Object.defineProperty(Document.prototype, 'fullscreenElement', { get: () => voll, configurable: true });
  window.__vollRuf = []; window.__vollAus = 0;
  Element.prototype.requestFullscreen = function () { window.__vollRuf.push(this === document.documentElement ? 'html' : this.tagName); voll = this; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); };
  Document.prototype.exitFullscreen = function () { window.__vollAus++; voll = null; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); };
  window.__vollEnde = () => { voll = null; document.dispatchEvent(new Event('fullscreenchange')); };   /* Esc oder das System beendet das Vollbild */
  if (/echt/.test(location.search) || sessionStorage.echt) { sessionStorage.echt = '1'; return; }   /* die API, wie dieses Chromium sie hat */
  if (!/geraet/.test(location.search) && !sessionStorage.geraet) { try { delete self.Translator; } catch { /* nicht da */ } return; }   /* ohne: wie am Android-Chrome */
  sessionStorage.geraet = '1';
  window.__tr = { verfuegbar: [], erzeugt: [], texte: 0 };
  self.Translator = { availability: async (o) => { window.__tr.verfuegbar.push(o.sourceLanguage + '>' + o.targetLanguage); return o.targetLanguage === 'zh' ? 'unavailable' : sessionStorage.laden ? 'downloadable' : 'available'; },
    create: async (o) => { window.__tr.erzeugt.push(o.sourceLanguage + '>' + o.targetLanguage); if (sessionStorage.laden) { const ziele = []; o.monitor?.({ addEventListener: (n, f) => ziele.push(f) }); await new Promise((w) => setTimeout(w, 500)); ziele.forEach((f) => f({ loaded: 0.4 })); await new Promise((w) => setTimeout(w, 900)); ziele.forEach((f) => f({ loaded: 1 })); }
      return { translate: async (t) => { window.__tr.texte++; return '[' + o.targetLanguage + '] ' + t; }, destroy() {} }; } };
};
async function seite(breite = 390, { geraet = false, echt = false, hoehe = 800, einst = {} } = {}) {
  const k = await browser.newContext({ locale: 'de-DE', viewport: { width: breite, height: hoehe }, serviceWorkers: 'block' }), p = mitThemen(await k.newPage());
  p.on('pageerror', (e) => fehler.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && fehler.push(m.text()));
  await p.addInitScript(STELLEN);
  await p.route(/^https?:\/\/(?!localhost)/, (r) => { fehler.push('Netz nach draußen: ' + r.request().url()); r.abort(); });
  await p.route('https://api.anthropic.com/**', (r) => { const k2 = JSON.parse(r.request().postData()); rufe.push(k2); r.fulfill({ contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ fr: { name: 'Soupe de pommes de terre', ingredients: ['pommes de terre', 'bouillon', 'oignon'], steps: ['Éplucher.', 'Faire revenir.', 'Mijoter.'] } }) }], stop_reason: 'end_turn' }) }); });
  await p.goto(ORT + 'app.css' + (geraet ? '?geraet' : echt ? '?echt' : ''));
  await p.evaluate(([rz, e]) => new Promise((ja) => { const a = indexedDB.open('KuechenKern-rezeptbuch', 1); a.onupgradeneeded = () => a.result.createObjectStore('zustand'); a.onsuccess = () => { const t = a.result.transaction('zustand', 'readwrite'); t.objectStore('zustand').put({ fassung: 1, einstellungen: { ton: 'hell', ...e }, zustand: { rezepte: rz, ordner: [], menu: [], kategorien: {} } }, 'alles'); t.objectStore('zustand').put('sk-ant-probe-000000000000000000', 'schluessel-anthropic'); t.oncomplete = () => ja(); }; }), [REZEPTE, einst]);
  await p.goto(URL0); await p.waitForSelector('.gruss'); return { p, k };
}
const zustand = async (p) => { await p.waitForTimeout(350); return p.evaluate(() => new Promise((ja) => { const a = indexedDB.open('KuechenKern-rezeptbuch'); a.onsuccess = () => { const q = a.result.transaction('zustand').objectStore('zustand').get('alles'); q.onsuccess = () => ja(q.result); }; })); };
const rz = async (p, uid) => (await zustand(p)).zustand.rezepte.find((r) => r.uid === uid);
const zumRezept = async (p, name) => { await p.locator('.karte', { hasText: name }).first().click(); await p.waitForSelector('.rezept-held h1'); await p.waitForTimeout(150); };
const querlauf = (p) => p.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
const box = (p, sel) => p.locator(sel).first().evaluate((e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, r: b.right, b: b.bottom, w: b.width, h: b.height }; });

try {
  for (const breite of [360, 390, 1280]) {
    console.log(`1 · Werkzeuge hinter dem Winkel (${breite} px)`);
    const { p, k } = await seite(breite); await zumRezept(p, 'Kartoffelsuppe');
    ok(await p.locator('.rezept-held [data-a=rleiste]').count() === 1 && await p.locator('.rwerk').count() === 0, 'der Winkel steht da, die Werkzeuge sind zu');
    await p.click('.rezept-held [data-a=rleiste]'); await p.waitForTimeout(250);
    const folge = await p.$$eval('.rwerk .chip', (l) => l.filter((c) => c.offsetParent).map((c) => { const b = c.getBoundingClientRect(); return { a: c.dataset.a, x: b.x, y: b.y }; }).sort((u, v) => (Math.abs(u.y - v.y) > 8 ? u.y - v.y : u.x - v.x)).map((c) => c.a));
    ok(folge.at(-1) === 'loeschen' && folge.at(-2) === 'bearbeiten', '„Bearbeiten“ steht sichtbar direkt vor „Rezept löschen“', folge.join(' '));
    ok(folge.join(' ') === 'einordnen bild-blatt uebersetzen rmenue bearbeiten loeschen', 'Reihenfolge: Einordnen · Bild · Übersetzen · Mehr · Bearbeiten · Löschen; „Nur dieses Rezept“, „Kategorie“, „Ordner“ einzeln nicht mehr', folge.join(' '));
    ok(await querlauf(p) <= 0, 'nichts läuft quer', String(await querlauf(p)));
    if (breite < 1000) { const t = await p.$$eval('.rwerk .chip', (l) => l.map((c) => { const b = c.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, width: b.width }; }).filter((b) => b.width)); ok(t.every((b) => b.x >= 0 && b.right <= breite) && new Set(t.map((b) => Math.round(b.y))).size === 1, 'am Handy: nur Zeichen, eine Zeile, ganz im Bild'); }

    console.log(`2 · Vollbild-Knopf im Bild (${breite} px)`);
    const held = await box(p, '.rezept-held>img'), vk = await box(p, '.rezept-held .held-voll');
    ok(vk.r <= held.r + 1 && vk.r > held.r - 70 && vk.b <= held.b + 1 && vk.y > held.y + held.h / 2, 'der Knopf sitzt unten rechts im Rezeptbild', JSON.stringify({ vk, held }));
    ok((await p.locator('.held-voll').innerText()).trim() === '' && await p.locator('.held-voll').getAttribute('aria-label') === 'Vollbild' && await p.locator('.held-voll svg').count() === 1, 'ohne Text, mit Ecken-Zeichen und Namen „Vollbild“');
    const svgAus = await p.locator('.held-voll path').getAttribute('d');
    await p.click('.held-voll'); await p.waitForTimeout(100);
    ok((await p.evaluate(() => window.__vollRuf)).join() === 'html' && await p.locator('.held-voll').getAttribute('aria-pressed') === 'true' && await p.locator('.held-voll').getAttribute('aria-label') === 'Vollbild beenden' && await p.locator('.held-voll path').getAttribute('d') !== svgAus, 'ein Tipp: die ganze App (documentElement) geht ins Vollbild; der Knopf heißt jetzt „Vollbild beenden“, Ecken nach innen');
    ok(await p.locator('.bildvoll, .fenster').count() === 0, 'der Tipp auf den Knopf öffnet nicht „Bild anpassen“');
    if (breite >= 1000) {
      ok(await p.locator('.kopf').isVisible() && await p.locator('.md-liste').isVisible(), 'im Vollbild bleiben Seitenleiste und Liste stehen');
      await p.locator('.md-liste .karte', { hasText: 'Gyoza' }).click(); await p.waitForTimeout(200);
      ok((await p.locator('.md-detail h1').innerText()).includes('Gyoza') && await p.locator('.held-voll').getAttribute('aria-pressed') === 'true', 'die Liste ist im Vollbild bedienbar, der Knopf bleibt im Zustand');
      await p.click('.rail-n[data-zu=plan]'); ok(await p.locator('.rail-n[data-zu=plan][aria-current]').count() === 1, 'die Seitenleiste ist im Vollbild bedienbar'); await p.click('.rail-n[data-zu=start]'); await p.waitForSelector('.md-detail .held-voll');
    }
    await p.click('.held-voll'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => window.__vollAus) === 1 && await p.locator('.held-voll').getAttribute('aria-pressed') === 'false', 'der zweite Tipp beendet das Vollbild');
    await p.click('.held-voll'); await p.evaluate(() => window.__vollEnde()); await p.waitForTimeout(100);
    ok(await p.locator('.held-voll').getAttribute('aria-pressed') === 'false' && await p.locator('.held-voll').getAttribute('aria-label') === 'Vollbild', 'endet es über Esc oder das System, folgt der Knopf (fullscreenchange)');
    await k.close();
  }

  console.log('3 · Stift an „Zutaten“ und „Zubereitung“ (390 px)');
  let { p, k } = await seite(390); await zumRezept(p, 'Kartoffelsuppe');
  ok(await p.locator('.ab-kopf [data-a=abschnitt][data-t=ings]').count() === 1 && await p.locator('.ab-kopf [data-a=abschnitt][data-t=steps]').count() === 1, 'an beiden Überschriften steht ein Stift');
  await p.click('[data-a=abschnitt][data-t=ings]');
  ok(await p.locator('.bogen #ab-ings').count() === 1 && await p.locator('.fenster').count() === 0 && await p.locator('[data-form=rezept]').count() === 0, 'die Zutaten werden an Ort und Stelle ein Textfeld (kein Fenster, kein Formular)');
  ok((await p.inputValue('#ab-ings')).split('\n')[0] === '500 g Kartoffeln', 'im Feld steht eine Zutat je Zeile, mit Menge');
  await p.fill('#ab-ings', (await p.inputValue('#ab-ings')) + '\n1 Prise Salz'); await p.click('.abschnitt [type=submit]'); await p.waitForTimeout(200);
  let r = await rz(p, 'r-suppe'); ok(r.ings.length === 4 && r.ings[3].name === 'Salz' && r.ings[3].unit === 'Prise' && await p.locator('#ab-ings').count() === 0 && (await p.locator('.zut li').count()) === 4, 'Speichern: die Zutat ist am Rezept, die Liste steht wieder da', JSON.stringify(r.ings.at(-1)));
  ok(await p.locator('.fenster').count() === 0, 'ein Rezept ohne Übersetzung fragt nichts');
  await p.click('[data-a=abschnitt][data-t=steps]');
  const nr = await p.$$eval('.ab-schritte .ab-nr', (l) => l.map((x) => x.textContent.trim())), werte = await p.$$eval('.ab-schritte textarea', (l) => l.map((x) => x.value));
  ok(nr.join() === '1,2,3' && werte.length === 3 && werte.every((w, i) => w === SCHRITTE_LANG[i]), 'jeder Schritt ein eigenes Feld; die Nummern stehen links als Anzeige, nicht im Text', nr.join());
  ok(await p.locator('.ab-nr').first().evaluate((e) => e.tagName !== 'TEXTAREA' && e.tagName !== 'INPUT' && !e.closest('textarea')), 'die Nummer ist kein Eingabefeld');
  await p.click('[data-a=ab-schritt-dazu]'); ok((await p.$$eval('.ab-schritte .ab-nr', (l) => l.map((x) => x.textContent.trim()))).join() === '1,2,3,4', '„+ Schritt“ fügt Feld 4 an');
  await p.locator('.ab-schritte textarea').nth(3).fill('Mit Salz abschmecken.'); await p.locator('.ab-schritte textarea').nth(1).fill('');
  await p.click('.abschnitt [type=submit]'); await p.waitForTimeout(200);
  r = await rz(p, 'r-suppe'); ok(r.steps.length === 3 && r.steps[2].txt === 'Mit Salz abschmecken.' && r.steps.every((x) => !/^\d/.test(x.txt)), 'Speichern: leere Felder fallen weg, kein Schritt beginnt mit seiner Nummer', r.steps.map((x) => x.txt).join(' | '));
  await p.click('[data-a=abschnitt][data-t=ings]'); await p.fill('#ab-ings', 'Quatsch'); await p.click('[data-a=ab-zu]'); await p.waitForTimeout(200);
  ok((await rz(p, 'r-suppe')).ings.length === 4 && await p.locator('#ab-ings').count() === 0, 'Abbrechen lässt alles, wie es war');
  ok(await querlauf(p) <= 0, 'nichts läuft quer');

  console.log('4 · Eine Übersetzung bearbeiten');
  await p.goBack(); await p.waitForSelector('.gruss'); await zumRezept(p, 'Gyoza');
  ok((await p.locator('.rezept-held h1').innerText()).trim() === 'Gyoza (Teigtaschen)', 'Selbst-Riegel: gezeigt wird die deutsche Fassung');
  await p.click('[data-a=abschnitt][data-t=ings]');
  ok((await p.inputValue('#ab-ings')).includes('Schweinehack') && (await p.locator('.abschnitt .ab-hin').innerText()).includes('Übersetzung (Deutsch)'), 'der Stift bearbeitet die gezeigte Übersetzung und sagt es');
  await p.fill('#ab-ings', '200 g Schweinehackfleisch\n1 tbsp Sojasauce'); await p.click('.abschnitt [type=submit]');
  await p.waitForSelector('#fassung-wahl'); ok(await p.locator('#fassung-wahl [data-a=fassung-haupt]').count() === 1 && await p.locator('#fassung-wahl [data-a=fassung-ueb]').count() === 1, 'Speichern fragt einmal: als Hauptfassung oder nur die Übersetzung');
  await p.click('[data-a=fassung-ueb]'); await p.waitForTimeout(250);
  r = await rz(p, 'r-gyoza'); ok(r.name === 'Gyoza' && r.ings[0].name === 'minced pork' && r.translations.de.ingredients[0] === 'Schweinehackfleisch' && r.translations.de.name === 'Gyoza (Teigtaschen)', '„Nein“: nur die Übersetzung ändert sich, das Original bleibt', JSON.stringify(r.translations.de));
  ok((await p.locator('.zut li').first().innerText()).includes('Schweinehackfleisch'), 'gezeigt wird die geänderte Übersetzung');
  await p.click('.rezept-held [data-a=rleiste]'); await p.click('.rwerk [data-a=bearbeiten]'); await p.waitForSelector('[data-form=rezept]');
  ok(await p.inputValue('[name=name]') === 'Gyoza (Teigtaschen)' && (await p.inputValue('[name=ings]')).includes('Schweinehackfleisch') && await p.locator('#form-ueb').count() === 1, '„Bearbeiten“ zeigt die Fassung, die gerade dasteht (Klaus: nicht das englische Original)');
  await p.fill('[name=name]', 'Gyoza – japanische Teigtaschen'); await p.click('[data-form=rezept] [type=submit]'); await p.waitForSelector('#fassung-wahl');
  await p.click('[data-a=fassung-haupt]'); await p.waitForSelector('.rezept-held h1'); await p.waitForTimeout(250);
  r = await rz(p, 'r-gyoza');
  ok(r.name === 'Gyoza – japanische Teigtaschen' && r.sprache === 'de' && r.ings[0].name === 'Schweinehackfleisch' && !r.translations.de, '„Ja“: der bearbeitete Text ist jetzt das Rezept, Sprache Deutsch', JSON.stringify({ n: r.name, s: r.sprache }));
  ok(r.translations.en?.name === 'Gyoza' && r.translations.en.ingredients.join() === 'minced pork,soy sauce' && r.translations.en.steps[0] === 'Mix the filling and fold the dumplings.', 'das bisherige englische Original liegt als Übersetzung „en“ (erkannt am Text), nichts ging verloren', JSON.stringify(r.translations.en));
  ok((await p.locator('.rezept-held h1').innerText()).trim() === 'Gyoza – japanische Teigtaschen' && await p.locator('[data-a=original]').count() === 0, 'die Ansicht zeigt die neue Hauptfassung, ohne Umschalter');
  await p.click('#leiste .fl-griff'); await p.click('#leiste [data-zu=start]'); await p.waitForSelector('.gruss'); await zumRezept(p, 'Pho-Suppe');
  await p.click('[data-a=abschnitt][data-t=steps]'); await p.locator('.ab-schritte textarea').first().fill('Brühe kochen, Nudeln einlegen.'); await p.click('.abschnitt [type=submit]'); await p.waitForSelector('#fassung-wahl');
  await p.click('[data-a=fassung-haupt]'); await p.waitForSelector('#quelle-wahl', { timeout: 3000 }).catch(() => {});
  ok(await p.locator('#quelle-wahl [data-s]').count() === 7 && await p.locator('#quelle-wahl [data-s=de]').count() === 0, 'ist die Sprache des Originals nicht zu erkennen, fragt die App (ohne die eigene)');
  await p.click('#quelle-wahl [data-s=en]'); await p.waitForTimeout(300);
  r = await rz(p, 'r-pho'); ok(r.steps[0].txt === 'Brühe kochen, Nudeln einlegen.' && r.translations.en?.name === 'Pho' && r.sprache === 'de' && await p.locator('.fenster').count() === 0, 'mit der Antwort geht es weiter: das Original liegt unter der gewählten Sprache', JSON.stringify(r.translations));
  ok(rufe.length === 0, 'beim Bearbeiten ging nichts an eine KI');
  await k.close();

  console.log('5 · Bearbeiten am breiten Schirm rechts (1280 px)');
  ({ p, k } = await seite(1280)); await zumRezept(p, 'Kartoffelsuppe');
  await p.click('.md-detail [data-a=rleiste]'); await p.click('.rwerk [data-a=bearbeiten]'); await p.waitForSelector('.md-detail [data-form=rezept]');
  let li = await box(p, '.md-liste'), fo = await box(p, '.md-detail [data-form=rezept]');
  ok(await p.locator('.md-liste .karte').count() === 3 && fo.x >= li.r - 1, 'das Formular steht rechts im Rezeptbereich, die Liste links bleibt stehen', JSON.stringify({ li, fo }));
  await p.fill('[name=name]', 'Kartoffelsuppe fein'); await p.click('[data-form=rezept] [type=submit]'); await p.waitForSelector('.md-detail .rezept-held h1');
  ok((await p.locator('.md-detail h1').innerText()).trim() === 'Kartoffelsuppe fein' && await p.locator('.md-liste .karte', { hasText: 'Kartoffelsuppe fein' }).count() === 1, 'Speichern zeigt das Rezept wieder rechts, die Liste ist nachgezogen');
  await p.click('.rail-n[data-zu=baum]'); await p.waitForSelector('.bz-gruppe'); await p.locator('.bz-gruppe[data-name=Suppen]').first().locator('.bz-auf').click(); await p.locator('.bz-r', { hasText: 'Kartoffelsuppe' }).first().click(); await p.waitForSelector('.md-detail .rezept-held h1');
  await p.click('.md-detail [data-a=rleiste]'); await p.click('.rwerk [data-a=bearbeiten]'); await p.waitForSelector('.md-detail [data-form=rezept]');
  ok(await p.locator('.md-liste .bz-gruppe').count() > 0 && await p.locator('.md-liste .gruss').count() === 0, 'aus „Ordner“: der Baum bleibt links stehen');
  await p.click('[data-form=rezept] [data-a=zurueck]'); await p.waitForSelector('.md-detail .rezept-held h1'); ok(await p.locator('.md-liste .bz-gruppe').count() > 0, 'Abbrechen führt zurück, der Baum steht noch');

  console.log('6 · Übersetzen: im Gerät nur, wenn der Browser es kann');
  await p.click('.rail-n[data-zu=start]'); await zumRezept(p, 'Kartoffelsuppe'); await p.click('.md-detail [data-a=rleiste]'); await p.click('.rwerk [data-a=uebersetzen]'); await p.waitForSelector('#ueb-wahl');
  ok(await p.locator('#ueb-weg').count() === 0 && (await p.locator('#ueb-was').innerText()).includes('Anthropic'), 'ohne Translator-API kein Weg „Im Gerät“; Claude wie bisher');
  await k.close();
  ({ p, k } = await seite(1280, { echt: true })); await zumRezept(p, 'Kartoffelsuppe'); await p.click('.md-detail [data-a=rleiste]'); await p.click('.rwerk [data-a=uebersetzen]'); await p.waitForSelector('#ueb-wahl');
  { const da = await p.evaluate(async () => ('Translator' in self ? await Promise.race([self.Translator.availability({ sourceLanguage: 'de', targetLanguage: 'en' }).catch(() => 'Fehler'), new Promise((w) => setTimeout(() => w('keine Antwort'), 3000))]) : 'keine API'));
    ok(da === 'available' || da === 'downloadable' || da === 'downloading' ? await p.locator('#ueb-weg').count() === 1 : await p.locator('#ueb-weg').count() === 0, `mit der echten API dieses Chromium („${da}“): der Weg steht nur da, wenn der Übersetzer etwas kann`); }
  await k.close();
  ({ p, k } = await seite(1280, { geraet: true })); await zumRezept(p, 'Kartoffelsuppe'); await p.click('.md-detail [data-a=rleiste]'); await p.click('.rwerk [data-a=uebersetzen]'); await p.waitForSelector('#ueb-weg');
  ok(await p.locator('#ueb-weg [data-w=geraet][aria-checked=true]').count() === 1 && (await p.locator('#ueb-weg').innerText()).includes('kostenlos') && (await p.locator('#ueb-was').innerText()).includes('nichts hinaus'), 'mit Translator-API: „Im Gerät · kostenlos“ ist vorgewählt, Claude daneben');
  await p.waitForTimeout(300);
  ok(await p.locator('#ueb-wahl [data-s=zh]').isDisabled() && await p.locator('#ueb-wahl [data-s=de]').isDisabled() && !(await p.locator('#ueb-wahl [data-s=it]').isDisabled()), 'Sprachen, die das Gerät nicht kann, und die Sprache des Rezepts sind ausgegraut');
  await p.evaluate(() => { sessionStorage.laden = '1'; });
  let sah = false; await p.click('#ueb-wahl [data-s=it]');
  for (let i = 0; i < 30 && !sah; i++) { sah = await p.evaluate(() => /Sprachpaket wird geladen/.test(document.getElementById('warten-zeile')?.textContent || '')); await p.waitForTimeout(50); }
  ok(sah, 'beim ersten Mal steht „Sprachpaket wird geladen …“ mit Fortschritt da');
  await p.waitForFunction(() => /Im Gerät übersetzt/.test(document.getElementById('toast').textContent), null, { timeout: 8000 }).catch(() => {});
  r = await rz(p, 'r-suppe'); const tr = await p.evaluate(() => window.__tr);
  ok(r.translations?.it?.name === '[it] Kartoffelsuppe' && r.translations.it.steps.length === 3 && r.translations.it.weg === 'geraet' && tr.erzeugt.join() === 'de>it' && rufe.length === 0, 'im Gerät übersetzt (Deutsch → Italienisch), abgelegt wie jede Übersetzung, nichts ging an Claude', JSON.stringify(tr.erzeugt));
  await p.evaluate(() => { delete sessionStorage.laden; });
  await p.click('.md-detail [data-a=rleiste]').catch(() => {}); if (!(await p.locator('.rwerk').count())) await p.click('.md-detail [data-a=rleiste]'); await p.click('.rwerk [data-a=uebersetzen]'); await p.click('#ueb-weg [data-w=claude]'); await p.waitForSelector('#ueb-wahl[data-weg=claude]');
  await p.click('#ueb-wahl [data-s=fr]'); await p.waitForFunction(() => /Übersetzt/.test(document.getElementById('toast').textContent), null, { timeout: 8000 }).catch(() => {});
  r = await rz(p, 'r-suppe'); ok(rufe.length === 1 && r.translations?.fr?.name === 'Soupe de pommes de terre', 'Claude bleibt der zweite Weg (beste Qualität)');
  await k.close();

  for (const breite of [390, 1280]) {
    console.log(`7 · Bild anpassen im Vollbild (${breite} px)`);
    ({ p, k } = await seite(breite)); await zumRezept(p, 'Kartoffelsuppe');
    const kopf = await box(p, '.rezept-held>img'), karte = breite >= 1000 ? await box(p, '.md-liste .karte .bild') : null;
    await p.locator('.rezept-held>img').click({ position: { x: 30, y: 30 } }); await p.waitForSelector('.bildvoll');
    const bv = await box(p, '.bildvoll'), vp = await p.evaluate(() => [innerWidth, innerHeight]);
    ok(Math.abs(bv.w - vp[0]) < 2 && Math.abs(bv.h - vp[1]) < 2 && await p.locator('.bildvoll #zs-rahmen').count() === 1, 'ein Tipp aufs Bild öffnet gleich „Bild anpassen“ im Vollbild', JSON.stringify(bv));
    const ra = await box(p, '#zs-rahmen'), wz = await box(p, '.bv-werk');
    ok(wz.r <= ra.r && wz.r > ra.r - 20 && wz.b <= ra.b && wz.b > ra.b - 20, 'die Bildwege stehen unten rechts am Bild', JSON.stringify({ ra, wz }));
    ok((await p.$$eval('.bv-werk [data-w]', (l) => l.map((x) => x.dataset.w))).join() === 'bild-dazu,ki-bild,gratis-bild,zine,bild-entfernen', 'ersetzen, KI, Pollinations, Food-Zine, entfernen');
    const vh = await box(p, '.zs-vor .vh'), vk = await box(p, '.zs-vor .vk'), soll = breite >= 1000 ? karte.w / karte.h : 1;
    ok(Math.abs(vh.w / vh.h - kopf.w / kopf.h) < 0.03 && Math.abs(ra.w / ra.h - kopf.w / kopf.h) < 0.03, 'Rahmen und Vorschau „Kopfbild“ haben die echte Form des Kopfbilds', `${(vh.w / vh.h).toFixed(3)} / ${(kopf.w / kopf.h).toFixed(3)}`);
    ok(Math.abs(vk.w / vk.h - soll) < 0.03, 'die Vorschau „Karte“ hat die echte Form der Karte', `${(vk.w / vk.h).toFixed(3)} / ${soll.toFixed(3)}`);
    ok(await querlauf(p) <= 0, 'nichts läuft quer');
    await p.click('.bildvoll [data-a=zs-lage][data-l="50,0"]'); await p.click('.bildvoll [data-a=zs-ok]'); await p.waitForTimeout(300);
    r = await rz(p, 'r-suppe'); ok(r.imgCrop?.y === 0 && await p.locator('.bildvoll').count() === 0, '„Übernehmen“ speichert den Ausschnitt und schließt');
    await p.locator('.rezept-held>img').click({ position: { x: 30, y: 30 } }); await p.waitForSelector('.bildvoll'); await p.goBack(); await p.waitForTimeout(200);
    ok(await p.locator('.bildvoll').count() === 0 && await p.locator('.rezept-held h1').count() === 1, 'die Zurück-Taste schließt das Vollbild und bleibt beim Rezept');
    await p.locator('.rezept-held>img').click({ position: { x: 30, y: 30 } }); await p.waitForSelector('.bildvoll'); await p.click('.bv-werk [data-w=bild-entfernen]'); await p.waitForTimeout(300);
    r = await rz(p, 'r-suppe'); ok(!r.img && await p.locator('.bildvoll').count() === 0 && await p.locator('#toast [data-a=toast-tun]').count() === 1, '„Bild entfernen“ nimmt das Bild weg und bietet Rückgängig');
    await p.click('#toast [data-a=toast-tun]'); await p.waitForTimeout(300); ok(!!(await rz(p, 'r-suppe')).img, 'Rückgängig bringt es zurück');
    await k.close();
  }

  console.log('8 · Seitenleiste rechts einrasten (1280 px)');
  ({ p, k } = await seite(1280)); await zumRezept(p, 'Kartoffelsuppe');
  const g = await box(p, '.rail-griff'); await p.mouse.move(g.x + g.w / 2, g.y + g.h / 2); await p.mouse.down(); await p.mouse.move(g.x + 40, g.y + 10, { steps: 3 });
  ok(await p.locator('#rail-ziel.l').count() === 1, 'beim Ziehen zeigt ein Rahmen, wo sie einrastet'); await p.mouse.move(1200, 400, { steps: 8 });
  ok(await p.locator('#rail-ziel.r').count() === 1, 'über der rechten Hälfte zeigt er rechts'); await p.mouse.up(); await p.waitForTimeout(300);
  let ko = await box(p, '#kopf'), md = await box(p, '.md-liste');
  ok(await p.evaluate(() => document.body.dataset.rail) === 'r' && ko.r >= 1279 && md.x < 5 && await p.locator('#rail-ziel').count() === 0, 'losgelassen: Leiste rechts, Inhalt links', JSON.stringify({ ko, md }));
  ok(await querlauf(p) <= 0 && (await box(p, '.md-detail')).r <= ko.x + 1, 'nichts läuft quer, das Rezept endet an der Leiste');
  await p.waitForTimeout(450); await p.click('.rail-n[data-a=farbe]'); await p.waitForSelector('.fenster'); const fe = await box(p, '.fenster'); ok(fe.x >= 0 && fe.r <= 1280, 'Fenster stehen weiter ganz im Bild'); await p.keyboard.press('Escape');
  ok((await zustand(p)).einstellungen.railSeite === 'r', 'die Seite steht in den Einstellungen');
  await p.reload(); await p.waitForSelector('.gruss'); ok(await p.evaluate(() => document.body.dataset.rail) === 'r' && (await box(p, '#kopf')).r >= 1279, 'nach dem Neuladen steht sie noch rechts');
  /* lange drücken (Finger) auf der Leiste und nach links ziehen */
  const n = await box(p, '.rail-oben .name');
  const zug = (t, x, y) => p.evaluate(([t, x, y]) => { const ev = new PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'touch', pointerId: 9, isPrimary: true, button: 0 }); (t === 'pointerdown' ? document.elementFromPoint(x, y) : document).dispatchEvent(ev); }, [t, x, y]);
  await zug('pointerdown', n.x + 10, n.y + 5); await p.waitForTimeout(80); await zug('pointermove', n.x - 200, n.y + 5); await zug('pointerup', n.x - 200, n.y + 5); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.body.dataset.rail) === 'r', 'ein kurzer Zug ohne langen Druck verschiebt nichts');
  await zug('pointerdown', n.x + 10, n.y + 5); await p.waitForTimeout(520); for (const x of [900, 500, 120]) await zug('pointermove', x, n.y + 20); await zug('pointerup', 120, n.y + 20); await p.waitForTimeout(250);
  ok(await p.evaluate(() => document.body.dataset.rail) === 'l' && (await box(p, '#kopf')).x < 2, 'lange drücken und nach links ziehen: wieder links');
  await p.waitForTimeout(450); await p.click('.rail-griff'); await p.waitForTimeout(150); ok(await p.evaluate(() => document.body.dataset.rail) === 'r', 'ein Tipp auf den Griff wechselt die Seite (auch ohne Ziehen erreichbar)');
  await k.close();

  console.log('9 · Zwei Spalten nach dem Rezeptbereich: die Zubereitung liegt ganz im Bild');
  for (const seiteL of ['l', 'r']) for (const zu of [false, true]) for (const breite of [1000, 1100, 1280]) {
    ({ p, k } = await seite(breite, { hoehe: 760, einst: { railZu: zu, railSeite: seiteL } }));
    for (const ansicht of ['start', 'baum']) {
      if (ansicht === 'start') await zumRezept(p, 'Kartoffelsuppe');
      else { await p.click('.rail-n[data-zu=baum]'); await p.waitForSelector('.bz-gruppe'); await p.locator('.bz-gruppe[data-name=Suppen]').first().locator('.bz-auf').click(); await p.locator('.bz-r', { hasText: 'Kartoffelsuppe' }).first().click(); await p.waitForSelector('.md-detail .schritte li'); }
      const m = await p.evaluate(() => { const sp = document.querySelector('.md-detail .zweispalt'), st = sp.children[1].getBoundingClientRect(), zt = sp.children[0].getBoundingClientRect(), li = [...sp.querySelectorAll('.schritte li')].map((x) => x.getBoundingClientRect());
        return { rechts: Math.max(...li.map((b) => b.right)), breite: st.width, unter: st.top >= zt.bottom - 1, w: innerWidth, quer: document.scrollingElement.scrollWidth - innerWidth, zeile: Math.min(...li.map((b) => b.width)) }; });
      ok(m.rechts <= m.w && m.quer <= 0 && (m.breite >= 260 || m.unter) && m.zeile >= 200, `${breite} px · Leiste ${seiteL === 'l' ? 'links' : 'rechts'} ${zu ? 'zu' : 'auf'} · ${ansicht === 'start' ? 'Rezepte' : 'Ordner'}: jeder Schritt ganz im Bild, Spalte ${Math.round(m.breite)} px${m.unter ? ' unter den Zutaten' : ''}`, JSON.stringify(m));
    }
    await k.close();
  }
  ok(!fehler.length, 'keine Fehler in der Konsole, kein Netz nach draußen', fehler.slice(0, 3).join(' | '));
} catch (f) { rot++; console.log('  ✗ ROT: Absturz — ' + String(f?.message || f).split('\n')[0]); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`);
process.exitCode = rot ? 1 : 0;
