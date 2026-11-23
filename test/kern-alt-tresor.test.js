// Proben: Tresor-Stände der alten App (kern/speicher/alt-tresor.mjs). Die alte Datenbank ist hier ein kleines Abbild im Speicher.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tresor, MAX_AUTO, MAX_BENANNT } from '../kern/speicher/tresor.mjs';
import { ausAltemTresor, leseAltenTresor, alteStaendeInTresor } from '../kern/speicher/alt-tresor.mjs';
import { lies } from '../kern/sicherung/sicherung.mjs';

const lagerNeu = () => { const m = new Map(); return { m, hol: async (k) => m.get(k) ?? null, setz: async (k, v) => { m.set(k, v); }, weg: async (k) => { m.delete(k); } }; };
const stand = (id, type, ts, name, rezepte, extra = {}) => ({ id, type, ts, name, recCnt: rezepte.length, r: JSON.stringify(rezepte), ms: '[]', fd: JSON.stringify([{ id: 7, name: 'Feste' }]), ...extra });
const SUPPE = { id: 1, name: 'Suppe', cat: 'suppe', ings: [{ amt: '1', unit: 'l', name: 'Wasser' }], steps: [{ txt: 'Kochen.' }] };
const KUCHEN = { id: 2, name: 'Kuchen', cat: 'kuchen', ings: [{ amt: '3', unit: '', name: 'Eier' }], steps: [{ txt: 'Backen.' }] };
/* Abbild von indexedDB: eine Datenbank mit dem Speicher „kv“; `angelegt` zählt, ob jemand eine fehlende Datenbank stehen ließ. */
function idbMit(dbs, { mitListe = true } = {}) {
  const angelegt = [];
  const frage = (wert) => { const a = {}; queueMicrotask(() => { a.result = wert; a.onsuccess && a.onsuccess(); }); return a; };
  return { angelegt, ...(mitListe ? { databases: async () => Object.keys(dbs).map((name) => ({ name })) } : {}),
    open(name) { const a = {}; queueMicrotask(() => {
      if (!dbs[name]) { let ab = false; a.transaction = { abort() { ab = true; } }; a.onupgradeneeded && a.onupgradeneeded(); if (ab) { a.error = new Error('abgebrochen'); a.onerror && a.onerror(); } else { angelegt.push(name); a.result = { objectStoreNames: { contains: () => false }, close() {} }; a.onsuccess && a.onsuccess(); } return; }
      a.result = { objectStoreNames: { contains: (s) => s === 'kv' }, close() {}, transaction: () => ({ objectStore: () => ({ get: (k) => frage(k in dbs[name] ? { k, v: dbs[name][k] } : undefined) }) }) }; a.onsuccess && a.onsuccess(); }); return a; } };
}
const ORT = { db: 'MeinRzBackup1', schluessel: 'mrz9m_bvault', bilder: 'mrz9m_bvi_' };

