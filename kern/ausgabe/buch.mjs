// Küchen-Kern · Das ganze Buch als Dokument. Übernommen ist der Zweck der alten App (exportPDF, exportFlipbook), nicht ihr Code.
// buchInhalt() ist die Gliederung: Rezepte mit Inhalt, nach Kategorie gruppiert, in der Gruppe nach Name sortiert.
// buchPdf() liefert EIN eigenständiges HTML-Dokument (A4) für drucke() aus druck.mjs: Deckblatt, Inhalt, je Kategorie ein
// Zwischentitel, je Rezept eine neue Seite. buchBlaettern() liefert EINE HTML-Datei zum Weitergeben und Blättern am Bildschirm.
// Beide stehen auf den Bausteinen des Rezeptblatts (rezeptTeile, rezeptStil) und in dessen Sicherheitslinie:
//  - jeder Text aus Rezepten ist entschärft, Bilder kommen nur als data:-Adresse hinein, nichts wird aus dem Netz geholt;
//  - das PDF-Buch trägt kein Skript (DRUCK_RICHTLINIE). Das Blätterbuch braucht eines zum Blättern: es ist ein fester Text dieses
//    Moduls (BLAETTER_SKRIPT), und die Inhalts-Richtlinie der Datei erlaubt genau dieses eine Skript über seine Prüfsumme.
//    Ein eingeschleustes Skript oder ein onerror= liefe selbst dann nicht, wenn irgendwo eine Entschärfung fehlte.
//  - Ohne Skript (oder mit einer Datei, die unterwegs verändert wurde) bleibt das Blätterbuch lesbar: alle Seiten untereinander.
// Anders als die alte App:
//  - das PDF-Buch hat ein Inhaltsverzeichnis und ist nach Kategorien gegliedert. Seitenzahlen kann der Druck des Browsers im
//    Verzeichnis nicht ehrlich setzen (kein target-counter); dort stehen laufende Rezeptnummern, dieselbe Nummer steht am Rezept;
//  - die Bilder des Deckblatts sind nicht gewürfelt: je Kategorie das erste Rezept mit Bild, bis vier beisammen sind
//    (dasselbe Buch ergibt dasselbe Dokument);
//  - ein Dokument, keine Teile zu je 25 Rezepten. buchGroesse() sagt vor dem Speichern, wie groß es ist.
import { text, fuelle, kennt, gebiet } from '../oberflaeche/sprache.mjs';
import { normalisiere, sicht, istInhalt, katVonRezept, KAT_OHNE } from '../modell/rezept.mjs';
import { imOrdner } from '../modell/ordner.mjs';
import { ohneName } from '../modell/kategorien.mjs';
import { esc, druckBild, druckFarbe, druckDatum, rezeptTeile, rezeptStil, ausschnittStil, DRUCK_RICHTLINIE } from './druck.mjs';

/** Die Gliederung des Buchs.
 *  rezepte: die Rezepte der App. kategorien: [{ id, name }] in der Reihenfolge, in der sie im Buch stehen sollen.
 *  Rezepte ohne Kategorie und solche, deren Kategorie nicht in der Liste steht, bilden EINE Gruppe am Ende; nennt die Liste den
 *  Sammel-Eimer selbst (id '__ohne'), steht die Gruppe an dessen Platz und trägt dessen Namen.
 *  auswahl: nichts (alle) · eine Liste von uids · { kat } (eine Kennung oder mehrere; '' meint „ohne Kategorie“) ·
 *  { ordner } (Kennung eines Ordners); kat und ordner zusammen: beides muss stimmen. Ein Rezept im Ordner behält seine Kategorie.
 *  ordner: die Ordner der App; steht der gewählte nicht darin, ist er kein Ordner (leeres Buch). Ohne diese Liste gilt der
 *  gewählte als vorhanden.
 *  sprache: Sprache der Namen und der Sortierung; liegt am Rezept eine Übersetzung in dieser Sprache, zählt ihr Name.
 *  Zurück: { gruppen: [{ id, name, rezepte: [{ nr, uid, name, rezept }] }], anzahl } – nr läuft durch das ganze Buch. */
