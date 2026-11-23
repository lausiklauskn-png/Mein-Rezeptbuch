// Küchen-Kern · Drucken. Übernommen aus der alten App (printRecipe für ein Rezept, doPrint für Listen).
// druckRezept() und druckListe() sind reine Funktionen: sie liefern ein fertiges, eigenständiges HTML-Dokument als Text.
// drucke() schickt so ein Dokument im Browser an den Drucker („Als PDF speichern“ ist dort der Weg zum PDF).
// Aufbau des Rezeptblatts wie in der alten App: Name · Zeile mit Kategorie, Portionen, Zeit, Geschmack, Sternen · Bild ·
// Zutaten (Kästchen zum Abhaken, Menge für die gewählten Portionen, Name, Notiz) · nummerierte Schritte · Kommentar · Fußzeile.
// Anders als die alte App:
//  - kein neues Fenster (das fing der Popup-Blocker ab), sondern ein unsichtbarer Rahmen in der Seite;
//  - das Dokument trägt eine eigene Inhalts-Richtlinie: kein Skript, kein Abruf aus dem Netz, Bilder nur als data:-Adresse.
//    Ein Bild mit fremder Adresse wird weggelassen. Schriften kommen vom Gerät (Georgia, sonst die Serifenschrift des Systems);
//  - jeder Text aus dem Rezept wird entschärft, auch in Attributen. Die alte App schrieb das Bild und den Kategorienamen roh hinein;
//  - Seitengröße A4 steht ausdrücklich in @page (die alte App nannte nur den Rand).
// rezeptTeile() und rezeptStil() sind die Bausteine des Rezeptblatts; das Buch (buch.mjs) setzt daraus seine Rezeptseiten.
import { text, fuelle, gebiet, kennt } from '../oberflaeche/sprache.mjs';
import { normalisiere, sicht } from '../modell/rezept.mjs';
import { skaliere } from '../modell/mengen.mjs';

/** Entschärft Text für HTML, im Inhalt wie in Attributen: & < > " ' */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Die Inhalts-Richtlinie jedes Druck-Dokuments: nichts aus dem Netz, kein Skript; nur eingebettete Bilder und der eigene Stil. */
export const DRUCK_RICHTLINIE = "default-src 'none'; img-src data:; style-src 'unsafe-inline'";
/** Grundfarbe des Blatts, wenn die Ausgabe keine nennt (das Braun der alten App). */
export const DRUCK_FARBE = '#7a5840';

/** Die Grundfarbe eines Dokuments: '#rgb' oder '#rrggbb', sonst das Braun der Vorgabe (nie Text aus fremder Hand im Stil). */
export const druckFarbe = (f) => (typeof f === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(f.trim()) ? f.trim() : DRUCK_FARBE);
/** Ein Bild kommt nur ins Dokument, wenn es eingebettet ist (data:image/…;base64) – nie eine Adresse im Netz, kein SVG. */
export const druckBild = (img) => (typeof img === 'string' && /^data:image\/(?:jpeg|jpg|png|webp|gif|avif|bmp);base64,[A-Za-z0-9+/]+=*$/.test(img) ? img : '');
const zahl = (v, sonst) => (v !== '' && v != null && Number.isFinite(+v) ? +v : sonst);
/** Datum für Fußzeile und Deckblatt: Date → ausgeschrieben im Gebietsschema der Sprache, Text bleibt Text, null/'' → ''. */
export const druckDatum = (datum, sprache) => { if (datum == null || datum === '') return ''; if (typeof datum === 'string') return datum; const d = new Date(datum); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(gebiet(sprache), { day: 'numeric', month: 'long', year: 'numeric' }); };

