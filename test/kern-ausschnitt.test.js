import test from 'node:test'; import assert from 'node:assert/strict';
import { ausschnittRechteck as a } from '../kern/oberflaeche/bild.mjs';
const nah = (x, y) => assert.ok(Math.abs(x - y) < 1e-9, `${x} ≠ ${y}`);
test('Ausschnitt: breites Bild im quadratischen Rahmen, Mitte, links, rechts', () => {
  let r = a(2, 1); nah(r.w, 0.5); nah(r.h, 1); nah(r.l, 0.25); nah(r.t, 0);
  r = a(2, 1, 0); nah(r.l, 0); r = a(2, 1, 100); nah(r.l + r.w, 1);
});
test('Ausschnitt: hohes Bild im breiten Rahmen, oben und unten', () => {
  let r = a(0.5, 1.5, 50, 0); nah(r.w, 1); nah(r.h, 1 / 3); nah(r.t, 0); r = a(0.5, 1.5, 50, 100); nah(r.t + r.h, 1);
});
test('Ausschnitt: Zoom verkleinert den sichtbaren Teil um den gewählten Punkt', () => {
  const r = a(1, 1, 50, 50, 2); nah(r.w, 0.5); nah(r.l, 0.25); const o = a(1, 1, 0, 0, 2); nah(o.l, 0); nah(o.t, 0);
});
