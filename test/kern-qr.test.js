// Proben: Teilen per QR-Code (kern/teilen/qr.mjs). Kein Netz, keine fremde Datei.
// Die wichtigste Probe ist der Rundlauf: unten steht ein kleiner QR-LESER, unabhängig vom Erzeuger geschrieben
// (eigene Tabellen der Norm, eigene Masken-Regeln, eigener Zickzack, eigene Rechnung im Körper GF(256)).
// Er wendet keine Fehlerkorrektur an, prüft aber, dass jeder Block ein gültiges Reed-Solomon-Wort ist (alle Syndrome 0).
// Zusätzlich im Arbeitsordner gemessen (2026-11-23), nicht Teil dieser Datei: für alle 40 Versionen × 4 Stufen ist das Feld
// bei gleicher Maske bitgleich mit dem von qrcode-generator (Kazuhiko Arase), der Bibliothek der alten App (336 Fälle).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { rezeptAlsText, teilDaten, teilLink, ausTeilLink, TEIL_MAX_BYTES, qrCode, qrMatrix, qrSvg, passtInQr, qrPlan, qrVersion, qrGroesse, qrAusrichtung,
  qrFormatBits, qrVersionsBits, qrDatenworte, qrCodeworte, rsPruefworte, qrStrafe, QR_MAX_BYTES, QR_MASKEN, QR_STUFEN } from '../kern/teilen/qr.mjs';

// ───────────── Tabellen der Norm (ISO/IEC 18004), bewusst in anderer Schreibweise als im Erzeuger ─────────────
// Anhang E: Mitten der Ausrichtungs-Muster je Version.
const AUSRICHTUNG = ('; 6,18; 6,22; 6,26; 6,30; 6,34; 6,22,38; 6,24,42; 6,26,46; 6,28,50; 6,30,54; 6,32,58; 6,34,62; 6,26,46,66; 6,26,48,70; 6,26,50,74; 6,30,54,78; 6,30,56,82; 6,30,58,86; 6,34,62,90; ' +
  '6,28,50,72,94; 6,26,50,74,98; 6,30,54,78,102; 6,28,54,80,106; 6,32,58,84,110; 6,30,58,86,114; 6,34,62,90,118; 6,26,50,74,98,122; 6,30,54,78,102,126; 6,26,52,78,104,130; 6,30,56,82,108,134; ' +
  '6,34,60,86,112,138; 6,30,58,86,114,142; 6,34,62,90,118,146; 6,30,54,78,102,126,150; 6,24,50,76,102,128,154; 6,28,54,80,106,132,158; 6,32,58,84,110,136,162; 6,26,54,82,110,138,166; 6,30,58,86,114,142,170')
  .split(';').map((s) => s.trim()).map((s) => (s ? s.split(',').map(Number) : []));