export function buchInhalt(rezepte, { kategorien = [], auswahl = null, sprache = 'de', ordner } = {}) {
  const ort = kennt(sprache) ? sprache : 'de';   /* nur für die Sortierung; Namen und Texte fragen die Sprache, wie das Rezeptblatt es tut */
  let liste = (Array.isArray(rezepte) ? rezepte : []).filter((r) => r && typeof r === 'object').map(normalisiere).filter(istInhalt);
  if (Array.isArray(auswahl)) { const uids = new Set(auswahl.map(String)); liste = liste.filter((r) => uids.has(r.uid)); }
  else if (auswahl && typeof auswahl === 'object') {
    if (auswahl.kat != null) { const k = new Set([].concat(auswahl.kat).map((x) => String(x).trim() || KAT_OHNE)); liste = liste.filter((r) => k.has(katVonRezept(r))); }
    if (auswahl.ordner != null) liste = imOrdner(liste, Array.isArray(ordner) ? ordner : [{ id: auswahl.ordner }], auswahl.ordner);
  }
  const folge = new Map();   /* jede Kennung genau einmal, die erste gewinnt */
  for (const c of Array.isArray(kategorien) ? kategorien : []) { const id = String((c && c.id) ?? '').trim(); if (id && !folge.has(id)) folge.set(id, { id, name: String((c && c.name) ?? '').trim(), rezepte: [] }); }
  if (!folge.has(KAT_OHNE)) folge.set(KAT_OHNE, { id: KAT_OHNE, name: '', rezepte: [] });
  for (const g of folge.values()) if (!g.name) g.name = g.id === KAT_OHNE ? ohneName(sprache) : g.id;
  for (const r of liste) { const k = katVonRezept(r); folge.get(folge.has(k) ? k : KAT_OHNE).rezepte.push({ nr: 0, uid: r.uid, name: sicht(r, sprache).name, rezept: r }); }
  const gruppen = [...folge.values()].filter((g) => g.rezepte.length); let nr = 0;
  for (const g of gruppen) { g.rezepte.sort((a, b) => a.name.localeCompare(b.name, ort, { sensitivity: 'base', numeric: true }) || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0)); for (const e of g.rezepte) e.nr = ++nr; }
  return { gruppen, anzahl: nr };
}

/** Größe eines Dokuments in Bytes (UTF-8), so wie es als Datei gespeichert wird. */
export const buchGroesse = (html) => new TextEncoder().encode(String(html ?? '')).length;
/** Dieselbe Größe zum Vorzeigen: „640 KB“, „1,4 MB“, „12 MB“. */
export function buchGroesseText(bytes, sprache = 'de') {
  const b = Math.max(0, +bytes || 0), kb = Math.max(b ? 1 : 0, Math.round(b / 1024)), mb = b / 1048576;
  return kb < 1000 ? kb + ' KB' : mb < 9.95 ? mb.toLocaleString(gebiet(sprache), { maximumFractionDigits: 1 }) + ' MB' : Math.round(mb) + ' MB';   /* ab 1000 KB in MB – „1.024 KB“ liest niemand */
}

// ───────────── gemeinsame Teile beider Dokumente ─────────────

const blatt = (titel, sprache, richtlinie, kopf, stil, rumpf) => `<!DOCTYPE html>
<html lang="${kennt(sprache) ? sprache : 'de'}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${richtlinie}">
${kopf}<title>${esc(titel)}</title>
<style>
${stil}</style>
</head>
<body>
${rumpf}
</body>
</html>
`;

/** Bis zu vier Bilder für das Deckblatt: reihum aus jeder Kategorie das nächste Rezept mit eingebettetem Bild. */
function deckBilder(gruppen, max = 4) {
  const mit = gruppen.map((g) => g.rezepte.filter((e) => druckBild(e.rezept.img))), wahl = [];
  for (let runde = 0; wahl.length < max && mit.some((l) => l[runde]); runde++) for (const l of mit) if (l[runde] && wahl.length < max) wahl.push(l[runde]);
  return wahl;
}

