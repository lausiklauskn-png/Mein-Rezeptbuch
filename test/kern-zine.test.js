// Proben: Food-Zine im Kern (kern/ausgabe/zine.mjs) – der Poster-Auftrag der alten App (Fluss A: sechs Formate, fünf Extras, Trend,
// alle Rezeptdaten, Sprache), die Sammlung „Meine Food-Zine-Bilder“ (gestelltes Lager), die Übernahme der alten Seiten am Rezept, das
// Beispielpaket, der Druck eines Bildes; dazu das Feld `zine` am Rezept, das alte Sicherungen weiter tragen. Kein Netz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ZINE_FORMATE, ZINE_FORMAT_VORGABE, zineFormat, ZINE_EXTRAS, zineExtras, zinePoster, zineTrend, zineFotoHinweis, ZINE_CHAT, ZINE_EIGEN_KANTE, ZINE_EIGEN_GUETE, ZINE_PNG_KANTE,
  ZS_DATEI_MAX, zsEintrag, zsVerschiebe, zsDateienTeilen, zineSammlung, zineAusRezepten, zineSaetzeBilder, zineDruck } from '../kern/ausgabe/zine.mjs';
import { normalisiere, zineFeld, ZINE_SEITEN } from '../kern/modell/rezept.mjs';
import { lies, schreibe, fuehreZusammen } from '../kern/sicherung/sicherung.mjs';
import { leererZustand } from '../kern/modell/zustand.mjs';

const B = (n) => 'data:image/png;base64,QUJD' + n;   /* unterscheidbare „Bilder“ */
const J = (n) => 'data:image/jpeg;base64,QUJD' + n;
const R = (extra = {}) => ({ uid: 'r-1', id: 1, name: 'Rindergulasch', cat: 'fleisch', servings: 6, prepTime: 90, ings: [{ amt: '500', unit: 'g', name: 'Rind' }, { amt: '2', unit: '', name: 'Zwiebeln' }], steps: [{ txt: 'Fleisch anbraten.' }, { txt: 'Zwei Stunden schmoren.' }], ...extra });
const KAT = { id: 'fleisch', name: 'Fleisch', symbol: '🥩' };
const QUELLE = readFileSync(new URL('../kern/ausgabe/zine.mjs', import.meta.url), 'utf8');