// Tabelle 9: Blöcke je Version (Zeile) und Stufe (L, M, Q, H) als Tripel „Anzahl, Codeworte je Block, Datenworte je Block“.
const BLOCK_TABELLE = [
  [1,26,19], [1,26,16], [1,26,13], [1,26,9],
  [1,44,34], [1,44,28], [1,44,22], [1,44,16],
  [1,70,55], [1,70,44], [2,35,17], [2,35,13],
  [1,100,80], [2,50,32], [2,50,24], [4,25,9],
  [1,134,108], [2,67,43], [2,33,15,2,34,16], [2,33,11,2,34,12],
  [2,86,68], [4,43,27], [4,43,19], [4,43,15],
  [2,98,78], [4,49,31], [2,32,14,4,33,15], [4,39,13,1,40,14],
  [2,121,97], [2,60,38,2,61,39], [4,40,18,2,41,19], [4,40,14,2,41,15],
  [2,146,116], [3,58,36,2,59,37], [4,36,16,4,37,17], [4,36,12,4,37,13],
  [2,86,68,2,87,69], [4,69,43,1,70,44], [6,43,19,2,44,20], [6,43,15,2,44,16],
  [4,101,81], [1,80,50,4,81,51], [4,50,22,4,51,23], [3,36,12,8,37,13],
  [2,116,92,2,117,93], [6,58,36,2,59,37], [4,46,20,6,47,21], [7,42,14,4,43,15],
  [4,133,107], [8,59,37,1,60,38], [8,44,20,4,45,21], [12,33,11,4,34,12],
  [3,145,115,1,146,116], [4,64,40,5,65,41], [11,36,16,5,37,17], [11,36,12,5,37,13],
  [5,109,87,1,110,88], [5,65,41,5,66,42], [5,54,24,7,55,25], [11,36,12,7,37,13],
  [5,122,98,1,123,99], [7,73,45,3,74,46], [15,43,19,2,44,20], [3,45,15,13,46,16],
  [1,135,107,5,136,108], [10,74,46,1,75,47], [1,50,22,15,51,23], [2,42,14,17,43,15],
  [5,150,120,1,151,121], [9,69,43,4,70,44], [17,50,22,1,51,23], [2,42,14,19,43,15],
  [3,141,113,4,142,114], [3,70,44,11,71,45], [17,47,21,4,48,22], [9,39,13,16,40,14],
  [3,135,107,5,136,108], [3,67,41,13,68,42], [15,54,24,5,55,25], [15,43,15,10,44,16],
  [4,144,116,4,145,117], [17,68,42], [17,50,22,6,51,23], [19,46,16,6,47,17],
  [2,139,111,7,140,112], [17,74,46], [7,54,24,16,55,25], [34,37,13],
  [4,151,121,5,152,122], [4,75,47,14,76,48], [11,54,24,14,55,25], [16,45,15,14,46,16],
  [6,147,117,4,148,118], [6,73,45,14,74,46], [11,54,24,16,55,25], [30,46,16,2,47,17],
  [8,132,106,4,133,107], [8,75,47,13,76,48], [7,54,24,22,55,25], [22,45,15,13,46,16],
  [10,142,114,2,143,115], [19,74,46,4,75,47], [28,50,22,6,51,23], [33,46,16,4,47,17],
  [8,152,122,4,153,123], [22,73,45,3,74,46], [8,53,23,26,54,24], [12,45,15,28,46,16],
  [3,147,117,10,148,118], [3,73,45,23,74,46], [4,54,24,31,55,25], [11,45,15,31,46,16],
  [7,146,116,7,147,117], [21,73,45,7,74,46], [1,53,23,37,54,24], [19,45,15,26,46,16],
  [5,145,115,10,146,116], [19,75,47,10,76,48], [15,54,24,25,55,25], [23,45,15,25,46,16],
  [13,145,115,3,146,116], [2,74,46,29,75,47], [42,54,24,1,55,25], [23,45,15,28,46,16],
  [17,145,115], [10,74,46,23,75,47], [10,54,24,35,55,25], [19,45,15,35,46,16],
  [17,145,115,1,146,116], [14,74,46,21,75,47], [29,54,24,19,55,25], [11,45,15,46,46,16],
  [13,145,115,6,146,116], [14,74,46,23,75,47], [44,54,24,7,55,25], [59,46,16,1,47,17],
  [12,151,121,7,152,122], [12,75,47,26,76,48], [39,54,24,14,55,25], [22,45,15,41,46,16],
  [6,151,121,14,152,122], [6,75,47,34,76,48], [46,54,24,10,55,25], [2,45,15,64,46,16],
  [17,152,122,4,153,123], [29,74,46,14,75,47], [49,54,24,10,55,25], [24,45,15,46,46,16],
  [4,152,122,18,153,123], [13,74,46,32,75,47], [48,54,24,14,55,25], [42,45,15,32,46,16],
  [20,147,117,4,148,118], [40,75,47,7,76,48], [43,54,24,22,55,25], [10,45,15,67,46,16],
  [19,148,118,6,149,119], [18,75,47,31,76,48], [34,54,24,34,55,25], [20,45,15,61,46,16],
];
const STUFEN = ['L', 'M', 'Q', 'H'];
const bloeckeVon = (version, stufe) => { const t = BLOCK_TABELLE[(version - 1) * 4 + STUFEN.indexOf(stufe)], aus = []; for (let i = 0; i < t.length; i += 3) for (let k = 0; k < t[i]; k++) aus.push({ gesamt: t[i + 1], daten: t[i + 2] }); return aus; };
// Tabelle 10: die acht Masken mit i = Zeile, j = Spalte.
const MASKEN_REGEL = [
  (i, j) => (i + j) % 2 === 0, (i) => i % 2 === 0, (i, j) => j % 3 === 0, (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0, (i, j) => (i * j) % 2 + (i * j) % 3 === 0,
  (i, j) => ((i * j) % 2 + (i * j) % 3) % 2 === 0, (i, j) => ((i + j) % 2 + (i * j) % 3) % 2 === 0,
];
// Tabelle C.1: die 32 gültigen Format-Folgen (15 Bits, nach dem XOR mit 101010000010010), je Stufe für Maske 0 bis 7.
const FORMAT = {
  L: ['111011111000100', '111001011110011', '111110110101010', '111100010011101', '110011000101111', '110001100011000', '110110001000001', '110100101110110'],
  M: ['101010000010010', '101000100100101', '101111001111100', '101101101001011', '100010111111001', '100000011001110', '100111110010111', '100101010100000'],
  Q: ['011010101011111', '011000001101000', '011111100110001', '011101000000110', '010010010110100', '010000110000011', '010111011011010', '010101111101101'],
  H: ['001011010001001', '001001110111110', '001110011100111', '001100111010000', '000011101100010', '000001001010101', '000110100001100', '000100000111011'],
};

// ───────────── Der Leser ─────────────
const bitLaenge = (n) => 32 - Math.clz32(n);
/** Rest der Division zweier Polynome über GF(2) (Bits als Koeffizienten). Ein gültiges BCH-Wort hat den Rest 0. */
function polyRest(wert, teiler) { const grad = bitLaenge(teiler) - 1; for (let i = bitLaenge(wert) - 1; i >= grad; i--) if ((wert >>> i) & 1) wert ^= teiler << (i - grad); return wert; }
// GF(256) mit 0x11D, hier noch einmal für sich gebaut.
const GF_HOCH = [], GF_LOG = new Array(256).fill(0);
for (let i = 0, x = 1; i < 255; i++) { GF_HOCH.push(x); GF_LOG[x] = i; x *= 2; if (x > 255) x ^= 0x11D; }
const gfMal = (a, b) => (a === 0 || b === 0 ? 0 : GF_HOCH[(GF_LOG[a] + GF_LOG[b]) % 255]);
/** Syndrom j eines Blocks: das Codewort als Polynom an der Stelle α^j. Für ein gültiges Wort ist es 0. */
const syndrom = (block, j) => block.reduce((s, w) => gfMal(s, GF_HOCH[j % 255]) ^ w, 0);

/** Wo in einem Feld dieser Version KEINE Daten liegen (Sucher mit Trennrand und Format, Ausrichtung, Takt, Version). */
function festeModule(version) {
  const g = 17 + 4 * version, f = Array.from({ length: g }, () => new Array(g).fill(false));
  const block = (x0, y0, breite, hoehe) => { for (let y = y0; y < y0 + hoehe; y++) for (let x = x0; x < x0 + breite; x++) f[y][x] = true; };
  block(0, 0, 9, 9); block(g - 8, 0, 8, 9); block(0, g - 8, 9, 8);
  const mitten = AUSRICHTUNG[version - 1], ecke = (x, y) => (x < 9 && y < 9) || (x >= g - 8 && y < 9) || (x < 9 && y >= g - 8);
  for (const cy of mitten) for (const cx of mitten) if (!ecke(cx, cy)) block(cx - 2, cy - 2, 5, 5);
  for (let i = 0; i < g; i++) { f[6][i] = true; f[i][6] = true; }
  if (version >= 7) { block(g - 11, 0, 3, 6); block(0, g - 11, 6, 3); }
  return f;
}

/** Liest ein Feld (matrix[zeile][spalte]) zurück. Wirft, wenn etwas nicht der Norm entspricht.
 *  Zurück: { version, stufe, maske, bytes, text, datenworte, codeworte }. */
function lies(matrix) {
  const g = matrix.length, version = (g - 17) / 4;
  assert.ok(Number.isInteger(version) && version >= 1 && version <= 40, 'Größe gehört zu keiner Version: ' + g);
  assert.ok(matrix.every((z) => z.length === g && z.every((b) => typeof b === 'boolean')), 'quadratisch, nur true/false');
  const d = (x, y) => (matrix[y][x] ? 1 : 0);
  // Format-Information, höchstes Bit zuerst. Kopie 1 um den Sucher oben links, Kopie 2 geteilt auf unten links und oben rechts.
  const ORT1 = [[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8], [8, 7], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0]];
  const ORT2 = [[8, g - 1], [8, g - 2], [8, g - 3], [8, g - 4], [8, g - 5], [8, g - 6], [8, g - 7], [g - 8, 8], [g - 7, 8], [g - 6, 8], [g - 5, 8], [g - 4, 8], [g - 3, 8], [g - 2, 8], [g - 1, 8]];
  const zahl = (orte) => orte.reduce((n, [x, y]) => (n << 1) | d(x, y), 0);
  const f1 = zahl(ORT1) ^ 0b101010000010010, f2 = zahl(ORT2) ^ 0b101010000010010;
  assert.equal(f1, f2, 'beide Kopien der Format-Information sind gleich');
  assert.equal(polyRest(f1, 0b10100110111), 0, 'Format-Information besteht die BCH-Prüfung');
  const stufe = ['M', 'L', 'H', 'Q'][f1 >>> 13], maske = (f1 >>> 10) & 7;
  assert.equal(d(8, g - 8), 1, 'das immer dunkle Modul neben dem Sucher unten links');
  if (version >= 7) {   /* Versions-Information: 18 Bits, niedrigstes zuerst, in 6 × 3 Modulen; zwei Kopien */
    let oben = 0, unten = 0;
    for (let i = 17; i >= 0; i--) { const lang = Math.floor(i / 3), kurz = i % 3; oben = (oben << 1) | d(g - 11 + kurz, lang); unten = (unten << 1) | d(lang, g - 11 + kurz); }
    assert.equal(oben, unten, 'beide Kopien der Versions-Information sind gleich');
    assert.equal(polyRest(oben, 0b1111100100101), 0, 'Versions-Information besteht die BCH-Prüfung');
    assert.equal(oben >>> 12, version, 'die Versions-Information nennt die Version, die zur Größe gehört');
  }
  // Daten-Bits im Zickzack: Doppelspalten von rechts, abwechselnd aufwärts und abwärts; die Takt-Spalte zählt nicht mit.
  const fest = festeModule(version), bits = []; let hoch = true;
  for (let spalte = g - 1; spalte > 0; spalte -= 2) {
    if (spalte === 6) spalte--;
    for (let k = 0; k < g; k++) { const y = hoch ? g - 1 - k : k; for (const x of [spalte, spalte - 1]) if (!fest[y][x]) bits.push(d(x, y) ^ (MASKEN_REGEL[maske](y, x) ? 1 : 0)); }
    hoch = !hoch;
  }
  const bloecke = bloeckeVon(version, stufe), gesamt = bloecke.reduce((n, b) => n + b.gesamt, 0);
  assert.ok(bits.length - gesamt * 8 >= 0 && bits.length - gesamt * 8 < 8, `Zahl der Datenplätze passt zur Tabelle (${bits.length} Bits, ${gesamt} Codeworte)`);
  assert.ok(bits.slice(gesamt * 8).every((b) => b === 0), 'die Restbits sind hell');
  const codeworte = []; for (let i = 0; i < gesamt; i++) codeworte.push(bits.slice(i * 8, i * 8 + 8).reduce((n, b) => (n << 1) | b, 0));
  // Entschachteln: erst reihum die Datenworte, dann reihum die Prüfworte.
  const teile = bloecke.map(() => ({ d: [], p: [] })); let o = 0;
  for (let i = 0; i < Math.max(...bloecke.map((b) => b.daten)); i++) bloecke.forEach((b, k) => { if (i < b.daten) teile[k].d.push(codeworte[o++]); });
  for (let i = 0; i < Math.max(...bloecke.map((b) => b.gesamt - b.daten)); i++) bloecke.forEach((b, k) => { if (i < b.gesamt - b.daten) teile[k].p.push(codeworte[o++]); });
  assert.equal(o, gesamt);
  teile.forEach((t, k) => { for (let j = 0; j < t.p.length; j++) assert.equal(syndrom([...t.d, ...t.p], j), 0, `Block ${k + 1}: Syndrom ${j} ist 0 (gültiges Reed-Solomon-Wort)`); });
  // Byte-Modus lesen.
  const datenworte = teile.flatMap((t) => t.d), strom = datenworte.flatMap((w) => [7, 6, 5, 4, 3, 2, 1, 0].map((i) => (w >>> i) & 1)); let pos = 0;
  const nimm = (n) => { let v = 0; for (let i = 0; i < n; i++) v = (v << 1) | strom[pos++]; return v; };
  assert.equal(nimm(4), 0b0100, 'Kennung des Byte-Modus');
  const laenge = nimm(version <= 9 ? 8 : 16), bytes = Uint8Array.from({ length: laenge }, () => nimm(8));
  const schluss = Math.min(4, strom.length - pos); assert.equal(nimm(schluss), 0, 'Schlusszeichen aus Nullen');
  while (pos % 8) assert.equal(nimm(1), 0, 'bis zur Byte-Grenze Nullen');
  for (let i = 0; pos < strom.length; i++) assert.equal(nimm(8), i % 2 ? 0x11 : 0xEC, 'Füllworte 236 und 17 im Wechsel');
  return { version, stufe, maske, bytes, datenworte, codeworte, get text() { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } };
}

