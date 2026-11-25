// Probe der neuen PWA: Event-Ordner (R19, Klaus 25.11.) – Anlass mit Datum und Gästen, in den Kalender, Portionen im Plan,
// Einkaufsliste mit Gästezahl, Menükarte, Kalender abgleichen. Echter Browser. Aufruf: node tests/smoke_neu_event.mjs · WURZEL=<Pfad> misst eine Kopie.
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
const ORD = 'Hochzeit von Jonas und Lisa';
const ordG = (p) => p.locator(`.bz-gruppe[data-art=ord][data-name="${ORD}"]`);
const druckFangen = (p) => p.evaluate(() => { window.__gedruckt = 0; const alt = HTMLIFrameElement.prototype.__lookupGetter__('contentWindow'); Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', { get() { const w = alt.call(this); if (w && this.hasAttribute('data-kern-druck')) w.print = () => { window.__gedruckt++; }; return w; } }); });

try {
  for (const breite of [390, 1280]) {
    console.log(`1 · Anlass anlegen (${breite} px)`);
    const { p, k } = await seite(null, breite, 860);
    await p.click('[data-a=beispiel]'); await p.waitForSelector('.karte', { timeout: 20000 }); await zumBaum(p);
    await p.click('[data-a=baum-ordner-neu]'); await p.fill('[data-form=baum-ordner-neu] input', ORD); await p.press('[data-form=baum-ordner-neu] input', 'Enter'); await ordG(p).waitFor();
    const oid = await ordG(p).getAttribute('data-id');
    ok(await ordG(p).locator('.bz-event.aus [data-a=ev-an]').count() === 1 && await p.locator('.bz-event').count() === 1, 'ein aufgeklappter Ordner bietet „Als Anlass planen“ an, sonst steht nirgends ein Band');
    /* drei Gerichte aus drei Kategorien in den Ordner, über Auswählen → Verschieben */
    await p.click('[data-a=baum-alle]'); await p.click('[data-a=baum-wahl]');
    const gr = p.locator('.bz-baum[data-teil=kat] .bz-gruppe:has(.bz-haken)'), uids = [];
    for (const i of [2, 0, 1]) { const h = gr.nth(i).locator('.bz-haken').first(); uids[i] = await h.getAttribute('data-uid'); await h.click(); }
    await p.click('[data-a=baum-verschieben]'); await p.click(`[data-a=baum-ziel][data-art=ord][data-id="${oid}"]`); await p.waitForTimeout(150);
    if (await p.locator('[data-a=baum-wahl][aria-pressed=true]').count()) await p.click('.bz-knoepfe [data-a=baum-wahl]');
    await ordG(p).locator('[data-a=ev-an]').click(); await p.waitForSelector('.ev-datum');
    ok(await p.evaluate(() => document.activeElement?.classList.contains('ev-datum')), 'nach dem Tipp steht der Finger gleich im Datumsfeld');
    ok(await ordG(p).locator('[data-a=ev-kalender][disabled]').count() === 1, 'ohne Datum ist „In den Kalender“ aus');
    await p.fill('.ev-datum', '2027-06-12'); await p.fill('.ev-gaeste', '40'); await p.press('.ev-gaeste', 'Tab'); await p.waitForTimeout(200);
    let z = await zustand(p), o = z.ordner.find((x) => x.id === oid);
    ok(o?.event?.datum === '2027-06-12' && o.event.gaeste === 40, 'Datum und Gäste stehen am Ordner (direkt im Band geändert, kein Fenster)', JSON.stringify(o?.event));
    ok(/Sa\.?, 12\.6\.2027 · 40 Gäste/.test(await ordG(p).locator('.bz-zahl').innerText()) && await ordG(p).locator('.bz-kopf .kat-zeichen .ic').count() === 1 && !(await ordG(p).locator('.bz-kopf img').count()), 'die Kopfzeile nennt Tag und Gäste und trägt das Kalender-Zeichen', await ordG(p).locator('.bz-zahl').innerText());
    ok(await p.locator('.fenster').count() === 0, 'kein Zwischenfenster');
    const bandRechts = await ordG(p).locator('.bz-event').evaluate((e) => { const b = e.getBoundingClientRect(); return [...e.querySelectorAll('button,input')].every((x) => { const r = x.getBoundingClientRect(); return r.right <= b.right + 1 && r.left >= b.left - 1 && r.height >= 34; }); });
    ok(bandRechts, 'alles im Band passt in die Breite und ist groß genug für den Finger');

    console.log('2 · In den Kalender übernehmen');
    await ordG(p).locator('[data-a=ev-kalender]').click(); await p.waitForTimeout(100);
    z = await zustand(p); o = z.ordner.find((x) => x.id === oid);
    ok(JSON.stringify(z.plan['2027-06-12']) === JSON.stringify([uids[0], uids[1], uids[2]]), 'alle drei Gerichte am Tag, in Gängen nach der Folge der Kategorien', JSON.stringify(z.plan['2027-06-12']));
    ok(uids.every((u) => z.planPortionen['2027-06-12']?.[u] === 40), 'Portionen im Plan = Gäste');
    ok(/3 Gerichte am .* im Kalender, je für 40/.test(await p.locator('#toast').innerText()) && await p.locator('#toast [data-a=toast-tun]').innerText() === 'Rückgängig', 'die Meldung sagt es und bietet Rückgängig', await p.locator('#toast').innerText());
    ok(await ordG(p).locator('[data-a=ev-zum-plan]').count() === 1 && await ordG(p).locator('[data-a=ev-abgleich]').count() === 0, 'danach: „Im Kalender · ansehen“, nichts abzugleichen');
    await ordG(p).locator('[data-a=ev-zum-plan]').click(); await p.waitForSelector('.w-tag');
    const tag = p.locator('.w-tag', { has: p.locator(`[data-a=plan-weg][data-tag="2027-06-12"]`) });
    ok(await tag.locator('.w-port.eig').count() === 3 && (await tag.locator('.w-port.eig').allInnerTexts()).every((t) => t.trim() === '40'), 'der Plan springt in die Woche; jedes Gericht zeigt „40“ in der Akzentfarbe');
    await tag.locator(`.w-port[data-uid="${uids[1]}"]`).click(); await p.fill('[data-form=plan-port] input', '45'); await p.press('[data-form=plan-port] input', 'Enter'); await p.waitForTimeout(100);
    z = await zustand(p); ok(z.planPortionen['2027-06-12']?.[uids[1]] === 45 && await p.locator('.fenster').count() === 0, 'im Plan frei änderbar: ein Gericht für 45');
    await p.click('[data-a=plan-einkauf]'); z = await zustand(p);
    ok(z.einkauf.posten.find((x) => x.uid === uids[1])?.portionen === 45 && z.einkauf.posten.find((x) => x.uid === uids[0])?.portionen === 40, '„Einkaufsliste für die Woche“ rechnet mit den Portionen des Plans');
    await p.click('[data-a=plan-weg][data-uid="' + uids[2] + '"]'); z = await zustand(p);
    ok(!z.plan['2027-06-12'].includes(uids[2]) && !(uids[2] in (z.planPortionen['2027-06-12'] || {})), 'aus dem Plan genommen: die Portionen gehen mit');
    await zumBaum(p);
    ok(await ordG(p).locator('[data-a=ev-abgleich]').count() === 0, 'eine Änderung im Kalender ist keine Frage an den Ordner (der Kalender ist frei)');

    console.log('3 · Einkaufsliste, Menükarte');
await ordG(p).locator('[data-a=ev-einkauf]').click(); z = await zustand(p);
    ok(uids.every((u) => z.einkauf.posten.find((x) => x.uid === u)?.portionen === 40), 'alles auf die Einkaufsliste, je für 40 (schon vorhandene angepasst)', JSON.stringify(z.einkauf.posten));
    await druckFangen(p); await ordG(p).locator('[data-a=ev-karte]').click(); await p.waitForFunction(() => window.__gedruckt === 1, null, { timeout: 10000 });
    const karte = await p.evaluate(() => document.querySelector('iframe[data-kern-druck]')?.srcdoc || '');
    const namen = await p.evaluate((u) => u, uids);
    ok(karte.includes('Hochzeit von Jonas und Lisa') && karte.includes('Samstag, 12. Juni 2027') && !/40/.test(karte.replace(/<style>[\s\S]*?<\/style>/, '')) && (karte.match(/<h2>/g) || []).length === 3 && namen.length === 3, 'Menükarte: Anlass, Tag, drei Gänge; die Gästezahl steht nicht darauf');

    console.log('4 · Der Ordner ändert sich: Kalender abgleichen');
    await p.click('[data-a=baum-wahl]'); await ordG(p).locator(`.bz-haken[data-uid="${uids[0]}"]`).click(); await p.click('[data-a=baum-verschieben]'); await p.click('[data-a=baum-ziel][data-art=ord][data-id=""]'); await p.waitForTimeout(150);
    if (await p.locator('.bz-knoepfe [data-a=baum-wahl][aria-pressed=true]').count()) await p.click('.bz-knoepfe [data-a=baum-wahl]');
    await p.fill('.ev-gaeste', '50'); await p.press('.ev-gaeste', 'Tab'); await p.waitForTimeout(200);
    ok(await ordG(p).locator('[data-a=ev-abgleich]').count() === 1, 'am Band steht jetzt „Kalender abgleichen“');
    await ordG(p).locator('[data-a=ev-abgleich]').click(); await p.waitForSelector('[data-a=ev-abgleich-los]');
    ok(await p.locator('[data-ab=fehlt]').count() === 1 && await p.locator('[data-ab=gaeste]').count() === 1 && await p.locator('[data-ab=neu]').count() === 0, 'das Fenster nennt, was fehlt, und die neue Gästezahl, zum Entscheiden angehakt');
    await p.click('[data-a=ev-abgleich-los]'); await p.waitForTimeout(100); z = await zustand(p);
    ok(!z.plan['2027-06-12'].includes(uids[0]) && z.planPortionen['2027-06-12']?.[uids[1]] === 50, 'übernommen: das herausgenommene Gericht ist aus dem Kalender, die Portionen sind 50', JSON.stringify(z.planPortionen));
    ok(await ordG(p).locator('[data-a=ev-abgleich]').count() === 0, 'danach ist nichts mehr abzugleichen');
    await p.click('#toast [data-a=toast-tun]'); z = await zustand(p);
    ok(z.plan['2027-06-12'].includes(uids[0]) && await ordG(p).locator('[data-a=ev-abgleich]').count() === 1, 'Rückgängig stellt Kalender und Frage wieder her');

    console.log('5 · Kein Anlass mehr; Sicherung');
    await ordG(p).locator('[data-a=ev-weg]').click(); z = await zustand(p);
    ok(!z.ordner.find((x) => x.id === oid).event && z.plan['2027-06-12'].length >= 1 && await ordG(p).locator('.bz-event:not(.aus)').count() === 0, '„Kein Anlass mehr“: der Ordner ist wieder einfach, der Kalender bleibt');
    await k.close();
  }
  ok(fehler.length === 0, 'keine Fehler in der Konsole, kein Netz nach draußen', fehler.join(' · '));
} catch (e) { rot++; console.log('  ✗ ROT: Probe abgebrochen — ' + e.message.split('\n')[0]); }
await browser.close(); srv.close();
console.log(`\n${gruen} grün · ${rot} ROT`); process.exitCode = rot ? 1 : 0;
