// Küchen-Kern · Teilen per QR-Code. Übernommen aus der alten App (shareRecipeQR, _showShareModal, _checkShareUrl).
// Die alte App legte einen LINK in den Code: <Adresse der App>#share=z<base64 von deflate-raw(JSON)>; wer ihn scannt,
// öffnet die App und bekommt das Rezept angeboten. Das JSON trug nur Name, Kategorie, Portionen, Geschmack, Zutaten und
// Schritte (kein Bild). Gezeichnet hat den Code die mitgelieferte Bibliothek qrcode-generator (Stufe L, 3 px Rand).
// Hier steht dasselbe in drei Teilen:
//   1. rezeptAlsText()            → das Rezept als lesbarer Text (jede Handy-Kamera zeigt ihn, auch ohne die App)
//   2. teilLink() / ausTeilLink() → der Link der alten App, in beide Richtungen; alte und neue Links sind gleich gebaut
//   3. qrMatrix() / qrSvg()       → ein eigener QR-Erzeuger nach ISO/IEC 18004, ohne Netz und ohne fremde Datei:
//      Byte-Modus (UTF-8), Versionen 1–40, Fehlerkorrektur L/M/Q/H, Reed-Solomon, alle 8 Masken mit Strafpunkten,
//      Format- und Versions-Information. Der Rand ist 4 Module breit, wie die Norm ihn verlangt.
// Was nicht in Version 40 passt, wird nicht gekürzt: qrMatrix() wirft mit Klartext, passtInQr() fragt vorher.
import { text, fuelle } from '../oberflaeche/sprache.mjs';
import { normalisiere, sicht } from '../modell/rezept.mjs';

// ───────────────────────── 1 · Rezept als Text ─────────────────────────

const zeit = (r) => { const z = parseInt(r && r.prepTime, 10); return Number.isFinite(z) && z > 0 ? z : 0; };

/** Das Rezept als kurzer, lesbarer Text: Name, Portionen und Zeit, Zutaten, nummerierte Schritte.
 *  Liegt am Rezept eine Übersetzung in `sprache`, steht sie da (wie in der Anzeige). Ohne Bild, ohne Bewertung. */
export function rezeptAlsText(rezept, sprache = 'de') {
  const r = sicht(normalisiere(rezept || {}), sprache), z = zeit(r), aus = [r.name];
  aus.push((r.servings === 1 ? text(sprache, '1 Portion', '1 serving') : fuelle(text(sprache, '{0} Portionen', '{0} servings'), r.servings)) + (z ? ' · ' + z + ' ' + text(sprache, 'Min', 'min') : ''));
  if (r.ings.length) aus.push('', text(sprache, 'Zutaten', 'Ingredients') + ':', ...r.ings.map((x) => [x.amt, x.unit, x.name].filter(Boolean).join(' ') + (x.note ? ' (' + x.note + ')' : '')));
  if (r.steps.length) aus.push('', text(sprache, 'Zubereitung', 'Preparation') + ':', ...r.steps.map((x, i) => (i + 1) + '. ' + x.txt));
  return aus.join('\n');
}

// ───────────────────────── 2 · Der Link der alten App ─────────────────────────

const MARKE = '#share=';
/** Mehr als so viele Bytes entpackt ein Link nie (ein gepackter Link kann sich sonst riesig aufblasen). */
export const TEIL_MAX_BYTES = 262144;

/** Die Daten, die die alte App in den Link legte: { v: 2, n, c, s, fl, i: [{ a, u, n }], st: [Text] }.
 *  Neu ist nur `t` (Zeit in Minuten), wenn das Rezept eine hat; die alte App überliest das Feld. Kein Bild. */
export function teilDaten(rezept) {
  const r = normalisiere(rezept || {}), z = zeit(r);
  const d = { v: 2, n: r.name, c: r.cat, s: r.servings, fl: r.flavors, i: r.ings.map((x) => ({ a: x.amt, u: x.unit, n: x.name })), st: r.steps.map((x) => x.txt) };
  if (z) d.t = z;
  return d;
}

