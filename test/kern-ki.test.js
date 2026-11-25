// Proben: Sprache, KI-Schlüssel, Claude-Aufruf, Mistral OCR, Foto-Scan (kern/). Kein Netz: jede Antwort ist gestellt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPRACHEN, geraeteSprache, sprache, text, tabelle, fuelle, gebiet } from '../kern/oberflaeche/sprache.mjs';
import { schluessel, formPasst, erklaerung, ANBIETER } from '../kern/ki/schluessel.mjs';
import { frageClaude, antwortText, jsonAusAntwort, bildBlock, STUFEN, CLAUDE_URL } from '../kern/ki/claude.mjs';
import { mistralOcr, ocrTextPutzen, MISTRAL_OCR_URL } from '../kern/ki/ocr.mjs';
import { auftrag, erkennen, rezeptAusScan, istPdf, istBild, wasGehtHinaus, wohinKurz } from '../kern/import/scan.mjs';
import { reiniger, grundText, haltHtml, vermerkHtml, meldung } from '../kern/ki/reinigung.mjs';
import { fundName, pruefHtml, WARN } from '../kern/pruefung/datei.mjs';

const ant = (ok, status, koerper) => ({ ok, status, json: async () => koerper });
const lagerAus = (m = new Map()) => ({ m, hol: async (k) => (m.has(k) ? m.get(k) : null), setz: async (k, v) => { m.set(k, v); }, weg: async (k) => { m.delete(k); } });

test('Sprache: acht Sprachen, erste Wahl folgt dem Gerät, unbekannte Gerätesprache wird Englisch', () => {
  assert.equal(SPRACHEN.length, 8);
  assert.equal(geraeteSprache({ languages: ['fr-CA', 'en'] }), 'fr');
  assert.equal(geraeteSprache({ languages: ['nl-NL'], language: 'nl-NL' }), 'en');
  assert.equal(geraeteSprache({ languages: ['nl', 'pt-BR'] }), 'pt', 'die erste, die die App kann');
  assert.equal(geraeteSprache({}), 'de', 'ohne Angabe Deutsch');
  assert.equal(sprache('it', { languages: ['de'] }), 'it'); assert.equal(sprache('', { languages: ['ru'] }), 'ru'); assert.equal(sprache('xx', { languages: ['zh-CN'] }), 'zh');
  assert.equal(gebiet('de'), 'de-DE'); assert.equal(gebiet('xx'), 'en-GB');
});
test('Sprache: Tabelle mit dem deutschen Text als Schlüssel, ohne Eintrag Englisch, nie ein Schlüsselname', () => {
  assert.equal(text('de', 'Speichern', 'Save'), 'Speichern'); assert.equal(text('en', 'Speichern', 'Save'), 'Save');
  assert.equal(text('fr', 'Speichern', 'Save'), 'Save', 'ohne Tabelle Englisch');
  tabelle('fr', { Speichern: 'Enregistrer', '{0} Rezepte dazu': '{0} recettes ajoutées' });
  assert.equal(text('fr', 'Speichern', 'Save'), 'Enregistrer');
  assert.equal(fuelle(text('fr', '{0} Rezepte dazu', '{0} recipes added'), 3), '3 recettes ajoutées');
  assert.equal(text('fr', 'Unbekannt', undefined), 'Unbekannt', 'ohne Englisch bleibt Deutsch stehen');
  assert.equal(text('fr', 'toString', 'x'), 'x', 'kein geerbter Eintrag');
  tabelle('xx', { a: 'b' }); assert.equal(text('xx', 'a', 'A'), 'A', 'eine unbekannte Sprache bekommt keine Tabelle');
});