test('alte Stände werden Sicherungen, die lies() versteht: Name, Zeit, Art, Rezepte, Ordner; Bilder kommen zurück an ihr Rezept', () => {
  const s = ausAltemTresor([stand('man-1', 'manual', '2026-05-01T10:00:00.000Z', 'Vor dem Aufräumen', [SUPPE, KUCHEN]), stand('auto-1', 'auto', '2026-06-01T10:00:00.000Z', 'Auto 01.06.26 12:00', [SUPPE])], (id) => (id === 'man-1' ? { 2: 'data:image/jpeg;base64,QUJD' } : {}));
  assert.deepEqual(s.map((x) => [x.alt, x.art, x.name]), [['auto-1', 'auto', 'Auto 01.06.26 12:00'], ['man-1', 'benannt', 'Vor dem Aufräumen']], 'jüngste zuerst; „manual“ heißt hier „benannt“');
  const g = lies(s[1].sicherung);
  assert.deepEqual(g.rezepte.map((r) => r.name), ['Suppe', 'Kuchen']); assert.equal(g.ordner[0].name, 'Feste');
  assert.equal(g.rezepte[1].img, 'data:image/jpeg;base64,QUJD', 'das Bild hängt wieder am Rezept'); assert.equal(g.rezepte[0].img || '', '', 'ein Rezept ohne Bild bekommt keins');
  assert.equal(s[1].ts, '2026-05-01T10:00:00.000Z');
});
test('unlesbare Einträge fallen heraus und reißen die anderen nicht mit', () => {
  const s = ausAltemTresor([null, { id: 'x', r: '{kaputt', ts: '2026-01-01T00:00:00Z' }, { id: 'y', r: '[]', ts: 'kein Datum' }, { r: '[]', ts: '2026-01-01T00:00:00Z' }, stand('gut', 'manual', '2026-01-02T00:00:00Z', 'Gut', [SUPPE])]);
  assert.deepEqual(s.map((x) => x.alt), ['gut']); assert.deepEqual(ausAltemTresor(null), []); assert.deepEqual(ausAltemTresor('unsinn'), []);
});
test('gelesen wird aus der Datenbank der alten App: Liste und Bilder je Stand', async () => {
  const idb = idbMit({ MeinRzBackup1: { mrz9m_bvault: JSON.stringify([stand('man-1', 'manual', '2026-05-01T10:00:00.000Z', 'Mai', [SUPPE, KUCHEN])]), 'mrz9m_bvi_man-1': JSON.stringify({ 1: 'data:image/png;base64,QQ==' }), mrz9m_snap: '{}' } });
  const s = await leseAltenTresor(ORT, idb);
  assert.equal(s.length, 1); assert.equal(s[0].sicherung.recipes[0].img, 'data:image/png;base64,QQ=='); assert.equal(s[0].sicherung.recipes[1].img, undefined);
});
test('gibt es die alte Datenbank nicht, wird sie NICHT angelegt – mit und ohne databases()', async () => {
  for (const mitListe of [true, false]) { const idb = idbMit({ Andere: {} }, { mitListe }); assert.deepEqual(await leseAltenTresor(ORT, idb), []); assert.deepEqual(idb.angelegt, [], 'keine leere Datenbank bleibt zurück (databases: ' + mitListe + ')'); }
  assert.deepEqual(await leseAltenTresor(null, idbMit({})), []); assert.deepEqual(await leseAltenTresor(ORT, null), []);
});
test('in den neuen Tresor: mit Name und alter Zeit, nie doppelt, und ein alter Stand verdrängt keinen neuen', async () => {
  const t = tresor(lagerNeu());
  const eigen = await t.ablegen({ recipes: [1] }, 'benannt', 'Heute');
  const alt = ausAltemTresor([stand('man-1', 'manual', '2026-05-01T10:00:00.000Z', 'Mai', [SUPPE]), stand('auto-1', 'auto', '2026-06-01T10:00:00.000Z', 'Auto Juni', [SUPPE, KUCHEN])]);
  assert.deepEqual(await alteStaendeInTresor(t, alt), { dazu: 2, ausgelassen: 0 });
  let l = await t.liste();
  assert.deepEqual(l.map((x) => x.name), ['Heute', 'Auto Juni', 'Mai'], 'die Liste zeigt die jüngsten zuerst; die alten stehen mit ihrer Zeit darunter');
  assert.equal(l.find((x) => x.name === 'Mai').ts, '2026-05-01T10:00:00.000Z'); assert.equal(l.find((x) => x.name === 'Auto Juni').anzahl, 2);
  assert.deepEqual(lies(await t.hol(l.find((x) => x.name === 'Mai').id)).rezepte.map((r) => r.name), ['Suppe'], 'zurückholen geht wie bei jedem Stand');
  assert.deepEqual(await alteStaendeInTresor(t, alt), { dazu: 0, ausgelassen: 0 }, 'ein zweiter Lauf legt nichts doppelt ab');
  /* Voller Tresor: die benannten Plätze sind belegt – der alte Stand bleibt draußen, kein neuer fällt heraus. */
  const voll = tresor(lagerNeu()); for (let i = 0; i < MAX_BENANNT; i++) await voll.ablegen({ recipes: [i] }, 'benannt', 'Neu ' + i);
  assert.deepEqual(await alteStaendeInTresor(voll, alt), { dazu: 1, ausgelassen: 1 });
  l = await voll.liste(); assert.equal(l.filter((x) => x.art === 'benannt').length, MAX_BENANNT); assert.ok(l.filter((x) => x.art === 'benannt').every((x) => x.name.startsWith('Neu ')), 'kein neuer Stand wurde verdrängt');
  assert.ok(MAX_AUTO > 0 && (await t.hol(eigen)).recipes[0] === 1);
});