const b64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(s); };
const b64Bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function durchStrom(strom, bytes, max = Infinity) {
  const w = strom.writable.getWriter(); w.write(bytes).catch(() => {}); w.close().catch(() => {});
  const leser = strom.readable.getReader(), teile = []; let n = 0;
  for (;;) { const { done, value } = await leser.read(); if (done) break; n += value.length; if (n > max) { leser.cancel().catch(() => {}); throw new Error('zu gross'); } teile.push(value); }
  const aus = new Uint8Array(n); let o = 0; for (const t of teile) { aus.set(t, o); o += t.length; }
  return aus;
}

/** Der Link wie in der alten App: basis + '#share=' + 'z' + base64(deflate-raw(JSON)).
 *  Kann das Gerät nicht packen, steht das JSON ungepackt als base64 da (ohne 'z'), auch das wie in der alten App.
 *  basis: Adresse der App ohne '#…'; ohne Angabe die Seite, auf der die App läuft. */
export async function teilLink(rezept, basis) {
  const roh = new TextEncoder().encode(JSON.stringify(teilDaten(rezept)));
  let last;
  try { last = 'z' + b64(await durchStrom(new CompressionStream('deflate-raw'), roh)); } catch { last = b64(roh); }
  const ort = globalThis.location;
  return (basis ?? (ort ? ort.origin + ort.pathname : '')) + MARKE + last;
}

const kurz = (v, n) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, n) : '');   /* nur Text und Zahlen; ein Objekt aus fremdem JSON wird nicht zu Text gemacht */

/** Liest einen Teil-Link (ganze Adresse, nur '#share=…' oder nur die Last dahinter). Zurück: ein Rezept in Rohform
 *  für normalisiere() – { name, cat, servings, prepTime?, flavors, ings: [{ amt, unit, name }], steps: [{ txt }] } –
 *  oder null, wenn es kein lesbarer Teil-Link ist. Der Inhalt ist fremd: nur diese Felder, als Text, in der Länge
 *  begrenzt. Eine fehlende Kategorie bleibt leer (die alte App setzte „Fleisch“). */
