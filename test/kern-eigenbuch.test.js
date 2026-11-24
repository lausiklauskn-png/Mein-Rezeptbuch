// Proben: Kreativbuch Teil 2 im Kern (kern/ausgabe/eigenbuch.mjs) – Grenzen der alten App, Bilder anhängen und verschieben, das Buch aus
// Bildern (Blättern und Drucken), Projekte (Form, Speicher mit gestelltem Lager, Löschen und Zurücklegen), die .kreativbuch-Datei.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EB_MAX, EB_DATEI_MAX, EB_KANTE, EB_KLEIN, EB_GUETE, ebBild, ebDazu, ebVerschiebe, ebDateienTeilen, ebBlaettern, ebPdf, kbProjekt, kbProjekte, kbProjektDatei, kbProjektAusDatei, kbProjektZahlen } from '../kern/ausgabe/eigenbuch.mjs';
import { BLAETTER_SKRIPT, BLAETTER_PRUEFSUMME } from '../kern/ausgabe/buch.mjs';

const BILD = (n) => 'data:image/jpeg;base64,' + 'QUJD'.repeat(n);
const B = (i) => ({ name: 'Foto ' + i + '.jpg', gross: BILD(i + 2), klein: BILD(1) });

test('die Grenzen der alten App: 30 Bilder, 15 MB je Datei, 1600 und 320 px, JPEG 85 %', () => {
  assert.deepEqual([EB_MAX, EB_DATEI_MAX, EB_KANTE, EB_KLEIN, EB_GUETE], [30, 15 * 1024 * 1024, 1600, 320, 0.85]);
  const t = ebDateienTeilen([{ size: 10 }, { size: EB_DATEI_MAX }, { size: EB_DATEI_MAX + 1 }]);
  assert.equal(t.gut.length, 2); assert.equal(t.zuGross.length, 1);
});

test('anhängen bis zur Grenze, der Rest wird gezählt; nur eingebettete Bilder kommen hinein; verschieben', () => {
  const voll = ebDazu([], Array.from({ length: 28 }, (_, i) => B(i)));
  assert.equal(voll.liste.length, 28); assert.equal(voll.dazu, 28);
  const mehr = ebDazu(voll.liste, [B(40), B(41), B(42), B(43)]);
  assert.equal(mehr.liste.length, EB_MAX); assert.equal(mehr.dazu, 2); assert.equal(mehr.uebrig, 2);
  assert.equal(ebBild({ name: 'x', gross: 'https://fremd.example/bild.jpg' }), null, 'ein Bild aus dem Netz kommt nicht ins Buch');
  assert.equal(ebBild({ name: 'x', gross: BILD(2) }).klein, BILD(2), 'ohne Vorschau dient das große Bild als Vorschau');
  const l = [B(0), B(1), B(2), B(3)];
  assert.deepEqual(ebVerschiebe(l, 0, 2).map((b) => b.name), ['Foto 1.jpg', 'Foto 2.jpg', 'Foto 0.jpg', 'Foto 3.jpg']);
  assert.deepEqual(ebVerschiebe(l, 3, -5).map((b) => b.name)[0], 'Foto 3.jpg');
  assert.deepEqual(ebVerschiebe(l, 9, 0), l);
});