const alsZeilen = (matrix) => matrix.map((z) => z.map((b) => (b ? '#' : '.')).join(''));
const flach = (matrix) => Uint8Array.from(matrix.flat(), Number);
/** Fester Text aus druckbaren ASCII-Zeichen mit genau n Bytes. */
const fuellText = (n, saat = 1) => { let s = '', x = saat; while (s.length < n) { x = (x * 1103515245 + 12345) >>> 0; s += String.fromCharCode(32 + ((x >>> 16) % 95)); } return s; };

// ───────────── Aufbau: Größe, feste Muster, Format und Version ─────────────

test('QR · Größe der Matrix je Version: 21 Module bei Version 1, je Version 4 mehr, 177 bei Version 40', () => {
  assert.equal(qrGroesse(1), 21); assert.equal(qrGroesse(7), 45); assert.equal(qrGroesse(40), 177);
  for (const [bytes, stufe, version] of [[1, 'M', 1], [14, 'M', 1], [15, 'M', 2], [17, 'L', 1], [18, 'L', 2], [180, 'M', 9], [181, 'M', 10], [2331, 'M', 40], [2953, 'L', 40], [1273, 'H', 40]]) {
    const c = qrCode(fuellText(bytes), { stufe });
    assert.equal(c.version, version, `${bytes} Bytes in Stufe ${stufe}`); assert.equal(c.matrix.length, 17 + 4 * version); assert.ok(c.matrix.every((z) => z.length === c.matrix.length));
    assert.equal(qrVersion(bytes, stufe), version);
  }
  assert.ok(qrMatrix('a').every((z) => z.every((b) => b === true || b === false)), 'nur true und false');
});

