// Probe der neuen PWA: „Gerade ziehen & verbessern“ (Klaus 28.11.2026) – vier Ecken auf das Blatt, Perspektive gerade ziehen,
// Helligkeit, Kontrast, Farbe, Schärfe. Echter Browser, gestelltes Foto (schräges Blatt auf Holztisch), kein Netz.
// Aufruf: node tests/smoke_neu_blatt.mjs   (WURZEL=<Pfad> misst eine Kopie). Läuft gleich in Mein Mixarium (APP=mixarium).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join } from 'node:path';
const WURZEL = process.env.WURZEL || process.cwd();
const TYP = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const srv = http.createServer(async (q, a) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; try { const d = await readFile(join(WURZEL, p)); a.writeHead(200, { 'content-type': TYP[extname(p)] || 'application/octet-stream' }); a.end(d); } catch { a.writeHead(404); a.end(); } }).listen(0);
const ORT = `http://localhost:${srv.address().port}/neu/`;
let gruen = 0, rot = 0; const ok = (b, t, mehr = '') => { if (b) { gruen++; console.log('  ✓ ' + t); } else { rot++; console.log('  ✗ ROT: ' + t + (mehr ? ' — ' + mehr : '')); } };
const browser = await chromium.launch(); const fehler = [];
const abbruch = async (e) => { rot++; console.log('  ✗ ROT: Absturz — ' + String(e?.message || e).split('\n')[0]); try { await browser.close(); } catch { /* zu */ } srv.close(); console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = 1; };
process.on('unhandledRejection', abbruch);

/* Das gestellte Foto: 800 × 640, Holztisch, darauf ein helles Blatt als schräges Viereck mit „Schrift“ */
const Q = [[150, 90], [640, 130], [610, 560], [110, 520]];
const bk = await browser.newContext(), bp = await bk.newPage(); await bp.goto(ORT + 'app.css');
const FOTO = await bp.evaluate((Q) => { const c = document.createElement('canvas'); c.width = 800; c.height = 640; const g = c.getContext('2d');
  for (let y = 0; y < 640; y += 4) for (let x = 0; x < 800; x += 4) { const n = ((x * 7 + y * 13) % 40); g.fillStyle = `rgb(${110 + n},${70 + n * 0.6},${40 + n * 0.3})`; g.fillRect(x, y, 4, 4); }
  g.fillStyle = '#ececec'; g.beginPath(); Q.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath(); g.fill();
  /* „Schrift“ liegt auf dem Blatt, also mit seiner Perspektive: Zeilen zwischen den Kanten links und rechts */
  const auf = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  g.strokeStyle = '#333'; g.lineWidth = 5; for (let i = 0; i < 12; i++) { const t = 0.14 + i * 0.062, l = auf(Q[0], Q[3], t), r = auf(Q[1], Q[2], t), a = auf(l, r, 0.12), e = auf(l, r, 0.85); g.beginPath(); g.moveTo(...a); g.lineTo(...e); g.stroke(); }
  return c.toDataURL('image/png'); }, Q);
await bk.close();
const R = { uid: 'r-1', id: 1, name: 'Fenchel in Dill-Sahnesauce', cat: 'gemuese', servings: 4, ings: [{ amt: '2', unit: 'Stück', name: 'Fenchel', note: '' }], steps: [{ txt: 'Fenchel garen.' }], img: FOTO, created: '2026-11-01T10:00:00.000Z', modified: '2026-11-01T10:00:00.000Z' };

