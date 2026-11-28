// Küchen-Kern · Blatt im Foto: vier Ecken finden, die Perspektive gerade ziehen, das Foto verbessern.
// Klein, ohne Modell und ohne Netz (Klaus 28.11.2026: „nur ein kleines Modell … die Fixierung der Seiten, das automatische Ausrichten
// und Erkennen … die Perspektive angepasst … und eventuell noch eine Fotoverbesserung … Schärfe … Kontrast … die Farbe, aber nicht viel“).
//
// Die Rechnung folgt Workflow PDF (`assets/blatt.js`: finden, homographie, entzerren; `assets/scan-bild.js`: schaerfen), hier als
// ES-Modul OHNE DOM: jedes Bild ist { data: Uint8ClampedArray (RGBA), width, height } – so ist alles in Node prüfbar.
// Anders als dort wird nicht auf A4 gezogen: ein Rezeptbild behält das Seitenverhältnis des Blatts (aus den Kantenlängen gerechnet).
// Unsicher erkannt → die Ecken liegen auf dem ganzen Bild, und das wird gesagt (`sicher: false`, `grund`). Nie still schneiden.

export const BLATT = { klein: 400, kante: 1600 };
/** Grenzen der Regler. Farbe bewusst schmal (Klaus: „die Farbe eventuell, aber nicht viel“). */
export const REGLER = { hell: [-60, 60], kontrast: [-50, 60], farbe: [-40, 40], schaerfe: [0, 100] };
export const VERBESSERN_NEUTRAL = { hell: 0, kontrast: 0, farbe: 0, schaerfe: 0 };

const klemm = (v, a, b) => (v < a ? a : v > b ? b : v);
const leer = (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });

// Verkleinert (nächster Bildpunkt) auf höchstens `lang` px lange Kante: Helligkeit und Buntheit je Punkt
function grauKlein(bild, lang) {
  const f = Math.min(1, lang / Math.max(bild.width, bild.height));
  const w = Math.max(1, Math.round(bild.width * f)), h = Math.max(1, Math.round(bild.height * f));
  const g = new Uint8Array(w * h), sat = new Uint8Array(w * h), d = bild.data;
  for (let y = 0; y < h; y++) {
    const sy = Math.min(bild.height - 1, Math.floor((y + 0.5) / f));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(bild.width - 1, Math.floor((x + 0.5) / f)), i = (sy * bild.width + sx) * 4;
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      g[y * w + x] = (r * 299 + gg * 587 + b * 114) / 1000;
      sat[y * w + x] = Math.max(r, gg, b) - Math.min(r, gg, b);
    }
  }
  return { g, sat, w, h, f };
}
function otsu(g) {
  const hist = new Array(256).fill(0); for (let i = 0; i < g.length; i++) hist[g[i]]++;
  let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sB = 0, wB = 0, best = 0, schwelle = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue; const wF = g.length - wB; if (!wF) break;
    sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
    if (v > best) { best = v; schwelle = t; }
  }
  return schwelle;
}
function groessteFlaeche(m, w, h) {
  const lab = new Int32Array(w * h), q = new Int32Array(w * h); let beste = null, n = 0;
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || lab[s]) continue; n++; let kopf = 0, fuss = 0, groesse = 0; q[fuss++] = s; lab[s] = n;
    while (kopf < fuss) {
      const p = q[kopf++]; groesse++; const x = p % w, y = (p - x) / w;
      if (x > 0 && m[p - 1] && !lab[p - 1]) { lab[p - 1] = n; q[fuss++] = p - 1; }
      if (x < w - 1 && m[p + 1] && !lab[p + 1]) { lab[p + 1] = n; q[fuss++] = p + 1; }
      if (y > 0 && m[p - w] && !lab[p - w]) { lab[p - w] = n; q[fuss++] = p - w; }
      if (y < h - 1 && m[p + w] && !lab[p + w]) { lab[p + w] = n; q[fuss++] = p + w; }
    }
    if (!beste || groesse > beste.groesse) beste = { n, groesse };
  }
  return beste ? { lab, n: beste.n, groesse: beste.groesse } : null;
}
function huelle(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const kr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const u = [], l = [];
  for (const p of pts) { while (l.length >= 2 && kr(l[l.length - 2], l[l.length - 1], p) <= 0) l.pop(); l.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (u.length >= 2 && kr(u[u.length - 2], u[u.length - 1], p) <= 0) u.pop(); u.push(p); }
  u.pop(); l.pop(); return l.concat(u);
}
const flaeche = (q) => { let a = 0; for (let i = 0; i < q.length; i++) { const p = q[i], r = q[(i + 1) % q.length]; a += p[0] * r[1] - r[0] * p[1]; } return Math.abs(a) / 2; };