test('QR · Fassungsvermögen im Byte-Modus stimmt mit der Tabelle der Norm überein', () => {
  const SOLL = { 1: [17, 14, 11, 7], 2: [32, 26, 20, 14], 9: [230, 180, 130, 98], 10: [271, 213, 151, 119], 20: [858, 666, 482, 382], 25: [1273, 997, 715, 535], 30: [1732, 1370, 982, 742], 40: [2953, 2331, 1663, 1273] };
  for (const [v, soll] of Object.entries(SOLL)) assert.deepEqual(STUFEN.map((s) => qrPlan(+v, s).bytes), soll, 'Version ' + v);
  assert.deepEqual(QR_MAX_BYTES, { L: 2953, M: 2331, Q: 1663, H: 1273 });
  assert.equal(qrPlan(1, 'L').gesamt, 26); assert.equal(qrPlan(40, 'L').gesamt, 3706); assert.equal(qrPlan(2, 'L').restBits, 7); assert.equal(qrPlan(1, 'L').restBits, 0);
});

test('QR · Blöcke und Ausrichtungs-Muster aller 40 Versionen stimmen mit den Tabellen der Norm überein', () => {
  for (let v = 1; v <= 40; v++) {
    assert.deepEqual(qrAusrichtung(v), AUSRICHTUNG[v - 1], 'Ausrichtung Version ' + v);
    for (const s of STUFEN) { const b = bloeckeVon(v, s), p = qrPlan(v, s);
      assert.equal(p.bloecke, b.length, `Blöcke ${v}-${s}`); assert.equal(p.gesamt, b.reduce((n, x) => n + x.gesamt, 0), `Codeworte ${v}-${s}`); assert.equal(p.daten, b.reduce((n, x) => n + x.daten, 0), `Datenworte ${v}-${s}`);
      assert.ok(b.every((x) => x.gesamt - x.daten === p.pruefJeBlock), `Prüfworte je Block ${v}-${s}`); }
  }
});

test('QR · Sucher-Muster in drei Ecken, heller Trennrand, Takt-Muster, das dunkle Modul; die vierte Ecke hat keinen Sucher', () => {
  const SUCHER = ['#######', '#.....#', '#.###.#', '#.###.#', '#.###.#', '#.....#', '#######'];
  for (const [inhalt, stufe] of [['HELLO WORLD', 'M'], [fuellText(300), 'Q'], [fuellText(2000), 'L']]) {
    const m = qrMatrix(inhalt, { stufe }), g = m.length, z = alsZeilen(m), aus = (x0, y0, b, h) => z.slice(y0, y0 + h).map((r) => r.slice(x0, x0 + b));
    assert.deepEqual(aus(0, 0, 7, 7), SUCHER, 'oben links'); assert.deepEqual(aus(g - 7, 0, 7, 7), SUCHER, 'oben rechts'); assert.deepEqual(aus(0, g - 7, 7, 7), SUCHER, 'unten links');
    assert.notDeepEqual(aus(g - 7, g - 7, 7, 7), SUCHER, 'unten rechts steht kein Sucher');
    for (let i = 0; i < 8; i++) for (const [x, y] of [[7, i], [i, 7], [g - 8, i], [g - 1 - i, 7], [7, g - 1 - i], [i, g - 8]]) assert.equal(m[y][x], false, `Trennrand hell bei ${x},${y}`);
    for (let i = 8; i < g - 8; i++) { assert.equal(m[6][i], i % 2 === 0, 'Takt in Zeile 6, Spalte ' + i); assert.equal(m[i][6], i % 2 === 0, 'Takt in Spalte 6, Zeile ' + i); }
    assert.equal(m[g - 8][8], true, 'das immer dunkle Modul');
    if (g >= 25) { const a = g - 7; assert.deepEqual(aus(a - 2, a - 2, 5, 5), ['#####', '#...#', '#.#.#', '#...#', '#####'], 'Ausrichtungs-Muster unten rechts'); }
  }
});

test('QR · Format-Information: alle 32 Folgen der Norm, im Feld zweimal vorhanden und mit bestandener BCH-Prüfung', () => {
  for (const s of STUFEN) for (let k = 0; k < 8; k++) {
    assert.equal(qrFormatBits(s, k).toString(2).padStart(15, '0'), FORMAT[s][k], `Folge ${s}/${k}`);
    assert.equal(polyRest(qrFormatBits(s, k) ^ 0b101010000010010, 0b10100110111), 0, `BCH ${s}/${k}`);
    const r = lies(qrMatrix('Format ' + s + k, { stufe: s, maske: k }));   /* lies() prüft beide Kopien und die BCH-Prüfung am Feld selbst */
    assert.equal(r.stufe, s); assert.equal(r.maske, k); assert.equal(r.text, 'Format ' + s + k);
  }
  assert.deepEqual(QR_STUFEN, { L: 1, M: 0, Q: 3, H: 2 });
});

test('QR · Versions-Information ab Version 7: bekannte Folgen der Norm, im Feld zweimal vorhanden', () => {
  assert.equal(qrVersionsBits(7), 0x07C94); assert.equal(qrVersionsBits(8), 0x085BC); assert.equal(qrVersionsBits(40), 0x28C69);
  assert.equal(qrVersionsBits(7).toString(2).padStart(18, '0'), '000111110010010100');
  for (let v = 7; v <= 40; v++) assert.equal(polyRest(qrVersionsBits(v), 0b1111100100101), 0, 'BCH Version ' + v);
  const c = qrCode(fuellText(120), { stufe: 'M' }); assert.equal(c.version, 7); assert.equal(lies(c.matrix).version, 7);   /* lies() liest und prüft beide Kopien */
  const gross = qrCode(fuellText(1000), { stufe: 'Q' }); assert.equal(gross.version, 31); assert.equal(lies(gross.matrix).version, 31);
  assert.equal(qrCode(fuellText(100), { stufe: 'M' }).version, 6, 'Version 6 hat noch keine Versions-Information');
});

// ───────────── Bekannte Vektoren ─────────────

