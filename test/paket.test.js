// Die mitgelieferten Beispiele müssen wenigstens fehlerfrei sein (Klaus 23.11.2026). Kern-Baustein „Paket prüfen“.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const B = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'beispiele');
test('Beispielpakete: Kategorie bekannt, Zutaten und Schritte da, lesbare Mengen, kein Englisch, kein Siezen, Zutaten kommen vor', async () => {
  const { pruefePaket } = await import('../kern/pruefung/paket.mjs'); const { KATEGORIEN_FEST } = await import('../kern/modell/kategorien-fest.mjs');
  const katalog = JSON.parse(fs.readFileSync(path.join(B, 'KATALOG.json'), 'utf8')); let geprueft = 0;
  for (const p of katalog.pakete) { const d = JSON.parse(fs.readFileSync(path.join(B, p.datei), 'utf8')); if (!Array.isArray(d.recipes)) continue; geprueft++;
    assert.equal(d.recipes.length, p.anzahl, p.id + ': Anzahl wie im Katalog');
    const eigene = Array.isArray(d.kategorien) ? d.kategorien : (d.kategorien && d.kategorien.eigene) || [];
    const kats = new Set([...KATEGORIEN_FEST.map((c) => c.id), ...eigene.map((c) => c.id)]);
    assert.deepEqual(pruefePaket(d.recipes, { kategorien: kats }), [], p.id); }
  assert.ok(geprueft >= 2, 'mindestens zwei Pakete geprüft');
});
test('Paket prüfen fängt die bekannten Fehler (Gegenprobe)', async () => {
  const { pruefePaket } = await import('../kern/pruefung/paket.mjs');
  const gut = { uid: 'a', name: 'Suppe', cat: 'suppen', servings: 2, ings: [{ name: 'Möhren', amt: '2' }, { name: 'Wasser', amt: '1' }], steps: [{ txt: 'Möhren in Wasser andünsten.' }] };
  assert.deepEqual(pruefePaket([gut], { kategorien: new Set(['suppen']) }), [], '„andünsten“ ist kein Englisch');
  const f = (aend) => pruefePaket([{ ...gut, ...aend }], { kategorien: new Set(['suppen']) }).join(' | ');
  assert.match(f({ cat: 'bowle' }), /unbekannte Kategorie/); assert.match(f({ ings: [{ name: 'Red wine', amt: '2' }, { name: 'Wasser', amt: '1' }] }), /englisch|keinem Schritt/);
  assert.match(f({ steps: [{ txt: 'Geben Sie Möhren und Wasser in den Topf.' }] }), /Sie-Anrede/); assert.match(f({ ings: [{ name: 'Möhren', amt: 'to fill' }, { name: 'Wasser', amt: '1' }] }), /Menge/);
  assert.match(f({ ings: [{ name: 'Möhren', amt: '2' }, { name: 'Zimt', amt: '1' }] }), /Zimt.*keinem Schritt/); assert.match(f({ servings: 0 }), /Portionen/);
});