/** Das Deckblatt (ohne umschließendes Element) und die Stil-Regeln für die Ausschnitte seiner Bilder. */
function deckblatt(b, { titel, untertitel, sprache, mitBildern, datum, anzahlText }) {
  const kopf = String(titel ?? '').trim() || text(sprache, 'Rezeptbuch', 'Recipe book'), unter = String(untertitel ?? '').trim(), bilder = mitBildern ? deckBilder(b.gruppen) : [];
  const wieViele = b.anzahl ? String(typeof anzahlText === 'function' ? anzahlText(b.anzahl) : b.anzahl === 1 ? text(sprache, '1 Rezept', '1 recipe') : fuelle(text(sprache, '{0} Rezepte', '{0} recipes'), b.anzahl)) : '';
  const stand = [wieViele, druckDatum(datum, sprache)].filter(Boolean).join(' · ');
  const html = [
    bilder.length ? `<div class="raster n${bilder.length}">\n${bilder.map((e, i) => `<div id="d${i + 1}"><img src="${esc(druckBild(e.rezept.img))}" alt="${esc(e.name)}"></div>`).join('\n')}\n</div>` : '',
    `<h1>${esc(kopf)}</h1>`,
    unter ? `<p class="unter">${esc(unter)}</p>` : '',
    b.anzahl ? '' : `<p class="leer">${esc(text(sprache, 'Das Buch ist leer.', 'The book is empty.'))}</p>`,
    stand ? `<p class="stand">${esc(stand)}</p>` : '',
  ].filter(Boolean).join('\n');
  const stil = bilder.map((e, i) => { const a = ausschnittStil(e.rezept.imgCrop); return a ? `#d${i + 1} img{${a}}\n` : ''; }).join('');
  return { kopf, html, stil };
}

// ───────────── das PDF-Buch ─────────────

/* Rezeptname und Abschnitte liegen im Buch auf h3 und h4 (h1: Titel des Buchs, h2: Inhalt und Kategorie); ihr Aussehen
   kommt aus rezeptStil(3) – dieselben Regeln wie beim einzelnen Rezeptblatt. Hier steht nur, was das Buch dazu braucht. */
const BUCH_STIL = `.deck{min-height:23cm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;break-after:page;page-break-after:always}
.raster{display:grid;grid-template-columns:1fr 1fr;gap:6pt;width:11cm;margin:0 0 1.2cm}
.raster div{height:4.6cm;border-radius:5pt;overflow:hidden;background:#f5efe8}
.raster img{display:block;width:100%;height:100%;object-fit:cover}
.raster.n1{grid-template-columns:1fr}
.raster.n1 div{height:8cm}
.raster.n3 div:first-child{grid-column:span 2}
h1{font-size:30pt;color:var(--f);margin:0 0 8pt;line-height:1.15}
.unter{font-size:12pt;font-style:italic;color:#666;margin:0 0 6pt}
.leer{font-size:11pt;color:#666;margin:12pt 0 0}
.stand{font-size:9pt;color:#777;margin:14pt 0 0;padding-top:8pt;border-top:1pt solid #e8ddd0}
h2{font-size:9pt;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--f);text-align:center;border-bottom:1pt solid var(--f);padding:0 0 6pt;margin:0 0 18pt;break-after:avoid;page-break-after:avoid}
.iv,.iv ul{list-style:none;margin:0;padding:0}
.iv{columns:2;column-gap:1cm}
.iv>li{margin:0 0 12pt}
.ik{display:block;font-size:7.5pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--f);margin-bottom:3pt;break-after:avoid;page-break-after:avoid}
.iv ul li{display:flex;gap:6pt;align-items:baseline;font-size:9.5pt;padding:1.5pt 0;break-inside:avoid;page-break-inside:avoid}
.in{flex:0 0 18pt;text-align:right;font-size:8pt;color:#999}
.iv a{color:inherit;text-decoration:none}
.kapitel{break-before:page;page-break-before:always}
.rezept+.rezept{break-before:page;page-break-before:always}
.rnr{float:right;margin:6pt 0 0 10pt;font-size:9pt;color:#999}
table,tr,.bild{break-inside:avoid;page-break-inside:avoid}
`;

