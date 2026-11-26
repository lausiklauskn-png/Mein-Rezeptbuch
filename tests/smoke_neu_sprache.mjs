// Probe im echten Browser: Sprache der Oberfläche (wie das Gerät, Sprachmenü, Tabellen der übrigen Sprachen) und Übersetzen von Rezepten
// (einzeln und alle, mit Kostenhinweis). Die KI ist gestellt (Anthropic antwortet aus der Probe). Aufruf: node tests/smoke_neu_sprache.mjs
// WURZEL=<Pfad> misst eine Kopie (Gegenprobe).
import { createRequire } from 'node:module';
import { themenAuf } from './neu-hilfe.mjs';
import { sammle } from '../tools/sprach-schluessel.mjs';
import { kostenSchaetzung } from '../kern/ki/helfer.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { readFileSync } from 'node:fs'; import { extname, join } from 'node:path';
const WURZEL = process.env.WURZEL || process.cwd();
const TYP = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer(async (q, a) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; try { const d = await readFile(join(WURZEL, p)); a.writeHead(200, { 'content-type': TYP[extname(p)] || 'application/octet-stream' }); a.end(d); } catch { a.writeHead(404); a.end(); } }).listen(0);
const ORT = `http://localhost:${srv.address().port}/neu/`, URL0 = ORT + '?leer';
let gruen = 0, rot = 0; const ok = (b, t, mehr = '') => { if (b) { gruen++; console.log('  ✓ ' + t); } else { rot++; console.log('  ✗ ROT: ' + t + (mehr ? ' — ' + mehr : '')); } };
const browser = await chromium.launch(); const fehler = [], rufe = []; let antwort = () => ({});

/* ---- Bestand der Probe: erfundene Rezepte auf Deutsch (Inhalt, der nicht übersetzt wird) ---- */
const BILD = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';   // ein Bildpunkt
const heute = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const SUPPE = { uid: 'r-probe-1', id: 1, name: 'Kartofelsuppe', cat: 'suppe', folder: '7', servings: 4, prepTime: 40, source: 'Omas Heft', rating: { stars: 4 }, nutrition: { kcal: 310, fat: 9, carbs: 48, protein: 7, fiber: 5, sugar: 4, sodium: 620, quelle: 'ki' },
  ings: [{ amt: '500', unit: 'g', name: 'Kartofeln', note: 'mehlig' }, { amt: '1', unit: 'l', name: 'Brühe', note: '' }, { amt: '2', unit: 'EL', name: 'Butter', note: '' }, { amt: '1', unit: 'kleine', name: 'Zwiebel', note: '' }], steps: [{ txt: 'Kartofeln schälen und 10 Minuten kochen.' }, { txt: 'Mit Brühe aufgiessen und im Mixer pürieren.' }] };
const KUCHEN = { uid: 'r-probe-2', id: 2, name: 'Apfelkuchen', cat: 'kuchen', servings: 12, img: BILD, ings: [{ amt: '4', unit: '', name: 'Äpfel', note: '' }, { amt: '200', unit: 'g', name: 'Mehl', note: '' }], steps: [{ txt: 'Teig rühren, Äpfel darauf, backen.' }] };
const LOSE = { uid: 'r-probe-3', id: 3, name: 'Gurkensalat', cat: '', servings: 2, ings: [{ amt: '1', unit: '', name: 'Gurke', note: '' }], steps: [{ txt: 'Gurke hobeln.' }] };
const ROLLE = { uid: 'r-probe-4', id: 4, name: 'Avocadorolle', cat: 'eig_1', servings: 2, ings: [{ amt: '1', unit: '', name: 'Avocado', note: '' }, { amt: '100', unit: 'g', name: 'Reis', note: '' }], steps: [{ txt: 'Reis kochen.' }, { txt: 'Rollen.' }] };
const BESTAND = { rezepte: [SUPPE, KUCHEN, LOSE, ROLLE], ordner: [{ id: '7', name: 'Feste' }], menu: [], kategorien: { eigene: [{ id: 'eig_1', de: 'Sushi', symbol: 'karte' }], namen: {}, ausgeblendet: ['finger'], folge: [] },
  einkauf: { posten: [{ uid: 'r-probe-1', portionen: 4 }], haken: {}, eigene: [{ id: 'e1', text: 'Küchenrolle' }], laeden: { Supermarkt: [] }, laden: 'Supermarkt' }, plan: { [heute]: ['r-probe-1'] } };