const grund = (kopf, abschnitt) => `@page{size:A4;margin:2cm 2cm 2.2cm}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Georgia,'Times New Roman',serif;color:#2a1a0a;background:#fff;max-width:16cm;margin:0 auto;font-size:10pt;line-height:1.4}
${kopf}{font-size:20pt;color:var(--f);margin:0 0 4pt;line-height:1.2}
${abschnitt}{font-size:7.5pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--f);border-bottom:1pt solid var(--f);padding-bottom:4pt;margin:14pt 0 8pt;break-after:avoid;page-break-after:avoid}
.kasten{display:inline-block;width:10pt;height:10pt;border:1.5pt solid var(--f);border-radius:2pt}
.fuss{margin-top:20pt;padding-top:8pt;border-top:1pt solid #e8ddd0;font-size:7.5pt;color:#777;display:flex;justify-content:space-between;gap:12pt}
`;
const GRUND = grund('h1', 'h2');
const REZEPT_STIL = `.urname{font-size:8.5pt;color:#777;margin:-2pt 0 10pt;font-style:italic}
.meta{font-size:8pt;color:#666;margin-bottom:14pt;display:flex;align-items:center;gap:6pt;flex-wrap:wrap}
.kat{background:var(--f);color:#fff;border-radius:10pt;padding:1.5pt 8pt;font-size:7.5pt;font-weight:700}
.port.neu{background:#a0401a;color:#fff;border-radius:8pt;padding:1pt 7pt;font-weight:700}
.chip{border:1pt solid var(--f);color:var(--f);border-radius:10pt;padding:1pt 7pt;font-size:7.5pt;font-weight:700}
.sterne{color:var(--f);font-size:10pt;letter-spacing:1pt}
.bild{margin-bottom:16pt;border-radius:6pt;overflow:hidden;height:160pt;background:#f5efe8}
.bild img{display:block;width:100%;height:100%;object-fit:cover}
table{width:100%;border-collapse:collapse}
td{padding:5pt 0;vertical-align:top;font-size:9pt}
td.k{width:18pt}
td.m{width:95pt;padding-right:10pt;font-weight:700;color:var(--f)}
td.m .e{font-weight:400;color:#666}
td.m .neu{color:#a0401a;font-weight:800}
td.m s{color:#999;font-size:7.5pt;font-weight:400;margin-left:2pt}
.notiz{margin-top:2pt;padding:2pt 6pt;background:#f0f7f6;border-left:2pt solid var(--f);font-size:8pt;color:#1e4a45}
ol{list-style:none;margin:0;padding:0}
ol li{display:flex;gap:10pt;margin-bottom:10pt;break-inside:avoid;page-break-inside:avoid}
.nr{background:var(--f);color:#fff;min-width:22pt;height:22pt;border-radius:50%;font-size:8pt;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.st{font-size:9.5pt;line-height:1.6;padding-top:3pt}
.wort{margin-top:14pt;padding:8pt 10pt;background:#f5efe8;border-left:3pt solid var(--f);font-size:8.5pt;font-style:italic;color:#5a3a20}
`;
/** Der Stil eines Rezeptblatts für ein Dokument, das mehrere Rezepte trägt (das Buch, buch.mjs): derselbe Text wie hier,
 *  nur stehen Rezeptname und Abschnitts-Überschrift dort unter anderen Elementen (stufe 3: h3 und h4). So gibt es EINE Anmutung. */
export const rezeptStil = (stufe = 1) => grund('h' + stufe, 'h' + (stufe + 1)) + REZEPT_STIL;
const LISTEN_STIL = `h1{font-size:18pt}
.datum{font-size:9pt;color:#777;margin:0 0 14pt}
section{break-inside:avoid;page-break-inside:avoid}
ul{list-style:none;margin:0 0 6pt;padding:0}
ul li{display:flex;gap:8pt;align-items:baseline;padding:3pt 0;font-size:10pt;break-inside:avoid;page-break-inside:avoid}
ul li .kasten{flex-shrink:0;position:relative;top:1pt}
.lm{font-weight:700;color:var(--f);min-width:60pt}
`;

