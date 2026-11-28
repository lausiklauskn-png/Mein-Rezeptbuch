// Wächter: jede Aktion (data-a) steht in neu/app.mjs genau EINMAL im Objekt A. Ein doppelter Schlüssel wird still überschrieben –
// am 28.11.2026 hieß „Gerade ziehen & verbessern“ zuerst `blatt`, und `blatt` (Blättern) stand weiter unten: der Knopf tat nichts.
import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
test('Aktionen in neu/app.mjs: kein Name doppelt', () => {
  const q = readFileSync('neu/app.mjs', 'utf8'), a = q.indexOf('\nconst A = {'), e = q.indexOf('\n};', a);
  assert.ok(a > 0 && e > a, 'Objekt A gefunden');
  const namen = [...q.slice(a, e).matchAll(/^ {2}(?:'([^']+)'|([A-Za-z_$][\w$]*)): ?(?:\(|async|function|[a-zA-Z(])/gm)].map((m) => m[1] || m[2]);
  assert.ok(namen.length > 100, String(namen.length));
  const doppelt = namen.filter((n, i) => namen.indexOf(n) !== i);
  assert.deepEqual(doppelt, []);
});