async function seite(breite, hoehe = 860) {
  const k = await browser.newContext({ viewport: { width: breite, height: hoehe }, serviceWorkers: 'block', locale: 'de-DE' }), p = await k.newPage();
  p.on('pageerror', (e) => fehler.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && fehler.push(m.text()));
  await p.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await p.goto(ORT + 'app.css');
  await p.evaluate((rezepte) => new Promise((ja, nein) => { const a = indexedDB.open('KuechenKern-rezeptbuch', 1); a.onupgradeneeded = () => a.result.createObjectStore('zustand'); a.onerror = () => nein(a.error); a.onsuccess = () => { const t = a.result.transaction('zustand', 'readwrite'); t.objectStore('zustand').put({ fassung: 1, einstellungen: { ton: 'hell' }, zustand: { rezepte, ordner: [], menu: [], kategorien: {}, plan: {} } }, 'alles'); t.oncomplete = () => { a.result.close(); ja(); }; }; }), [R]);
  await p.goto(ORT + '?leer'); await p.waitForSelector('.karte');
  await p.locator('.karte').first().click(); await p.waitForSelector('.rezept-held>img');
  return { p, k };
}
const bildVon = (p) => p.evaluate(() => document.querySelector('.rezept-held>img')?.getAttribute('src') || '');
const oeffnen = async (p) => {
  const b = await p.locator('.rezept-held>img').boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await p.waitForSelector('.bildvoll');
  await p.click('.bv-werk [data-w=blatt-gerade]'); await p.waitForSelector('[data-bt-fenster] [data-bt-ecke]'); await p.waitForFunction(() => +document.querySelector('[data-bt-bild]')?.dataset.breite > 0);
};
const ecken = (p) => p.evaluate(() => [...document.querySelectorAll('[data-bt-ecke]')].map((k) => [parseFloat(k.style.left) / 100, parseFloat(k.style.top) / 100]));