/** Bringt vier Punkte in die Reihenfolge oben links, oben rechts, unten rechts, unten links (auch nachdem jemand sie überkreuz gezogen hat). */
export function eckenOrdnen(q) {
  const mx = q.reduce((s, p) => s + p[0], 0) / 4, my = q.reduce((s, p) => s + p[1], 0) / 4;
  const z = q.map((p) => [p[0], p[1]]).sort((a, b) => Math.atan2(a[1] - my, a[0] - mx) - Math.atan2(b[1] - my, b[0] - mx));
  let start = 0, m = Infinity; z.forEach((p, i) => { if (p[0] + p[1] < m) { m = p[0] + p[1]; start = i; } });
  return [0, 1, 2, 3].map((i) => z[(start + i) % 4]);
}
function vierEcken(h) {
  let best = null;
  for (let gr = 0; gr < 90; gr += 3) {
    const q = [];
    for (const k of [45, 135, 225, 315]) {
      const a = (gr + k) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
      let bp = h[0], bv = -Infinity; for (const p of h) { const v = p[0] * dx + p[1] * dy; if (v > bv) { bv = v; bp = p; } }
      q.push(bp);
    }
    const A = flaeche(q); if (!best || A > best.A) best = { q, A };
  }
  return { ecken: eckenOrdnen(best.q), A: best.A };
}
export const ganzesBild = (bild) => [[0, 0], [bild.width, 0], [bild.width, bild.height], [0, bild.height]];

/** Sucht das Blatt (hell, wenig bunt) vor dem Hintergrund. Ergebnis: { sicher, ecken:[[x,y]×4] in Bildpunkten, grund }. */
export function findeBlatt(bild) {
  const { g, sat, w, h, f } = grauKlein(bild, BLATT.klein);
  const ganz = ganzesBild(bild);
  const t = otsu(g);
  const m = new Uint8Array(w * h); for (let i = 0; i < m.length; i++) m[i] = g[i] > t && sat[i] < 60 ? 1 : 0;
  const gf = groessteFlaeche(m, w, h);
  if (!gf) return { sicher: false, ecken: ganz, grund: 'kein' };
  const pts = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x; if (gf.lab[p] !== gf.n) continue;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || gf.lab[p - 1] !== gf.n || gf.lab[p + 1] !== gf.n || gf.lab[p - w] !== gf.n || gf.lab[p + w] !== gf.n) pts.push([x + 0.5, y + 0.5]);
  }
  const hu = huelle(pts); if (hu.length < 4) return { sicher: false, ecken: ganz, grund: 'klein' };
  const { ecken, A } = vierEcken(hu);
  const anteil = gf.groesse / (w * h), fuellung = gf.groesse / Math.max(1, A);
  const amRand = ecken.filter((p) => p[0] < 2 || p[1] < 2 || p[0] > w - 2 || p[1] > h - 2).length;
  let grund = '';
  if (anteil < 0.15) grund = 'klein';
  else if (fuellung < 0.85) grund = 'rand';
  else if (amRand >= 3) grund = 'voll';
  if (grund) return { sicher: false, ecken: ganz, grund };
  return { sicher: true, ecken: ecken.map((p) => [klemm(p[0] / f, 0, bild.width), klemm(p[1] / f, 0, bild.height)]), grund: '' };
}

/** Homographie: bildet die vier Ziel-Ecken (`von`) auf die vier Quell-Ecken (`nach`) ab. */
export function homographie(von, nach) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = von[i], [u, v] = nach[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) { if (r === c) continue; const k = A[r][c] / A[c][c]; for (let j = c; j < 8; j++) A[r][j] -= k * A[c][j]; b[r] -= k * b[c]; }
  }
  return b.map((v, i) => v / A[i][i]).concat(1);
}

/** Größe des gerade gezogenen Blatts: mittlere Kantenlängen, lange Kante höchstens `kante`, nie größer als das Foto hergibt. */
export function zielGroesse(ecken, kante = BLATT.kante) {
  const s = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const w = (s(ecken[0], ecken[1]) + s(ecken[3], ecken[2])) / 2, h = (s(ecken[0], ecken[3]) + s(ecken[1], ecken[2])) / 2;
  const f = Math.min(1, kante / Math.max(w, h, 1));
  return { width: Math.max(1, Math.round(w * f)), height: Math.max(1, Math.round(h * f)) };
}