function dokument(titel, sprache, farbe, stil, rumpf) {
  return `<!DOCTYPE html>
<html lang="${kennt(sprache) ? sprache : 'de'}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${DRUCK_RICHTLINIE}">
<title>${esc(titel)}</title>
<style>
:root{--f:${druckFarbe(farbe)}}
${GRUND}${stil}</style>
</head>
<body>
${rumpf}
</body>
</html>
`;
}
const fussZeile = (fuss, datum, sprache) => { const t = druckDatum(datum, sprache); return fuss || t ? `<div class="fuss"><span>${esc(fuss)}</span><span>${esc(t)}</span></div>` : ''; };

/** Ein Rezept als druckfertiges HTML-Dokument (A4).
 *  portionen: für so viele wird gerechnet (ohne Angabe die des Rezepts); umgerechnete Mengen stehen hervorgehoben, die
 *  ursprüngliche durchgestrichen daneben. sprache: Sprache der Beschriftung; liegt am Rezept eine Übersetzung in dieser Sprache,
 *  steht sie da und der ursprüngliche Name klein darunter. mitBild: false lässt das Bild weg. kategorieName: Name der
 *  Kategorie für das Schild (leer: kein Schild). farbe: '#rrggbb' der Kategorie. fuss: Text unten links (Name der Ausgabe).
 *  datum: steht unten rechts; Date, fertiger Text oder null für „kein Datum“ (ohne Angabe heute). */
export function druckRezept(rezept, { portionen, sprache = 'de', mitBild = true, kategorieName = '', farbe, fuss = '', datum = new Date() } = {}) {
  const t = rezeptTeile(rezept, { portionen, sprache, mitBild, kategorieName });
  return dokument(t.name, sprache, farbe, REZEPT_STIL + (t.ausschnitt ? `.bild img{${t.ausschnitt}}\n` : ''), [...t.teile, fussZeile(fuss, datum, sprache)].filter(Boolean).join('\n'));
}

/** Bildausschnitt wie in der App als Stil-Text: Lage in Prozent, Vergrößerung 1 bis 3; nur Zahlen in ihren Grenzen. Ohne Ausschnitt ''. */
export function ausschnittStil(crop) {
  if (!crop || typeof crop !== 'object') return '';
  const x = Math.min(100, Math.max(0, zahl(crop.x, 50))), y = Math.min(100, Math.max(0, zahl(crop.y, 50))), z = Math.min(3, Math.max(1, zahl(crop.scale, 1)));
  return `object-position:${x}% ${y}%${z > 1 ? `;transform:scale(${z});transform-origin:${x}% ${y}%` : ''}`;
}

/** Die Teile eines Rezeptblatts, fertig entschärft – für druckRezept und für das Buch (buch.mjs), damit beide gleich aussehen.
 *  Zurück: { name, teile: [Name, ursprünglicher Name, Zeile, Bild, Zutaten, Schritte, Kommentar] (nur was da ist),
 *  ausschnitt: Stil-Text für das Bild oder '' }. stufe: Überschriften-Stufe des Namens (1 → <h1>, Abschnitte <h2>).
 *  portionen, sprache, mitBild, kategorieName wie bei druckRezept. */