/** Das ganze Buch als druckfertiges HTML-Dokument (A4) für drucke(): Deckblatt (Titel, Untertitel, bis zu vier Rezeptbilder,
 *  Anzahl, Datum), Inhaltsverzeichnis (Kategorie → Rezepte mit laufender Nummer), je Kategorie ein Zwischentitel über ihrem
 *  ersten Rezept, je Rezept eine neue Seite. Ein leeres Buch ist ein Deckblatt, das es sagt.
 *  kategorien, auswahl, ordner, sprache wie bei buchInhalt. titel/untertitel: stehen auf dem Deckblatt (ohne Titel „Rezeptbuch“).
 *  farbe: '#rrggbb'. mitBildern: false lässt jedes Bild weg. datum: Date, fertiger Text oder null (ohne Angabe heute).
 *  portionen: { uid: Anzahl } rechnet einzelne Rezepte um. anzahlText: (n) => '12 Getränke' für eine andere Ausgabe. */
export function buchPdf(rezepte, { titel, untertitel = '', kategorien, auswahl, ordner, sprache = 'de', farbe, mitBildern = true, datum = new Date(), portionen, anzahlText } = {}) {
  const b = buchInhalt(rezepte, { kategorien, auswahl, ordner, sprache }), deck = deckblatt(b, { titel, untertitel, sprache, mitBildern, datum, anzahlText });
  let ausschnitte = deck.stil;
  const inhalt = b.gruppen.map((g) => `<li><span class="ik">${esc(g.name)}</span>\n<ul>\n${g.rezepte.map((e) => `<li><span class="in">${e.nr}</span><a href="#r${e.nr}">${esc(e.name)}</a></li>`).join('\n')}\n</ul>\n</li>`).join('\n');
  const kapitel = b.gruppen.map((g, k) => `<section class="kapitel" id="k${k + 1}">\n<h2>${esc(g.name)}</h2>\n${g.rezepte.map((e) => {
    const t = rezeptTeile(e.rezept, { sprache, mitBild: mitBildern, stufe: 3, portionen: portionen && portionen[e.uid] });
    if (t.ausschnitt) ausschnitte += `#r${e.nr} .bild img{${t.ausschnitt}}\n`;
    return `<article class="rezept" id="r${e.nr}">\n<p class="rnr">${e.nr}</p>\n${t.teile.join('\n')}\n</article>`;
  }).join('\n')}\n</section>`);
  const rumpf = [`<header class="deck">\n${deck.html}\n</header>`,
    b.anzahl ? `<nav class="inhalt">\n<h2>${esc(text(sprache, 'Inhalt', 'Contents'))}</h2>\n<ul class="iv">\n${inhalt}\n</ul>\n</nav>` : '', ...kapitel].filter(Boolean).join('\n');
  return blatt(deck.kopf, sprache, DRUCK_RICHTLINIE, '', `:root{--f:${druckFarbe(farbe)}}\n${rezeptStil(3)}${BUCH_STIL}${ausschnitte}`, rumpf);
}

// ───────────── das Blätterbuch ─────────────

/** Das Skript des Blätterbuchs: fester Text, nie Text aus Rezepten (die Beschriftung liest es aus data-Attributen).
 *  Es zeigt eine Seite (breiter Schirm: zwei nebeneinander, das Deckblatt allein), blättert per Knopf, Pfeiltasten, Wischen und
 *  aus dem Inhaltsverzeichnis und zählt mit. Nur ASCII und ohne Rückstrich, damit die Prüfsumme auf jedem Weg dieselbe bleibt.
 *  WER HIER EIN ZEICHEN ÄNDERT, ändert BLAETTER_PRUEFSUMME mit – test/kern-buch.test.js rechnet nach und nennt den neuen Wert. */
export const BLAETTER_SKRIPT = `(function(){
'use strict';
var d=document,wurzel=d.documentElement,buch=d.getElementById('buch'),leiste=d.getElementById('leiste');
if(!buch||!leiste)return;
var seiten=[].slice.call(buch.querySelectorAll('.seite')),n=seiten.length;
if(n<2)return;
var zaehler=d.getElementById('zaehler'),zurueck=d.getElementById('zurueck'),weiter=d.getElementById('weiter'),zumInhalt=d.getElementById('zum-inhalt');
var breit=window.matchMedia?window.matchMedia('(min-width:56rem)'):{matches:false},jetzt=0,x0=null,y0=0;
function fuelle(muster,werte){var t=String(muster),i;for(i=0;i<werte.length;i++)t=t.split('{'+i+'}').join(String(werte[i]));return t;}
function paar(i){if(!breit.matches||i===0)return[i];var l=i%2?i:i-1;return l+1<n?[l,l+1]:[l];}
function zeige(i){
i=Math.max(0,Math.min(n-1,i));
var p=paar(i),doppel=!!breit.matches,k,s,auf,war,a;
jetzt=p[0];
wurzel.classList.toggle('doppel',doppel);
for(k=0;k<n;k++){s=seiten[k];auf=p.indexOf(k)>=0;war=s.classList.contains('auf');
s.classList.toggle('auf',auf);s.classList.toggle('links',auf&&doppel&&k%2===1);s.classList.toggle('rechts',auf&&doppel&&k>0&&k%2===0);
if(auf&&!war)s.scrollTop=0;}
buch.classList.toggle('halb',doppel&&p.length===1&&p[0]>0);
zurueck.disabled=jetzt===0;weiter.disabled=p[p.length-1]===n-1;
zaehler.textContent=p.length===2?fuelle(leiste.getAttribute('data-doppel'),[p[0]+1,p[1]+1,n]):fuelle(leiste.getAttribute('data-einzel'),[p[0]+1,n]);
a=d.activeElement;
if(!a||a.disabled||!leiste.contains(a)){try{seiten[jetzt].focus({preventScroll:true});}catch(e){}}
try{history.replaceState(null,'','#'+seiten[jetzt].id);}catch(e){}
}
function vor(){var p=paar(jetzt);zeige(p[p.length-1]+1);}
function rueck(){zeige(jetzt-1);}
function ziel(marke){var z=marke?d.getElementById(marke):null;return z?seiten.indexOf(z):-1;}
function ausAdresse(){var i=ziel(String(location.hash||'').slice(1));if(i>=0)zeige(i);return i>=0;}
zurueck.addEventListener('click',rueck);
weiter.addEventListener('click',vor);
zumInhalt.addEventListener('click',function(){var i=seiten.indexOf(buch.querySelector('.inhalt'));if(i>=0)zeige(i);});
buch.addEventListener('click',function(e){
var a=e.target&&e.target.closest?e.target.closest('a[href]'):null,h=a?String(a.getAttribute('href')):'',i=h.charAt(0)==='#'?ziel(h.slice(1)):-1;
if(i<0)return;
e.preventDefault();zeige(i);
});
d.addEventListener('keydown',function(e){
if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
if(e.key==='ArrowRight')vor();else if(e.key==='ArrowLeft')rueck();else if(e.key==='Home')zeige(0);else if(e.key==='End')zeige(n-1);else return;
e.preventDefault();
});
buch.addEventListener('touchstart',function(e){if(e.touches.length===1){x0=e.touches[0].clientX;y0=e.touches[0].clientY;}else x0=null;},{passive:true});
buch.addEventListener('touchcancel',function(){x0=null;},{passive:true});
buch.addEventListener('touchend',function(e){
if(x0===null||!e.changedTouches.length)return;
var dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;
if(window.visualViewport&&window.visualViewport.scale>1.01)return;
if(Math.abs(dx)<60||Math.abs(dx)<2*Math.abs(dy))return;
if(dx<0)vor();else rueck();
},{passive:true});
function neu(){zeige(jetzt);}
if(breit.addEventListener)breit.addEventListener('change',neu);else if(breit.addListener)breit.addListener(neu);
window.addEventListener('hashchange',ausAdresse);
wurzel.classList.add('blaettern');leiste.hidden=false;
if(!ausAdresse())zeige(0);
})();`;
/** SHA-256 von BLAETTER_SKRIPT (base64). Steht in der Inhalts-Richtlinie; stimmt sie nicht, läuft das Skript nicht. */
export const BLAETTER_PRUEFSUMME = 'sha256-9iHsOHJYRy2ui+q/nU4gO/0v0NWZDZQGHe+J0iTbXg4=';
/** Die Inhalts-Richtlinie des Blätterbuchs: nichts aus dem Netz, Bilder nur eingebettet, der eigene Stil – und genau EIN Skript,
 *  das dieses Moduls. Kein 'unsafe-inline' für Skripte: damit liefen auch eingeschleuste Skripte und onerror=-Attribute. */
export const BLAETTER_RICHTLINIE = `default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src '${BLAETTER_PRUEFSUMME}'; base-uri 'none'; form-action 'none'`;

/* Farben als Variablen: hell, dunkel (folgt dem Gerät) und für den Druck wieder hell. --ft ist die Grundfarbe als Schrift;
   im Dunkeln aufgehellt, sonst wäre ein dunkles Braun auf dunklem Blatt nicht zu lesen. */
const BLAETTER_STIL = `:root{--ft:var(--f);--tisch:#ece6dd;--blatt:#fffdf9;--tx:#2a1a0a;--leise:#6b6259;--linie:#e3d8ca;--feld:#f5efe8;--nb:#eef6f5;--nt:#1e4a45;--neu:#a0401a}
@media (prefers-color-scheme:dark){:root{--ft:color-mix(in srgb,var(--f) 45%,#fff);--tisch:#14110e;--blatt:#231e19;--tx:#efe7dd;--leise:#b5a99b;--linie:#3d352d;--feld:#2f2822;--nb:#1d2c2a;--nt:#bfe0db;--neu:#f0a27e}}
@media print{:root{--ft:var(--f);--tisch:#fff;--blatt:#fff;--tx:#2a1a0a;--leise:#666;--linie:#e8ddd0;--feld:#f5efe8;--nb:#f0f7f6;--nt:#1e4a45;--neu:#a0401a}}
@page{size:A4;margin:2cm 2cm 2.2cm}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:Georgia,'Times New Roman',serif;font-size:1rem;line-height:1.5;color:var(--tx);background:var(--tisch)}
.seite{background:var(--blatt);overflow-wrap:anywhere}
.seite:focus{outline:none}
h1{font-size:2rem;line-height:1.15;color:var(--ft);margin:0 0 .5rem}
.deck{text-align:center}
.unter{font-size:1.05rem;font-style:italic;color:var(--leise);margin:0 0 .5rem}
.leer{color:var(--leise);margin:1rem 0 0}
.stand{font-size:.85rem;color:var(--leise);margin:1rem 0 0;padding-top:.6rem;border-top:1px solid var(--linie)}
.raster{display:grid;grid-template-columns:1fr 1fr;gap:.4rem;width:100%;max-width:20rem;margin:0 auto 1.5rem}
.raster div{aspect-ratio:4 / 3;border-radius:.4rem;overflow:hidden;background:var(--feld)}
.raster img{display:block;width:100%;height:100%;object-fit:cover}
.raster.n1{grid-template-columns:1fr}
.raster.n3 div:first-child{grid-column:span 2;aspect-ratio:8 / 3}
.inhalt h2{font-size:.8rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ft);text-align:center;border-bottom:1px solid var(--ft);padding-bottom:.4rem;margin:0 0 1rem}
.iv,.iv ul{list-style:none;margin:0;padding:0}
.iv>li{margin:0 0 1rem}
.ik{display:block;font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ft)}
.iv a{display:flex;align-items:baseline;gap:.75rem;padding:.4rem 0;color:inherit;text-decoration:none;border-bottom:1px dotted var(--linie)}
.iv a:focus-visible{outline:2px solid var(--ft);outline-offset:2px}
.it{flex:1;min-width:0}
.in{font-size:.85rem;color:var(--leise);font-variant-numeric:tabular-nums}
.rezept h2{font-size:1.5rem;line-height:1.2;color:var(--ft);margin:0 0 .25rem}
.rezept h3{font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ft);border-bottom:1px solid var(--ft);padding-bottom:.25rem;margin:1.25rem 0 .5rem;break-after:avoid;page-break-after:avoid}
.urname{font-size:.9rem;font-style:italic;color:var(--leise);margin:0 0 .25rem}
.meta{font-size:.85rem;color:var(--leise);margin:.4rem 0 1rem;display:flex;align-items:center;gap:.4rem;flex-wrap:wrap}
.kat{background:var(--f);color:#fff;border-radius:1rem;padding:.1rem .6rem;font-size:.8rem;font-weight:700}
.port.neu{background:#a0401a;color:#fff;border-radius:1rem;padding:.05rem .55rem;font-weight:700}
.chip{border:1px solid var(--ft);color:var(--ft);border-radius:1rem;padding:.05rem .55rem;font-size:.8rem;font-weight:700}
.sterne{color:var(--ft);letter-spacing:.1em}
.bild{margin:0 0 1rem;border-radius:.5rem;overflow:hidden;aspect-ratio:16 / 9;background:var(--feld);break-inside:avoid;page-break-inside:avoid}
.bild img{display:block;width:100%;height:100%;object-fit:cover}
table{width:100%;border-collapse:collapse}
tr{break-inside:avoid;page-break-inside:avoid}
td{padding:.3rem 0;vertical-align:top}
td.k{display:none;width:1.6em}
td.m{width:6.5rem;padding-right:.75rem;font-weight:700;color:var(--ft)}
td.m .e{font-weight:400;color:var(--leise)}
td.m .neu{color:var(--neu);font-weight:800}
td.m s{color:var(--leise);font-size:.8rem;font-weight:400;margin-left:.15rem}
.kasten{display:inline-block;width:.85em;height:.85em;border:1.5px solid var(--ft);border-radius:2px}
.notiz{margin-top:.15rem;padding:.15rem .5rem;background:var(--nb);border-left:2px solid var(--ft);font-size:.875rem;color:var(--nt)}
ol{list-style:none;margin:0;padding:0}
ol li{display:flex;gap:.75rem;margin-bottom:.75rem;break-inside:avoid;page-break-inside:avoid}
.nr{background:var(--f);color:#fff;min-width:1.75rem;height:1.75rem;border-radius:50%;font-size:.8rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.st{line-height:1.6;padding-top:.1rem;min-width:0}
.wort{margin-top:1rem;padding:.6rem .8rem;background:var(--feld);border-left:3px solid var(--ft);font-style:italic}
.snr{margin:auto 0 0;padding-top:1.25rem;text-align:center;font-size:.8rem;color:var(--leise)}
#leiste[hidden]{display:none}
@media screen{
body{padding:1rem .75rem}
.seite{display:flex;flex-direction:column;max-width:36rem;margin:0 auto 1rem;padding:1.5rem 1.25rem;border-radius:.5rem;box-shadow:0 1px 3px rgba(0,0,0,.18),0 8px 24px rgba(0,0,0,.08)}
.seite>*{flex-shrink:0}
.deck{min-height:70vh}
.deck::before,.deck::after{content:'';flex:1}
.blaettern{height:100%;overflow:hidden}
.blaettern body{display:flex;flex-direction:column;height:100vh;height:100dvh;padding:0;overflow:hidden}
.blaettern #buch{flex:1;min-height:0;display:flex;justify-content:center;padding:.75rem .75rem 0}
.blaettern .seite{display:none;flex:0 1 36rem;min-width:0;min-height:0;margin:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y pinch-zoom}
.blaettern .seite.auf{display:flex}
.doppel .seite.links{border-radius:.5rem 0 0 .5rem;box-shadow:inset -14px 0 16px -14px rgba(0,0,0,.28),0 8px 24px rgba(0,0,0,.08)}
.doppel .seite.rechts{border-radius:0 .5rem .5rem 0;box-shadow:inset 14px 0 16px -14px rgba(0,0,0,.28),0 8px 24px rgba(0,0,0,.08)}
.doppel #buch.halb::after{content:'';flex:0 1 36rem}
#leiste{flex:none;display:flex;align-items:center;justify-content:center;gap:.25rem;height:3.25rem;padding-bottom:env(safe-area-inset-bottom)}
#leiste button{appearance:none;-webkit-appearance:none;border:0;background:none;color:inherit;width:2.75rem;height:2.75rem;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
#leiste button:hover{background:rgba(127,127,127,.18)}
#leiste button:focus-visible{outline:2px solid var(--ft);outline-offset:1px}
#leiste button:disabled{opacity:.3;cursor:default;background:none}
#leiste svg{width:1.4rem;height:1.4rem;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#zaehler{min-width:9.5rem;text-align:center;font-size:.9rem;font-variant-numeric:tabular-nums;color:var(--leise)}
}
@media print{
html{font-size:10pt}
body{max-width:16cm;margin:0 auto}
#leiste{display:none}
.seite{break-before:page;page-break-before:always}
.seite:first-child{break-before:auto;page-break-before:auto}
.deck{padding-top:4cm}
td.k{display:table-cell}
.snr{margin-top:1.5em}
}
`;

const zeichen = (pfad) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${pfad}"></path></svg>`;

/** Das ganze Buch als EINE eigenständige HTML-Datei zum Weitergeben und Blättern am Bildschirm: Deckblatt, Inhalt (mit
 *  Seitenzahlen – hier sind es die Seiten des Blätterbuchs), je Rezept eine Seite. Vor und zurück per Knopf, Pfeiltasten und
 *  Wischen, Sprung aus dem Inhalt, Seitenzähler; am Handy eine Seite, am breiten Schirm zwei nebeneinander; hell oder dunkel
 *  wie das Gerät; beim Drucken stehen alle Seiten untereinander. Keine Verbindung nach außen.
 *  Die Angaben sind dieselben wie bei buchPdf. */
export function buchBlaettern(rezepte, { titel, untertitel = '', kategorien, auswahl, ordner, sprache = 'de', farbe, mitBildern = true, datum = new Date(), portionen, anzahlText } = {}) {
  const b = buchInhalt(rezepte, { kategorien, auswahl, ordner, sprache }), deck = deckblatt(b, { titel, untertitel, sprache, mitBildern, datum, anzahlText });
  const erste = 3;   /* Seite 1: Deckblatt, Seite 2: Inhalt, ab Seite 3 die Rezepte */
  let ausschnitte = deck.stil;
  const seite = (nr, art, html) => `<section class="seite ${art}" id="s${nr}" tabindex="-1">\n${html}\n</section>`;
  const inhalt = b.gruppen.map((g) => `<li><span class="ik">${esc(g.name)}</span>\n<ul>\n${g.rezepte.map((e) => `<li><a href="#s${e.nr + erste - 1}"><span class="it">${esc(e.name)}</span><span class="in">${e.nr + erste - 1}</span></a></li>`).join('\n')}\n</ul>\n</li>`).join('\n');
  const blaetter = b.gruppen.flatMap((g) => g.rezepte.map((e) => {
    const nr = e.nr + erste - 1, t = rezeptTeile(e.rezept, { sprache, mitBild: mitBildern, stufe: 2, kategorieName: g.name, portionen: portionen && portionen[e.uid] });
    if (t.ausschnitt) ausschnitte += `#s${nr} .bild img{${t.ausschnitt}}\n`;
    return seite(nr, 'rezept', `${t.teile.join('\n')}\n<p class="snr">${nr}</p>`);
  }));
  const knopf = (id, name, pfad) => `<button type="button" id="${id}" title="${esc(name)}" aria-label="${esc(name)}">${zeichen(pfad)}</button>`;
  const rumpf = [`<main id="buch">`, seite(1, 'deck', deck.html),
    b.anzahl ? seite(2, 'inhalt', `<h2>${esc(text(sprache, 'Inhalt', 'Contents'))}</h2>\n<ul class="iv">\n${inhalt}\n</ul>\n<p class="snr">2</p>`) : '', ...blaetter, `</main>`,
    `<nav id="leiste" hidden="" aria-label="${esc(text(sprache, 'Blättern', 'Turn pages'))}" data-einzel="${esc(text(sprache, 'Seite {0} von {1}', 'Page {0} of {1}'))}" data-doppel="${esc(text(sprache, 'Seiten {0}–{1} von {2}', 'Pages {0}–{1} of {2}'))}">`,
    knopf('zum-inhalt', text(sprache, 'Inhalt', 'Contents'), 'M5 7h14M5 12h14M5 17h9'), knopf('zurueck', text(sprache, 'Zurück', 'Back'), 'M15 5l-7 7 7 7'),
    `<span id="zaehler" aria-live="polite"></span>`, knopf('weiter', text(sprache, 'Weiter', 'Next'), 'M9 5l7 7-7 7'), `</nav>`,
    `<script>${BLAETTER_SKRIPT}</script>`].filter(Boolean).join('\n');
  return blatt(deck.kopf, sprache, BLAETTER_RICHTLINIE, '<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="color-scheme" content="light dark">\n',
    `:root{--f:${druckFarbe(farbe)}}\n${BLAETTER_STIL}${ausschnitte}`, rumpf);
}