const EN_SUPPE = { name: 'Potato soup', ingredients: ['potatoes', 'stock', 'butter', 'onion'], steps: ['Peel the potatoes and boil for 10 minutes.', 'Add the stock and blend.'] };
/* Antwort der gestellten KI auf einen Übersetz-Auftrag: so viele Zutaten und Schritte, wie der Auftrag nennt. */
const uebAntwort = (leib) => { const t = leib.messages[0].content, m = /exactly (\d+) ingredients and (\d+) steps/.exec(t), z = /\{"(\w\w)":\{"name"/.exec(t)[1], name = /^Name: (.*)$/m.exec(t)[1];
  return name === 'Kartofelsuppe' && z === 'en' ? { en: EN_SUPPE } : { [z]: { name: `${z}:${name}`, ingredients: Array.from({ length: +m[1] }, (_, i) => `${z}:Zutat ${i + 1}`), steps: Array.from({ length: +m[2] }, (_, i) => `${z}:Schritt ${i + 1}`) } }; };

async function seite({ ort = 'de-DE', breite = 390, bestand = BESTAND, einst = {}, schluessel = { anthropic: 'sk-ant-probe-111111111111111111' }, start = URL0, vorher = null, alt = null } = {}) {
  const k = await browser.newContext({ locale: ort, viewport: { width: breite, height: 800 }, serviceWorkers: 'block', acceptDownloads: true }), p = await k.newPage();
  p.on('pageerror', (e) => fehler.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && fehler.push(m.text()));
  /* diese Probe misst die Wege mit Claude, wie auf einem Gerät ohne eingebauten Übersetzer (Android-Chrome); den Weg „Im Gerät“ misst smoke_neu_bedienung */
  await k.addInitScript(() => { try { delete self.Translator; } catch { /* schon weg */ } });
  await p.route(/^https?:\/\/(?!localhost)/, (r) => { fehler.push('Netz nach draußen: ' + r.request().url()); r.abort(); });
  await p.route('https://api.anthropic.com/**', async (r) => { const leib = JSON.parse(r.request().postData()); rufe.push(leib); const a = await antwort(leib, rufe.length);
    try { if (a && a.status) await r.fulfill({ status: a.status, contentType: 'application/json', body: JSON.stringify({ error: { type: 'api_error', message: 'gestellt' } }) }); else await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(a) }], stop_reason: 'end_turn' }) }); } catch { /* der Aufruf wurde abgebrochen */ } });
  if (vorher) await vorher(p);
  await p.goto(ORT + 'app.css');
  if (alt) await p.evaluate((alt) => { for (const [n, w] of Object.entries(alt)) localStorage.setItem(n, w); }, alt);   /* Speicher der bisherigen App */
  await p.evaluate(({ bestand, einst, schluessel }) => new Promise((ja) => { const a = indexedDB.open('KuechenKern-rezeptbuch', 1); a.onupgradeneeded = () => a.result.createObjectStore('zustand'); a.onsuccess = () => { const t = a.result.transaction('zustand', 'readwrite'), l = t.objectStore('zustand');
    if (bestand) l.put({ fassung: 1, einstellungen: { ton: 'hell', ...einst }, zustand: bestand }, 'alles'); for (const [n, w] of Object.entries(schluessel)) l.put(w, 'schluessel-' + n); t.oncomplete = () => { a.result.close(); ja(); }; }; }), { bestand, einst, schluessel });
  await p.goto(start); await p.waitForSelector('.gruss'); return { p, k };
}
const gespeichert = (p) => p.evaluate(() => new Promise((ja) => { const a = indexedDB.open('KuechenKern-rezeptbuch'); a.onsuccess = () => { const q = a.result.transaction('zustand').objectStore('zustand').get('alles'); q.onsuccess = () => { a.result.close(); ja(q.result); }; }; }));
/* gespeichert wird mit kurzer Verzögerung: warten, bis die Bedingung im Speicher steht */
const bisGespeichert = async (p, passt) => { let g = await gespeichert(p); for (let i = 0; i < 50 && !passt(g); i++) { await p.waitForTimeout(100); g = await gespeichert(p); } return g; };
const zu = async (p) => { await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.getElementById('fensterort').innerHTML); };
const leisteAuf = async (p) => { if (!(await p.locator('#leiste .fl-knoepfe').count())) await p.click('#leiste .fl-griff'); await p.waitForSelector('#leiste .fl-knoepfe'); };
const geh = async (p, wohin, warte) => { await leisteAuf(p); await p.click(`#leiste [data-zu=${wohin}]`); await p.waitForSelector(warte); };
const zuEinst = async (p) => { await geh(p, 'werkstatt', '.themen'); await themenAuf(p); };
const zumRezept = async (p, name = 'Kartofelsuppe') => { await p.locator('.karte', { hasText: name }).first().click(); await p.waitForSelector('.rezept-held h1'); };
const menue = async (p) => { if (!(await p.locator('.rwerk').count())) await p.click('[data-a=rleiste]'); await p.click('.rwerk [data-a=rmenue]'); await p.waitForSelector('#rmenue'); };
/* Wort und kleine Zeile einer Zeile der Einstellungen, z. B. „Sprache · wie das Gerät“ */
const zeileText = (p, sel) => p.locator(sel).evaluate((b) => [b.querySelector('span').firstChild.textContent.trim(), b.querySelector('small')?.innerText.trim() || ''].join(' · '));
const toast = (p, re) => p.waitForFunction((q) => new RegExp(q).test(document.getElementById('toast').innerText), re.source, { timeout: 15000 });

/* ---- Was steht da? Jeder Text und jedes title/aria-label/placeholder/alt der Seite (auch der Hinweis, den die Blasen sich merken). ---- */
const texte = (p) => p.evaluate(() => { const aus = [], glatt = (t) => String(t || '').replace(/\s+/g, ' ').trim(), w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.parentElement?.closest('script,style,noscript')) continue; const t = glatt(n.textContent); if (t) aus.push(t); }
  for (const e of document.body.querySelectorAll('*')) for (const a of ['title', 'aria-label', 'placeholder', 'alt', 'data-hinweis']) { const t = glatt(e.getAttribute(a)); if (t) aus.push(t); }
  aus.push(glatt(document.title)); return aus; });
/* Die deutschen Schlüssel der App (aus dem Werkzeug): kein Text der englischen Oberfläche darf einer davon sein, wenn die englische Fassung anders lautet. */
const { paare: PAARE, unlesbar } = sammle([['neu/app.mjs', readFileSync(join(WURZEL, 'neu/app.mjs'), 'utf8')]]);
const glatt = (t) => String(t).replace(/\s+/g, ' ').trim(), reEsc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FEST = new Map(), MUSTER = [];
for (const [de, en] of Object.entries(PAARE)) { if (glatt(de) === glatt(en)) continue; if (/\{\d\}/.test(de)) MUSTER.push([new RegExp('^' + glatt(de).split(/\{\d\}/).map(reEsc).join('(.+?)') + '$'), de]); else FEST.set(glatt(de), de); }
const inhaltVon = (bestand) => { const s = new Set(['Mein Rezeptbuch']); for (const r of bestand.rezepte) { s.add(r.name); for (const z of r.ings) { s.add(z.name); if (z.note) s.add(z.note); s.add(glatt(`${z.amt} ${z.unit}`)); } for (const x of r.steps) s.add(x.txt); if (r.source) s.add(r.source); }
  for (const o of bestand.ordner) s.add(o.name); for (const c of bestand.kategorien.eigene) s.add(c.de); for (const e of bestand.einkauf?.eigene || []) s.add(e.text); return s; };
const INHALT = inhaltVon(BESTAND), LANG = [...INHALT].filter((t) => t.length >= 4).sort((a, b) => b.length - a.length);
const DEUTSCH = /[äöüÄÖÜß]|(?<![\p{L}])(und|oder|nicht|der|das|mit|von|zum|zur|eine|einen|wird|werden|ist|noch|kein|keine|bitte)(?![\p{L}])/u;
/* Der Wortschatz der deutschen Schlüssel (Wörter ab vier Buchstaben, die in keinem englischen Text der App vorkommen): fängt auch einen deutschen Text,
   der gar nicht über L() läuft und deshalb kein Schlüssel ist. */
const worte = (t) => String(t).toLowerCase().match(/\p{L}{4,}/gu) || [];
const EN_WORTE = new Set(Object.values(PAARE).flatMap(worte)), DE_WORTE = new Set(Object.keys(PAARE).flatMap(worte).filter((w) => !EN_WORTE.has(w)));
/** Deutsche Reste in einer Liste von Texten: ein Schlüssel wörtlich, ein Schlüssel-Muster, oder deutsche Wörter außerhalb der Inhalte. */
function reste(liste, erlaubt = new Set()) {
  const aus = new Set();
  for (const t of liste) {
    if (INHALT.has(t)) continue;
    if (FEST.has(t) && !erlaubt.has(FEST.get(t))) { aus.add(`„${t}“`); continue; }
    const m = MUSTER.find(([re, de]) => re.test(t) && !erlaubt.has(de)); if (m) { aus.add(`„${t}“ (Schlüssel ${m[1]})`); continue; }
    let rest = t; for (const i of LANG) rest = rest.split(i).join(' ');
    const wort = worte(rest).find((w) => DE_WORTE.has(w) && !erlaubt.has(w));
    if (DEUTSCH.test(rest) || wort) aus.add(`„${t}“ (deutsche Wörter${wort ? ': ' + wort : ''})`);
  }
  return [...aus];
}
const gesehen = [];   // [Ansicht, Texte] der englischen Runde
const merke = async (p, wo) => { gesehen.push([wo, await texte(p)]); };