test('QR · „HELLO WORLD“ in Version 1-M, Schritt für Schritt nachgerechnet: Datenworte, Prüfworte, das ganze Feld', () => {
  // Byte-Modus: 0100 · Länge 11 = 00001011 · 48 45 4C 4C 4F 20 57 4F 52 4C 44 · Schluss 0000 → 13 Bytes; dann 236, 17, 236 bis 16 Datenworte.
  //   0100 0000 | 1011 0100 | 1000 0100 | 0101 0100 | 1100 0100 | 1100 0100 | 1111 0010 | 0000 0101 | 0111 0100 | 1111 0101 | 0010 0100 | 1100 0100 | 0100 0000
  const DATEN = [0x40, 0xB4, 0x84, 0x54, 0xC4, 0xC4, 0xF2, 0x05, 0x74, 0xF5, 0x24, 0xC4, 0x40, 0xEC, 0x11, 0xEC];
  const plan = qrPlan(1, 'M'); assert.deepEqual({ gesamt: plan.gesamt, daten: plan.daten, bloecke: plan.bloecke, pruefJeBlock: plan.pruefJeBlock }, { gesamt: 26, daten: 16, bloecke: 1, pruefJeBlock: 10 });
  assert.deepEqual([...qrDatenworte(new TextEncoder().encode('HELLO WORLD'), plan)], DATEN);
  const c = qrCode('HELLO WORLD', { stufe: 'M' }), gelesen = lies(c.matrix);
  assert.equal(c.version, 1); assert.equal(c.groesse, 21); assert.equal(c.bytes, 11);
  assert.deepEqual(gelesen.datenworte, DATEN, 'der Leser findet im Feld genau diese Datenworte'); assert.equal(gelesen.text, 'HELLO WORLD');
  assert.deepEqual(gelesen.codeworte, [...DATEN, ...rsPruefworte(Uint8Array.from(DATEN), 10)], 'ein Block: Datenworte, dahinter die zehn Prüfworte');
  // Das ganze Feld. Maske 3 hat hier die wenigsten Strafpunkte; qrcode-generator (alte App) liefert für denselben Text dasselbe Feld.
  assert.equal(c.maske, 3);
  assert.deepEqual(alsZeilen(c.matrix), [
    '#######.#...#.#######', '#.....#.#...#.#.....#', '#.###.#.......#.###.#', '#.###.#.#.#.#.#.###.#', '#.###.#..###..#.###.#', '#.....#...###.#.....#', '#######.#.#.#.#######',
    '........#####........', '#.##.###.#.##.#..#.##', '.##....#.#######.##..', '.....#####.#.#.#...##', '#.#.##.##..#...#.#.#.', '#...#.##.##.##....#.#', '........#.##..##..#.#',
    '#######.#.#######....', '#.....#.###..#.#.####', '#.###.#..#..#.#..#...', '#.###.#.###...#..###.', '#.###.#.##..#..#..#..', '#.....#..###.####...#', '#######.##.#.#.#.....']);
});