test('Schlüssel: ein Schlüssel der alten App gilt, wird nie geändert; gelöscht bleibt gelöscht', async () => {
  const altDaten = { claudeKey9m: 'sk-ant-alt-0000000000000000' }, alt = { getItem: (k) => altDaten[k] ?? null, setItem() { throw new Error('die alte App wird nicht beschrieben'); }, removeItem() { throw new Error('die alte App wird nicht geändert'); } };
  const l = lagerAus(), S = schluessel(l, { altNamen: { anthropic: ['claudeKey9m'], openai: ['openaiImgKey9m', 'openaiKey9m'] }, alt });
  assert.equal(await S.hol('anthropic'), 'sk-ant-alt-0000000000000000'); assert.equal(await S.da('openai'), false);
  await S.setz('anthropic', '  sk-ant-neu-1111111111111111  '); assert.equal(await S.hol('anthropic'), 'sk-ant-neu-1111111111111111', 'getrimmt, der neue gilt');
  await S.weg('anthropic'); assert.equal(await S.hol('anthropic'), '', 'nach dem Löschen kommt der alte NICHT zurück');
  assert.equal(altDaten.claudeKey9m, 'sk-ant-alt-0000000000000000', 'der Speicher der alten App ist unberührt');
  assert.deepEqual((await S.liste()).map((x) => [x.id, x.da]), [['anthropic', false], ['openai', false], ['mistral', false], ['pollinations', false]]);
  const ohne = schluessel(lagerAus(), { alt: { getItem() { throw new Error('gesperrt'); } }, altNamen: { mistral: ['mistralKey9m'] } });
  assert.equal(await ohne.hol('mistral'), '', 'gesperrter Speicher ist kein Absturz');
});
test('Schlüssel: Form und Erklärung', () => {
  assert.ok(formPasst('anthropic', 'sk-ant-api03-abcdefghijklmnop')); assert.ok(!formPasst('anthropic', 'sk-abcdefghijklmnopqrstuvwx')); assert.ok(!formPasst('openai', 'sk-kurz')); assert.ok(!formPasst('mistral', 'mit leerzeichen 1234567890'));
  assert.ok(formPasst('mistral', 'AbCdEfGhIjKlMnOpQrStUvWx'));
  for (const a of Object.keys(ANBIETER)) { assert.ok(erklaerung(a, 'de').includes(ANBIETER[a].seite)); assert.ok(erklaerung(a, 'en').includes('stays on this device')); assert.ok(!/\{\d\}/.test(erklaerung(a, 'de'))); }
});

