// Proben: Event-Ordner (R19, Klaus 25.11.2026) – Anlass mit Datum und Gästen, in den Kalender übernehmen, abgleichen,
// Einkaufsliste mit Gästezahl, Menükarte, Portionen im Plan und in der Sicherung.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anlegen, legeIn, eventSetzen, eventWeg, istEvent, eventDatum, gaenge, inKalender, abgleich, abgleichAnwenden, eventEinkauf, eventAusDatei, loeschen } from '../kern/modell/ordner.mjs';
import { portionenIm, portionenSetzen, entplanenMit, verschiebe, portionenListe, planen } from '../kern/modell/plan.mjs';
import { normalisiere } from '../kern/modell/rezept.mjs';
import { lies, schreibe, fuehreZusammen } from '../kern/sicherung/sicherung.mjs';
import { druckMenuekarte } from '../kern/ausgabe/druck.mjs';

const R = (o) => normalisiere({ name: 'X', cat: 'fleisch', servings: 4, ings: [{ amt: '200', unit: 'g', name: 'Mehl' }], steps: ['a'], ...o });
const FOLGE = ['suppen', 'fleisch', 'dessert'];
function hochzeit() {
  const a = anlegen([], 'Hochzeit von Jonas und Lisa'); let rezepte = [R({ uid: 'd', name: 'Mousse', cat: 'dessert' }), R({ uid: 'f', name: 'Braten' }), R({ uid: 's', name: 'Suppe', cat: 'suppen' }), R({ uid: 'x', name: 'Anderes' })];
  for (const u of ['d', 'f', 's']) rezepte = legeIn(rezepte, a.ordner, u, a.id);
  return { id: a.id, stand: { rezepte, ordner: eventSetzen(a.ordner, a.id, { datum: '2027-06-12', gaeste: 40 }), plan: { '2027-06-12': ['x'] }, portionen: {} } };
}