test('QR · Reed-Solomon: die Prüfworte der bekannten Lehrbeispiele („HELLO WORLD“ alphanumerisch, 1-M und 1-Q)', () => {
  assert.deepEqual([...rsPruefworte(Uint8Array.from([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17]), 10)], [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  assert.deepEqual([...rsPruefworte(Uint8Array.from([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236]), 13)], [168, 72, 22, 82, 217, 54, 156, 0, 46, 15, 180, 122, 16]);
  const d = Uint8Array.from(fuellText(40), (c) => c.charCodeAt(0)), p = rsPruefworte(d, 30);   /* jedes Codewort hat alle Syndrome 0; ein verändertes Wort nicht */
  for (let j = 0; j < 30; j++) assert.equal(syndrom([...d, ...p], j), 0);
  d[5] ^= 1; assert.ok([...Array(30).keys()].some((j) => syndrom([...d, ...p], j) !== 0));
});

test('QR · Verschachteln: mehrere Blöcke, die hinteren ein Wort länger (Version 5-Q: 2 × 15 und 2 × 16 Datenworte, je 18 Prüfworte)', () => {
  const plan = qrPlan(5, 'Q'); assert.deepEqual([plan.gesamt, plan.daten, plan.bloecke, plan.pruefJeBlock], [134, 62, 4, 18]);
  const daten = Uint8Array.from({ length: 62 }, (_, i) => i + 1), w = qrCodeworte(daten, plan);
  // Blöcke: 1–15, 16–30, 31–46, 47–62. Reihum: 1,16,31,47, 2,17,32,48, …, 15,30,45,61, dann nur noch die langen: 46, 62.
  assert.deepEqual([...w.slice(0, 8)], [1, 16, 31, 47, 2, 17, 32, 48]); assert.deepEqual([...w.slice(56, 62)], [15, 30, 45, 61, 46, 62]);
  const p = [daten.slice(0, 15), daten.slice(15, 30), daten.slice(30, 46), daten.slice(46, 62)].map((b) => rsPruefworte(b, 18));
  assert.deepEqual([...w.slice(62, 66)], p.map((x) => x[0])); assert.deepEqual([...w.slice(130, 134)], p.map((x) => x[17])); assert.equal(w.length, 134);
});

// ───────────── Rundlauf: schreiben, mit dem eigenen Leser zurücklesen ─────────────

test('QR · Rundlauf: kurz, 200 Zeichen mit Umlauten (UTF-8), 1500 Zeichen – in allen vier Stufen kommt derselbe Text zurück', () => {
  const kurz = 'Hallo';
  const umlaute = ('Käsespätzle mit Röstzwiebeln: 400 g Mehl, 4 Eier, ½ TL Salz, 250 g Bergkäse – überbacken bei 180 °C. Größe der Pfanne: Ø 28 cm. Süß? Nein, würzig! ').repeat(2).slice(0, 200);
  const lang = (umlaute + fuellText(1500, 7)).slice(0, 1500);
  assert.equal([...umlaute].length, 200); assert.ok(new TextEncoder().encode(umlaute).length > 200, 'Umlaute brauchen mehr Bytes als Zeichen'); assert.equal(lang.length, 1500);
  for (const [name, t] of [['kurz', kurz], ['200 Zeichen mit Umlauten', umlaute], ['1500 Zeichen', lang]]) for (const s of STUFEN) {
    if (!passtInQr(t, s)) { assert.throws(() => qrMatrix(t, { stufe: s }), /zu viel für einen QR-Code/, `${name} passt nicht in Stufe ${s} und wird abgelehnt`); continue; }
    const c = qrCode(t, { stufe: s }), r = lies(c.matrix);
    assert.equal(r.text, t, `${name}, Stufe ${s}`); assert.equal(r.stufe, s); assert.equal(r.version, c.version); assert.equal(r.maske, c.maske); assert.equal(r.bytes.length, new TextEncoder().encode(t).length);
  }
  assert.equal(passtInQr(lang, 'M'), true); assert.equal(passtInQr(lang, 'H'), false, '1500 Zeichen mit Umlauten sind mehr als die 1273 Bytes der Stufe H');
});

test('QR · Rundlauf über alle 40 Versionen und 4 Stufen, jede Version bis zum letzten Byte gefüllt', () => {
  let gelesen = 0;
  for (let v = 1; v <= 40; v++) for (const s of STUFEN) {
    const t = fuellText(qrPlan(v, s).bytes, v * 4 + STUFEN.indexOf(s)), c = qrCode(t, { stufe: s });
    assert.equal(c.version, v, `gefüllt bis zum Rand bleibt es Version ${v}-${s}`);
    const r = lies(c.matrix); assert.equal(r.text, t, `Version ${v}-${s}`); assert.equal(r.version, v); assert.equal(r.stufe, s); gelesen++;
  }
  assert.equal(gelesen, 160);
});

test('QR · Rundlauf mit jeder der acht Masken; die Regeln des Erzeugers sind die der Norm', () => {
  const t = 'Maske: Käse & Brot, 12 × 3 = 36';
  for (let k = 0; k < 8; k++) { const r = lies(qrMatrix(t, { stufe: 'Q', maske: k })); assert.equal(r.maske, k); assert.equal(r.text, t); }
  for (let k = 0; k < 8; k++) for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) assert.equal(QR_MASKEN[k](x, y), MASKEN_REGEL[k](y, x), `Maske ${k} bei Spalte ${x}, Zeile ${y}`);
});

test('QR · leerer Text, Bytes statt Text, Zeichen außerhalb der Grundebene', () => {
  assert.equal(lies(qrMatrix('')).text, '');
  assert.deepEqual([...lies(qrMatrix(Uint8Array.from([0, 255, 128, 10]), { stufe: 'H' })).bytes], [0, 255, 128, 10]);
  const t = '🍲 Борщ 汤 – ½ l'; assert.equal(lies(qrMatrix(t, { stufe: 'L' })).text, t);
});

test('QR · Gegenprobe zum Leser: ein umgedrehtes Daten-Modul, ein umgedrehtes Format-Modul und ein fehlender Sucher fallen auf', () => {
  const frisch = () => qrMatrix('Der Leser ist nicht blind.', { stufe: 'M' }).map((z) => z.slice());
  assert.equal(lies(frisch()).text, 'Der Leser ist nicht blind.');
  let m = frisch(); m[12][12] = !m[12][12]; assert.throws(() => lies(m), /Syndrom|Kennung|Füllworte|Schlusszeichen/, 'Daten-Modul');
  m = frisch(); m[8][2] = !m[8][2]; assert.throws(() => lies(m), /Format-Information/, 'Format-Modul');
  m = frisch(); m[m.length - 8][8] = false; assert.throws(() => lies(m), /dunkle Modul/, 'das dunkle Modul');
  assert.throws(() => lies(frisch().slice(1)), /Größe|quadratisch/);
});

// ───────────── Masken-Wahl und Strafpunkte ─────────────

test('QR · Strafpunkte: vier Regeln an von Hand gerechneten Feldern', () => {
  const feld = (zeilen) => Uint8Array.from(zeilen.join(''), (c) => (c === '#' ? 1 : 0));
  // 6 × 6 ganz hell: Regel 1 je Zeile und Spalte ein Lauf von 6 = 3 + 1 → 12 × 4 = 48 · Regel 2: 25 Flächen × 3 = 75 · Regel 4: 0 % dunkel = 10 Stufen × 10 = 100.
  assert.equal(qrStrafe(feld(Array(6).fill('......')), 6), 48 + 75 + 100);
  assert.equal(qrStrafe(feld(Array(6).fill('######')), 6), 48 + 75 + 100);
  // Schachbrett 11 × 11: kein Lauf, keine Fläche, kein Sucher-Bild, 60 oder 61 von 121 dunkel.
  const schach = Array.from({ length: 11 }, (_, y) => Array.from({ length: 11 }, (_, x) => ((x + y) % 2 ? '#' : '.')).join(''));
  assert.equal(qrStrafe(feld(schach), 11), 0);
  // Regel 3: eine Zeile mit dem Sucher-Bild und vier hellen Modulen dahinter (sonst nichts: keine Läufe ab 5, keine 2×2-Fläche, 59 von 121 dunkel).
  const mitBild = schach.slice(); mitBild[5] = '#.###.#....'; assert.equal(qrStrafe(feld(mitBild), 11), 40);
  const gespiegelt = schach.slice(); gespiegelt[5] = '....#.###.#'; assert.equal(qrStrafe(feld(gespiegelt), 11), 40, 'vier helle Module davor zählen genauso');
  // Regel 1 allein: ein Lauf von 7 dunklen in einer Zeile des Schachbretts (3 + 2), keine 2×2-Fläche, senkrecht höchstens 3 gleiche.
  const lauf = schach.slice(); lauf[5] = '.#######.#.'; assert.equal(qrStrafe(feld(lauf), 11), 5);
});

test('QR · ohne Vorgabe gewinnt die Maske mit den wenigsten Strafpunkten (bei Gleichstand die kleinere Nummer)', () => {
  for (const [t, s] of [['HELLO WORLD', 'M'], [fuellText(120), 'L'], ['https://example.org/#share=zq1ZKzs8tUbJSMlTSUUpLzMhRslIyVKoFAA==', 'L'], [fuellText(900), 'H']]) {
    const frei = qrCode(t, { stufe: s }), punkte = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => qrStrafe(flach(qrMatrix(t, { stufe: s, maske: k })), frei.groesse));
    assert.equal(frei.maske, punkte.indexOf(Math.min(...punkte)), `${s}: ${punkte.join(' ')}`);
    assert.deepEqual(frei.matrix, qrMatrix(t, { stufe: s, maske: frei.maske }));
  }
  assert.deepEqual(qrMatrix('gleich', { stufe: 'Q' }), qrMatrix('gleich', { stufe: 'Q' }), 'gleicher Text, gleiches Feld');
});

// ───────────── Grenzen ─────────────