test('Claude: Adresse, Kopfzeilen, Modell je Stufe; keine Sampling-Werte, kein Vorfüllen', async () => {
  let gesehen = null; const hol = async (url, o) => { gesehen = { url, o, k: JSON.parse(o.body) }; return ant(true, 200, { content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: ' Hallo ' }], stop_reason: 'end_turn' }); };
  assert.equal(await frageClaude('sk-ant-x', 'Sag Hallo', { hol }), 'Hallo');
  assert.equal(gesehen.url, CLAUDE_URL); assert.equal(gesehen.o.headers['x-api-key'], 'sk-ant-x'); assert.equal(gesehen.o.headers['anthropic-dangerous-direct-browser-access'], 'true'); assert.ok(gesehen.o.headers['anthropic-version']);
  assert.equal(gesehen.k.model, 'claude-haiku-5-5'); assert.deepEqual(Object.keys(gesehen.k).sort(), ['max_tokens', 'messages', 'model']);
  assert.equal(gesehen.k.messages.length, 1, 'nur eine Nutzer-Nachricht, nichts vorgefüllt'); assert.ok(gesehen.k.max_tokens >= 8000, 'Platz für das Denken');
  await frageClaude('k', 'x', { hol, stufe: 'standard' }); assert.equal(gesehen.k.model, 'claude-sonnet-5-5');
  await frageClaude('k', 'x', { hol, stufe: 'profi', system: 'kurz' }); assert.equal(gesehen.k.model, 'claude-opus-5-5'); assert.equal(gesehen.k.system, 'kurz');
  await frageClaude('k', 'x', { hol, stufe: 'gibtsnicht' }); assert.equal(gesehen.k.model, STUFEN.schnell.modell);
});
test('Claude: Fehler im Klartext (kein Schlüssel, abgelehnt, Guthaben, überlastet, Ablehnung, abgeschnitten, kein Netz)', async () => {
  await assert.rejects(frageClaude('', 'x'), (f) => f.keinSchluessel === true);
  await assert.rejects(frageClaude('k', 'x', { hol: async () => ant(false, 401, { error: { type: 'authentication_error' } }) }), (f) => /abgelehnt/.test(f.message) && f.schluesselAbgelehnt);
  await assert.rejects(frageClaude('k', 'x', { hol: async () => ant(false, 429, {}) }), /zu viele Anfragen/);
  await assert.rejects(frageClaude('k', 'x', { hol: async () => ant(false, 529, {}) }), /überlastet/);
  await assert.rejects(frageClaude('k', 'x', { hol: async () => ant(false, 400, { error: { message: 'max_tokens: zu groß' } }) }), /max_tokens: zu groß/);
  await assert.rejects(frageClaude('k', 'x', { hol: async () => { throw new TypeError('Failed to fetch'); }, sprache: 'en' }), /No connection/);
  assert.throws(() => antwortText({ content: [], stop_reason: 'refusal' }), /abgelehnt/);
  assert.throws(() => antwortText({ content: [{ type: 'thinking', thinking: 'x' }], stop_reason: 'max_tokens' }), /abgeschnitten/);
  assert.throws(() => antwortText(null), /nicht geantwortet/);
});
test('JSON aus einer KI-Antwort: Zäune, Vor- und Nachrede, rohe Zeilenumbrüche', () => {
  assert.deepEqual(jsonAusAntwort('```json\n{"name":"Suppe","steps":["a",\n"b"]}\n```'), { name: 'Suppe', steps: ['a', 'b'] });
  assert.deepEqual(jsonAusAntwort('Hier ist es: {"name":"Zeile\neins\tzwei"} Viel Erfolg!'), { name: 'Zeile eins\tzwei' });
  assert.throws(() => jsonAusAntwort('kein JSON'), /nicht lesen/);
  assert.deepEqual(bildBlock('data:image/jpeg;base64,QUJD'), { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' } });
});

test('Mistral OCR: Anfrage, geputzter Text, Fehler im Klartext', async () => {
  let gesehen = null; const hol = async (url, o) => { gesehen = { url, o, k: JSON.parse(o.body) }; return ant(true, 200, { model: 'mistral-ocr-2505', pages: [{ markdown: '# Gulasch\n\n![bild](x.png)\n500 g  Rind' }, { markdown: '[Tipp](http://x) dazu' }] }); };
  const r = await mistralOcr('m-key', 'data:image/jpeg;base64,QUJD', { hol });
  assert.equal(gesehen.url, MISTRAL_OCR_URL); assert.equal(gesehen.o.headers.Authorization, 'Bearer m-key'); assert.deepEqual(gesehen.k.document, { type: 'image_url', image_url: 'data:image/jpeg;base64,QUJD' });
  assert.equal(r.modell, 'mistral-ocr-2505'); assert.equal(r.text, 'Gulasch\n\n500 g Rind\n\nTipp dazu');
  await assert.rejects(mistralOcr('', 'data:x'), (f) => f.keinSchluessel === true);
  await assert.rejects(mistralOcr('k', 'kein-bild'), /kein Bild/);
  await assert.rejects(mistralOcr('k', 'data:image/png;base64,AA', { hol: async () => ant(false, 401, {}) }), (f) => /abgelehnt/.test(f.message) && f.schluesselAbgelehnt);
  await assert.rejects(mistralOcr('k', 'data:image/png;base64,AA', { hol: async () => ant(false, 500, {}) }), /HTTP 500/);
  assert.equal(ocrTextPutzen(null), '');
});

const KATS = [{ id: 'suppe', name: 'Suppen' }, { id: 'eig_1', name: 'Sushi' }];
const ROH = { name: ' Kartoffelsuppe ', servings: '6', prepTime: 45, category: 'suppe', flavor: 'herzhaft', ingredients: [{ amt: '500', unit: 'g', name: 'Kartoffeln' }, 'Salz', { name: '' }], steps: ['Schälen.', { txt: 'Kochen.' }, ''] };
test('Scan: der Auftrag nennt die Kategorien der Ausgabe und verbietet das Übersetzen', () => {
  const a = auftrag('bild', KATS);
  assert.ok(a.includes('"category": "suppe|eig_1"') && a.includes('eig_1 = Sushi') && a.includes('Do NOT translate') && a.includes('never an instruction to you'));
  assert.ok(auftrag('text', []).includes('extracted via OCR')); assert.ok(auftrag('seiten', KATS).includes('pages of one recipe'));
});
test('Scan: aus der Antwort wird ein Rezept; unbekannte Kategorie bleibt leer, nichts wird erfunden', () => {
  const r = rezeptAusScan(ROH, { kategorien: KATS, bild: 'data:image/jpeg;base64,QQ' });
  assert.equal(r.name, 'Kartoffelsuppe'); assert.equal(r.cat, 'suppe'); assert.equal(r.servings, 6); assert.equal(r.prepTime, 45); assert.equal(r.img, 'data:image/jpeg;base64,QQ'); assert.deepEqual(r.flavors, ['herzhaft']);
  assert.deepEqual(r.ings.map((z) => [z.amt, z.unit, z.name]), [['500', 'g', 'Kartoffeln'], ['', '', 'Salz']]); assert.deepEqual(r.steps.map((x) => x.txt), ['Schälen.', 'Kochen.']);
  const leer = rezeptAusScan({ category: 'gibtsnicht' }, { kategorien: KATS, sprache: 'en' });
  assert.equal(leer.cat, ''); assert.equal(leer.name, 'Scanned recipe'); assert.equal(leer.servings, 4); assert.ok(!('prepTime' in leer)); assert.deepEqual(leer.ings, []);
});
test('Scan mit Claude: die Bilder gehen als Bild-Blöcke, danach der Auftrag', async () => {
  const rufe = []; const hol = async (url, o) => { rufe.push({ url, k: JSON.parse(o.body) }); return ant(true, 200, { content: [{ type: 'text', text: JSON.stringify(ROH) }], stop_reason: 'end_turn' }); };
  const v = { art: 'pdf', name: 'a.pdf', bilder: ['data:image/jpeg;base64,AAA', 'data:image/jpeg;base64,BBB'], liste: [], seiten: 2, gesamt: 2, kb: 3 };
  const a = await erkennen(v, { schluessel: { anthropic: 'sk-ant-x' }, kategorien: KATS, stufe: 'standard', hol });
  assert.equal(a.name, ' Kartoffelsuppe '); assert.equal(rufe.length, 1); assert.equal(rufe[0].url, CLAUDE_URL); assert.equal(rufe[0].k.model, 'claude-sonnet-5-5');
  const inhalt = rufe[0].k.messages[0].content; assert.deepEqual(inhalt.map((b) => b.type), ['image', 'image', 'text']); assert.equal(inhalt[1].source.data, 'BBB'); assert.ok(inhalt[2].text.includes('pages of one recipe'));
});
test('Scan mit Mistral: erst OCR je Bild, dann nur der TEXT an Claude; ohne Text kein Aufruf an Claude', async () => {
  const rufe = []; const hol = async (url, o) => { rufe.push(url); if (url === MISTRAL_OCR_URL) return ant(true, 200, { pages: [{ markdown: 'Seite ' + rufe.length }] }); const k = JSON.parse(o.body); assert.deepEqual(k.messages[0].content.map((b) => b.type), ['text', 'text']); assert.equal(k.messages[0].content[0].text, 'Seite 1\n\nSeite 2'); return ant(true, 200, { content: [{ type: 'text', text: '{"name":"X"}' }] }); };
  const v = { art: 'pdf', bilder: ['data:image/jpeg;base64,AAA', 'data:image/jpeg;base64,BBB'] }, stand = [];
  assert.deepEqual(await erkennen(v, { anbieter: 'mistral', schluessel: { anthropic: 'a', mistral: 'm' }, hol, fortschritt: (t) => stand.push(t) }), { name: 'X' });
  assert.deepEqual(rufe, [MISTRAL_OCR_URL, MISTRAL_OCR_URL, CLAUDE_URL]); assert.equal(stand.length, 3);
  const leer = []; await assert.rejects(erkennen(v, { anbieter: 'mistral', schluessel: { anthropic: 'a', mistral: 'm' }, hol: async (url) => { leer.push(url); return ant(true, 200, { pages: [] }); } }), /keinen Text/);
  assert.ok(!leer.includes(CLAUDE_URL));
  await assert.rejects(erkennen(v, { anbieter: 'mistral', schluessel: { anthropic: 'a' }, hol }), (f) => f.keinSchluessel === true);
});
test('Scan: Dateiarten und der Satz „was geht hinaus“', () => {
  assert.ok(istPdf({ name: 'Rezept.PDF', type: '' })); assert.ok(istPdf({ name: 'x', type: 'application/pdf' })); assert.ok(!istPdf({ name: 'foto.jpg', type: 'image/jpeg' }));
  assert.ok(istBild({ name: 'IMG_1.HEIC', type: '' })); assert.ok(!istBild({ name: 'a.txt', type: 'text/plain' }));
  const foto = wasGehtHinaus({ art: 'bild', bilder: ['x'], kb: 180, seiten: 1, gesamt: 1 }, 'anthropic', 'de');
  assert.ok(foto.includes('180 KB') && foto.includes('ohne Aufnahmedaten') && foto.includes('an Anthropic'));
  const pdf = wasGehtHinaus({ art: 'pdf', bilder: [1, 2, 3], kb: 900, seiten: 3, gesamt: 12 }, 'mistral', 'de');
  assert.ok(pdf.includes('3 Seitenbilder') && pdf.includes('an Mistral') && pdf.includes('danach an Anthropic') && pdf.includes('ersten 3 von 12'));
  assert.equal(wohinKurz({ art: 'bild', bilder: ['x'], kb: 180, seiten: 1, gesamt: 1 }), 'Anthropic · 180 KB'); assert.equal(wohinKurz({ art: 'pdf', bilder: [1, 2, 3], kb: 900, seiten: 3, gesamt: 12 }, 'mistral', 'de'), 'Mistral, dann Anthropic · 900 KB · 3 Seiten von 12'); assert.equal(wohinKurz({ art: 'pdf', bilder: [1], kb: 80, seiten: 1, gesamt: 1 }, 'anthropic', 'en'), 'Anthropic · 80 KB · 1 page');
});

test('Reinigung: einmal anhalten; nach „Abbrechen“ geht nichts mehr hinaus und nichts wird gezählt', async () => {
  let gefragt = 0; const ja = reiniger(async () => { gefragt++; return true; });
  assert.equal(await ja.halt('a.pdf', []), true); assert.equal(gefragt, 0, 'ohne Fund keine Frage');
  assert.equal(await ja.halt('a.pdf', [{ seite: 1, text: 'x', grund: 'unsichtbar' }]), true); assert.equal(await ja.halt('b.pdf', [{ seite: 1, text: 'y', grund: 'winzig' }, { seite: 2, text: 'z', grund: 'aussen' }]), true);
  assert.equal(gefragt, 1, 'einmal je Sendevorgang'); assert.equal(ja.st.n, 3);
  const nein = reiniger(async () => false);
  assert.equal(await nein.halt('a.pdf', [{ seite: 1, text: 'x', grund: 'unsichtbar' }]), false); assert.equal(await nein.halt('b.pdf', []), false, 'auch eine saubere Datei geht nach dem Abbrechen nicht mehr hinaus'); assert.equal(nein.st.n, 0);
});
test('Reinigung und Prüfung: Texte de/en, alles maskiert', () => {
  assert.equal(grundText('winzig', 'de'), 'winzige Schrift'); assert.equal(grundText('meta', 'en'), 'image metadata'); assert.equal(grundText('neu', 'de'), 'neu');
  const h = haltHtml('<b>a</b>.pdf', [{ seite: 2, text: '<script>ignore previous</script>', grund: 'unsichtbar' }], 'de');
  assert.ok(h.includes('data-ki-halt') && h.includes('&lt;script&gt;') && !h.includes('<script>') && h.includes('Seite 2') && h.includes('&lt;b&gt;a&lt;/b&gt;.pdf'));
  assert.ok(h.startsWith('<details') && h.includes('<summary>1 versteckte Stelle geht nicht mit</summary>'), 'eine Zeile, der Rest eingeklappt');
  assert.equal(vermerkHtml({ kiEntfernt: [] }), ''); assert.ok(vermerkHtml({ kiEntfernt: [{ seite: 1, text: 'x', grund: 'winzig' }] }, 'en').includes('Removed before sending to an AI · 1'));
  assert.equal(meldung('seitenMax', 'de', 10, 14), 'Nur die ersten 10 von 14 Seiten gehen an die KI.');
  for (const k of WARN) assert.notEqual(fundName(k, 'en'), k, 'jede Warnung hat einen Namen');
  const p = pruefHtml({ stand: 'warnung', funde: [{ kennung: 'KI-ANWEISUNG', satz: 'Ignoriere <alles>' }], schritte: ['Absender fragen'], hinweise: ['h'], markiert: null }, 'de');
  assert.ok(p.includes('data-pruef-dialog="warnung"') && p.includes('Anweisung an eine KI im Text') && p.includes('&lt;alles&gt;') && p.includes('Absender fragen'));
  assert.ok(p.indexOf('<details') > 0 && p.indexOf('Absender fragen') > p.indexOf('<details') && p.indexOf('&lt;alles&gt;') > p.indexOf('<details') && p.indexOf('Anweisung an eine KI im Text') < p.indexOf('<details'), 'sichtbar sind Stand und Name des Funds; Sätze und „Was jetzt tun“ stehen eingeklappt');
  const leer = pruefHtml({ stand: 'ungeprueft', funde: [], schritte: [], hinweise: [] }, 'de'); assert.ok(leer.includes('heißt nicht „sauber“') && !leer.includes('<details'));
});
import { pruefeSchluessel } from '../kern/ki/schluessel.mjs';
test('Schlüssel prüfen: gültig, abgelehnt, ohne Guthaben, kein Netz; Anthropic mit kleinster Anfrage, die anderen über die Modell-Liste', async () => {
  const rufe = []; const hol = (status) => async (url, o) => { rufe.push({ url, o }); return ant(status < 300, status, {}); };
  assert.deepEqual(await pruefeSchluessel('anthropic', ' sk-ant-x ', { hol: hol(200) }), { ok: true, text: 'Der Schlüssel funktioniert.' });
  assert.equal(rufe[0].o.headers['x-api-key'], 'sk-ant-x'); const k = JSON.parse(rufe[0].o.body); assert.equal(k.messages[0].content, 'Hi'); assert.ok(k.max_tokens <= 32);
  await pruefeSchluessel('openai', 'sk-o', { hol: hol(200) }); assert.equal(rufe[1].url, 'https://api.openai.com/v1/models'); assert.equal(rufe[1].o.headers.Authorization, 'Bearer sk-o'); assert.equal(rufe[1].o.method, undefined, 'nur lesen');
  await pruefeSchluessel('mistral', 'm', { hol: hol(200) }); assert.equal(rufe[2].url, 'https://api.mistral.ai/v1/models');
  const nein = await pruefeSchluessel('openai', 'sk-o', { hol: hol(401) }); assert.ok(!nein.ok && /lehnt diesen Schlüssel ab/.test(nein.text));
  const leer = await pruefeSchluessel('mistral', 'm', { hol: hol(429), sprache: 'en' }); assert.ok(leer.ok && /valid, but Mistral reports/.test(leer.text));
  assert.ok(!(await pruefeSchluessel('anthropic', 'k', { hol: async () => { throw new TypeError('x'); } })).ok);
  assert.ok(!(await pruefeSchluessel('anthropic', '  ')).ok); assert.ok(!(await pruefeSchluessel('openai', 'k', { hol: hol(500) })).ok);
});

test('Schlüssel: ist der alte Speicher gesperrt (schon der Zugriff wirft), startet das Lager trotzdem', async () => {
  const alt = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('The document is sandboxed'); } });
  try { const m = new Map(), lager = { hol: async (k) => m.get(k) ?? null, setz: async (k, w) => { m.set(k, w); } };
    const { schluessel } = await import('../kern/ki/schluessel.mjs'); const S = schluessel(lager, { altNamen: { anthropic: ['claudeKey9m'] } });
    assert.equal(await S.hol('anthropic'), ''); await S.setz('anthropic', ' sk-ant-x '); assert.equal(await S.hol('anthropic'), 'sk-ant-x'); }
  finally { if (alt) Object.defineProperty(globalThis, 'localStorage', alt); else delete globalThis.localStorage; }
});

