import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skaliere, zahlText } from '../kern/modell/mengen.mjs';
test('Mengen umrechnen: Zahlen, Brüche, Bereiche; Text bleibt stehen', () => {
  assert.equal(skaliere('200', 2), '400'); assert.equal(skaliere('1 ½', 2), '3'); assert.equal(skaliere('½', 2), '1');
  assert.equal(skaliere('1/2', 3), '1 ½'); assert.equal(skaliere('400-500', 0.5), '200-250'); assert.equal(skaliere('1,5', 2), '3');
  assert.equal(skaliere('etwas', 2), 'etwas'); assert.equal(skaliere('', 2), ''); assert.equal(skaliere('3', 1), '3');
  assert.equal(skaliere('1', 0.5), '½'); assert.equal(skaliere('250', 1.5), '375'); assert.equal(zahlText(0.33), '⅓');
});
