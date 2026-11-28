import test from 'node:test'; import assert from 'node:assert/strict';
import { findeBlatt, entzerren, verbessern, drehen, eckenOrdnen, zielGroesse, ganzesBild, VERBESSERN_NEUTRAL } from '../kern/oberflaeche/blatt.mjs';

// Gestelltes Foto: dunkler, unruhiger Tisch, darauf ein helles Blatt als schräges Viereck (Perspektive), mit „Schrift“
const drin = (q, x, y) => { let c = false; for (let i = 0, j = 3; i < 4; j = i++) { const [xi, yi] = q[i], [xj, yj] = q[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
function foto(w, h, q, zufall = 7) {
  const d = new Uint8ClampedArray(w * h * 4); let s = zufall; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, auf = drin(q, x + 0.5, y + 0.5);
    if (auf) { const schrift = (y % 23 < 3) && (x % 40 < 30); d[i] = d[i + 1] = d[i + 2] = schrift ? 40 : 236; }
    else { const n = rnd() * 40; d[i] = 110 + n; d[i + 1] = 70 + n * 0.6; d[i + 2] = 40 + n * 0.3; }   /* Holztisch */
    d[i + 3] = 255;
  }
  return { data: d, width: w, height: h };
}
const Q = [[150, 90], [640, 130], [610, 560], [110, 520]];
const abstand = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

test('Blatt finden: ein schräg fotografiertes Blatt auf dem Tisch – alle vier Ecken auf 2 % der Diagonale genau', () => {
  const b = foto(800, 640, Q), r = findeBlatt(b), diag = Math.hypot(800, 640);
  assert.equal(r.sicher, true, r.grund);
  r.ecken.forEach((p, i) => assert.ok(abstand(p, Q[i]) < diag * 0.02, `Ecke ${i}: ${p} statt ${Q[i]}`));
});
test('Blatt finden: ohne Blatt (nur Tisch) wird nichts geschnitten – Ecken = ganzes Bild, mit Grund', () => {
  const b = foto(400, 300, [[0, 0], [1, 0], [1, 1], [0, 1]]), r = findeBlatt(b);
  assert.equal(r.sicher, false); assert.deepEqual(r.ecken, ganzesBild(b)); assert.ok(r.grund);
});
test('Blatt finden: füllt das Blatt schon das ganze Foto, bleibt es ganz', () => {
  const b = foto(400, 300, [[-5, -5], [405, -5], [405, 305], [-5, 305]]), r = findeBlatt(b);
  assert.equal(r.sicher, false); assert.deepEqual(r.ecken, ganzesBild(b));
});
test('Gerade ziehen: Größe aus den Kantenlängen, lange Kante gedeckelt, die Ecken des Ergebnisses zeigen Papier, nicht Tisch', () => {
  const b = foto(800, 640, Q), g = zielGroesse(Q);
  assert.ok(Math.abs(g.width - 495) < 6 && Math.abs(g.height - 430) < 6, JSON.stringify(g));
  assert.deepEqual(zielGroesse(Q, 200).width <= 200 && zielGroesse(Q, 200).height <= 200, true);
  const e = entzerren(b, Q), d = e.data, px = (x, y) => d[(y * e.width + x) * 4];
  for (const [x, y] of [[3, 3], [e.width - 4, 3], [e.width - 4, e.height - 4], [3, e.height - 4]]) assert.ok(px(x, y) > 200, `Ecke ${x},${y}: ${px(x, y)}`);
});
test('Gerade ziehen: überkreuz gezogene Ecken werden neu geordnet', () => {
  assert.deepEqual(eckenOrdnen([Q[2], Q[0], Q[3], Q[1]]), Q);
});
test('Drehen: 90° tauscht Breite und Höhe, 4 × 90° ist wieder das Original', () => {
  const b = foto(30, 20, [[2, 2], [20, 2], [20, 15], [2, 15]]), r = drehen(b, 1);
  assert.equal(r.width, 20); assert.equal(r.height, 30);
  assert.deepEqual(drehen(drehen(drehen(r, 1), 1), 1).data, b.data);
});
const mittel = (b) => { let s = 0; for (let i = 0; i < b.data.length; i += 4) s += b.data[i]; return s / (b.data.length / 4); };
const streuung = (b) => { const m = mittel(b); let s = 0; for (let i = 0; i < b.data.length; i += 4) s += (b.data[i] - m) ** 2; return Math.sqrt(s / (b.data.length / 4)); };
const buntheit = (b) => { let s = 0; for (let i = 0; i < b.data.length; i += 4) s += Math.max(b.data[i], b.data[i + 1], b.data[i + 2]) - Math.min(b.data[i], b.data[i + 1], b.data[i + 2]); return s / (b.data.length / 4); };
const kante = (b) => { let s = 0; const w = b.width; for (let y = 0; y < b.height; y++) for (let x = 1; x < w; x++) s += Math.abs(b.data[(y * w + x) * 4] - b.data[(y * w + x - 1) * 4]); return s; };
test('Verbessern: alles auf 0 lässt das Bild Byte für Byte, wie es ist', () => {
  const b = foto(120, 90, Q.map((p) => [p[0] / 7, p[1] / 7])); assert.deepEqual(verbessern(b, VERBESSERN_NEUTRAL).data, b.data);
});
test('Verbessern: Helligkeit hebt den Mittelwert, Kontrast die Streuung, Farbe die Buntheit (schmal), Schärfe die Kanten', () => {
  const b = foto(160, 120, Q.map((p) => [p[0] / 5, p[1] / 5]));
  assert.ok(mittel(verbessern(b, { hell: 30 })) > mittel(b) + 20);
  assert.ok(mittel(verbessern(b, { hell: -30 })) < mittel(b) - 20);
  const v = { data: new Uint8ClampedArray(100 * 4 * 10), width: 100, height: 10 }; for (let i = 0; i < 1000; i++) { v.data.fill(80 + (i % 100) * 0.9, i * 4, i * 4 + 3); v.data[i * 4 + 3] = 255; }   /* Grauverlauf 80–170: läuft nicht an Weiß an */
  assert.ok(streuung(verbessern(v, { kontrast: 40 })) > streuung(v) * 1.5);
  assert.ok(streuung(verbessern(v, { kontrast: -40 })) < streuung(v) * 0.7);
  assert.ok(buntheit(verbessern(b, { farbe: 40 })) > buntheit(b) * 1.2 && buntheit(verbessern(b, { farbe: 40 })) < buntheit(b) * 1.6, 'Farbe nur wenig');
  assert.ok(buntheit(verbessern(b, { farbe: 999 })) === buntheit(verbessern(b, { farbe: 40 })), 'Farbe ist auf 40 gedeckelt');
  assert.ok(kante(verbessern(b, { schaerfe: 60 })) > kante(b) * 1.1);
});