export function rezeptTeile(rezept, { portionen, sprache = 'de', mitBild = true, kategorieName = '', stufe = 1 } = {}) {
  const roh = normalisiere(rezept || {}), r = sicht(roh, sprache), name = r.name || text(sprache, 'Rezept', 'Recipe'), h = 'h' + stufe, h2 = 'h' + (stufe + 1);
  const basis = r.servings, wunsch = zahl(portionen, basis), ziel = wunsch > 0 ? Math.min(999, wunsch) : basis, faktor = ziel / basis, anders = Math.abs(faktor - 1) > 1e-9;
  const port = (n) => (n === 1 ? text(sprache, '1 Portion', '1 serving') : fuelle(text(sprache, '{0} Portionen', '{0} servings'), String(n).replace('.', ',')));
  const zeit = parseInt(r.prepTime, 10), sterne = Math.min(5, Math.max(0, Math.round(zahl(r.rating && r.rating.stars, 0)))), bild = mitBild ? druckBild(r.img) : '';
  const meta = [
    kategorieName ? `<span class="kat">${esc(kategorieName)}</span>` : '',
    anders ? `<span class="port neu">${esc(port(ziel))}</span><span>${esc(fuelle(text(sprache, '(Rezept für {0})', '(recipe for {0})'), basis))}</span>` : `<span class="port">${esc(port(basis))}</span>`,
    Number.isFinite(zeit) && zeit > 0 ? `<span class="zeit">${zeit} ${esc(text(sprache, 'Min', 'min'))}</span>` : '',
    ...r.flavors.map((f) => `<span class="chip">${esc(f)}</span>`),
    sterne ? `<span class="sterne">${'★'.repeat(sterne)}${'☆'.repeat(5 - sterne)}</span>` : '',
  ].filter(Boolean).join('\n');
  const zutaten = r.ings.map((z) => {
    const neu = skaliere(z.amt, faktor), menge = neu !== z.amt ? `<span class="neu">${esc(neu)}</span><s>${esc(z.amt)}</s>` : esc(z.amt);
    return `<tr><td class="k"><span class="kasten"></span></td><td class="m">${menge}${z.unit ? ` <span class="e">${esc(z.unit)}</span>` : ''}</td><td>${esc(z.name)}${z.note ? `<div class="notiz">${esc(z.note)}</div>` : ''}</td></tr>`;
  }).join('\n');
  const schritte = r.steps.map((s, i) => `<li><span class="nr">${i + 1}</span><div class="st">${esc(s.txt)}${s.note ? `<div class="notiz">${esc(s.note)}</div>` : ''}</div></li>`).join('\n');
  const kommentar = r.rating && r.rating.comment ? String(r.rating.comment).trim() : '';
  const teile = [
    `<${h}>${esc(name)}</${h}>`,
    r.name && roh.name && r.name !== roh.name ? `<p class="urname">${esc(roh.name)}</p>` : '',
    `<div class="meta">\n${meta}\n</div>`,
    bild ? `<div class="bild"><img src="${esc(bild)}" alt="${esc(name)}"></div>` : '',
    zutaten ? `<${h2}>${esc(text(sprache, 'Zutaten', 'Ingredients'))}</${h2}>\n<table>\n${zutaten}\n</table>` : '',
    schritte ? `<${h2}>${esc(text(sprache, 'Zubereitung', 'Preparation'))}</${h2}>\n<ol>\n${schritte}\n</ol>` : '',
    kommentar ? `<div class="wort">${esc('„' + kommentar + '“')}</div>` : '',
  ].filter(Boolean);
  return { name, teile, ausschnitt: bild ? ausschnittStil(r.imgCrop) : '' };
}

/** Eine Liste als druckfertiges HTML-Dokument (A4), z. B. die Einkaufsliste: jede Zeile mit einem Kästchen zum Abhaken.
 *  zeilen: [{ text, gruppe, menge }] oder einfache Texte. Zeilen derselben `gruppe` stehen unter einer Überschrift; die
 *  Gruppen folgen in der Reihenfolge, in der sie zuerst vorkommen. `menge` (wenn da) steht fett vor dem Text.
 *  sprache, farbe, fuss, datum wie bei druckRezept. */