test('Formate und Extras wie in der alten App; ein unbekanntes Format ist die Vorgabe (Poster)', () => {
  assert.deepEqual(ZINE_FORMATE, ['poster', 'a4', 'insta', 'zeitung', 'karte', 'panorama']); assert.equal(ZINE_FORMAT_VORGABE, 'poster');
  assert.equal(zineFormat('karte'), 'karte'); assert.equal(zineFormat('gibt-es-nicht'), 'poster'); assert.equal(zineFormat('__proto__'), 'poster');
  assert.deepEqual(ZINE_EXTRAS, ['nutr', 'steps', 'shop', 'retro', 'qr']); assert.deepEqual(zineExtras(['qr', 'boese', 'nutr', 'qr']), ['nutr', 'qr']);
  assert.deepEqual([ZINE_EIGEN_KANTE, ZINE_EIGEN_GUETE, ZINE_PNG_KANTE], [1200, 0.88, 1600]);
  assert.deepEqual({ ...ZINE_CHAT }, { claude: 'https://claude.ai/new', chatgpt: 'https://chatgpt.com/' });
});
test('der Auftrag auf Deutsch: wörtlich die alte App, mit ALLEN Zutaten und Schritten, Zeit, Portionen, Kategorie mit Zeichen, Nährwerten und Aromen', () => {
  const viele = R({ ings: Array.from({ length: 14 }, (_, i) => ({ amt: String(i + 1), unit: 'g', name: 'Zutat' + (i + 1) })), steps: Array.from({ length: 9 }, (_, i) => ({ txt: 'Schritt ' + (i + 1) + ' ' + 'x'.repeat(150) })),
    nutrition: { kcal: 520, fat: 22, carbs: 14, protein: 48 }, flavors: ['würzig', 'deftig'] });
  const a = zinePoster(viele, { kategorie: KAT });
  assert.ok(a.startsWith('Erstelle ein farbiges Food-Zine Poster im Mixed-Media-Stil im Poster im Standard-Querformat (Landscape) zu Folgendem Rezept:\n\n📖 REZEPT: Rindergulasch\n🥩 Kategorie: Fleisch\n👥 Portionen: 6 Personen\n⏱️ Zubereitungszeit: 90 Minuten\nNährwerte pro Portion: 520 kcal | Fett: 22g | KH: 14g | Eiweiß: 48g\nAromen/Stil: würzig, deftig\n\n🧂 ZUTATEN:\n• 1 g Zutat1'), a.slice(0, 400));
  assert.ok(a.includes('• 14 g Zutat14') && a.includes('9. Schritt 9 ' + 'x'.repeat(150)), 'alle Zutaten und Schritte, ungekürzt');
  for (const t of ['📌 SEITE 1 — TITELSEITE (Cover)', '• Titel „Rindergulasch" in handschriftlicher / kreativer Typografie', '• Infopillen: 6 Port. · 90 Minuten · Fleisch', '📌 SEITE 3 — HINTERGRUNDWISSEN & GENUSS', 'Format: Poster im Standard-Querformat (Landscape) · Farbdruck · Mixed-Media-Stil', 'Einheitliche Farbpalette und Schriftfamilie über alle Seiten.']) assert.ok(a.includes(t), t);
  assert.ok(!a.includes('EXTRA') && !a.includes('LANGUAGE'), 'ohne Extras kein Extra-Block, auf Deutsch kein Sprachsatz');
});
test('je Format der Satz der alten App; Zeitungsseite und Panorama mit ihren eigenen Vorlagen', () => {
  const fmt = { poster: 'Poster im Standard-Querformat (Landscape)', a4: 'DIN A4 Hochformat', insta: 'quadratisches Format 1:1 (Social Media / Instagram)', karte: 'kompakte Rezeptkarte im A5-Format (zum Ausdrucken und Sammeln)' };
  for (const [f, satz] of Object.entries(fmt)) { const a = zinePoster(R(), { format: f }); assert.ok(a.includes('Mixed-Media-Stil im ' + satz + ' zu Folgendem Rezept') && a.includes('Format: ' + satz + ' · Farbdruck'), f); }
  const z = zinePoster(R(), { format: 'zeitung' }), p = zinePoster(R(), { format: 'panorama' });
  assert.ok(z.startsWith('STILPRIORITÄT: Natürlich wirkende aufgeschlagene Zeitung auf einem Tisch.') && z.includes('📰 LAYOUT — AUFGESCHLAGENE DOPPELSEITE:') && z.includes('LINKE SEITE:') && z.includes('🚫 NICHT SO:') && z.endsWith('Man sitzt am Tisch und liest eine alte gedruckte Wochenzeitung mit Rezeptseite.'), z.slice(-200));
  assert.ok(p.startsWith('Erstelle ein einziges großes, farbiges Food-Zine-Poster im Mixed-Media-Stil als Breitformat-Panorama 16:9.') && p.includes('Rindergulasch — bitte den typischen Herkunftsort') && p.includes('12. Tipps & Variationen:') && p.includes('ORTSVARIABLEN — BEISPIELE:') && p.includes('300 dpi: ca. 14043 × 7902 Pixel'));
  assert.ok(z.includes('🧂 ZUTATEN:\n• 500 g Rind\n• 2 Zwiebeln') && p.includes('👨‍🍳 ZUBEREITUNG:\n1. Fleisch anbraten.\n2. Zwei Stunden schmoren.'), 'beide Vorlagen tragen den Rezeptblock');
  assert.equal(new Set(ZINE_FORMATE.map((f) => zinePoster(R(), { format: f }))).size, 6, 'sechs verschiedene Aufträge');
});
test('Extras: je Haken ein Satz der alten App unter „➕ EXTRA-ANFORDERUNGEN:“, in jedem Format', () => {
  const a = zinePoster(R(), { extras: ['qr', 'nutr'] });
  assert.ok(a.endsWith('\n\n➕ EXTRA-ANFORDERUNGEN:\n• Integriere eine ansprechende Nährwert-Infografik mit Balken oder Icons für Kalorien, Fett, Kohlenhydrate und Eiweiß.\n• Reserviere einen Bereich für einen QR-Code mit dem Hinweis [QR-Code hier einfügen].'), a.slice(-300));
  for (const f of ZINE_FORMATE) assert.ok(zinePoster(R(), { format: f, extras: ['shop'] }).endsWith('• Füge einen abtrennbaren Einkaufslisten-Block mit den Zutaten als Checkbox-Liste hinzu.'), f);
  assert.ok(zinePoster(R(), { extras: ['retro', 'steps'] }).includes('• Visualisiere die Zubereitung als Step-by-Step-Diagramm') && zinePoster(R(), { extras: ['retro'] }).includes('Vintage/Retro-Stil mit gealterten Texturen'));
});
test('Platzhalter der alten App: ohne Zeit „ca. 30–60 Minuten“, ohne Kategorie „Hauptgericht 🍽️“, „Ergibt“ statt Portionen, Kuchen in Stück; ohne Rezept kein Auftrag', () => {
  const a = zinePoster({ name: 'Brot' });
  assert.ok(a.includes('🍽️ Kategorie: Hauptgericht') && a.includes('Portionen: 4 Personen') && a.includes('ca. 30–60 Minuten') && a.includes('(keine Zutaten angegeben)') && a.includes('(keine Schritte angegeben)') && !/undefined|null|NaN/.test(a), a.slice(0, 300));
  assert.ok(zinePoster(R({ yieldText: '1 Laib' })).includes('👥 Ergibt: 1 Laib'));
  assert.ok(zinePoster(R({ servings: 12 }), { kategorie: { id: 'kuchen', name: 'Kuchen', symbol: '🍰' } }).includes('👥 Portionen: 12 Stück'));
  assert.equal(zinePoster(null), ''); assert.equal(zinePoster({ name: '  ' }), '');
});
test('Sprache: Deutsch wörtlich; Englisch ohne Sprachsatz; jede andere Sprache Englisch mit dem Satz, die Beschriftung in ihr zu setzen', () => {
  const en = zinePoster(R({ nutrition: { kcal: 500, fat: 20, carbs: 10, protein: 40 } }), { sprache: 'en', kategorie: KAT, extras: ['qr'] }), fr = zinePoster(R(), { sprache: 'fr', format: 'panorama' });
  assert.ok(en.startsWith('Create a colourful food zine poster in mixed-media style, in standard landscape poster format, for the following recipe:') && en.includes('📖 RECIPE: Rindergulasch\n🥩 Category: Fleisch\n👥 Servings: 6 people') && en.includes('Nutrition per serving: 500 kcal') && en.includes('[insert QR code here]') && !en.includes('LANGUAGE') && !/[äöüß]/.test(en.replace(/Rindergulasch|Fleisch|Zwiebeln|Zwei Stunden schmoren\.|Fleisch anbraten\./g, '')), en.slice(0, 300));
  assert.ok(fr.startsWith('Create one single large, colourful food zine poster') && fr.endsWith('LANGUAGE: Write every headline, label and text on the picture in French.'), fr.slice(-200));
  for (const [c, n] of [['es', 'Spanish'], ['it', 'Italian'], ['pt', 'Portuguese'], ['ru', 'Russian'], ['zh', 'Chinese']]) assert.ok(zinePoster(R(), { sprache: c, format: 'zeitung' }).includes('in ' + n + '.'), c);
});
test('KI-Überraschung: ein Auftrag ohne Rezept, Format immer Poster quer; Deutsch wörtlich, sonst Englisch mit Sprachsatz', () => {
  const de = zineTrend('de');
  assert.ok(de.startsWith('Du bist ein kreativer Food-Zine-Gestalter. Erstelle ein einziges, großes, spektakuläres Food-Zine-Poster') && de.includes('FORMAT: Poster im Standard-Querformat (Landscape)') && de.includes('8. Serviervorschlag für den perfekten Food-Post') && de.endsWith('Am Ende: KI nennt das gewählte Rezept + kurze Erklärung, warum es gerade viral geht.'));
  assert.ok(zineTrend('en').startsWith('You are a creative food zine designer.') && !zineTrend('en').includes('LANGUAGE') && zineTrend('ru').endsWith('in Russian.'));
  assert.equal(zineFotoHinweis('de'), '📷 Das beigefügte Foto zeigt das echte Gericht — nutze es als Vorlage für das Bild.'); assert.ok(/attached photo/.test(zineFotoHinweis('fr')));
});
test('keine neuen Kosten: der Kern ruft für das Food-Zine keine KI auf und greift nicht ins Netz', () => {
  assert.ok(!/fetch\(|\/ki\/|kiBild|openai|api\./i.test(QUELLE.replace(/https:\/\/(claude\.ai|chatgpt\.com)\/[a-z]*/g, '')), 'ein Netz- oder KI-Aufruf im Food-Zine-Kern');
});
test('Sammlung: anhängen, Reihenfolge, entfernen und zurücklegen, Übernommenes merken; nur eingebettete Bilder', async () => {
  const roh = new Map(), lager = { hol: async (k) => (roh.has(k) ? structuredClone(roh.get(k)) : null), setz: async (k, w) => { roh.set(k, structuredClone(w)); }, weg: async (k) => { roh.delete(k); } }, sm = zineSammlung(lager);
  assert.deepEqual(await sm.liste(), []);
  const neu = await sm.dazu([{ name: 'A', klein: J(1), gross: J(11) }, { name: 'B', klein: J(2), gross: J(12), orig: { art: 'blob' } }, { name: 'fremd', klein: 'https://fremd.example/x.jpg', gross: J(13) }, { name: 'C', klein: J(3), gross: 'javascript:1' }, { name: 'D', klein: J(4), gross: J(14), summe: 'abc', herkunft: 'zine:r-1:0' }]);
  assert.deepEqual(neu.map((e) => e.name), ['A', 'B', 'D'], 'eine fremde Vorschau oder ein Skript kommen nicht hinein');
  const l = await sm.liste(); assert.deepEqual(l.map((e) => e.name), ['A', 'B', 'D']); assert.equal(l[2].herkunft, 'zine:r-1:0');
  assert.deepEqual(await sm.hol(l[1].id), { gross: J(12), orig: { art: 'blob' } }); assert.equal(await sm.hol('gibt-es-nicht'), null);
  assert.deepEqual([...await sm.uebernommen()], ['abc']); await sm.merke(['def']); assert.deepEqual([...await sm.uebernommen()], ['abc', 'def']);
  await sm.ordnen([l[2].id, l[0].id]); assert.deepEqual((await sm.liste()).map((e) => e.name), ['D', 'A', 'B'], 'was nicht genannt ist, bleibt dahinter');
  const x = await sm.weg(l[0].id); assert.equal(x.stelle, 1); assert.deepEqual((await sm.liste()).map((e) => e.name), ['D', 'B']); assert.equal(await sm.hol(l[0].id), null);
  await sm.zurueck(x); assert.deepEqual((await sm.liste()).map((e) => e.name), ['D', 'A', 'B']); assert.deepEqual(await sm.hol(l[0].id), { gross: J(11), orig: null });
  await sm.zurueck(x); assert.equal((await sm.liste()).length, 3, 'zweimal zurücklegen macht kein Doppel'); assert.equal(await sm.weg('nicht-da'), null);
  assert.ok([...roh.keys()].every((k) => k === 'zine-sammlung' || k.startsWith('zine-bild:')), 'eigene Schlüssel im Lager: ' + [...roh.keys()].join(' '));
  assert.ok(!JSON.stringify(roh.get('zine-sammlung')).includes(J(11)), 'die Liste trägt nur die Vorschau, nicht das große Bild');
});
test('Sammlung: Einträge aus fremder Hand werden geprüft; verschieben; Dateien über 15 MB bleiben draußen', () => {
  assert.equal(zsEintrag({ klein: 'data:image/svg+xml;base64,PHN2Zz4=' }), null); assert.equal(zsEintrag(null), null);
  const e = zsEintrag({ id: '../../x', name: 'n'.repeat(300), klein: J(1), stand: 'kein Datum' }, { jetzt: new Date('2026-11-25T10:00:00Z') });
  assert.match(e.id, /^z-/); assert.equal(e.name.length, 120); assert.equal(e.stand, '2026-11-25T10:00:00.000Z');
  assert.deepEqual(zsVerschiebe(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']); assert.deepEqual(zsVerschiebe(['a', 'b'], 1, -4), ['b', 'a']); assert.deepEqual(zsVerschiebe(['a'], 5, 0), ['a']);
  assert.equal(ZS_DATEI_MAX, 15 * 1024 * 1024); const t = zsDateienTeilen([{ size: 1 }, { size: ZS_DATEI_MAX + 1 }]); assert.equal(t.gut.length, 1); assert.equal(t.zuGross.length, 1);
});
test('die alten Seiten am Rezept (bis Kern 0.27) werden herausgenommen; ohne Seiten bleibt die Liste dieselbe', () => {
  const rs = [normalisiere(R({ zine: [B(1), '', B(3)] })), normalisiere(R({ uid: 'r-2', id: 2, name: 'Brot' }))];
  const e = zineAusRezepten(rs);
  assert.deepEqual(e.bilder, [{ name: 'Rindergulasch · 1', gross: B(1), herkunft: 'zine:r-1:0' }, { name: 'Rindergulasch · 3', gross: B(3), herkunft: 'zine:r-1:2' }]);
  assert.ok(e.rezepte.every((r) => !('zine' in r))); assert.ok('zine' in rs[0], 'die Eingabe wurde verändert'); assert.equal(e.rezepte[1], rs[1]);
  const ohne = [rs[1]]; assert.equal(zineAusRezepten(ohne).rezepte, ohne); assert.deepEqual(zineAusRezepten(ohne).bilder, []);
});
test('das Feld `zine` am Rezept: nur data:-Bilder, normalisiere säubert es, Sicherungen (auch der alten App) tragen es weiter', () => {
  assert.deepEqual(zineFeld(['https://fremd.example/a.png', B(2), 'x', B(4)]), ['', B(2), '']); assert.equal(zineFeld(['https://fremd.example/a.png']), null); assert.equal(ZINE_SEITEN, 3);
  assert.deepEqual(normalisiere({ id: 5, name: 'Suppe', zine: [B(1), 'https://fremd.example/x.png', B(3)] }).zine, [B(1), '', B(3)]); assert.equal('zine' in normalisiere({ id: 6, name: 'Brot' }), false);
  const z = { ...leererZustand(), rezepte: [normalisiere(R({ zine: [B(1), '', B(3)] }))] }, e = lies(JSON.stringify(schreibe(z)));
  assert.deepEqual(e.rezepte[0].zine, [B(1), '', B(3)]); assert.deepEqual(fuehreZusammen(leererZustand(), e).zustand.rezepte[0].zine, [B(1), '', B(3)]);
  assert.equal(zineAusRezepten(e.rezepte).bilder.length, 2, 'aus einer alten Sicherung kommen sie in die Sammlung');
});
test('das mitgelieferte Paket „foodzine-beispiele“: je Satz drei Bilder für die Sammlung, mit Titel und Nummer', () => {
  const katalog = JSON.parse(readFileSync(new URL('../beispiele/KATALOG.json', import.meta.url), 'utf8')), p = katalog.pakete.find((x) => x.art === 'foodzine');
  const paket = JSON.parse(readFileSync(new URL('../beispiele/' + p.datei, import.meta.url), 'utf8')), b = zineSaetzeBilder(paket);
  assert.equal(paket.saetze.length, p.anzahl); assert.equal(b.length, p.anzahl * 3);
  assert.equal(b[0].name, paket.saetze[0].titel + ' · 1'); assert.ok(b.every((x) => /^data:image\//.test(x.gross) && x.herkunft.startsWith('beispiel:')));
  assert.deepEqual(zineSaetzeBilder({ saetze: [{ titel: 'X', seiten: [B(1), 'https://fremd.example/x.png', ''] }] }).map((x) => x.name), ['X · 1']); assert.deepEqual(zineSaetzeBilder(null), []);
});
test('ein Bild drucken: eine Seite ohne Skript, mit strenger Richtlinie; ein fremdes Bild kommt nicht hinein', () => {
  const h = zineDruck(J(7), { titel: 'Gulasch <b>', sprache: 'de' });
  assert.ok(h.includes(`<img src="${J(7)}"`) && h.includes("default-src 'none'; img-src data:") && !h.includes('<script') && h.includes('Gulasch &lt;b&gt;') && h.includes('@page{size:auto;margin:0}'));
  assert.ok(!zineDruck('https://fremd.example/x.png').includes('<img'));
});