try {
  { const { p, k } = await seite(412);
    console.log('Handy (412 px)');
    await p.locator('.rezept-held>img').click(); await p.waitForSelector('.bildvoll');
    ok(await p.locator('.bv-werk [data-w=blatt-gerade]').count() === 1, '„Bild anpassen“ trägt das Werkzeug „Gerade ziehen & verbessern“');
    await p.click('.bv-werk [data-w=blatt-gerade]'); await p.waitForSelector('[data-bt-fenster] [data-bt-ecke]'); await p.waitForFunction(() => +document.querySelector('[data-bt-bild]')?.dataset.breite > 0);
    const befund = await p.locator('[data-bt-befund]').innerText();
    ok(/Blatt gefunden/.test(befund), 'das Blatt wird von selbst gefunden und das wird gesagt', befund);
    const e0 = await ecken(p), soll = Q.map(([x, y]) => [x / 800, y / 640]), fehl = Math.max(...e0.map((q, i) => Math.hypot(q[0] - soll[i][0], q[1] - soll[i][1])));
    ok(fehl < 0.03, 'die vier Punkte liegen auf den Blattecken (höchstens 3 % daneben)', fehl.toFixed(3));
    const lage = await p.evaluate(() => { const b = document.querySelector('[data-bt-fenster]'); return { quer: document.documentElement.scrollWidth > innerWidth + 1, fuss: document.querySelector('[data-bt="ok"]').getBoundingClientRect().bottom <= innerHeight + 1 || b.scrollHeight > b.clientHeight }; });
    ok(!lage.quer, 'am Handy läuft nichts quer über den Rand', JSON.stringify(lage));
    // eine Ecke von Hand ziehen
    const k0 = await p.locator('[data-bt-ecke="0"]').boundingBox(); await p.mouse.move(k0.x + k0.width / 2, k0.y + k0.height / 2); await p.mouse.down(); await p.mouse.move(k0.x + 40, k0.y + 30, { steps: 5 }); await p.mouse.up();
    const e1 = await ecken(p);
    ok(Math.hypot(e1[0][0] - e0[0][0], e1[0][1] - e0[0][1]) > 0.03 && /von Hand/.test(await p.locator('[data-bt-befund]').innerText()), 'eine Ecke lässt sich mit dem Finger ziehen, und das steht dabei');
    await p.click('[data-bt="finden"]');
    ok(Math.max(...(await ecken(p)).map((q, i) => Math.hypot(q[0] - e0[i][0], q[1] - e0[i][1]))) < 0.005, '„Ecken finden“ setzt sie wieder auf das Blatt');
    // Ergebnis
    await p.click('[data-bt="modus"][data-m="ergebnis"]'); await p.waitForSelector('[data-bt-regler="schaerfe"]'); await p.waitForTimeout(200);
    const reg = await p.evaluate(() => [...document.querySelectorAll('[data-bt-regler]')].map((r) => r.dataset.btRegler));
    ok(reg.join() === 'hell,kontrast,farbe,schaerfe', 'Ergebnis: vier Regler – Helligkeit, Kontrast, Farbe, Schärfe', reg.join());
    const farbeMax = await p.getAttribute('[data-bt-regler="farbe"]', 'max');
    ok(+farbeMax <= 40, 'Farbe nur wenig (höchstens 40)', farbeMax);
    const vor = await p.evaluate(() => { const c = document.querySelector('[data-bt-bild]'); return { w: c.width, h: c.height, ecke: [...c.getContext('2d').getImageData(4, 4, 1, 1).data].slice(0, 3) }; });
    ok(Math.abs(vor.w / vor.h - 495 / 430) < 0.06, 'die Vorschau ist gerade gezogen: Seitenverhältnis des Blatts, nicht des Fotos', `${vor.w}×${vor.h}`);
    ok(vor.ecke.every((v) => v > 200), 'in der Ecke der Vorschau ist Papier, kein Tisch mehr', vor.ecke.join());
    const hell0 = await p.evaluate(() => { const c = document.querySelector('[data-bt-bild]'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i]; return s / (d.length / 4); });
    await p.evaluate(() => { const r = document.querySelector('[data-bt-regler="hell"]'); r.value = '-40'; r.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(250);
    const hell1 = await p.evaluate(() => { const c = document.querySelector('[data-bt-bild]'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i]; return s / (d.length / 4); });
    ok(hell1 < hell0 - 20 && await p.locator('[data-bt-wert="hell"]').innerText() === '-40', 'der Regler wirkt sofort in der Vorschau und zeigt seinen Wert', `${hell0.toFixed(0)} → ${hell1.toFixed(0)}`);
    await p.click('[data-bt="null"]'); await p.waitForTimeout(150);
    ok(await p.inputValue('[data-bt-regler="hell"]') === '0', '„Zurücksetzen“ stellt die Regler auf 0');
    const vorher = await bildVon(p);
    await p.click('[data-bt="ok"]'); await p.waitForSelector('[data-bt-fenster]', { state: 'detached' }); await p.waitForTimeout(400);
    const nach = await bildVon(p);
    ok(nach && nach !== vorher, 'Übernehmen ersetzt das Rezeptbild');
    const neu = await p.evaluate((u) => new Promise((ja) => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const g = c.getContext('2d'); g.drawImage(i, 0, 0); ja({ w: c.width, h: c.height, ecke: [...g.getImageData(5, 5, 1, 1).data].slice(0, 3) }); }; i.onerror = () => ja(null); i.src = u; }), nach);
    ok(neu && Math.abs(neu.w / neu.h - 495 / 430) < 0.05 && neu.ecke.every((v) => v > 200), 'das neue Bild ist das gerade gezogene Blatt (ohne Tisch)', JSON.stringify(neu));
    ok(/^data:image\/(webp|jpeg)/.test(nach), 'gespeichert als WebP (sonst JPEG), wie jedes Bild der App', nach.slice(0, 20));
    ok(/gerade gezogen/.test(await p.locator('#toast').innerText().catch(() => '')) && await p.locator('#toast button, #toast [data-a]').count() >= 1, 'eine Meldung sagt es, mit „Rückgängig“');
    await p.locator('#toast button').first().click(); await p.waitForTimeout(300);
    ok(await bildVon(p) === vorher, '„Rückgängig“ bringt das alte Bild zurück');
    // nichts geändert → Bild bleibt Byte für Byte
    await oeffnen(p); await p.click('[data-bt="ganz"]'); await p.click('[data-bt="ok"]'); await p.waitForSelector('[data-bt-fenster]', { state: 'detached' }); await p.waitForTimeout(300);
    ok(await bildVon(p) === vorher, 'ganzes Bild und alle Regler auf 0: das Bild bleibt unverändert (kein neues Speichern)');
    // Abbrechen
    await oeffnen(p); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    ok(await p.locator('[data-bt-fenster]').count() === 0 && await bildVon(p) === vorher, 'Esc schließt ohne Änderung');
    // Drehen
    await oeffnen(p); const d0 = await p.evaluate(() => { const c = document.querySelector('[data-bt-bild]'); return [c.width, c.height]; }); await p.click('[data-bt="drehen"]'); await p.waitForTimeout(200);
    const d1 = await p.evaluate(() => { const c = document.querySelector('[data-bt-bild]'); return [c.width, c.height]; });
    ok(d1[0] === d0[1] && d1[1] === d0[0] && /Blatt gefunden/.test(await p.locator('[data-bt-befund]').innerText()), 'Drehen dreht das Foto um 90° und sucht das Blatt neu', d0 + ' → ' + d1);
    await p.click('[data-bt="zu"]'); await p.waitForTimeout(200);
    // ein frisch eingefügtes Foto bietet „Gerade ziehen“ gleich an
    const png = Buffer.from(FOTO.split(',')[1], 'base64');
    const b2 = await p.locator('.rezept-held>img').boundingBox(); await p.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2); await p.waitForSelector('.bildvoll');
    const wahl = p.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null); await p.click('.bv-werk [data-w=bild-dazu]'); const fc = await wahl;
    if (fc) await fc.setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png }); else await p.setInputFiles('#datei-bild', { name: 'foto.png', mimeType: 'image/png', buffer: png });
    await p.waitForFunction(() => /Bild eingefügt/.test(document.querySelector('#toast')?.innerText || ''), null, { timeout: 10000 }).catch(() => {});
    const knopf = p.locator('#toast button', { hasText: 'Gerade ziehen' });
    ok(await knopf.count() === 1, 'nach „Bild eingefügt“ steht in der Meldung „Gerade ziehen“', await p.locator('#toast').innerText().catch(() => ''));
    if (await knopf.count()) { await knopf.click(); await p.waitForSelector('[data-bt-fenster] [data-bt-ecke]', { timeout: 5000 }).catch(() => {}); ok(await p.locator('[data-bt-fenster]').count() === 1, '… und ein Tipp darauf öffnet das Fenster mit dem neuen Foto'); await p.keyboard.press('Escape'); }
    await k.close(); }

  { const { p, k } = await seite(1280, 800);
    console.log('Breiter Schirm (1280 px)');
    await oeffnen(p);
    const m = await p.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); return { bild: r('[data-bt-rahmen]'), werk: r('[data-bt-werk]'), ok: r('[data-bt="ok"]'), quer: document.documentElement.scrollWidth > innerWidth + 1 }; });
    ok(!m.quer && m.ok.bottom <= 801 && m.werk.left > m.bild.right - 1, 'quer: Bild links groß, Werkzeuge rechts, Übernehmen sichtbar', JSON.stringify({ bild: Math.round(m.bild.width), werk: Math.round(m.werk.left), ok: Math.round(m.ok.bottom) }));
    await k.close(); }
  ok(fehler.length === 0, 'keine Fehler in der Konsole', fehler.join(' · '));
} catch (e) { rot++; console.log('  ✗ ROT: Probe abgebrochen — ' + e.message.split('\n')[0] + (fehler.length ? ' · Konsole: ' + fehler.join(' · ') : '')); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0;