export function druckListe(titel, zeilen, { sprache = 'de', farbe, fuss = '', datum = new Date() } = {}) {
  const kopf = String(titel ?? '').trim() || text(sprache, 'Liste', 'List'), gruppen = new Map();
  for (const z of Array.isArray(zeilen) ? zeilen : []) {
    const e = typeof z === 'string' || typeof z === 'number' ? { text: z } : z || {}, t = String(e.text ?? '').trim(), m = String(e.menge ?? '').trim(), g = String(e.gruppe ?? '').trim();
    if (!t && !m) continue;
    if (!gruppen.has(g)) gruppen.set(g, []);
    gruppen.get(g).push(`<li><span class="kasten"></span>${m ? `<span class="lm">${esc(m)}</span>` : ''}<span class="lt">${esc(t)}</span></li>`);
  }
  const tag = druckDatum(datum, sprache);
  const rumpf = [`<h1>${esc(kopf)}</h1>`, tag ? `<p class="datum">${esc(tag)}</p>` : '',
    ...[...gruppen].map(([g, li]) => `<section>\n${g ? `<h2>${esc(g)}</h2>\n` : ''}<ul>\n${li.join('\n')}\n</ul>\n</section>`),
    gruppen.size ? '' : `<p>${esc(text(sprache, 'Die Liste ist leer.', 'The list is empty.'))}</p>`,
    fuss ? fussZeile(fuss, null, sprache) : ''].filter(Boolean).join('\n');
  return dokument(kopf, sprache, farbe, LISTEN_STIL, rumpf);
}

/** Druckt ein fertiges Dokument im Browser: legt es in einen unsichtbaren Rahmen, ruft dort print() und räumt danach auf.
 *  Kein neues Fenster. Im Rahmen läuft kein Skript (sandbox ohne allow-scripts; allow-modals braucht print(),
 *  allow-same-origin der Aufruf von außen). Zurück: ein Versprechen, das sich erfüllt, wenn der Druckdialog zu ist
 *  (afterprint) – spätestens nach `frist` ms – und abgelehnt wird, wenn kein Browser da ist oder print() scheitert.
 *  Der Rahmen bleibt nach dem Dialog noch `nachlauf` ms stehen: manche Geräte bauen die Vorschau erst dann fertig.
 *  dokument: das Dokument der Seite (für Proben ein gestelltes). sprache: Sprache der Fehlermeldung. */
export function drucke(html, { dokument: dok = globalThis.document, nachlauf = 1000, frist = 600000, sprache = 'de' } = {}) {
  return new Promise((erfuellt, abgelehnt) => {
    if (!dok || !dok.body || typeof dok.createElement !== 'function') { abgelehnt(new Error(text(sprache, 'Drucken geht nur im Browser.', 'Printing only works in the browser.'))); return; }
    if (typeof dok.querySelectorAll === 'function') for (const alt of dok.querySelectorAll('iframe[data-kern-druck]')) alt.remove();   /* ein Rahmen vom letzten Mal */
    const vorher = dok.activeElement, rahmen = dok.createElement('iframe');
    for (const [k, v] of [['data-kern-druck', ''], ['aria-hidden', 'true'], ['tabindex', '-1'], ['sandbox', 'allow-same-origin allow-modals'], ['style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden']]) rahmen.setAttribute(k, v);
    let zu = false, uhr = null;
    const ende = (fehler) => {
      if (zu) return; zu = true; clearTimeout(uhr);
      const weg = () => { rahmen.remove(); try { if (vorher && typeof vorher.focus === 'function') vorher.focus(); } catch { /* der Fokus ist nicht wichtiger als das Aufräumen */ } };
      if (fehler || !(nachlauf > 0)) weg(); else setTimeout(weg, nachlauf);
      if (fehler) abgelehnt(fehler instanceof Error ? fehler : new Error(String(fehler))); else erfuellt();
    };
    rahmen.addEventListener('load', () => {
      try { const w = rahmen.contentWindow; w.addEventListener('afterprint', () => ende(), { once: true }); uhr = setTimeout(() => ende(), frist); w.focus(); w.print(); } catch (e) { ende(e || new Error('print')); }
    }, { once: true });
    rahmen.srcdoc = String(html ?? '');
    dok.body.appendChild(rahmen);
  });
}
