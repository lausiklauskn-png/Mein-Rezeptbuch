// Küchen-Kern · Fenster „Gerade ziehen & verbessern“ (Klaus 28.11.2026, für Mein Rezeptbuch und Mein Mixarium gleich).
// Zwei Reiter wie im Scanner von Workflow PDF: „Ecken“ (vier Punkte auf die Blattecken, automatisch vorbelegt, drehen) und
// „Ergebnis“ (gerade gezogen, Helligkeit, Kontrast, Farbe, Schärfe). Die Rechnung steht in `blatt.mjs`; hier nur die Bedienung.
// Die Texte kommen fertig übersetzt von der App (`t`), weil die Sprach-Tabellen je App geführt werden.
// Gerechnet wird in der Vorschau auf höchstens VORSCHAU px, beim Übernehmen einmal am ganzen Bild (lange Kante höchstens 1600 px).
import { findeBlatt, entzerren, verbessern, drehen, eckenOrdnen, REGLER, VERBESSERN_NEUTRAL, BLATT } from './blatt.mjs';
import { alsDatenAdresse } from './bild.mjs';

export const VORSCHAU = 900;
const STIL = `
.bt{position:fixed;inset:0;z-index:1000;display:flex;flex-direction:column;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));padding-top:calc(10px + env(safe-area-inset-top,0px));background:#14100c;color:#f4ece2;font:inherit;overflow:auto}
.bt-kopf{display:flex;align-items:center;gap:8px}.bt-kopf h2{flex:1;margin:0;font-size:17px;font-weight:650}
.bt button{font:inherit;color:inherit;cursor:pointer}
.bt-x{width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);display:grid;place-items:center}
.bt .ic,.bt svg.ic{width:18px;height:18px}
.bt-reiter{display:flex;gap:6px}.bt-reiter button{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;height:32px;border-radius:16px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);font-size:13.5px;font-weight:600}
.bt-reiter button[aria-pressed="true"]{background:#f4ece2;color:#14100c;border-color:#f4ece2}
.bt-buehne{flex:1 1 auto;min-height:180px;display:grid;place-items:center;padding:16px}
.bt-rahmen{position:relative;line-height:0;touch-action:none;user-select:none;-webkit-user-select:none}
.bt-rahmen canvas{display:block;max-width:100%;max-height:calc(100dvh - 300px);min-height:120px;width:auto;height:auto;border-radius:4px}
.bt-linie{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.bt-linie polygon{fill:rgba(255,255,255,.08);stroke:#ff5a3c;stroke-width:2;vector-effect:non-scaling-stroke}
.bt-ecke{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:3px solid #fff;background:#ff5a3c;box-shadow:0 1px 6px rgba(0,0,0,.6);padding:0;touch-action:none}
.bt-ecke::after{content:"";position:absolute;inset:-12px;border-radius:50%}
.bt-ecke:focus-visible{outline:3px solid #fff;outline-offset:2px}
.bt-befund{margin:0;font-size:13px;text-align:center;color:rgba(244,236,226,.85);min-height:1.3em}
.bt-befund[data-sicher="nein"]{color:#ffc2b5}
.bt-werk{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
.bt-werk>button,.bt-fuss button{justify-content:center;height:36px;padding:0 14px;border-radius:18px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);display:inline-flex;align-items:center;gap:6px;font-size:13.5px;font-weight:600}
.bt-regler{display:grid;grid-template-columns:auto 1fr 3.2em;align-items:center;gap:4px 10px;width:min(100%,560px);font-size:13.5px}
.bt-regler input{width:100%;accent-color:#ff5a3c}.bt-regler b{font-weight:600;text-align:right;font-variant-numeric:tabular-nums}
.bt-fuss{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.bt-fuss .bt-ok{background:#f4ece2;color:#14100c;border-color:#f4ece2}
@media(min-width:900px) and (orientation:landscape){.bt{display:grid;grid-template-columns:1fr 340px;grid-template-rows:auto auto auto auto 1fr;column-gap:16px;row-gap:12px}
 .bt-kopf,.bt-reiter{grid-column:1/-1}.bt-reiter{width:min(100%,520px);justify-self:center}.bt-buehne{grid-row:3/6;grid-column:1}
 .bt-befund{grid-column:2;grid-row:3;align-self:start}.bt-werk{grid-column:2;grid-row:4;align-self:start}.bt-fuss{grid-column:2;grid-row:5;align-self:start}.bt-rahmen canvas{max-height:calc(100dvh - 150px)}}
`;
function stilEinmal() { if (document.getElementById('bt-stil')) return; const s = document.createElement('style'); s.id = 'bt-stil'; s.textContent = STIL; document.head.appendChild(s); }
const leinwandVon = (b) => { const c = document.createElement('canvas'); c.width = b.width; c.height = b.height; c.getContext('2d').putImageData(new ImageData(b.data, b.width, b.height), 0, 0); return c; };
async function bildDaten(adresse, kante) {
  const img = new Image(); img.decoding = 'async'; img.src = adresse; await img.decode();
  const f = Math.min(1, kante / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.max(1, Math.round(img.naturalWidth * f)), h = Math.max(1, Math.round(img.naturalHeight * f));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h); return { data: d.data, width: w, height: h };
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ganz = () => [[0, 0], [1, 0], [1, 1], [0, 1]];
const neutral = (w) => Object.keys(VERBESSERN_NEUTRAL).every((k) => !w[k]);
const istGanz = (e) => e.every((p, i) => Math.abs(p[0] - ganz()[i][0]) < 1e-6 && Math.abs(p[1] - ganz()[i][1]) < 1e-6);

/**
 * Öffnet das Fenster über `ort` (wird geleert und gefüllt).
 * @param {{ort:HTMLElement, adresse:string, t:object, ic:(n:string)=>string, fertig:(adresse:string)=>void, zu:()=>void}} o
 * `fertig` bekommt das neue Bild als data-URL (WebP, sonst JPEG); bei „nichts geändert“ wird nur `zu` gerufen.
 */
export async function blattFenster({ ort, adresse, t, ic, fertig, zu }) {
  stilEinmal();
  const Z = { modus: 'ecken', ecken: ganz(), werte: { ...VERBESSERN_NEUTRAL }, viertel: 0, befund: '', sicher: true, voll: null, vor: null, laeuft: false };
  ort.innerHTML = `<div class="bt" role="dialog" aria-modal="true" aria-label="${esc(t.titel)}" data-bt-fenster>
   <div class="bt-kopf"><h2>${esc(t.titel)}</h2><button class="bt-x" data-bt="zu" aria-label="${esc(t.schliessen)}">${ic('x')}</button></div>
   <div class="bt-reiter" role="group"><button data-bt="modus" data-m="ecken" aria-pressed="true">${esc(t.ecken)}</button><button data-bt="modus" data-m="ergebnis" aria-pressed="false">${esc(t.ergebnis)}</button></div>
   <div class="bt-buehne"><div class="bt-rahmen" data-bt-rahmen><canvas data-bt-bild></canvas><svg class="bt-linie" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon data-bt-linie points=""/></svg>
    ${[0, 1, 2, 3].map((i) => `<button class="bt-ecke" data-bt-ecke="${i}" aria-label="${esc(t.ecke)} ${i + 1}"></button>`).join('')}</div></div>
   <p class="bt-befund" data-bt-befund></p>
   <div class="bt-werk" data-bt-werk></div>
   <div class="bt-fuss"><button class="bt-ok" data-bt="ok">${ic('haken')}${esc(t.uebernehmen)}</button><button data-bt="zu">${esc(t.abbrechen)}</button></div></div>`;
  const $ = (s) => ort.querySelector(s), fenster = $('[data-bt-fenster]'), leinwand = $('[data-bt-bild]'), rahmen = $('[data-bt-rahmen]');
  const schliessen = () => { removeEventListener('keydown', taste); ort.innerHTML = ''; };
  const taste = (e) => { if (e.key === 'Escape') { schliessen(); zu?.(); } };
  addEventListener('keydown', taste);

  try { Z.voll = await bildDaten(adresse, BLATT.kante * 2); } catch { schliessen(); zu?.(); return; }
  Z.vor = verkleinere(Z.voll);
  function verkleinere(b) {
    const f = Math.min(1, VORSCHAU / Math.max(b.width, b.height)); if (f === 1) return b;
    const c = leinwandVon(b), w = Math.round(b.width * f), h = Math.round(b.height * f), k = document.createElement('canvas'); k.width = w; k.height = h;
    const x = k.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0, w, h); const d = x.getImageData(0, 0, w, h); return { data: d.data, width: w, height: h };
  }
  const px = (b) => Z.ecken.map((p) => [p[0] * b.width, p[1] * b.height]);
  function finden() {
    const r = findeBlatt(Z.vor); Z.sicher = r.sicher;
    Z.ecken = r.ecken.map((p) => [p[0] / Z.vor.width, p[1] / Z.vor.height]);
    Z.befund = r.sicher ? t.gefunden : t.nichtGefunden;
  }
  finden();

  let rahmenUhr = 0;
  function malen() {
    cancelAnimationFrame(rahmenUhr);
    rahmenUhr = requestAnimationFrame(() => {
      const b = Z.modus === 'ecken' ? Z.vor : verbessern(entzerren(Z.vor, px(Z.vor), { kante: VORSCHAU }), Z.werte);
      leinwand.width = b.width; leinwand.height = b.height; leinwand.getContext('2d').putImageData(new ImageData(b.data, b.width, b.height), 0, 0);
      leinwand.dataset.breite = b.width; leinwand.dataset.hoehe = b.height;
      eckenSetzen();
    });
  }
  function eckenSetzen() {
    const zeig = Z.modus === 'ecken';
    ort.querySelectorAll('[data-bt-ecke]').forEach((k, i) => { k.hidden = !zeig; k.style.left = Z.ecken[i][0] * 100 + '%'; k.style.top = Z.ecken[i][1] * 100 + '%'; });
    const l = $('[data-bt-linie]'); l.setAttribute('points', zeig ? Z.ecken.map((p) => p[0] * 100 + ',' + p[1] * 100).join(' ') : '');
  }
  function werkZeichnen() {
    ort.querySelectorAll('[data-bt="modus"]').forEach((k) => k.setAttribute('aria-pressed', String(k.dataset.m === Z.modus)));
    const b = $('[data-bt-befund]'); b.textContent = Z.modus === 'ecken' ? Z.befund : ''; b.dataset.sicher = Z.sicher ? 'ja' : 'nein';
    const w = $('[data-bt-werk]');
    if (Z.modus === 'ecken') w.innerHTML = `<button data-bt="finden">${ic('funken')}${esc(t.automatisch)}</button><button data-bt="ganz">${ic('voll')}${esc(t.ganz)}</button><button data-bt="drehen">${ic('pfeile')}${esc(t.drehen)}</button>`;
    else w.innerHTML = `<div class="bt-regler">${['hell', 'kontrast', 'farbe', 'schaerfe'].map((k) => `<label for="bt-r-${k}">${esc(t[k])}</label><input type="range" id="bt-r-${k}" data-bt-regler="${k}" min="${REGLER[k][0]}" max="${REGLER[k][1]}" step="1" value="${Z.werte[k]}"><b data-bt-wert="${k}">${Z.werte[k]}</b>`).join('')}</div><button data-bt="null">${esc(t.zuruecksetzen)}</button>`;
  }
  werkZeichnen(); malen();

  // Ecken ziehen (Finger und Maus)
  let zug = null;
  rahmen.addEventListener('pointerdown', (e) => { const k = e.target.closest('[data-bt-ecke]'); if (!k || Z.modus !== 'ecken') return; e.preventDefault(); zug = +k.dataset.btEcke; try { k.setPointerCapture(e.pointerId); } catch { /* ohne */ } });
  rahmen.addEventListener('pointermove', (e) => { if (zug == null) return; const r = leinwand.getBoundingClientRect(); Z.ecken[zug] = [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; Z.befund = t.hand; Z.sicher = true; eckenSetzen(); });
  const loslassen = () => { if (zug == null) return; zug = null; Z.ecken = eckenOrdnen(Z.ecken); eckenSetzen(); werkZeichnen(); };
  rahmen.addEventListener('pointerup', loslassen); rahmen.addEventListener('pointercancel', loslassen);
  fenster.addEventListener('input', (e) => { const k = e.target.dataset?.btRegler; if (!k) return; Z.werte[k] = +e.target.value; const b = ort.querySelector(`[data-bt-wert="${k}"]`); if (b) b.textContent = e.target.value; malen(); });
  fenster.addEventListener('click', async (e) => {
    const k = e.target.closest('[data-bt]'); if (!k) return; const a = k.dataset.bt;
    if (a === 'zu') { schliessen(); zu?.(); }
    else if (a === 'modus') { Z.modus = k.dataset.m; werkZeichnen(); malen(); }
    else if (a === 'finden') { finden(); werkZeichnen(); malen(); }
    else if (a === 'ganz') { Z.ecken = ganz(); Z.sicher = true; Z.befund = t.hand; werkZeichnen(); malen(); }
    else if (a === 'drehen') { Z.voll = drehen(Z.voll, 1); Z.vor = drehen(Z.vor, 1); Z.viertel = (Z.viertel + 1) % 4; finden(); werkZeichnen(); malen(); }
    else if (a === 'null') { Z.werte = { ...VERBESSERN_NEUTRAL }; werkZeichnen(); malen(); }
    else if (a === 'ok') {
      if (Z.laeuft) return;
      if (istGanz(Z.ecken) && neutral(Z.werte) && !Z.viertel) { schliessen(); zu?.(); return; }   /* nichts geändert: das Bild bleibt Byte für Byte */
      Z.laeuft = true; k.disabled = true;
      await new Promise((r) => setTimeout(r, 30));   /* den gedrückten Knopf erst zeigen, dann rechnen */
      const b = verbessern(entzerren(Z.voll, px(Z.voll), { kante: BLATT.kante }), Z.werte);
      const neu = alsDatenAdresse(leinwandVon(b));
      schliessen(); fertig(neu);
    }
  });
  return { schliessen, zustand: Z };
}