export async function ausTeilLink(adresse) {
  let s = String(adresse ?? '').trim(); const i = s.indexOf(MARKE);
  if (i >= 0) s = s.slice(i + MARKE.length); else if (/[#:?]/.test(s)) return null;
  if (!s) return null;
  try {
    if (s.includes('%')) s = decodeURIComponent(s);
    const gepackt = s[0] === 'z', bytes = b64Bytes((gepackt ? s.slice(1) : s).replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/'));
    if (bytes.length > TEIL_MAX_BYTES) return null;
    const d = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(gepackt ? await durchStrom(new DecompressionStream('deflate-raw'), bytes, TEIL_MAX_BYTES) : bytes));
    if (!d || typeof d !== 'object' || !kurz(d.n, 200)) return null;
    const p = parseInt(d.s, 10), z = parseInt(d.t, 10), liste = (v) => (Array.isArray(v) ? v.slice(0, 200) : []);
    const r = { name: kurz(d.n, 200), cat: kurz(d.c, 60), servings: Number.isFinite(p) && p > 0 && p < 1000 ? p : 4, flavors: liste(d.fl).map((x) => kurz(x, 60)).filter(Boolean),
      ings: liste(d.i).map((x) => (x && typeof x === 'object' ? { amt: kurz(x.a, 40), unit: kurz(x.u, 40), name: kurz(x.n, 200) } : { amt: '', unit: '', name: kurz(x, 200) })).filter((x) => x.name || x.amt),
      steps: liste(d.st).map((x) => ({ txt: kurz(x && typeof x === 'object' ? x.txt : x, 4000) })).filter((x) => x.txt) };
    if (Number.isFinite(z) && z > 0 && z < 100000) r.prepTime = z;
    return r;
  } catch { return null; }
}

// ───────────────────────── 3 · QR-Code ─────────────────────────
// Ein Feld hat 17 + 4·Version Module je Kante. Koordinaten: x = Spalte, y = Zeile, (0,0) oben links.

/** Die vier Stufen der Fehlerkorrektur (L ≈ 7 %, M ≈ 15 %, Q ≈ 25 %, H ≈ 30 % dürfen fehlen) mit ihrer Kennzahl in der Format-Information. */
export const QR_STUFEN = { L: 1, M: 0, Q: 3, H: 2 };
// Prüfworte je Block und Zahl der Blöcke, Index = Version (ISO/IEC 18004, Tabelle 9).
const PRUEF = {
  L: [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};
const BLOECKE = {
  L: [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};

/** Kantenlänge einer Version in Modulen (Version 1: 21 … Version 40: 177). */
export const qrGroesse = (version) => 17 + 4 * version;

/** Mitten der Ausrichtungs-Muster einer Version (Anhang E der Norm), z. B. Version 7 → [6, 22, 38]. Version 1 hat keine. */
export function qrAusrichtung(version) {
  if (version < 2) return [];
  const n = Math.floor(version / 7) + 2, schritt = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (n * 2 - 2)) * 2, p = [6];
  for (let pos = qrGroesse(version) - 7; p.length < n; pos -= schritt) p.splice(1, 0, pos);
  return p;
}

/** Die 15 Bits der Format-Information: 2 Bits Stufe, 3 Bits Maske, 10 Prüfbits (BCH 15,5 mit 0x537), danach XOR 0x5412. */
export function qrFormatBits(stufe, maske) {
  const d = (QR_STUFEN[stufe] << 3) | maske; let r = d;
  for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
  return ((d << 10) | r) ^ 0x5412;
}
/** Die 18 Bits der Versions-Information (ab Version 7): 6 Bits Version, 12 Prüfbits (BCH 18,6 mit 0x1F25). */
export function qrVersionsBits(version) {
  let r = version;
  for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
  return (version << 12) | r;
}

// Das Gerüst einer Version: alle festen Muster. m = Module (1 dunkel), fest = 1, wo kein Datenplatz ist.
function geruest(version) {
  const g = qrGroesse(version), m = new Uint8Array(g * g), fest = new Uint8Array(g * g);
  const setze = (x, y, dunkel) => { m[y * g + x] = dunkel ? 1 : 0; fest[y * g + x] = 1; };
  for (let i = 0; i < g; i++) { setze(6, i, i % 2 === 0); setze(i, 6, i % 2 === 0); }                                   /* Takt-Muster in Zeile 6 und Spalte 6 */
  for (const [cx, cy] of [[3, 3], [g - 4, 3], [3, g - 4]])                                                            /* drei Sucher-Muster mit hellem Trennrand */
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && y >= 0 && x < g && y < g) setze(x, y, d !== 2 && d !== 4);
    }
  const a = qrAusrichtung(version), l = a.length - 1;                                                                 /* Ausrichtungs-Muster, nicht in den drei Sucher-Ecken */
  a.forEach((cy, i) => a.forEach((cx, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === l) || (i === l && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setze(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  for (let i = 0; i < 9; i++) { fest[i * g + 8] = 1; fest[8 * g + i] = 1; }                                             /* Plätze der Format-Information, Inhalt folgt mit der Maske */
  for (let i = 0; i < 8; i++) { fest[8 * g + g - 1 - i] = 1; fest[(g - 1 - i) * g + 8] = 1; }
  if (version >= 7) { const b = qrVersionsBits(version);                                                              /* Versions-Information: zweimal 6 × 3 Module */
    for (let i = 0; i < 18; i++) { const d = (b >>> i) & 1, s = g - 11 + (i % 3), z = Math.floor(i / 3); setze(s, z, d); setze(z, s, d); } }
  return { g, m, fest };
}
function setzeFormat(m, g, stufe, maske) {
  const b = qrFormatBits(stufe, maske), bit = (i) => (b >>> i) & 1, setze = (x, y, d) => { m[y * g + x] = d; };
  for (let i = 0; i <= 5; i++) setze(8, i, bit(i));                                                                    /* erste Kopie um den Sucher oben links */
  setze(8, 7, bit(6)); setze(8, 8, bit(7)); setze(7, 8, bit(8));
  for (let i = 9; i < 15; i++) setze(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) setze(g - 1 - i, 8, bit(i));                                                             /* zweite Kopie: oben rechts und unten links */
  for (let i = 8; i < 15; i++) setze(8, g - 15 + i, bit(i));
  setze(8, g - 8, 1);                                                                                                  /* das eine Modul, das immer dunkel ist */
}

const PLAENE = new Map();
/** Der Aufbau einer Version in einer Stufe: { version, stufe, groesse, gesamt (Codeworte), bloecke, pruefJeBlock,
 *  daten (Datenworte), bytes (so viele Bytes Text passen im Byte-Modus hinein), restBits }. */
export function qrPlan(version, stufe = 'M') {
  if (!Number.isInteger(version) || version < 1 || version > 40) throw new Error('QR-Version 1 bis 40, nicht ' + version);
  if (!(stufe in QR_STUFEN)) throw new Error('QR-Stufe L, M, Q oder H, nicht ' + stufe);
  const k = version + stufe; let p = PLAENE.get(k);
  if (!p) { const { fest } = geruest(version); let frei = 0; for (const f of fest) if (!f) frei++;                    /* gezählt, nicht aus einer Formel: jedes Modul, das kein festes Muster ist */
    const gesamt = frei >>> 3, bloecke = BLOECKE[stufe][version], pruefJeBlock = PRUEF[stufe][version], daten = gesamt - bloecke * pruefJeBlock;
    p = Object.freeze({ version, stufe, groesse: qrGroesse(version), gesamt, bloecke, pruefJeBlock, daten, bytes: Math.floor((daten * 8 - 4 - (version < 10 ? 8 : 16)) / 8), restBits: frei & 7 });
    PLAENE.set(k, p); }
  return p;
}
/** So viele Bytes passen höchstens in einen QR-Code (Version 40): L 2953, M 2331, Q 1663, H 1273. */
export const QR_MAX_BYTES = Object.freeze({ L: qrPlan(40, 'L').bytes, M: qrPlan(40, 'M').bytes, Q: qrPlan(40, 'Q').bytes, H: qrPlan(40, 'H').bytes });

const alsBytes = (t) => (typeof t === 'string' ? new TextEncoder().encode(t) : t instanceof Uint8Array ? t : Uint8Array.from(t || []));
/** Die kleinste Version, in die `bytes` Bytes in dieser Stufe passen, oder 0, wenn auch Version 40 nicht reicht. */
export function qrVersion(bytes, stufe = 'M') { for (let v = 1; v <= 40; v++) if (qrPlan(v, stufe).bytes >= bytes) return v; return 0; }
/** Passt der Text (als UTF-8) in einen QR-Code dieser Stufe? Umlaute zählen zwei Bytes, viele Zeichen drei oder vier. */
export const passtInQr = (inhalt, stufe = 'M') => alsBytes(inhalt).length <= QR_MAX_BYTES[stufe];

// Rechnen im Körper GF(256) mit dem Polynom x⁸+x⁴+x³+x²+1 (0x11D), für die Reed-Solomon-Prüfworte.
const HOCH = new Uint8Array(510), LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) { HOCH[i] = HOCH[i + 255] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; }
const mal = (a, b) => (a && b ? HOCH[LOG[a] + LOG[b]] : 0);
const ERZEUGER = new Map();
function erzeuger(n) {   /* (x − α⁰)(x − α¹)…(x − αⁿ⁻¹), höchster Grad zuerst, ohne die führende 1 */
  let p = ERZEUGER.get(n);
  if (!p) { p = [1]; for (let i = 0; i < n; i++) { const q = new Array(p.length + 1).fill(0); p.forEach((c, j) => { q[j] ^= c; q[j + 1] ^= mal(c, HOCH[i]); }); p = q; } p = p.slice(1); ERZEUGER.set(n, p); }
  return p;
}
/** Reed-Solomon: die `anzahl` Prüfworte zu einem Block Datenworte (Rest der Division durch das Erzeuger-Polynom). */
export function rsPruefworte(daten, anzahl) {
  const e = erzeuger(anzahl), rest = new Uint8Array(anzahl);
  for (const b of daten) { const f = b ^ rest[0]; rest.copyWithin(0, 1); rest[anzahl - 1] = 0; if (f) for (let i = 0; i < anzahl; i++) rest[i] ^= mal(e[i], f); }
  return rest;
}

/** Die Datenworte im Byte-Modus: Kennung 0100, Länge (8 Bits bis Version 9, sonst 16), die Bytes, Schlusszeichen 0000,
 *  auf ganze Bytes aufgefüllt, dann die Füllworte 236 und 17 im Wechsel, bis der Platz voll ist. */
export function qrDatenworte(bytes, plan) {
  const w = new Uint8Array(plan.daten); let n = 0;
  const schiebe = (wert, breite) => { for (let i = breite - 1; i >= 0; i--, n++) w[n >>> 3] |= ((wert >>> i) & 1) << (7 - (n & 7)); };
  schiebe(4, 4); schiebe(bytes.length, plan.version < 10 ? 8 : 16); for (const b of bytes) schiebe(b, 8);
  n = Math.min(plan.daten * 8, n + 4);                                                                                 /* Schlusszeichen: bis zu vier Nullen */
  for (let i = (n + 7) >>> 3, f = 236; i < plan.daten; i++, f ^= 236 ^ 17) w[i] = f;
  return w;
}
/** Teilt die Datenworte in Blöcke, rechnet je Block die Prüfworte und verschachtelt beides zur Folge der Codeworte. */
export function qrCodeworte(daten, plan) {
  const { bloecke: nb, pruefJeBlock: np, gesamt } = plan, kurzLaenge = Math.floor(gesamt / nb) - np, ersteLange = nb - (gesamt % nb), D = [], P = [];
  for (let b = 0, k = 0; b < nb; b++) { const d = daten.subarray(k, k += kurzLaenge + (b >= ersteLange ? 1 : 0)); D.push(d); P.push(rsPruefworte(d, np)); }   /* die hinteren Blöcke sind ein Wort länger */
  const aus = new Uint8Array(gesamt); let o = 0;
  for (let i = 0; i <= kurzLaenge; i++) for (const d of D) if (i < d.length) aus[o++] = d[i];
  for (let i = 0; i < np; i++) for (const p of P) aus[o++] = p[i];
  return aus;
}

/** Die acht Masken: MASKEN[nr](x, y) ist wahr, wo das Daten-Modul umgedreht wird (x = Spalte, y = Zeile). */
export const QR_MASKEN = [
  (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

// Legt die Codeworte in das Gerüst: in Doppelspalten von rechts nach links, abwechselnd aufwärts und abwärts, Spalte 6 wird übersprungen.
function legeDaten({ g, m, fest }, worte) {
  const n = worte.length * 8; let i = 0;
  for (let rechts = g - 1; rechts >= 1; rechts -= 2) {
    if (rechts === 6) rechts = 5;
    const hoch = ((rechts + 1) & 2) === 0;
    for (let v = 0; v < g; v++) for (let j = 0; j < 2; j++) {
      const x = rechts - j, y = hoch ? g - 1 - v : v;
      if (!fest[y * g + x] && i < n) { m[y * g + x] = (worte[i >>> 3] >>> (7 - (i & 7))) & 1; i++; }                   /* die Restbits am Ende bleiben hell */
    }
  }
}

/** Strafpunkte eines fertigen Felds (Uint8Array, g × g) nach den vier Regeln der Norm; die Maske mit den wenigsten gewinnt.
 *  1: Läufe ab fünf gleichen Modulen (3 + je weiteres 1) · 2: 2×2-Flächen einer Farbe (3) ·
 *  3: das Sucher-Bild 1:1:3:1:1 mit vier hellen Modulen davor oder dahinter (40; außerhalb des Felds gilt als hell) ·
 *  4: Abweichung des Dunkel-Anteils von 50 % (10 je volle 5 %). */
export function qrStrafe(m, g) {
  let s = 0, dunkel = 0;
  const hell = (lese, von, bis) => { for (let i = Math.max(von, 0); i < Math.min(bis, g); i++) if (lese(i)) return false; return true; };
  for (let richtung = 0; richtung < 2; richtung++) for (let a = 0; a < g; a++) {
    const lese = richtung ? (b) => m[b * g + a] : (b) => m[a * g + b];
    for (let b = 0, lauf = 0, farbe = -1; b < g; b++) { const v = lese(b); if (v === farbe) { lauf++; if (lauf === 5) s += 3; else if (lauf > 5) s++; } else { farbe = v; lauf = 1; } }
    for (let b = 0; b + 6 < g; b++) if (lese(b) && !lese(b + 1) && lese(b + 2) && lese(b + 3) && lese(b + 4) && !lese(b + 5) && lese(b + 6) && (hell(lese, b - 4, b) || hell(lese, b + 7, b + 11))) s += 40;
  }
  for (let y = 0; y < g; y++) for (let x = 0; x < g; x++) { const v = m[y * g + x]; dunkel += v; if (x + 1 < g && y + 1 < g && v === m[y * g + x + 1] && v === m[(y + 1) * g + x] && v === m[(y + 1) * g + x + 1]) s += 3; }
  return s + Math.floor(Math.abs(dunkel * 20 - g * g * 10) / (g * g)) * 10;
}

/** Der ganze QR-Code mit seinen Kenndaten: { version, stufe, maske, groesse, bytes, matrix }.
 *  inhalt: Text (wird UTF-8) oder Bytes. stufe: 'L' | 'M' | 'Q' | 'H'. maske: 0–7 legt die Maske fest (für Proben);
 *  ohne Angabe gewinnt die mit den wenigsten Strafpunkten. Wirft mit Klartext, wenn der Inhalt nicht in Version 40 passt. */
export function qrCode(inhalt, { stufe = 'M', maske, sprache = 'de' } = {}) {
  if (!(stufe in QR_STUFEN)) throw new Error(fuelle(text(sprache, 'Die QR-Stufe „{0}“ gibt es nicht (L, M, Q oder H).', 'There is no QR level “{0}” (L, M, Q or H).'), stufe));
  const bytes = alsBytes(inhalt), version = qrVersion(bytes.length, stufe);
  if (!version) throw new Error(fuelle(text(sprache, 'Das ist zu viel für einen QR-Code: {0} Bytes, höchstens {1} passen hinein (Stufe {2}).', 'This is too much for a QR code: {0} bytes, at most {1} fit (level {2}).'), bytes.length, QR_MAX_BYTES[stufe], stufe));
  const plan = qrPlan(version, stufe), feld = geruest(version), { g, fest } = feld;
  legeDaten(feld, qrCodeworte(qrDatenworte(bytes, plan), plan));
  const mitMaske = (nr) => { const m = feld.m.slice(), f = QR_MASKEN[nr]; for (let y = 0; y < g; y++) for (let x = 0; x < g; x++) if (!fest[y * g + x] && f(x, y)) m[y * g + x] ^= 1; setzeFormat(m, g, stufe, nr); return m; };
  let wahl = maske, m;
  if (Number.isInteger(maske) && maske >= 0 && maske < 8) m = mitMaske(maske);
  else for (let nr = 0, beste = Infinity; nr < 8; nr++) { const versuch = mitMaske(nr), p = qrStrafe(versuch, g); if (p < beste) { beste = p; wahl = nr; m = versuch; } }
  const matrix = []; for (let y = 0; y < g; y++) { const zeile = new Array(g); for (let x = 0; x < g; x++) zeile[x] = m[y * g + x] === 1; matrix.push(zeile); }
  return { version, stufe, maske: wahl, groesse: g, bytes: bytes.length, matrix };
}

/** Der QR-Code als quadratische Matrix: matrix[zeile][spalte] ist true, wo ein dunkles Modul steht. Ohne Rand. */
export const qrMatrix = (inhalt, opt = {}) => qrCode(inhalt, opt).matrix;

/** Der QR-Code als SVG-Text, schwarz auf weiß. rand: heller Rand in Modulen (die Norm verlangt 4), groesse: Kantenlänge
 *  in Pixeln. Das Bild trägt nur Zahlen und feste Zeichen, nichts aus dem Inhalt; titel wird entschärft. */
export function qrSvg(inhalt, { rand = 4, groesse = 280, stufe = 'M', maske, sprache = 'de', titel = 'QR-Code' } = {}) {
  const m = qrMatrix(inhalt, { stufe, maske, sprache }), n = m.length, r = Math.max(0, Math.floor(Number(rand)) || 0), k = n + 2 * r, px = Math.max(1, Math.round(Number(groesse)) || 280);
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) { let l = 1; while (x + l < n && m[y][x + l]) l++; d += `M${x + r} ${y + r}h${l}v1h-${l}z`; x += l - 1; }
  const t = String(titel).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${k} ${k}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="${t}"><rect width="${k}" height="${k}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