test('QR · was nicht in Version 40 passt, wird abgelehnt: Klartext mit den Zahlen, passtInQr fragt vorher', () => {
  assert.equal(passtInQr(fuellText(2331), 'M'), true); assert.equal(passtInQr(fuellText(2332), 'M'), false); assert.equal(passtInQr(fuellText(2953), 'L'), true); assert.equal(passtInQr(fuellText(2954), 'L'), false);
  assert.equal(passtInQr('ä'.repeat(1166), 'M'), false, 'ein Umlaut zählt zwei Bytes: 1166 Umlaute sind 2332 Bytes'); assert.equal(passtInQr('ä'.repeat(1165), 'M'), true);
  assert.equal(lies(qrMatrix(fuellText(2331), { stufe: 'M' })).version, 40);
  assert.throws(() => qrMatrix(fuellText(2332)), /zu viel für einen QR-Code: 2332 Bytes, höchstens 2331 passen hinein \(Stufe M\)/);
  assert.throws(() => qrMatrix(fuellText(3000), { stufe: 'L', sprache: 'en' }), /too much for a QR code: 3000 bytes, at most 2953 fit \(level L\)/);
  assert.throws(() => qrSvg(fuellText(1300), { stufe: 'H' }), /höchstens 1273/);
  assert.throws(() => qrMatrix('x', { stufe: 'X' }), /QR-Stufe „X“ gibt es nicht/); assert.throws(() => qrPlan(41, 'M'), /Version 1 bis 40/); assert.equal(qrVersion(5000, 'L'), 0);
});

// ───────────── SVG ─────────────