test('Anlass setzen: nur echte Daten, Gäste 1–999, Felder einzeln änderbar, wieder weg', () => {
  const a = anlegen([], 'Fest'); let o = eventSetzen(a.ordner, a.id, {}); assert.ok(istEvent(o[0])); assert.deepEqual(o[0].event, {});
  o = eventSetzen(o, a.id, { datum: '2027-02-30', gaeste: '0' }); assert.deepEqual(o[0].event, {}, 'kein 30. Februar, keine 0 Gäste');
  o = eventSetzen(o, a.id, { datum: '2027-06-12' }); o = eventSetzen(o, a.id, { gaeste: '12.6' }); assert.deepEqual(o[0].event, { datum: '2027-06-12', gaeste: 13 });
  assert.equal(eventSetzen(o, a.id, { gaeste: 5000 })[0].event.gaeste, 999);
  assert.equal(eventSetzen(o, a.id, { datum: '' })[0].event.datum, undefined, 'leeres Datum nimmt es heraus');
  assert.ok(!istEvent(eventWeg(o, a.id)[0])); assert.equal(eventWeg(o, a.id)[0].name, 'Fest');
  assert.equal(eventDatum(' 2027-01-01 '), '2027-01-01'); assert.equal(eventDatum('1.1.2027'), '');
});
test('Gänge folgen der Kategorien-Folge, unbekannte hinten', () => {
  const { stand, id } = hochzeit();
  assert.deepEqual(gaenge(stand.rezepte, stand.ordner, id, FOLGE).map((g) => [g.kat, g.rezepte.map((r) => r.uid)]), [['suppen', ['s']], ['fleisch', ['f']], ['dessert', ['d']]]);
  assert.deepEqual(gaenge(stand.rezepte, stand.ordner, id, []).map((g) => g.kat), ['dessert', 'fleisch', 'suppen'], 'ohne Folge: Reihenfolge des Buchs');
});
test('In den Kalender: alle Gerichte am Tag, in Gängen, Portionen = Gäste; Eigenes am Tag bleibt; ohne Datum nichts', () => {
  const { stand, id } = hochzeit(), k = inKalender(stand, id, FOLGE);
  assert.deepEqual(k.plan['2027-06-12'], ['x', 's', 'f', 'd']); assert.equal(k.neu, 3); assert.equal(k.schon, 0);
  assert.equal(portionenIm(k.portionen, '2027-06-12', 'f'), 40); assert.equal(portionenIm(k.portionen, '2027-06-12', 'x'), 0, 'das eigene Gericht behält seine Portionen');
  assert.deepEqual(k.ordner[0].event.kalender, { datum: '2027-06-12', gaeste: 40, gerichte: { s: '2027-06-12', f: '2027-06-12', d: '2027-06-12' } });
  assert.equal(abgleich({ ...stand, ...k }, id).offen, false, 'gleich nach der Übernahme gibt es nichts abzugleichen');
  const zwei = inKalender({ ...stand, ...k }, id, FOLGE); assert.equal(zwei.neu, 0); assert.equal(zwei.schon, 3); assert.deepEqual(zwei.plan['2027-06-12'], ['x', 's', 'f', 'd'], 'zweimal übernehmen doppelt nichts');
  assert.equal(inKalender({ ...stand, ordner: eventSetzen(stand.ordner, id, { datum: '' }) }, id), null);
  assert.equal(abgleich(stand, id), null, 'nie übernommen: nichts abzugleichen');
});
test('Abgleich: neu, fehlt, Datum verschoben, Gäste geändert – und nach der Entscheidung still', () => {
  const { stand, id } = hochzeit(); let z = { ...stand, ...inKalender(stand, id, FOLGE) };
  z.rezepte = legeIn(z.rezepte, z.ordner, 'x', id);        // neu im Ordner
  z.rezepte = legeIn(z.rezepte, z.ordner, 'd', '');        // fehlt im Ordner
  z.ordner = eventSetzen(z.ordner, id, { datum: '2027-06-13', gaeste: 45 });
  const a = abgleich(z, id);
  assert.deepEqual(a.neu, ['x']); assert.deepEqual(a.fehlt, ['d']); assert.deepEqual(a.verschoben.map((v) => [v.uid, v.von, v.nach]), [['s', '2027-06-12', '2027-06-13'], ['f', '2027-06-12', '2027-06-13']]);
  assert.deepEqual(a.gaeste, { von: 40, nach: 45 }); assert.equal(a.offen, true);
  const j = abgleichAnwenden(z, id, { neu: ['x'], fehlt: ['d'], verschieben: true, gaeste: true });
  assert.deepEqual(j.plan['2027-06-13'], ['s', 'f', 'x']); assert.deepEqual(j.plan['2027-06-12'], ['x'], 'das eigene x am alten Tag bleibt; d ist weg');
  assert.equal(portionenIm(j.portionen, '2027-06-13', 's'), 45); assert.equal(portionenIm(j.portionen, '2027-06-13', 'x'), 45); assert.equal(portionenIm(j.portionen, '2027-06-12', 'd'), 0);
  assert.equal(abgleich({ ...z, ...j }, id).offen, false);
  const n = abgleichAnwenden(z, id, {});   // alles „nein“: der Kalender bleibt, wie er ist, gefragt wird nicht wieder
  assert.deepEqual(n.plan, z.plan); assert.equal(n.geaendert, 0); assert.equal(abgleich({ ...z, ...n }, id).offen, false);
  assert.equal(n.ordner[0].event.kalender.gerichte.x, null, 'bekannt, bewusst nicht im Kalender');
  z.rezepte = legeIn(z.rezepte, z.ordner, 's', ''); const geloescht = { ...z, rezepte: z.rezepte.filter((r) => r.uid !== 's') };
  assert.ok(!abgleich(geloescht, id).fehlt.includes('s'), 'ein gelöschtes Rezept ist keine Frage');
});
test('Ordner löschen oder „kein Anlass mehr“: der Kalender bleibt', () => {
  const { stand, id } = hochzeit(), k = inKalender(stand, id, FOLGE), l = loeschen(stand.rezepte, k.ordner, id);
  assert.equal(l.ordner.length, 0); assert.deepEqual(k.plan['2027-06-12'].length, 4);
});
test('Einkaufsliste: Portionen = Gäste, schon vorhandene werden angepasst; ohne Gäste die des Rezepts', () => {
  const { stand, id } = hochzeit(), e = eventEinkauf([{ uid: 'f', portionen: 4 }, { uid: 'x', portionen: 2 }], stand.rezepte, stand.ordner, id);
  assert.deepEqual(e.posten, [{ uid: 'f', portionen: 40 }, { uid: 'x', portionen: 2 }, { uid: 'd', portionen: 40 }, { uid: 's', portionen: 40 }]); assert.equal(e.neu, 2); assert.equal(e.angepasst, 1);
  assert.equal(eventEinkauf(e.posten, stand.rezepte, stand.ordner, id).angepasst, 0, 'zweimal ändert nichts');
  const ohne = eventEinkauf([], stand.rezepte, eventSetzen(stand.ordner, id, { gaeste: '' }), id); assert.ok(ohne.posten.every((p) => p.portionen === 4));
});
test('Portionen im Plan: setzen, mitnehmen beim Entplanen, verschieben, aus der Datei', () => {
  let p = portionenSetzen({}, '2027-01-01', 'a', 8); assert.equal(portionenIm(p, '2027-01-01', 'a'), 8);
  assert.deepEqual(portionenSetzen(p, '2027-01-01', 'a', 0), {});
  const e = entplanenMit(planen({}, '2027-01-01', 'a'), p, '2027-01-01', 'a'); assert.deepEqual(e, { plan: {}, portionen: {} });
  const v = verschiebe(planen({}, '2027-01-01', 'a'), p, '2027-01-01', '2027-01-02', 'a'); assert.deepEqual(v.plan, { '2027-01-02': ['a'] }); assert.equal(portionenIm(v.portionen, '2027-01-02', 'a'), 8);
  assert.deepEqual(portionenListe({ '2027-01-01': { a: '3', b: -1, c: 'x' }, kaputt: { a: 1 }, '2027-01-02': null }), { '2027-01-01': { a: 3 } });
});
test('Sicherung trägt Anlass und Portionen; fremde Felder fallen weg; Ersetzen übernimmt sie, Hinzufügen nicht', () => {
  const { stand, id } = hochzeit(), k = inKalender(stand, id, FOLGE), z = { ...stand, ...k, planPortionen: k.portionen, menu: [] };
  const datei = JSON.parse(JSON.stringify(schreibe(z))); datei.folders[0].event.boese = '<script>'; datei.folders[0].event.kalender.gerichte.y = 'gestern';
  const l = lies(JSON.stringify(datei));
  assert.deepEqual(l.ordner[0].event, { datum: '2027-06-12', gaeste: 40, kalender: { datum: '2027-06-12', gaeste: 40, gerichte: { s: '2027-06-12', f: '2027-06-12', d: '2027-06-12' } } });
  assert.equal(portionenIm(l.planPortionen, '2027-06-12', 'd'), 40);
  assert.deepEqual(fuehreZusammen({ rezepte: [], plan: {} }, l, 'ersetzen').zustand.planPortionen, l.planPortionen);
  assert.equal(fuehreZusammen({ rezepte: [], plan: {}, planPortionen: { a: 1 } }, l, 'dazu').zustand.planPortionen.a, 1, 'Hinzufügen: der eigene Plan bleibt');
  assert.equal(eventAusDatei('x'), undefined); assert.deepEqual(eventAusDatei({ datum: 'morgen', gaeste: 'viele' }), {});
});
test('Menükarte: Anlass, Datum, Gänge, entschärft, ohne Gästezahl', () => {
  const h = druckMenuekarte({ titel: 'Hochzeit <Jonas>', datum: '2027-06-12', gaenge: [{ titel: 'Suppen', gerichte: [{ name: 'Suppe', text: 'mit Brot' }] }, { titel: 'Leer', gerichte: [] }] }, { fuss: 'Mein Rezeptbuch' });
  assert.match(h, /Hochzeit &lt;Jonas&gt;/); assert.match(h, /Samstag, 12\. Juni 2027/); assert.match(h, /<h2>Suppen<\/h2><p class="g">Suppe<\/p><p class="t">mit Brot<\/p>/);
  assert.ok(!h.includes('Leer'), 'ein leerer Gang steht nicht da'); assert.ok(!h.includes('stern'.repeat(2)));
  assert.match(druckMenuekarte({}, { sprache: 'en' }), /No dish in the menu yet/);
});
test('Hinzufügen bricht nicht ab, wenn der eigene Kategorien-Stand unvollständig ist (älterer Speicher)', () => {
  const l = lies(JSON.stringify({ version: 11, recipes: [{ uid: 'n1', name: 'Neu', steps: ['a'] }], menu: [], folders: [] }));
  const m = fuehreZusammen({ rezepte: [], ordner: [], kategorien: { namen: { a: { name: 'A' } } } }, l, 'dazu');
  assert.equal(m.neu, 1); assert.deepEqual(m.zustand.kategorien.namen, { a: { name: 'A' } }); assert.deepEqual(m.zustand.kategorien.eigene, []);
});
