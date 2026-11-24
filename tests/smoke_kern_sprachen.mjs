// Probe der Sprachtabellen des Kerns im echten Browser: die sechs Tabellen laden als Modul, text() liefert ihre Einträge,
// und die Texte kommen heil im HTML an (auch im Attribut des Schrift-Reglers). Aufruf: node tests/smoke_kern_sprachen.mjs
// WURZEL=<Pfad> misst eine Kopie. Die Schlüssel selbst (keiner fehlt, keiner überzählig) prüft test/kern-sprachen.test.js.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join, resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const WURZEL = resolve(process.env.WURZEL || process.cwd());
const { sammle, SPRACHEN } = await import(pathToFileURL(join(WURZEL, 'kern/sprachen/schluessel.mjs')).href);
const PAARE = sammle().paare, ZAHL = Object.keys(PAARE).length;
const TYP = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const abrufe = [];
const srv = http.createServer(async (q, a) => { const p = decodeURIComponent(q.url.split('?')[0]); abrufe.push(p); try { const d = await readFile(join(WURZEL, p)); a.writeHead(200, { 'content-type': TYP[extname(p)] || 'application/octet-stream' }); a.end(d); } catch { a.writeHead(404); a.end(); } }).listen(0);
const BASIS = `http://localhost:${srv.address().port}`;
let gruen = 0, rot = 0; const ok = (b, t, mehr = '') => { if (b) { gruen++; console.log('  ✓ ' + t); } else { rot++; console.log('  ✗ ROT: ' + t + (mehr ? ' — ' + mehr : '')); } };
const browser = await chromium.launch(); const fehler = [];
try {
  const k = await browser.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block', locale: 'de-DE' }), p = await k.newPage();
  p.on('pageerror', (e) => fehler.push(e.message)); p.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
  await p.route(/^https?:\/\/(?!localhost)/, (r) => { fehler.push('Netz nach draußen: ' + r.request().url()); r.abort(); });
  await p.goto(BASIS + '/neu/app.css');   /* eine Seite derselben Herkunft, ohne dass die App startet */

  console.log('1 · Die sechs Tabellen laden im Browser');
  const vorher = await p.evaluate(async () => { const s = await import('/kern/oberflaeche/sprache.mjs'); return s.text('fr', 'Zutaten', 'Ingredients'); });
  ok(vorher === 'Ingredients', 'vor dem Laden steht Englisch da', vorher);
  const geladen = await p.evaluate(async (codes) => { const s = await import('/kern/oberflaeche/sprache.mjs'), aus = {};
    /* die Adresse zählt ab sprache.mjs (dort steht import()): ../sprachen/<code>.mjs */
    for (const c of codes) aus[c] = { da: await s.ladeTabelle(c, [`../sprachen/${c}.mjs`]), zahl: Object.keys(s.tabelleVon(c)).length };
    return aus; }, SPRACHEN);
  for (const c of SPRACHEN) ok(geladen[c].da === true && geladen[c].zahl === ZAHL, `${c}: ladeTabelle lädt die Tabelle, so viele Einträge wie der Kern Schlüssel hat`, JSON.stringify(geladen[c]) + ' · Kern: ' + ZAHL);
  ok(SPRACHEN.every((c) => abrufe.includes(`/kern/sprachen/${c}.mjs`)), 'abgerufen wurde kern/sprachen/<code>.mjs (die relative Adresse zählt ab sprache.mjs)', abrufe.filter((a) => a.includes('sprachen')).join(' '));
  const fehlt = await p.evaluate(async () => { const s = await import('/kern/oberflaeche/sprache.mjs'); return [await s.ladeTabelle('fr', ['../sprachen/gibtsnicht.mjs']), await s.ladeTabelle('de', ['../sprachen/fr.mjs']), s.text('fr', 'Diesen Satz gibt es nicht.', 'No such sentence.')]; });
  ok(fehlt[0] === false && fehlt[1] === false && fehlt[2] === 'No such sentence.', 'eine fehlende Tabelle wirft nicht; Deutsch lädt keine; ohne Eintrag Englisch', JSON.stringify(fehlt));
  ok(fehler.length === 1 && /404/.test(fehler[0]), 'bis hierher meldet die Konsole nur die eine Datei, die es mit Absicht nicht gibt (404)', fehler.join(' · ')); fehler.length = 0;

  console.log('2 · text() liefert in jeder Sprache jeden Eintrag');
  const falsch = await p.evaluate(async ([paare, codes]) => { const s = await import('/kern/oberflaeche/sprache.mjs'), aus = [];
    for (const c of codes) { const t = s.tabelleVon(c); for (const [de, en] of Object.entries(paare)) { const v = s.text(c, de, en); if (typeof v !== 'string' || !v.trim() || v !== t[de] || (v === de && !['Standard', 'Liste', 'Collage', 'Retro'].includes(de))) aus.push(c + ': ' + de); } }
    return aus; }, [PAARE, SPRACHEN]);
  ok(falsch.length === 0, `${ZAHL} Schlüssel × ${SPRACHEN.length} Sprachen: jeder kommt aus der Tabelle, keiner bleibt deutsch`, falsch.slice(0, 4).join(' · '));

  console.log('3 · Die Texte kommen heil im HTML an');
  const html = await p.evaluate(async (codes) => {
    const s = await import('/kern/oberflaeche/sprache.mjs'), { schriftRegler } = await import('/kern/oberflaeche/schrift.mjs'), { farbName, tonName } = await import('/kern/oberflaeche/farben.mjs');
    const { pruefHtml } = await import('/kern/pruefung/datei.mjs'), { haltHtml } = await import('/kern/ki/reinigung.mjs'), { druckRezept } = await import('/kern/ausgabe/druck.mjs'), aus = {};
    for (const c of codes) { const t = s.tabelleVon(c), d = document.createElement('div');
      d.innerHTML = schriftRegler(100, c) + pruefHtml({ stand: 'ungeprueft', funde: [{ kennung: 'ANHANG-PROGRAMM', satz: 'x' }], schritte: ['a'], hinweise: [] }, c) + haltHtml('Oma.pdf', [{ grund: 'winzig', seite: 2, text: 'abc' }], c);
      const druck = new DOMParser().parseFromString(druckRezept({ name: 'Suppe', servings: 4, ings: [{ amt: '1', unit: 'l', name: 'Wasser' }], steps: [{ txt: 'Kochen.' }] }, { sprache: c, datum: null }), 'text/html');
      aus[c] = { regler: d.querySelector('#schriftregler').getAttribute('aria-label') === t['Schriftgröße in Prozent'] && d.querySelectorAll('input').length === 1,
        stand: d.querySelector('[data-pruef-stand]').textContent === t['Nicht vollständig geprüft (heißt nicht „sauber“)'], fund: d.querySelector('[data-pruef-funde] li').textContent === t['Das ist ein Programm'],
        halt: d.querySelector('[data-ki-halt] summary').textContent === t['1 versteckte Stelle geht nicht mit'] && d.querySelector('[data-ki-halt] p').textContent === t['In „{0}“ steht Text, den man auf der Seite nicht sieht. Eine KI würde ihn lesen. Gesendet wird die Fassung ohne ihn; die Datei bleibt unverändert.'].replace('{0}', 'Oma.pdf'),
        druck: [...druck.querySelectorAll('h2')].map((h) => h.textContent).join('|') === t.Zutaten + '|' + t.Zubereitung && druck.documentElement.lang === c,
        farbe: farbName('flieder', c) === t.Flieder && tonName('geraet', c) === t['Wie das Gerät'] };
    }
    return aus; }, SPRACHEN);
  for (const c of SPRACHEN) ok(Object.values(html[c]).every(Boolean), `${c}: Schrift-Regler (Attribut), Prüf-Ergebnis, Halt-Hinweis, Druckblatt und Farbname tragen den Text der Tabelle`, JSON.stringify(html[c]));
  await k.close();
  ok(fehler.length === 0, 'keine Fehler in der Konsole, kein Netz nach draußen', fehler.join(' · '));
} catch (e) { rot++; console.log('  ✗ ROT: Probe abgebrochen — ' + e.message.split('\n')[0]); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0;