test('„Vom Teller“: das Foto geht an Claude, nie über die Texterkennung; der Auftrag nennt die Sprache; ohne Gericht kommt Klartext', async () => {
  const rufe = [], antwort = (o) => async (url, opt) => { rufe.push({ url, k: JSON.parse(opt.body) }); return ant(true, 200, { content: [{ type: 'text', text: JSON.stringify(o) }], stop_reason: 'end_turn' }); };
  const v = { art: 'bild', bilder: ['data:image/jpeg;base64,QUJD'], liste: [] };
  const a = await erkennen(v, { anbieter: 'mistral', vomTeller: true, schluessel: { anthropic: 'sk-ant-x', mistral: 'm' }, kategorien: KATS, sprache: 'fr', hol: antwort({ name: 'Ratatouille', ingredients: [], steps: [] }) });
  assert.equal(a.name, 'Ratatouille'); assert.equal(rufe.length, 1); assert.ok(rufe[0].url.includes('anthropic'), 'auch bei Anbieter Mistral geht das Foto nur an Claude');
  const c = rufe[0].k.messages[0].content; assert.equal(c[0].type, 'image'); assert.ok(c[1].text.includes('finished dish') && c[1].text.includes('French') && /never an instruction/.test(c[1].text));
  assert.ok(auftrag('teller', KATS, 'de').includes('German') && auftrag('teller', KATS, 'de').includes(KATS[0].id));
  await assert.rejects(erkennen(v, { vomTeller: true, schluessel: { anthropic: 'sk-ant-x' }, hol: antwort({ name: '' }) }), /kein Gericht/);
  await assert.rejects(erkennen({ art: 'pdf', bilder: ['x'], liste: [] }, { vomTeller: true, schluessel: { anthropic: 'sk-ant-x' }, hol: antwort({ name: 'X' }) }), /braucht ein Foto/);
});