test('das Buch aus Bildern: Deckblatt, je Bild eine Seite, genau das Blätter-Skript; zum Drucken ohne Skript; alles entschärft', () => {
  const bilder = [B(0), { ...B(1), name: '<b>Kuchen</b>' }, { name: 'fremd', gross: 'javascript:alert(1)' }];
  const h = ebBlaettern(bilder, { titel: 'Omas <Buch>', sprache: 'de', datum: '1. Januar 2026' });
  assert.equal(h.match(/<section class="seite[^"]*"/g).length, 1 + 2, 'Deckblatt und zwei Bilder (das fremde fällt heraus)');
  assert.ok(h.includes(`src="${B(0).gross}"`) && h.includes(`src="${B(1).gross}"`) && !h.includes('javascript:'));
  assert.ok(h.includes('Omas &lt;Buch&gt;') && h.includes('alt="&lt;b&gt;Kuchen&lt;/b&gt;"') && h.includes('2 Bilder · 1. Januar 2026'));
  assert.equal(h.match(/<script>/g).length, 1); assert.ok(h.includes(`<script>${BLAETTER_SKRIPT}</script>`) && h.includes(BLAETTER_PRUEFSUMME));
  assert.ok(h.includes('id="zum-inhalt"') && h.includes('#zum-inhalt{display:none}'), 'der Inhalt-Knopf bleibt fürs Skript da, ist aber verborgen');
  const pdf = ebPdf(bilder, { sprache: 'en' });
  assert.ok(!pdf.includes('<script') && pdf.includes("default-src 'none'") && pdf.includes('2 pictures') && pdf.includes('>Creative book<'));
  assert.ok(ebBlaettern([], {}).includes('Das Buch ist leer.'));
});

test('ein Projekt: Form, Texte nur bekannter Stile und bereinigt, höchstens 30 Bilder, eine Auswahl nur in der Form k:/o:', () => {
  const p = kbProjekt({ name: '  Sommer  ', wahl: 'k:fleisch', stil: 'nordisch', eigen: 'x'.repeat(500), bilder: Array.from({ length: 40 }, (_, i) => B(i)),
    texte: { 'r-1': { nordisch: { intro: ' Hallo ', boese: 'x' }, erfunden: { intro: 'y' } }, 'r-2': { auto: { nichts: 1 } } } }, { jetzt: new Date('2026-11-24T10:00:00Z') });
  assert.match(p.id, /^p-/); assert.equal(p.name, 'Sommer'); assert.equal(p.stand, '2026-11-24T10:00:00.000Z'); assert.equal(p.wahl, 'k:fleisch'); assert.equal(p.stil, 'nordisch');
  assert.equal(p.eigen.length, 300); assert.equal(p.bilder.length, EB_MAX); assert.deepEqual(p.texte, { 'r-1': { nordisch: { intro: 'Hallo' } } });
  assert.deepEqual(kbProjektZahlen(p), { bilder: 30, texte: 1 });
  assert.equal(kbProjekt({ wahl: 'x:boese', stil: 'gibts-nicht' }).wahl, ''); assert.equal(kbProjekt({ stil: 'gibts-nicht' }).stil, 'auto');
  assert.equal(kbProjekt({ id: 'p-abc-12' }).id, 'p-abc-12', 'eine gültige Kennung bleibt (ersetzen)');
});

test('Projekte im Lager: ablegen, Liste (neueste zuerst), ersetzen mit gleicher Kennung, löschen und zurücklegen', async () => {
  const roh = new Map(), lager = { hol: async (k) => roh.get(k) ?? null, setz: async (k, w) => { roh.set(k, structuredClone(w)); }, weg: async (k) => { roh.delete(k); } };
  const P = kbProjekte(lager);
  const a = await P.ablegen({ name: 'A', stand: '2026-11-20T00:00:00.000Z', bilder: [B(0)] });
  const b = await P.ablegen({ name: 'B', stand: '2026-11-22T00:00:00.000Z', texte: { u: { auto: { intro: 'i' } } } });
  assert.deepEqual((await P.liste()).map((x) => [x.name, x.bilder, x.texte]), [['B', 0, 1], ['A', 1, 0]]);
  assert.ok(![...roh.keys()].some((k) => k.startsWith('tresor')), 'eigene Schlüssel, neben dem Tresor');
  await P.ablegen({ ...a, name: 'A2', bilder: [B(0), B(1)] });
  assert.equal((await P.liste()).length, 2); assert.equal((await P.hol(a.id)).bilder.length, 2);
  const weg = await P.loeschen(b.id);
  assert.equal(weg.name, 'B'); assert.equal(await P.hol(b.id), null); assert.equal((await P.liste()).length, 1);
  await P.ablegen(weg); assert.deepEqual((await P.liste()).map((x) => x.name), ['B', 'A2'], 'zurückgelegt mit derselben Kennung und demselben Stand');
  assert.equal(await P.loeschen('p-gibtsnicht'), null);
});

test('die .kreativbuch-Datei: das Format der alten App (v:1, images) plus kreativ; liest alte Dateien; fremder Inhalt wird gesagt', () => {
  const p = kbProjekt({ name: 'Mein Buch', stil: 'rustikal', texte: { u: { rustikal: { intro: 'i' } } }, bilder: [B(0), B(1)] });
  const d = JSON.parse(kbProjektDatei(p));
  assert.equal(d.v, 1); assert.deepEqual(d.images.map((x) => Object.keys(x)), [['name', 'thumbUrl', 'exportUrl'], ['name', 'thumbUrl', 'exportUrl']]); assert.equal(d.images[1].exportUrl, B(1).gross);
  const zurueck = kbProjektAusDatei(JSON.stringify(d));
  assert.notEqual(zurueck.id, p.id, 'eine eingelesene Datei bekommt eine neue Kennung'); assert.equal(zurueck.name, 'Mein Buch'); assert.equal(zurueck.stil, 'rustikal'); assert.deepEqual(zurueck.texte, p.texte); assert.equal(zurueck.bilder.length, 2);
  const alt = kbProjektAusDatei(JSON.stringify({ v: 1, images: [{ name: 'a.jpg', thumbUrl: BILD(1), exportUrl: BILD(3) }, { name: 'b.pdf', thumbUrl: 'data:image/png;base64,QQ==', exportUrl: null, isPdf: true }] }), { name: 'mein-kreativbuch' });
  assert.equal(alt.name, 'mein-kreativbuch'); assert.equal(alt.bilder.length, 1, 'der PDF-Platzhalter der alten App kommt nicht mit'); assert.equal(alt.bilder[0].gross, BILD(3));
  assert.throws(() => kbProjektAusDatei('{"recipes":[]}'), /kein Kreativbuch/); assert.throws(() => kbProjektAusDatei('kaputt', { sprache: 'en' }), /not a creative book/);
});