/** Zieht das Viereck `ecken` (oben links, oben rechts, unten rechts, unten links) gerade. Bilinear, ohne DOM. */
export function entzerren(bild, ecken, { kante = BLATT.kante } = {}) {
  const e = eckenOrdnen(ecken), { width: W, height: H } = zielGroesse(e, kante), out = leer(W, H);
  const sd = bild.data, sw = bild.width, sh = bild.height, zd = out.data;
  const Hm = homographie([[0, 0], [W, 0], [W, H], [0, H]], e);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = x + 0.5, py = y + 0.5, n = Hm[6] * px + Hm[7] * py + Hm[8];
      let u = (Hm[0] * px + Hm[1] * py + Hm[2]) / n - 0.5, v = (Hm[3] * px + Hm[4] * py + Hm[5]) / n - 0.5;
      u = klemm(u, 0, sw - 1); v = klemm(v, 0, sh - 1);
      const x0 = u | 0, y0 = v | 0, x1 = Math.min(x0 + 1, sw - 1), y1 = Math.min(y0 + 1, sh - 1), fx = u - x0, fy = v - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = (y0 * sw + x1) * 4, i01 = (y1 * sw + x0) * 4, i11 = (y1 * sw + x1) * 4, o = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) zd[o + k] = (sd[i00 + k] * (1 - fx) + sd[i10 + k] * fx) * (1 - fy) + (sd[i01 + k] * (1 - fx) + sd[i11 + k] * fx) * fy;
      zd[o + 3] = 255;
    }
  }
  return out;
}

/** Dreht um `viertel` × 90° im Uhrzeigersinn. */
export function drehen(bild, viertel = 1) {
  const q = ((viertel % 4) + 4) % 4; if (!q) return { data: new Uint8ClampedArray(bild.data), width: bild.width, height: bild.height };
  const w = bild.width, h = bild.height, W = q === 2 ? w : h, H = q === 2 ? h : w, out = leer(W, H), s = bild.data, d = out.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [nx, ny] = q === 1 ? [h - 1 - y, x] : q === 2 ? [w - 1 - x, h - 1 - y] : [y, w - 1 - x];
    const i = (y * w + x) * 4, o = (ny * W + nx) * 4; d[o] = s[i]; d[o + 1] = s[i + 1]; d[o + 2] = s[i + 2]; d[o + 3] = s[i + 3];
  }
  return out;
}

// Unscharf-Maskieren auf der Helligkeit (wie Workflow PDF scan-bild.js `schaerfen`): Kastenunschärfe, Radius 1 (ab 1300 px 2)
function schaerfeDifferenz(L, w, h, staerke) {
  const r = w > 1300 ? 2 : 1, a = staerke / 40, n = w * h, z = new Float32Array(n), b = new Float32Array(n), out = new Float32Array(n);
  for (let y = 0; y < h; y++) { const o = y * w; let s = 0, c = 0; for (let x = -r; x <= r; x++) if (x >= 0 && x < w) { s += L[o + x]; c++; }
    for (let x = 0; x < w; x++) { z[o + x] = s / c; const raus = x - r, rein = x + r + 1; if (raus >= 0) { s -= L[o + raus]; c--; } if (rein < w) { s += L[o + rein]; c++; } } }
  for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let y = -r; y <= r; y++) if (y >= 0 && y < h) { s += z[y * w + x]; c++; }
    for (let y = 0; y < h; y++) { b[y * w + x] = s / c; const raus = y - r, rein = y + r + 1; if (raus >= 0) { s -= z[raus * w + x]; c--; } if (rein < h) { s += z[rein * w + x]; c++; } } }
  for (let p = 0; p < n; p++) out[p] = a * (L[p] - b[p]);
  return out;
}

/** Foto verbessern: Helligkeit, Kontrast, Farbe (Sättigung, schmal), Schärfe. Alle Werte 0 = unverändert (dieselben Bytes). */
export function verbessern(bild, opt = {}) {
  const hell = klemm(+opt.hell || 0, ...REGLER.hell), kontrast = klemm(+opt.kontrast || 0, ...REGLER.kontrast);
  const farbe = klemm(+opt.farbe || 0, ...REGLER.farbe), schaerfe = klemm(+opt.schaerfe || 0, ...REGLER.schaerfe);
  const w = bild.width, h = bild.height, n = w * h, s = bild.data, out = leer(w, h), d = out.data;
  if (!hell && !kontrast && !farbe && !schaerfe) { d.set(s); return out; }
  let dL = null;
  if (schaerfe) { const L = new Float32Array(n); for (let p = 0; p < n; p++) { const i = p * 4; L[p] = 0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2]; } dL = schaerfeDifferenz(L, w, h, schaerfe); }
  const k = kontrast >= 0 ? 1 + kontrast / 50 : 1 + kontrast / 100, sa = 1 + farbe / 100, hb = hell * 1.28;
  for (let p = 0; p < n; p++) {
    const i = p * 4, plus = dL ? dL[p] : 0;
    let r = s[i] + plus, g = s[i + 1] + plus, b = s[i + 2] + plus;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    r = l + (r - l) * sa; g = l + (g - l) * sa; b = l + (b - l) * sa;
    d[i] = (r - 128) * k + 128 + hb; d[i + 1] = (g - 128) * k + 128 + hb; d[i + 2] = (b - 128) * k + 128 + hb; d[i + 3] = s[i + 3];
  }
  return out;
}