try {
  console.log('1 · Gerät Englisch: die Oberfläche ist Englisch, in jeder Ansicht');
  ok(unlesbar.length === 0 && FEST.size + MUSTER.length > 100, 'die Schlüssel der App sind lesbar (Werkzeug)', `${FEST.size} feste, ${MUSTER.length} Muster, ${unlesbar.length} unlesbar`);
  let { p, k } = await seite({ ort: 'en-GB' });
  ok(await p.evaluate(() => document.documentElement.lang) === 'en' && (await p.locator('.gruss').innerText()).startsWith('What are we cooking today?'), 'Gerät Englisch: die Seite sagt lang="en" und begrüßt auf Englisch');
  const kats = (await p.locator('.fotokat button').allInnerTexts()).map((t) => glatt(t).replace(/^[^\p{L}]+/u, '')).join(' | ');   /* ohne das Zeichen davor */
  ok(kats === 'All 4 | Soups 1 | Cakes 1 | Sushi 1 | No category 1 | Feste 1', 'die festen Kategorien heißen englisch; eigene Namen und Ordner bleiben, wie sie heißen', kats);
  await merke(p, 'Start');
  await p.fill('#suchfeld', 'kartof'); await p.waitForSelector('.ueber h2'); await merke(p, 'Suche mit Treffer'); await p.fill('#suchfeld', 'zzzz'); await p.waitForSelector('.leer p'); await merke(p, 'Suche ohne Treffer'); await p.fill('#suchfeld', '');
  await zumRezept(p); await p.click('[data-a=rleiste]'); await p.click('[data-naehr] summary'); await merke(p, 'Rezept mit Werkzeugen');
  ok((await p.locator('.zweispalt').innerText()).includes('Ingredients') && (await p.locator('[data-naehr] summary').innerText()).includes('per serving') && glatt(await p.locator('.rezept-held .meta').innerText()).includes('40 min'), 'Rezept: Überschriften, Nährwerte und Zeit auf Englisch; der Inhalt bleibt, wie er ist');
  await p.click('.rwerk [data-a=rmenue]'); await p.waitForSelector('#rmenue'); await merke(p, 'Menü am Rezept'); await zu(p);
  for (const [a, sel] of [['einordnen', '#ein-kat'], ['bild-blatt', '.fenster .liste']]) { await p.click(`.rwerk [data-a=${a}]`); await p.waitForSelector(sel); await merke(p, 'Fenster ' + a); await zu(p); }
  await p.click('[data-a=planen]'); await p.waitForSelector('.tagwahl'); await merke(p, 'Fenster Planen'); await zu(p);
  await p.click('[data-a=auf-liste]'); await toast(p, /shopping list|servings adjusted/); await merke(p, 'Meldung Einkaufen');
  await p.click('[data-a=kochen]'); await p.waitForSelector('.koch'); await merke(p, 'Kochen 1'); await p.click('.k-fuss .vor'); await p.waitForFunction(() => /2/.test(document.querySelector('.k-nr')?.innerText || '')); await merke(p, 'Kochen 2');
  const koch = await p.evaluate(() => [document.querySelector('.k-nr').textContent, document.querySelector('.k-fuss .vor').textContent, [...document.querySelector('.k-geraete').querySelectorAll('.gr-k')].map((g) => g.textContent).join(' + ')].map((t) => t.replace(/\s+/g, ' ').trim()).join(' | '));
  ok(koch === 'Step 2 of 2 | Done | Pot + Blender', 'Kochansicht: Schrittzähler, Knöpfe und Geräte auf Englisch', koch);
  await p.keyboard.press('Escape'); await p.waitForSelector('.rezept-held h1');
  if (!(await p.locator('.rwerk').count())) await p.click('[data-a=rleiste]'); await p.click('.rwerk [data-a=bearbeiten]'); await p.waitForSelector('[data-form=rezept]'); await merke(p, 'Formular');
  ok((await p.locator('[data-form=rezept] button[type=submit]').innerText()).trim() === 'Save' && (await p.locator('[data-form=rezept] label').first().innerText()).trim().startsWith('Name'), 'Formular: Felder und Knöpfe auf Englisch');
  await p.click('[data-form=rezept] [data-a=zurueck]'); await p.waitForSelector('.rezept-held h1');
  await p.evaluate(() => scrollTo(0, 0)); await p.click('#kopf [data-a=neu]'); await p.waitForSelector('.imp-tabs'); await merke(p, 'Neu: sechs Wege');
  ok((await p.locator('.imp-tabs button').allInnerTexts()).map(glatt).join(' ') === 'Write Photo Web Text File Examples', 'Neu-Fenster: die sechs Wege auf Englisch', (await p.locator('.imp-tabs button').allInnerTexts()).map(glatt).join(' '));
  await p.click('.imp-tabs [data-t=scan]'); await p.waitForSelector('.imp-p[data-weg=scan]');
  for (const t of ['scan', 'web', 'text', 'pakete']) { await p.click(`.imp-reihe [data-t=${t}]`); await p.waitForSelector(`.imp-p[data-weg=${t}]`); if (t === 'scan') await p.click('#scan-mehr summary'); await merke(p, 'Neu: ' + t); if (t === 'web') { await p.click('[data-a=web-einfuegen]'); await p.waitForSelector('#web-text'); await merke(p, 'Neu: web einfügen'); } }
  await zu(p);
  await leisteAuf(p); await merke(p, 'Fliegende Leiste');
  ok((await p.locator('#leiste [role=menuitem]').allInnerTexts()).map(glatt).join(' | ').startsWith('Recipes | Folders | Planner | Shopping') && await p.getAttribute('#leiste', 'aria-label') === 'Sections', 'fliegende Leiste: Bereiche und Werkzeuge auf Englisch', (await p.locator('#leiste [role=menuitem]').allInnerTexts()).map(glatt).join(' | '));
  await geh(p, 'einkauf', '#ek-liste'); await merke(p, 'Einkauf');
  ok(glatt(await p.locator('.laeden .chip').first().innerText()) === 'Supermarket' && (await p.locator('.ek-gruppe h3').allInnerTexts()).every((t) => !/[äöü]/.test(t)), 'Einkauf: der erste Laden und die Warengruppen auf Englisch', (await p.locator('.ek-gruppe h3').allInnerTexts()).join(' | '));
  await p.click('[data-a=ek-laden-neu]'); await p.waitForSelector('[data-form=laden]'); await merke(p, 'Fenster Neuer Laden'); await zu(p);
  await geh(p, 'plan', '.w-tage'); await merke(p, 'Plan');
  const planKopf = glatt(await p.locator('.w-kopf strong').innerText()), tage = (await p.locator('.w-tag .d small').allTextContents()).join(' ');
  ok(/^Week \d+ \d/.test(planKopf) && !/ bis /.test(planKopf) && tage === 'Mon Tue Wed Thu Fri Sat Sun', 'Plan: Woche, Spanne und Wochentage auf Englisch', planKopf + ' | ' + tage);
  await p.locator('[data-a=plan-waehlen]').first().click(); await p.waitForSelector('.wahl-liste'); await merke(p, 'Fenster Gericht planen'); await zu(p);
  await zuEinst(p); await merke(p, 'Einstellungen, alle Themen offen');
  ok((await p.locator('.gkopf').allInnerTexts()).map(glatt).join(' | ') === 'Backup | AI keys | Order | Appearance | Examples | Help | Clean up', 'Einstellungen: die sieben Themen auf Englisch', (await p.locator('.gkopf').allInnerTexts()).map(glatt).join(' | '));
  for (const [sel, warte, wo] of [['[data-a=schluessel][data-anbieter=anthropic]', '[data-form=schluessel]', 'Schlüssel-Fenster'], ['.themen [data-a=farbe]', '.fleckliste', 'Farbe'], ['.themen [data-a=schrift]', '#schriftregler', 'Schrift'], ['.themen [data-a=tresor]', '[data-form=tresor]', 'Tresor'], ['.themen [data-a=sprache]', '#sprach-wahl', 'Sprache'], ['.themen [data-a=alle-uebersetzen]', '#alle-ueb-wahl', 'Alle übersetzen']]) {
    await p.click(sel); await p.waitForSelector(warte); if (wo === 'Schlüssel-Fenster') await p.click('.fenster .frag summary'); if (wo === 'Alle übersetzen') { await p.click('#alle-ueb-wahl [data-s=fr]'); await p.waitForSelector('#alle-ueb-was'); } await merke(p, 'Fenster ' + wo); await zu(p); }
  for (const [ziel, warte] of [['kategorien', '#kat-liste'], ['baum', '.bz-teilkopf'], ['bilder', '.bildgitter']]) { await p.click(`.zeile[data-zu=${ziel}]`); await p.waitForSelector(warte); if (ziel === 'baum') for (const t of ['kat', 'ord']) await p.click(`[data-a=baum-teil][data-teil=${t}]`);   /* beide Äste auf, damit auch ihr Inhalt auf Englisch geprüft wird */ await merke(p, 'Ansicht ' + ziel);
    if (ziel === 'kategorien') { await p.locator('[data-a=kat-emoji]').first().click(); await p.waitForSelector('.emoji-raster'); await merke(p, 'Fenster Bild oder Zeichen'); await zu(p); } await zuEinst(p); }
  await p.click('.themen [data-a=tresor]'); await p.waitForSelector('[data-form=tresor]'); await p.click('[data-form=tresor] button[type=submit]'); await p.waitForSelector('.tr-liste .zeile'); await merke(p, 'Tresor mit Stand'); await zu(p);
  await p.setInputFiles('#datei-sicherung', { name: 'kaputt.json', mimeType: 'application/json', buffer: Buffer.from('kein json') }); await toast(p, /backup|Sicherung/); await merke(p, 'Meldung: Datei ist keine Sicherung');
  ok(glatt(await p.locator('#toast').innerText()) === 'The file is not a valid backup (no JSON).', 'eine Meldung, die der Kern nur deutsch kennt, steht englisch da', glatt(await p.locator('#toast').innerText()));
  await geh(p, 'start', '.fotokat'); await zumRezept(p, 'Apfelkuchen'); if (!(await p.locator('.rwerk').count())) await p.click('[data-a=rleiste]'); await p.click('.rwerk [data-a=bild-blatt]'); await p.waitForSelector('.bb-bild'); await merke(p, 'Bild-Blatt mit Bild'); await zu(p);
  await p.click('.rezept-held img'); await p.waitForSelector('.bildvoll #zs-rahmen'); await merke(p, 'Bild anpassen (Vollbild)'); await p.click('.bildvoll [data-a=bv-zu]'); await p.waitForTimeout(200);
  await menue(p); await p.click('#rmenue [data-a=qr]'); await p.waitForSelector('#qr-bild svg'); await merke(p, 'QR-Code'); await zu(p);
  await k.close();
  ({ p, k } = await seite({ ort: 'en-GB', breite: 1280 })); await merke(p, 'Monitor mit Seitenleiste');
  ok((await p.locator('.rail-n .t').allInnerTexts()).map(glatt).join(' | ') === 'Notebook | Recipes | Folders | Planner | Shopping | Creative book | Settings | Colour', 'Monitor: die Seitenleiste auf Englisch', (await p.locator('.rail-n .t').allInnerTexts()).map(glatt).join(' | ')); await k.close();
  ({ p, k } = await seite({ ort: 'en-GB', bestand: null })); await p.waitForSelector('.leer.einladung'); await merke(p, 'leeres Buch');
  ok((await p.locator('.leer-text h2').innerText()).trim() === 'No recipes yet', 'leeres Buch: die Einladung auf Englisch'); await k.close();
  const funde = gesehen.flatMap(([wo, l]) => reste(l).map((r) => `${wo}: ${r}`));
  ok(gesehen.length >= 40 && funde.length === 0, `kein deutscher Rest in der englischen Oberfläche (${gesehen.length} Ansichten und Fenster: Texte, title, aria-label, placeholder)`, funde.slice(0, 12).join(' · ') + (funde.length > 12 ? ` … (${funde.length})` : ''));
  ok(reste(['Speichern']).length === 1 && reste(['3 offen']).length === 1 && reste(['Bitte prüfen']).length === 1 && reste(['Kopf zumachen']).length === 1 && reste(['Kartofelsuppe', 'Save', '3 open', '2 EL', 'Take Kartofelsuppe off the list']).length === 0, 'Selbst-Riegel: die Suche nach Resten erkennt einen Schlüssel, ein Muster und deutsche Wörter (auch ohne Schlüssel) – und lässt Inhalt und Englisch durch');

  console.log('2 · Gerät Deutsch: Deutsch. Eine Sprache, die die App nicht kennt: Englisch');
  ({ p, k } = await seite({ ort: 'de-DE' }));
  ok(await p.evaluate(() => document.documentElement.lang) === 'de' && (await p.locator('.gruss').innerText()).startsWith('Was kochen wir heute?') && glatt(await p.locator('.fotokat button').first().innerText()) === 'Alle 4', 'Gerät Deutsch: lang="de", Begrüßung und Kategorien auf Deutsch');
  await zuEinst(p); ok((await p.locator('.gkopf').allInnerTexts()).map(glatt).join(' | ') === 'Sichern | KI-Schlüssel | Ordnung | Darstellung | Beispiele | Hilfe | Aufräumen' && await zeileText(p, '.themen [data-a=sprache]') === 'Sprache · wie das Gerät' && await p.locator('.gruppe[data-g=aussehen] [data-a=sprache]').count() === 1, 'Einstellungen auf Deutsch; unter Darstellung steht „Sprache · wie das Gerät“', await zeileText(p, '.themen [data-a=sprache]'));
  await k.close();
  ({ p, k } = await seite({ ort: 'de-DE', bestand: null, start: ORT, alt: { mrz9m: JSON.stringify([{ id: 1, name: 'Linsensuppe', cat: 'suppe', ings: [], steps: [] }]), mlang9m: 'en' } }));
  ok(await p.evaluate(() => document.documentElement.lang) === 'en' && (await p.locator('.gruss').innerText()).startsWith('What are we cooking today?') && (await p.locator('.karte strong').allInnerTexts()).includes('Linsensuppe'), 'wer in der bisherigen App eine Sprache gewählt hatte, bekommt sie mit den Rezepten übernommen'); await k.close();
  ({ p, k } = await seite({ ort: 'ja-JP' })); ok(await p.evaluate(() => document.documentElement.lang) === 'en' && (await p.locator('.gruss').innerText()).startsWith('What are we cooking today?'), 'Gerät Japanisch (kennt die App nicht): Englisch'); await k.close();

  console.log('3 · Sprachmenü: neun Möglichkeiten, die Wahl wirkt sofort und bleibt');
  ({ p, k } = await seite({ ort: 'de-DE' })); await zuEinst(p); await p.click('.themen [data-a=sprache]'); await p.waitForSelector('#sprach-wahl');
  const wahl = await p.locator('#sprach-wahl .zeile').evaluateAll((l) => l.map((b) => [b.dataset.s, b.innerText.trim(), b.getAttribute('aria-checked')]));
  ok(wahl.length === 9 && wahl.map((w) => w[1]).join(' | ') === 'wie das Gerät | Deutsch | English | Español | Français | Italiano | Português | Русский | 中文', '„wie das Gerät“ und acht Sprachen in ihrem Eigennamen', wahl.map((w) => w[1]).join(' | '));
  ok(wahl.filter((w) => w[2] === 'true').map((w) => w[0]).join() === '' && wahl.filter((w) => w[2] === 'true').length === 1 && await p.locator('.fenster p').count() === 0, 'markiert ist die geltende Wahl („wie das Gerät“); kein Erklärtext');
  await p.click('#sprach-wahl [data-s=en]'); await p.waitForFunction(() => document.querySelector('.ueber h2')?.innerText === 'Settings');
  ok(await p.locator('.fenster').count() === 0 && await p.evaluate(() => document.documentElement.lang) === 'en' && await zeileText(p, '.themen [data-a=sprache]') === 'Language · English' && await p.getAttribute('#kopf [data-a=neu]', 'aria-label') === 'New recipe' && await p.getAttribute('#leiste .fl-griff', 'aria-label').then((t) => t.startsWith('Open bar')), 'die Wahl wirkt sofort: Ansicht, Kopf und Leiste sind Englisch, das Fenster ist zu', await zeileText(p, '.themen [data-a=sprache]'));
  let ges = await bisGespeichert(p, (g) => g.einstellungen.sprache === 'en'); ok(ges.einstellungen.sprache === 'en', 'die Wahl steht bei den Einstellungen im Speicher');
  await p.reload(); await p.waitForSelector('.gruss'); ok((await p.locator('.gruss').innerText()).startsWith('What are we cooking today?') && await p.evaluate(() => document.documentElement.lang) === 'en', 'nach dem Neuladen gilt die gewählte Sprache, nicht die des Geräts');
  await zuEinst(p); await p.click('.themen [data-a=sprache]'); await p.waitForSelector('#sprach-wahl'); ok(await p.getAttribute('#sprach-wahl [data-s=en]', 'aria-checked') === 'true', 'im Menü ist jetzt English markiert');
  await p.click('#sprach-wahl [data-s=""]'); await p.waitForFunction(() => document.querySelector('.ueber h2')?.innerText === 'Einstellungen');
  ges = await bisGespeichert(p, (g) => !g.einstellungen.sprache); ok(!ges.einstellungen.sprache && await zeileText(p, '.themen [data-a=sprache]') === 'Sprache · wie das Gerät' && await p.evaluate(() => document.documentElement.lang) === 'de', '„wie das Gerät“ stellt zurück: wieder Deutsch, im Speicher steht keine Sprache');
  await k.close();

  console.log('4 · Tabelle einer weiteren Sprache: was sie kennt, steht in der Sprache da, der Rest englisch');
  const geholt = []; const frTab = (verzug = 0) => async (q) => { await q.route('**/neu/sprachen/fr.mjs', async (r) => { geholt.push('app'); if (verzug) await new Promise((w) => setTimeout(w, verzug)); r.fulfill({ contentType: 'text/javascript', body: "export default { 'Einstellungen': 'Réglages', 'Planer': 'Agenda', '{0} Rezepte': '{0} recettes' };" }); });
    await q.route('**/kern/sprachen/fr.mjs', (r) => { geholt.push('kern'); r.fulfill({ contentType: 'text/javascript', body: "export default { 'Hellbraun': 'Brun clair' };" }); }); };
  ({ p, k } = await seite({ ort: 'de-DE', vorher: frTab() })); ok(geholt.length === 0, 'auf Deutsch wird keine Tabelle geholt');
  await zuEinst(p); await p.click('.themen [data-a=sprache]'); await p.click('#sprach-wahl [data-s=fr]'); await p.waitForFunction(() => document.documentElement.lang === 'fr' && !document.getElementById('fensterort').innerHTML && document.querySelector('.ueber h2')?.innerText !== 'Einstellungen');
  ok(geholt.slice().sort().join() === 'app,kern', 'beim Wechsel werden beide Tabellen geholt: die des Kerns und die der App, je einmal', geholt.join());
  const frEinst = await texte(p); await leisteAuf(p); const frLeiste = (await p.locator('#leiste [role=menuitem]').allInnerTexts()).map(glatt);
  ok(glatt(await p.locator('.ueber small').innerText()) === '4 recettes' && frLeiste.includes('Agenda') && frLeiste.includes('Réglages'), 'die drei Einträge der Tabelle stehen französisch da, auch der Satz mit Zahl', frLeiste.join(' | '));
  ok(frLeiste.includes('Recipes') && frLeiste.some((t) => t.startsWith('Shopping')) && await zeileText(p, '.themen [data-a=sprache]') === 'Language · Français' && (await p.locator('.gkopf').allInnerTexts()).map(glatt).includes('Appearance'), 'der Rest steht englisch da');
  ok(glatt(await p.locator('.themen [data-a=farbe]').innerText()).includes('Brun clair · Light'), 'ein Name aus dem Kern (Farbe) kommt aus der Tabelle des Kerns', glatt(await p.locator('.themen [data-a=farbe]').innerText()));
  ok(reste(frEinst).length === 0 && await p.evaluate(() => document.documentElement.lang) === 'fr', 'nie ein deutscher Schlüssel: was die Tabelle nicht kennt, ist Englisch', reste(frEinst).slice(0, 6).join(' · '));
  await bisGespeichert(p, (g) => g.einstellungen.sprache === 'fr'); geholt.length = 0; await p.reload(); await p.waitForSelector('.gruss'); await leisteAuf(p);
  ok((await p.locator('#leiste [role=menuitem]').allInnerTexts()).map(glatt).includes('Réglages') && geholt.length === 2, 'nach dem Neuladen ist die Tabelle vor dem ersten Zeichnen da');
  await k.close(); geholt.length = 0;
  ({ p, k } = await seite({ ort: 'fr-FR', vorher: frTab(4000) })); await leisteAuf(p);
  ok((await p.locator('#leiste [role=menuitem]').allInnerTexts()).map(glatt).includes('Settings'), 'kommt die Tabelle spät, hält sie den Start nicht auf: die App steht da, vorerst englisch');
  const spaet = await p.waitForFunction(() => document.documentElement.lang === 'fr' && [...document.querySelectorAll('#leiste [role=menuitem]')].some((b) => b.innerText.includes('Réglages')), null, { timeout: 15000 }).then(() => true, () => false);
  ok(spaet, 'ist die späte Tabelle da, steht ihr Text ohne weiteres Zutun da'); await k.close();
  /* Fehlt die Tabelle einer Sprache (hier: beide spanischen Tabellen sind nicht zu holen), steht Englisch da – nie ein Schlüssel, kein Fehler. */
  ({ p, k } = await seite({ ort: 'es-ES', vorher: (q) => q.route('**/sprachen/es.mjs', (r) => r.fulfill({ status: 404, contentType: 'text/plain', body: '' })) })); await zuEinst(p);
  ok(await p.evaluate(() => document.documentElement.lang) === 'es' && (await p.locator('.ueber h2').innerText()) === 'Settings' && reste(await texte(p)).length === 0, 'eine Sprache, deren Tabelle fehlt (Spanisch): alles englisch, kein Schlüssel, kein Fehler'); await k.close();
  ({ p, k } = await seite({ ort: 'es-ES' })); await zuEinst(p);
  ok(await p.evaluate(() => document.documentElement.lang) === 'es' && (await p.locator('.ueber h2').innerText()) === 'Ajustes' && (await p.locator('.gkopf').allInnerTexts()).map(glatt).every((x) => !['Backup', 'AI keys', 'Appearance', 'Examples', 'Clean up', 'Sichern', 'Darstellung'].includes(x)), 'mit Tabelle (Spanisch) steht die Oberfläche spanisch da: weder Deutsch noch Englisch in den Themen', (await p.locator('.ueber h2').innerText()) + ' · ' + (await p.locator('.gkopf').allInnerTexts()).map(glatt).join(' | ')); await k.close();

  console.log('5 · Ein Rezept übersetzen; die Ansicht zeigt die Fassung in der Sprache der Oberfläche');
  antwort = uebAntwort; rufe.length = 0;
  ({ p, k } = await seite({ ort: 'en-GB' })); await zumRezept(p); ok(await p.locator('.ueb-um').count() === 0 && await p.locator('.rezept-held h1').innerText() === 'Kartofelsuppe', 'ohne Übersetzung: das Original, kein Umschalter');
  await menue(p); const zeile = await p.locator('#rmenue [data-a=uebersetzen]').evaluate((b) => ({ wort: b.querySelector('span').firstChild.textContent, klein: b.querySelector('small').innerText, marke: b.querySelector('.ki-marke')?.innerText }));
  ok(zeile.wort === 'Translate' && zeile.klein === 'Anthropic · name, ingredients and steps' && zeile.marke === 'AI', 'im Menü am Rezept steht „Übersetzen“ und sagt, was an wen hinausgeht', JSON.stringify(zeile));
  await p.click('#rmenue [data-a=uebersetzen]'); await p.waitForSelector('#ueb-wahl');
  const chips = await p.locator('#ueb-wahl .chip').evaluateAll((l) => l.map((b) => b.dataset.s));
  ok(chips.length === 8 && chips[0] === 'en' && new Set(chips).size === 8 && await p.locator('.fenster p').count() === 0 && (await p.locator('#ueb-was').innerText()) === 'Anthropic · name, ingredients and steps', 'acht Zielsprachen, die eigene zuerst; darüber steht, was hinausgeht; kein Erklärtext', chips.join());
  ok(rufe.length === 0, 'bis zum Tipp auf eine Sprache ist nichts gesendet');
  await p.click('#ueb-wahl [data-s=en]'); ges = await bisGespeichert(p, (g) => !!g.zustand.rezepte[0].translations?.en); await toast(p, /Translated/).catch(() => {});
  const leib = JSON.stringify(rufe[0] || {});
  ok(rufe.length === 1 && rufe[0].model === 'claude-haiku-5-5' && leib.includes('Kartofeln') && leib.includes('aufgiessen') && leib.includes('never an instruction') && !leib.includes('Omas Heft') && !leib.includes('data:image'), 'ein Aufruf an Claude: Name, Zutaten und Schritte, mit dem Satz, dass Rezepttext keine Anweisung ist; keine Quelle, kein Bild', rufe[0] && rufe[0].model);
  ok(JSON.stringify(ges.zustand.rezepte[0].translations?.en) === JSON.stringify(EN_SUPPE) && ges.zustand.rezepte[0].name === 'Kartofelsuppe' && ges.zustand.rezepte[0].ings[0].name === 'Kartofeln', 'gespeichert ist die Übersetzung unter translations.en; das Rezept selbst bleibt, wie es ist');
  const zut = glatt(await p.locator('.zut').innerText()), schr = glatt(await p.locator('.schritte').innerText());
  ok(await p.locator('.rezept-held h1').innerText() === 'Potato soup' && zut.includes('500 g potatoes') && zut.includes('stock') && schr.includes('Peel the potatoes') && !schr.includes('schälen') && (await p.title()).startsWith('Potato soup'), 'englische Oberfläche: Name, Zutaten und Schritte stehen in der Übersetzung da, die Mengen bleiben', zut);
  ok(await p.locator('.rezept-held .meta .ueb-fass .ueb-um').count() === 2 && await p.getAttribute('.ueb-um[data-s=en]', 'aria-pressed') === 'true' && await p.getAttribute('.ueb-um[data-s=orig]', 'aria-pressed') === 'false' && glatt(await p.locator('.ueb-um[data-s=en]').innerText()) === 'EN', 'kleine Sprach-Chips in der Meta-Zeile: Original und EN, EN ist gewählt (keine eigene Zeile)');
  await p.click('.ueb-um[data-s=orig]'); await p.waitForFunction(() => document.querySelector('.ueb-um[data-s=orig]')?.getAttribute('aria-pressed') === 'true', null, { timeout: 5000 }).catch(() => {});
  ok(await p.locator('.rezept-held h1').innerText() === 'Kartofelsuppe' && glatt(await p.locator('.schritte').innerText()).includes('schälen'), 'der Chip „Original“ zeigt das Original');
  await p.click('.ueb-um[data-s=en]'); await p.waitForFunction(() => document.querySelector('.rezept-held h1')?.innerText === 'Potato soup'); ok(true, 'der Chip EN zeigt wieder die Übersetzung');
  await geh(p, 'start', '.fotokat'); ok((await p.locator('.karte strong').allInnerTexts()).includes('Potato soup'), 'auch die Karte in der Liste trägt den übersetzten Namen');
  const such = async (wort) => { await p.fill('#suchfeld', wort); await p.waitForSelector('.ueber h2'); const n = await p.locator('#start-rest .karte').count(); await p.fill('#suchfeld', ''); return n; };
  ok(await such('potato') === 1 && await such('kartof') === 1 && await such('stock') === 1, 'die Suche findet das Rezept unter dem, was dasteht, und unter dem Original');
  await zuEinst(p); const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.themen [data-a=sichern]')]); const sich = JSON.parse(await readFile(await dl.path(), 'utf8'));
  ok(JSON.stringify(sich.recipes.find((r) => r.uid === 'r-probe-1')?.translations?.en) === JSON.stringify(EN_SUPPE), 'die Übersetzung kommt in die Sicherung als Datei mit');
  await p.reload(); await p.waitForSelector('.karte'); await zumRezept(p, 'Potato soup'); ok(await p.locator('.rezept-held h1').innerText() === 'Potato soup', 'nach dem Neuladen steht die Übersetzung wieder da');
  await menue(p); await p.click('#rmenue [data-a=uebersetzen]'); await p.waitForSelector('#ueb-wahl');
  ok(await p.locator('#ueb-wahl [data-s=en] svg').count() === 1 && await p.locator('#ueb-wahl [data-s=fr] svg').count() === 0, 'im Fenster trägt die schon übersetzte Sprache einen Haken'); await zu(p);
  if (!(await p.locator('.rwerk').count())) await p.click('[data-a=rleiste]'); await p.click('.rwerk [data-a=bearbeiten]'); await p.waitForSelector('[data-form=rezept]');
  ok(await p.inputValue('[name=name]') === 'Potato soup', 'bearbeitet wird die angezeigte Fassung, hier die englische Übersetzung (Klaus 25.11.)');
  await p.fill('[name=servings]', '6'); await p.click('[data-form=rezept] button[type=submit]'); await p.waitForSelector('.rezept-held h1');
  ges = await bisGespeichert(p, (g) => g.zustand.rezepte[0].servings === 6); ok(ges.zustand.rezepte[0].servings === 6 && !!ges.zustand.rezepte[0].translations?.en && JSON.stringify(ges.zustand.rezepte[0].ings.map(({ amt, unit, name }) => [amt, unit, name])) === JSON.stringify(SUPPE.ings.map(({ amt, unit, name }) => [amt, unit, name])) && await p.locator('.rezept-held h1').innerText() === 'Potato soup', 'nur die Portionen geändert: die Übersetzung bleibt, und Name, Zutaten und Schritte bleiben genau, wie sie waren (nichts wird neu zerlegt)', JSON.stringify(ges.zustand.rezepte[0].ings[3]));
  await p.click('.ueb-um[data-s=orig]'); await p.waitForFunction(() => document.querySelector('.rezept-held h1')?.textContent === 'Kartofelsuppe');   /* das Original zeigen, dann das Original bearbeiten */
  if (!(await p.locator('.rwerk').count())) await p.click('[data-a=rleiste]'); await p.click('.rwerk [data-a=bearbeiten]'); await p.waitForSelector('[data-form=rezept]');
  await p.fill('[name=name]', 'Kartoffelsuppe'); await p.click('[data-form=rezept] button[type=submit]'); await p.waitForSelector('.rezept-held h1');
  ges = await bisGespeichert(p, (g) => g.zustand.rezepte[0].name === 'Kartoffelsuppe'); ok(!ges.zustand.rezepte[0].translations && await p.locator('.rezept-held h1').innerText() === 'Kartoffelsuppe' && await p.locator('.ueb-um').count() === 0, 'ändert sich der Text des Rezepts, fällt die Übersetzung weg: es steht nicht der alte Text da');
  await k.close();
  ({ p, k } = await seite({ ort: 'de-DE', bestand: { ...BESTAND, rezepte: [{ ...SUPPE, translations: { en: EN_SUPPE } }, KUCHEN] } })); await zumRezept(p);
  ok(await p.locator('.rezept-held h1').innerText() === 'Kartofelsuppe' && await p.getAttribute('.ueb-um[data-s=orig]', 'aria-pressed') === 'true', 'deutsche Oberfläche: zuerst steht das Original da');
  await p.click('.ueb-um[data-s=en]'); await p.waitForFunction(() => document.querySelector('.rezept-held h1')?.innerText === 'Potato soup', null, { timeout: 5000 }).catch(() => {});
  ok(await p.locator('.rezept-held h1').innerText() === 'Potato soup', 'Klaus 25.11.: eine Übersetzung in einer anderen Sprache als der Oberfläche ist trotzdem zu sehen – ein Tipp auf EN zeigt sie'); await k.close();

  console.log('6 · Ohne Schlüssel fragt die App danach; nichts geht hinaus');
  rufe.length = 0; ({ p, k } = await seite({ ort: 'de-DE', schluessel: {} })); await zumRezept(p); await menue(p); await p.click('#rmenue [data-a=uebersetzen]');
  ok(await p.locator('[data-form=schluessel][data-anbieter=anthropic]').count() === 1 && await p.locator('#ueb-wahl').count() === 0 && rufe.length === 0, 'Übersetzen ohne Anthropic-Schlüssel: das Schlüssel-Fenster kommt, nichts geht hinaus');
  await p.fill('#schl-feld', 'sk-ant-probe-111111111111111111'); await p.click('[data-form=schluessel] button[type=submit]'); await p.waitForSelector('#ueb-wahl'); ok(rufe.length === 0, 'nach dem Speichern geht es gleich mit dem Übersetzen weiter (ein Schritt weniger); gesendet ist weiter nichts'); await k.close();
  ({ p, k } = await seite({ ort: 'de-DE', schluessel: {} })); await zuEinst(p); await p.click('.themen [data-a=alle-uebersetzen]');
  ok(await p.locator('[data-form=schluessel][data-anbieter=anthropic]').count() === 1 && await p.locator('#alle-ueb-wahl').count() === 0, '„Alle übersetzen“ ohne Schlüssel: das Schlüssel-Fenster kommt');
  await p.fill('#schl-feld', 'sk-ant-probe-111111111111111111'); await p.click('[data-form=schluessel] button[type=submit]'); await p.waitForSelector('#alle-ueb-wahl'); ok(rufe.length === 0, 'nach dem Speichern geht es bei „Alle übersetzen“ weiter; gesendet ist nichts'); await k.close();

  console.log('7 · Alle übersetzen: Kostenhinweis vor dem Start, ein Fehlschlag hält den Rest nicht auf');
  const schon = { ...SUPPE, translations: { en: EN_SUPPE } }, bestand7 = { ...BESTAND, rezepte: [schon, KUCHEN, LOSE, ROLLE] }; rufe.length = 0;
  antwort = (leib, nr) => (/^Name: Gurkensalat$/m.test(leib.messages[0].content) ? { status: 500 } : uebAntwort(leib));
  ({ p, k } = await seite({ ort: 'de-DE', bestand: bestand7, einst: { scan: { anbieter: 'anthropic', stufe: 'profi' } } })); await zuEinst(p);
  const reihe = await p.locator('.themen [data-a=alle-uebersetzen]').evaluate((b) => ({ gruppe: b.closest('.gruppe').dataset.g, klein: b.querySelector('small').innerText, marke: b.querySelector('.ki-marke')?.innerText }));
  ok(reihe.gruppe === 'ki' && reihe.klein === 'Anthropic · Name, Zutaten und Schritte' && reihe.marke === 'KI', '„Alle übersetzen“ steht bei den KI-Dingen und sagt, was an wen hinausgeht', JSON.stringify(reihe));
  await p.click('.themen [data-a=alle-uebersetzen]'); await p.waitForSelector('#alle-ueb-wahl');
  ok(await p.locator('#alle-ueb-wahl .chip').count() === 8 && await p.locator('#alle-ueb-wahl [aria-checked=true]').count() === 0 && await p.locator('[data-a=alle-ueb-los]').count() === 0 && await p.locator('.fenster p').count() === 0, 'zuerst die Zielsprache: acht Sprachen, noch nichts gewählt, kein Knopf, kein Erklärtext');
  await p.click('#alle-ueb-wahl [data-s=en]'); await p.waitForSelector('#alle-ueb-was');
  const k3 = kostenSchaetzung([KUCHEN, LOSE, ROLLE], ['en'], 'profi', 'de'), preis = k3.usd < 0.01 ? 'unter 0,01 $' : `etwa ${k3.usd.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
  const was = glatt(await p.locator('#alle-ueb-was').innerText());
  ok(was === `3 Rezepte · ${preis} · Anthropic` && k3.usd >= 0.01, 'vor dem Start steht im Knopf: die Zahl der Rezepte ohne diese Übersetzung und die geschätzten Kosten (wie der Kern sie rechnet)', `${was} | erwartet: 3 Rezepte · ${preis} · Anthropic`);
  ok(rufe.length === 0 && await p.locator('.fenster').count() === 1, 'es ist EIN Fenster, und bis zum Tipp auf „Übersetzen“ ist nichts gesendet');
  await p.click('[data-a=alle-ueb-los]'); await toast(p, /übersetzt/);
  const ende = glatt(await p.locator('#toast').innerText());
  ok(ende === '2 übersetzt · 1 nicht', 'am Ende eine kurze Meldung: „2 übersetzt · 1 nicht“', ende);
  ok(rufe.length === 3 && rufe.every((r) => r.model === 'claude-opus-5-5') && !rufe.some((r) => /^Name: Kartofelsuppe$/m.test(r.messages[0].content)), 'drei Aufrufe (einer je Rezept ohne Übersetzung) auf der gewählten Stufe; das schon übersetzte Rezept wird übersprungen', rufe.map((r) => /^Name: (.*)$/m.exec(r.messages[0].content)?.[1]).join());
  ges = await bisGespeichert(p, (g) => !!g.zustand.rezepte[3].translations?.en); const hat = ges.zustand.rezepte.map((r) => !!r.translations?.en).join();
  ok(hat === 'true,true,false,true' && ges.zustand.rezepte[1].translations.en.name === 'en:Apfelkuchen', 'ein Fehlschlag hält den Rest nicht auf: die Rezepte davor und danach sind übersetzt, das fehlgeschlagene nicht', hat);
  ok(await p.locator('.fenster').count() === 0, 'das Fenster ist zu');
  antwort = uebAntwort; await p.click('.themen [data-a=alle-uebersetzen]'); await p.click('#alle-ueb-wahl [data-s=en]'); await p.waitForSelector('#alle-ueb-was');
  ok(glatt(await p.locator('#alle-ueb-was').innerText()).startsWith('1 Rezept · '), 'beim zweiten Mal bleibt nur das eine, das fehlte');
  rufe.length = 0; await p.click('[data-a=alle-ueb-los]'); await toast(p, /1 übersetzt/); ok(rufe.length === 1, 'schon Übersetzte werden übersprungen: ein Aufruf');
  await bisGespeichert(p, (g) => !!g.zustand.rezepte[2].translations?.en);
  await p.click('.themen [data-a=alle-uebersetzen]'); await p.click('#alle-ueb-wahl [data-s=en]'); await p.waitForSelector('#alle-ueb-fertig');
  ok(await p.locator('[data-a=alle-ueb-los]').count() === 0 && glatt(await p.locator('#alle-ueb-fertig').innerText()) === 'Alle schon übersetzt', 'ist alles übersetzt, gibt es nichts zu senden'); await k.close();

  console.log('8 · Alle übersetzen lässt sich abbrechen');
  let los = null; const haengt = new Promise((w) => { los = w; }); rufe.length = 0;
  antwort = async (leib, nr) => { if (nr >= 2) await haengt; return uebAntwort(leib); };
  ({ p, k } = await seite({ ort: 'de-DE', bestand: { ...BESTAND, rezepte: [KUCHEN, LOSE, ROLLE] } })); await zuEinst(p);
  await p.click('.themen [data-a=alle-uebersetzen]'); await p.click('#alle-ueb-wahl [data-s=fr]'); await p.waitForSelector('#alle-ueb-was'); await p.click('[data-a=alle-ueb-los]');
  await p.waitForSelector('#alle-ueb-stopp'); ok(glatt(await p.locator('.fenster h2').innerText()) === 'Français' && glatt(await p.locator('#alle-ueb-stopp').innerText()) === 'Abbrechen', 'während es läuft, steht ein Fenster mit „Abbrechen“ da');
  ges = await bisGespeichert(p, (g) => !!g.zustand.rezepte[0].translations?.fr);
  await p.waitForFunction(() => /2/.test(document.querySelector('#warten-zeile.an span')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});   /* der Balken erscheint erst nach einem Augenblick */
  const stand = glatt(await p.evaluate(() => document.querySelector('#warten-zeile span')?.textContent || ''));
  ok(rufe.length === 2 && /Rezept 2 von 3: Gurkensalat/.test(stand) && await p.locator('#warten-balken.an').count() === 1, 'der Ladebalken zeigt, wie weit es ist', stand);
  await p.click('#alle-ueb-stopp'); await toast(p, /abgebrochen/).catch(() => {});
  ok(glatt(await p.locator('#toast').innerText()) === '1 übersetzt · abgebrochen' && await p.locator('.fenster').count() === 0, 'Abbrechen hört auf: „1 übersetzt · abgebrochen“', glatt(await p.locator('#toast').innerText()));
  los(); ges = await gespeichert(p); ok(rufe.length === 2 && ges.zustand.rezepte.map((r) => !!r.translations?.fr).join() === 'true,false,false', 'nach dem Abbrechen folgt kein Aufruf mehr; was fertig war, bleibt', `${rufe.length} Aufrufe · ${ges.zustand.rezepte.map((r) => !!r.translations?.fr).join()}`);
  await k.close();
  ok(fehler.length === 0, 'keine Fehler in der Konsole, kein Netz nach draußen', fehler.join(' · '));
} catch (e) { rot++; console.log('  ✗ ROT: Probe abgebrochen — ' + e.message.split('\n')[0]); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0;