test('QR · SVG: schwarz auf weiß, vier Module Rand, die Pfade ergeben genau die Matrix; nichts vom Inhalt steht im Bild', () => {
  const t = 'https://example.org/rezept?name=<script>alert(1)</script>&x="1"', m = qrMatrix(t), n = m.length, svg = qrSvg(t);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 (\d+) \1" width="280" height="280" /); assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes(`viewBox="0 0 ${n + 8} ${n + 8}"`), 'Rand: 4 Module auf jeder Seite'); assert.ok(svg.includes(`<rect width="${n + 8}" height="${n + 8}" fill="#fff"/>`)); assert.ok(svg.includes('fill="#000"'));
  const aus = (s, rand) => { const k = +s.match(/viewBox="0 0 (\d+) /)[1] - 2 * rand, g = Array.from({ length: k }, () => new Array(k).fill(false)); for (const [, x, y, l, zurueck] of s.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)) { assert.equal(l, zurueck); for (let i = 0; i < +l; i++) g[+y - rand][+x - rand + i] = true; } return g; };
  assert.deepEqual(aus(svg, 4), m, 'die gezeichneten Rechtecke sind genau die dunklen Module');
  assert.equal(svg.replace(/M\d+ \d+h\d+v1h-\d+z/g, '').match(/d="([^"]*)"/)[1], '', 'im Pfad steht nichts anderes');
  assert.ok(!/script|alert|example/.test(svg), 'der Inhalt steht nicht als Text im Bild'); assert.ok(!/<(?!\/?(svg|rect|path)\b)/.test(svg), 'nur svg, rect und path');
  const ohne = qrSvg(t, { rand: 0, groesse: 120, stufe: 'L', titel: 'Rezept "Käse" <b>' });
  assert.ok(ohne.includes(`viewBox="0 0 ${qrMatrix(t, { stufe: 'L' }).length} `)); assert.ok(ohne.includes('width="120" height="120"')); assert.ok(ohne.includes('aria-label="Rezept &quot;Käse&quot; &lt;b&gt;"'));
  assert.equal(lies(aus(qrSvg('Aus dem Bild gelesen: Grüße', { rand: 2 }), 2)).text, 'Aus dem Bild gelesen: Grüße', 'Rundlauf über das SVG');
});

// ───────────── Was in den Code kommt: Text und Link der alten App ─────────────

const REZEPT = { id: 7, uid: 'r-probe', name: 'Kartoffelsuppe & Speck', cat: 'suppe', servings: 6, prepTime: 45, flavors: ['herzhaft'], img: 'data:image/jpeg;base64,AAAA',
  ings: [{ amt: '500', unit: 'g', name: 'Kartoffeln', note: 'mehlig' }, { amt: '1 ½', unit: 'l', name: 'Brühe' }, { amt: '', unit: '', name: 'Salz' }],
  steps: [{ txt: 'Kartoffeln schälen und würfeln.' }, { txt: '20 Minuten bei 100 °C kochen.', note: 'nicht anbrennen lassen' }],
  translations: { en: { name: 'Potato soup & bacon', ingredients: ['potatoes', 'stock', 'salt'], steps: ['Peel and dice the potatoes.', 'Boil for 20 minutes.'] } } };

test('Teilen · rezeptAlsText: Name, Portionen und Zeit, Zutaten, nummerierte Schritte; in der Sprache der Anzeige', () => {
  assert.equal(rezeptAlsText(REZEPT, 'de'), 'Kartoffelsuppe & Speck\n6 Portionen · 45 Min\n\nZutaten:\n500 g Kartoffeln (mehlig)\n1 ½ l Brühe\nSalz\n\nZubereitung:\n1. Kartoffeln schälen und würfeln.\n2. 20 Minuten bei 100 °C kochen.');
  assert.equal(rezeptAlsText(REZEPT, 'en'), 'Potato soup & bacon\n6 servings · 45 min\n\nIngredients:\n500 g potatoes (mehlig)\n1 ½ l stock\nsalt\n\nPreparation:\n1. Peel and dice the potatoes.\n2. Boil for 20 minutes.');
  assert.equal(rezeptAlsText({ name: 'Tee', servings: 1 }), 'Tee\n1 Portion'); assert.ok(!rezeptAlsText(REZEPT).includes('base64'), 'kein Bild im Text');
  assert.equal(lies(qrMatrix(rezeptAlsText(REZEPT))).text, rezeptAlsText(REZEPT), 'der Text passt in einen Code und kommt unverändert zurück');
});

test('Teilen · teilDaten: genau die Felder der alten App (v 2), ohne Bild; Zeit nur, wenn es eine gibt', () => {
  assert.deepEqual(teilDaten(REZEPT), { v: 2, n: 'Kartoffelsuppe & Speck', c: 'suppe', s: 6, fl: ['herzhaft'],
    i: [{ a: '500', u: 'g', n: 'Kartoffeln' }, { a: '1 ½', u: 'l', n: 'Brühe' }, { a: '', u: '', n: 'Salz' }], st: ['Kartoffeln schälen und würfeln.', '20 Minuten bei 100 °C kochen.'], t: 45 });
  assert.deepEqual(Object.keys(teilDaten({ name: 'Tee' })), ['v', 'n', 'c', 's', 'fl', 'i', 'st']); assert.ok(!JSON.stringify(teilDaten(REZEPT)).includes('base64'));
});

test('Teilen · teilLink schreibt den Link der alten App (#share=z + base64 von deflate-raw), ausTeilLink liest ihn zurück', async () => {
  const link = await teilLink(REZEPT, 'https://kueche.example/app/');
  assert.match(link, /^https:\/\/kueche\.example\/app\/#share=z[A-Za-z0-9+/]+=*$/);
  // unabhängig entpackt (node:zlib), wie es _decompressB64 der alten App tut
  assert.deepEqual(JSON.parse(inflateRawSync(Buffer.from(link.split('#share=z')[1], 'base64')).toString('utf8')), teilDaten(REZEPT));
  const SOLL = { name: 'Kartoffelsuppe & Speck', cat: 'suppe', servings: 6, flavors: ['herzhaft'], ings: [{ amt: '500', unit: 'g', name: 'Kartoffeln' }, { amt: '1 ½', unit: 'l', name: 'Brühe' }, { amt: '', unit: '', name: 'Salz' }],
    steps: [{ txt: 'Kartoffeln schälen und würfeln.' }, { txt: '20 Minuten bei 100 °C kochen.' }], prepTime: 45 };
  assert.deepEqual(await ausTeilLink(link), SOLL); assert.deepEqual(await ausTeilLink(link.slice(link.indexOf('#'))), SOLL, 'nur der Teil ab #'); assert.deepEqual(await ausTeilLink(link.split('#share=')[1]), SOLL, 'nur die Last');
  const [vorn, last] = link.split('#share=');
  assert.deepEqual(await ausTeilLink(vorn + '#share=' + last.replace(/\+/g, '%2B').replace(/\//g, '%2F').replace(/=/g, '%3D')), SOLL, 'Prozent-Schreibweise'); assert.deepEqual(await ausTeilLink(vorn + '#share=' + last.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')), SOLL, 'URL-sichere Schreibweise ohne Füllzeichen');
  assert.equal((await teilLink(REZEPT, '')).startsWith('#share=z'), true); assert.ok(passtInQr(link, 'M'), 'der Link passt in einen Code');
  assert.equal(lies(qrMatrix(link, { stufe: 'L' })).text, link, 'Rundlauf: Link → QR-Code → Leser → derselbe Link');
});

test('Teilen · ein Link, wie ihn die ALTE App schrieb, wird gelesen: gepackt, ungepackt, mit fehlender Kategorie', async () => {
  const alt = { v: 2, n: 'Omas Käsekuchen', c: 'kuchen', s: 12, fl: ['süß'], i: [{ a: '500', u: 'g', n: 'Quark' }, { a: '3', u: '', n: 'Eier' }], st: ['Alles verrühren.', '60 Minuten backen.'] };
  const gepackt = 'https://lausiklauskn-png.github.io/Mein-Rezeptbuch/#share=z' + deflateRawSync(Buffer.from(JSON.stringify(alt), 'utf8')).toString('base64');
  const SOLL = { name: 'Omas Käsekuchen', cat: 'kuchen', servings: 12, flavors: ['süß'], ings: [{ amt: '500', unit: 'g', name: 'Quark' }, { amt: '3', unit: '', name: 'Eier' }], steps: [{ txt: 'Alles verrühren.' }, { txt: '60 Minuten backen.' }] };
  assert.deepEqual(await ausTeilLink(gepackt), SOLL);
  assert.deepEqual(await ausTeilLink('#share=' + Buffer.from(JSON.stringify(alt), 'utf8').toString('base64')), SOLL, 'ungepackt (Geräte ohne CompressionStream)');
  const ohneKat = await ausTeilLink('#share=' + Buffer.from(JSON.stringify({ v: 2, n: 'Tee', i: ['Wasser'], st: [] }), 'utf8').toString('base64'));
  assert.deepEqual(ohneKat, { name: 'Tee', cat: '', servings: 4, flavors: [], ings: [{ amt: '', unit: '', name: 'Wasser' }], steps: [] }, 'keine Kategorie bleibt leer, es wird keine erfunden');
});

test('Teilen · ein fremder Link ist fremder Inhalt: Unlesbares gibt null, zu Großes wird nicht entpackt, es kommen nur die bekannten Felder an', async () => {
  for (const nein of ['', null, 'https://kueche.example/app/', 'https://kueche.example/app/#rezept=5', '#share=', '#share=z!!!', '#share=zAAAA', '#share=' + Buffer.from('kein json').toString('base64'), '#share=' + Buffer.from('{"v":2}').toString('base64'), '#share=' + Buffer.from('[1,2]').toString('base64')])
    assert.equal(await ausTeilLink(nein), null, String(nein));
  const bombe = '#share=z' + deflateRawSync(Buffer.from(JSON.stringify({ v: 2, n: 'x', st: ['A'.repeat(TEIL_MAX_BYTES * 4)] }))).toString('base64');
  assert.ok(bombe.length < 5000, 'klein im Link …'); assert.equal(await ausTeilLink(bombe), null, '… aber entpackt über der Grenze: abgelehnt');
  const fremd = await ausTeilLink('#share=' + Buffer.from(JSON.stringify({ v: 2, n: '  <img src=x onerror=alert(1)>  ', c: { toString: 1 }, s: 'viele', uid: 'r-fremd', id: 1, folder: 'geheim', img: 'https://boese.example/x.png', herkunft: [1],
    i: [{ a: 1, u: null, n: 'Mehl', id: 99, ck: true }, null, 5], st: [{ txt: 'Rühren' }, 7, ''] })).toString('base64'));
  assert.deepEqual(Object.keys(fremd).sort(), ['cat', 'flavors', 'ings', 'name', 'servings', 'steps'], 'keine uid, kein Ordner, kein Bild, keine Herkunft aus dem Link');
  assert.equal(fremd.name, '<img src=x onerror=alert(1)>', 'der Name bleibt Text; entschärft wird er dort, wo er angezeigt wird'); assert.equal(fremd.servings, 4);
  assert.deepEqual(fremd.ings, [{ amt: '1', unit: '', name: 'Mehl' }, { amt: '', unit: '', name: '5' }]); assert.deepEqual(fremd.steps, [{ txt: 'Rühren' }, { txt: '7' }]);
});
